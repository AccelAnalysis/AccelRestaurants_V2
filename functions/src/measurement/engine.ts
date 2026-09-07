import { Firestore, Timestamp, FieldValue, Transaction, DocumentData } from 'firebase-admin/firestore';
import { Attribution, Bucket, Counts, Mode, Question, DAY, MINUTE, RAW_RETENTION_DAYS, MeasurementError, requireValue, object, text, id, hash, opaque, safeDestination, validateCampaign, validateAnswers, validateBucket, validateTimezone, localTime, bucketDelta, addCounts, scopeRows } from './core';

type Placement = Attribution & {
  id: string; kind: 'external' | 'offer' | 'survey'; destinationUrl: string;
  ctaLabel: string; offerCode: string; surveyId: string; thankYouMessage: string;
  slideVersion: number; createdAt: Timestamp;
};
type Access = { admin: boolean; locations: string[] | null };
const sessionKey = (uid: string, screenId: string) => hash(uid, screenId);
// Match the browser SDK's fractional milliseconds: Admin Timestamp.toMillis() floors them.
// Server-generated update timestamps can contain microseconds; truncation would reject real revisions.
const asMillis = (value: unknown): number => value instanceof Timestamp ? value.seconds * 1000 + value.nanoseconds / 1e6 : 0;

/** All authorization and writes live here, not in clients or Firestore rules. */
export class MeasurementEngine {
  constructor(readonly db: Firestore, readonly origin: string, readonly now: () => number = Date.now) {}
  private timestamp() { return Timestamp.fromMillis(this.now()); }
  private expires(days: number) { return Timestamp.fromMillis(this.now() + days * DAY); }

  async access(uid: string, orgId: string, adminOnly = false): Promise<Access> {
    id(uid); id(orgId);
    const [org, member] = await Promise.all([
      this.db.doc(`organizations/${orgId}`).get(), this.db.doc(`organizations/${orgId}/members/${uid}`).get(),
    ]);
    requireValue(org.exists, 'Organization not found.', 'not-found');
    if (org.data()!.ownerId === uid) return { admin: true, locations: null };
    const m = member.data();
    requireValue(m?.status === 'active', 'Active organization membership required.', 'permission-denied');
    const admin = m!.role === 'orgAdmin';
    requireValue(!adminOnly || admin, 'An organization administrator is required.', 'permission-denied');
    if (admin || m!.role === 'user') return { admin, locations: null };
    requireValue(['locationAdmin', 'locationUser'].includes(m!.role) && Array.isArray(m!.locationIds), 'Measurement access is not assigned.', 'permission-denied');
    return { admin: false, locations: m!.locationIds.filter((v: unknown) => typeof v === 'string') };
  }

  async rate(key: string, limit: number, period = MINUTE) {
    const start = Math.floor(this.now() / period) * period;
    const ref = this.db.doc(`measurement_usage/${hash(key, start)}`);
    await this.db.runTransaction(async tx => {
      const snap = await tx.get(ref); const count = Number(snap.data()?.count || 0);
      requireValue(count < limit, 'Request limit reached. Try again shortly.', 'resource-exhausted');
      tx.set(ref, { count: count + 1, expireAt: this.expires(2) });
    });
  }

  // Daily random salt means no raw IP, reversible IP encoding, or persistent cross-day fingerprint is stored.
  async publicRate(ip: string, placementId: string) {
    const day = Math.floor(this.now() / DAY);
    const saltRef = this.db.doc(`measurement_salts/${day}`);
    const salt = await this.db.runTransaction(async tx => {
      const snap = await tx.get(saltRef);
      if (snap.exists) return String(snap.data()!.salt);
      const value = opaque(); tx.create(saltRef, { salt: value, expireAt: this.expires(2) }); return value;
    });
    await this.rate(hash(salt, ip || 'unknown', placementId), 120);
    await this.rate(`placement:${placementId}`, 600);
  }

