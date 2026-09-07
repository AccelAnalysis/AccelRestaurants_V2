import { CinematicPlanBenefits } from '../components/cinematic/CinematicPlanBenefits';
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { PLAN_CONFIGS } from '../lib/plans';
import type { PlanType, PlanLimits } from '../lib/plans';

export const PricingPage = () => {
  const navigate = useNavigate();
  const [screens, setScreens] = useState(1);
  const [seats, setSeats] = useState(1);

  // Calculate costs dynamically
  const calculateCost = useCallback((planName: PlanType, config: PlanLimits) => {
    if (planName === 'Franchise') return { total: 0, breakdown: [] };
    
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
          // This plan is not valid for this number of screens
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
    if (screens > 7 || seats > 2) return 'Enterprise'; // Or Growth with add-ons, but Enterprise has better value usually? 
    // Actually Growth supports up to 25 screens via add-ons. 
    // Let's check cost efficiency.
    
    const growthCost = calculateCost('Growth', PLAN_CONFIGS['Growth']).total;
    const enterpriseCost = calculateCost('Enterprise', PLAN_CONFIGS['Enterprise']).total;
    
    if (growthCost > -1 && enterpriseCost > -1 && enterpriseCost < growthCost) return 'Enterprise';
    if (screens > 1 || seats > 1) return 'Growth'; // Actually Basic supports add-ons too
    
    // Check Basic vs Growth
    const basicCost = calculateCost('Basic', PLAN_CONFIGS['Basic']).total;
    if (basicCost > -1 && growthCost > -1 && growthCost < basicCost) return 'Growth';
    
    if (screens > 1 || seats > 1) return 'Basic';

    return 'Free';
  }, [screens, seats, calculateCost]);


  return (
    <div className="min-h-screen bg-background text-text">
       {/* Navigation */}
       <nav className="w-full z-50 bg-background/80 backdrop-blur-md border-b border-surface-highlight">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3 justify-between items-center py-4">
            <button type="button" className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
              <span className="text-2xl font-bold text-primary tracking-tight">AccelRestaurants</span>
            </button>
            <div className="flex flex-wrap items-center gap-4">
               <button onClick={() => navigate('/')} className="text-sm font-medium hover:text-primary transition-colors">Home</button>
               <button onClick={() => navigate('/login')} className="text-sm font-medium hover:text-primary transition-colors">Log In</button>
               <button onClick={() => navigate('/onboarding')} className="bg-primary hover:bg-primary-hover text-white text-sm font-bold py-2 px-4 rounded-full transition-all">Start Free</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Simple, transparent pricing</h1>
          <p className="text-xl text-text-muted max-w-2xl mx-auto">
            Start for free, upgrade as you grow. No hidden installation fees or hardware lock-in.
          </p>
        </div>

        {/* Configuration Sliders */}
        <div className="bg-surface p-8 rounded-2xl border border-surface-highlight mb-16 max-w-3xl mx-auto shadow-2xl">
          <h2 className="text-2xl font-bold mb-8 text-center">Estimate your monthly cost</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-8">
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-bold">Number of Screens</label>
                <span className="text-primary font-bold text-xl">{screens}</span>
              </div>
              <input aria-label={"Number of screens"}
                type="range" 
                min="1" 
                max="50" 
                value={screens} 
                onChange={(e) => setScreens(parseInt(e.target.value))} 
                className="w-full h-2 bg-surface-highlight rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-text-muted mt-2">
                <span>1</span>
                <span>25</span>
                <span>50+</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-bold">Team Members</label>
                <span className="text-primary font-bold text-xl">{seats}</span>
              </div>
              <input aria-label={"Number of team members"}
                type="range" 
                min="1" 
                max="20" 
                value={seats} 
                onChange={(e) => setSeats(parseInt(e.target.value))} 
                className="w-full h-2 bg-surface-highlight rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-text-muted mt-2">
                <span>1</span>
                <span>10</span>
                <span>20+</span>
              </div>
            </div>
          </div>
          
          <div className="text-center bg-background/50 p-4 rounded-lg border border-surface-highlight">
            <p className="text-text-muted mb-1">Recommended Plan</p>
            <p className="text-2xl font-bold text-primary">{recommendedPlan}</p>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {(Object.keys(PLAN_CONFIGS) as PlanType[]).map((planName) => {
            const config = PLAN_CONFIGS[planName];
            const costData = calculateCost(planName, config);
            const isRecommended = recommendedPlan === planName;
            const isInvalid = Boolean(costData.invalid);

            return (
              <div 
                key={planName} 
                className={`relative flex flex-col p-6 rounded-2xl border transition-all duration-300 ${
                  isRecommended 
                    ? 'border-primary bg-surface shadow-2xl z-10'
                    : isInvalid
                      ? 'border-surface-highlight bg-surface/30 opacity-50'
                      : 'border-surface-highlight bg-surface hover:border-primary/50'
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Best Value
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2">{planName}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      {planName === 'Franchise' ? 'Custom' : `$${costData.invalid ? config.price : costData.total}`}
                    </span>
                    {planName !== 'Franchise' && <span className="text-text-muted">/mo</span>}
                  </div>
                  <p className="text-sm text-text-muted mt-2 min-h-[40px]">{config.description}</p>
                  <CinematicPlanBenefits plan={planName} />
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
                  aria-label={planName === 'Franchise' ? 'Contact sales for Franchise' : `Choose ${planName} plan`} onClick={() => planName === 'Franchise' ? navigate('/#contact') : navigate('/onboarding', { state: { plan: planName, screens, seats } })}
                  disabled={!!costData.invalid}
                  className={`w-full py-3 rounded-lg font-bold transition-colors ${
                    isRecommended 
                      ? 'bg-primary hover:bg-primary-hover text-white' 
                      : isInvalid
                        ? 'bg-surface-highlight cursor-not-allowed text-text-muted'
                        : 'bg-surface-highlight hover:bg-surface-highlight/80 text-white'
                  }`}
                >
                  {planName === 'Franchise' ? 'Contact Sales' : 'Choose Plan'}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
           <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
           <div className="space-y-4">
             <FaqItem question="What counts as a screen?" answer="A screen is any TV, monitor, or tablet that you pair with AccelRestaurants to display content. You can manage multiple screens from one dashboard." />
             <FaqItem question="What is a seat?" answer="A seat represents a team member or user account that has access to your organization's dashboard to edit menus or manage screens." />
             <FaqItem question="Can I change my plan later?" answer="Yes! You can upgrade or downgrade your plan at any time from the billing settings. Changes take effect immediately." />
             <FaqItem question="Do I need special hardware?" answer="No. AccelRestaurants works on any device with a modern web browser. Smart TVs, Fire Sticks, or a cheap PC stick work perfectly." />
           </div>
        </div>
      </div>
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

const FaqItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border border-surface-highlight rounded-lg bg-surface overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left hover:bg-surface-highlight/50 transition-colors"
      >
        <span className="font-bold">{question}</span>
        {isOpen ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
      </button>
      {isOpen && (
        <div className="p-4 pt-0 text-text-muted border-t border-surface-highlight/50 mt-2">
          {answer}
        </div>
      )}
    </div>
  );
};
