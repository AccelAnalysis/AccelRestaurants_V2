import { syncJourneySubscription, journeyBillingReturn } from './billing';
import type { Firestore } from 'firebase-admin/firestore';
import type Stripe from 'stripe';
function fixture(status: string) {
  const org: Record<string, unknown> = { plan: 'Growth', purchasedScreens: 3, purchasedSeats: 2, stripeCustomerId: 'cus_fixture', subscriptionId: 'sub_fixture' };
  const updates: Record<string, unknown>[] = [];
  const ref = { id: 'restaurant' };
  let catalogueReads = 0;
  const db = {
    doc: () => { catalogueReads++; throw new Error('Catalogue unavailable'); },
    collection: () => ({ where: () => ({ limit: () => ({ get: async () => ({ size: 1, docs: [{ ref, data: () => org }] }) }) }) }),
    runTransaction: async (fn: (tx: unknown) => Promise<void>) => fn({ get: async () => ({ data: () => org }), update: (_ref: unknown, changes: Record<string, unknown>) => updates.push(changes) }),
  } as unknown as Firestore;
  const subscription = { id: 'sub_fixture', customer: 'cus_fixture', status, items: { data: [] }, current_period_end: 2000000000, cancel_at_period_end: false } as unknown as Stripe.Subscription;
  const stripe = { subscriptions: { retrieve: async () => subscription } } as unknown as Stripe;
  return { db, stripe, subscription, org, updates, reads: () => catalogueReads };
}
test.each(['past_due', 'unpaid', 'paused', 'incomplete'])('%s preserves last confirmed allowance even with unavailable pricing', async status => {
  const f = fixture(status); await syncJourneySubscription(f.db, f.stripe, f.subscription);
  expect(f.updates).toHaveLength(1);
  expect(f.updates[0]).not.toHaveProperty('plan');
  expect(f.updates[0]).not.toHaveProperty('purchasedScreens');
  expect(f.updates[0]).not.toHaveProperty('purchasedSeats');
  expect(f.updates[0].subscriptionStatus).toBe('past_due');
  expect(f.reads()).toBe(0);
});
test.each(['canceled', 'incomplete_expired'])('%s ends the subscription without relying on a pricing read', async status => {
  const f = fixture(status); await syncJourneySubscription(f.db, f.stripe, f.subscription);
  expect(f.updates[0]).toMatchObject({ plan: 'Free', purchasedScreens: 0, purchasedSeats: 0, subscriptionStatus: 'canceled' });
  expect(f.reads()).toBe(0);
});
test('a delayed event for a different subscription does not change access', async () => {
  const f = fixture('unpaid'); f.org.subscriptionId = 'sub_new';
  await syncJourneySubscription(f.db, f.stripe, f.subscription);
  expect(f.updates).toEqual([]);
});
test('billing return paths remain internal and preserve setup', () => {
  expect(journeyBillingReturn('https://outside.invalid/onboarding')).toMatch(/^https:\/\/accelrestaurant-d2c1f\.web\.app\/onboarding\?content=1$/);
  expect(journeyBillingReturn('https://outside.invalid/anything')).toBe('https://accelrestaurant-d2c1f.web.app/admin/subscription');
});
