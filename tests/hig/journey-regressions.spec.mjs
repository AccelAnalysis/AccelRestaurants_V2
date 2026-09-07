import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort('blockedbyclient'));
});
test('billing restores purchased allowances, overrides and approaching-limit warnings', async ({ page }, info) => {
  await page.goto('/billing-status');
  await page.evaluate(() => window.__hig.setOwnerProfile({ plan: 'Growth', screenCount: 9, purchasedScreens: 3, purchasedSeats: 2, members: ['a','b','c'] }));
  const usage = page.getByRole('region', { name: 'Plan usage' });
  await expect(usage).toContainText('9 / 10'); await expect(usage).toContainText('3 / 4'); await expect(usage).toContainText('Approaching your allowance');
  await page.evaluate(() => window.__hig.setOwnerProfile({ customLimits: { screens: 12, seats: -1 } }));
  await expect(usage).toContainText('9 / 12'); await expect(usage).toContainText('3 / Unlimited');
  await page.screenshot({ path: info.outputPath('usage.png'), fullPage: true });
});
test('storage outage leaves unrelated dashboard figures intact and retries without fake zeros', async ({ page }) => {
  await page.goto('/overview?failMedia=1');
  await expect(page.getByRole('link').filter({ has: page.getByRole('heading', { name: 'Screens', exact: true }) })).toContainText('1');
  await expect(page.getByRole('link').filter({ has: page.getByRole('heading', { name: 'Saved designs', exact: true }) })).toContainText('2');
  const media = page.getByRole('link').filter({ has: page.getByRole('heading', { name: 'Photos and media', exact: true }) });
  await expect(media).toContainText('—');
  await expect(page.getByRole('alert').filter({ hasText: /Could not load photos/ })).toBeVisible();
  await page.evaluate(() => window.__hig.failMedia = false);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(media).toContainText('0');
});
test('first-screen guide shares dashboard reads, collapses after assignment and has no timer reloads', async ({ page }) => {
  await page.goto('/overview?registered=1');
  await expect(page.getByRole('button', { name: 'Screen setup', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Get your first screen ready' })).toHaveCount(0);
  const before = await page.evaluate(() => ({ ...window.__hig.readCounts }));
  expect(before).toEqual({ screens: 1, slides: 1, registrations: 1 });
  await page.clock.install(); await page.clock.fastForward(60000);
  expect(await page.evaluate(() => window.__hig.readCounts)).toEqual(before);
  await page.getByRole('button', { name: 'Screen setup', exact: true }).click();
  await expect(page.getByText('Check the TV to confirm your menu is visible.', { exact: false })).toBeVisible();
});
test('social links round-trip through administration and configured phone is actionable', async ({ page }) => {
  await page.goto('/brand'); await page.getByRole('button', { name: 'Add social link' }).click();
  await page.getByLabel('Social link 1 platform').fill('Instagram'); await page.getByLabel('Social link 1 address').fill('https://example.com/restaurant');
  await page.getByLabel('Contact phone', { exact: true }).fill('+1 (555) 123-4567');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  const config = await page.evaluate(() => window.__hig.configWrites.at(-1));
  expect(config.socialLinks).toEqual([{ platform: 'Instagram', url: 'https://example.com/restaurant' }]);
  await page.goto('/marketing'); await page.evaluate(value => window.__hig.setConfig(value), config);
  await expect(page.getByRole('link', { name: 'Instagram', exact: true })).toHaveAttribute('href', 'https://example.com/restaurant');
  await expect(page.getByRole('link', { name: '+1 (555) 123-4567', exact: true })).toHaveAttribute('href', 'tel:+15551234567');
});
test('editable FAQs appear on Plans with feature details, never as a homepage wall', async ({ page }, info) => {
  await page.goto('/pricing');
  await page.evaluate(() => window.__hig.setConfig({ marketing: { faqs: [{ question: 'Can I bring my display?', answer: 'Try it with a free preview.' }] } }));
  await page.getByText('Compare features and extras', { exact: true }).click();
  await expect(page.getByRole('table')).toContainText('Additional screen'); await expect(page.getByRole('table')).toContainText('$15.00 / month');
  await page.getByText('Can I bring my display?', { exact: true }).click(); await expect(page.getByText('Try it with a free preview.', { exact: true })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(results.violations.filter(v => ['serious','critical'].includes(v.impact))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath('plans-details.png'), fullPage: true });
});
