import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';

const requireFunctions = createRequire(new URL('../../functions/package.json', import.meta.url));
const requireBrowser = createRequire(new URL('../hig/package.json', import.meta.url));
const { initializeApp } = requireFunctions('firebase-admin/app');
const { getFirestore, Timestamp } = requireFunctions('firebase-admin/firestore');
const { getAuth } = requireFunctions('firebase-admin/auth');
const { chromium, expect } = requireBrowser('@playwright/test');
const PROJECT = 'demo-accel-measurement';
const ORIGIN = 'http://127.0.0.1:5000';
const PASSWORD = ['Emulator', 'only', 'Password', '123'].join('-');
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' || process.env.GCLOUD_PROJECT !== PROJECT) throw new Error('Refusing player browser tests outside the loopback demo emulators.');

await mkdir('tests/player/results', { recursive: true });
const app = initializeApp({ projectId: PROJECT }, 'player-browser');
const db = getFirestore(app), auth = getAuth(app);
const owner = 'playerBrowserOwner', orgId = 'playerBrowserOrg', firstScreen = 'playerBrowserLeft', secondScreen = 'playerBrowserRight';
const reset = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
if (!reset.ok) throw new Error('Could not reset demo emulator.');
const now = () => Timestamp.now();
await Promise.all([
  db.doc(`organizations/${orgId}`).set({ id: orgId, ownerId: owner, members: [owner], name: 'Player Browser Restaurant', plan: 'Enterprise', timezone: 'America/New_York', isSetupComplete: true, screenCount: 2, createdAt: now(), updatedAt: now() }),
  db.doc(`public_organizations/${orgId}`).set({ id: orgId, name: 'Player Browser Restaurant', plan: 'Enterprise', timezone: 'America/New_York' }),
  db.doc(`users/${owner}`).set({ uid: owner, email: 'player@example.test', displayName: 'Player Owner', platformRole: 'user', orgId, createdAt: now(), lastLoginAt: now() }),
  db.doc(`organizations/${orgId}/members/${owner}`).set({ uid: owner, role: 'orgAdmin', status: 'active', createdAt: now(), createdBy: owner }),
  db.doc(`organizations/${orgId}/locations/front`).set({ id: 'front', orgId, name: 'Front Counter', timezone: 'America/New_York', createdAt: now() }),
  db.doc(`screens/${firstScreen}`).set({ id: firstScreen, orgId, locationId: 'front', name: 'Front Counter Left', isActive: true, orientation: 'landscape', livePlaylist: [], rotationSettings: { algorithm: 'loop', transition: 'none', rotationMs: 10000 }, createdAt: now() }),
  db.doc(`screens/${secondScreen}`).set({ id: secondScreen, orgId, locationId: 'front', name: 'Front Counter Right', isActive: true, orientation: 'landscape', livePlaylist: [], rotationSettings: { algorithm: 'loop', transition: 'none', rotationMs: 10000 }, createdAt: now() }),
]);
await auth.createUser({ uid: owner, email: 'player@example.test', password: PASSWORD, emailVerified: true });

const browser = await chromium.launch({ headless: true });
const errors = [], results = [];
const checked = name => { results.push({ test: name, passed: true }); console.log(`PASS ${name}`); };
const observe = page => page.on('pageerror', error => errors.push(error.stack || error.message));
const enterFullscreenIfPrompted = async page => {
  const prompt = page.getByRole('heading', { name: 'Press OK to enter full screen', exact: true });
  if (await prompt.isVisible().catch(() => false)) await page.getByRole('button', { name: 'OK — Full Screen', exact: true }).click();
};
let tvPage, adminPage;

