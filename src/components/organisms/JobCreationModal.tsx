import { useState } from 'react';
import { X, DollarSign, Upload, AlertCircle, CreditCard } from 'lucide-react';
import { JobService } from '../../services/jobService';
import { BillingService } from '../../services/billingService';
import { useAuthStore } from '../../store/useAuthStore';
import type { DesignerProfile } from '../../types/schema';

interface JobCreationModalProps {
  onClose: () => void;
  onSuccess: () => void;
  preSelectedDesigner?: DesignerProfile;
}

export const JobCreationModal = ({ onClose, onSuccess, preSelectedDesigner }: JobCreationModalProps) => {
  const { organization, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: preSelectedDesigner ? preSelectedDesigner.rates.menuDesign : 100,
    deadline: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !user) return;
    
    setLoading(true);
    setError(null);

    try {
      // 1. Create Job with pending payment
      const jobId = await JobService.createJob({
        orgId: organization.id,
        orgName: organization.name,
        title: formData.title,
        description: formData.description,
        budget: Number(formData.budget),
        status: preSelectedDesigner ? 'assigned' : 'posted', // In real app, this might stay 'draft' until paid
        designerId: preSelectedDesigner?.uid,
        attachments: [], 
      });

      // 2. Initiate Payment
      if (Number(formData.budget) > 0) {
        const successUrl = `${window.location.origin}/admin/designers?payment_success=true&jobId=${jobId}`;
        const cancelUrl = `${window.location.origin}/admin/designers?payment_canceled=true`;
        
        const checkoutUrl = await BillingService.createOneTimeCheckoutSession(
          Number(formData.budget) * 100, // cents
          'usd',
          { jobId, type: 'design_job' },
          successUrl,
          cancelUrl
        );

        // Redirect to payment
        window.location.href = checkoutUrl;
      } else {
        // Free/Internal job?
        onSuccess();
        onClose();
      }

    } catch {
      setError('Failed to post job. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-surface-highlight rounded-xl w-full max-w-lg shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text">
            {preSelectedDesigner ? `Hire ${preSelectedDesigner.displayName}` : 'Post a Design Job'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-highlight rounded-lg text-text-muted hover:text-text">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Job Title</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 text-text focus:border-primary focus:outline-none"
              placeholder="e.g. Summer Menu Redesign"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Description</label>
            <textarea 
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 text-text resize-none focus:border-primary focus:outline-none"
              placeholder="Describe what you need designed..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Budget ($)</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input 
                  type="number" 
                  required
                  min="10"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                  className="w-full bg-background border border-surface-highlight rounded-lg pl-9 pr-4 py-2 text-text focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Deadline (Optional)</label>
              <input 
                type="date" 
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 text-text focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="border border-dashed border-surface-highlight rounded-lg p-4 flex flex-col items-center justify-center text-text-muted hover:border-primary/50 transition-colors cursor-pointer bg-surface-highlight/5">
            <Upload size={24} className="mb-2 opacity-50" />
            <span className="text-sm">Attach files or references (Optional)</span>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-muted hover:text-text transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <CreditCard size={16} />
                  {preSelectedDesigner ? 'Send Offer & Pay' : 'Post Job & Pay'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
