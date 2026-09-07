import { useEffect, useState } from 'react';
import { 
  Activity, 
  Monitor, 
  FileText, 
  Image as ImageIcon, 
  MapPin, 
  User, 
} from 'lucide-react';
import { ActivityService } from '../../services/activityService';
import { useAuthStore } from '../../store/useAuthStore';
import type { ActivityLog } from '../../types/schema';
import { Timestamp } from 'firebase/firestore';

export const RecentActivityFeed = () => {
  const { organization } = useAuthStore();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!organization?.id) return;
      try {
        const data = await ActivityService.getRecentActivities(organization.id);
        setActivities(data);
      } catch (error) {
        console.error('Failed to load activity feed', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [organization?.id]);

  const getResourceIcon = (type: ActivityLog['resourceType']) => {
    switch (type) {
      case 'screen': return <Monitor size={16} className="text-blue-500" />;
      case 'menu': return <FileText size={16} className="text-emerald-500" />;
      case 'slide': return <ImageIcon size={16} className="text-purple-500" />;
      case 'location': return <MapPin size={16} className="text-orange-500" />;
      case 'member': return <User size={16} className="text-pink-500" />;
      default: return <Activity size={16} className="text-gray-500" />;
    }
  };

  const formatTime = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-surface border border-surface-highlight rounded-lg p-6 h-full flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-surface-highlight rounded-lg p-6 h-full flex flex-col">
      <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
        <Activity size={20} className="text-primary" />
        Recent Activity
      </h3>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[400px]">
        {activities.length === 0 ? (
          <div className="text-center text-text-muted py-8 text-sm">
            No recent activity recorded.
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex gap-3 relative pb-4 last:pb-0">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-8 bottom-0 w-px bg-surface-highlight last:hidden"></div>
              
              <div className="mt-1 relative z-10 bg-surface p-1 rounded-full border border-surface-highlight">
                {getResourceIcon(activity.resourceType)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-text truncate pr-2">
                    {activity.userDisplayName || 'User'} 
                    <span className="font-normal text-text-muted"> {activity.action}d </span>
                    <span className="font-medium text-primary">{activity.resourceName || activity.resourceType}</span>
                  </p>
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    {formatTime(activity.createdAt)}
                  </span>
                </div>
                {activity.details && (
                  <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{activity.details}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
