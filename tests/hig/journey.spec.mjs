import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signedOutAccount } from './state-boundary.mjs';
async function accessible(page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.filter(row => ['serious', 'critical'].includes(row.impact)).map(row => ({ id: row.id, nodes: row.nodes.map(node => node.target) }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort('blockedbyclient'));
});
test('marketing keeps one clear hero action, a video slot and only featured designs', async ({ page }, info) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/marketing');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Guest feedback');
  await expect(page.getByText('Product demonstration video', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Email for signup')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Use .* design/ })).toHaveCount(3);
  await expect(page.getByRole('link', { name: 'View all designs' })).toBeVisible();
  await expect(page.locator('section').first().getByRole('button', { name: 'Start designing', exact: true })).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Product' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Resources' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Legal' })).toBeVisible();
  await accessible(page);
  await page.screenshot({ path: info.outputPath('marketing.png'), fullPage: true });
  await page.getByRole('button', { name: 'Use Grill House design' }).click();
  await expect(page.getByRole('button', { name: 'Customize Grill House' })).toBeVisible();
  await page.getByRole('button', { name: 'Customize Grill House' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: /Grill house/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Save for later', exact: true }).click();
  expect(await page.evaluate(() => window.__hig.checkoutCalls.length)).toBe(0);
  expect(await page.evaluate(() => window.__hig.callables.length)).toBe(0);
  expect(errors).toEqual([]);
});
test('price recommendations calculate totals and reject fractional quantities', async ({ page }) => {
  await page.goto('/pricing');
  await page.getByLabel('Number of screens', { exact: true }).fill('2');
  await page.getByLabel('Number of team members', { exact: true }).fill('1');
  const recommendation = page.getByText('Lowest monthly price for ongoing playback', { exact: false });
  await expect(recommendation).toContainText('Basic');
  await expect(page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Basic', exact: true }) })).toContainText('$44');
  await page.getByLabel('Number of screens', { exact: true }).fill('8');
  await expect(recommendation).toContainText('Growth');
  await page.getByLabel('Number of screens', { exact: true }).fill('1.5');
  await expect(page.getByRole('button', { name: 'Choose Basic plan' })).toBeDisabled();
  await expect(page.getByText('Enter whole numbers between 1 and 10,000.', { exact: true })).toBeVisible();
  await accessible(page);
});
test('checkout return never assigns paid access and retains its chosen design', async ({ page }) => {
  await page.goto('/onboarding?content=1&design=grill-house');
  await expect(page.getByText('Your current plan: Free.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Customize Grill House' })).toBeVisible();
  expect(await page.evaluate(() => window.__hig.dbWrites.length)).toBe(0);
  expect(await page.evaluate(() => window.__hig.checkoutCalls.length)).toBe(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Customize Grill House' })).toBeVisible();
});
test('current plan load failure does not block creating a free design', async ({ page }) => {
  await page.goto('/onboarding?failPlans=1');
  await page.getByRole('button', { name: 'Compare plans', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('load current plan');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Choose a restaurant design', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Your restaurant, screen-ready' })).toBeVisible();
  expect(await page.evaluate(() => window.__hig.checkoutCalls.length)).toBe(0);
});
test('login account creation uses the same legal signup flow', async ({ page }) => {
  await page.goto('/login');
  // Other fixture cases start as a signed-in administrator. This case explicitly
  // represents a new visitor, so the existing-admin redirect is not exercised.
  await signedOutAccount(page);
  await page.getByLabel('Email', { exact: true }).fill('owner@example.invalid');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByLabel(/I agree to the/)).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('owner@example.invalid');
  expect(await page.evaluate(() => window.__hig.callables.length)).toBe(0);
});
test('intent storage whitelists values and is not an authorization store', async ({ page }) => {
  await page.goto('/setup-guide');
  const result = await page.evaluate(() => {
    const helpers = window.__hig.journeyHelpers;
    const clean = helpers.saveJourneyIntent({ templateId: 'grill-house', plan: 'Growth', screens: 2, seats: 1, password: 'do-not-save', email: 'private@example.invalid', isSetupComplete: true, orgId: 'other-restaurant' });
    const invalid = helpers.sanitizeIntent({ templateId: '../anything', plan: 'Unknown', screens: -4, seats: 1.5 });
    const mine = helpers.claimJourneyIntent('owner:restaurant');
    return { clean, invalid, mine, other: helpers.readJourneyIntent('another:restaurant'), visitor: helpers.readJourneyIntent() };
  });
  expect(result.clean.templateId).toBe('grill-house');
  expect(Object.keys(result.clean).sort()).toEqual(['plan', 'savedAt', 'screens', 'seats', 'templateId']);
  expect(Object.keys(result.invalid)).toEqual(['savedAt']);
  expect(result.mine.templateId).toBe('grill-house');
  expect(Object.keys(result.other)).toEqual(['savedAt']);
  expect(Object.keys(result.visitor)).toEqual(['savedAt']);
});
test('connection guidance does not confuse enabled screens with visible playback', async ({ page }, info) => {
  await page.goto('/setup-guide');
  await expect(page.getByText('Screen connected.', { exact: false })).toBeVisible();
  await expect(page.getByText('It does not confirm that the TV is on', { exact: false })).toBeVisible();
  const statuses = await page.evaluate(() => {
    const status = window.__hig.journeyHelpers.connectionState;
    const now = 1000000000;
    return [status(undefined, now), status({ seconds: (now + 60000) / 1000 }, now), status({ seconds: (now - 180000) / 1000 }, now), status({ seconds: now / 1000 }, now)];
  });
  expect(statuses).toEqual(['unknown', 'unknown', 'disconnected', 'connected']);
  await accessible(page); await page.screenshot({ path: info.outputPath('screen-setup.png'), fullPage: true });
  await page.getByRole('button', { name: 'Hide setup tips' }).click();
  await expect(page.getByRole('button', { name: 'Show screen setup tips' })).toBeVisible();
  await page.getByRole('button', { name: 'Show screen setup tips' }).click();
  await expect(page.getByRole('heading', { name: 'Get your first screen ready' })).toBeVisible();
});
test('website content edits keep failed drafts and save structured fields', async ({ page }) => {
  await page.goto('/brand');
  await page.getByLabel('Benefit 1 heading', { exact: true }).fill('A menu that feels like your restaurant');
  await page.evaluate(() => window.__hig.failSettings = true);
  await page.getByRole('button', { name: 'Save website content', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('edits are still here');
  await expect(page.getByLabel('Benefit 1 heading')).toHaveValue('A menu that feels like your restaurant');
  await page.evaluate(() => window.__hig.failSettings = false);
  await page.getByRole('button', { name: 'Save website content', exact: true }).click();
  const writes = await page.evaluate(() => window.__hig.configWrites);
  expect(writes).toHaveLength(1); expect(Object.keys(writes[0])).toEqual(['marketing']);
  expect(writes[0].marketing.benefits[0].title).toBe('A menu that feels like your restaurant');
  await accessible(page);
});
test('website settings can upload or link the homepage video without autoplay', async ({ page }) => {
  await page.goto('/brand');
  await page.getByLabel('Upload video').setInputFiles({ name: 'product-demo.mp4', mimeType: 'video/mp4', buffer: Buffer.from('demo') });
  await expect(page.getByRole('status')).toContainText('Video uploaded');
  await expect(page.getByLabel('Video address')).toHaveValue('https://example.invalid/file.png');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  const writes = await page.evaluate(() => window.__hig.configWrites);
  expect(writes.at(-1).landingPageVideoUrl).toBe('https://example.invalid/file.png');
  const preview = page.getByLabel('Homepage video preview');
  await expect(preview).toHaveCount(1);
  expect(await preview.evaluate(node => node.autoplay)).toBe(false);
});
test('restaurant settings show no sample payment method or inert destructive action', async ({ page }) => {
  await page.goto('/restaurant-settings');
  await expect(page.getByRole('heading', { name: 'Restaurant settings' })).toBeVisible();
  await expect(page.getByText(/4242|Feb 1, 2026|VISA/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Delete Organization|Upload Logo|Add Seats/ })).toHaveCount(0);
  await page.getByLabel('Restaurant name', { exact: true }).fill('Updated restaurant');
  await page.evaluate(() => window.__hig.failSave = true);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('still here');
  await expect(page.getByLabel('Restaurant name')).toHaveValue('Updated restaurant');
  await accessible(page);
});
test('new public surfaces contain no internal implementation commentary', async ({ page }) => {
  for (const route of ['/marketing', '/pricing', '/onboarding', '/setup-guide', '/billing']) {
    await page.goto(route);
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/\b(?:idempotenc\w*|entitlements?|server.authoritative|Firestore|fixture|opaque|schema|read model|instrumentation|webhook|canonical|wedge)\b/i);
    expect(text).not.toMatch(/14.day trial|5.minute setup|VISA.*4242/i);
  }
});
