import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v1/https';
import { createHash } from 'crypto';
import { validateStarter, assertStarterEntitled, buildRestaurantSlide } from './templates';

/** An idempotent, all-or-nothing content operation, never a billing or measurement operation. */
export const createRestaurantStarter = onCall(async (data: unknown, context) => {
  if (!context.auth || context.auth.token.firebase?.sign_in_provider === 'anonymous')
    throw new HttpsError('unauthenticated', 'Sign in to create restaurant content.');
  const body = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const orgId = body.orgId, requestId = body.requestId;
  if (typeof orgId !== 'string' || !/^[\w-]{1,128}$/.test(orgId) || typeof requestId !== 'string' || !/^[\w-]{8,64}$/.test(requestId) || typeof body.createScreen !== 'boolean')
    throw new HttpsError('invalid-argument', 'Provide an organization, request ID and screen choice.');
  let input: ReturnType<typeof validateStarter>;
  try { input = validateStarter(body.input); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Check your template details.'); }
  const createScreen = body.createScreen;
  const fingerprint = createHash('sha256').update(JSON.stringify({ input, createScreen })).digest('hex');
  const db = admin.firestore(), uid = context.auth.uid;
  const orgRef = db.doc(`organizations/${orgId}`);
  const memberRef = orgRef.collection('members').doc(uid);
  const receiptRef = orgRef.collection('cinematic_starts').doc(`${uid}_${requestId}`);
  // Stable across Firestore transaction retries, unguessable across unrelated submissions.
  const slideRef = db.collection('slides').doc(), screenRef = db.collection('screens').doc();
  const locationRef = orgRef.collection('locations').doc();
  return db.runTransaction(async transaction => {
    const [orgSnap, memberSnap, receipt] = await Promise.all([
      transaction.get(orgRef), transaction.get(memberRef), transaction.get(receiptRef),
    ]);
    const org = orgSnap.data();
    if (!org) throw new HttpsError('not-found', 'Organization not found.');
    const member = memberSnap.data(), owner = org.ownerId === uid;
    if (!owner && (!member || member.status !== 'active' || !['orgAdmin', 'user', 'designer'].includes(member.role)))
      throw new HttpsError('permission-denied', 'An active organization content role is required.');
    if (receipt.exists) {
      const saved = receipt.data()!;
      if (saved.fingerprint !== fingerprint) throw new HttpsError('already-exists', 'This request already created different content. Start a new design.');
      return saved.result;
    }
    try { assertStarterEntitled(org.plan, input); }
    catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'This feature is not included in your plan.'); }
    if (createScreen) {
      if (!owner && member?.role !== 'orgAdmin') throw new HttpsError('permission-denied', 'An organization administrator can set up the first screen. You can still create the slide.');
      const screens = await transaction.get(db.collection('screens').where('orgId', '==', orgId).limit(1));
      if (!screens.empty) throw new HttpsError('failed-precondition', 'Your organization already has a screen. Turn off “Set up my first screen” and assign the new slide in screen setup.');
    }
    const timestamp = admin.firestore.Timestamp.now();
    const slide = buildRestaurantSlide(input, orgId, slideRef.id);
    transaction.create(slideRef, { ...slide, createdAt: timestamp, updatedAt: timestamp });
    if (createScreen) {
      let timezone = typeof org.timezone === 'string' ? org.timezone : 'UTC';
      try { new Intl.DateTimeFormat('en', { timeZone: timezone }); } catch { timezone = 'UTC'; }
      transaction.create(locationRef, { orgId, name: org.name || input.brandName, timezone, createdAt: timestamp });
      transaction.create(screenRef, {
        orgId, locationId: locationRef.id, name: 'Main menu board', orientation: input.orientation,
        livePlaylist: [{ slideId: slideRef.id, duration: 12000, transition: 'none' }],
        rotationSettings: { algorithm: 'loop', transition: 'none', rotationMs: 12000 },
        // Content is ready, but screen activation/pairing stays with the existing screen workflow.
        isActive: false, createdAt: timestamp,
      });
      transaction.update(orgRef, { screenCount: 1, updatedAt: timestamp });
    }
    const result = { success: true, slideId: slideRef.id, ...(createScreen ? { screenId: screenRef.id, locationId: locationRef.id } : {}) };
    transaction.create(receiptRef, { fingerprint, result, createdAt: timestamp });
    return result;
  });
});
