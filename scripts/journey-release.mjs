import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const billingFunctions = ['getSubscriptionPlans', 'createStripeCheckoutSession', 'createStripePortalSession', 'stripeWebhook'];
export const digest = content => createHash('sha256').update(content).digest('hex');
export async function expectedRelease() {
  const files = ['functions/src/index.ts', 'functions/src/journey/billing.ts', 'functions/src/journey/catalog.ts', 'functions/package.json', 'functions/package-lock.json', 'functions/tsconfig.json'];
  const parts = await Promise.all(files.map(async name => name + '\n' + await readFile(path.join(root, name), 'utf8')));
  return { contractVersion: 2, functionsHash: digest(parts.join('\n')), storageRulesHash: digest(await readFile(path.join(root, 'storage.rules'), 'utf8')) };
}
export function assessRelease(expected, observed) {
  const problems = [];
  const handlerCompatibility = {};
  for (const name of billingFunctions) {
    handlerCompatibility[name] = matchesContract(expected, observed.functions?.[name]);
    if (!handlerCompatibility[name]) problems.push(`${name}: deployed billing code does not match this build`);
  }
  if (observed.storageRulesHash !== expected.storageRulesHash) problems.push('Storage: deployed rules have not been verified against this build');
  if (observed.catalogueReady !== true) problems.push('Plans: a valid server catalogue has not been confirmed');
  const backendCompatible = problems.length === 0;
  // Read-only health checks cannot attest to payment completion or media upload.
  // Keep the release closed until the real test-environment suites provide those
  // observations. Do not accept an environment flag or hand-written success file.
  problems.push('Stripe: real TEST checkout and signed webhook lifecycle has not been verified');
  problems.push('Homepage video: real TEST Storage upload and playback has not been verified');
  return { compatible: false, backendCompatible, handlerCompatibility, storageRulesCompatible: observed.storageRulesHash === expected.storageRulesHash, catalogueReady: observed.catalogueReady === true, problems, stripeLifecycleVerified: false, homepageVideoUploadVerified: false };
}
function matchesContract(expected, actual) {
  return actual?.contractVersion === expected.contractVersion && actual?.functionsHash === expected.functionsHash;
}
export function validPublicPlans(plans) {
  const names = ['Free', 'Basic', 'Growth', 'Enterprise', 'Franchise'];
  return Array.isArray(plans) && plans.length === names.length && names.every(name => {
    const matches = plans.filter(plan => plan?.name === name);
    if (matches.length !== 1) return false;
    const plan = matches[0];
    return plan.id === name && typeof plan.price === 'number' && Number.isFinite(plan.price) && plan.price >= 0 &&
      (name !== 'Free' || plan.price === 0) && plan.currency === 'USD' && plan.interval === 'month' &&
      Array.isArray(plan.features) && plan.features.every(feature => typeof feature === 'string');
  });
}
async function observeRemote(projectId, bucket, expected) {
  if (!/^[a-z][a-z0-9-]{4,62}$/.test(projectId || '')) throw new Error('Set FIREBASE_PROJECT_ID to the reviewed project.');
  const base = `https://us-central1-${projectId}.cloudfunctions.net`;
  const observed = { functions: {}, catalogueReady: false, storageRulesHash: null };
  for (const name of billingFunctions) {
    try {
      const webhook = name === 'stripeWebhook';
      const response = await fetch(`${base}/${name}${webhook ? '?journeyHealth=2' : ''}`, webhook ? { signal: AbortSignal.timeout(15000) } : {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { journeyHealth: 2 } }), signal: AbortSignal.timeout(15000),
      });
      if (response.ok) { const body = await response.json(); observed.functions[name] = webhook ? body.journeyRelease : body.result?.journeyRelease; }
    } catch { /* An unreachable or old endpoint is unverified, never success. */ }
  }
  try {
    const response = await fetch(`${base}/getSubscriptionPlans`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: {} }), signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    // Only the matching reviewed handler proves that the authoritative document
    // passed validateBillingCatalogue; an old endpoint returning names cannot.
    observed.catalogueReady = response.ok && matchesContract(expected, observed.functions.getSubscriptionPlans) && validPublicPlans(body.result);
  } catch { /* Kept false. */ }
  // Read management metadata only. This check never publishes rules or writes a customer object.
  if (process.env.FIREBASE_SERVICE_ACCOUNT && bucket && /^[a-z0-9.-]+$/.test(bucket)) {
    try {
      const requireFunctions = createRequire(path.join(root, 'functions/package.json'));
      const { GoogleAuth } = requireFunctions('google-auth-library');
      const auth = new GoogleAuth({ credentials: JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT), scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
      const client = await auth.getClient();
      const release = await client.request({ url: `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/firebase.storage/${bucket}`, timeout: 15000 });
      const name = release.data.rulesetName;
      if (typeof name !== 'string' || !name.startsWith(`projects/${projectId}/rulesets/`)) throw new Error('Unexpected ruleset');
      const ruleset = await client.request({ url: `https://firebaserules.googleapis.com/v1/${name}`, timeout: 15000 });
      const files = ruleset.data.source?.files;
      if (Array.isArray(files) && files.length === 1 && typeof files[0].content === 'string') observed.storageRulesHash = digest(files[0].content);
    } catch { /* Unverified rules block a release, but not a clearly labeled Hosting-only preview. */ }
  }
  return observed;
}
async function main() {
  const expected = await expectedRelease();
  if (process.argv.includes('--write-manifest')) {
    await writeFile(path.join(root, 'functions/src/journey/release.generated.ts'), '// Generated by scripts/journey-release.mjs; public code fingerprints, never credentials.\nexport const journeyRelease = ' + JSON.stringify(expected, null, 2) + ' as const;\n');
    return;
  }
  const preview = process.argv.includes('--preview');
  if (!preview && !process.argv.includes('--release')) throw new Error('Use --preview or --release.');
  const observed = await observeRemote(process.env.FIREBASE_PROJECT_ID, process.env.VITE_FIREBASE_STORAGE_BUCKET, expected);
  const assessment = assessRelease(expected, observed);
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const report = { mode: preview ? 'hosting-preview' : 'release-preflight', checkedAt: new Date().toISOString(), revision, triggeringRevision: process.env.GITHUB_SHA || null, projectId: process.env.FIREBASE_PROJECT_ID, storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || null, expected, observed, ...assessment };
  await mkdir(path.join(root, 'test-results'), { recursive: true });
  await writeFile(path.join(root, 'test-results/journey-release.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFile } = await import('node:fs/promises');
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n## Customer journey deployment boundary\n${assessment.backendCompatible ? 'Backend and Storage versions match this build; end-to-end release verification remains incomplete.' : 'Backend-dependent flows are NOT verified.'}\n${assessment.problems.map(problem => '- ' + problem).join('\n')}\n`);
  }
  if (!assessment.compatible && !preview) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
