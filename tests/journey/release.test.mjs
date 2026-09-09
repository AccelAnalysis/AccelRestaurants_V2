import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessRelease, billingFunctions, expectedRelease, validPublicPlans } from '../../scripts/journey-release.mjs';
test('Hosting-only evidence cannot pass the release preflight', async () => {
  const expected = await expectedRelease();
  const result = assessRelease(expected, { functions: {}, catalogueReady: false });
  assert.equal(result.compatible, false); assert.equal(result.problems.length, 8);
});
test('every changed endpoint, actual Storage rules, and a valid catalogue must match', async () => {
  const expected = await expectedRelease();
  const observed = { functions: Object.fromEntries(billingFunctions.map(name => [name, expected])), storageRulesHash: expected.storageRulesHash, catalogueReady: true };
  assert.equal(assessRelease(expected, observed).backendCompatible, true);
  assert.equal(assessRelease(expected, observed).compatible, false);
  for (const name of billingFunctions) {
    assert.equal(assessRelease(expected, { ...observed, functions: { ...observed.functions, [name]: { ...expected, functionsHash: 'old' } } }).backendCompatible, false);
  }
  assert.equal(assessRelease(expected, { ...observed, storageRulesHash: 'old' }).backendCompatible, false);
  assert.equal(assessRelease(expected, { ...observed, catalogueReady: false }).backendCompatible, false);
  assert.equal(assessRelease(expected, observed).stripeLifecycleVerified, false);
  assert.equal(assessRelease(expected, observed).homepageVideoUploadVerified, false);
  assert.equal(assessRelease(expected, { ...observed, stripeLifecycleVerified: true, homepageVideoUploadVerified: true }).compatible, false);
});
test('public catalogue summaries reject malformed and duplicate rows', () => {
  const plans = ['Free', 'Basic', 'Growth', 'Enterprise', 'Franchise'].map(name => ({ id: name, name, price: 0, currency: 'USD', interval: 'month', features: ['Description'] }));
  assert.equal(validPublicPlans(plans), true);
  for (const invalid of [null, plans.map(({ name }) => ({ name })), [...plans, plans[0]], [plans[0], ...plans.slice(0, 4)], plans.map(plan => ({ ...plan, price: -1 })), plans.map(plan => ({ ...plan, currency: 'EUR' }))]) assert.equal(validPublicPlans(invalid), false);
});
