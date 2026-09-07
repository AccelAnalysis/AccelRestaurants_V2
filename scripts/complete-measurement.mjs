import { readFileSync, writeFileSync } from 'node:fs';
const read = path => readFileSync(path, 'utf8');
const write = (path, value) => writeFileSync(path, value);
function patch(path, before, after) {
  const source = read(path);
  if (!source.includes(before)) throw new Error(`Missing inspected source anchor in ${path}: ${before.slice(0, 90)}`);
  write(path, source.replace(before, after));
}
patch('functions/src/measurement/engine.ts', 'const asMillis = (value: unknown): number => value instanceof Timestamp ? value.toMillis() : 0;', `// Match the browser SDK's fractional milliseconds: Admin Timestamp.toMillis() floors them.
// Server-generated update timestamps can contain microseconds; truncation would reject real revisions.
const asMillis = (value: unknown): number => value instanceof Timestamp ? value.seconds * 1000 + value.nanoseconds / 1e6 : 0;`);
patch('functions/src/measurement/engine.integration.test.ts', "  test('public Firestore REST cannot forge or read any measurement collection',", `  test('server-authored microsecond timestamps match the browser revision representation', async () => {
    const { e, session } = await prepare();
    const updatedAt = new Timestamp(Math.floor(now / 1000), 123456000);
    await db!.doc('slides/slideA').update({ updatedAt });
    const browserMilliseconds = updatedAt.seconds * 1000 + updatedAt.nanoseconds / 1e6;
    expect(browserMilliseconds).not.toBe(updatedAt.toMillis());
    const manifest = await e.manifest('playerA', { sessionId: session.sessionId, slideVersions: { slideA: browserMilliseconds } });
    expect(manifest.placements).toHaveLength(1);
    expect(manifest.placements[0].slideVersion).toBe(browserMilliseconds);
  });

  test('public Firestore REST cannot forge or read any measurement collection',`);
const dashboard = 'src/components/organisms/MeasurementDashboard.tsx';
patch(dashboard, 'function localToday(timezone: string) {', "function durationLabel(ms: number) { return ms < 60000 ? `${value(ms / 1000)} sec` : ms < 3600000 ? `${value(ms / 60000)} min` : `${value(ms / 3600000)} hr`; }\nfunction localToday(timezone: string) {");
patch(dashboard, '`${value((totals.visibleMs || 0) / 3_600_000)} recorded placement-hours`', '`${durationLabel(totals.visibleMs || 0)} of recorded placement time`');
const browser = 'tests/measurement/browser.mjs';
patch(browser, "page.getByText('Guest feedback test', { exact: true }).first()", "page.getByRole('link', { name: 'Guest feedback test', exact: true })");
patch(browser, "  await page.screenshot({ path: 'tests/measurement/results/overview.png', fullPage: true });", "  await page.screenshot({ path: 'tests/measurement/results/overview.png', fullPage: true });\n  await page.getByRole('link', { name: 'Guest feedback test', exact: true }).click();\n  await expect(page.getByRole('heading', { name: 'Guest feedback test', exact: true })).toBeVisible();\n  await expect(page.getByText('Location comparison — recorded activity, not a causal ranking', { exact: true })).toBeVisible();\n  await page.screenshot({ path: 'tests/measurement/results/campaign-detail.png', fullPage: true });");
patch(browser, "  checked('production-built aggregate dashboard, feedback, location comparison and campaign setup routes render');", `  checked('production-built overview, campaign detail, feedback, location comparison and setup routes render');
  await page.getByLabel('Campaign name', { exact: true }).fill('Counter follow-up');
  await page.getByRole('button', { name: 'Create campaign', exact: true }).click();
  await expect(page.getByText('Campaign created. Attach it to an existing QR tile below.', { exact: true })).toBeVisible();
  const campaignDocs = await db.collection('measurement_campaigns').where('orgId', '==', orgId).get();
  const created = campaignDocs.docs.find(doc => doc.data().name === 'Counter follow-up');
  assert.ok(created);
  await expect(page.getByLabel('Campaign', { exact: true })).toHaveValue(created.id);
  await page.getByLabel('Slide', { exact: true }).selectOption(slideId);
  await page.getByLabel('QR tile', { exact: true }).selectOption('feedbackQR');
  await page.getByRole('button', { name: 'Attach campaign', exact: true }).click();
  await expect(page.getByText('Campaign attached. Live players will receive the new slide revision.', { exact: true })).toBeVisible();
  assert.equal((await db.doc('slides/' + slideId).get()).data().elements[0].properties.measurementCampaignId, created.id);
  checked('operator creates and attaches a measured survey through the real UI without losing setup state on refresh');`);
patch('tests/measurement/README.md', ': 15 real Firestore emulator tests', ': 16 real Firestore emulator tests');
console.log('Fractional timestamps, accurate short-duration labels, and complete operator/browser assertions integrated.');
