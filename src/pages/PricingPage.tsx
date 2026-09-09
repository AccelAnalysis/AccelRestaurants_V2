import { WEBSITE_CONTENT } from '../lib/websiteContent';
import { useNavigate } from 'react-router-dom';
import { SiteLayout } from '../components/journey/SiteLayout';
import { PlansPanel } from '../components/journey/PlansPanel';
import { readJourneyIntent, saveJourneyIntent } from '../lib/customerJourney';
import { useConfigStore } from '../store/useConfigStore';
export const PricingPage = () => {
  const navigate = useNavigate();
  const { generalConfig } = useConfigStore();
  const intent = readJourneyIntent();
  const faqs = generalConfig.marketing?.faqs || WEBSITE_CONTENT.faqs;
  return <SiteLayout><div className="max-w-7xl mx-auto px-4 sm:px-6 py-12"><h1 className="text-4xl font-bold text-center">Choose the right plan for your restaurant</h1><p className="text-lg text-text-secondary text-center mt-4 mb-10">Compare the total for your screens and team. Create a design for free before you decide.</p>{generalConfig.featureFlags?.showPricingPage === false ? <p>Plan details are not available on this page right now. Contact us for help.</p> : <PlansPanel initialScreens={intent.screens} initialSeats={intent.seats} selectedPlan={intent.plan} onChoose={(plan, screens, seats) => {
    const next = saveJourneyIntent({ ...intent, plan, screens, seats });
    navigate('/onboarding', { state: next });
  }} />}
    {generalConfig.featureFlags?.showPricingPage !== false && <section aria-label="Plan questions" className="max-w-3xl mx-auto mt-12"><h2 className="text-2xl font-semibold mb-5">Common questions</h2>{faqs.map((row, index) => <details key={index} className="border-b border-surface-highlight py-3"><summary className="font-semibold min-h-11 py-3 cursor-pointer">{row.question}</summary><p className="text-text-secondary pb-4 leading-relaxed">{row.answer}</p></details>)}</section>}
    </div></SiteLayout>;
};