  async createCampaign(uid: string, raw: unknown) {
    const data = object(raw); const orgId = id(data.orgId); const requestId = id(data.requestId);
    await this.access(uid, orgId, true); await this.rate(`campaign:${uid}`, 20);
    const input = validateCampaign(data.campaign);
    const campaignId = `mc_${hash(uid, requestId).slice(0, 32)}`;
    const surveyId = input.kind === 'survey' ? `sv_${hash(campaignId).slice(0, 32)}` : '';
    const fingerprint = hash(orgId, input);
    await this.db.runTransaction(async tx => {
      const ref = this.db.doc(`measurement_campaigns/${campaignId}`); const previous = await tx.get(ref);
      if (previous.exists) {
        requireValue(previous.data()!.fingerprint === fingerprint, 'This request ID was already used.'); return;
      }
      tx.create(ref, { ...input, orgId, id: campaignId, surveyId, version: 1, status: 'active', fingerprint, createdBy: uid, createdAt: this.timestamp() });
      if (surveyId) tx.create(this.db.doc(`measurement_surveys/${surveyId}`), {
        id: surveyId, orgId, campaignId, version: 1, questions: input.questions,
        thankYouMessage: input.thankYouMessage, createdAt: this.timestamp(),
      });
    });
    return { campaignId, surveyId };
  }

  async campaignStatus(uid: string, raw: unknown) {
    const data = object(raw); const orgId = id(data.orgId); const campaignId = id(data.campaignId);
    await this.access(uid, orgId, true);
    requireValue(['active', 'paused', 'archived'].includes(String(data.status)), 'Invalid campaign status.');
    await this.db.runTransaction(async tx => {
      const ref = this.db.doc(`measurement_campaigns/${campaignId}`); const snap = await tx.get(ref);
      requireValue(snap.data()?.orgId === orgId, 'Campaign not found.', 'not-found');
      tx.update(ref, { status: data.status, updatedAt: this.timestamp() });
    });
    return { success: true };
  }

  async bindCampaign(uid: string, raw: unknown) {
    const data = object(raw); const orgId = id(data.orgId); const campaignId = id(data.campaignId);
    const slideId = id(data.slideId); const tileId = id(data.tileId);
    await this.access(uid, orgId, true);
    await this.db.runTransaction(async tx => {
      const slideRef = this.db.doc(`slides/${slideId}`);
      const [campaign, slide] = await Promise.all([tx.get(this.db.doc(`measurement_campaigns/${campaignId}`)), tx.get(slideRef)]);
      requireValue(campaign.data()?.orgId === orgId && slide.data()?.orgId === orgId, 'Campaign and slide must belong to this organization.', 'permission-denied');
      const elements = slide.data()!.elements as DocumentData[];
      requireValue(Array.isArray(elements) && elements.some(t => t.id === tileId && t.type === 'qr_code'), 'Select a QR tile on the slide.');
      tx.update(slideRef, {
        elements: elements.map(tile => tile.id === tileId ? { ...tile, properties: { ...tile.properties, measurementCampaignId: campaignId, trackScan: true } } : tile),
        updatedAt: this.timestamp(),
      });
    });
    return { success: true };
  }

  async requestPairing(uid: string, screenId: string) {
    id(uid); id(screenId); await this.rate(`pair-request:${uid}`, 30, 15 * MINUTE);
    const screen = await this.db.doc(`screens/${screenId}`).get();
    requireValue(screen.data()?.orgId, 'Assign this screen to an organization before enabling measurement.', 'failed-precondition');
    const pendingRef = this.db.doc(`measurement_pairing_requests/${sessionKey(uid, screenId)}`);
    const result = await this.db.runTransaction(async tx => {
      const previous = await tx.get(pendingRef);
      if (previous.exists && asMillis(previous.data()!.expireAt) > this.now()) return previous.data()!;
      const code = opaque().replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase();
      const value = { code, uid, screenId, orgId: screen.data()!.orgId, expireAt: Timestamp.fromMillis(this.now() + 15 * MINUTE) };
      tx.create(this.db.doc(`measurement_pairings/${hash(code)}`), value); tx.set(pendingRef, value); return value;
    });
    return { code: result.code, expiresAt: asMillis(result.expireAt) };
  }

