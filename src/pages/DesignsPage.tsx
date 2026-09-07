import { useNavigate } from 'react-router-dom';
import { SiteLayout } from '../components/journey/SiteLayout';
import { RestaurantSlidePreview } from '../components/cinematic/RestaurantSlidePreview';
import { RESTAURANT_TEMPLATES, buildRestaurantSlide, defaultStarter } from '../../functions/src/cinematic/templates';
import { useConfigStore } from '../store/useConfigStore';
import { saveJourneyIntent } from '../lib/customerJourney';
import type { Slide } from '../types/schema';

export const DesignsPage = () => {
  const navigate = useNavigate();
  const { generalConfig: config } = useConfigStore();
  const enabled = config.featureFlags?.publicSignupEnabled !== false;
  const start = (templateId: string) => {
    saveJourneyIntent({ templateId });
    navigate(`/onboarding?design=${encodeURIComponent(templateId)}`, { state: { templateId } });
  };

  return <SiteLayout>
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="max-w-3xl mb-10">
        <p className="text-text-secondary mb-3">Restaurant designs</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Find a look that fits your restaurant</h1>
        <p className="text-lg text-text-secondary mt-4">Preview every restaurant starting point here. You can replace the sample items, prices and wording after you choose one.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {RESTAURANT_TEMPLATES.map(template => <article key={template.id} className="rounded-xl border border-surface-highlight overflow-hidden bg-surface">
          <RestaurantSlidePreview slide={buildRestaurantSlide(defaultStarter(template.id), 'public-preview', template.id) as unknown as Slide} />
          <div className="p-5">
            <h2 className="text-xl font-semibold">{template.name}</h2>
            <p className="text-text-secondary mt-2">{template.category}{template.signature ? ' · Growth and above' : ' · Included with Free'}</p>
            {enabled && <button type="button" className="ui-button ui-button-secondary mt-4" onClick={() => start(template.id)} aria-label={`Use ${template.name} design`}>Use this design</button>}
          </div>
        </article>)}
      </div>
    </section>
  </SiteLayout>;
};
