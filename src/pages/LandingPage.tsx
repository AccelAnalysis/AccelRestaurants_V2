import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteLayout } from '../components/journey/SiteLayout';
import { RestaurantSlidePreview } from '../components/cinematic/RestaurantSlidePreview';
import { RESTAURANT_TEMPLATES, buildRestaurantSlide, defaultStarter } from '../../functions/src/cinematic/templates';
import { useConfigStore } from '../store/useConfigStore';
import { safeWebLink, saveJourneyIntent } from '../lib/customerJourney';
import type { Slide } from '../types/schema';
const features = [
  { title: 'Make your menu stand out', body: 'Start with an editable restaurant design. Add your menu, prices and a background that suits your space.' },
  { title: 'Learn from guest responses', body: 'Connect a QR code to an offer or feedback form. Compare scans, responses and guest ratings in one place.' },
  { title: 'Update without the extra trip', body: 'Manage content for your restaurant screens from your browser, with one place for your menus and promotions.' },
];
export const LandingPage = () => {
  const navigate = useNavigate();
  const { generalConfig: config } = useConfigStore();
  const [email, setEmail] = useState('');
  const [videoFailed, setVideoFailed] = useState(false);
  const enabled = config.featureFlags?.publicSignupEnabled !== false;
  const start = (templateId?: string) => {
    saveJourneyIntent({ templateId });
    navigate(templateId ? `/onboarding?design=${encodeURIComponent(templateId)}` : '/onboarding', { state: { email, templateId } });
  };
  const video = safeWebLink(config.landingPageVideoUrl);
  const copy = config.marketing;
  return <SiteLayout>
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
      <div><p className="text-text-secondary mb-4">Digital menus and guest feedback for restaurants</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">{config.landingPageTitle || 'Beautiful restaurant screens. Guest feedback you can use.'}</h1>
        <p className="text-lg sm:text-xl text-text-secondary mt-6">{config.landingPageDescription || 'Create menus and promotions that fit your restaurant. Add atmosphere effects, keep screens up to date, and learn what guests respond to with QR offers and feedback.'}</p>
        {enabled && <form className="mt-8 flex flex-wrap gap-3 items-end" onSubmit={e => { e.preventDefault(); start(); }}><label className="flex-1 min-w-0">Email <span className="text-text-secondary">(optional)</span><input type="email" autoComplete="email" aria-label="Email for signup" value={email} onChange={e => setEmail(e.target.value)} className="block w-full min-h-11 mt-2 px-4 py-3 rounded-lg border border-surface-highlight bg-surface" /></label><button className="ui-button ui-button-primary" type="submit">Start free</button></form>}
        <div className="flex flex-wrap gap-3 mt-4"><a href="#templates" className="ui-button ui-button-secondary">Explore restaurant designs</a>{config.featureFlags?.showPricingPage !== false && <Link to="/pricing" className="ui-button ui-button-secondary">Compare plans</Link>}</div>
        <p className="text-sm text-text-secondary mt-5">Create a design before choosing a paid plan. Free includes a five-minute screen preview.</p>
      </div>
      <figure className="min-w-0">{video && !videoFailed ? <video key={video} src={video} controls muted playsInline preload="metadata" onError={() => setVideoFailed(true)} aria-label="AccelRestaurants demonstration" className="w-full aspect-video rounded-xl bg-surface" /> : <RestaurantSlidePreview slide={buildRestaurantSlide(defaultStarter('coffee-house'), 'public-preview', 'coffee-preview') as unknown as Slide} />}
        <figcaption className="text-sm text-text-secondary mt-3">{video && !videoFailed ? 'Product demonstration. Use the playback controls to watch or pause.' : 'Sample menu design. Change the names and prices to match your restaurant.'}</figcaption>
      </figure>
    </section>
    <section id="features" className="border-y border-surface-highlight bg-surface px-4 sm:px-6 py-12"><div className="max-w-7xl mx-auto"><h2 className="text-3xl font-semibold mb-8">More than a menu on a TV</h2><div className="grid md:grid-cols-3 gap-8">{features.map((item, i) => <article key={item.title}><h3 className="text-xl font-semibold mb-3">{copy?.benefits?.[i]?.title || item.title}</h3><p className="text-text-secondary leading-relaxed">{copy?.benefits?.[i]?.body || item.body}</p></article>)}</div></div></section>
    <section id="templates" className="max-w-7xl mx-auto px-4 sm:px-6 py-12"><h2 className="text-3xl font-semibold">Find your restaurant’s look</h2><p className="text-text-secondary mt-3 mb-8">Every example is an editable design, not a finished customer menu. Growth and higher plans include all designs and atmosphere effects.</p><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{RESTAURANT_TEMPLATES.map(t => <article key={t.id} className="rounded-xl border border-surface-highlight overflow-hidden bg-surface"><RestaurantSlidePreview slide={buildRestaurantSlide(defaultStarter(t.id), 'public-preview', t.id) as unknown as Slide} /><div className="p-5"><h3 className="text-xl font-semibold">{t.name}</h3><p className="text-text-secondary mt-2">{t.category}{t.signature ? ' · Growth and above' : ' · Included with Free'}</p>{enabled && <button type="button" className="ui-button ui-button-secondary mt-4" onClick={() => start(t.id)} aria-label={`Use ${t.name} design`}>Use this design</button>}</div></article>)}</div></section>
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12"><h2 className="text-3xl font-semibold mb-8">From your menu to your screen</h2><ol className="grid sm:grid-cols-3 gap-8">{[
      ['Choose a design', 'Pick a restaurant layout, then replace the sample items and prices.'],
      ['Connect your screen', 'Follow screen setup and connect a compatible browser-based player. Check that your menu is showing.'],
      ['Hear from guests', 'Add a QR offer or feedback form, then review the responses in your dashboard.'],
    ].map(([title, body], i) => <li key={title}><p className="text-text-secondary mb-2">Step {i + 1}</p><h3 className="text-xl font-semibold">{title}</h3><p className="text-text-secondary mt-3">{body}</p></li>)}</ol></section>
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12"><h2 className="text-3xl font-semibold">See what guests respond to</h2><p className="text-lg text-text-secondary mt-4">{copy?.measurementDescription || 'Track interest in an offer, ask about a visit, or collect a quick rating. QR scans, completed forms and guest ratings help you decide what to try next.'}</p><p className="text-sm text-text-secondary mt-4">Scans and offer interactions are not confirmed purchases. Feedback reflects the guests who choose to respond.</p><h2 className="text-2xl font-semibold mt-10 mb-4">Before you get started</h2>{(copy?.faqs?.length ? copy.faqs : [
      { question: 'Do I need to change my point-of-sale system?', answer: 'No. Create and manage restaurant screens alongside your existing point-of-sale system.' },
      { question: 'What do I need for my screen?', answer: 'You need a display, a compatible device with a modern web browser, and an internet connection for setup and updates. Test your device with the free preview before committing.' },
      { question: 'What does Free include?', answer: 'Create an editable restaurant design and try a five-minute screen preview. Choose a paid plan for ongoing playback.' },
    ]).map(item => <details key={item.question} className="border-b border-surface-highlight py-3"><summary className="min-h-11 flex items-center cursor-pointer font-semibold">{item.question}</summary><p className="text-text-secondary py-3 leading-relaxed">{item.answer}</p></details>)}</section>
  </SiteLayout>;
};