  async approvePairing(uid: string, raw: unknown) {
    const data = object(raw); const orgId = id(data.orgId); const code = text(data.code, 10).toUpperCase();
    await this.access(uid, orgId, true); await this.rate(`pair-approve:${uid}`, 10);
    await this.db.runTransaction(async tx => {
      const pairRef = this.db.doc(`measurement_pairings/${hash(code)}`); const pair = await tx.get(pairRef);
      const p = pair.data();
      requireValue(p && p.orgId === orgId && asMillis(p.expireAt) > this.now(), 'Invalid or expired pairing code.', 'permission-denied');
      const screen = await tx.get(this.db.doc(`screens/${p!.screenId}`));
      requireValue(screen.data()?.orgId === orgId, 'Screen organization changed.', 'permission-denied');
      tx.set(this.db.doc(`measurement_devices/${sessionKey(p!.uid, p!.screenId)}`), {
        uid: p!.uid, screenId: p!.screenId, orgId, revoked: false, approvedBy: uid, approvedAt: this.timestamp(),
      });
      tx.set(this.db.doc(`measurement_screen_devices/${p!.screenId}`), { orgId, deviceId: sessionKey(p!.uid, p!.screenId), approvedAt: this.timestamp() });
      tx.delete(pairRef); tx.delete(this.db.doc(`measurement_pairing_requests/${sessionKey(p!.uid, p!.screenId)}`));
    });
    return { success: true };
  }

  async openSession(uid: string, screenId: string, mode: Mode) {
    id(uid); id(screenId); await this.rate(`session:${uid}`, 30);
    const screen = await this.db.doc(`screens/${screenId}`).get();
    requireValue(screen.data()?.orgId && screen.data()?.isActive, 'Screen must be assigned and active.', 'failed-precondition');
    const orgId = String(screen.data()!.orgId); const deviceId = sessionKey(uid, screenId);
    const device = await this.db.doc(`measurement_devices/${deviceId}`).get();
    const activeDevice = await this.db.doc(`measurement_screen_devices/${screenId}`).get();
    if (device.exists) requireValue(activeDevice.data()?.deviceId === deviceId && activeDevice.data()?.orgId === orgId, 'This player was replaced by another authorized device.', 'permission-denied');
    if (!device.exists) {
      // An unpaired administrator can preview instrumentation, but can never mint live playback evidence.
      await this.access(uid, orgId, true); mode = 'test';
    } else requireValue(device.data()!.orgId === orgId && !device.data()!.revoked, 'Measurement device authorization was revoked.', 'permission-denied');
    const sessionId = opaque();
    await this.db.doc(`measurement_sessions/${sessionId}`).create({
      id: sessionId, uid, screenId, orgId, deviceId, mode, previewAdmin: !device.exists,
      createdAt: this.timestamp(), expireAt: this.expires(31),
    });
    return { sessionId, mode, serverTime: this.now(), expiresAt: this.now() + 31 * DAY };
  }

  async checkedSession(uid: string, sessionId: string) {
    const snap = await this.db.doc(`measurement_sessions/${id(sessionId)}`).get(); const s = snap.data();
    requireValue(s && s.uid === uid && asMillis(s.expireAt) > this.now(), 'Measurement session is invalid or expired.', 'permission-denied');
    const screen = await this.db.doc(`screens/${s!.screenId}`).get();
    requireValue(screen.data()?.orgId === s!.orgId, 'Screen ownership changed.', 'permission-denied');
    if (s!.previewAdmin) await this.access(uid, s!.orgId, true);
    else {
      const device = await this.db.doc(`measurement_devices/${s!.deviceId}`).get();
      const active = await this.db.doc(`measurement_screen_devices/${s!.screenId}`).get();
      requireValue(device.exists && device.data()!.orgId === s!.orgId && !device.data()!.revoked && active.data()?.deviceId === s!.deviceId && active.data()?.orgId === s!.orgId, 'Device authorization was revoked or replaced.', 'permission-denied');
    }
    return s!;
  }

