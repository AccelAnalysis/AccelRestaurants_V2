import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { MeasurementEngine } from './engine';
import { DAY, MINUTE, hash, type Question } from './core';

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const suite = emulator ? describe : describe.skip;
const PROJECT = 'demo-accel-measurement';
const questions: Question[] = [
  { id: 'nps', label: 'Recommend us?', type: 'nps', required: true },
  { id: 'csat', label: 'Satisfied?', type: 'csat', required: true },
];

suite('first-party measurement Firestore integration (emulator only)', () => {
  if (emulator && !/^(127\.0\.0\.1|localhost):\d+$/.test(emulator)) throw new Error('Tests require a loopback Firestore emulator.');
  const app = emulator ? initializeApp({ projectId: PROJECT }, 'measurement-tests') : null;
  const db = app ? getFirestore(app) : null;
  let now = Date.parse('2026-09-07T12:00:00Z');
  const service = () => new MeasurementEngine(db!, 'https://measure.example', () => now);
  beforeEach(async () => {
    now = Date.parse('2026-09-07T12:00:00Z');
    const response = await fetch(`http://${emulator}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Could not reset demo emulator.');
    await Promise.all([
      db!.doc('organizations/orgA').set({ ownerId: 'ownerA', name: 'Restaurant A' }),
      db!.doc('organizations/orgB').set({ ownerId: 'ownerB', name: 'Restaurant B' }),
      db!.doc('organizations/orgA/members/localA').set({ status: 'active', role: 'locationUser', locationIds: ['locA'] }),
      db!.doc('organizations/orgA/members/inactive').set({ status: 'deactivated', role: 'orgAdmin' }),
      db!.doc('organizations/orgA/locations/locA').set({ name: 'Counter', timezone: 'America/New_York' }),
      db!.doc('organizations/orgA/locations/locB').set({ name: 'Patio', timezone: 'America/Chicago' }),
      db!.doc('screens/screenA').set({ orgId: 'orgA', locationId: 'locA', name: 'Menu', isActive: true, livePlaylist: [{ slideId: 'slideA' }] }),
      db!.doc('slides/slideA').set({ orgId: 'orgA', name: 'Guest feedback', updatedAt: Timestamp.fromMillis(now), elements: [{ id: 'qrA', type: 'qr_code', visible: true, properties: { content: 'https://restaurant.example/menu' } }] }),
    ]);
  });
  afterAll(async () => { if (db) await db.terminate(); if (app) await deleteApp(app); });

  async function prepare(kind: 'survey' | 'offer' | 'external' = 'survey') {
    const e = service();
    const { campaignId } = await e.createCampaign('ownerA', { orgId: 'orgA', requestId: `request-${kind}`, campaign: { name: 'September campaign', kind, questions, destinationUrl: 'https://restaurant.example/menu', offerCode: 'LUNCH10' } });
    await e.bindCampaign('ownerA', { orgId: 'orgA', campaignId, slideId: 'slideA', tileId: 'qrA' });
    const pair = await e.requestPairing('playerA', 'screenA');
    await e.approvePairing('ownerA', { orgId: 'orgA', code: pair.code });
    const session = await e.openSession('playerA', 'screenA', 'live');
    const manifest = await e.manifest('playerA', { sessionId: session.sessionId, slideVersions: { slideA: now } });
    expect(manifest.placements).toHaveLength(1);
    const placementId = manifest.placements[0].placementId;
    return { e, campaignId, session, placementId };
  }
  async function projectAll(e = service()) {
    const events = await db!.collection('measurement_events').get();
    for (const event of [...events.docs].reverse()) await e.project(event.id);
    for (const event of events.docs) await e.project(event.id);
  }
  async function report(uid = 'ownerA', campaignId = '') {
    return service().dashboard(uid, { orgId: 'orgA', from: '2026-09-01', to: '2026-09-30', campaignId });
  }

  test('anonymous users cannot authorize a player, mint live sessions, or read tenant reports', async () => {
    await expect(service().openSession('attacker', 'screenA', 'live')).rejects.toThrow('membership');
    await expect(service().dashboard('ownerB', { orgId: 'orgA', from: '2026-09-01', to: '2026-09-07' })).rejects.toThrow('membership');
    const pending = await service().requestPairing('playerA', 'screenA');
    await expect(service().approvePairing('ownerB', { orgId: 'orgB', code: pending.code })).rejects.toThrow('pairing code');
    await expect(service().access('inactive', 'orgA')).rejects.toThrow('membership');
    const preview = await service().openSession('ownerA', 'screenA', 'live');
    expect(preview.mode).toBe('test');
  });

  test('campaign creation is request-idempotent and binding rejects another tenant', async () => {
    const input = { orgId: 'orgA', requestId: 'create-request', campaign: { name: 'NPS', kind: 'survey', questions } };
    const first = await service().createCampaign('ownerA', input);
    const again = await service().createCampaign('ownerA', input);
    expect(again).toEqual(first); expect((await db!.collection('measurement_campaigns').get()).size).toBe(1);
    await expect(service().createCampaign('ownerA', { ...input, campaign: { ...input.campaign, name: 'Changed' } })).rejects.toThrow('already used');
    await db!.doc('slides/foreign').set({ orgId: 'orgB', elements: [{ id: 'qrA', type: 'qr_code' }] });
    await expect(service().bindCampaign('ownerA', { orgId: 'orgA', campaignId: first.campaignId, slideId: 'foreign', tileId: 'qrA' })).rejects.toThrow('organization');
  });

  test('placements are stable per revision and preserve history when a screen moves', async () => {
    const { e, session, placementId } = await prepare();
    const same = await e.manifest('playerA', { sessionId: session.sessionId, slideVersions: { slideA: now } });
    expect(same.placements[0].placementId).toBe(placementId);
    const old = (await db!.doc(`campaign_placements/${placementId}`).get()).data()!;
    await db!.doc('screens/screenA').update({ locationId: 'locB' });
    const moved = await e.manifest('playerA', { sessionId: session.sessionId, slideVersions: { slideA: now } });
    expect(moved.placements[0].placementId).not.toBe(placementId);
    expect((await db!.doc(`campaign_placements/${placementId}`).get()).data()!.locationId).toBe('locA');
    expect(old.timezone).toBe('America/New_York');
    now += MINUTE;
    await db!.doc('slides/slideA').update({ updatedAt: Timestamp.fromMillis(now), name: 'New revision' });
    const stale = await e.manifest('playerA', { sessionId: session.sessionId, slideVersions: { slideA: now - MINUTE } });
    expect(stale.placements).toHaveLength(0); expect(stale.warnings.length).toBeGreaterThan(0);
    const changed = await e.manifest('playerA', { sessionId: session.sessionId, slideVersions: { slideA: now } });
    expect(changed.placements[0].placementId).not.toBe(moved.placements[0].placementId);
  });

  test('cumulative bucket retries and reversed event delivery produce one exact total at all grains', async () => {
    const { e, session, placementId } = await prepare(); const windowStart = now; now += MINUTE;
    const base = { sessionId: session.sessionId, placementId, windowStart, plays: 2, visibleMs: 15000 };
    expect((await e.ingest('playerA', { buckets: [base] })).rejected).toEqual([]);
    await e.ingest('playerA', { buckets: [base, { ...base, plays: 3, visibleMs: 30000 }, base] });
    await projectAll(e);
    const summary = await report();
    expect(summary.totals.plays).toBe(3); expect(summary.totals.visibleMs).toBe(30000);
    const daily = await db!.collection('measurement_daily').get(); expect(daily.size).toBe(6);
    for (const row of daily.docs) { expect(row.data().counts.plays).toBe(3); expect(row.data().counts.visibleMs).toBe(30000); }
    expect((await db!.collection('measurement_receipts').get()).size).toBe(2);
  });

  test('forged scope, different auth, revoked devices, expired replay and impossible duration are rejected', async () => {
    const { e, session, placementId } = await prepare(); const windowStart = now; now += MINUTE;
    const b = { sessionId: session.sessionId, placementId, windowStart, plays: 1, visibleMs: 1000 };
    expect((await e.ingest('attacker', { buckets: [b] })).accepted).toHaveLength(0);
    expect((await e.ingest('playerA', { buckets: [{ ...b, placementId: 'foreign' }] })).rejected).toHaveLength(1);
    expect((await e.ingest('playerA', { buckets: [{ ...b, visibleMs: 90000 }] })).rejected).toHaveLength(1);
    expect((await e.ingest('playerA', { buckets: [{ ...b, windowStart: now - 8 * DAY }] })).rejected).toHaveLength(1);
    await db!.doc(`measurement_devices/${hash('playerA', 'screenA')}`).update({ revoked: true });
    expect((await e.ingest('playerA', { buckets: [b] })).rejected[0].reason).toContain('revoked');
  });

  test('survey responses accept NPS zero, reject mutation, and atomically avoid duplicate scoring', async () => {
    const { e, placementId } = await prepare();
    const url = await e.scan(await e.placement(placementId)); const token = url.split('#')[1];
    await e.action(token, 'landing_view'); await e.action(token, 'landing_view');
    await expect(e.submit(token, { nps: 12, csat: 5 })).rejects.toThrow();
    expect((await db!.collection('measurement_responses').get()).empty).toBe(true);
    expect(await e.submit(token, { nps: 0, csat: 5 })).toEqual({ success: true, duplicate: false });
    expect(await e.submit(token, { nps: 0, csat: 5 })).toEqual({ success: true, duplicate: true });
    await expect(e.submit(token, { nps: 10, csat: 5 })).rejects.toThrow('different response');
    await projectAll(e);
    const summary = await report();
    expect(summary.totals.scans).toBe(1); expect(summary.totals.landingViews).toBe(1);
    expect(summary.totals.surveySubmits).toBe(1); expect(summary.totals.npsDetractors).toBe(1);
    expect(summary.totals.csatSatisfied).toBe(1); expect(summary.totals.cohortSurveyStarts).toBe(1);
    expect((await db!.collection('measurement_responses').get()).size).toBe(1);
  });

  test('guest session expiry is enforced immediately, not delegated to asynchronous TTL deletion', async () => {
    const { e, placementId } = await prepare(); const url = await e.scan(await e.placement(placementId));
    now += DAY + 1;
    await expect(e.submit(url.split('#')[1], { nps: 10, csat: 5 })).rejects.toThrow('expired');
    expect((await db!.collection('measurement_guests').get()).size).toBe(1);
  });

  test('offer actions are constrained and counted once per action/session; no redemption is invented', async () => {
    const { e, placementId } = await prepare('offer');
    const token = (await e.scan(await e.placement(placementId))).split('#')[1];
    await expect(e.action(token, 'offer_copy')).rejects.toThrow('Reveal');
    expect((await e.action(token, 'offer_reveal') as { offerCode: string }).offerCode).toBe('LUNCH10');
    await e.action(token, 'offer_reveal'); await e.action(token, 'offer_copy');
    expect((await e.action(token, 'cta_click') as { destinationUrl: string }).destinationUrl).toBe('https://restaurant.example/menu');
    await expect(e.action(token, 'redemption')).rejects.toThrow('Unsupported');
    await projectAll(e); const summary = await report();
    expect(summary.totals.offerReveals).toBe(1); expect(summary.totals.offerCopies).toBe(1);
    expect(summary.totals.cohortEngaged).toBe(1); expect(summary.totals.actions).toBe(3);
    expect(summary.totals.redemptions).toBeUndefined();
  });

  test('later actions retain the scan-cohort date and preserve source location after a screen moves', async () => {
    const { e, session, placementId } = await prepare();
    now = Date.parse('2026-09-08T03:59:00Z');
    const token = (await e.scan(await e.placement(placementId))).split('#')[1];
    now += 2 * MINUTE; await e.submit(token, { nps: 10, csat: 4 });
    await db!.doc('screens/screenA').update({ locationId: 'locB' });
    const changed = await e.manifest('playerA', { sessionId: session.sessionId, slideVersions: { slideA: Date.parse('2026-09-07T12:00:00Z') } });
    await e.scan(await e.placement(changed.placements[0].placementId));
    await projectAll(e);
    const oldDay = await e.dashboard('localA', { orgId: 'orgA', from: '2026-09-07', to: '2026-09-07' });
    expect(oldDay.totals.cohortScans).toBe(1); expect(oldDay.totals.cohortSurveySubmits).toBe(1);
    expect(oldDay.totals.surveySubmits || 0).toBe(0);
    const restricted = await report('localA'); const owner = await report();
    expect(restricted.locationRows).toHaveLength(1); expect(restricted.totals.scans).toBe(1);
    expect(owner.locationRows).toHaveLength(2); expect(owner.totals.scans).toBe(2);
  });

  test('test events cannot enter live dashboards and paused QR links stop accepting scans', async () => {
    const { e, campaignId } = await prepare();
    const preview = await e.openSession('ownerA', 'screenA', 'live');
    const manifest = await e.manifest('ownerA', { sessionId: preview.sessionId, slideVersions: { slideA: now } });
    await e.scan(await e.placement(manifest.placements[0].placementId)); await projectAll(e);
    expect((await report()).totals.scans).toBeUndefined();
    const testReport = await e.dashboard('ownerA', { orgId: 'orgA', from: '2026-09-01', to: '2026-09-30', mode: 'test' });
    expect(testReport.totals.scans).toBe(1);
    await e.campaignStatus('ownerA', { orgId: 'orgA', campaignId, status: 'paused' });
    await expect(e.placement(manifest.placements[0].placementId)).rejects.toThrow('paused');
  });

  test('retention timestamps are written on raw events, sessions, responses and receipts, not daily totals', async () => {
    const { e, placementId } = await prepare(); const token = (await e.scan(await e.placement(placementId))).split('#')[1];
    await e.submit(token, { nps: 9, csat: 4 }); await projectAll(e);
    for (const collection of ['measurement_events','measurement_sessions','measurement_responses','measurement_receipts']) {
      const rows = await db!.collection(collection).get(); expect(rows.empty).toBe(false);
      for (const row of rows.docs) expect(row.data().expireAt.toMillis()).toBeGreaterThan(now);
    }
    for (const row of (await db!.collection('measurement_daily').get()).docs) expect(row.data().expireAt).toBeUndefined();
  });

  test('public Firestore REST cannot forge or read any measurement collection', async () => {
    const url = `http://${emulator}/v1/projects/${PROJECT}/databases/(default)/documents`;
    for (const collection of ['qr_scans','daily_metrics','measurement_events','measurement_daily','measurement_responses','campaign_placements','measurement_devices','measurement_sessions','measurement_guests']) {
      const response = await fetch(`${url}/${collection}/forged`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { orgId: { stringValue: 'orgA' } } }) });
      expect(response.status).toBe(403);
      await db!.doc(`${collection}/private`).set({ orgId: 'orgA' });
      const read = await fetch(`${url}/${collection}/private`); expect(read.status).toBe(403);
    }
  });
});
