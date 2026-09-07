import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

export const BillingStatusWidget = () => {
  const { organization, loading } = useAuthStore();
  if (loading || !organization) return <section className="bg-surface border border-surface-highlight rounded-lg p-6"><p role="status">Loading billing details…</p></section>;
  const periodEnd = organization.subscriptionPeriodEnd?.seconds;
  return <section className="bg-surface border border-surface-highlight rounded-lg p-6 h-full flex flex-col">
    <h3 className="text-lg font-semibold">Plan and billing</h3>
    <p className="text-text-secondary mt-4">Current plan</p><p className="text-2xl font-semibold mt-1">{organization.plan}</p>
    <p className="text-text-secondary mt-4">{organization.subscriptionStatus === 'active' ? 'Subscription active' : organization.subscriptionStatus === 'past_due' ? 'Your payment needs attention. Open billing to review it.' : organization.subscriptionStatus === 'canceled' ? 'Subscription canceled' : organization.subscriptionStatus === 'trialing' ? 'Trial active' : organization.plan === 'Free' ? 'Free design and five-minute screen preview' : 'Open billing to review your subscription.'}</p>
    {Number.isFinite(periodEnd) && <p className="text-text-secondary mt-4">Current billing period ends {new Date(periodEnd! * 1000).toLocaleDateString()}.</p>}
    <p className="text-text-secondary my-5">Review plans, payment details and invoices in one place.</p>
    <Link className="ui-button ui-button-secondary mt-auto" to="/admin/subscription">Manage subscription</Link>
  </section>;
};
