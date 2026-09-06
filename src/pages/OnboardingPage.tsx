import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { BillingService } from '../services/billingService';
import { PLAN_CONFIGS } from '../lib/plans';
import type { PlanType, PlanLimits } from '../lib/plans';
import { TemplateSelectorModal } from '../components/organisms/TemplateSelectorModal';
import { InlineFeedback } from '../components/atoms/InlineFeedback';
import { 
  CheckCircle2, 
  ArrowRight, 
  Loader2,
  Check,
  X
} from 'lucide-react';
import logo from '../assets/logo.png';

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, organization, setOrganization } = useAuthStore();
  
  // State from navigation (e.g. started from landing page)
  const [initialEmail, setInitialEmail] = useState<string>('');
  const [initialPlan, setInitialPlan] = useState<PlanType | null>(null);
  
  useEffect(() => {
    if (location.state?.email) setInitialEmail(location.state.email);
    if (location.state?.plan) setInitialPlan(location.state.plan);
  }, [location.state]);

  // Step management
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: User Signup State
  const [signupData, setSignupData] = useState({
    fullName: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    if (initialEmail) setSignupData(prev => ({ ...prev, email: initialEmail }));
  }, [initialEmail]);

  // Step 1: Legal
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Step 2: Org Details State
  const [orgData, setOrgData] = useState({
    name: '',
    industry: 'Restaurant',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  
  const [orgAddress, setOrgAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });

  // Step 3: Plan Selection State
  const [billingAddress, setBillingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });
  const [billingSameAsOrg, setBillingSameAsOrg] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('Free');
  const [screens, setScreens] = useState(1);
  const [seats, setSeats] = useState(1);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Calculate costs dynamically
  const calculateCost = useCallback((planName: PlanType, config: PlanLimits) => {
    if (planName === 'Franchise') return { total: 0, breakdown: [], invalid: null };
    
    let total = config.price;
    const breakdown = [{ label: `Base Plan (${planName})`, price: config.price }];

    // Add-ons
    if (config.addOns) {
      // Screens
      const includedScreens = config.screens === -1 ? 9999 : config.screens;
      const extraScreens = Math.max(0, screens - includedScreens);
      
      if (extraScreens > 0 && config.addOns.screen) {
        // Check hard cap
        if (config.maxScreens && screens > config.maxScreens) {
          return { total: -1, breakdown: [], invalid: 'Too many screens for this plan' };
        }
        const screenCost = extraScreens * config.addOns.screen;
        total += screenCost;
        breakdown.push({ label: `${extraScreens} Extra Screen${extraScreens > 1 ? 's' : ''}`, price: screenCost });
      } else if (config.maxScreens && screens > config.maxScreens) {
         return { total: -1, breakdown: [], invalid: 'Too many screens for this plan' };
      }

      // Seats
      const includedSeats = config.seats === -1 ? 9999 : config.seats;
      const extraSeats = Math.max(0, seats - includedSeats);
      
      if (extraSeats > 0 && config.addOns.seat) {
        if (config.maxSeats && seats > config.maxSeats) {
             return { total: -1, breakdown: [], invalid: 'Too many seats for this plan' };
        }
        const seatCost = extraSeats * config.addOns.seat;
        total += seatCost;
        breakdown.push({ label: `${extraSeats} Extra Seat${extraSeats > 1 ? 's' : ''}`, price: seatCost });
      }
    } else {
        // Free plan logic - strictly limited
        if ((config.screens !== -1 && screens > config.screens) || (config.seats !== -1 && seats > config.seats)) {
             return { total: -1, breakdown: [], invalid: 'Exceeds plan limits' };
        }
    }

    return { total, breakdown, invalid: null };
  }, [screens, seats]);

  const recommendedPlan = useMemo(() => {
    if (screens > 25) return 'Franchise';
    if (screens > 7 || seats > 2) return 'Enterprise';
    
    const growthCost = calculateCost('Growth', PLAN_CONFIGS['Growth']).total;
    const enterpriseCost = calculateCost('Enterprise', PLAN_CONFIGS['Enterprise']).total;
    
    if (growthCost > -1 && enterpriseCost > -1 && enterpriseCost < growthCost) return 'Enterprise';
    if (screens > 1 || seats > 1) return 'Growth';
    
    const basicCost = calculateCost('Basic', PLAN_CONFIGS['Basic']).total;
    if (basicCost > -1 && growthCost > -1 && growthCost < basicCost) return 'Growth';
    
    if (screens > 1 || seats > 1) return 'Basic';

    return 'Free';
  }, [screens, seats, calculateCost]);

  useEffect(() => {
    if (initialPlan) setSelectedPlan(initialPlan);
    if (location.state?.screens) setScreens(location.state.screens);
    if (location.state?.seats) setSeats(location.state.seats);
  }, [initialPlan, location.state]);

  useEffect(() => {
    if (billingSameAsOrg) {
        setBillingAddress(orgAddress);
    }
  }, [billingSameAsOrg, orgAddress]);

  const headingRef = useRef<HTMLDivElement>(null);
  const initializedAccount = useRef<string | null>(null);
  // Initialize a returning account once. A profile refresh must not undo progress.
  useEffect(() => {
    if (!user) { initializedAccount.current = null; setStep(1); return; }
    if (organization?.isSetupComplete) { navigate('/admin'); return; }
    if (!organization || initializedAccount.current === user.uid) return;
    initializedAccount.current = user.uid;
    setOrgData({ name: organization.name || '', industry: organization.industry || 'Restaurant', timezone: organization.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone });
    if (organization.address) setOrgAddress({ street: '', city: '', state: '', zipCode: '', country: '', ...organization.address });
    setStep(organization.industry ? 3 : 2);
    setLoading(false);
  }, [user, organization, navigate]);
  useEffect(() => { headingRef.current?.focus(); }, [step]);

  // Handlers
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!agreedToTerms) {
        setError('You must agree to the Terms of Service and Privacy Policy.');
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, signupData.email, signupData.password);
      await updateProfile(userCredential.user, { displayName: signupData.fullName });
      // Auth listener will kick in and create default org if needed
      // We wait for the effect to move us to Step 2
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      setError(message);
      setLoading(false);
    }
  };

  const handleOrgSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    
    try {
      if (!user) throw new Error('No authenticated user');
      
      const orgId = organization?.id;
      if (!orgId) {
         // Should have been created by auth listener, but if not:
         throw new Error('Organization not initialized. Please refresh.');
      }

      const industryType = orgData.industry as 'Restaurant' | 'Bar' | 'Cafe' | 'Food Truck' | 'Other';

      const orgRef = doc(db, 'organizations', orgId);
      await updateDoc(orgRef, {
        name: orgData.name,
        industry: industryType,
        timezone: orgData.timezone,
        address: orgAddress,
        // We don't mark isSetupComplete yet until plan is chosen
      });

      // Update local store optimization
      if (organization) {
        setOrganization({
            ...organization,
            name: orgData.name,
            industry: industryType,
            timezone: orgData.timezone,
            address: orgAddress
        });
      }

      setStep(3);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save organization details';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelection = async () => {
    if (loading) return;
    if (selectedPlan === 'Franchise') { navigate('/#contact'); return; }
    const selection = calculateCost(selectedPlan, PLAN_CONFIGS[selectedPlan]);
    if (selection.invalid) { setError(selection.invalid + '. Choose a suitable plan or reduce the quantities.'); return; }
    setLoading(true);
    setError(null);

    try {
        if (!organization?.id) throw new Error('Organization not found');

        // Save billing address first
        const orgRef = doc(db, 'organizations', organization.id);
        await updateDoc(orgRef, {
            billingAddress: billingAddress
        });

        // If Free plan, don't finish yet, go to Step 4
        if (selectedPlan === 'Free') {
            await updateDoc(orgRef, {
                plan: 'Free',
                screenCount: 0,
            });
            setStep(4); // Move to content step
            setLoading(false);
            return;
        }

        // Paid plan logic
        // 1. Calculate costs to verify
        // 2. Create Stripe Checkout Session
        const config = PLAN_CONFIGS[selectedPlan];
        const priceId = config.stripePriceId;
        
        if (!priceId) {
            throw new Error('Price ID not found for selected plan');
        }
        
        // Calculate Add-ons
        const extraScreens = Math.max(0, screens - (config.screens === -1 ? 9999 : config.screens));
        const extraSeats = Math.max(0, seats - (config.seats === -1 ? 9999 : config.seats));

        const addOns: { screen?: number; seat?: number; screenPriceId?: string; seatPriceId?: string } = {};
        
        if (extraScreens > 0 && config.addOns?.screenPriceId) {
            addOns.screen = extraScreens;
            addOns.screenPriceId = config.addOns.screenPriceId;
        }
        
        if (extraSeats > 0 && config.addOns?.seatPriceId) {
            addOns.seat = extraSeats;
            addOns.seatPriceId = config.addOns.seatPriceId;
        }

        const checkoutUrl = await BillingService.createCheckoutSession(
            priceId,
            `${window.location.origin}/admin?onboarding_success=true`,
            `${window.location.origin}/onboarding?canceled=true`,
            addOns
        );

        // Redirect to Stripe
        window.location.href = checkoutUrl;

    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to process plan selection';
        setError(message);
        setLoading(false);
    }
  };

  const finishOnboarding = async (destination = '/admin') => {
    if (loading || !organization?.id) return;
    setLoading(true); setError(null);
    try {
      await updateDoc(doc(db, 'organizations', organization.id), { isSetupComplete: true });
      navigate(destination);
    } catch {
      setError('Could not finish setup. Your choices are still here. Try again.');
    } finally { setLoading(false); }
  };
  const handleContentSetup = async (option: 'template' | 'scratch' | 'designer') => {
    if (loading) return;
    if (option === 'template') { setShowTemplateSelector(true); return; }
    await finishOnboarding(option === 'designer' ? '/admin/designers' : '/admin');
  };

  // Render Steps
  return (
    <div className="min-h-screen bg-transparent text-text flex flex-col bg-speed-pattern">
      {/* Simple Header */}
      <header className="glass border-b-0 flex flex-wrap gap-4 items-center p-4 sm:px-8">
        <div className="flex items-center gap-2">
          <img src={logo} alt="AccelRestaurants" className="h-6 w-auto object-contain" />
          <span className="text-xl font-bold text-primary">AccelRestaurants</span>
        </div>
        <nav aria-label="Setup progress" className="text-sm w-full md:w-auto md:ml-auto">
          <p className="mb-2">Step {step} of 4</p>
          <ol className="flex flex-wrap gap-x-4 gap-y-2">
            {['Account','Organization','Plan','Content'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={step === index + 1 ? 'font-bold text-primary' : 'text-text-secondary'}>{index + 1}. {label}</li>)}
          </ol>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div ref={headingRef} tabIndex={-1} aria-label={`Setup step ${step}`} className={`w-full transition-all duration-300 ${step >= 3 ? 'max-w-7xl' : 'max-w-2xl'}`}>
            <InlineFeedback message={error} tone="error" />
            <InlineFeedback message={loading ? 'Saving your choices…' : null} />
            {new URLSearchParams(location.search).has('canceled') && <InlineFeedback message="Checkout was cancelled. You can choose a plan again." />}
            {showTemplateSelector && <TemplateSelectorModal type="slide" onClose={() => setShowTemplateSelector(false)} onCreateBlank={() => { setShowTemplateSelector(false); void finishOnboarding(); }} onImport={id => { setShowTemplateSelector(false); void finishOnboarding(`/admin/slides/${id}`); }} />}
            {step === 1 && (
                <div className="glass-panel p-4 sm:p-8 border-surface-highlight shadow-xl animate-in fade-in slide-in-from-bottom-4">
                    <h2 className="text-2xl font-bold mb-6">Create your account</h2>
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-text-muted mb-1">Full Name</label>
                            <input autoComplete="name" aria-label={"Full Name"}
                                type="text"
                                required 
                                className="w-full bg-surface/50 border border-surface-highlight rounded px-4 py-3 focus:border-primary focus:outline-none"
                                value={signupData.fullName}
                                onChange={e => setSignupData({...signupData, fullName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-text-muted mb-1">Email</label>
                            <input autoComplete="email" aria-label={"Email"}
                                type="email"
                                required 
                                className="w-full bg-surface/50 border border-surface-highlight rounded px-4 py-3 focus:border-primary focus:outline-none"
                                value={signupData.email}
                                onChange={e => setSignupData({...signupData, email: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-text-muted mb-1">Password</label>
                            <input autoComplete="new-password" aria-label={"Password"}
                                type="password"
                                required 
                                minLength={6}
                                className="w-full bg-surface/50 border border-surface-highlight rounded px-4 py-3 focus:border-primary focus:outline-none"
                                value={signupData.password}
                                onChange={e => setSignupData({...signupData, password: e.target.value})}
                            />
                        </div>
                        


                        <div className="flex items-start gap-2">
                            <input 
                                type="checkbox"
                                id="terms"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="mt-1 accent-primary"
                            />
                            <label htmlFor="terms" className="text-sm text-text-muted">
                                I agree to the <Link to="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>.
                            </label>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || !agreedToTerms}
                            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Create Account'} <ArrowRight size={20} />
                        </button>
                    </form>
                    <div className="mt-4 text-center text-sm">
                        Already have an account? <a href="/login" className="text-primary hover:underline">Log in</a>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="glass-panel p-4 sm:p-8 border-surface-highlight shadow-xl animate-in fade-in slide-in-from-bottom-4">
                    <h2 className="text-2xl font-bold mb-6">Tell us about your business</h2>
                    <form onSubmit={handleOrgSetup} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-text-muted mb-1">Organization Name</label>
                            <input aria-label={"Organization Name"}
                                type="text"
                                required 
                                placeholder="e.g. Joe's Burgers"
                                className="w-full bg-surface/50 border border-surface-highlight rounded px-4 py-3 focus:border-primary focus:outline-none"
                                value={orgData.name}
                                onChange={e => setOrgData({...orgData, name: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-1">Industry</label>
                                <select aria-label={"Industry"}
                                    className="w-full bg-surface/50 border border-surface-highlight rounded px-4 py-3 focus:border-primary focus:outline-none"
                                    value={orgData.industry}
                                    onChange={e => setOrgData({...orgData, industry: e.target.value})}
                                >
                                    <option value="Restaurant">Restaurant</option>
                                    <option value="Bar">Bar</option>
                                    <option value="Cafe">Cafe</option>
                                    <option value="Food Truck">Food Truck</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-1">Timezone</label>
                                <input aria-label={"Timezone"}
                                    type="text"
                                    readOnly // Simplification for now, or use a select
                                    className="w-full bg-background border border-surface-highlight rounded px-4 py-3 text-text-muted cursor-not-allowed"
                                    value={orgData.timezone}
                                />
                            </div>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-surface-highlight">
                            <h3 className="font-bold text-lg">Organization Address</h3>
                            <div>
                                <label className="block text-sm font-bold text-text-muted mb-1">Street Address</label>
                                <input aria-label={"Street Address"}
                                    type="text"
                                    required 
                                    className="w-full bg-background border border-surface-highlight rounded px-4 py-3 focus:border-primary focus:outline-none"
                                    value={orgAddress.street}
                                    onChange={e => setOrgAddress({...orgAddress, street: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-1">City</label>
                                    <input aria-label={"City"}
                                        type="text"
                                        required 
                                        className="w-full bg-background border border-surface-highlight rounded px-4 py-3 focus:border-primary focus:outline-none"
                                        value={orgAddress.city}
                                        onChange={e => setOrgAddress({...orgAddress, city: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-1">State/Province</label>
                                    <input aria-label={"State/Province"}
                                        type="text"
                                        required 
                                        className="w-full bg-background border border-surface-highlight rounded px-4 py-3 focus:border-primary focus:outline-none"
                                        value={orgAddress.state}
                                        onChange={e => setOrgAddress({...orgAddress, state: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-1">Zip/Postal Code</label>
                                    <input aria-label={"Zip/Postal Code"}
                                        type="text"
                                        required 
                                        className="w-full bg-background border border-surface-highlight rounded px-4 py-3 focus:border-primary focus:outline-none"
                                        value={orgAddress.zipCode}
                                        onChange={e => setOrgAddress({...orgAddress, zipCode: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text-muted mb-1">Country</label>
                                    <input aria-label={"Country"}
                                        type="text"
                                        required 
                                        className="w-full bg-background border border-surface-highlight rounded px-4 py-3 focus:border-primary focus:outline-none"
                                        value={orgAddress.country}
                                        onChange={e => setOrgAddress({...orgAddress, country: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>



                        <button 
                            type="submit" 
                            disabled={loading || Boolean(calculateCost(selectedPlan, PLAN_CONFIGS[selectedPlan]).invalid)}
                            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Continue'} <ArrowRight size={20} />
                        </button>
                    </form>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold mb-2">Choose your plan</h2>
                        <p className="text-text-muted">Start free or upgrade for more power. Change anytime.</p>
                    </div>

                    {/* Reusing logic from PricingPage but embedded here for flow control */}
                    {/* We can just create a simplified view here or import components if we refactored PricingPage */}
                    {/* For now, let's implement a concise selector */}
                    
                    <div className="bg-surface p-6 rounded-xl border border-surface-highlight mb-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div>
                                <label className="block font-bold mb-2">How many screens?</label>
                                <div className="flex items-center gap-4">
                                    <input aria-label={"Number of screens"}
                                        type="range" min="1" max="50" 
                                        value={screens} onChange={e => setScreens(parseInt(e.target.value))}
                                        className="flex-1 accent-primary"
                                    />
                                    <span className="text-2xl font-bold text-primary w-12 text-center">{screens}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold mb-2">How many team members?</label>
                                <div className="flex items-center gap-4">
                                    <input aria-label={"Number of team members"}
                                        type="range" min="1" max="20" 
                                        value={seats} onChange={e => setSeats(parseInt(e.target.value))}
                                        className="flex-1 accent-primary"
                                    />
                                    <span className="text-2xl font-bold text-primary w-12 text-center">{seats}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {(Object.keys(PLAN_CONFIGS) as PlanType[]).map((planName) => {
                                const config = PLAN_CONFIGS[planName];
                                const costData = calculateCost(planName, config);
                                const isRecommended = recommendedPlan === planName;
                                const isSelected = selectedPlan === planName;
                                const isInvalid = Boolean(costData.invalid);

                                return (
                                    <div 
                                        key={planName} 
                                        className={`relative flex flex-col p-6 rounded-2xl border transition-all duration-300 ${
                                            isRecommended 
                                              ? 'border-primary bg-surface shadow-2xl scale-105 z-10' 
                                              : isInvalid
                                                ? 'border-surface-highlight bg-surface/30 opacity-50 cursor-not-allowed'
                                                : isSelected
                                                  ? 'border-primary bg-primary/10 cursor-pointer'
                                                  : 'border-surface-highlight bg-surface hover:border-primary/50 cursor-pointer'
                                        }`}
                                    >
                                        {isRecommended && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                                Best Value
                                            </div>
                                        )}
                                        
                                        <div className="mb-6">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-xl font-bold">{planName}</h3>
                                                {isSelected && !isInvalid && <CheckCircle2 className="text-primary w-5 h-5" />}
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-bold">
                                                    {planName === 'Franchise' ? 'Custom' : `$${costData.invalid ? config.price : costData.total}`}
                                                </span>
                                                {planName !== 'Franchise' && <span className="text-text-muted">/mo</span>}
                                            </div>
                                            <p className="text-sm text-text-muted mt-2 min-h-[40px]">{config.description}</p>
                                        </div>

                                        {/* Dynamic Cost Breakdown if relevant */}
                                        {!isInvalid && costData.breakdown.length > 1 && (
                                            <div className="mb-4 text-xs bg-background p-2 rounded border border-surface-highlight">
                                                {costData.breakdown.map((item, i) => (
                                                    <div key={i} className="flex justify-between mb-1 last:mb-0">
                                                        <span className="text-text-muted">{item.label}</span>
                                                        <span>+${item.price}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex-1 space-y-4 mb-8">
                                            <FeatureItem check={true}>
                                                <strong>{config.screens === -1 ? 'Unlimited' : config.screens}</strong> Screen{config.screens !== 1 ? 's' : ''} Included
                                            </FeatureItem>
                                            <FeatureItem check={true}>
                                                <strong>{config.seats === -1 ? 'Unlimited' : config.seats}</strong> Seat{config.seats !== 1 ? 's' : ''} Included
                                            </FeatureItem>
                                            <FeatureItem check={true}>
                                                {config.deploymentDurationLimit ? '5-min Deployment Limit' : 'Unlimited Deployment'}
                                            </FeatureItem>
                                            <FeatureItem check={true}>
                                                {config.allowedTiles.length < 15 ? 'Basic Tiles Only' : config.allowedTiles.length < 35 ? 'Advanced Tiles' : 'All Tiles'}
                                            </FeatureItem>
                                            {/* Add-on info */}
                                            {config.addOns && (
                                                <div className="mt-4 pt-4 border-t border-surface-highlight">
                                                    <p className="text-xs font-bold text-text-muted uppercase mb-2">Add-ons Available</p>
                                                    {config.addOns.screen && (
                                                        <FeatureItem check={true} small>+${config.addOns.screen}/mo per extra screen</FeatureItem>
                                                    )}
                                                    {config.addOns.seat && (
                                                        <FeatureItem check={true} small>+${config.addOns.seat}/mo per extra seat</FeatureItem>
                                                    )}
                                                </div>
                                            )}
                                            {isInvalid && (
                                                <div className="mt-4 p-2 bg-red-900/20 text-red-400 text-xs rounded border border-red-900/50">
                                                    {costData.invalid}
                                                </div>
                                            )}
                                        </div>

                                        <button 
                                            onClick={() => {
                                                if (!isInvalid) {
                                                    setSelectedPlan(planName);
                                                                                        }
                                            }}
                                            disabled={isInvalid || loading} aria-pressed={isSelected} aria-label={`Select ${planName} plan`}
                                            className={`w-full py-3 rounded-lg font-bold transition-colors ${
                                                isRecommended 
                                                    ? 'bg-primary hover:bg-primary-hover text-white' 
                                                    : isInvalid
                                                        ? 'bg-surface-highlight cursor-not-allowed text-text-muted'
                                                        : 'bg-surface-highlight hover:bg-surface-highlight/80 text-white'
                                            }`}
                                        >
                                            {planName === 'Franchise' ? 'Contact Sales' : 'Select Plan'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {selectedPlan !== 'Free' && selectedPlan !== 'Franchise' && (
                        <div className="bg-surface p-6 rounded-xl border border-surface-highlight mb-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg">Billing Address</h3>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox"
                                        id="billingSameAsOrg"
                                        checked={billingSameAsOrg}
                                        onChange={(e) => setBillingSameAsOrg(e.target.checked)}
                                        className="accent-primary"
                                    />
                                    <label htmlFor="billingSameAsOrg" className="text-sm text-text-muted">Same as Organization</label>
                                </div>
                            </div>

                            {!billingSameAsOrg && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-text-muted mb-1">Street Address</label>
                                        <input aria-label={"Street Address"}
                                            type="text"
                                            className="w-full bg-background border border-surface-highlight rounded px-4 py-3 focus:border-primary focus:outline-none"
                                            value={billingAddress.street}
                                            onChange={e => setBillingAddress({...billingAddress, street: e.target.value})}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-text-muted mb-1">City</label>
                                            <input aria-label={"City"}
                                                type="text"
                                                className="w-full bg-background border border-surface-highlight rounded px-4 py-3 focus:border-primary focus:outline-none"
                                                value={billingAddress.city}
                                                onChange={e => setBillingAddress({...billingAddress, city: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-text-muted mb-1">State/Province</label>
                                            <input aria-label={"State/Province"}
                                                type="text"
                                                className="w-full bg-background border border-surface-highlight rounded px-4 py-3 focus:border-primary focus:outline-none"
                                                value={billingAddress.state}
                                                onChange={e => setBillingAddress({...billingAddress, state: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-text-muted mb-1">Zip/Postal Code</label>
                                            <input aria-label={"Zip/Postal Code"}
                                                type="text"
                                                className="w-full bg-background border border-surface-highlight rounded px-4 py-3 focus:border-primary focus:outline-none"
                                                value={billingAddress.zipCode}
                                                onChange={e => setBillingAddress({...billingAddress, zipCode: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-text-muted mb-1">Country</label>
                                            <input aria-label={"Country"}
                                                type="text"
                                                className="w-full bg-background border border-surface-highlight rounded px-4 py-3 focus:border-primary focus:outline-none"
                                                value={billingAddress.country}
                                                onChange={e => setBillingAddress({...billingAddress, country: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex flex-wrap justify-between gap-4">
                         <button type="button" className="ui-button ui-button-secondary" disabled={loading} onClick={() => { setError(null); setStep(2); }}>Back to organization</button>
                         <button 
                            onClick={() => handlePlanSelection()}
                            disabled={loading || Boolean(calculateCost(selectedPlan, PLAN_CONFIGS[selectedPlan]).invalid)}
                            className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-8 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (selectedPlan === 'Free' ? 'Start for Free' : selectedPlan === 'Franchise' ? 'Contact sales' : 'Continue to secure checkout')} <ArrowRight size={20} />
                        </button>
                    </div>

                </div>
            )}

            {step === 4 && (
                <div className="glass-panel p-4 sm:p-8 border-surface-highlight shadow-xl animate-in fade-in slide-in-from-bottom-4 max-w-4xl w-full">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold mb-2">How do you want to start?</h2>
                        <p className="text-text-muted">Choose how you want to create your first digital signage content.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <button type="button" disabled={loading}
                            onClick={() => handleContentSetup('template')}
                            className="bg-surface border border-surface-highlight rounded-xl p-6 hover:border-primary/50 hover:bg-surface-highlight/10 transition-all cursor-pointer group text-center flex flex-col items-center"
                        >
                            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><path d="M9 21V9"/></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">Use a Template</h3>
                            <p className="text-sm text-text-muted">Start with a professionally designed template and customize it.</p>
                        </button>

                        <button type="button" disabled={loading}
                            onClick={() => handleContentSetup('scratch')}
                            className="bg-surface border border-surface-highlight rounded-xl p-6 hover:border-primary/50 hover:bg-surface-highlight/10 transition-all cursor-pointer group text-center flex flex-col items-center"
                        >
                            <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">Start from Scratch</h3>
                            <p className="text-sm text-text-muted">Build your content from the ground up with our editor.</p>
                        </button>

                        <button type="button" disabled={loading}
                            onClick={() => handleContentSetup('designer')}
                            className="bg-surface border border-surface-highlight rounded-xl p-6 hover:border-primary/50 hover:bg-surface-highlight/10 transition-all cursor-pointer group text-center flex flex-col items-center"
                        >
                            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 3v4"/><path d="M3 5h4"/><path d="M3 9h4"/></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">Hire a Designer</h3>
                            <p className="text-sm text-text-muted">Connect with a verified designer to create custom content.</p>
                        </button>
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

const FeatureItem = ({ children, check, small = false }: { children: React.ReactNode, check?: boolean, small?: boolean }) => (
  <div className={`flex items-start gap-3 ${small ? 'text-xs' : 'text-sm'}`}>
    {check ? (
      <Check className={`flex-shrink-0 text-success ${small ? 'w-4 h-4' : 'w-5 h-5'}`} />
    ) : (
      <X className={`flex-shrink-0 text-text-muted ${small ? 'w-4 h-4' : 'w-5 h-5'}`} />
    )}
    <span className="text-text-secondary leading-tight">{children}</span>
  </div>
);