  async manifest(uid: string, raw: unknown) {
    const data = object(raw); const s = await this.checkedSession(uid, id(data.sessionId));
    await this.rate(`manifest:${uid}`, 30);
    const versions = object(data.slideVersions);
    requireValue(Object.keys(versions).length <= 100, 'At most 100 slides per manifest.');
    const screen = (await this.db.doc(`screens/${s.screenId}`).get()).data()!;
    requireValue(screen.isActive && screen.locationId, 'Assign this active screen to a location.', 'failed-precondition');
    const location = (await this.db.doc(`organizations/${s.orgId}/locations/${id(screen.locationId)}`).get()).data();
    requireValue(location, 'Screen location not found.', 'failed-precondition');
    const timezone = validateTimezone(location!.timezone);
    const allowed = new Set((screen.livePlaylist || []).map((entry: string | DocumentData) => typeof entry === 'string' ? entry : entry.slideId));
    const placements: { placementId: string; tileId: string; slideId: string; slideVersion: number; redirectUrl: string }[] = [];
    const warnings: string[] = [];
    for (const [slideId, expected] of Object.entries(versions)) {
      id(slideId); if (!allowed.has(slideId)) continue;
      const slideSnap = await this.db.doc(`slides/${slideId}`).get(); const slide = slideSnap.data();
      if (!slide || slide.orgId !== s.orgId || asMillis(slide.updatedAt) !== expected) { warnings.push(`Refresh slide ${slideId} before measuring its revision.`); continue; }
      for (const tile of (slide.elements || []) as DocumentData[]) {
        if (tile.type !== 'qr_code' || tile.visible === false) continue;
        const props = tile.properties || {};
        let campaignId = props.measurementCampaignId as string | undefined;
        if (!campaignId && props.trackScan && props.qrSource !== 'calendar_event') {
          let destinationUrl: string;
          try { destinationUrl = safeDestination(props.content); } catch { warnings.push(`QR ${tile.id} needs an HTTPS destination.`); continue; }
          campaignId = `auto_${hash(s.orgId, slideId, tile.id, destinationUrl).slice(0, 32)}`;
          const ref = this.db.doc(`measurement_campaigns/${campaignId}`);
          await this.db.runTransaction(async tx => {
            if ((await tx.get(ref)).exists) return;
            tx.create(ref, { id: campaignId, orgId: s.orgId, name: `Tracked QR: ${slide.name || 'Slide'}`, kind: 'external', destinationUrl, ctaLabel: 'Continue', offerCode: '', surveyId: '', thankYouMessage: '', status: 'active', version: 1, autoCreated: true, createdAt: this.timestamp() });
          });
        }
        if (!campaignId) continue;
        id(campaignId);
        const campaign = (await this.db.doc(`measurement_campaigns/${campaignId}`).get()).data();
        if (!campaign || campaign.orgId !== s.orgId || campaign.status !== 'active') { warnings.push(`Campaign for QR ${tile.id} is not active.`); continue; }
        const snapshot: Omit<Placement, 'id' | 'createdAt'> = {
          orgId: s.orgId, campaignId, campaignName: campaign.name, locationId: screen.locationId,
          locationName: location!.name || screen.locationId, screenId: s.screenId, screenName: screen.name || s.screenId,
          slideId, tileId: id(tile.id), revisionId: hash(slide), timezone, mode: s.mode,
          kind: campaign.kind, destinationUrl: campaign.destinationUrl, ctaLabel: campaign.ctaLabel,
          offerCode: campaign.offerCode, surveyId: campaign.surveyId, thankYouMessage: campaign.thankYouMessage,
          slideVersion: asMillis(slide.updatedAt),
        };
        const keyRef = this.db.doc(`measurement_placement_keys/${hash(snapshot)}`);
        const placementId = await this.db.runTransaction(async tx => {
          const key = await tx.get(keyRef);
          if (key.exists) return String(key.data()!.placementId);
          const value = opaque();
          tx.create(this.db.doc(`campaign_placements/${value}`), { ...snapshot, id: value, createdAt: this.timestamp() });
          tx.create(keyRef, { placementId: value, orgId: s.orgId }); return value;
        });
        placements.push({ placementId, tileId: tile.id, slideId, slideVersion: snapshot.slideVersion, redirectUrl: `${this.origin}/r/${placementId}` });
      }
    }
    requireValue(placements.length <= 200, 'A manifest can contain at most 200 measured placements.');
    return { placements, warnings, mode: s.mode, serverTime: this.now() };
  }

