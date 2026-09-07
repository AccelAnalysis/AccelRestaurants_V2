import { readFileSync, writeFileSync } from 'node:fs';
const read = path => readFileSync(path, 'utf8');
const write = (path, value) => writeFileSync(path, value);
function patch(path, before, after) {
  const source = read(path);
  if (!source.includes(before)) throw new Error(`Missing inspected source anchor in ${path}: ${before.slice(0, 90)}`);
  write(path, source.replace(before, after));
}
patch('src/pages/PlayerScreen.tsx', '      try {\n        if (!auth.currentUser) {', '      try {\n        // Persistence hydrates asynchronously. Never replace an existing authorized\n        // identity just because currentUser is temporarily null during startup.\n        await auth.authStateReady();\n        if (cancelled) return;\n        if (!auth.currentUser) {');
const dashboard = 'src/components/organisms/MeasurementDashboard.tsx';
patch(dashboard, 'useMemo, useState', 'useMemo, useRef, useState');
patch(dashboard, "  const [report, setReport] = useState<MeasurementReport | null>(null);", "  const reportKey = useRef('');\n  const [report, setReport] = useState<MeasurementReport | null>(null);");
patch(dashboard, "    setReport(null); setError('');", "    const nextKey = JSON.stringify([organization.id, from, to, campaignId, mode]);\n    if (reportKey.current !== nextKey) { setReport(null); reportKey.current = nextKey; }\n    setError('');");
patch('functions/src/measurement/engine.ts', '      if (!eventSnap.exists || receipt.exists) return;', '      if (!eventSnap.exists || receipt.exists || eventSnap.data()?.projectedAt) return;');
patch('tests/measurement/browser.mjs', "  checked('actual player records qualifying QR rendering and replays IndexedDB telemetry after offline recovery');", "  checked('actual player records qualifying QR rendering and replays IndexedDB telemetry after offline recovery');\n  await page.reload();\n  await page.waitForSelector('[data-measurement-placement]', { timeout: 30000 });\n  checked('authorized player identity and canonical QR survive a full reload');");
const integration = 'functions/src/measurement/engine.integration.test.ts';
patch(integration, "  test('public Firestore REST cannot forge or read any measurement collection',", `  test('replacing a physical device immediately invalidates old measurement sessions', async () => {
    const { e, session } = await prepare();
    const pair = await e.requestPairing('playerB', 'screenA');
    await e.approvePairing('ownerA', { orgId: 'orgA', code: pair.code });
    await expect(e.checkedSession('playerA', session.sessionId)).rejects.toThrow('replaced');
    expect((await e.openSession('playerB', 'screenA', 'live')).mode).toBe('live');
  });

  test('external-only scans do not become unobserved first-party non-conversions', async () => {
    const { e, placementId } = await prepare('external');
    expect(await e.scan(await e.placement(placementId))).toBe('https://restaurant.example/menu');
    await projectAll(e);
    const summary = await report();
    expect(summary.totals.scans).toBe(1);
    expect(summary.totals.cohortScans || 0).toBe(0);
    expect((await db!.collection('measurement_guests').get()).size).toBe(0);
  });

  test('projected event status still prevents duplicate increments after receipt cleanup', async () => {
    const { e, placementId } = await prepare('external');
    await e.scan(await e.placement(placementId)); await projectAll(e);
    for (const receipt of (await db!.collection('measurement_receipts').get()).docs) await receipt.ref.delete();
    await projectAll(e);
    expect((await report()).totals.scans).toBe(1);
  });

  test('public Firestore REST cannot forge or read any measurement collection',`);
console.log('Player auth restoration, stable setup refresh, and projection retention safeguards integrated.');
