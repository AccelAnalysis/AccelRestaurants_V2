import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useConfigStore } from '../../store/useConfigStore';
import { contactLink, safeWebLink } from '../../lib/customerJourney';
import logo from '../../assets/logo.png';

const navLink = 'min-h-11 inline-flex items-center font-medium text-text-secondary hover:text-text';

export const SiteLayout = ({ children }: { children: ReactNode }) => {
  const { generalConfig: config } = useConfigStore();
  const { hash, pathname } = useLocation();
  const contact = contactLink(config.contactEmail);
  const externalLinks = [...(config.footerLinks || []), ...(config.socialLinks || []).map(row => ({ label: row.platform, url: row.url }))].filter(row => safeWebLink(row.url));

  useEffect(() => {
    if (hash && ['#contact', '#templates', '#features', '#measurement'].includes(hash)) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [hash, pathname]);

  return <div className="min-h-screen bg-background text-text">
    <a className="skip-link" href="#site-main">Skip to content</a>
    <header className="border-b border-surface-highlight bg-surface">
      <nav aria-label="Main navigation" className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Link to="/restaurants" className="flex items-center gap-2 min-h-11 font-semibold text-lg shrink-0"><img src={safeWebLink(config.logoUrl) || logo} alt="" className="h-8 w-auto" />AccelRestaurants</Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link className={navLink} to="/designs">Designs</Link>
          {config.featureFlags?.showPricingPage !== false && <Link className={navLink} to="/pricing">Plans</Link>}
          <Link className={navLink} to="/login">Sign in</Link>
        </div>
      </nav>
    </header>
    {config.maintenanceMode && <p role="status" className="max-w-7xl mx-auto p-4">We are making updates. Some features may be temporarily unavailable.</p>}
    <main id="site-main" tabIndex={-1} className="focus:outline-none">{children}</main>
    <footer id="contact" className="border-t border-surface-highlight mt-12 px-4 sm:px-6 py-12 bg-surface">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2"><img src={safeWebLink(config.logoUrl) || logo} alt="" className="h-7 w-auto" /><span className="font-semibold">AccelRestaurants</span></div>
          <p className="text-sm text-text-secondary mt-3">Restaurant screens and guest feedback.</p>
          {contact && <a className="min-h-11 inline-flex items-center mt-3 underline" href={contact}>Contact us</a>}
        </div>
        <div><h2 className="font-semibold">Product</h2><nav aria-label="Product" className="mt-3 flex flex-col items-start"><Link className={navLink} to="/designs">Designs</Link>{config.featureFlags?.showPricingPage !== false && <Link className={navLink} to="/pricing">Plans</Link>}<Link className={navLink} to="/restaurants#measurement">Guest feedback</Link></nav></div>
        <div><h2 className="font-semibold">Resources</h2><nav aria-label="Resources" className="mt-3 flex flex-col items-start"><Link className={navLink} to="/login">Sign in</Link><Link className={navLink} to="/admin/help">Setup help</Link>{safeWebLink(config.marketing?.bookingUrl) && <a className={navLink} href={safeWebLink(config.marketing?.bookingUrl)}>Book a setup call</a>}</nav></div>
        <div><h2 className="font-semibold">Legal</h2><nav aria-label="Legal" className="mt-3 flex flex-col items-start"><a className={navLink} href={safeWebLink(config.privacyPolicyUrl) || '/privacy'}>Privacy</a><a className={navLink} href={safeWebLink(config.termsOfServiceUrl) || '/terms'}>Terms</a></nav></div>
      </div>
      {externalLinks.length > 0 && <div className="max-w-7xl mx-auto flex flex-wrap gap-x-5 gap-y-1 mt-8 pt-6 border-t border-surface-highlight">{externalLinks.map((row, index) => <a key={`${row.label}-${index}`} className={navLink} href={safeWebLink(row.url)}>{row.label}</a>)}</div>}
      <div className="max-w-7xl mx-auto mt-6 text-sm text-text-secondary">{config.footerCopyrightText || '© 2026 Accel Analysis, LLC. All rights reserved.'}</div>
    </footer>
  </div>;
};
