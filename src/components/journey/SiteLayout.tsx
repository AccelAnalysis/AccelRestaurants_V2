import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useConfigStore } from '../../store/useConfigStore';
import { contactLink, safeWebLink } from '../../lib/customerJourney';
import logo from '../../assets/logo.png';
export const SiteLayout = ({ children }: { children: ReactNode }) => {
  const { generalConfig: config } = useConfigStore();
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (hash === '#contact' || hash === '#templates' || hash === '#features') document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [hash, pathname]);
  return <div className="min-h-screen bg-background text-text">
    <a className="skip-link" href="#site-main">Skip to content</a>
    <header className="border-b border-surface-highlight bg-surface">
      <nav aria-label="Main navigation" className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 min-h-11 font-semibold text-lg"><img src={safeWebLink(config.logoUrl) || logo} alt="" className="h-8 w-auto" />AccelRestaurants</Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Link className="ui-button ui-button-secondary" to="/#templates">Designs</Link>
          {config.featureFlags?.showPricingPage !== false && <Link className="ui-button ui-button-secondary" to="/pricing">Compare plans</Link>}
          <Link className="ui-button ui-button-secondary" to="/login">Sign in</Link>
          {config.featureFlags?.publicSignupEnabled !== false && <Link className="ui-button ui-button-primary" to="/onboarding">Start free</Link>}
        </div>
      </nav>
    </header>
    {config.maintenanceMode && <p role="status" className="max-w-7xl mx-auto p-4">We are making updates. Some features may be temporarily unavailable.</p>}
    <main id="site-main" tabIndex={-1} className="focus:outline-none">{children}</main>
    <footer id="contact" className="border-t border-surface-highlight mt-12 px-4 sm:px-6 py-10">
      <div className="max-w-7xl mx-auto grid sm:grid-cols-2 gap-8">
        <div><h2 className="font-semibold text-xl">Need a hand with your screens?</h2><p className="text-text-secondary my-3">Choose a design to get started, or get help with your restaurant setup.</p><div className="flex flex-wrap gap-3">
          {contactLink(config.contactEmail) ? <a className="ui-button ui-button-secondary" href={contactLink(config.contactEmail)}>Contact us</a> : <Link className="ui-button ui-button-secondary" to="/admin/help">Get setup help</Link>}
          {safeWebLink(config.marketing?.bookingUrl) && <a className="ui-button ui-button-primary" href={safeWebLink(config.marketing?.bookingUrl)}>Book a setup call</a>}
        </div></div>
        <div className="sm:text-right"><p>AccelRestaurants</p><p className="text-text-secondary mt-2">Part of AccelDigitalDisplays</p><div className="flex sm:justify-end flex-wrap gap-4 mt-4"><a className="min-h-11 inline-flex items-center underline" href={safeWebLink(config.privacyPolicyUrl) || '/privacy'}>Privacy</a><a className="min-h-11 inline-flex items-center underline" href={safeWebLink(config.termsOfServiceUrl) || '/terms'}>Terms</a></div></div>
      </div>
    </footer>
  </div>;
};
