import { useEffect, useState } from 'react';
import { 
  Monitor, 
  FileText, 
  Image as ImageIcon, 
  ArrowUpRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ScreenService } from '../../services/screenService';
import { MenuService } from '../../services/menuService';
import { SlideService } from '../../services/slideService';
import { StorageService } from '../../services/storageService';
import { useAuthStore } from '../../store/useAuthStore';
import { STORAGE_PATHS } from '../../lib/constants';
import { DesignerConnectionsWidget } from './DesignerConnectionsWidget';
import { RecentActivityFeed } from './RecentActivityFeed';
import { PerformanceMetricsWidget } from './PerformanceMetricsWidget';
import { BillingStatusWidget } from './BillingStatusWidget';

export const DashboardOverview = () => {
  const navigate = useNavigate();
  const { user, organization } = useAuthStore();
  const [stats, setStats] = useState({
    screens: 0,
    activeScreens: 0,
    menus: 0,
    slides: 0,
    media: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !organization) {
        setLoading(false);
        return;
      }
      
      const orgId = organization.id; 

      try {
        const [screens, menus, slides, mediaFiles] = await Promise.all([
          ScreenService.getScreens(orgId),
          MenuService.getMenus(orgId),
          SlideService.getSlides(orgId),
          StorageService.listFiles(STORAGE_PATHS.ORGANIZATION_ASSETS(orgId)).catch(() => []),
        ]);

        setStats({
          screens: screens.length,
          activeScreens: screens.filter(s => s.isActive).length,
          menus: menus.length,
          slides: slides.length,
          media: mediaFiles.length
        });
      } catch {
        // Silent fail for stats fetch
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, organization]); // Added organization to dependencies

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    link,
    colorClass = "text-primary"
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string; 
    icon: React.ElementType; 
    link: string;
    colorClass?: string;
  }) => (
    <div 
      onClick={() => navigate(link)}
      className="bg-surface border border-surface-highlight rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-text-muted text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-text">{loading ? '-' : value}</h3>
        </div>
        <div className={`p-3 rounded-lg bg-surface-highlight/30 ${colorClass}`}>
          <Icon size={24} />
        </div>
      </div>
      {subtitle && (
        <div className="flex items-center gap-1 text-xs text-text-muted group-hover:text-primary transition-colors">
          <span>{subtitle}</span>
          <ArrowUpRight size={12} />
        </div>
      )}
    </div>
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-text mb-2">Dashboard Overview</h2>
        <p className="text-text-muted">Welcome back to AccelRestaurants Admin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard 
          title="Total Screens" 
          value={stats.screens} 
          subtitle={`${stats.activeScreens} active now`}
          icon={Monitor} 
          link="/admin/screens"
        />
        <StatCard 
          title="Digital Menus" 
          value={stats.menus} 
          subtitle="Manage menus"
          icon={FileText} 
          link="/admin/menus"
          colorClass="text-emerald-500"
        />
        <StatCard 
          title="Content Slides" 
          value={stats.slides} 
          subtitle="Manage slides"
          icon={ImageIcon} 
          link="/admin/slides"
          colorClass="text-purple-500"
        />
        <StatCard 
          title="Media Assets" 
          value={stats.media} 
          subtitle="Manage assets"
          icon={ImageIcon} 
          link="/admin/media"
          colorClass="text-blue-500"
        />

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <PerformanceMetricsWidget />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-8">
          <DesignerConnectionsWidget />
          <div className="bg-surface border border-surface-highlight rounded-lg p-6">
            <h3 className="text-lg font-bold text-text mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/admin/slides/new')}
                className="w-full p-3 bg-background border border-surface-highlight rounded hover:border-primary/50 transition-all text-left group"
              >
                <span className="block font-medium text-text group-hover:text-primary mb-1">New Slide</span>
                <span className="text-xs text-text-muted">Create a new digital signage slide</span>
              </button>
              <button 
                onClick={() => navigate('/admin/menus/new')}
                className="w-full p-3 bg-background border border-surface-highlight rounded hover:border-primary/50 transition-all text-left group"
              >
                 <span className="block font-medium text-text group-hover:text-primary mb-1">New Menu</span>
                <span className="text-xs text-text-muted">Create a new restaurant menu</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-full">
          <RecentActivityFeed />
        </div>
        <div className="h-full">
          <BillingStatusWidget />
        </div>
      </div>
    </div>
  );
};
