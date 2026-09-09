import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('../../scripts/validate-vite-env.mjs', import.meta.url));
const env = {
  DEPLOY_TARGET: 'staging', FIREBASE_PROJECT_ID: 'demo-accel-journey',
  VITE_FIREBASE_PROJECT_ID: 'demo-accel-journey', VITE_FIREBASE_API_KEY: 'unused',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo-accel-journey.firebaseapp.com',
  VITE_FIREBASE_STORAGE_BUCKET: 'demo-accel-journey.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000', VITE_FIREBASE_APP_ID: 'unused',
  VITE_FIREBASE_MEASUREMENT_ID: 'unused', VITE_FINNHUB_API_KEY: 'unused',
  VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_unused',
};
const validate = changes => spawnSync(process.execPath, [script], { env: { ...env, ...changes }, encoding: 'utf8' });
test('TEST preview requires matching non-production Firebase and Stripe test configuration', () => {
  assert.equal(validate({}).status, 0);
  assert.equal(validate({ FIREBASE_PROJECT_ID: 'accelrestaurant-d2c1f', VITE_FIREBASE_PROJECT_ID: 'accelrestaurant-d2c1f' }).status, 1);
  assert.equal(validate({ FIREBASE_PROJECT_ID: 'demo-other-project' }).status, 1);
  assert.equal(validate({ VITE_STRIPE_PUBLISHABLE_KEY: 'pk_live_unused' }).status, 1);
});
test('the production target remains explicitly bound to its existing project', () => {
  assert.equal(validate({ DEPLOY_TARGET: 'production' }).status, 1);
  assert.equal(validate({ DEPLOY_TARGET: 'production', FIREBASE_PROJECT_ID: 'accelrestaurant-d2c1f', VITE_FIREBASE_PROJECT_ID: 'accelrestaurant-d2c1f' }).status, 0);
});
