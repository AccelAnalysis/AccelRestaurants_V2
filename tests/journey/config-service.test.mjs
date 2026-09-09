import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { sourceLoader, memoryStorage, root } from './load-source.mjs';
function setup(projectId = 'demo-plan-a', store = memoryStorage()) {
  globalThis.localStorage = store;
  let value; let failure = false; let writes = 0; let reads = 0;
  const loader = sourceLoader({
    [path.join(root, 'src/lib/firebase.ts')]: { db: { app: { options: { projectId } } } },
    'firebase/firestore': { doc: (_db, ...parts) => parts.join('/'), Timestamp: class Timestamp {}, serverTimestamp: () => 'time',
      getDocFromServer: async () => { reads++; if (failure) throw new Error('permission-denied'); return { exists: () => value !== undefined, data: () => ({ configs: value }) }; },
      setDoc: async () => { if (failure) throw new Error('permission-denied'); writes++; },
    },
  });
  const { PLAN_CONFIGS } = loader('src/lib/plans.ts');
  return { service: loader('src/services/configService.ts').ConfigService, defaults: PLAN_CONFIGS, store,
    remote: next => { value = next; }, fail: next => { failure = next; }, reads: () => reads, writes: () => writes };
}
test('actual ConfigService: live -> saved -> bootstrap, no public initialization writes', async () => {
  const f = setup();
  assert.equal((await f.service.getPlanCatalogue()).source, 'bundled');
  f.remote({ ...f.defaults, Basic: { ...f.defaults.Basic, price: 37 } });
  assert.equal((await f.service.getPlanCatalogue()).configs.Basic.price, 37);
  f.fail(true);
  const saved = await f.service.getPlanCatalogue();
  assert.equal(saved.source, 'cached'); assert.equal(saved.configs.Basic.price, 37); assert.equal(f.writes(), 0);
  const reload = setup('demo-plan-a', f.store); reload.fail(true);
  assert.equal((await reload.service.getPlanCatalogue()).configs.Basic.price, 37);
  const otherProject = setup('demo-plan-b', f.store); otherProject.fail(true);
  assert.equal((await otherProject.service.getPlanCatalogue()).source, 'bundled');
});
test('malformed remote data never replaces the last validated catalogue', async () => {
  const f = setup(); f.remote({ ...f.defaults, Basic: { ...f.defaults.Basic, price: 41 } }); await f.service.getPlanConfigs();
  f.remote({ ...f.defaults, Basic: { ...f.defaults.Basic, price: -1 } });
  assert.equal((await f.service.getPlanConfigs()).Basic.price, 41);
});
test('corrupt, future, expired and cross-version caches are not trusted', async () => {
  for (const value of ['{bad json', { version: 1, savedAt: Date.now() + 60000, configs: {} }, { version: 1, savedAt: Date.now() - 8 * 86400000, configs: {} }, { version: 7, savedAt: Date.now(), configs: {} }]) {
    const f = setup(); f.store.setItem('accel:public-plans:v1:demo-plan-a', typeof value === 'string' ? value : JSON.stringify(value)); f.fail(true);
    assert.equal((await f.service.getPlanCatalogue()).source, 'bundled');
  }
});
test('disabled browser storage still allows live reads and memory fallback', async () => {
  const f = setup('demo-plan-a', { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } });
  f.remote(f.defaults); assert.equal((await f.service.getPlanCatalogue()).source, 'live');
  f.fail(true); assert.equal((await f.service.getPlanCatalogue()).source, 'cached');
});
test('concurrent consumers share a single read; failed saves never replace confirmed cache', async () => {
  const f = setup(); f.remote(f.defaults);
  await Promise.all([f.service.getPlanConfigs(), f.service.getPlanConfigs(), f.service.getPlanCatalogue()]);
  assert.equal(f.reads(), 1);
  f.fail(true); await assert.rejects(f.service.savePlanConfigs({ ...f.defaults, Basic: { ...f.defaults.Basic, price: 99 } }));
  assert.equal((await f.service.getPlanConfigs()).Basic.price, 29);
});
test('actual effective limits include purchases, caps, unlimited and explicit overrides', () => {
  const { getEffectivePlanLimits } = sourceLoader()('src/lib/plans.ts');
  assert.deepEqual(getEffectivePlanLimits({ plan: 'Growth', purchasedScreens: 3, purchasedSeats: 2 }), { screens: 10, seats: 4 });
  assert.equal(getEffectivePlanLimits({ plan: 'Growth', purchasedScreens: 100 }).screens, 25);
  assert.deepEqual(getEffectivePlanLimits({ plan: 'Franchise', purchasedScreens: 2 }), { screens: -1, seats: -1 });
  assert.deepEqual(getEffectivePlanLimits({ plan: 'Basic', customLimits: { screens: 9, seats: 0 } }), { screens: 9, seats: 0 });
});
