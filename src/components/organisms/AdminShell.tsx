import logo from '../../assets/logo.png';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, Monitor, MapPin, LayoutDashboard, FileText, Presentation, Image, Palette, TrendingUp, Settings, HelpCircle } from 'lucide-react';
import { AccessibleDialog } from '../atoms/AccessibleDialog';
import { ApplicationVolumeControl } from '../atoms/ApplicationVolumeControl';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const groups = [
  { title: 'Workspace', links: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/screens', label: 'Screens', icon: Monitor },
    { to: '/admin/locations', label: 'Locations', icon: MapPin },
  ] },
  { title: 'Content', links: [
    { to: '/admin/menus', label: 'Menus', icon: FileText },
    { to: '/admin/slides', label: 'Slides', icon: Presentation },
    { to: '/admin/media', label: 'Media', icon: Image },
    { to: '/admin/designers', label: 'Find a designer', icon: Palette },
  ] },
  { title: 'Manage', links: [
    { to: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
    { to: '/admin/master-dashboard', label: 'All locations', icon: LayoutDashboard },
    { to: '/admin/subscription', label: 'Plan and billing', icon: Settings },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
    { to: '/admin/help', label: 'Help & support', icon: HelpCircle },
  ] },
];

export const AdminShell = ({ children, account, banner }: { children: ReactNode; account: ReactNode; banner?: ReactNode }) => {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const desktop = useMediaQuery('(min-width: 1024px)');
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      main.current?.focus();
    }
  }, [pathname]);
  const navigation = <nav className="admin-nav space-y-5" aria-label="Main navigation">
    {groups.map(group => <section key={group.title} aria-label={group.title}>
      <h2 className="px-3 mb-1 text-xs font-semibold text-text-muted">{group.title}</h2>
      {group.links.map(({ to, label, icon: Icon, ...options }) => <NavLink key={to} to={to} {...options} onClick={() => setNavigationOpen(false)}>
        <Icon size={20} aria-hidden="true" /><span>{label}</span>
      </NavLink>)}
    </section>)}
  </nav>;
  return <div className="min-h-screen bg-background text-text">
    <a className="skip-link" href="#admin-main">Skip to content</a>
    {banner}
    <header className="sticky top-0 z-40 min-h-16 bg-surface border-b border-surface-highlight flex items-center gap-3 px-4 py-2" style={{ paddingTop: 'max(.5rem, env(safe-area-inset-top))' }}>
      {!desktop && <button type="button" className="ui-button ui-button-secondary" aria-label="Open navigation" aria-expanded={navigationOpen} aria-haspopup="dialog" onClick={() => setNavigationOpen(true)}><Menu size={22} aria-hidden="true" /></button>}
      <img src={logo} alt="" className="h-7 w-auto" /><span className="text-base sm:text-lg font-semibold text-primary">AccelRestaurants</span><ApplicationVolumeControl />
    </header>
    <div className="flex min-w-0">
      {desktop && <aside className="w-60 shrink-0 p-4 border-r border-surface-highlight space-y-6">{navigation}{account}</aside>}
      <main id="admin-main" ref={main} tabIndex={-1} className="flex-1 min-w-0 focus:outline-none">{children}</main>
    </div>
    {navigationOpen && !desktop && <AccessibleDialog title="Navigation" description="Choose a workspace or manage your account." onClose={() => setNavigationOpen(false)}>{navigation}<div className="mt-6">{account}</div></AccessibleDialog>}
  </div>;
};
