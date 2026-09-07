import type Stripe from 'stripe';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v1/https';
import { createHash, randomUUID } from 'node:crypto';
import { PLAN_NAMES, validateBillingCatalogue, quotePlan, resolvePlan, assertBillingMember, type PlanCatalogue, type PlanName } from './catalog';
export interface CheckoutRequest {
  orgId?: string; planName?: unknown; priceId?: string; screens?: number; seats?: number;
  returnTo?: 'setup' | 'billing'; requestId?: string; successUrl?: string;
  addOns?: { screen?: number; seat?: number; screenPriceId?: string; seatPriceId?: string };
}
export async function loadJourneyCatalogue(db: Firestore) {
  const snap = await db.doc('system/plans').get();
  try { return validateBillingCatalogue(snap.data()?.configs); }
  catch { throw new HttpsError('failed-precondition', 'Current plans are not available.'); }
}
export async function publicSubscriptionPlans(db: Firestore) {
  const catalogue = await loadJourneyCatalogue(db);
  return PLAN_NAMES.map(name => ({ id: name, name, price: catalogue[name].price, currency: 'USD', interval: 'month', features: [catalogue[name].description] }));
}
function origin() {
  const candidate = process.env.APP_URL || 'https://accelrestaurant-d2c1f.web.app';
  const url = new URL(candidate);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new HttpsError('failed-precondition', 'Billing is not available right now.');
  return url.origin;
}
function isSetupReturn(requested: unknown): boolean {
  try { return typeof requested === 'string' && new URL(requested).pathname === '/onboarding'; } catch { return false; }
}
export function journeyBillingReturn(requested: unknown) {
  const setup = isSetupReturn(requested);
  return origin() + (setup ? '/onboarding?content=1' : '/admin/subscription');
}
export async function checkoutSubscription(db: Firestore, stripe: Stripe, data: CheckoutRequest, uid: string) {
  const base = origin();
  const profile = await db.doc(`users/${uid}`).get();
  const orgId = data.orgId || profile.data()?.orgId;
  if (typeof orgId !== 'string' || !/^[\w-]{1,128}$/.test(orgId)) throw new HttpsError('failed-precondition', 'Choose a restaurant first.');
  const orgRef = db.doc(`organizations/${orgId}`);
  const [orgSnap, memberSnap] = await Promise.all([orgRef.get(), orgRef.collection('members').doc(uid).get()]);
  if (!orgSnap.exists) throw new HttpsError('not-found', 'Restaurant not found.');
  const org = orgSnap.data()!;
  try { assertBillingMember(org, memberSnap.data(), uid); } catch { throw new HttpsError('permission-denied', 'Only restaurant owners and administrators can manage billing.'); }
  let customer = typeof org.stripeCustomerId === 'string' ? org.stripeCustomerId : '';
  const setup = data.returnTo === 'setup' || (!data.returnTo && isSetupReturn(data.successUrl));
  const portal = async () => {
    if (!customer) throw new HttpsError('failed-precondition', 'Your billing details need attention. Contact support.');
    const session = await stripe.billingPortal.sessions.create({ customer, return_url: `${base}${setup ? '/onboarding?content=1' : '/admin/subscription'}` });
    return { url: session.url };
  };
  if (org.subscriptionId) return portal();
  // Older webhooks stored the customer but omitted subscriptionId. Ask Stripe
  // before creating another subscription, including every page and unpaid states.
  // A failed provider read must reject checkout, never imply no subscription.
  if (customer) {
    for await (const subscription of stripe.subscriptions.list({ customer, status: 'all', limit: 100 })) {
      if (!['canceled', 'incomplete_expired'].includes(subscription.status)) return portal();
    }
  }
  const catalogue = await loadJourneyCatalogue(db);
  let name: PlanName;
  try { name = resolvePlan(catalogue, data.planName || data.priceId); } catch { throw new HttpsError('invalid-argument', 'Choose a current plan.'); }
  if (name === 'Free' || name === 'Franchise') throw new HttpsError('invalid-argument', 'This plan does not use checkout.');
  const config = catalogue[name];
  const screens = data.screens ?? config.screens + (data.addOns?.screen || 0);
  const seats = data.seats ?? config.seats + (data.addOns?.seat || 0);
  const quote = quotePlan(name, config, screens, seats);
  if (quote.error) throw new HttpsError('invalid-argument', quote.error);
  if (screens < (org.screenCount || 0) || seats < (Array.isArray(org.members) ? org.members.length : 1)) throw new HttpsError('failed-precondition', 'Choose enough screens and team members for your restaurant.');
  const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const checkPrice = async (id: string | undefined, expected: number, quantity: number) => {
    if (!id || !/^price_[a-zA-Z0-9]+$/.test(id)) throw new HttpsError('failed-precondition', 'This plan is not available for payment right now.');
    const price = await stripe.prices.retrieve(id);
    if (!price.active || price.type !== 'recurring' || price.currency !== 'usd' || price.unit_amount !== Math.round(expected * 100) || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1) throw new HttpsError('failed-precondition', 'Plan pricing has changed. Please reload the plan details.');
    items.push({ price: id, quantity });
  };
  await checkPrice(config.stripePriceId, config.price, 1);
  if (quote.extraScreens) await checkPrice(config.addOns?.screenPriceId, config.addOns!.screen!, quote.extraScreens);
  if (quote.extraSeats) await checkPrice(config.addOns?.seatPriceId, config.addOns!.seat!, quote.extraSeats);
  const requestId = data.requestId || randomUUID();
  if (!/^[\w-]{8,64}$/.test(requestId)) throw new HttpsError('invalid-argument', 'Please try checkout again.');
  const key = createHash('sha256').update(JSON.stringify([orgId, uid, requestId, name, screens, seats, items])).digest('hex');
  if (!customer) {
    const created = await stripe.customers.create({ metadata: { orgId }, ...(profile.data()?.email ? { email: profile.data()!.email } : {}) }, { idempotencyKey: `restaurant-customer-${orgId}` });
    customer = created.id;
    await orgRef.update({ stripeCustomerId: customer, updatedAt: FieldValue.serverTimestamp() });
  }
  const metadata = { orgId, userId: uid, planName: name };
  const session = await stripe.checkout.sessions.create({
    customer, mode: 'subscription', line_items: items, client_reference_id: orgId,
    success_url: `${base}${setup ? '/onboarding?content=1' : '/admin/subscription?success=true'}`,
    cancel_url: `${base}${setup ? '/onboarding?canceled=true' : '/admin/subscription?canceled=true'}`,
    metadata, subscription_data: { metadata },
  }, { idempotencyKey: `restaurant-checkout-${key}` });
  if (!session.url) throw new HttpsError('unavailable', 'Payment options could not be opened.');
  return { url: session.url };
}
export function subscriptionAllowance(catalogue: PlanCatalogue, items: { price: { id: string }; quantity?: number }[]) {
  const bases = items.flatMap(item => PLAN_NAMES.filter(name => name !== 'Free' && name !== 'Franchise' && catalogue[name].stripePriceId === item.price.id).map(name => ({ name, item })));
  if (bases.length !== 1 || bases[0].item.quantity !== 1) throw new Error('Subscription plan cannot be matched.');
  const name = bases[0].name, config = catalogue[name];
  let extraScreens = 0, extraSeats = 0;
  for (const item of items) {
    if (item.price.id === config.stripePriceId) continue;
    const qty = item.quantity;
    if (!Number.isInteger(qty) || qty! < 1 || qty! > 10000) throw new Error('Invalid subscription quantity.');
    if (item.price.id === config.addOns?.screenPriceId) extraScreens += qty!;
    else if (item.price.id === config.addOns?.seatPriceId) extraSeats += qty!;
    else throw new Error('Subscription item cannot be matched.');
  }
  const quote = quotePlan(name, config, config.screens + extraScreens, config.seats + extraSeats);
  if (quote.error) throw new Error('Subscription exceeds configured limits.');
  return { plan: name, purchasedScreens: extraScreens, purchasedSeats: extraSeats };
}
export async function syncJourneySubscription(db: Firestore, stripe: Stripe, subscription: Stripe.Subscription, expectedOrgId?: string) {
  // Fetch current state, not an out-of-order webhook snapshot. Never trust a browser return link.
  const current = await stripe.subscriptions.retrieve(subscription.id);
  const customerId = typeof current.customer === 'string' ? current.customer : current.customer.id;
  const matches = await db.collection('organizations').where('stripeCustomerId', '==', customerId).limit(2).get();
  if (matches.size !== 1) throw new Error('Subscription customer cannot be matched uniquely.');
  const orgRef = matches.docs[0].ref;
  if (expectedOrgId && expectedOrgId !== orgRef.id) throw new Error('Subscription restaurant mismatch.');
  const org = matches.docs[0].data();
  if (org.subscriptionId && org.subscriptionId !== current.id) return;
  const ended = current.status === 'canceled' || current.status === 'incomplete_expired';
  // Only a confirmed active/trialing subscription may set a new paid allowance.
  // Delinquency does not silently turn an existing restaurant into Free.
  const allowance = ended ? { plan: 'Free', purchasedScreens: 0, purchasedSeats: 0 }
    : ['active', 'trialing'].includes(current.status) ? subscriptionAllowance(await loadJourneyCatalogue(db), current.items.data) : {};
  const period = (current as Stripe.Subscription & { current_period_end?: number }).current_period_end || (current.items.data[0] as unknown as { current_period_end?: number } | undefined)?.current_period_end;
  const status = current.status === 'trialing' ? 'trialing' : current.status === 'active' ? 'active' : ended ? 'canceled' : 'past_due';
  await db.runTransaction(async tx => {
    const fresh = await tx.get(orgRef);
    if (fresh.data()?.stripeCustomerId !== customerId || (fresh.data()?.subscriptionId && fresh.data()?.subscriptionId !== current.id)) return;
    tx.update(orgRef, { ...allowance, subscriptionId: ended ? FieldValue.delete() : current.id,
      subscriptionStatus: status, cancelAtPeriodEnd: current.cancel_at_period_end,
      subscriptionPeriodEnd: Number.isFinite(period) ? Timestamp.fromMillis(period! * 1000) : FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
  });
}