  private event(a: Attribution, type: string, metrics: Counts, occurredAt = this.now(), cohortMetrics: Counts = {}, cohortAt = occurredAt) {
    return {
      schemaVersion: 1, orgId: a.orgId, campaignId: a.campaignId, campaignName: a.campaignName,
      locationId: a.locationId, locationName: a.locationName, screenId: a.screenId, screenName: a.screenName,
      slideId: a.slideId, tileId: a.tileId, revisionId: a.revisionId, timezone: a.timezone, mode: a.mode,
      type, metrics, cohortMetrics, occurredAt: Timestamp.fromMillis(occurredAt), cohortAt: Timestamp.fromMillis(cohortAt),
      receivedAt: this.timestamp(), expireAt: this.expires(RAW_RETENTION_DAYS), projectedAt: null,
    };
  }

  async ingest(uid: string, input: unknown) {
    const data = object(input);
    requireValue(Array.isArray(data.buckets) && data.buckets.length > 0 && data.buckets.length <= 25, 'Send 1–25 playback buckets.');
    await this.rate(`ingest:${uid}`, 120);
    const accepted: string[] = []; const rejected: { key: string; reason: string }[] = [];
    for (const value of data.buckets) {
      let bucket: Bucket;
      try { bucket = validateBucket(value, this.now()); }
      catch (error) { const b = value as Bucket; rejected.push({ key: `${b.sessionId}:${b.placementId}:${b.windowStart}`, reason: error instanceof Error ? error.message : 'Invalid bucket' }); continue; }
      const key = `${bucket.sessionId}:${bucket.placementId}:${bucket.windowStart}`;
      try {
        const s = await this.checkedSession(uid, bucket.sessionId);
        requireValue(bucket.windowStart + MINUTE >= asMillis(s.createdAt), 'Bucket predates this session.');
        requireValue(bucket.visibleMs <= Math.min(MINUTE, Math.max(0, this.now() - bucket.windowStart) + 2000), 'Bucket duration exceeds elapsed time.');
        const p = (await this.db.doc(`campaign_placements/${bucket.placementId}`).get()).data() as Placement | undefined;
        requireValue(p && p.orgId === s.orgId && p.screenId === s.screenId && p.mode === s.mode, 'Placement is outside this player session.', 'permission-denied');
        requireValue(bucket.windowStart + MINUTE >= asMillis(p!.createdAt), 'Bucket predates this placement.');
        // Device + placement + minute, rather than random request IDs, bounds duplicate tabs and retry replays.
        const bucketId = hash(s.deviceId, bucket.placementId, bucket.windowStart, s.mode);
        await this.db.runTransaction(async tx => {
          const ref = this.db.doc(`measurement_buckets/${bucketId}`); const previous = (await tx.get(ref)).data() || {};
          const delta = bucketDelta(previous, bucket);
          if (!delta.plays && !delta.visibleMs) return;
          const plays = Math.max(Number(previous.plays || 0), bucket.plays);
          const visibleMs = Math.max(Number(previous.visibleMs || 0), bucket.visibleMs);
          const eventId = hash(bucketId, plays, visibleMs);
          tx.set(ref, { orgId: s.orgId, placementId: bucket.placementId, sessionId: bucket.sessionId, windowStart: bucket.windowStart, plays, visibleMs, expireAt: this.expires(98) });
          tx.create(this.db.doc(`measurement_events/${eventId}`), { ...this.event(p!, 'playback_bucket', delta, bucket.windowStart), placementId: bucket.placementId, bucketId });
        });
        accepted.push(key);
      } catch (error) {
        if (!(error instanceof MeasurementError)) throw error;
        rejected.push({ key, reason: error.message });
      }
    }
    return { accepted, rejected };
  }

  async placement(placementId: string): Promise<Placement> {
    const snap = await this.db.doc(`campaign_placements/${id(placementId)}`).get(); const p = snap.data() as Placement | undefined;
    requireValue(p, 'This QR link is unavailable.', 'not-found');
    const campaign = (await this.db.doc(`measurement_campaigns/${p!.campaignId}`).get()).data();
    requireValue(campaign?.status === 'active' && campaign.orgId === p!.orgId, 'This campaign has ended or is paused.', 'failed-precondition');
    return p!;
  }

