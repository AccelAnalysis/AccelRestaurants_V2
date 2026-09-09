import { Link, useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { SiteLayout } from '../components/journey/SiteLayout';
import { RestaurantSlidePreview } from '../components/cinematic/RestaurantSlidePreview';
import { RESTAURANT_TEMPLATES, buildRestaurantSlide, defaultStarter } from '../../functions/src/cinematic/templates';
import { useConfigStore } from '../store/useConfigStore';
import { safeWebLink, saveJourneyIntent } from '../lib/customerJourney';
import type { Slide } from '../types/schema';

const fallbackBenefits = [
  { title: 'Designed for restaurants', body: 'Start with an editable menu or promotion and make it fit your food, brand and space.' },
  { title: 'Update from anywhere', body: 'Change menus and promotions from your browser instead of making another trip to the screen.' },
  { title: 'Learn what guests notice', body: 'Add a QR offer or feedback prompt, then review scans, responses and ratings in one place.' },
];

const featuredTemplateIds = new Set(['coffee-house', 'grill-house', 'fresh-counter']);

export const LandingPage = () => {
  const navigate = useNavigate();
  const { generalConfig: config } = useConfigStore();
  const enabled = config.featureFlags?.publicSignupEnabled !== false;
  const video = safeWebLink(config.landingPageVideoUrl);
  const featuredTemplates = RESTAURANT_TEMPLATES.filter(template => featuredTemplateIds.has(template.id));
  const copy = config.marketing;

  const start = (templateId?: string) => {
    saveJourneyIntent({ templateId });
    navigate(templateId ? `/onboarding?design=${encodeURIComponent(templateId)}` : '/onboarding', { state: { templateId } });
  };

  return <SiteLayout>
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
      <div className="max-w-2xl">
        <p className="text-sm sm:text-base text-text-secondary mb-4">Restaurant screens and guest feedback</p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">{config.landingPageTitle || 'Beautiful restaurant screens. Guest feedback built in.'}</h1>
        <p className="text-lg sm:text-xl text-text-secondary mt-6 leading-relaxed">{config.landingPageDescription || 'Create polished menus and promotions, keep them current from your browser, and see what guests respond to with QR offers and feedback.'}</p>
        <div className="flex flex-wrap items-center gap-4 mt-8">
          {enabled && <button type="button" className="ui-button ui-button-primary" onClick={() => start()}>Start designing</button>}
          {config.featureFlags?.showPricingPage !== false && <Link to="/pricing" className="min-h-11 inline-flex items-center font-semibold text-primary hover:underline">View plans</Link>}
        </div>
        <p className="text-sm text-text-secondary mt-4">Create your design before choosing a paid plan.</p>
      </div>

      <figure className="min-w-0">
        {video ? <video key={video} src={video} controls playsInline preload="metadata" aria-label="AccelRestaurants product demonstration" className="w-full aspect-video rounded-2xl border border-surface-highlight bg-black object-cover" /> : <div className="aspect-video rounded-2xl border border-surface-highlight bg-surface overflow-hidden flex items-center justify-center p-8 text-center" aria-label="Product demonstration video placeholder">
          <div className="max-w-sm">
            <div className="w-14 h-14 rounded-full border border-surface-highlight bg-background mx-auto flex items-center justify-center" aria-hidden="true"><Play className="w-6 h-6 ml-1" /></div>
            <p className="text-xl font-semibold mt-5">See AccelRestaurants in action</p>
            <p className="text-text-secondary mt-2">A short product walkthrough will appear here.</p>
          </div>
        </div>}
        <figcaption className="text-sm text-text-secondary mt-3">{video ? 'Product demonstration. Playback starts only when you choose to play it.' : 'Product demonstration video'}</figcaption>
      </figure>
    </section>

    <section id="features" className="border-y border-surface-highlight bg-surface px-4 sm:px-6 py-12 sm:py-14">
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 lg:gap-12">
        {fallbackBenefits.map((item, index) => <article key={item.title}>
          <h2 className="text-xl font-semibold">{copy?.benefits?.[index]?.title || item.title}</h2>
          <p className="text-text-secondary mt-3 leading-relaxed">{copy?.benefits?.[index]?.body || item.body}</p>
        </article>)}
      </div>
    </section>

    <section id="templates" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-semibold">Start with a restaurant design</h2>
          <p className="text-text-secondary mt-3">A few starting points. Every design is editable.</p>
        </div>
        <Link to="/designs" className="min-h-11 inline-flex items-center font-semibold text-primary hover:underline">View all designs</Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {featuredTemplates.map(template => <article key={template.id} className="rounded-xl border border-surface-highlight overflow-hidden bg-surface">
          <RestaurantSlidePreview slide={buildRestaurantSlide(defaultStarter(template.id), 'public-preview', template.id) as unknown as Slide} />
          <div className="p-5">
            <h3 className="text-xl font-semibold">{template.name}</h3>
            <p className="text-text-secondary mt-2">{template.category}</p>
            {enabled && <button type="button" className="ui-button ui-button-secondary mt-4" onClick={() => start(template.id)} aria-label={`Use ${template.name} design`}>Use this design</button>}
          </div>
        </article>)}
      </div>
    </section>

    <section id="measurement" className="border-y border-surface-highlight bg-surface px-4 sm:px-6 py-12 sm:py-14">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-semibold">See what guests respond to</h2>
        <p className="text-lg text-text-secondary mt-4 leading-relaxed">{copy?.measurementDescription || 'Connect a QR code to an offer or a quick feedback prompt. See scans, completed responses and ratings together so you have a clearer signal about what to try next.'}</p>
        <p className="text-sm text-text-secondary mt-4">Scans and offer interactions are not confirmed purchases. Feedback reflects the guests who choose to respond.</p>
      </div>
    </section>

    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
      <h2 className="text-3xl font-semibold">Ready to make your first screen?</h2>
      <p className="text-text-secondary mt-3">Choose a design, add your menu, then connect a screen when you are ready.</p>
      <div className="mt-6 flex justify-center gap-4 flex-wrap">
        {enabled && <button type="button" className="ui-button ui-button-primary" onClick={() => start()}>Start designing</button>}
        <Link to="/designs" className="min-h-11 inline-flex items-center font-semibold text-primary hover:underline">Browse designs</Link>
      </div>
    </section>
  </SiteLayout>;
};
