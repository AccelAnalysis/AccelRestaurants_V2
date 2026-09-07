import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort('blockedbyclient'));
});
const store = page => page.evaluate(async () => (await import('/src/store/useAuthStore.ts')).useAuthStore.getState().organization);
test('confirmed restaurant edits advance setup without losing subscription fields', async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Edit restaurant details' }).click();
  const before = await store(page);
  await page.getByLabel('Restaurant name', { exact: true }).fill('My new restaurant name');
  await page.getByRole('button', { name: 'Continue to your design' }).click();
  await expect(page.getByText('Step 3 of 4')).toBeVisible();
  const after = await store(page);
  expect(after.name).toBe('My new restaurant name');
  expect(after.industry).toBeTruthy();
  expect(after.plan).toBe(before.plan);
  expect(after.subscriptionId).toBe(before.subscriptionId);
  await page.getByRole('button', { name: 'Set up later', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  expect((await store(page)).isSetupComplete).toBe(true);
});
test('failed restaurant edits preserve inputs but do not change account state', async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Edit restaurant details' }).click();
  const before = await store(page);
  await page.getByLabel('Restaurant name', { exact: true }).fill('Not saved yet');
  await page.evaluate(() => { window.__hig.failDatabase = true; });
  await page.getByRole('button', { name: 'Continue to your design' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('changes are still here');
  await expect(page.getByLabel('Restaurant name', { exact: true })).toHaveValue('Not saved yet');
  expect((await store(page)).name).toBe(before.name);
});
test('restored plan changes do not erase unsaved restaurant details or restart setup', async ({ page }) => {
  await page.goto('/onboarding?content=1');
  await page.getByRole('button', { name: 'Edit restaurant details' }).click();
  await page.getByLabel('Restaurant name', { exact: true }).fill('Still editing');
  await page.evaluate(() => window.__hig.setOwnerProfile({ plan: 'Growth', subscriptionStatus: 'active' }));
  await expect(page.getByText('Step 2 of 4')).toBeVisible();
  await expect(page.getByLabel('Restaurant name', { exact: true })).toHaveValue('Still editing');
  await page.getByRole('button', { name: 'Continue to your design' }).click();
  await expect(page.getByText('Your current plan: Growth.', { exact: false })).toBeVisible();
});
test('setup keeps safe screen-activation return destinations and rejects outside destinations', async ({ page }) => {
  await page.goto('/setup-guide');
  const results = await page.evaluate(() => {
    const safe = window.__hig.journeyHelpers.safeWorkspaceDestination;
    return ['/admin/screens?activate=1&code=123456', '//outside.invalid', '/admin/../../outside', '/admin\\outside', '/admin\nanything', 'https://outside.invalid'].map(safe);
  });
  expect(results[0]).toBe('/admin/screens?activate=1&code=123456');
  expect(results.slice(1)).toEqual([undefined, undefined, undefined, undefined, undefined]);
});
