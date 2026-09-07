// One-shot exact-source integration. The branch-only runner removes this script after committing its changes.
import { readFileSync, writeFileSync } from 'node:fs';
const read = path => readFileSync(path, 'utf8');
const write = (path, value) => writeFileSync(path, value);
function patch(path, before, after) {
  const source = read(path);
  if (!source.includes(before)) throw new Error(`Missing inspected source anchor in ${path}: ${before.slice(0, 90)}`);
  write(path, source.replace(before, after));
}
function json(path, edit) { const value = JSON.parse(read(path)); edit(value); write(path, JSON.stringify(value, null, 2) + '\n'); }

const browser = 'tests/measurement/browser.mjs';
patch(browser, "await guestPage.getByRole('radio', { name: '0 — How likely are you to recommend us?', exact: true }).check();", "await guestPage.getByRole('radio', { name: '0 — How likely are you to recommend us?', exact: true }).locator('..').click();\n  await expect(guestPage.getByRole('radio', { name: '0 — How likely are you to recommend us?', exact: true })).toBeChecked();");
patch(browser, "await guestPage.getByRole('radio', { name: '5 — How satisfied were you?', exact: true }).check();", "await guestPage.getByRole('radio', { name: '5 — How satisfied were you?', exact: true }).locator('..').click();\n  await expect(guestPage.getByRole('radio', { name: '5 — How satisfied were you?', exact: true })).toBeChecked();");

// Current Admin SDK exposes these helpers through the modular Firestore entry point.
// Namespace function static properties were undefined in the real Functions emulator.
patch('functions/src/index.ts', "import * as admin from 'firebase-admin';", "import * as admin from 'firebase-admin';\nimport { Timestamp, FieldValue } from 'firebase-admin/firestore';");
write('functions/src/index.ts', read('functions/src/index.ts').replaceAll('admin.firestore.Timestamp', 'Timestamp').replaceAll('admin.firestore.FieldValue', 'FieldValue'));

// Keep tested and deployed runtimes aligned. No dependency versions are changed.
json('functions/package.json', p => { p.engines.node = '22'; });
json('functions/package-lock.json', p => { p.packages[''].engines.node = '22'; });
json('firebase.json', p => { p.functions.runtime = 'nodejs22'; });
for (const path of ['.github/workflows/ci-preview.yml', '.github/workflows/deploy-production.yml']) write(path, read(path).replaceAll("node-version: '20'", "node-version: '22'"));

// Keep the Recharts barrel and its implementation in one module chunk.
patch('vite.config.ts', '  optimizeDeps: {', "  build: {\n    rollupOptions: {\n      output: {\n        manualChunks(id) { if (id.includes('/node_modules/recharts/')) return 'charts'; }\n      }\n    }\n  },\n  optimizeDeps: {");

// A paired replacement device supersedes older credentials for the same physical screen.
const engine = 'functions/src/measurement/engine.ts';
patch(engine, 'await this.rate(`pair-request:${uid}`, 10, 15 * MINUTE);', 'await this.rate(`pair-request:${uid}`, 30, 15 * MINUTE);');
patch(engine, '      tx.delete(pairRef); tx.delete', "      tx.set(this.db.doc(`measurement_screen_devices/${p!.screenId}`), { orgId, deviceId: sessionKey(p!.uid, p!.screenId), approvedAt: this.timestamp() });\n      tx.delete(pairRef); tx.delete");
patch(engine, "    const device = await this.db.doc(`measurement_devices/${deviceId}`).get();\n    if (!device.exists)", "    const device = await this.db.doc(`measurement_devices/${deviceId}`).get();\n    const activeDevice = await this.db.doc(`measurement_screen_devices/${screenId}`).get();\n    if (device.exists) requireValue(activeDevice.data()?.deviceId === deviceId && activeDevice.data()?.orgId === orgId, 'This player was replaced by another authorized device.', 'permission-denied');\n    if (!device.exists)");
patch(engine, "      requireValue(device.exists && device.data()!.orgId === s!.orgId && !device.data()!.revoked, 'Device authorization was revoked.', 'permission-denied');", "      const active = await this.db.doc(`measurement_screen_devices/${s!.screenId}`).get();\n      requireValue(device.exists && device.data()!.orgId === s!.orgId && !device.data()!.revoked && active.data()?.deviceId === s!.deviceId && active.data()?.orgId === s!.orgId, 'Device authorization was revoked or replaced.', 'permission-denied');");
patch('firestore.rules', '    match /measurement_devices/{document=**}', '    match /measurement_screen_devices/{document=**} { allow read, write: if false; }\n    match /measurement_devices/{document=**}');
patch(browser, "const session = await engine.openSession(owner, screenId, 'live');", "await db.doc(`measurement_screen_devices/${screenId}`).set({ orgId, deviceId: hash(owner, screenId) });\nconst session = await engine.openSession(owner, screenId, 'live');");

// Release repaired existing player dependencies alongside the new subsystem, not unrelated billing functions.
patch('.github/workflows/deploy-measurement-backend.yml', 'functions:reconcileMeasurementEvents,firestore:rules', 'functions:reconcileMeasurementEvents,functions:syncPublicOrgConfig,functions:createScreenSession,functions:sendHeartbeat,firestore:rules');

console.log('Runtime and measurement corrections integrated; production Firebase was not contacted.');