  async scan(p: Placement) {
    const token = opaque(); const guestId = hash(token); const eventId = hash(guestId, 'scan');
    const batch = this.db.batch();
    batch.create(this.db.doc(`measurement_events/${eventId}`), { ...this.event(p, 'scan', { scans: 1 }, this.now(), p.kind === 'external' ? {} : { cohortScans: 1 }), placementId: p.id });
    if (p.kind !== 'external') batch.create(this.db.doc(`measurement_guests/${guestId}`), {
      placementId: p.id, startedAt: this.timestamp(), expireAt: this.expires(1), actions: {}, engaged: false, submitted: false,
    });
    await batch.commit();
    return p.kind === 'external' ? p.destinationUrl : `${this.origin}/engage/${p.id}#${token}`;
  }

  async guest(token: string) {
    id(token);
    const snap = await this.db.doc(`measurement_guests/${hash(token)}`).get(); const guest = snap.data();
    requireValue(guest && asMillis(guest.expireAt) > this.now(), 'This engagement session has expired. Scan the QR again.', 'permission-denied');
    return { guest: guest!, placement: await this.placement(guest!.placementId) };
  }

  async engagement(token: string) {
    const { guest, placement: p } = await this.guest(token);
    const survey = p.surveyId ? (await this.db.doc(`measurement_surveys/${p.surveyId}`).get()).data() : null;
    return { name: p.campaignName, kind: p.kind, ctaLabel: p.ctaLabel, questions: (survey?.questions || []) as Question[], thankYouMessage: p.thankYouMessage, submitted: !!guest.submitted, mode: p.mode };
  }

  private async guestTransaction(token: string, run: (tx: Transaction, guest: DocumentData, p: Placement) => Promise<unknown>) {
    const { placement: p } = await this.guest(token);
    return this.db.runTransaction(async tx => {
      const guestRef = this.db.doc(`measurement_guests/${hash(token)}`); const snapshot = await tx.get(guestRef); const g = snapshot.data();
      requireValue(g && asMillis(g.expireAt) > this.now(), 'Scan the QR again to start a new session.', 'permission-denied');
      return run(tx, g!, p);
    });
  }

  async action(token: string, action: string) {
    const fields: Record<string, string> = { landing_view: 'landingViews', cta_click: 'ctaClicks', offer_reveal: 'offerReveals', offer_copy: 'offerCopies', survey_start: 'surveyStarts' };
    requireValue(Object.prototype.hasOwnProperty.call(fields, action), 'Unsupported action.');
    return this.guestTransaction(token, async (tx, g, p) => {
      requireValue(!action.startsWith('offer_') || p.kind === 'offer', 'This campaign has no offer.');
      requireValue(action !== 'survey_start' || p.kind === 'survey', 'This campaign has no survey.');
      requireValue(action !== 'cta_click' || !!p.destinationUrl, 'This campaign has no outbound action.');
      requireValue(action !== 'offer_copy' || g.actions?.offer_reveal, 'Reveal the offer first.');
      if (!g.actions?.[action]) {
        const isAction = action !== 'landing_view';
        const metrics: Counts = { [fields[action]]: 1 };
        const cohort: Counts = {};
        if (isAction) { metrics.actions = 1; if (!g.engaged) cohort.cohortEngaged = 1; }
        if (action === 'survey_start') cohort.cohortSurveyStarts = 1;
        tx.create(this.db.doc(`measurement_events/${hash(hash(token), action)}`), {
          ...this.event(p, action, metrics, this.now(), cohort, asMillis(g.startedAt)), placementId: p.id,
        });
        tx.update(this.db.doc(`measurement_guests/${hash(token)}`), { [`actions.${action}`]: true, engaged: !!g.engaged || isAction });
      }
      return { success: true, destinationUrl: action === 'cta_click' ? p.destinationUrl : '', offerCode: action.startsWith('offer_') ? p.offerCode : '' };
    });
  }

