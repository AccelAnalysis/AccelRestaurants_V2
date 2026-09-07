import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { constrainGeometry, moveTileWithKey } from '../../src/utils/editorGeometry.ts';

async function audit(page) {
  const report = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(report.violations.filter(v => ['serious','critical'].includes(v.impact)).map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
}
async function inspector(page) {
  const toggle = page.getByRole('button', { name: 'Inspector', exact: true });
  if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
}
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => ['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort('blockedbyclient'));
});

test('screen names, 44px touch regions, responsive layout and axe', async ({ page }, info) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/admin/screens');
  await expect(page.getByRole('link', { name: 'Dining room', exact: true })).toBeVisible();
  for (const name of ['Add screen','Activate display','Setup / preview','Delete Dining room']) {
    const box = await page.getByRole('button', { name, exact: true }).first().boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await audit(page); await page.screenshot({ path: info.outputPath('screens.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('template Cancel is neutral, dialog traps and restores focus', async ({ page }) => {
  await page.goto('/admin/screens');
  const add = page.getByRole('button', { name: 'Add screen', exact: true }); await add.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAccessibleName('Choose a screen template');
  await expect(dialog.getByRole('button', { name: 'Start from scratch' })).toBeVisible();
  for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true); }
  await audit(page); await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0); await expect(add).toBeFocused();
  await expect(page).toHaveURL(/\/admin\/screens$/);
  expect(await page.evaluate(() => window.__hig.imports + window.__hig.screenSaves.length)).toBe(0);
});

test('display-address clipboard error offers manual entry and deletion can be cancelled', async ({ page }) => {
  await page.goto('/admin/screens');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('blocked'); } } }));
  await page.getByRole('button', { name: 'Setup / preview', exact: true }).click();
  await page.getByRole('button', { name: 'Copy display address', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Enter displays.accelanalysis.com');
  await expect(page.getByLabel('TV browser address')).toHaveValue('https://displays.accelanalysis.com');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Delete Dining room' }).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Delete Dining room?');
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await page.evaluate(() => window.__hig.deleted)).toEqual([]);
});

test('failed screen load is not mistaken for empty data and Retry works', async ({ page }) => {
  await page.goto('/admin'); await page.evaluate(() => { window.__hig.failScreens = true; });
  const nav = page.getByRole('button', { name: 'Open navigation' }); if (await nav.isVisible()) await nav.click();
  await page.getByRole('navigation').getByRole('link', { name: 'Screens', exact: true }).click();
  await expect(page.getByText('Screens could not be loaded. Your saved screens have not been changed.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No screens yet' })).toHaveCount(0);
  await page.evaluate(() => { window.__hig.failScreens = false; });
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Dining room', exact: true })).toBeVisible();
});

test('tile addition, movement and resizing without dragging', async ({ page }, info) => {
  await page.goto('/admin/slides/slide-1');
  await expect(page.getByRole('heading', { name: 'Lunch menu', exact: true })).toBeVisible();
  const tiles = page.getByRole('button', { name: 'Tiles', exact: true }); if (await tiles.getAttribute('aria-expanded') === 'false') await tiles.click();
  await page.getByLabel('Find a tile').fill('Text Block');
  await page.getByRole('button', { name: 'Add Text Block tile', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByLabel('Horizontal position')).toHaveValue('540');
  await page.getByRole('group', { name: 'text tile', exact: true }).focus();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowDown');
  await expect(page.getByLabel('Horizontal position')).toHaveValue('541'); await expect(page.getByLabel('Vertical position')).toHaveValue('295');
  await page.getByLabel('Width', { exact: true }).fill('320'); await expect(page.getByLabel('Width', { exact: true })).toHaveValue('320');
  await page.getByRole('button', { name: 'Move tile left 10 pixels', exact: true }).click(); await expect(page.getByLabel('Horizontal position')).toHaveValue('531');
  await audit(page); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('editor.png'), fullPage: true });
});

