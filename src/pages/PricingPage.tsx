import { useNavigate } from 'react-router-dom';
import { SiteLayout } from '../components/journey/SiteLayout';
import { PlansPanel } from '../components/journey/PlansPanel';
import { readJourneyIntent, saveJourneyIntent } from '../lib/customerJourney';
import { useConfigStore } from '../store/useConfigStore';
export const PricingPage = () => {
  const navigate = useNavigate();
  const { generalConfig } = useConfigStore();
  const intent = readJourneyIntent();
  return <SiteLayout><div className="max-w-7xl mx-auto px-4 sm:px-6 py-12"><h1 className="text-4xl font-bold text-center">Choose the right plan for your restaurant</h1><p className="text-lg text-text-secondary text-center mt-4 mb-10">Compare the total for your screens and team. Create a design for free before you decide.</p>{generalConfig.featureFlags?.showPricingPage === false ? <p>Plan details are not available on this page right now. Contact us for help.</p> : <PlansPanel initialScreens={intent.screens} initialSeats={intent.seats} selectedPlan={intent.plan} onChoose={(plan, screens, seats) => {
    const next = saveJourneyIntent({ ...intent, plan, screens, seats });
    navigate('/onboarding', { state: next });
  }} />}</div></SiteLayout>;
};
