import { PLAN_NAMES, validateCatalogue, validateBillingCatalogue, quotePlan, recommendedPlan, resolvePlan, assertBillingMember, type PlanCatalogue } from './catalog';
import { subscriptionAllowance, checkoutSubscription } from './billing';
import type { Firestore } from 'firebase-admin/firestore';
import type Stripe from 'stripe';
const basic = { price: 29, screens: 1, seats: 1, description: 'Single restaurant', deploymentDurationLimit: false, allowedTiles: ['text'], stripePriceId: 'price_basic', addOns: { screen: 15, seat: 19, screenPriceId: 'price_basicScreen', seatPriceId: 'price_basicSeat' } };
const catalogue: PlanCatalogue = {
  Free: { ...basic, price: 0, deploymentDurationLimit: true, addOns: undefined, stripePriceId: undefined }, Basic: basic,
  Growth: { ...basic, price: 79, screens: 7, seats: 2, maxScreens: 25, stripePriceId: 'price_growth', addOns: { screen: 13, seat: 15, screenPriceId: 'price_growthScreen', seatPriceId: 'price_growthSeat' } },
  Enterprise: { ...basic, price: 299, screens: 25, seats: 5, maxScreens: 25, stripePriceId: 'price_enterprise', addOns: { seat: 10, seatPriceId: 'price_enterpriseSeat' } },
  Franchise: { ...basic, price: 0, screens: -1, seats: -1, stripePriceId: undefined },
};
describe('one commercial catalogue', () => {
  test('validates configured plans without changing prices', () => expect(validateCatalogue(catalogue)).toEqual(catalogue));
  test('server billing validates all payable mappings without requiring them in display defaults', () => {
    expect(validateBillingCatalogue(catalogue)).toEqual(catalogue);
    const missing = { ...catalogue, Basic: { ...basic, stripePriceId: undefined } };
    expect(validateCatalogue(missing)).toEqual(missing);
    expect(() => validateBillingCatalogue(missing)).toThrow();
  });
  test.each([
    { ...catalogue, Growth: { ...catalogue.Growth, stripePriceId: basic.stripePriceId } },
    { ...catalogue, Basic: { ...basic, addOns: { ...basic.addOns, screenPriceId: undefined } } },
    { ...catalogue, Basic: { ...basic, addOns: { ...basic.addOns, screenPriceId: basic.stripePriceId } } },
    { ...catalogue, Basic: { ...basic, addOns: { ...basic.addOns, screen: undefined } } },
    { ...catalogue, Basic: { ...basic, stripePriceId: 'price_placeholder_not_real' } },
  ])('rejects missing, ambiguous and malformed payment mappings', input => expect(() => validateBillingCatalogue(input)).toThrow());
  test.each([null, {}, { ...catalogue, Basic: { ...basic, price: NaN } }, { ...catalogue, Basic: { ...basic, price: -1 } }, { ...catalogue, Basic: { ...basic, screens: 0 } }])('rejects malformed configuration %p', input => expect(() => validateCatalogue(input)).toThrow());
  test.each([[0, 1], [1.5, 1], [1, -1], [Infinity, 1], [1, NaN]])('rejects invalid quantities %p / %p', (screens, seats) => expect(quotePlan('Basic', basic, screens, seats).error).not.toBeNull());
  test('uses screen and team extras', () => expect(quotePlan('Basic', basic, 2, 2).total).toBe(63));
  test('does not select an expensive plan using count shortcuts', () => { expect(recommendedPlan(catalogue, 2, 1)).toBe('Basic'); expect(recommendedPlan(catalogue, 8, 1)).toBe('Growth'); expect(recommendedPlan(catalogue, 25, 2)).toBe('Enterprise'); });
  test('enforces caps and unavailable extras', () => { expect(quotePlan('Free', catalogue.Free, 2, 1).error).not.toBeNull(); expect(quotePlan('Enterprise', catalogue.Enterprise, 26, 1).error).not.toBeNull(); });
  test('custom plan is not advertised as a zero-price checkout', () => expect(quotePlan('Franchise', catalogue.Franchise, 50, 20).total).toBeNull());
  test('unknown price identifiers cannot buy a plan', () => { expect(resolvePlan(catalogue, 'price_growth')).toBe('Growth'); expect(() => resolvePlan(catalogue, 'price_external')).toThrow(); });
  test('billing requires ownership or an active restaurant administrator', () => { expect(() => assertBillingMember({ ownerId: 'owner' }, undefined, 'owner')).not.toThrow(); expect(() => assertBillingMember({}, { role: 'orgAdmin', status: 'active' }, 'member')).not.toThrow(); for (const member of [undefined, { role: 'orgAdmin', status: 'deactivated' }, { role: 'user', status: 'active' }, { role: 'admin', status: 'active' }]) expect(() => assertBillingMember({ ownerId: 'owner' }, member, 'other')).toThrow(); });
  test('webhook allowance is derived from actual subscription items', () => expect(subscriptionAllowance(catalogue, [{ price: { id: 'price_growth' }, quantity: 1 }, { price: { id: 'price_growthScreen' }, quantity: 2 }])).toEqual({ plan: 'Growth', purchasedScreens: 2, purchasedSeats: 0 }));
  test('rejects unknown and mismatched subscription items', () => { for (const items of [[{ price: { id: 'price_external' }, quantity: 1 }], [{ price: { id: 'price_growth' }, quantity: 2 }], [{ price: { id: 'price_growth' }, quantity: 1 }, { price: { id: 'price_basicScreen' }, quantity: 1 }]]) expect(() => subscriptionAllowance(catalogue, items)).toThrow(); });
});
function boundary(overrides: Record<string, unknown> = {}, subscriptions: { status: string }[] = []) {
  const org = { ownerId: 'owner', members: ['owner'], screenCount: 1, stripeCustomerId: 'cus_restaurant', ...overrides };
  const db = { doc: (path: string) => ({ get: async () => ({ exists: true, data: () => path === 'system/plans' ? { configs: catalogue } : path.startsWith('users/') ? { orgId: 'restaurant' } : org }), collection: () => ({ doc: () => ({ get: async () => ({ data: () => ({ role: 'user', status: 'active' }) }) }) }) }) } as unknown as Firestore;
  const create = jest.fn(async () => ({ url: 'https://checkout.stripe.com/test' }));
  const portal = jest.fn(async () => ({ url: 'https://billing.stripe.com/test' }));
  const list = jest.fn(async function* () { yield* subscriptions; });
  const stripe = { subscriptions: { list }, billingPortal: { sessions: { create: portal } }, prices: { retrieve: jest.fn(async (id: string) => ({ id, active: true, type: 'recurring', currency: 'usd', unit_amount: id === 'price_basic' ? 2900 : id === 'price_basicScreen' ? 1500 : 1900, recurring: { interval: 'month', interval_count: 1 } })) }, checkout: { sessions: { create } } } as unknown as Stripe;
  return { db, stripe, create, portal, list };
}
describe('subscription checkout boundary', () => {
  test('builds prices and return URLs on the server and uses idempotency', async () => {
    const { db, stripe, create } = boundary();
    await checkoutSubscription(db, stripe, { orgId: 'restaurant', planName: 'Basic', screens: 2, seats: 1, returnTo: 'setup', requestId: 'request-123', addOns: { screenPriceId: 'price_attacker' } }, 'owner');
    const [request, options] = create.mock.calls[0] as unknown as [Stripe.Checkout.SessionCreateParams, { idempotencyKey: string }];
    expect(request.line_items).toEqual([{ price: 'price_basic', quantity: 1 }, { price: 'price_basicScreen', quantity: 1 }]);
    expect(request.success_url).toMatch(/^https:\/\/[^/]+\/onboarding\?content=1$/);
    expect(options.idempotencyKey).toMatch(/^restaurant-checkout-/);
  });
  test('an existing subscription opens the portal without depending on the current catalogue', async () => {
    const { db, stripe, create, portal, list } = boundary({ subscriptionId: 'sub_existing' });
    await expect(checkoutSubscription(db, stripe, { planName: 'retired-plan' }, 'owner')).resolves.toEqual({ url: 'https://billing.stripe.com/test' });
    expect(portal).toHaveBeenCalledWith({ customer: 'cus_restaurant', return_url: 'https://accelrestaurant-d2c1f.web.app/admin/subscription' });
    expect(create).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled();
  });
  test.each(['active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete'])('legacy %s subscriptions without a stored ID open the portal, never checkout', async status => {
    const { db, stripe, create, portal, list } = boundary({ plan: 'Growth', subscriptionStatus: status }, [...Array.from({ length: 100 }, () => ({ status: 'canceled' })), { status }]);
    await checkoutSubscription(db, stripe, { planName: 'Basic', returnTo: 'setup' }, 'owner');
    expect(list).toHaveBeenCalledWith({ customer: 'cus_restaurant', status: 'all', limit: 100 });
    expect(portal).toHaveBeenCalledWith({ customer: 'cus_restaurant', return_url: 'https://accelrestaurant-d2c1f.web.app/onboarding?content=1' });
    expect(create).not.toHaveBeenCalled();
  });
  test('ended subscriptions allow a new checkout', async () => {
    const { db, stripe, create, portal } = boundary({}, [{ status: 'canceled' }, { status: 'incomplete_expired' }]);
    await checkoutSubscription(db, stripe, { planName: 'Basic' }, 'owner');
    expect(create).toHaveBeenCalledTimes(1); expect(portal).not.toHaveBeenCalled();
  });
  test('a failed subscription lookup cannot create another subscription', async () => {
    const { db, stripe, create, list } = boundary();
    list.mockImplementation(async function* () { yield { status: 'canceled' }; throw new Error('Provider unavailable'); });
    await expect(checkoutSubscription(db, stripe, { planName: 'Basic' }, 'owner')).rejects.toThrow('Provider unavailable');
    expect(create).not.toHaveBeenCalled();
  });
  test('a missing customer or failed portal cannot fall through to checkout', async () => {
    for (const customer of [undefined, 'cus_restaurant']) {
      const { db, stripe, create, portal } = boundary({ subscriptionId: 'sub_existing', stripeCustomerId: customer });
      portal.mockRejectedValue(new Error('Portal unavailable'));
      await expect(checkoutSubscription(db, stripe, { planName: 'Basic' }, 'owner')).rejects.toThrow();
      expect(create).not.toHaveBeenCalled();
    }
  });
  test('denies non-admins before checkout', async () => { const { db, stripe, create } = boundary(); await expect(checkoutSubscription(db, stripe, { planName: 'Basic' }, 'other')).rejects.toThrow(); expect(create).not.toHaveBeenCalled(); });
  test('does not charge when configured and payment-provider prices differ', async () => { const { db, stripe, create } = boundary(); (stripe.prices.retrieve as jest.Mock).mockResolvedValue({ active: true, type: 'recurring', currency: 'usd', unit_amount: 9999, recurring: { interval: 'month', interval_count: 1 } }); await expect(checkoutSubscription(db, stripe, { planName: 'Basic' }, 'owner')).rejects.toThrow(); expect(create).not.toHaveBeenCalled(); });
  test('does not accept unknown plan names', async () => { const { db, stripe, create } = boundary(); await expect(checkoutSubscription(db, stripe, { planName: 'attacker' }, 'owner')).rejects.toThrow(); expect(create).not.toHaveBeenCalled(); });
});
void PLAN_NAMES;
