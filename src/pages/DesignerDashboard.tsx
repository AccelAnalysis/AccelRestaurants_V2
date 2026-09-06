import { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useConfigStore } from '../store/useConfigStore';
import { DesignerService } from '../services/designerService';
import { JobService } from '../services/jobService';
import type { DesignerProfile, DesignJob } from '../types/schema';
import { JobDetailView } from '../components/organisms/JobDetailView';
import { 
  Briefcase, 
  User, 
  LogOut, 
  DollarSign,
  Palette, 
  Search,
  CheckCircle,
  Save,
  Clock,
  CheckSquare
} from 'lucide-react';

const ProfileEditor = ({ profile }: { profile: DesignerProfile | null }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<DesignerProfile>>({
    displayName: '',
    bio: '',
    specialties: [],
    rates: { menuDesign: 0, hourlyRate: 0 },
    portfolioUrl: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        specialties: profile.specialties || [],
        rates: profile.rates || { menuDesign: 0, hourlyRate: 0 },
        portfolioUrl: profile.portfolioUrl || ''
      });
    } else if (user) {
      setFormData(prev => ({ ...prev, displayName: user.displayName || '' }));
    }
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await DesignerService.updateProfile(user.uid, formData);
      alert('Profile updated successfully!');
    } catch {
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecialty = (spec: string) => {
    const current = formData.specialties || [];
    if (current.includes(spec)) {
      setFormData({ ...formData, specialties: current.filter(s => s !== spec) });
    } else {
      setFormData({ ...formData, specialties: [...current, spec] });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-text">Designer Profile</h2>
          <p className="text-text-muted">Manage your public profile and rates</p>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-surface border border-surface-highlight rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <User size={20} className="text-primary" />
              Basic Info
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Display Name</label>
                <input 
                  type="text" 
                  value={formData.displayName}
                  onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 text-text"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Bio</label>
                <textarea 
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 text-text resize-none"
                  placeholder="Tell restaurants about your style and experience..."
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Portfolio URL</label>
                <input 
                  type="url" 
                  value={formData.portfolioUrl}
                  onChange={e => setFormData({ ...formData, portfolioUrl: e.target.value })}
                  className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 text-text"
                  placeholder="https://dribbble.com/yourname"
                />
              </div>
            </div>
          </div>

          <div className="bg-surface border border-surface-highlight rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-green-400" />
              Rates & Pricing
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Menu Design (Base Rate)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                  <input 
                    type="number" 
                    value={formData.rates?.menuDesign}
                    onChange={e => setFormData({ 
                      ...formData, 
                      rates: { ...formData.rates!, menuDesign: Number(e.target.value) } 
                    })}
                    className="w-full bg-background border border-surface-highlight rounded-lg pl-8 pr-4 py-2 text-text"
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">Starting price for a standard menu design.</p>
              </div>
              <div>
                <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Hourly Rate (Optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                  <input 
                    type="number" 
                    value={formData.rates?.hourlyRate}
                    onChange={e => setFormData({ 
                      ...formData, 
                      rates: { ...formData.rates!, hourlyRate: Number(e.target.value) } 
                    })}
                    className="w-full bg-background border border-surface-highlight rounded-lg pl-8 pr-4 py-2 text-text"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface border border-surface-highlight rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Palette size={20} className="text-purple-400" />
              Specialties
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {['Menu Design', 'Branding', 'Logo Design', 'Social Media Assets', 'Animation', 'Illustration'].map(spec => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => toggleSpecialty(spec)}
                  className={`px-3 py-2 rounded-lg text-sm text-left transition-colors flex items-center justify-between ${
                    formData.specialties?.includes(spec) 
                      ? 'bg-primary/20 text-primary border border-primary/30' 
                      : 'bg-background border border-surface-highlight text-text-muted hover:text-text'
                  }`}
                >
                  {spec}
                  {formData.specialties?.includes(spec) && <CheckCircle size={14} />}
                </button>
              ))}
            </div>
          </div>

          {/* Portfolio Gallery - Hidden for production
          <div className="bg-surface border border-surface-highlight rounded-xl p-6 opacity-50 pointer-events-none">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <ImageIcon size={20} className="text-orange-400" />
              Portfolio Gallery
            </h3>
            <div className="aspect-video bg-background border-2 border-dashed border-surface-highlight rounded-lg flex flex-col items-center justify-center text-text-muted">
              <ImageIcon size={32} className="mb-2 opacity-50" />
              <p className="text-sm">Uploads coming soon</p>
            </div>
          </div>
          */}
        </div>
      </div>
    </div>
  );
};

