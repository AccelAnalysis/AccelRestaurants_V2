import { CinematicPlanBenefits } from '../cinematic/CinematicPlanBenefits';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { BillingService } from '../../services/billingService';
import { Check } from 'lucide-react';
import { AccessibleDialog } from '../atoms/AccessibleDialog';
import { InlineFeedback } from '../atoms/InlineFeedback';
interface SubscriptionPlan { id: string; name: string; price: number; currency: string; interval: string; features: string[]; }
const priceLabel = (plan: SubscriptionPlan) => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: plan.currency || 'USD' }).format(plan.price); }
  catch { return `${plan.price} ${plan.currency}`; }
};
export const SubscriptionManager = () => {
  const { organization } = useAuthStore();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selected, setSelected] = useState<SubscriptionPlan | null>(null);
  const loadPlans = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try { setPlans(await BillingService.getSubscriptionPlans()); }
    catch { setLoadError('Plans could not be loaded. Your current subscription has not changed.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadPlans(); }, [loadPlans]);
  const openCheckout = async () => {
    if (!organization || !selected || processing) return;
    setProcessing(true); setError(null);
    try {
      const url = await BillingService.createCheckoutSession(selected.id, `${window.location.origin}/admin/subscription?success=true`, `${window.location.origin}/admin/subscription?canceled=true`);
      window.location.assign(url);
    } catch { setError('Checkout could not be opened. No purchase was confirmed here. Try again.'); setProcessing(false); }
  };
  const openPortal = async () => {
    if (processing) return;
    setProcessing(true); setError(null);
    try { window.location.assign(await BillingService.createPortalSession(`${window.location.origin}/admin/subscription`)); }
    catch { setError('The billing portal could not be opened. Try again using Manage subscription.'); setProcessing(false); }
  };
  const returned = new URLSearchParams(window.location.search);
  return <section className="full-hig-page max-w-7xl mx-auto p-4 sm:p-8" aria-busy={loading || processing}>
    <header className="responsive-heading flex flex-wrap items-start justify-between gap-4 mb-6">
      <div><h1 className="text-3xl font-bold">Subscription & Billing</h1><p className="text-text-secondary mt-2">Review your plan, then manage payments securely with Stripe.</p></div>
      {organization?.subscriptionId && <button type="button" className="ui-button ui-button-secondary" disabled={processing} onClick={() => void openPortal()}>Manage subscription</button>}
    </header>
    <InlineFeedback message={returned.has('canceled') ? 'Checkout was canceled. You can review another plan or return to your workspace.' : returned.has('success') ? 'Returned from checkout. Subscription status below comes from your account, not the return link.' : null} />
    {!selected && <InlineFeedback tone="error" message={error} />}
    <InlineFeedback message={processing ? 'Opening secure billing…' : loading ? 'Loading plans…' : null} />
    <section className="bg-surface border border-surface-highlight rounded-lg p-6 mb-8" aria-label="Current subscription">
      <h2 className="text-lg font-semibold">Current plan: {organization?.plan || 'Not available'}</h2>
      <p className="text-text-secondary mt-1">{organization?.subscriptionStatus ? `Status: ${organization.subscriptionStatus.replaceAll('_', ' ')}` : organization?.plan === 'Free' ? 'Free plan' : 'Billing status is not available yet.'}</p>
      {organization?.subscriptionPeriodEnd && <p className="mt-2">Current period ends {new Date(organization.subscriptionPeriodEnd.seconds * 1000).toLocaleDateString()}</p>}
    </section>
    <InlineFeedback tone="error" message={loadError}><button type="button" onClick={() => void loadPlans()} className="ui-button ui-button-secondary ml-3" disabled={loading}>Retry loading plans</button></InlineFeedback>
    {!loading && !loadError && plans.length === 0 && <p className="text-text-secondary">No plans are available right now. Your current subscription has not changed.</p>}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {plans.map(plan => {
        const current = organization?.plan?.toLowerCase() === plan.name.toLowerCase();
        return <article key={plan.id} className="bg-surface border border-surface-highlight rounded-lg p-6 flex flex-col">
          <h2 className="text-xl font-semibold">{plan.name}{current && <span className="block text-sm text-text-secondary mt-1">Current plan</span>}</h2>
          <p className="text-2xl font-bold mt-4">{plan.name === 'Franchise' ? 'Custom pricing' : priceLabel(plan)}{plan.name !== 'Franchise' && <span className="text-sm font-normal"> / {plan.interval}</span>}</p>
          <CinematicPlanBenefits plan={plan.name} />
          <ul className="my-6 space-y-3 flex-1">{plan.features.map((feature, i) => <li key={i} className="flex gap-2 text-text-secondary"><Check size={18} aria-hidden="true" className="shrink-0" />{feature}</li>)}</ul>
          {plan.name === 'Franchise' ? <a className="ui-button ui-button-secondary" href="mailto:sales@accelrestaurants.com?subject=Franchise%20Inquiry">Contact sales</a> : <button type="button" className="ui-button ui-button-primary" disabled={current || processing || !organization} onClick={() => { setError(null); setSelected(plan); }}>{current ? 'Current plan' : `Review ${plan.name} plan`}</button>}
        </article>;
      })}
    </div>
    {selected && <AccessibleDialog title={`Review ${selected.name} plan`} description="You will review the final total and payment details in Stripe before confirming a purchase." busy={processing} closeLabel="Cancel" onClose={() => { setSelected(null); setError(null); }}>
      <p className="text-xl font-semibold">{priceLabel(selected)} / {selected.interval}</p>
      <p className="mt-2 text-text-secondary">Displayed plan price. Any taxes and applicable billing adjustments are shown at checkout.</p>
      <InlineFeedback tone="error" message={error} />
      <button type="button" className="ui-button ui-button-primary mt-6" disabled={processing} onClick={() => void openCheckout()}>{processing ? 'Opening checkout…' : 'Continue to secure checkout'}</button>
    </AccessibleDialog>}
  </section>;
};
