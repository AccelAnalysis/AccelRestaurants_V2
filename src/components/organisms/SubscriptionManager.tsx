import { PlanUsage } from '../journey/PlanUsage';
import { useRef, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { BillingService } from '../../services/billingService';
import { PlansPanel } from '../journey/PlansPanel';
import { InlineFeedback } from '../atoms/InlineFeedback';
import { customerError } from '../../lib/customerJourney';
import type { PlanName } from '../../../functions/src/journey/catalog';
export const SubscriptionManager = () => {
  const { organization } = useAuthStore();
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PlanName | undefined>(undefined);
  const requestId = useRef(crypto.randomUUID()), inFlight = useRef(false);
  const manage = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try { window.location.assign(await BillingService.createPortalSession(`${window.location.origin}/admin/subscription`)); }
    catch (e) { setError(customerError(e, 'We could not open your billing details. Your subscription has not changed. Try again.')); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const choose = async (name: PlanName, screens: number, seats: number) => {
    if (!organization || inFlight.current) return;
    setSelected(name);
    if (organization.subscriptionId) { await manage(); return; }
    if (name === 'Free') { setError(organization.plan === 'Free' ? 'You are already using Free.' : 'Contact support to review your current plan.'); return; }
    inFlight.current = true; setBusy(true); setError(null);
    try { window.location.assign(await BillingService.createPlanCheckout(organization.id, name, screens, seats, 'billing', requestId.current)); }
    catch (e) { setError(customerError(e, 'We could not open checkout. No payment was confirmed here. Try again.')); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const returned = new URLSearchParams(window.location.search);
  const period = organization?.subscriptionPeriodEnd?.seconds;
  const status = organization?.subscriptionStatus;
  return <section className="max-w-7xl mx-auto p-4 sm:p-8" aria-busy={busy}>
    <h1 className="text-3xl font-semibold">Plan and billing</h1><p className="text-text-secondary mt-3 mb-6">Review your plan and manage payments securely.</p>
    <InlineFeedback tone="error" message={error} />
    <InlineFeedback message={returned.has('canceled') ? 'Checkout was canceled. Your subscription has not changed.' : returned.has('success') ? 'Your payment details are being confirmed. Your current plan is shown below.' : null} />
    <section aria-label="Current plan" className="rounded-xl border border-surface-highlight p-5 mb-8"><h2 className="text-xl font-semibold">{organization ? `Current plan: ${organization.plan}` : 'Loading your current plan…'}</h2><p className="mt-3 text-text-secondary">{status === 'active' ? 'Subscription active' : status === 'past_due' ? 'Your payment needs attention. Open billing details to review it.' : status === 'trialing' ? 'Trial active' : status === 'canceled' ? 'Subscription canceled' : organization?.plan === 'Free' ? 'Free design and five-minute screen preview' : 'Subscription details are not available yet.'}</p>{period && Number.isFinite(period) ? <p className="mt-2">Current billing period ends {new Date(period * 1000).toLocaleDateString()}.</p> : null}{organization?.stripeCustomerId && <button type="button" className="ui-button ui-button-secondary mt-4" disabled={busy} onClick={() => void manage()}>Manage subscription</button>}</section>
    <PlanUsage />
    {organization?.subscriptionId && <p className="mb-6 text-text-secondary">Choose Manage subscription to change your plan or payment method, view invoices, or cancel. You will review the details before confirming a change.</p>}
    <PlansPanel initialScreens={Math.max(1, organization?.screenCount || 1)} initialSeats={Math.max(1, organization?.members?.length || 1)} selectedPlan={selected || organization?.plan} busy={busy} onChoose={(name, screens, seats) => void choose(name, screens, seats)} />
  </section>;
};
