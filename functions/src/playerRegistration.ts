import { createHash, randomInt } from 'node:crypto';
import { Firestore, Timestamp, Transaction } from 'firebase-admin/firestore';
import { MeasurementError, hash, id, object, requireValue, text } from './measurement/core';

const ACTIVATION_TTL_MS = 15 * 60_000;
const MAX_CODE_ATTEMPTS = 12;

type RegistrationStatus = 'active' | 'replaced' | 'deactivated';
type Registration = {
  playerUid: string;
  orgId: string;
  screenId: string;
  active: boolean;
  status: RegistrationStatus;
  assignedAt?: Timestamp;
  updatedAt?: Timestamp;
};
type ScreenRegistration = {
  playerUid: string;
  orgId: string;
  screenId: string;
  assignedAt?: Timestamp;
  assignedBy?: string;
};

class ActivationCollision extends Error {}

const asMillis = (value: unknown): number => value instanceof Timestamp ? value.toMillis() : 0;
const activationKey = (code: string) => createHash('sha256').update(code).digest('hex');
const measurementDeviceId = (playerUid: string, screenId: string) => hash(playerUid, screenId);
const publicRegistration = (value: Registration | undefined) => value ? {
  screenId: value.screenId,
  orgId: value.orgId,
  active: value.active === true,
  status: value.status || (value.active ? 'active' : 'deactivated'),
} : null;

/**
 * Durable browser-player identity and logical-screen assignment.
 *
 * The Firebase anonymous UID is the browser installation identity. A restaurant
 * screen is an assignment that may be replaced, moved, or swapped without
 * asking staff to activate the browser again.
 */
export class PlayerRegistrationEngine {
  constructor(readonly db: Firestore, readonly now: () => number = Date.now) {}

  private timestamp() { return Timestamp.fromMillis(this.now()); }

  private async requireOrgAdmin(uid: string, orgId: string) {
    id(uid); id(orgId);
    const [org, member] = await Promise.all([
      this.db.doc(`organizations/${orgId}`).get(),
      this.db.doc(`organizations/${orgId}/members/${uid}`).get(),
    ]);
    requireValue(org.exists, 'Organization not found.', 'not-found');
    if (org.data()!.ownerId === uid) return;
    requireValue(member.exists && member.data()?.status === 'active' && member.data()?.role === 'orgAdmin', 'An organization administrator is required.', 'permission-denied');
  }

  private authorizeMeasurement(tx: Transaction, playerUid: string, screenId: string, orgId: string, approvedBy: string) {
    const deviceId = measurementDeviceId(playerUid, screenId);
    tx.set(this.db.doc(`measurement_devices/${deviceId}`), {
      uid: playerUid,
      screenId,
      orgId,
      revoked: false,
      approvedBy,
      approvedAt: this.timestamp(),
      source: 'player-registration',
    }, { merge: true });
    tx.set(this.db.doc(`measurement_screen_devices/${screenId}`), {
      orgId,
      deviceId,
      approvedAt: this.timestamp(),
      source: 'player-registration',
    }, { merge: true });
  }

  private revokeMeasurement(tx: Transaction, playerUid: string, screenId: string) {
    const deviceId = measurementDeviceId(playerUid, screenId);
    tx.set(this.db.doc(`measurement_devices/${deviceId}`), {
      revoked: true,
      revokedAt: this.timestamp(),
      source: 'player-registration',
    }, { merge: true });
  }

