import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessRelease, billingFunctions, expectedRelease } from '../../scripts/journey-release.mjs';
test('Hosting-only evidence cannot pass the release preflight', async () => {
  const expected = await expectedRelease();
  const result = assessRelease(expected, { functions: {}, catalogueReady: false });
  assert.equal(result.compatible, false); assert.equal(result.problems.length, 6);
});
test('every changed endpoint, actual Storage rules, and a valid catalogue must match', async () => {
  const expected = await expectedRelease();
  const observed = { functions: Object.fromEntries(billingFunctions.map(name => [name, expected])), storageRulesHash: expected.storageRulesHash, catalogueReady: true };
  assert.equal(assessRelease(expected, observed).compatible, true);
  for (const name of billingFunctions) {
    assert.equal(assessRelease(expected, { ...observed, functions: { ...observed.functions, [name]: { ...expected, functionsHash: 'old' } } }).compatible, false);
  }
  assert.equal(assessRelease(expected, { ...observed, storageRulesHash: 'old' }).compatible, false);
  assert.equal(assessRelease(expected, { ...observed, catalogueReady: false }).compatible, false);
  assert.equal(assessRelease(expected, observed).stripeLifecycleVerified, false);
});
