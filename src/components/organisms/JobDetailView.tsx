import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle,
  Download,
  Clock,
  User as UserIcon
} from 'lucide-react';
import { JobService } from '../../services/jobService';
import { StorageService } from '../../services/storageService';
import { useAuthStore } from '../../store/useAuthStore';
import type { DesignJob, DesignSubmission } from '../../types/schema';

export const JobDetailView = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user, organization } = useAuthStore();
  
  const [job, setJob] = useState<DesignJob | null>(null);
  const [submissions, setSubmissions] = useState<DesignSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const fetchJobDetails = useCallback(async () => {
    if (!jobId) return;
    try {
      const [jobData, submissionsData] = await Promise.all([
        JobService.getJob(jobId),
        JobService.getSubmissions(jobId)
      ]);
      setJob(jobData);
      setSubmissions(submissionsData);
    } catch {
      // Silent fail, UI will show 'Job not found' if job remains null
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void fetchJobDetails();
  }, [fetchJobDetails]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmitDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job || !user || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      // Upload files
      const fileUrls = await Promise.all(
        selectedFiles.map(file => 
          StorageService.uploadFile(file, `jobs/${job.id}/submissions/`)
        )
      );

      // Create submission
      await JobService.submitDesign(job.id, {
        jobId: job.id,
        designerId: user.uid,
        message: submissionMessage,
        fileUrls,
        version: submissions.length + 1
      });

      // Refresh data
      await fetchJobDetails();
      setSubmissionMessage('');
      setSelectedFiles([]);
      alert('Design submitted successfully!');
    } catch {
      alert('Failed to submit design');
    } finally {
      setUploading(false);
    }
  };

  const handleReview = async (submissionId: string, status: 'approved' | 'rejected') => {
    if (!jobId) return;
    
    const feedback = status === 'rejected' ? prompt('Please provide feedback for the designer:') : undefined;
    if (status === 'rejected' && !feedback) return; // specific feedback required for rejection

    try {
      setReviewingId(submissionId);
      await JobService.reviewSubmission(jobId, submissionId, status, feedback || undefined);
      await fetchJobDetails();
      alert(`Submission ${status} successfully`);
    } catch {
      alert('Failed to review submission');
    } finally {
      setReviewingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-text-muted">Loading job details...</div>;
  if (!job) return <div className="p-8 text-center text-text-muted">Job not found</div>;

  const isDesigner = user?.uid === job.designerId;
  const isClient = organization?.id === job.orgId;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-text-muted hover:text-text mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">{job.title}</h1>
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span className="flex items-center gap-1">
                <Briefcase size={14} />
                {job.orgName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                Posted {job.createdAt ? new Date(job.createdAt.seconds * 1000).toLocaleDateString() : '-'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                job.status === 'completed' ? 'bg-success/20 text-success' :
                job.status === 'review' ? 'bg-purple-500/20 text-purple-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {job.status}
              </span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-text flex items-center justify-end gap-1">
              <DollarSign size={20} className="text-text-muted" />
              {job.budget}
            </div>
            <p className="text-xs text-text-muted">Budget</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          <div className="bg-surface border border-surface-highlight rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              Job Description
            </h3>
            <p className="text-text-muted whitespace-pre-wrap">{job.description}</p>
          </div>

          {/* Submission History */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-text">Submission History</h3>
            {submissions.length > 0 ? (
              submissions.map((submission) => (
                <div key={submission.id} className="bg-surface border border-surface-highlight rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-text">Version {submission.version}</h4>
                      <p className="text-xs text-text-muted">
                        Submitted {submission.createdAt ? new Date(submission.createdAt.seconds * 1000).toLocaleString() : '-'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                      submission.status === 'approved' ? 'bg-success/20 text-success' :
                      submission.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                      'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {submission.status}
                    </span>
                  </div>
                  
                  {submission.message && (
                    <p className="text-sm text-text-muted mb-4 bg-surface-highlight/10 p-3 rounded-lg">
                      "{submission.message}"
                    </p>
                  )}

                  {submission.feedback && (
                    <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-xs text-blue-400 font-bold uppercase mb-1">Feedback from Client</p>
                      <p className="text-sm text-text">{submission.feedback}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {submission.fileUrls.map((url, idx) => (
                      <a 
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Download size={14} />
                        Download File {idx + 1}
                      </a>
                    ))}
                  </div>

                  {isClient && submission.status === 'pending' && (
                    <div className="mt-6 flex gap-3 border-t border-surface-highlight pt-4">
                      <button
                        onClick={() => handleReview(submission.id, 'approved')}
                        disabled={!!reviewingId}
                        className="flex-1 bg-success hover:bg-success-hover text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(submission.id, 'rejected')}
                        disabled={!!reviewingId}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center p-8 border-2 border-dashed border-surface-highlight rounded-xl text-text-muted">
                No submissions yet
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {/* Submission Form (Only for Assigned Designer) */}
          {isDesigner && job.status !== 'completed' && (
            <div className="bg-surface border border-surface-highlight rounded-xl p-6 sticky top-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Upload size={20} className="text-primary" />
                Submit Design
              </h3>
              
              <form onSubmit={handleSubmitDesign} className="space-y-4">
                <div>
                  <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Message (Optional)</label>
                  <textarea 
                    value={submissionMessage}
                    onChange={(e) => setSubmissionMessage(e.target.value)}
                    className="w-full bg-background border border-surface-highlight rounded-lg px-3 py-2 text-text text-sm resize-none focus:border-primary focus:outline-none"
                    rows={3}
                    placeholder="Notes about this version..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Upload Files</label>
                  <input 
                    type="file" 
                    multiple
                    onChange={handleFileSelect}
                    className="w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                  {selectedFiles.length > 0 && (
                    <div className="mt-2 text-xs text-text">
                      {selectedFiles.length} file(s) selected
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={uploading || selectedFiles.length === 0}
                  className="w-full py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    'Uploading...'
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Submit for Review
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Status Timeline or Info */}
          <div className="bg-surface border border-surface-highlight rounded-xl p-6">
            <h3 className="font-bold text-sm text-text mb-4 uppercase tracking-wider">Job Status</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  job.status !== 'draft' ? 'bg-success/20 text-success' : 'bg-surface-highlight text-text-muted'
                }`}>
                  <CheckCircle size={16} />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-text">Job Posted</p>
                  <p className="text-xs text-text-muted">Client created the job</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  ['assigned', 'in_progress', 'review', 'completed'].includes(job.status) ? 'bg-success/20 text-success' : 'bg-surface-highlight text-text-muted'
                }`}>
                  <UserIcon size={16} />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-text">Designer Assigned</p>
                  <p className="text-xs text-text-muted">{job.designerId ? 'You are assigned' : 'Waiting for assignment'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  ['review', 'completed'].includes(job.status) ? 'bg-success/20 text-success' : 'bg-surface-highlight text-text-muted'
                }`}>
                  <Clock size={16} />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-text">Under Review</p>
                  <p className="text-xs text-text-muted">Client is reviewing work</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  job.status === 'completed' ? 'bg-success/20 text-success' : 'bg-surface-highlight text-text-muted'
                }`}>
                  <CheckCircle size={16} />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-text">Completed</p>
                  <p className="text-xs text-text-muted">Payment released</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for icon
const Briefcase = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);