  async submit(token: string, answers: unknown) {
    return this.guestTransaction(token, async (tx, g, p) => {
      requireValue(p.kind === 'survey' && p.surveyId, 'This QR is not a survey.');
      const survey = (await tx.get(this.db.doc(`measurement_surveys/${p.surveyId}`))).data();
      requireValue(survey?.orgId === p.orgId, 'Survey is unavailable.', 'not-found');
      const validated = validateAnswers(survey!.questions as Question[], answers);
      const fingerprint = hash(validated.answers);
      if (g.submitted) {
        requireValue(g.responseHash === fingerprint, 'This session already submitted a different response.', 'failed-precondition');
        return { success: true, duplicate: true };
      }
      const metrics: Counts = { ...validated.metrics, surveySubmits: 1 };
      const cohort: Counts = { cohortSurveySubmits: 1 };
      if (!g.actions?.survey_start) { metrics.surveyStarts = 1; cohort.cohortSurveyStarts = 1; }
      if (!g.engaged) cohort.cohortEngaged = 1;
      const responseId = hash(hash(token), 'response');
      tx.create(this.db.doc(`measurement_responses/${responseId}`), {
        orgId: p.orgId, campaignId: p.campaignId, placementId: p.id, locationId: p.locationId, screenId: p.screenId,
        surveyId: p.surveyId, surveyVersion: survey!.version, mode: p.mode, answers: validated.answers,
        scores: validated.metrics, submittedAt: this.timestamp(), expireAt: this.expires(180),
      });
      tx.create(this.db.doc(`measurement_events/${hash(hash(token), 'submit')}`), {
        ...this.event(p, 'survey_submit', metrics, this.now(), cohort, asMillis(g.startedAt)), placementId: p.id, responseId,
      });
      tx.update(this.db.doc(`measurement_guests/${hash(token)}`), { submitted: true, responseHash: fingerprint, engaged: true, 'actions.survey_start': true });
      return { success: true, duplicate: false };
    });
  }

  /** Receipt and all six projections commit atomically. Trigger retries and reordering cannot inflate totals. */
  async project(eventId: string) {
    id(eventId);
    await this.db.runTransaction(async tx => {
      const eventRef = this.db.doc(`measurement_events/${eventId}`); const receiptRef = this.db.doc(`measurement_receipts/${eventId}`);
      const [eventSnap, receipt] = await Promise.all([tx.get(eventRef), tx.get(receiptRef)]);
      if (!eventSnap.exists || receipt.exists || eventSnap.data()?.projectedAt) return;
      const e = eventSnap.data()!;
      const portions = [{ at: asMillis(e.occurredAt), counts: e.metrics as Counts }, { at: asMillis(e.cohortAt), counts: e.cohortMetrics as Counts }];
      const writes = new Map<string, { metadata: DocumentData; counts: Counts; hours: Record<string, Counts> }>();
      for (const portion of portions) {
        if (!Object.keys(portion.counts).length) continue;
        const { date, hour } = localTime(portion.at, e.timezone);
        for (const row of scopeRows(e as Attribution)) {
          // Include location identity for screen scopes: moving a screen must not merge two locations' history.
          const key = hash(e.mode, e.orgId, date, row.scope, row.scopeId, row.locationId);
          const write = writes.get(key) || { metadata: {
            ...row, orgId: e.orgId, mode: e.mode, date,
            campaignName: row.campaignId ? e.campaignName : '', locationName: row.locationId ? e.locationName : '', screenName: row.screenId ? e.screenName : '',
          }, counts: {}, hours: {} };
          addCounts(write.counts, portion.counts); addCounts(write.hours[hour] ||= {}, portion.counts); writes.set(key, write);
        }
      }
      for (const [key, write] of writes) {
        const increments = (counts: Counts) => Object.fromEntries(Object.entries(counts).map(([field, value]) => [field, FieldValue.increment(value)]));
        tx.set(this.db.doc(`measurement_daily/${key}`), {
          ...write.metadata, counts: increments(write.counts), hours: Object.fromEntries(Object.entries(write.hours).map(([hour, counts]) => [hour, increments(counts)])), updatedAt: this.timestamp(),
        }, { merge: true });
      }
      tx.create(receiptRef, { orgId: e.orgId, expireAt: Timestamp.fromMillis(asMillis(e.receivedAt) + 98 * DAY) });
      tx.update(eventRef, { projectedAt: this.timestamp() });
    });
  }

