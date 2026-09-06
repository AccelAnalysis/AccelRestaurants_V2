import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Clock, User, ChevronRight, Palette } from 'lucide-react';
import { JobService } from '../../services/jobService';
import { DesignerService } from '../../services/designerService';
import { useAuthStore } from '../../store/useAuthStore';
import type { DesignJob, DesignerProfile } from '../../types/schema';

export const DesignerConnectionsWidget = () => {
  const { organization } = useAuthStore();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<DesignJob[]>([]);
  const [designers, setDesigners] = useState<Record<string, DesignerProfile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!organization?.id) return;
      try {
        // Fetch active jobs (exclude cancelled/completed for the widget, or show recent?)
        // The todo says "active designer jobs".
        const allJobs = await JobService.getOrgJobs(organization.id);
        const activeJobs = allJobs.filter(j => 
          ['draft', 'posted', 'assigned', 'in_progress', 'review'].includes(j.status)
        ).slice(0, 5); // Limit to 5 for widget

        setJobs(activeJobs);

        // Fetch designer details for assigned jobs
        const designerIds = [...new Set(activeJobs.map(j => j.designerId).filter(Boolean) as string[])];
        if (designerIds.length > 0) {
          const designerProfiles: Record<string, DesignerProfile> = {};
          await Promise.all(designerIds.map(async (uid) => {
            const profile = await DesignerService.getDesigner(uid);
            if (profile) designerProfiles[uid] = profile;
          }));
          setDesigners(designerProfiles);
        }
      } catch (error) {
        console.error('Failed to load designer jobs', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [organization?.id]);

  const getStatusColor = (status: DesignJob['status']) => {
    switch (status) {
      case 'draft': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      case 'posted': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'assigned': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'in_progress': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'review': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'completed': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      default: return 'text-text-muted bg-surface-highlight border-surface-highlight';
    }
  };

  const getStatusLabel = (status: DesignJob['status']) => {
    return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-text flex items-center gap-2">
          <Palette size={20} className="text-purple-500" />
          Active Design Jobs
        </h3>
        <button 
          onClick={() => navigate('/admin/designers')}
          className="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1"
        >
          View All <ChevronRight size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
        {jobs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-muted text-sm text-center p-4">
            <Briefcase size={32} className="mb-2 opacity-20" />
            <p>No active design jobs.</p>
            <button 
              onClick={() => navigate('/admin/designers')} 
              className="mt-2 text-primary hover:underline"
            >
              Post a Job
            </button>
          </div>
        ) : (
          jobs.map(job => {
            const designer = job.designerId ? designers[job.designerId] : null;
            
            return (
              <div 
                key={job.id}
                onClick={() => navigate(`/admin/designers/jobs/${job.id}`)}
                className="p-3 rounded-lg border border-surface-highlight bg-background hover:border-primary/30 transition-colors cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-text text-sm group-hover:text-primary transition-colors line-clamp-1">{job.title}</h4>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getStatusColor(job.status)}`}>
                    {getStatusLabel(job.status)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <div className="flex items-center gap-3">
                    {designer ? (
                      <div className="flex items-center gap-1.5" title="Assigned Designer">
                        <User size={12} />
                        <span>{designer.displayName}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 italic" title="Waiting for assignment">
                        <User size={12} />
                        <span>Unassigned</span>
                      </div>
                    )}
                  </div>
                  
                  {job.deadline && (
                    <div className={`flex items-center gap-1.5 ${
                      job.deadline.seconds * 1000 < Date.now() + 86400000 * 2 ? 'text-red-400' : ''
                    }`} title="Deadline">
                      <Clock size={12} />
                      <span>{new Date(job.deadline.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <button 
        onClick={() => navigate('/admin/designers')}
        className="w-full mt-4 py-2 border border-dashed border-surface-highlight hover:border-primary/50 rounded-lg text-sm text-text-muted hover:text-primary transition-colors flex items-center justify-center gap-2"
      >
        <Briefcase size={14} />
        Post New Job
      </button>
    </div>
  );
};
