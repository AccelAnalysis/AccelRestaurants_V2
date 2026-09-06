import { useNavigate } from 'react-router-dom';
import { CreditCard, Shield, AlertTriangle, CheckCircle, ArrowUpRight } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { BillingService } from '../../services/billingService';
import { PLAN_CONFIGS, type PlanType } from '../../lib/plans';

export const BillingStatusWidget = () => {
  const { organization, loading: authLoading } = useAuthStore();
  const navigate = useNavigate();

  if (authLoading || !organization) {
    return (
      <div className="bg-surface border border-surface-highlight rounded-lg p-6 h-full flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const currentPlan = organization.plan || 'Free';
  const planConfig = PLAN_CONFIGS[currentPlan as PlanType] || PLAN_CONFIGS.Free;
  
  // Calculate usage percentages
  const screenLimit = planConfig.screens;
  const screenCount = organization.screenCount || 0;
  const screenUsage = screenLimit > 0 ? (screenCount / screenLimit) * 100 : 0; // -1 for unlimited
  
  const seatLimit = planConfig.seats;
  const seatCount = organization.members?.length || 1;
  const seatUsage = seatLimit > 0 ? (seatCount / seatLimit) * 100 : 0;

  const isUnlimitedScreens = screenLimit === -1;
  const isUnlimitedSeats = seatLimit === -1;

  const getUsageColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-primary';
  };

  const handleManage = async () => {
    try {
      const portalUrl = await BillingService.createPortalSession(window.location.href);
      window.location.href = portalUrl;
    } catch {
      navigate('/admin/subscription');
    }
  };

  return (
    <div className="bg-surface border border-surface-highlight rounded-lg p-6 h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-text flex items-center gap-2">
            <CreditCard size={20} className="text-primary" />
            Billing & Usage
          </h3>
          <p className="text-xs text-text-muted mt-1">Current Plan</p>
          <div className="flex items-center gap-2 mt-1">
            <Shield size={16} className={currentPlan === 'Enterprise' ? 'text-purple-500' : 'text-primary'} />
            <span className="font-bold text-lg text-text">{currentPlan}</span>
            {organization.subscriptionStatus === 'active' && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle size={8} /> Active
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={() => navigate('/admin/subscription')}
          className="p-2 hover:bg-surface-highlight rounded-lg transition-colors text-text-muted hover:text-text"
        >
          <ArrowUpRight size={16} />
        </button>
      </div>

      <div className="space-y-4 flex-1">
        {/* Screens Usage */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-muted">Screens</span>
            <span className="text-text font-medium">
              {screenCount} / {isUnlimitedScreens ? '∞' : screenLimit}
            </span>
          </div>
          <div className="h-2 bg-surface-highlight rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getUsageColor(screenUsage)}`}
              style={{ width: `${isUnlimitedScreens ? 5 : Math.min(screenUsage, 100)}%` }}
            ></div>
          </div>
          {!isUnlimitedScreens && screenUsage >= 80 && (
            <p className="text-[10px] text-yellow-500 mt-1 flex items-center gap-1">
              <AlertTriangle size={10} /> Approaching limit
            </p>
          )}
        </div>

        {/* Seats Usage */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-muted">Seats</span>
            <span className="text-text font-medium">
              {seatCount} / {isUnlimitedSeats ? '∞' : seatLimit}
            </span>
          </div>
          <div className="h-2 bg-surface-highlight rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getUsageColor(seatUsage)}`}
              style={{ width: `${isUnlimitedSeats ? 5 : Math.min(seatUsage, 100)}%` }}
            ></div>
          </div>
        </div>

        {organization.subscriptionPeriodEnd && (
          <div className="pt-4 border-t border-surface-highlight mt-4">
            <p className="text-xs text-text-muted">Next Invoice</p>
            <p className="text-sm font-medium text-text">
              {new Date(organization.subscriptionPeriodEnd.seconds * 1000).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      <button 
        onClick={handleManage}
        className="w-full mt-4 py-2 bg-surface-highlight hover:bg-surface-highlight/80 text-text rounded-lg text-sm font-medium transition-colors"
      >
        Manage Subscription
      </button>
    </div>
  );
};
