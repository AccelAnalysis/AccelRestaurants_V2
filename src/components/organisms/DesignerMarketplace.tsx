import { InlineFeedback } from '../atoms/InlineFeedback';
import { useFeedback } from '../../hooks/useFeedback';
import { FeedbackRegion } from '../atoms/FeedbackRegion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, 
  Search,
  Plus
} from 'lucide-react';
import { DesignerService } from '../../services/designerService';
import { JobService } from '../../services/jobService';
import type { DesignerProfile, DesignJob } from '../../types/schema';
import { useAuthStore } from '../../store/useAuthStore';
import { JobCreationModal } from './JobCreationModal';

export const DesignerMarketplace = () => {
  const { feedback, notify } = useFeedback();
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [designers, setDesigners] = useState<DesignerProfile[]>([]);
  const [activeJobs, setActiveJobs] = useState<DesignJob[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'jobs'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedDesigner, setSelectedDesigner] = useState<DesignerProfile | undefined>(undefined);

  const fetchData = async () => {
    setLoading(true); setLoadError(false);
    try {
      const [designersData, jobsData] = await Promise.all([
        DesignerService.getActiveDesigners(),
        organization ? JobService.getOrgJobs(organization.id) : Promise.resolve([])
      ]);
      setDesigners(designersData);
      setActiveJobs(jobsData);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for payment success
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_success') === 'true') {
      notify('Returned from checkout. Job status below is confirmed by the service; the return link is not proof of payment.', 'info');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  const handleHireClick = (designer: DesignerProfile) => {
    setSelectedDesigner(designer);
    setShowJobModal(true);
  };

  const handlePostJobClick = () => {
    setSelectedDesigner(undefined);
    setShowJobModal(true);
  };

  const handleJobCreated = () => {
    fetchData();
    // Could show a toast here
  };

  const filteredDesigners = designers.filter(d => 
    d.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.specialties?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="full-hig-page space-y-8">
      <FeedbackRegion feedback={feedback} />
      {showJobModal && (
        <JobCreationModal 
          onClose={() => setShowJobModal(false)} 
          onSuccess={handleJobCreated}
          preSelectedDesigner={selectedDesigner}
        />
      )}

      <InlineFeedback message={loading ? 'Loading designers and jobs…' : null} />
      <InlineFeedback tone="error" message={loadError ? 'Designers and jobs could not be loaded.' : null}><button className="ui-button ui-button-secondary ml-3" onClick={() => void fetchData()}>Retry</button></InlineFeedback>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Design Marketplace</h2>
          <p className="text-text-muted">Hire professional designers for your menus and marketing</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="bg-surface border border-surface-highlight rounded-lg p-1 flex">
            <button aria-pressed={activeTab === 'browse'}
              onClick={() => setActiveTab('browse')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'browse' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Browse Designers
            </button>
            <button aria-pressed={activeTab === 'jobs'}
              onClick={() => setActiveTab('jobs')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'jobs' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-text-muted hover:text-text'
              }`}
            >
              My Design Jobs
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'browse' && (
        <div className="space-y-6">
          {/* Search */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input aria-label={"Search designers by name or specialty"}
                type="text" 
                placeholder="Search by name or specialty (e.g. 'Menu Design')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-surface-highlight rounded-lg pl-10 pr-4 py-3 text-text focus:outline-none focus:border-primary"
              />
            </div>

          </div>

          {!loading && !loadError && filteredDesigners.length === 0 && <p role="status">{searchQuery ? 'No matching designers. Try another name or specialty.' : 'No designers are available yet.'}</p>}
          {/* Designers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDesigners.map(designer => (
              <div key={designer.uid} className="bg-surface border border-surface-highlight rounded-xl overflow-hidden hover:border-primary/50 transition-all shadow-sm hover:shadow-md group">
                <div className="h-24 bg-gradient-to-r from-blue-500/10 to-purple-500/10 relative">
                  <div className="absolute -bottom-8 left-6">
                    <div className="w-16 h-16 rounded-full bg-surface border-4 border-surface shadow-md flex items-center justify-center text-xl font-bold text-text bg-surface-highlight">
                      {designer.displayName?.charAt(0)}
                    </div>
                  </div>
                </div>
                
                <div className="pt-10 p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-text group-hover:text-primary transition-colors">{designer.displayName}</h3>
                      <div className="flex items-center gap-1 text-sm text-text-muted">
                        <Star size={14} className="text-yellow-400 fill-current" />
                        <span className="font-medium text-text">{designer.rating.toFixed(1)}</span>
                        <span>({designer.reviewCount} reviews)</span>
                      </div>
                    </div>
                    {designer.portfolioUrl && (
                      <a 
                        href={designer.portfolioUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Portfolio ↗
                      </a>
                    )}
                  </div>

                  <p className="text-sm text-text-muted line-clamp-2 mb-4 h-10">
                    {designer.bio || 'Professional designer ready to help with your restaurant branding.'}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {designer.specialties?.slice(0, 3).map(s => (
                      <span key={s} className="px-2 py-1 bg-surface-highlight rounded text-[10px] text-text-muted font-medium">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-surface-highlight">
                    <div className="text-sm">
                      <span className="text-text-muted">From </span>
                      <span className="font-bold text-text">${designer.rates?.menuDesign || 50}</span>
                    </div>
                    <button 
                      disabled={!organization || loading} aria-label={`Hire ${designer.displayName}`} onClick={() => handleHireClick(designer)}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Hire Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg text-text">Your Job History</h3>
            <button 
              onClick={handlePostJobClick}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Plus size={16} />
              Post New Job
            </button>
          </div>

          <div className="bg-surface border border-surface-highlight rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-surface-highlight/30 text-xs font-bold text-text-muted uppercase tracking-wider">
                <tr>
                  <th className="p-4">Job Title</th>
                  <th className="p-4">Designer</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Budget</th>
                  <th className="p-4">Posted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-highlight">
                {activeJobs.length > 0 ? activeJobs.map(job => (
                  <tr 
                    key={job.id} 
                    className="hover:bg-surface-highlight/5 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/designers/jobs/${job.id}`)}
                  >
                    <td className="p-4">
                      <div className="font-medium text-text">{job.title}</div>
                      <div className="text-xs text-text-muted truncate max-w-xs">{job.description}</div>
                    </td>
                    <td className="p-4 text-sm text-text-muted">
                      {job.designerId ? 'Assigned' : 'Unassigned'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        job.status === 'completed' ? 'bg-success/20 text-success' :
                        job.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                        job.status === 'review' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-surface-highlight text-text-muted'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-text font-medium">
                      ${job.budget}
                    </td>
                    <td className="p-4 text-xs text-text-muted">
                      {job.createdAt ? new Date(job.createdAt.seconds * 1000).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-text-muted">
                      No jobs found. Post a job to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
