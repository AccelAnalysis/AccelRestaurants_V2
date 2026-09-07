import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PlayerRegistrationEngine } from './playerRegistration';
import { hash } from './measurement/core';

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const suite = emulator ? describe : describe.skip;
const PROJECT = 'demo-accel-measurement';

suite('player registration Firestore integration (emulator only)', () => {
  if (emulator && !/^(127\.0\.0\.1|localhost):\d+$/.test(emulator)) throw new Error('Tests require a loopback Firestore emulator.');
  const app = emulator ? initializeApp({ projectId: PROJECT }, 'player-registration-tests') : null;
  const db = app ? getFirestore(app) : null;
  let now = Date.parse('2026-09-07T12:00:00Z');
  const service = () => new PlayerRegistrationEngine(db!, () => now);

  beforeEach(async () => {
    now = Date.parse('2026-09-07T12:00:00Z');
    const response = await fetch(`http://${emulator}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Could not reset demo emulator.');
    await Promise.all([
      db!.doc('organizations/orgA').set({ ownerId: 'ownerA', name: 'Restaurant A' }),
      db!.doc('organizations/orgA/members/adminA').set({ status: 'active', role: 'orgAdmin' }),
      db!.doc('organizations/orgA/members/userA').set({ status: 'active', role: 'user' }),
      db!.doc('organizations/orgB').set({ ownerId: 'ownerB', name: 'Restaurant B' }),
      db!.doc('screens/screenA').set({ orgId: 'orgA', name: 'Front Counter Left', isActive: true }),
      db!.doc('screens/screenB').set({ orgId: 'orgA', name: 'Front Counter Center', isActive: true }),
      db!.doc('screens/screenC').set({ orgId: 'orgA', name: 'Front Counter Right', isActive: true }),
      db!.doc('screens/foreign').set({ orgId: 'orgB', name: 'Foreign', isActive: true }),
    ]);
  });

  afterAll(async () => { if (db) await db.terminate(); if (app) await deleteApp(app); });

  async function activate(playerUid: string, screenId: string, operator = 'ownerA') {
    const pending = await service().requestActivation(playerUid);
    expect(pending.code).toMatch(/^\d{6}$/);
    const claimed = await service().manage(operator, { playerRegistrationAction: 'claim', orgId: 'orgA', code: pending.code, screenId });
    expect(claimed).toMatchObject({ success: true, screenId, orgId: 'orgA' });
    return pending.code!;
  }

  test('an unknown TV gets one short-lived code and the same browser restores its assignment the next morning', async () => {
    const first = await service().requestActivation('playerA');
    const again = await service().requestActivation('playerA');
    expect(first.code).toMatch(/^\d{6}$/);
    expect(again).toEqual(first);

    await service().manage('ownerA', { playerRegistrationAction: 'claim', orgId: 'orgA', code: first.code, screenId: 'screenA' });
    const nextMorning = await service().requestActivation('playerA');
    expect(nextMorning.code).toBeNull();
    expect(nextMorning.registration).toEqual({ screenId: 'screenA', orgId: 'orgA', active: true, status: 'active' });

    const map = (await db!.doc('player_screen_registrations/screenA').get()).data();
    expect(map?.playerUid).toBe('playerA');
    const deviceId = hash('playerA', 'screenA');
    expect((await db!.doc(`measurement_screen_devices/screenA`).get()).data()?.deviceId).toBe(deviceId);
    expect((await db!.doc(`measurement_devices/${deviceId}`).get()).data()?.revoked).toBe(false);
  });

  test('activating a replacement TV supersedes the old browser without creating a second screen assignment', async () => {
    await activate('oldTv', 'screenA');
    await activate('newTv', 'screenA');

    expect((await db!.doc('player_registrations/oldTv').get()).data()).toMatchObject({ active: false, status: 'replaced', screenId: 'screenA', replacedBy: 'newTv' });
    expect((await db!.doc('player_registrations/newTv').get()).data()).toMatchObject({ active: true, status: 'active', screenId: 'screenA' });
    expect((await db!.doc('player_screen_registrations/screenA').get()).data()?.playerUid).toBe('newTv');
    expect((await db!.doc(`measurement_devices/${hash('oldTv', 'screenA')}`).get()).data()?.revoked).toBe(true);
    expect((await db!.doc(`measurement_screen_devices/screenA`).get()).data()?.deviceId).toBe(hash('newTv', 'screenA'));
  });

  test('reassign and swap change logical screens atomically while the browser identities stay registered', async () => {
    await activate('playerA', 'screenA');
    await service().manage('adminA', { playerRegistrationAction: 'reassign', orgId: 'orgA', sourceScreenId: 'screenA', targetScreenId: 'screenB' });
    expect((await db!.doc('player_registrations/playerA').get()).data()).toMatchObject({ active: true, screenId: 'screenB' });
    expect((await db!.doc('player_screen_registrations/screenA').get()).exists).toBe(false);
    expect((await db!.doc('player_screen_registrations/screenB').get()).data()?.playerUid).toBe('playerA');
    expect((await db!.doc('measurement_screen_devices/screenB').get()).data()?.deviceId).toBe(hash('playerA', 'screenB'));

    await activate('playerC', 'screenC');
    await service().manage('ownerA', { playerRegistrationAction: 'swap', orgId: 'orgA', firstScreenId: 'screenB', secondScreenId: 'screenC' });
    expect((await db!.doc('player_registrations/playerA').get()).data()?.screenId).toBe('screenC');
    expect((await db!.doc('player_registrations/playerC').get()).data()?.screenId).toBe('screenB');
    expect((await db!.doc('player_screen_registrations/screenB').get()).data()?.playerUid).toBe('playerC');
    expect((await db!.doc('player_screen_registrations/screenC').get()).data()?.playerUid).toBe('playerA');
    expect((await db!.doc('measurement_screen_devices/screenB').get()).data()?.deviceId).toBe(hash('playerC', 'screenB'));
    expect((await db!.doc('measurement_screen_devices/screenC').get()).data()?.deviceId).toBe(hash('playerA', 'screenC'));
  });

  test('deactivation returns that browser to activation and non-admins cannot manage display assignments', async () => {
    await activate('playerA', 'screenA');
    await expect(service().manage('userA', { playerRegistrationAction: 'list', orgId: 'orgA' })).rejects.toThrow('administrator');
    await expect(service().manage('ownerB', { playerRegistrationAction: 'claim', orgId: 'orgB', code: '123456', screenId: 'foreign' })).rejects.toThrow();

    await service().manage('ownerA', { playerRegistrationAction: 'deactivate', orgId: 'orgA', screenId: 'screenA' });
    expect((await db!.doc('player_screen_registrations/screenA').get()).exists).toBe(false);
    expect((await db!.doc('player_registrations/playerA').get()).data()).toMatchObject({ active: false, status: 'deactivated', screenId: 'screenA' });
    expect((await db!.doc(`measurement_devices/${hash('playerA', 'screenA')}`).get()).data()?.revoked).toBe(true);

    const nextOpen = await service().requestActivation('playerA');
    expect(nextOpen.registration).toMatchObject({ active: false, status: 'deactivated', screenId: 'screenA' });
    expect(nextOpen.code).toMatch(/^\d{6}$/);
  });
});