test('failed slide save retains edits and retry succeeds', async ({ page }) => {
  await page.goto('/admin/slides/slide-1'); await page.getByRole('group', { name: 'Lunch heading', exact: true }).focus(); await inspector(page);
  await page.evaluate(() => { window.__hig.failSave = true; }); await page.getByLabel('Tile text content').fill('Edited lunch');
  await page.getByRole('button', { name: 'Save', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('Your edits are still here');
  await expect(page.getByLabel('Tile text content')).toHaveValue('Edited lunch');
  await page.evaluate(() => { window.__hig.failSave = false; }); await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible();
});

test('save completion preserves newer edits made during the request', async ({ page }) => {
  await page.goto('/admin/slides/slide-1'); await page.getByRole('group', { name: 'Lunch heading', exact: true }).focus(); await inspector(page);
  await page.evaluate(() => { window.__hig.delaySave = true; }); await page.getByLabel('Tile text content').fill('First edit');
  await page.getByRole('button', { name: 'Save', exact: true }).click(); await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await page.getByLabel('Tile text content').fill('Newer edit');
  await page.evaluate(() => { window.__hig.delaySave = false; window.__hig.pending.splice(0).forEach(resolve => resolve()); });
  await expect(page.getByLabel('Tile text content')).toHaveValue('Newer edit');
  await expect.poll(() => page.evaluate(() => window.__hig.saves.at(-1)?.elements[0].properties.content)).toBe('Newer edit');
});

test('playlist reorder preserves duration for repeated slide entries', async ({ page }, info) => {
  await page.goto('/admin/screens/screen-1');
  const first = page.getByRole('group', { name: 'Playlist entry 1: Lunch menu', exact: true });
  await first.getByRole('button', { name: 'Move Lunch menu down', exact: true }).focus(); await page.keyboard.press('Enter');
  const newFirst = page.getByRole('group', { name: 'Playlist entry 1: Lunch menu', exact: true });
  await newFirst.getByRole('button', { name: 'Settings for Lunch menu', exact: true }).click();
  await expect(newFirst.getByLabel('Duration for Lunch menu in milliseconds')).toHaveValue('12000');
  await audit(page); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('playlist.png'), fullPage: true });
  await page.getByRole('button', { name: 'Save screen', exact: true }).click();
  const entries = await page.evaluate(() => window.__hig.screenSaves[0].data.livePlaylist);
  expect(entries.map(e => e.duration ?? null)).toEqual([12000,5000,null]); expect(entries.every(e => !('key' in e))).toBe(true);
});

test('login labels and reset error recovery', async ({ page }, info) => {
  await page.goto('/login'); await page.getByLabel('Email', { exact: true }).fill('review@example.invalid');
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('autocomplete', 'current-password');
  await page.getByRole('button', { name: 'Forgot Password?', exact: true }).click(); await page.getByRole('button', { name: 'Send Reset Link', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('could not complete'); await expect(page.getByRole('button', { name: 'Send Reset Link', exact: true })).toBeEnabled();
  await audit(page); await page.screenshot({ path: info.outputPath('login.png'), fullPage: true });
});

test('audio schedule names, switch, days and retained errors', async ({ page }) => {
  await page.goto('/admin/schedules'); await page.getByRole('button', { name: 'Add schedule' }).click();
  await expect(page.getByRole('switch', { name: 'Enable schedule' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Mon', exact: true })).toHaveAttribute('aria-pressed','true'); await expect(page.getByLabel('End time (optional)')).toBeVisible();
  await page.getByRole('button', { name: 'Save Schedule', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('Failed to save');
  await audit(page); await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Add schedule' })).toBeFocused();
});

test('reduced motion prevents WebGL engine startup', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { window.__webglCalls = 0; const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { if (String(type).includes('webgl')) window.__webglCalls++; return original.call(this,type,...args); }; });
  await page.goto('/admin/motion');
  await expect(page.getByRole('heading', { name: 'Motion preference', exact: true })).toBeVisible();
  // Reduced motion now avoids allocating even an empty canvas; retain the zero-context assertion.
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => window.__webglCalls)).toBe(0);
});

test('keyboard geometry respects locked tiles and bounds', () => {
  const tile = { position: {x:0,y:0}, size:{width:100,height:100}, locked:false };
  expect(moveTileWithKey({...tile,locked:true},'ArrowLeft',10,{width:1280,height:720})).toBeNull(); expect(moveTileWithKey(tile,'Enter',1,{width:1280,height:720})).toBeNull();
  expect(constrainGeometry(tile,{position:{x:9999,y:9999},size:{width:Infinity,height:-2}},{width:1280,height:720})).toEqual({size:{width:100,height:20},position:{x:1190,y:710}});
});
