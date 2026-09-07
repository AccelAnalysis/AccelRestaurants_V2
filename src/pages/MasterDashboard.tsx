import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  MapPin,
  Monitor,
  FileText,
  AlertTriangle,
  Users,
  Activity
} from 'lucide-react';
import { LocationService } from '../services/locationService';
import { ScreenService } from '../services/screenService';
import { MenuService } from '../services/menuService';
import { useAuthStore } from '../store/useAuthStore';

interface AggregatedStats {
  totalLocations: number;
  totalLocationGroups: number;
  totalScreens: number;
  totalActiveScreens: number;
  totalMenus: number;
  screensByLocation: { name: string; total: number; active: number }[];
  menusByLocation: { name: string; total: number }[];
  locationGroupsData: { name: string; locations: number; screens: number }[];
}

export const MasterDashboard = () => {
  const { organization } = useAuthStore();
  const [stats, setStats] = useState<AggregatedStats>({
    totalLocations: 0,
    totalLocationGroups: 0,
    totalScreens: 0,
    totalActiveScreens: 0,
    totalMenus: 0,
    screensByLocation: [],
    menusByLocation: [],
    locationGroupsData: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!organization) {
        setError('Organization not loaded. Please refresh or re-login.');
        setLoading(false);
        return;
      }

      try {
        const orgId = organization.id;

        // Fetch all data
        const [locations, locationGroups, screens, menus] = await Promise.all([
          LocationService.getLocations(orgId),
          LocationService.getLocationGroups(orgId),
          ScreenService.getScreens(orgId),
          MenuService.getMenus(orgId)
        ]);

        // Compute aggregates
        const totalLocations = locations.length;
        const totalLocationGroups = locationGroups.length;
        const totalScreens = screens.length;
        const totalActiveScreens = screens.filter(s => s.isActive).length;
        const totalMenus = menus.length;

        // Screens by location
        const screensByLocationMap = new Map<string, { total: number; active: number }>();
        locations.forEach(location => {
          screensByLocationMap.set(location.id, { total: 0, active: 0 });
        });

        screens.forEach(screen => {
          const current = screensByLocationMap.get(screen.locationId);
          if (current) {
            current.total += 1;
            if (screen.isActive) current.active += 1;
          }
        });

        const screensByLocation = locations.map(location => ({
          name: location.name,
          total: screensByLocationMap.get(location.id)?.total || 0,
          active: screensByLocationMap.get(location.id)?.active || 0
        }));

        // Menus by location (considering locationIds and locationGroupIds)
        const menusByLocationMap = new Map<string, number>();
        locations.forEach(location => {
          menusByLocationMap.set(location.id, 0);
        });

        menus.forEach(menu => {
          const applicableLocations = new Set<string>();

          // Direct location assignments
          if (menu.locationIds) {
            menu.locationIds.forEach(locId => applicableLocations.add(locId));
          }

          // Location group assignments
          if (menu.locationGroupIds) {
            menu.locationGroupIds.forEach(groupId => {
              const group = locationGroups.find(g => g.id === groupId);
              if (group) {
                locations.forEach(loc => {
                  if (loc.groupId === groupId) applicableLocations.add(loc.id);
                });
              }
            });
          }

          // If no specific assignments, all locations
          if (!menu.locationIds?.length && !menu.locationGroupIds?.length) {
            locations.forEach(loc => applicableLocations.add(loc.id));
          }

          applicableLocations.forEach(locId => {
            menusByLocationMap.set(locId, (menusByLocationMap.get(locId) || 0) + 1);
          });
        });

        const menusByLocation = locations.map(location => ({
          name: location.name,
          total: menusByLocationMap.get(location.id) || 0
        }));

        // Location groups data
        const locationGroupsData = locationGroups.map(group => {
          const groupLocations = locations.filter(l => l.groupId === group.id);
          const groupScreens = screens.filter(s => groupLocations.some(l => l.id === s.locationId)).length;

          return {
            name: group.name,
            locations: groupLocations.length,
            screens: groupScreens
          };
        });

        setStats({
          totalLocations,
          totalLocationGroups,
          totalScreens,
          totalActiveScreens,
          totalMenus,
          screensByLocation,
          menusByLocation,
          locationGroupsData
        });
      } catch (err) {
        console.error('Error fetching master dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organization]);

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    colorClass = "text-primary"
  }: {
    title: string;
    value: number;
    subtitle?: string;
    icon: React.ElementType;
    colorClass?: string;
  }) => (
    <div className="bg-surface border border-surface-highlight rounded-lg p-6">
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
        <p className="text-xs text-text-muted">{subtitle}</p>
      )}
    </div>
  );

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            <span className="text-red-500 font-medium">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-text mb-2">Master Dashboard</h2>
        <p className="text-text-muted">Aggregated overview across all locations</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
        <StatCard
          title="Locations"
          value={stats.totalLocations}
          subtitle="Total locations"
          icon={MapPin}
        />
        <StatCard
          title="Location Groups"
          value={stats.totalLocationGroups}
          subtitle="Organized groups"
          icon={Users}
          colorClass="text-blue-500"
        />
        <StatCard
          title="Total Screens"
          value={stats.totalScreens}
          subtitle={`${stats.totalActiveScreens} active`}
          icon={Monitor}
          colorClass="text-green-500"
        />
        <StatCard
          title="Active Screens"
          value={stats.totalActiveScreens}
          subtitle={`${Math.round((stats.totalActiveScreens / stats.totalScreens) * 100) || 0}% of total`}
          icon={Activity}
          colorClass="text-emerald-500"
        />
        <StatCard
          title="Digital Menus"
          value={stats.totalMenus}
          subtitle="Across locations"
          icon={FileText}
          colorClass="text-purple-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Screens by Location Bar Chart */}
        <div className="bg-surface border border-surface-highlight rounded-lg p-6">
          <h3 className="text-lg font-bold text-text mb-4">Screens by Location</h3>
          <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={300}>
            <BarChart data={stats.screensByLocation}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#8884d8" name="Total Screens" />
              <Bar dataKey="active" fill="#82ca9d" name="Active Screens" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Menus by Location */}
        <div className="bg-surface border border-surface-highlight rounded-lg p-6">
          <h3 className="text-lg font-bold text-text mb-4">Menus by Location</h3>
          <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={300}>
            <AreaChart data={stats.menusByLocation}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke="#8884d8" fill="#8884d8" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Location Groups Overview */}
      <div className="bg-surface border border-surface-highlight rounded-lg p-6">
        <h3 className="text-lg font-bold text-text mb-4">Location Groups Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.locationGroupsData.map((group, index) => (
            <div key={index} className="p-4 bg-background rounded border border-surface-highlight">
              <h4 className="font-medium text-text mb-2">{group.name}</h4>
              <div className="space-y-1 text-sm text-text-muted">
                <div className="flex justify-between">
                  <span>Locations:</span>
                  <span>{group.locations}</span>
                </div>
                <div className="flex justify-between">
                  <span>Screens:</span>
                  <span>{group.screens}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {stats.locationGroupsData.length === 0 && (
          <p className="text-text-muted">No location groups configured yet.</p>
        )}
      </div>
    </div>
  );
};
