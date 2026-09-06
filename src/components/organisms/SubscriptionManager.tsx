import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { BillingService } from '../../services/billingService';
import { Check, CreditCard, Shield, Loader2 } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
}

export const SubscriptionManager = () => {
  const { organization } = useAuthStore();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const availablePlans = await BillingService.getSubscriptionPlans();
      setPlans(availablePlans);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string) => {
    if (!organization) return;
    setProcessing(true);
    try {
      const checkoutUrl = await BillingService.createCheckoutSession(
        priceId,
        `${window.location.origin}/admin/subscription?success=true`,
        `${window.location.origin}/admin/subscription?canceled=true`
      );
      window.location.href = checkoutUrl;
    } catch {
      alert('Failed to start checkout process. Please try again.');
      setProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    setProcessing(true);
    try {
      const portalUrl = await BillingService.createPortalSession(
        `${window.location.origin}/admin/subscription`
      );
      window.location.href = portalUrl;
    } catch {
      alert('Failed to open billing portal.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">Subscription & Billing</h1>
          <p className="text-text-muted">Manage your organization's plan and billing details</p>
        </div>
        {organization?.subscriptionId && (
          <button
            onClick={handleManageSubscription}
            disabled={processing}
            className="flex items-center gap-2 bg-surface border border-surface-highlight hover:bg-surface-highlight text-text px-4 py-2 rounded-lg transition-colors"
          >
            <CreditCard size={18} />
            {processing ? 'Loading...' : 'Manage Subscription'}
          </button>
        )}
      </div>

      {/* Current Plan Status */}
      <div className="bg-surface border border-surface-highlight rounded-xl p-6 mb-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${
            organization?.plan === 'Franchise' ? 'bg-indigo-500/20 text-indigo-400' :
            organization?.plan === 'Enterprise' ? 'bg-purple-500/20 text-purple-400' :
            organization?.plan === 'Growth' ? 'bg-orange-500/20 text-orange-400' :
            organization?.plan === 'Basic' ? 'bg-blue-500/20 text-blue-400' :
            'bg-surface-highlight text-text-muted'
          }`}>
            <Shield size={32} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text">Current Plan: {organization?.plan}</h2>
            <p className="text-sm text-text-muted">
              {organization?.subscriptionStatus === 'active' 
                ? 'Your subscription is active.' 
                : organization?.subscriptionStatus === 'past_due'
                ? 'Payment is past due.'
                : 'Free tier'}
            </p>
          </div>
        </div>
        {organization?.subscriptionPeriodEnd && (
          <div className="text-right">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Renews On</p>
            <p className="text-text font-mono">
              {new Date(organization.subscriptionPeriodEnd.seconds * 1000).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = organization?.plan.toLowerCase() === plan.name.toLowerCase();
          const isFranchise = plan.name === 'Franchise';
          
          return (
            <div 
              key={plan.id}
              className={`relative bg-surface rounded-xl p-6 flex flex-col border-2 transition-all ${
                isCurrentPlan 
                  ? 'border-primary shadow-[0_0_30px_rgba(234,88,12,0.1)]' 
                  : 'border-surface-highlight hover:border-surface-highlight/80'
              }`}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Current Plan
                </div>
              )}

              <h3 className="text-xl font-bold text-text mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                {isFranchise ? (
                  <span className="text-3xl font-bold text-text">Custom</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-text">${plan.price}</span>
                    <span className="text-text-muted">/{plan.interval}</span>
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-text-muted">
                    <Check size={16} className="text-primary mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  if (isFranchise) {
                    window.location.href = 'mailto:sales@accelrestaurants.com?subject=Franchise%20Inquiry';
                    return;
                  }
                  if (!isCurrentPlan) handleSubscribe(plan.id);
                }}
                disabled={isCurrentPlan || processing}
                className={`w-full py-2 rounded-lg font-medium transition-colors ${
                  isCurrentPlan
                    ? 'bg-surface-highlight text-text-muted cursor-default'
                    : 'bg-primary hover:bg-primary-hover text-white'
                }`}
              >
                {isCurrentPlan ? 'Active' : processing ? 'Processing...' : isFranchise ? 'Contact Sales' : 'Upgrade'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
