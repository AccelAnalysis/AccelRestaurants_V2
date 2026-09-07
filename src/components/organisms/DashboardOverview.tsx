import { useEffect, useState, type ElementType } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, FileText, Image as ImageIcon, ArrowUpRight } from 'lucide-react';
import { ScreenService } from '../../services/screenService';
import { MenuService } from '../../services/menuService';
import { SlideService } from '../../services/slideService';
import { StorageService } from '../../services/storageService';
import { useAuthStore } from '../../store/useAuthStore';
import { STORAGE_PATHS } from '../../lib/constants';
import { FirstScreenGuide } from '../journey/FirstScreenGuide';
import { InlineFeedback } from '../atoms/InlineFeedback';
import { DesignerConnectionsWidget } from './DesignerConnectionsWidget';
import { RecentActivityFeed } from './RecentActivityFeed';
import { PerformanceMetricsWidget } from './PerformanceMetricsWidget';
import { BillingStatusWidget } from './BillingStatusWidget';

type Stats = { screens: number; activeScreens: number; menus: number; slides: number; media: number };
type Result = { scope: string; stats: Stats; error?: never } | { scope: string; stats?: never; error: string };
const StatCard = ({ title, amount, subtitle, icon: Icon, link }: { title: string; amount: number | undefined; subtitle: string; icon: ElementType; link: string }) => (
  <Link to={link} className="block bg-surface border border-surface-highlight rounded-lg p-6 hover:border-primary transition-colors group">
    <div className="flex justify-between gap-3 items-start mb-4"><div><h2 className="text-text-secondary text-sm font-medium mb-2">{title}</h2><p className="text-3xl font-semibold tabular-nums">{amount === undefined ? '—' : amount}</p></div><Icon size={24} aria-hidden="true" className="text-primary shrink-0" /></div>
    <p className="flex items-center gap-1 text-sm text-text-secondary"><span>{subtitle}</span><ArrowUpRight size={16} aria-hidden="true" /></p>
  </Link>
);
export const DashboardOverview = () => {
  const { user, organization } = useAuthStore();
  const userId = user?.uid, orgId = organization?.id;
  const scope = `${userId}:${orgId}`;
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!orgId || !userId) return;
    let disposed = false;
    const load = async () => {
      try {
        const [screens, menus, slides, media] = await Promise.all([
          ScreenService.getScreens(orgId), MenuService.getMenus(orgId), SlideService.getSlides(orgId),
          StorageService.listFiles(STORAGE_PATHS.ORGANIZATION_ASSETS(orgId)),
        ]);
        if (!disposed) setResult({ scope, stats: { screens: screens.length, activeScreens: screens.filter(screen => screen.isActive).length, menus: menus.length, slides: slides.length, media: media.length } });
      } catch {
        if (!disposed) setResult({ scope, error: 'We could not load your restaurant summary. Your saved content has not changed.' });
      }
    };
    void load();
    return () => { disposed = true; };
  }, [orgId, userId, scope, attempt]);
  const current = result?.scope === scope ? result : null;
  const stats = current?.stats;
  return <div className="p-4 sm:p-8">
    <header className="mb-8"><h1 className="text-3xl font-semibold mb-2">Your restaurant</h1><p className="text-text-secondary">Manage your screens, content and guest responses.</p></header>
    <FirstScreenGuide />
    <InlineFeedback tone="error" message={current?.error}>{current?.error && <button type="button" className="ui-button ui-button-secondary mt-3" onClick={() => { setResult(null); setAttempt(value => value + 1); }}>Try again</button>}</InlineFeedback>
    {!current && <p role="status" className="text-text-secondary mb-4">Loading your restaurant summary…</p>}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
      <StatCard title="Screens" amount={stats?.screens} subtitle={stats ? `${stats.activeScreens} enabled for playback` : 'Manage screens'} icon={Monitor} link="/admin/screens" />
      <StatCard title="Menus" amount={stats?.menus} subtitle="Manage menus" icon={FileText} link="/admin/menus" />
      <StatCard title="Saved designs" amount={stats?.slides} subtitle="Review designs" icon={ImageIcon} link="/admin/slides" />
      <StatCard title="Photos and media" amount={stats?.media} subtitle="Manage media" icon={ImageIcon} link="/admin/media" />
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
      <div className="xl:col-span-2 min-w-0"><PerformanceMetricsWidget /></div>
      <div className="space-y-6"><DesignerConnectionsWidget /><section className="bg-surface border border-surface-highlight rounded-lg p-6"><h2 className="text-lg font-semibold mb-4">Create something new</h2><div className="flex flex-col gap-3"><Link className="ui-button ui-button-secondary" to="/admin/slides/new">Create a design</Link><Link className="ui-button ui-button-secondary" to="/admin/menus/new">Create a menu</Link></div></section></div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><RecentActivityFeed /><BillingStatusWidget /></div>
  </div>;
};
