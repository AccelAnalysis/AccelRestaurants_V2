import { useEffect, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Activity, BarChart2 } from 'lucide-react';
import { AnalyticsService, type DailyMetric } from '../../services/analyticsService';
import { useAuthStore } from '../../store/useAuthStore';

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}

export const PerformanceMetricsWidget = () => {
  const { organization, user } = useAuthStore();
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'views' | 'uptime'>('views');
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!organization?.id || !user) return;
      try {
        setLoading(true);
        // Try to get real metrics
        let data = await AnalyticsService.getMetrics(organization.id, timeRange === '7d' ? 7 : 30);
        
        // If no data, return empty metrics (zeros) instead of fake random data
        if (data.length === 0) {
          data = AnalyticsService.getEmptyMetrics(timeRange === '7d' ? 7 : 30);
        }
        
        setMetrics(data);
      } catch (error) {
        console.error('Failed to load performance metrics', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [organization?.id, user, timeRange]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length && label) {
      return (
        <div className="bg-surface border border-surface-highlight p-3 rounded shadow-lg">
          <p className="text-sm font-medium text-text mb-1">
            {new Date(label).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <p className="text-xs text-primary">
            {viewMode === 'views' ? 'Screen Views: ' : 'Uptime (min): '}
            <span className="font-bold">
              {payload[0].value.toLocaleString()}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-surface border border-surface-highlight rounded-lg p-6 h-full min-h-[300px] flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-surface-highlight rounded-lg p-6 h-full min-h-[300px] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-lg font-bold text-text flex items-center gap-2">
          {viewMode === 'views' ? <BarChart2 size={20} className="text-primary" /> : <Activity size={20} className="text-primary" />}
          Performance Analytics
        </h3>
        
        <div className="flex items-center gap-2 bg-surface-highlight/20 p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('views')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${viewMode === 'views' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}
          >
            Views
          </button>
          <button 
            onClick={() => setViewMode('uptime')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${viewMode === 'uptime' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}
          >
            Uptime
          </button>
          <div className="w-px h-4 bg-surface-highlight mx-1"></div>
          <button 
            onClick={() => setTimeRange('7d')}
            className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${timeRange === '7d' ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-text'}`}
          >
            7D
          </button>
          <button 
            onClick={() => setTimeRange('30d')}
            className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${timeRange === '30d' ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-text'}`}
          >
            30D
          </button>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'views' ? (
            <AreaChart data={metrics} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#666" 
                tick={{ fontSize: 12 }} 
                tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                minTickGap={30}
              />
              <YAxis stroke="#666" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="screenViews" 
                stroke="#f97316" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorViews)" 
                activeDot={{ r: 6, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          ) : (
            <BarChart data={metrics} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#666" 
                tick={{ fontSize: 12 }} 
                tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                minTickGap={30}
              />
              <YAxis stroke="#666" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="uptimeMinutes" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={50}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
