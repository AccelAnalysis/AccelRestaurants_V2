const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID',
  'VITE_FINNHUB_API_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
];

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  console.error(`Missing required Vite environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const target = process.env.DEPLOY_TARGET?.trim() || 'local';
const viteProjectId = process.env.VITE_FIREBASE_PROJECT_ID.trim();
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID?.trim();
const productionProjectId = 'accelrestaurant-d2c1f';

if (firebaseProjectId && firebaseProjectId !== viteProjectId) {
  console.error(
    `Firebase deploy project (${firebaseProjectId}) does not match Vite Firebase project (${viteProjectId}).`,
  );
  process.exit(1);
}

if (target === 'staging' && viteProjectId !== productionProjectId) {
  console.error(
    `Refusing PR preview because VITE_FIREBASE_PROJECT_ID is not ${productionProjectId}.`,
  );
  process.exit(1);
}

if (target === 'production' && viteProjectId !== productionProjectId) {
  console.error(
    `Refusing production deployment because VITE_FIREBASE_PROJECT_ID is not ${productionProjectId}.`,
  );
  process.exit(1);
}

console.log(`Vite/Firebase environment validation passed for ${target}.`);
