import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort('blockedbyclient'));
});

test('restaurant brand texture remains visible across public and setup surfaces', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('main.bg-speed-pattern')).toBeVisible();

  await page.goto('/restaurants');
  await expect(page.locator('.bg-speed-pattern').first()).toBeVisible();

  await page.goto('/onboarding?new=1');
  await expect(page.locator('.bg-speed-pattern').first()).toBeVisible();
});

test('admin navigation keeps a hamburger control and can be collapsed or opened', async ({ page }) => {
  await page.goto('/admin/screens');
  const width = page.viewportSize()?.width || 0;

  if (width >= 1024) {
    const collapse = page.getByRole('button', { name: 'Collapse navigation', exact: true });
    await expect(collapse).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true })).toBeVisible();
    await collapse.click();
    await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true })).toHaveCount(0);
    const expand = page.getByRole('button', { name: 'Expand navigation', exact: true });
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await expand.click();
    await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true })).toBeVisible();
  } else {
    const open = page.getByRole('button', { name: 'Open navigation', exact: true });
    await expect(open).toBeVisible();
    await expect(open).toHaveAttribute('aria-expanded', 'false');
    await open.click();
    await expect(page.getByRole('dialog', { name: 'Navigation', exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('slide editor retains its textured grid outside the authored slide', async ({ page }) => {
  await page.goto('/admin/slides/slide-1');
  const pattern = await page.locator('.editor-canvas-area > div').first().evaluate(element => element.style.backgroundImage);
  expect(pattern).toContain('radial-gradient');
});