const JobsList = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<DesignJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchJobs = async () => {
        try {
          const data = await JobService.getDesignerJobs(user.uid);
          setJobs(data);
        } catch {
          // Silent fail for background fetch
        } finally {
          setLoading(false);
        }
      };
      fetchJobs();
    }
  }, [user]);

  if (loading) return <div className="p-8 text-center text-text-muted">Loading your jobs...</div>;

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-text-muted">
        <Briefcase size={48} className="mb-4 opacity-20" />
        <h3 className="text-lg font-medium text-text mb-2">No Active Jobs</h3>
        <p>Check the Job Board to find new opportunities.</p>
        <Link to="/designer/jobs" className="mt-4 text-primary hover:underline">Browse Available Jobs</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-text">My Jobs</h2>
      <div className="grid gap-4">
        {jobs.map(job => (
          <div key={job.id} className="bg-surface border border-surface-highlight rounded-xl p-6 hover:border-primary/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-text">{job.title}</h3>
                <p className="text-sm text-text-muted">{job.orgName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                  job.status === 'completed' ? 'bg-success/20 text-success' :
                  job.status === 'review' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {job.status}
                </span>
              </div>
            </div>
            
            <p className="text-sm text-text-muted mb-6 line-clamp-2">{job.description}</p>
            
            <div className="flex items-center justify-between pt-4 border-t border-surface-highlight">
              <div className="flex gap-4 text-sm text-text-muted">
                <div className="flex items-center gap-1">
                  <DollarSign size={14} />
                  <span>${job.budget}</span>
                </div>
                {job.deadline && (
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>Due {new Date(job.deadline.seconds * 1000).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              
              <button 
                className="px-4 py-2 bg-surface-highlight hover:bg-surface-highlight/80 text-text rounded-lg text-sm font-medium transition-colors"
                onClick={() => navigate(`/designer/jobs/${job.id}`)}
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const JobBoard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<DesignJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const data = await JobService.getAvailableJobs();
      setJobs(data);
    } catch {
      // Silent fail for background fetch
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptJob = async (jobId: string) => {
    if (!user) return;
    if (confirm('Are you sure you want to accept this job?')) {
      try {
        await JobService.assignDesigner(jobId, user.uid);
        navigate('/designer/my-jobs');
      } catch {
        alert('Failed to accept job');
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-text-muted">Loading available jobs...</div>;

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-text-muted">
        <Search size={48} className="mb-4 opacity-20" />
        <h3 className="text-lg font-medium text-text mb-2">Job Board Empty</h3>
        <p>New design requests from restaurants will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-text">Available Jobs</h2>
      <div className="grid gap-4">
        {jobs.map(job => (
          <div key={job.id} className="bg-surface border border-surface-highlight rounded-xl p-6 hover:border-primary/30 transition-colors shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-text">{job.title}</h3>
                <p className="text-sm text-text-muted">Posted by {job.orgName}</p>
              </div>
              <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <DollarSign size={12} />
                {job.budget}
              </div>
            </div>
            
            <p className="text-sm text-text-muted mb-6">{job.description}</p>
            
            <div className="flex items-center justify-between pt-4 border-t border-surface-highlight gap-2">
              <div className="text-xs text-text-muted flex-1">
                Posted {job.createdAt ? new Date(job.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}
              </div>
              
              <button 
                onClick={() => navigate(`/designer/jobs/${job.id}`)}
                className="px-4 py-2 bg-surface-highlight hover:bg-surface-highlight/80 text-text rounded-lg text-sm font-medium transition-colors"
              >
                Details
              </button>

              <button 
                onClick={() => handleAcceptJob(job.id)}
                className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <CheckSquare size={16} />
                Accept
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DesignerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile } = useAuthStore();
  const resetConfigStore = useConfigStore((state) => state.reset);
  const [profile, setProfile] = useState<DesignerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const data = await DesignerService.getDesigner(user.uid);
        setProfile(data);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    try {
      resetConfigStore();
      await signOut(auth);
      navigate('/login');
    } catch {
      alert('Failed to log out');
    }
  };

  const isActive = (path: string) => location.pathname.includes(path);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-text">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      {/* Top Navigation */}
      <nav className="border-b border-surface-highlight bg-surface px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-primary font-bold text-xl">
              <Palette className="fill-current" />
              <span>AccelDesigner</span>
            </div>
            
            <div className="hidden md:flex items-center gap-1">
              <Link 
                to="/designer/jobs" 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('jobs') && !isActive('my-jobs') ? 'bg-surface-highlight text-text' : 'text-text-muted hover:text-text hover:bg-surface-highlight/50'
                }`}
              >
                Find Work
              </Link>
              <Link 
                to="/designer/my-jobs" 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('my-jobs') ? 'bg-surface-highlight text-text' : 'text-text-muted hover:text-text hover:bg-surface-highlight/50'
                }`}
              >
                My Jobs
              </Link>
              <Link 
                to="/designer/profile" 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('profile') ? 'bg-surface-highlight text-text' : 'text-text-muted hover:text-text hover:bg-surface-highlight/50'
                }`}
              >
                Profile
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-text">{userProfile?.displayName || user?.email}</div>
              <div className="text-xs text-text-muted capitalize">{userProfile?.platformRole}</div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="jobs" replace />} />
            <Route path="jobs" element={<JobBoard />} />
            <Route path="jobs/:jobId" element={<JobDetailView />} />
            <Route path="my-jobs" element={<JobsList />} />
            <Route path="profile" element={<ProfileEditor profile={profile} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};
