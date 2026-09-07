import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { sourceLoader, memoryStorage, root } from './load-source.mjs';
import { expectedRelease, billingFunctions } from '../../scripts/journey-release.mjs';
const projectId = 'demo-accel-journey';
if (process.env.GCLOUD_PROJECT !== projectId || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') throw new Error('Refusing tests outside isolated loopback demo emulators.');
const requireFunctions = createRequire(new URL('../../functions/package.json', import.meta.url));
const requireClient = createRequire(new URL('../../package.json', import.meta.url));
const adminApp = requireFunctions('firebase-admin/app').initializeApp({ projectId });
const adminDB = requireFunctions('firebase-admin/firestore').getFirestore(adminApp);
const app = requireClient('firebase/app').initializeApp({ projectId, apiKey: 'demo-key', storageBucket: projectId + '.appspot.com' });
const fs = requireClient('firebase/firestore');
const authSDK = requireClient('firebase/auth');
const storageSDK = requireClient('firebase/storage');
const db = fs.getFirestore(app); fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
const auth = authSDK.getAuth(app); authSDK.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const storage = storageSDK.getStorage(app); storageSDK.connectStorageEmulator(storage, '127.0.0.1', 9199);
globalThis.localStorage = memoryStorage();
const load = sourceLoader({ [path.join(root, 'src/lib/firebase.ts')]: { db, storage }, 'firebase/firestore': fs, 'firebase/storage': storageSDK });
const { ConfigService } = load('src/services/configService.ts');
const { StorageService } = load('src/services/storageService.ts');
const { PLAN_CONFIGS } = load('src/lib/plans.ts');
const checks = [];
const pass = name => { checks.push(name); console.log('PASS ' + name); };
try {
  await adminDB.doc('system/plans').delete();
  assert.equal((await ConfigService.getPlanCatalogue()).source, 'bundled');
  assert.equal((await adminDB.doc('system/plans').get()).exists, false);
  pass('actual ConfigService and SDK render bootstrap on missing Firestore document without initializing it');
  await adminDB.doc('system/plans').set({ configs: { ...PLAN_CONFIGS, Basic: { ...PLAN_CONFIGS.Basic, price: 47 } } });
  assert.equal((await ConfigService.getPlanCatalogue()).configs.Basic.price, 47);
  await adminDB.doc('system/plans').set({ configs: { Basic: { price: -10 } } });
  assert.equal((await ConfigService.getPlanCatalogue()).source, 'cached');
  assert.equal((await ConfigService.getPlanConfigs()).Basic.price, 47);
  pass('real remote read and validation preserve the most recent price through invalid data');
  await assert.rejects(ConfigService.savePlanConfigs(PLAN_CONFIGS));
  pass('signed-out public clients cannot overwrite the plan catalogue');
  const account = await authSDK.createUserWithEmailAndPassword(auth, 'journey-admin@example.test', 'Emulator-only-password-123');
  // Wait for the actual auth trigger before assigning the isolated test role.
  for (let i = 0; i < 80 && !(await adminDB.doc(`users/${account.user.uid}`).get()).data()?.orgId; i++) await new Promise(resolve => setTimeout(resolve, 250));
  assert.ok((await adminDB.doc(`users/${account.user.uid}`).get()).data()?.orgId, 'auth provisioning completed');
  await adminDB.doc(`users/${account.user.uid}`).update({ platformRole: 'admin' });
  await ConfigService.savePlanConfigs(PLAN_CONFIGS);
  assert.equal((await ConfigService.getPlanConfigs()).Basic.price, PLAN_CONFIGS.Basic.price);
  const video = new File([new Uint8Array([0,0,0,8,102,116,121,112])], 'test.mp4', { type: 'video/mp4' });
  const progress = [];
  const url = await StorageService.uploadFile(video, 'website/marketing/', n => progress.push(n));
  assert.ok(url.includes('127.0.0.1:9199')); assert.ok(progress.includes(100));
  assert.equal((await fetch(url)).status, 200);
  pass('real StorageService upload, progress and downloadable URL under deployed emulator rules');
  await assert.rejects(StorageService.uploadFile(new File(['image'], 'image.png', { type: 'image/png' }), 'website/marketing/'));
  pass('website media format restriction is not bypassed by the general administrator path');
  await adminDB.doc(`users/${account.user.uid}`).set({ uid: account.user.uid, platformRole: 'user' });
  // Even an organization named website cannot acquire website-media write access.
  await adminDB.doc('organizations/website').set({ ownerId: account.user.uid, members: [account.user.uid] });
  await assert.rejects(StorageService.uploadFile(video, 'website/marketing/'));
  pass('ordinary members cannot upload website media through a colliding organization path');
  await authSDK.signOut(auth);
  assert.equal((await fetch(url)).status, 200);
  const expected = await expectedRelease();
  for (const name of billingFunctions) {
    const webhook = name === 'stripeWebhook';
    const response = await fetch(`http://127.0.0.1:5001/${projectId}/us-central1/${name}${webhook ? '?journeyHealth=2' : ''}`, webhook ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { journeyHealth: 2 } }) });
    assert.equal(response.status, 200, name);
    const body = await response.json(); assert.deepEqual(webhook ? body.journeyRelease : body.result?.journeyRelease, expected, name);
  }
  pass('each actual Functions handler exposes the exact code contract without any payment or customer write');
  const unauth = await fetch(`http://127.0.0.1:5001/${projectId}/us-central1/createStripeCheckoutSession`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { planName: 'Basic', screens: 1, seats: 1 } }) });
  assert.equal(unauth.status, 401);
  const badSignature = await fetch(`http://127.0.0.1:5001/${projectId}/us-central1/stripeWebhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.ok(badSignature.status >= 400);
  pass('health probes do not bypass purchase authentication or webhook validation');
} finally {
  await mkdir('test-results', { recursive: true });
  await writeFile('test-results/journey-emulator.json', JSON.stringify({ checks, projectId, stripeLifecycleVerified: false }, null, 2));
  await fs.terminate(db); await requireClient('firebase/app').deleteApp(app); await requireFunctions('firebase-admin/app').deleteApp(adminApp);
}