  /**
   * Resolve the browser's durable assignment first. Only an unregistered or
   * replaced/deactivated browser receives a short-lived activation code.
   */
  async requestActivation(playerUid: string) {
    id(playerUid);
    const registrationSnap = await this.db.doc(`player_registrations/${playerUid}`).get();
    const registration = registrationSnap.data() as Registration | undefined;
    if (registration?.active && registration.screenId && registration.orgId) {
      return { registration: publicRegistration(registration), code: null, expiresAt: 0 };
    }

    const requestRef = this.db.doc(`player_activation_requests/${playerUid}`);
    const existing = await requestRef.get();
    if (existing.exists && asMillis(existing.data()!.expireAt) > this.now()) {
      return {
        registration: publicRegistration(registration),
        code: String(existing.data()!.code),
        expiresAt: asMillis(existing.data()!.expireAt),
      };
    }

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = String(randomInt(100_000, 1_000_000));
      const codeRef = this.db.doc(`player_activation_codes/${activationKey(code)}`);
      try {
        const result = await this.db.runTransaction(async tx => {
          const [latestRequest, candidate, latestRegistration] = await Promise.all([
            tx.get(requestRef),
            tx.get(codeRef),
            tx.get(this.db.doc(`player_registrations/${playerUid}`)),
          ]);
          const latest = latestRegistration.data() as Registration | undefined;
          if (latest?.active && latest.screenId && latest.orgId) {
            return { registration: publicRegistration(latest), code: null, expiresAt: 0 };
          }
          if (latestRequest.exists && asMillis(latestRequest.data()!.expireAt) > this.now()) {
            return {
              registration: publicRegistration(latest),
              code: String(latestRequest.data()!.code),
              expiresAt: asMillis(latestRequest.data()!.expireAt),
            };
          }
          if (candidate.exists && asMillis(candidate.data()!.expireAt) > this.now()) throw new ActivationCollision();
          const expireAt = Timestamp.fromMillis(this.now() + ACTIVATION_TTL_MS);
          const value = { code, playerUid, createdAt: this.timestamp(), expireAt };
          tx.set(codeRef, value);
          tx.set(requestRef, value);
          return { registration: publicRegistration(latest), code, expiresAt: expireAt.toMillis() };
        });
        return result;
      } catch (error) {
        if (error instanceof ActivationCollision) continue;
        throw error;
      }
    }
    throw new MeasurementError('resource-exhausted', 'Could not create an activation code. Retry in a moment.');
  }

  private async claim(uid: string, raw: Record<string, unknown>) {
    const code = text(raw.code, 6).replace(/\s+/g, '');
    requireValue(/^\d{6}$/.test(code), 'Enter the six-digit activation code.');
    const screenId = id(raw.screenId);
    const codeRef = this.db.doc(`player_activation_codes/${activationKey(code)}`);
    const pending = await codeRef.get();
    const pendingData = pending.data();
    requireValue(pending.exists && pendingData && asMillis(pendingData.expireAt) > this.now(), 'Activation code is invalid or expired.', 'permission-denied');
    const playerUid = id(pendingData.playerUid);
    const screen = await this.db.doc(`screens/${screenId}`).get();
    requireValue(screen.exists && screen.data()?.orgId, 'Screen not found.', 'not-found');
    const orgId = id(screen.data()!.orgId);
    await this.requireOrgAdmin(uid, orgId);

    await this.db.runTransaction(async tx => {
      const codeSnap = await tx.get(codeRef);
      const codeData = codeSnap.data();
      requireValue(codeSnap.exists && codeData?.playerUid === playerUid && asMillis(codeData.expireAt) > this.now(), 'Activation code is invalid or expired.', 'permission-denied');
      const screenSnap = await tx.get(this.db.doc(`screens/${screenId}`));
      requireValue(screenSnap.exists && screenSnap.data()?.orgId === orgId, 'Screen organization changed.', 'permission-denied');

      const playerRef = this.db.doc(`player_registrations/${playerUid}`);
      const targetMapRef = this.db.doc(`player_screen_registrations/${screenId}`);
      const [playerSnap, targetMapSnap] = await Promise.all([tx.get(playerRef), tx.get(targetMapRef)]);
      const previous = playerSnap.data() as Registration | undefined;
      const occupied = targetMapSnap.data() as ScreenRegistration | undefined;

      let previousMapSnap;
      let previousMeasurementSnap;
      if (previous?.active && previous.screenId && previous.screenId !== screenId) {
        previousMapSnap = await tx.get(this.db.doc(`player_screen_registrations/${previous.screenId}`));
        previousMeasurementSnap = await tx.get(this.db.doc(`measurement_screen_devices/${previous.screenId}`));
      }
      let occupiedPlayerSnap;
      if (occupied?.playerUid && occupied.playerUid !== playerUid) {
        occupiedPlayerSnap = await tx.get(this.db.doc(`player_registrations/${occupied.playerUid}`));
      }

      if (previous?.active && previous.screenId && previous.screenId !== screenId) {
        if (previousMapSnap?.data()?.playerUid === playerUid) tx.delete(previousMapSnap.ref);
        const oldDeviceId = measurementDeviceId(playerUid, previous.screenId);
        if (previousMeasurementSnap?.data()?.deviceId === oldDeviceId) tx.delete(previousMeasurementSnap.ref);
        this.revokeMeasurement(tx, playerUid, previous.screenId);
      }

      if (occupied?.playerUid && occupied.playerUid !== playerUid) {
        tx.set(this.db.doc(`player_registrations/${occupied.playerUid}`), {
          ...(occupiedPlayerSnap?.data() || {}),
          playerUid: occupied.playerUid,
          orgId,
          screenId,
          active: false,
          status: 'replaced',
          replacedBy: playerUid,
          updatedAt: this.timestamp(),
        }, { merge: true });
        this.revokeMeasurement(tx, occupied.playerUid, screenId);
      }

      const registration: Registration & { assignedBy: string } = {
        playerUid,
        orgId,
        screenId,
        active: true,
        status: 'active',
        assignedAt: this.timestamp(),
        updatedAt: this.timestamp(),
        assignedBy: uid,
      };
      tx.set(playerRef, registration);
      tx.set(targetMapRef, { playerUid, orgId, screenId, assignedAt: this.timestamp(), assignedBy: uid });
      this.authorizeMeasurement(tx, playerUid, screenId, orgId, uid);
      tx.delete(codeRef);
      tx.delete(this.db.doc(`player_activation_requests/${playerUid}`));
    });

    return { success: true, screenId, orgId };
  }

  private async list(uid: string, raw: Record<string, unknown>) {
    const orgId = id(raw.orgId);
    await this.requireOrgAdmin(uid, orgId);
    const snapshot = await this.db.collection('player_screen_registrations').where('orgId', '==', orgId).get();
    return {
      registrations: snapshot.docs.map(doc => {
        const data = doc.data() as ScreenRegistration;
        return { screenId: data.screenId || doc.id, playerUid: data.playerUid, assignedAt: asMillis(data.assignedAt) };
      }),
    };
  }

  private async reassign(uid: string, raw: Record<string, unknown>) {
    const orgId = id(raw.orgId);
    const sourceScreenId = id(raw.sourceScreenId);
    const targetScreenId = id(raw.targetScreenId);
    requireValue(sourceScreenId !== targetScreenId, 'Choose a different target screen.');
    await this.requireOrgAdmin(uid, orgId);

    await this.db.runTransaction(async tx => {
      const sourceScreenRef = this.db.doc(`screens/${sourceScreenId}`);
      const targetScreenRef = this.db.doc(`screens/${targetScreenId}`);
      const sourceMapRef = this.db.doc(`player_screen_registrations/${sourceScreenId}`);
      const targetMapRef = this.db.doc(`player_screen_registrations/${targetScreenId}`);
      const [sourceScreen, targetScreen, sourceMap, targetMap] = await Promise.all([
        tx.get(sourceScreenRef), tx.get(targetScreenRef), tx.get(sourceMapRef), tx.get(targetMapRef),
      ]);
      requireValue(sourceScreen.data()?.orgId === orgId && targetScreen.data()?.orgId === orgId, 'Both screens must belong to this organization.', 'permission-denied');
      const source = sourceMap.data() as ScreenRegistration | undefined;
      requireValue(source?.playerUid, 'The source screen does not have an activated display.', 'failed-precondition');
      requireValue(!targetMap.exists, 'The target screen already has a display. Use Swap displays instead.', 'failed-precondition');
      const playerUid = id(source!.playerUid);
      const playerRef = this.db.doc(`player_registrations/${playerUid}`);
      const sourceMeasurementRef = this.db.doc(`measurement_screen_devices/${sourceScreenId}`);
      const [player, sourceMeasurement] = await Promise.all([tx.get(playerRef), tx.get(sourceMeasurementRef)]);
      requireValue(player.data()?.active && player.data()?.screenId === sourceScreenId, 'Player assignment changed. Refresh and retry.', 'failed-precondition');

      tx.delete(sourceMapRef);
      tx.set(targetMapRef, { playerUid, orgId, screenId: targetScreenId, assignedAt: this.timestamp(), assignedBy: uid });
      tx.set(playerRef, { screenId: targetScreenId, orgId, active: true, status: 'active', updatedAt: this.timestamp(), assignedBy: uid }, { merge: true });
      const oldDeviceId = measurementDeviceId(playerUid, sourceScreenId);
      if (sourceMeasurement.data()?.deviceId === oldDeviceId) tx.delete(sourceMeasurementRef);
      this.revokeMeasurement(tx, playerUid, sourceScreenId);
      this.authorizeMeasurement(tx, playerUid, targetScreenId, orgId, uid);
    });
    return { success: true, sourceScreenId, targetScreenId };
  }

  private async swap(uid: string, raw: Record<string, unknown>) {
    const orgId = id(raw.orgId);
    const firstScreenId = id(raw.firstScreenId);
    const secondScreenId = id(raw.secondScreenId);
    requireValue(firstScreenId !== secondScreenId, 'Choose two different screens.');
    await this.requireOrgAdmin(uid, orgId);

    await this.db.runTransaction(async tx => {
      const firstScreenRef = this.db.doc(`screens/${firstScreenId}`);
      const secondScreenRef = this.db.doc(`screens/${secondScreenId}`);
      const firstMapRef = this.db.doc(`player_screen_registrations/${firstScreenId}`);
      const secondMapRef = this.db.doc(`player_screen_registrations/${secondScreenId}`);
      const [firstScreen, secondScreen, firstMap, secondMap] = await Promise.all([
        tx.get(firstScreenRef), tx.get(secondScreenRef), tx.get(firstMapRef), tx.get(secondMapRef),
      ]);
      requireValue(firstScreen.data()?.orgId === orgId && secondScreen.data()?.orgId === orgId, 'Both screens must belong to this organization.', 'permission-denied');
      const first = firstMap.data() as ScreenRegistration | undefined;
      const second = secondMap.data() as ScreenRegistration | undefined;
      requireValue(first?.playerUid && second?.playerUid, 'Both screens need activated displays before they can be swapped.', 'failed-precondition');
      const firstPlayerUid = id(first!.playerUid);
      const secondPlayerUid = id(second!.playerUid);
      const firstPlayerRef = this.db.doc(`player_registrations/${firstPlayerUid}`);
      const secondPlayerRef = this.db.doc(`player_registrations/${secondPlayerUid}`);
      const firstMeasurementRef = this.db.doc(`measurement_screen_devices/${firstScreenId}`);
      const secondMeasurementRef = this.db.doc(`measurement_screen_devices/${secondScreenId}`);
      const [firstPlayer, secondPlayer, firstMeasurement, secondMeasurement] = await Promise.all([
        tx.get(firstPlayerRef), tx.get(secondPlayerRef), tx.get(firstMeasurementRef), tx.get(secondMeasurementRef),
      ]);
      requireValue(firstPlayer.data()?.active && firstPlayer.data()?.screenId === firstScreenId, 'First player assignment changed. Refresh and retry.', 'failed-precondition');
      requireValue(secondPlayer.data()?.active && secondPlayer.data()?.screenId === secondScreenId, 'Second player assignment changed. Refresh and retry.', 'failed-precondition');

      tx.set(firstMapRef, { playerUid: secondPlayerUid, orgId, screenId: firstScreenId, assignedAt: this.timestamp(), assignedBy: uid });
      tx.set(secondMapRef, { playerUid: firstPlayerUid, orgId, screenId: secondScreenId, assignedAt: this.timestamp(), assignedBy: uid });
      tx.set(firstPlayerRef, { screenId: secondScreenId, orgId, active: true, status: 'active', updatedAt: this.timestamp(), assignedBy: uid }, { merge: true });
      tx.set(secondPlayerRef, { screenId: firstScreenId, orgId, active: true, status: 'active', updatedAt: this.timestamp(), assignedBy: uid }, { merge: true });

      const firstOldDeviceId = measurementDeviceId(firstPlayerUid, firstScreenId);
      const secondOldDeviceId = measurementDeviceId(secondPlayerUid, secondScreenId);
      if (firstMeasurement.data()?.deviceId === firstOldDeviceId) tx.delete(firstMeasurementRef);
      if (secondMeasurement.data()?.deviceId === secondOldDeviceId) tx.delete(secondMeasurementRef);
      this.revokeMeasurement(tx, firstPlayerUid, firstScreenId);
      this.revokeMeasurement(tx, secondPlayerUid, secondScreenId);
      this.authorizeMeasurement(tx, firstPlayerUid, secondScreenId, orgId, uid);
      this.authorizeMeasurement(tx, secondPlayerUid, firstScreenId, orgId, uid);
    });
    return { success: true, firstScreenId, secondScreenId };
  }

  private async deactivate(uid: string, raw: Record<string, unknown>) {
    const orgId = id(raw.orgId);
    const screenId = id(raw.screenId);
    await this.requireOrgAdmin(uid, orgId);
    await this.db.runTransaction(async tx => {
      const screenRef = this.db.doc(`screens/${screenId}`);
      const mapRef = this.db.doc(`player_screen_registrations/${screenId}`);
      const [screen, map] = await Promise.all([tx.get(screenRef), tx.get(mapRef)]);
      requireValue(screen.data()?.orgId === orgId, 'Screen does not belong to this organization.', 'permission-denied');
      const assignment = map.data() as ScreenRegistration | undefined;
      requireValue(assignment?.playerUid, 'This screen does not have an activated display.', 'failed-precondition');
      const playerUid = id(assignment!.playerUid);
      const measurementRef = this.db.doc(`measurement_screen_devices/${screenId}`);
      const measurement = await tx.get(measurementRef);
      tx.delete(mapRef);
      tx.set(this.db.doc(`player_registrations/${playerUid}`), {
        active: false,
        status: 'deactivated',
        screenId,
        orgId,
        updatedAt: this.timestamp(),
        deactivatedBy: uid,
      }, { merge: true });
      const deviceId = measurementDeviceId(playerUid, screenId);
      if (measurement.data()?.deviceId === deviceId) tx.delete(measurementRef);
      this.revokeMeasurement(tx, playerUid, screenId);
    });
    return { success: true, screenId };
  }

  /** Multiplexes operator actions through the already-deployed pairing callable. */
  async manage(uid: string, input: unknown) {
    const data = object(input);
    switch (String(data.playerRegistrationAction || '')) {
      case 'claim': return this.claim(uid, data);
      case 'list': return this.list(uid, data);
      case 'reassign': return this.reassign(uid, data);
      case 'swap': return this.swap(uid, data);
      case 'deactivate': return this.deactivate(uid, data);
      default: throw new MeasurementError('invalid-argument', 'Unknown player registration action.');
    }
  }
}
