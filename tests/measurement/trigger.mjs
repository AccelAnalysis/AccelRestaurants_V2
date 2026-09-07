import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const requireFunctions = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = requireFunctions('firebase-admin/app');
const { getFirestore } = requireFunctions('firebase-admin/firestore');
const projectId = 'demo-accel-measurement';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || process.env.GCLOUD_PROJECT !== projectId) throw new Error('Automatic projection tests require the loopback demo emulator.');
const app = initializeApp({ projectId }, 'measurement-trigger-verification');
const db = getFirestore(app);
const orgId = 'measurementBrowserOrg';
try {
  const placements = await db.collection('campaign_placements').where('orgId', '==', orgId).get();
  const selected = placements.docs.find(doc => doc.data().mode === 'live' && doc.data().kind === 'offer');
  assert.ok(selected, 'The browser suite must create a real measured offer placement first.');
  const campaignId = selected.data().campaignId;
  const countScans = async () => {
    const aggregates = await db.collection('measurement_daily').where('orgId', '==', orgId).where('scope', '==', 'campaign').where('mode', '==', 'live').where('campaignId', '==', campaignId).get();
    return aggregates.docs.reduce((sum, doc) => sum + (doc.data().counts?.scans || 0), 0);
  };
  const before = await countScans();
  const response = await fetch(`http://127.0.0.1:5000/r/${selected.id}`, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' } });
  assert.equal(response.status, 302);
  let after = before;
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    after = await countScans();
    if (after === before + 1) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  // Do NOT call MeasurementEngine.project: this check must exercise the actual exported Firestore trigger.
  assert.equal(after, before + 1, 'A real redirect must increment aggregates through aggregateMeasurementEvent automatically.');
  const evidence = { projectId, test: 'automatic HTTP redirect → raw event → exported Firestore trigger → campaign aggregate', passed: true, previousScans: before, currentScans: after };
  await writeFile('tests/measurement/results/automatic-trigger.json', JSON.stringify(evidence, null, 2));
  console.log('PASS automatic exported Firestore trigger projects real HTTP QR scans without a manual reducer call');
} finally {
  await db.terminate(); await deleteApp(app);
}
