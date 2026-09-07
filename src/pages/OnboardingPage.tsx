import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { saveSetupChanges } from '../services/onboardingService';
import { useAuthStore } from '../store/useAuthStore';
import { useConfigStore } from '../store/useConfigStore';
import { RestaurantStarterWizard } from '../components/cinematic/RestaurantStarterWizard';
import { AccessibleDialog } from '../components/atoms/AccessibleDialog';
import { InlineFeedback } from '../components/atoms/InlineFeedback';
import { PlansPanel } from '../components/journey/PlansPanel';
import { BillingService } from '../services/billingService';
import { RESTAURANT_TEMPLATES } from '../../functions/src/cinematic/templates';
import { claimJourneyIntent, customerError, readJourneyIntent, sanitizeIntent, saveJourneyIntent, safeWebLink, safeWorkspaceDestination } from '../lib/customerJourney';
import type { PlanName } from '../../functions/src/journey/catalog';
import type { Organization } from '../types/schema';
const fieldClass = 'block w-full mt-2 rounded-lg border border-surface-highlight bg-background min-h-11 px-3 py-3';
export const OnboardingPage = () => {
  const navigate = useNavigate(), location = useLocation();
  const { user, userProfile, organization } = useAuthStore();
  const { generalConfig } = useConfigStore();
  const params = new URLSearchParams(location.search);
  const returnTo = safeWorkspaceDestination(params.get('redirect'));
  const [intent, setIntent] = useState(() => {
    const state = location.state || {};
    return { ...readJourneyIntent(), ...sanitizeIntent({ ...state, templateId: state.templateId || state.selectedTemplate?.id || params.get('design') }) };
  });
  const [step, setStep] = useState(1), [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlans, setShowPlans] = useState(false), [showDesigns, setShowDesigns] = useState(false);
  const [name, setName] = useState(''), [email, setEmail] = useState(typeof location.state?.email === 'string' ? location.state.email : '');
  const [password, setPassword] = useState(''), [terms, setTerms] = useState(false);
  const [restaurant, setRestaurant] = useState('');
  const [industry, setIndustry] = useState<NonNullable<Organization['industry']>>('Restaurant');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York');
  const initialized = useRef<string | null>(null), submitting = useRef(false), finishing = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null), checkoutRequest = useRef(crypto.randomUUID());
  const scope = user && organization ? `${user.uid}:${organization.id}` : 'visitor';
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    if (!user || !organization) return;
    const key = `${user.uid}:${organization.id}`;
    if (initialized.current === key) return;
    const firstAccount = initialized.current === null;
    initialized.current = key;
    const saved = claimJourneyIntent(key);
    setIntent(current => saveJourneyIntent(firstAccount ? { ...saved, ...current } : saved, key));
    setRestaurant(organization.name || ''); setIndustry(organization.industry || 'Restaurant');
    setTimezone(organization.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York');
    const query = new URLSearchParams(location.search);
    const destination = safeWorkspaceDestination(query.get('redirect'));
    if (destination && (organization.industry || organization.isSetupComplete)) { navigate(destination, { replace: true }); return; }
    const requested = query.has('design') || query.has('content') || query.has('canceled') || saved.templateId || intent.templateId || intent.plan;
    if (userProfile?.platformRole === 'designer') { navigate('/designer', { replace: true }); return; }
    if (userProfile?.platformRole === 'admin' && organization.isSetupComplete && !requested) { navigate('/super-admin', { replace: true }); return; }
    if (organization.isSetupComplete && !requested && !finishing.current) { navigate('/admin', { replace: true }); return; }
    setStep(organization.industry ? 3 : 2); setBusy(false);
  }, [user, organization, userProfile, location.search, navigate, intent.templateId, intent.plan]);
  const signup = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current || generalConfig.featureFlags?.publicSignupEnabled === false) return;
    if (!terms) { setError('Please agree to the terms and privacy policy to create your account.'); return; }
    submitting.current = true; setBusy(true); setError(null); saveJourneyIntent(intent);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(result.user, { displayName: name.trim() }); setPassword('');
    } catch (e) { setError(customerError(e, 'We could not create your account. Check your details and try again.')); }
    finally { submitting.current = false; setBusy(false); }
  };
  const saveRestaurant = async (event: FormEvent) => {
    event.preventDefault(); if (!organization || !user || submitting.current) return;
    if (!restaurant.trim()) { setError('Enter your restaurant name.'); return; }
    try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }); } catch { setError('Choose a valid time zone.'); return; }
    submitting.current = true; setBusy(true); setError(null);
    try {
      if (!await saveSetupChanges(organization.id, user.uid, { name: restaurant.trim(), industry, timezone })) return;
      if (returnTo) navigate(returnTo, { replace: true }); else setStep(3);
    } catch (e) { setError(customerError(e, 'We could not save your restaurant details. Your changes are still here. Try again.')); }
    finally { submitting.current = false; setBusy(false); }
  };
  const choosePlan = async (plan: PlanName, screens: number, seats: number) => {
    if (submitting.current || !organization) return;
    const next = saveJourneyIntent({ ...intent, plan, screens, seats }, scope); setIntent(next);
    if (plan === 'Free') { setShowPlans(false); return; }
    submitting.current = true; setBusy(true); setError(null);
    try {
      if (organization.subscriptionId) window.location.assign(await BillingService.createPortalSession(`${window.location.origin}/onboarding?content=1`));
      else window.location.assign(await BillingService.createPlanCheckout(organization.id, plan, screens, seats, 'setup', checkoutRequest.current));
    } catch (e) { setError(customerError(e, 'Payment options could not be opened. No payment was confirmed here. Try again or continue with your current plan.')); }
    finally { submitting.current = false; setBusy(false); }
  };
  const finish = async (destination: string) => {
    if (!organization || !user || submitting.current) return;
    submitting.current = true; finishing.current = true; setBusy(true); setError(null);
    try {
      // Profile completion is not a claim that a physical screen is playing.
      if (!await saveSetupChanges(organization.id, user.uid, { isSetupComplete: true })) return;
      navigate(destination);
    } catch (e) { finishing.current = false; setError(customerError(e, 'Your choices are saved, but we could not finish this step. Try again.')); throw e; }
    finally { submitting.current = false; setBusy(false); }
  };
  const selectedDesign = RESTAURANT_TEMPLATES.find(t => t.id === intent.templateId);
  const timezones = Array.from(new Set([timezone, 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix', 'Pacific/Honolulu', 'Europe/London', 'UTC']));
  return <div className="min-h-screen bg-background text-text">
    <a className="skip-link" href="#setup-main">Skip to content</a>
    <header className="border-b border-surface-highlight p-4 sm:px-8 flex flex-wrap justify-between gap-4"><Link to="/restaurants" className="font-semibold text-xl min-h-11 inline-flex items-center">AccelRestaurants</Link><nav aria-label="Setup progress"><p className="text-sm mb-2">Step {step} of 4</p><ol className="flex flex-wrap gap-4 text-sm">{['Account', 'Restaurant', 'Design', 'Connect'].map((label, i) => <li key={label} aria-current={step === i + 1 ? 'step' : undefined} className={step === i + 1 ? 'font-semibold' : 'text-text-secondary'}>{i + 1}. {label}</li>)}</ol></nav></header>
    <main id="setup-main" className="max-w-3xl mx-auto p-4 sm:p-8 py-10">
      <InlineFeedback message={error} tone="error" /><InlineFeedback message={busy ? 'Saving your choices…' : null} />
      {params.has('canceled') && <InlineFeedback message="Checkout was canceled. Your design choices are still here. You can continue with your current plan." />}
      {params.has('content') && <InlineFeedback message="Welcome back. Your available features update when your payment is confirmed. You can continue designing while this finishes." />}
      {!user ? <section className="rounded-xl border border-surface-highlight bg-surface p-5 sm:p-8">
        <h1 ref={heading} tabIndex={-1} className="text-3xl font-semibold">Create your account</h1><p className="text-text-secondary mt-3 mb-6">Start with a restaurant design. You do not need to choose a paid plan yet.</p>
        {generalConfig.featureFlags?.publicSignupEnabled === false ? <><p>New registration is currently paused. Existing accounts and team invitations still work.</p><Link className="ui-button ui-button-primary mt-5" to="/login">Sign in</Link></> : <form onSubmit={signup} className="space-y-5" aria-busy={busy}>
          <label className="block" htmlFor="setup-name">Full name<input id="setup-name" autoComplete="name" value={name} maxLength={100} required onChange={e => setName(e.target.value)} className={fieldClass} /></label>
          <label className="block" htmlFor="setup-email">Email<input id="setup-email" type="email" autoComplete="email" value={email} required onChange={e => setEmail(e.target.value)} className={fieldClass} /></label>
          <label className="block" htmlFor="setup-password">Password<input aria-label="Password" aria-describedby="setup-password-help" id="setup-password" type="password" autoComplete="new-password" minLength={8} value={password} required onChange={e => setPassword(e.target.value)} className={fieldClass} /><span id="setup-password-help" className="block text-sm text-text-secondary mt-2">Use at least eight characters.</span></label>
          <label className="flex items-start gap-3 py-2"><input type="checkbox" checked={terms} required onChange={e => setTerms(e.target.checked)} className="mt-1" /><span>I agree to the <a className="underline" href={safeWebLink(generalConfig.termsOfServiceUrl) || '/terms'} target="_blank" rel="noreferrer">terms</a> and <a className="underline" href={safeWebLink(generalConfig.privacyPolicyUrl) || '/privacy'} target="_blank" rel="noreferrer">privacy policy</a>.</span></label>
          <button type="submit" className="ui-button ui-button-primary" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        </form>}
        <p className="mt-5"><Link className="underline min-h-11 inline-flex items-center" to="/login">Already have an account? Sign in</Link></p>
      </section> : !organization ? <section><h1 className="text-3xl font-semibold">Your account is ready</h1><p role="status" className="mt-4">Your restaurant workspace is being prepared. Your account does not need to be created again.</p><button type="button" className="ui-button ui-button-secondary mt-5" onClick={() => window.location.reload()}>Check again</button><Link to="/login" className="ui-button ui-button-secondary ml-3">Back to sign in</Link></section> : step === 2 ? <section className="rounded-xl border border-surface-highlight bg-surface p-5 sm:p-8"><h1 ref={heading} tabIndex={-1} className="text-3xl font-semibold">Tell us about your restaurant</h1><p className="text-text-secondary mt-3 mb-6">You can add addresses and invite your team later.</p><form onSubmit={saveRestaurant} className="space-y-5">
        <label className="block" htmlFor="restaurant-name">Restaurant name<input id="restaurant-name" autoComplete="organization" required maxLength={100} value={restaurant} onChange={e => setRestaurant(e.target.value)} className={fieldClass} /></label>
        <label className="block" htmlFor="restaurant-type">Restaurant type<select id="restaurant-type" value={industry} onChange={e => setIndustry(e.target.value as NonNullable<Organization['industry']>)} className={fieldClass}>{['Restaurant', 'Bar', 'Cafe', 'Food Truck', 'Other'].map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="block" htmlFor="restaurant-timezone">Time zone<select id="restaurant-timezone" value={timezone} onChange={e => setTimezone(e.target.value)} className={fieldClass}>{timezones.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
        <button type="submit" disabled={busy} className="ui-button ui-button-primary">Continue to your design</button>
      </form></section> : <section className="rounded-xl border border-surface-highlight bg-surface p-5 sm:p-8"><h1 ref={heading} tabIndex={-1} className="text-3xl font-semibold">Make your first menu board</h1><p className="text-text-secondary mt-4">{selectedDesign ? `${selectedDesign.name} is selected. Add your menu, then connect your screen.` : 'Choose a restaurant design, add your items and prices, then connect your screen.'}</p>{intent.templateId && !selectedDesign && intent.templateId !== '1' && <p role="status" className="mt-3">That design is no longer in this collection. Choose another design to continue.</p>}
        <button type="button" className="ui-button ui-button-primary mt-6" onClick={() => setShowDesigns(true)} disabled={busy}>{selectedDesign ? `Customize ${selectedDesign.name}` : 'Choose a restaurant design'}</button>
        <p className="text-text-secondary mt-5">Your current plan: {organization.plan}. {organization.plan === 'Free' ? 'Includes a five-minute screen preview.' : 'Your existing plan stays in place while you design.'}</p>
        {intent.plan && intent.plan !== organization.plan && <p className="mt-4">You selected {intent.plan}{intent.screens ? ` for ${intent.screens} screens` : ''}{intent.seats ? ` and ${intent.seats} team members` : ''}. Compare plans below to review payment, or start with your current plan.</p>}
        <div className="flex flex-wrap gap-3 mt-4"><button type="button" className="ui-button ui-button-secondary" onClick={() => setShowPlans(true)} disabled={busy}>Compare plans</button><button type="button" className="ui-button ui-button-secondary" onClick={() => { setError(null); setStep(2); }} disabled={busy}>Edit restaurant details</button><button type="button" className="ui-button ui-button-secondary" onClick={() => { void finish('/admin').catch(() => {}); }} disabled={busy}>Set up later</button></div>
      </section>}
    </main>
    {showPlans && <AccessibleDialog title="Choose a plan" description="Compare your monthly total. Payment is only confirmed after you review it at checkout." wide busy={busy} onClose={() => setShowPlans(false)}><InlineFeedback tone="error" message={error} /><PlansPanel initialScreens={intent.screens} initialSeats={intent.seats} selectedPlan={intent.plan} busy={busy} onChoose={(plan, screens, seats) => { void choosePlan(plan, screens, seats); }} /></AccessibleDialog>}
    {showDesigns && organization && user && <RestaurantStarterWizard key={`${scope}:${selectedDesign?.id || 'resume'}`} orgId={organization.id} userId={user.uid} plan={organization.plan} brandName={restaurant || organization.name} firstScreen initialTemplateId={selectedDesign?.id} onClose={() => setShowDesigns(false)} onComplete={async result => { await finish(result.screenId ? `/admin/screens/${result.screenId}?setup=1` : `/admin/slides/${result.slideId}`); setShowDesigns(false); }} />}
  </div>;
};