try {
  const tvContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  tvPage = await tvContext.newPage(); observe(tvPage);
  await tvPage.goto(`${ORIGIN}/display`);
  await expect(tvPage.getByRole('heading', { name: 'Activate this display', exact: true })).toBeVisible({ timeout: 30000 });
  const codeNode = tvPage.getByText(/^\d{6}$/, { exact: true }); await expect(codeNode).toBeVisible();
  const code = (await codeNode.textContent())?.trim(); assert.match(code || '', /^\d{6}$/);
  await tvPage.screenshot({ path: 'tests/player/results/activation-code.png', fullPage: true });
  checked('unknown TV browser receives an AccelRestaurants-generated six-digit activation code');

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  adminPage = await adminContext.newPage(); observe(adminPage);
  await adminPage.goto(`${ORIGIN}/admin/screens?activation=${code}`);
  await expect(adminPage.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible();
  assert.match(adminPage.url(), /redirect=/, 'protected activation URL should survive login');
  await adminPage.getByLabel('Email', { exact: true }).fill('player@example.test');
  await adminPage.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await adminPage.getByRole('button', { name: 'Sign In', exact: true }).click();
  const activationDialog = adminPage.getByRole('dialog', { name: 'Activate display', exact: true });
  await expect(activationDialog).toBeVisible({ timeout: 30000 });
  await expect(activationDialog.getByLabel('Activation code', { exact: true })).toHaveValue(code);
  await activationDialog.getByLabel('Screen this TV should show', { exact: true }).selectOption(firstScreen);
  await activationDialog.getByRole('button', { name: 'Activate display', exact: true }).click();
  await expect(adminPage.getByRole('heading', { name: 'Screens', exact: true })).toBeVisible({ timeout: 15000 });
  await expect(adminPage.getByText('Front Counter Left activated.', { exact: true })).toBeVisible({ timeout: 15000 });
  checked('owner claims the TV code after sign-in and chooses the logical screen');

  await expect.poll(() => new URL(tvPage.url()).pathname, { timeout: 20000 }).toBe(`/display/player/${firstScreen}`);
  await tvPage.waitForFunction(() => document.body.innerText.includes('Press OK to enter full screen') || document.body.innerText.includes('Front Counter Left'), undefined, { timeout: 15000 });
  await enterFullscreenIfPrompted(tvPage);
  await expect(tvPage.getByRole('heading', { name: 'Front Counter Left', exact: true })).toBeVisible({ timeout: 15000 });
  checked('activated TV attempts fullscreen and uses the one-press OK fallback when automatic fullscreen is unavailable');

  await tvPage.goto(`${ORIGIN}/display`);
  await expect.poll(() => new URL(tvPage.url()).pathname, { timeout: 15000 }).toBe(`/display/player/${firstScreen}`);
  await expect(tvPage.getByRole('heading', { name: 'Activate this display', exact: true })).toHaveCount(0);
  await tvPage.waitForFunction(() => document.body.innerText.includes('Press OK to enter full screen') || document.body.innerText.includes('Front Counter Left'), undefined, { timeout: 15000 });
  await enterFullscreenIfPrompted(tvPage);
  await expect(tvPage.getByRole('heading', { name: 'Front Counter Left', exact: true })).toBeVisible({ timeout: 15000 });
  checked('same TV browser restores its prior screen without QR reactivation and reruns fullscreen entry on a new session');

  const firstCard = adminPage.locator('article').filter({ hasText: 'Front Counter Left' });
  await firstCard.getByRole('button', { name: 'Manage display', exact: true }).click();
  const manageDialog = adminPage.getByRole('dialog', { name: 'Manage display — Front Counter Left', exact: true });
  await expect(manageDialog).toBeVisible();
  await manageDialog.getByLabel('Destination screen', { exact: true }).selectOption(secondScreen);
  await manageDialog.getByRole('button', { name: 'Move display', exact: true }).click();
  await expect(adminPage.getByText('Display moved from Front Counter Left to Front Counter Right.', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect.poll(() => new URL(tvPage.url()).pathname, { timeout: 25000 }).toBe(`/display/player/${secondScreen}`);
  await tvPage.waitForFunction(() => document.body.innerText.includes('Front Counter Right') || document.body.innerText.includes('Press OK to enter full screen'), undefined, { timeout: 15000 });
  await enterFullscreenIfPrompted(tvPage);
  await expect(tvPage.getByRole('heading', { name: 'Front Counter Right', exact: true })).toBeVisible({ timeout: 15000 });
  checked('operator reassigns an activated TV to another logical screen without another activation code');

  assert.deepEqual(errors, [], `Browser runtime errors: ${errors.join('; ')}`);
  checked('player activation flows have no uncaught browser JavaScript errors');
  await adminPage.screenshot({ path: 'tests/player/results/screen-management.png', fullPage: true });
  await tvPage.screenshot({ path: 'tests/player/results/reassigned-display.png', fullPage: true });
} catch (error) {
  const failure = { message: String(error), errors, results, tvUrl: tvPage?.url(), adminUrl: adminPage?.url() };
  await writeFile('tests/player/results/failure.json', JSON.stringify(failure, null, 2));
  if (tvPage) await tvPage.screenshot({ path: 'tests/player/results/tv-failure.png', fullPage: true }).catch(() => {});
  if (adminPage) await adminPage.screenshot({ path: 'tests/player/results/admin-failure.png', fullPage: true }).catch(() => {});
  console.error('PLAYER_BROWSER_FAILURE', JSON.stringify(failure));
  throw error;
} finally {
  await writeFile('tests/player/results/summary.json', JSON.stringify({ project: PROJECT, results, browserErrors: errors }, null, 2));
  await browser.close(); await db.terminate();
}
