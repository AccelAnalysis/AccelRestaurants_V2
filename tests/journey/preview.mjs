import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(new URL('../hig/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const url = new URL(process.env.PREVIEW_URL || '');
if (url.protocol !== 'https:' || !url.hostname.endsWith('.web.app')) throw new Error('Use the Firebase PR preview URL.');
await mkdir('test-results/preview', { recursive: true });
const browser = await chromium.launch({ headless: true });
const evidence = [];
try {
  for (const [name, viewport] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 1000 }]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(new URL('/pricing', url).href);
    await expect(page.getByRole('button', { name: 'Choose Basic plan', exact: true })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: 'Choose Growth plan', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choose Enterprise plan', exact: true })).toBeVisible();
    await page.getByLabel('Number of screens', { exact: true }).fill('2');
    await expect(page.getByRole('button', { name: 'Choose Basic plan', exact: true })).toBeEnabled();
    await page.screenshot({ path: `test-results/preview/${name}-pricing.png`, fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []);
    evidence.push({ viewport: name, url: page.url(), planCards: 'visible', runtimeErrors: errors, mockedServices: false });
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile('test-results/preview/evidence.json', JSON.stringify({ revision: process.env.GITHUB_SHA, evidence, checkoutExercised: false, uploadExercised: false }, null, 2));
}