  async reconcile() {
    const pending = await this.db.collection('measurement_events').where('projectedAt', '==', null).orderBy('receivedAt').limit(100).get();
    for (const event of pending.docs) await this.project(event.id);
    return { processed: pending.size };
  }

  async dashboard(uid: string, raw: unknown) {
    const data = object(raw); const orgId = id(data.orgId); const permission = await this.access(uid, orgId);
    await this.rate(`dashboard:${uid}`, 30);
    const from = text(data.from, 10); const to = text(data.to, 10);
    requireValue(/^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && Number.isFinite(Date.parse(from)) && Number.isFinite(Date.parse(to)) && from <= to && Date.parse(to) - Date.parse(from) <= 93 * DAY, 'Choose a valid date range of at most 93 days.');
    const mode: Mode = data.mode === 'test' ? 'test' : 'live';
    const campaignFilter = data.campaignId ? id(data.campaignId) : '';
    const locationFilter = data.locationId ? id(data.locationId) : '';
    if (locationFilter && permission.locations) requireValue(permission.locations.includes(locationFilter), 'Location access denied.', 'permission-denied');
    const query = this.db.collection('measurement_daily').where('orgId', '==', orgId).where('mode', '==', mode).where('scope', '==', 'campaign_screen').where('date', '>=', from).where('date', '<=', to).orderBy('date').limit(1000);
    const records: DocumentData[] = []; let page = await query.get(); let pages = 0;
    while (page.size) {
      for (const doc of page.docs) {
        const row = doc.data();
        if (permission.locations && !permission.locations.includes(row.locationId)) continue;
        if (campaignFilter && row.campaignId !== campaignFilter) continue;
        if (locationFilter && row.locationId !== locationFilter) continue;
        records.push(row);
      }
      pages++; if (page.size < 1000) break;
      requireValue(pages < 20, 'Narrow the date range to load this report; no totals have been truncated.', 'resource-exhausted');
      page = await query.startAfter(page.docs[page.size - 1]).get();
    }
    const totals: Counts = {}; const daily: Record<string, Counts> = {}; const hours: Record<string, Counts> = {};
    const groups: Record<string, Record<string, { id: string; name: string; locationId?: string; counts: Counts }>> = { campaigns: {}, locations: {}, screens: {} };
    let updatedAt: number | null = null;
    for (const r of records) {
      addCounts(totals, r.counts); addCounts(daily[r.date] ||= {}, r.counts);
      for (const [hour, counts] of Object.entries(r.hours || {})) addCounts(hours[hour] ||= {}, counts as Counts);
      for (const [group, key, name] of [['campaigns', r.campaignId, r.campaignName], ['locations', r.locationId, r.locationName], ['screens', `${r.locationId}:${r.screenId}`, r.screenName]]) {
        const row = groups[group][key] ||= { id: key, name, ...(group === 'screens' ? { locationId: r.locationId } : {}), counts: {} };
        addCounts(row.counts, r.counts);
      }
      updatedAt = Math.max(updatedAt || 0, asMillis(r.updatedAt));
    }
    let campaigns: DocumentData[] = [];
    if (permission.locations === null) {
      const snap = await this.db.collection('measurement_campaigns').where('orgId', '==', orgId).limit(201).get();
      requireValue(snap.size <= 200, 'Campaign library exceeds this view. Archive/export before adding more campaigns.', 'resource-exhausted');
      campaigns = snap.docs.map(doc => { const c = doc.data(); return { id: doc.id, name: c.name, kind: c.kind, status: c.status, questions: c.questions || [], surveyId: c.surveyId || '' }; });
    } else campaigns = Object.values(groups.campaigns).map(row => ({ id: row.id, name: row.name }));
    return {
      totals, daily: Object.entries(daily).map(([date, counts]) => ({ date, counts })), hourly: Object.entries(hours).sort(([a], [b]) => a.localeCompare(b)).map(([hour, counts]) => ({ hour, counts })),
      campaignRows: Object.values(groups.campaigns), locationRows: Object.values(groups.locations), screenRows: Object.values(groups.screens), campaigns,
      updatedAt, mode, admin: permission.admin, restrictedLocations: permission.locations, source: 'server_daily_aggregates',
    };
  }
}
