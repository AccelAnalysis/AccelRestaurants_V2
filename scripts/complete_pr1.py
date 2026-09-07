from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one occurrence, found {count}: {old[:120]!r}")
    write(path, text.replace(old, new, 1))


def replace_between(path: str, start: str, end: str, new: str) -> None:
    text = read(path)
    i = text.find(start)
    if i < 0:
        raise SystemExit(f"{path}: start marker not found: {start[:120]!r}")
    j = text.find(end, i)
    if j < 0:
        raise SystemExit(f"{path}: end marker not found: {end[:120]!r}")
    write(path, text[:i] + new + text[j:])


# ----- Cloud Functions security -----
f = 'functions/src/index.ts'
replace_once(
    f,
    "import * as crypto from 'crypto';\n",
    "import * as crypto from 'crypto';\nimport { promises as dns } from 'node:dns';\nimport * as net from 'node:net';\n",
)
replace_once(
    f,
    "  functions.logger.info(`New user signed up: ${user.uid} (${user.email})`);\n\n",
    "  functions.logger.info(`New user signed up: ${user.uid} (${user.email})`);\n\n"
    "  // Anonymous authentication is used by signage players. Player identities must\n"
    "  // never receive a restaurant organization or tenant-level privileges.\n"
    "  if (user.providerData.length === 0 && !user.email) {\n"
    "    functions.logger.info(`Anonymous player identity ${user.uid}; skipping organization provisioning`);\n"
    "    return;\n"
    "  }\n\n",
)
replace_once(
    f,
    "async function isSuperAdminUid(uid: string): Promise<boolean> {\n",
    "async function isOrgMemberUid(uid: string, orgId: string): Promise<boolean> {\n"
    "  const orgDoc = await db.doc(`organizations/${orgId}`).get();\n"
    "  if (!orgDoc.exists) return false;\n"
    "  const orgData = orgDoc.data();\n"
    "  if (orgData?.ownerId === uid || (Array.isArray(orgData?.members) && orgData?.members.includes(uid))) {\n"
    "    return true;\n"
    "  }\n"
    "  const memberDoc = await db.doc(`organizations/${orgId}/members/${uid}`).get();\n"
    "  return memberDoc.exists && memberDoc.data()?.status !== 'deactivated';\n"
    "}\n\n"
    "async function isSuperAdminUid(uid: string): Promise<boolean> {\n",
)
replace_once(
    f,
    "  batch.set(userRef, {\n"
    "    orgId: orgId, // Set primary org\n"
    "    platformRole: inviteData.role === 'orgAdmin' ? 'admin' : 'user', \n"
    "    updatedAt: admin.firestore.Timestamp.now()\n"
    "  }, { merge: true });\n",
    "  batch.set(userRef, {\n"
    "    orgId: orgId, // Set primary org. Organization roles live only in membership docs.\n"
    "    updatedAt: admin.firestore.Timestamp.now()\n"
    "  }, { merge: true });\n",
)
replace_once(
    f,
    "\n  // Update User Profile (platformRole echo)\n"
    "  await db.doc(`users/${uid}`).update({\n"
    "    platformRole: role === 'orgAdmin' ? 'admin' : 'user'\n"
    "  });\n",
    "\n  // Platform roles are intentionally not derived from organization roles.\n",
)
replace_once(
    f,
    "  // 3. Update User Profile (unlink)\n"
    "  batch.update(userRef, {\n"
    "    orgId: admin.firestore.FieldValue.delete(),\n"
    "    platformRole: 'user' // Default back to user\n"
    "  });\n",
    "  // 3. Update User Profile (unlink). Preserve any platform-level role.\n"
    "  batch.update(userRef, {\n"
    "    orgId: admin.firestore.FieldValue.delete(),\n"
    "    updatedAt: admin.firestore.Timestamp.now()\n"
    "  });\n",
)

stripe_connect = '''export const createStripeConnectAccountLink = functions.runWith({ secrets: [stripeSecretKey] }).https.onCall(async (data: { designerId: string; returnUrl: string }, context: CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { designerId, returnUrl } = data;
  if (!designerId || !returnUrl) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing designer ID or return URL.');
  }

  const isSuperAdmin = await isSuperAdminUid(context.auth.uid);
  if (designerId !== context.auth.uid && !isSuperAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'You can only connect your own designer payout account.');
  }

  const designerRef = db.doc(`designers/${designerId}`);
  const designerDoc = await designerRef.get();
  if (!designerDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Designer profile not found.');
  }

  try {
    let accountId = designerDoc.data()?.stripeAccountId as string | undefined;
    if (!accountId) {
      const account = await getStripe().accounts.create({
        type: 'express',
        country: 'US',
        email: designerDoc.data()?.email || context.auth.token.email,
        capabilities: {
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      await designerRef.update({
        stripeAccountId: accountId,
        updatedAt: admin.firestore.Timestamp.now()
      });
    }

    const accountLink = await getStripe().accountLinks.create({
      account: accountId,
      refresh_url: returnUrl + '?refresh=true',
      return_url: returnUrl + '?success=true',
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  } catch (error: unknown) {
    functions.logger.error('Stripe Connect Error:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Failed to create account link.');
  }
});

'''
replace_between(f, 'export const createStripeConnectAccountLink', 'export const payoutDesigner', stripe_connect)

create_session = '''export const createScreenSession = onCall(async (data: { screenId: string }, context: CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Player authentication is required.');
  }

  const { screenId } = data;
  if (!screenId) throw new functions.https.HttpsError('invalid-argument', 'Missing screenId');

  const screenRef = db.doc(`screens/${screenId}`);
  const screenDoc = await screenRef.get();
  if (!screenDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Screen not found.');
  }

  const screenSessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
  await screenRef.update({
    lastHeartbeatAt: admin.firestore.Timestamp.now(),
    activeSessionId: screenSessionId
  });
  await db.doc(`screen_sessions/${screenSessionId}`).set({
    screenId,
    authUid: context.auth.uid,
    createdAt: admin.firestore.Timestamp.now(),
    isActive: true,
    lastHeartbeat: admin.firestore.Timestamp.now()
  });

  return {
    screenSessionId,
    mode: 'firestore'
  };
});

'''
replace_between(f, 'export const createScreenSession', 'export const sendHeartbeat', create_session)
replace_once(
    f,
    "export const sendHeartbeat = onCall(async (data: { screenId: string }, context: CallableContext) => {\n"
    "  void context;\n"
    "  const { screenId } = data;\n",
    "export const sendHeartbeat = onCall(async (data: { screenId: string }, context: CallableContext) => {\n"
    "  if (!context.auth) {\n"
    "    throw new functions.https.HttpsError('unauthenticated', 'Player authentication is required.');\n"
    "  }\n"
    "  const { screenId } = data;\n",
)

request_pair = '''export const requestPairingCode = onCall(async (data: { screenId: string }, context: CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Player authentication is required.');
  }

  const { screenId } = data;
  if (!screenId) throw new functions.https.HttpsError('invalid-argument', 'Missing screenId');

  const screenRef = db.doc(`screens/${screenId}`);
  const screenDoc = await screenRef.get();
  if (!screenDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Screen not found.');
  }
  if (screenDoc.data()?.orgId) {
    throw new functions.https.HttpsError('failed-precondition', 'Screen is already paired.');
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 15 * 60 * 1000);

  await db.collection('pairing_codes').doc(code).set({
    code,
    screenId,
    requestedByAuthUid: context.auth.uid,
    expiresAt,
    createdAt: admin.firestore.Timestamp.now()
  });

  return { code, expiresAt: expiresAt.toMillis() };
});

'''
replace_between(f, 'export const requestPairingCode', 'export const validatePairing', request_pair)

validate_pair = '''export const validatePairing = onCall(async (data: { screenId: string; pairingCode: string }, context: CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }
  if (context.auth.token.firebase?.sign_in_provider === 'anonymous') {
    throw new functions.https.HttpsError('permission-denied', 'Sign in with your restaurant account to pair a screen.');
  }

  const { screenId, pairingCode } = data;
  if (!screenId || !pairingCode) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing screen ID or pairing code.');
  }

  const codeDoc = await db.collection('pairing_codes').doc(pairingCode).get();
  if (!codeDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Invalid pairing code.');
  }

  const codeData = codeDoc.data();
  if (!codeData?.expiresAt?.toMillis || codeData.expiresAt.toMillis() < Date.now()) {
    throw new functions.https.HttpsError('failed-precondition', 'Pairing code expired.');
  }
  if (codeData.screenId !== screenId) {
    throw new functions.https.HttpsError('permission-denied', 'Pairing code does not match this screen.');
  }

  const userDoc = await db.doc(`users/${context.auth.uid}`).get();
  const orgId = userDoc.data()?.orgId;
  if (!orgId || !(await isOrgMemberUid(context.auth.uid, orgId))) {
    throw new functions.https.HttpsError('failed-precondition', 'User does not belong to an organization.');
  }

  const screenRef = db.doc(`screens/${screenId}`);
  const screenDoc = await screenRef.get();
  if (!screenDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Screen not found.');
  }
  if (screenDoc.data()?.orgId) {
    throw new functions.https.HttpsError('failed-precondition', 'Screen is already paired.');
  }

  const activeSessionId = screenDoc.data()?.activeSessionId as string | undefined;
  if (!activeSessionId) {
    throw new functions.https.HttpsError('failed-precondition', 'Screen is not ready for pairing. Refresh the player and try again.');
  }

  await screenRef.set({
    orgId,
    isActive: true,
    lastHeartbeatAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    pairedAt: admin.firestore.Timestamp.now(),
    pairedBy: context.auth.uid
  }, { merge: true });
  await codeDoc.ref.delete();

  return {
    success: true,
    screenSessionId: activeSessionId
  };
});

'''
replace_between(f, 'export const validatePairing', 'export const fireTrigger', validate_pair)

fire_trigger = '''export const fireTrigger = onCall(async (data: {
  screenSessionId: string;
  triggerType: string;
  campaignId: string;
  payload: Record<string, unknown>;
}, context: CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { screenSessionId, triggerType, campaignId, payload } = data;
  if (!screenSessionId || !triggerType || !campaignId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing trigger parameters.');
  }

  const sessionDoc = await db.doc(`screen_sessions/${screenSessionId}`).get();
  if (!sessionDoc.exists || sessionDoc.data()?.isActive === false) {
    throw new functions.https.HttpsError('not-found', 'Screen session not found.');
  }

  const sessionScreenId = sessionDoc.data()?.screenId as string | undefined;
  if (!sessionScreenId) {
    throw new functions.https.HttpsError('failed-precondition', 'Screen session is invalid.');
  }

  const screenDoc = await db.doc(`screens/${sessionScreenId}`).get();
  const orgId = screenDoc.data()?.orgId as string | undefined;
  if (!screenDoc.exists || !orgId || !(await isOrgMemberUid(context.auth.uid, orgId))) {
    throw new functions.https.HttpsError('permission-denied', 'You do not have access to this screen session.');
  }

  try {
    await db.collection(`screen_sessions/${screenSessionId}/triggers`).add({
      type: triggerType,
      campaignId,
      payload: payload || {},
      createdAt: admin.firestore.Timestamp.now(),
      processed: false
    });
    return { success: true };
  } catch (error) {
    functions.logger.error('Trigger Error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fire trigger.');
  }
});

'''
replace_between(f, 'export const fireTrigger', '// Remove duplicate stripe init', fire_trigger)

feed_helpers = r'''const FEED_PROXY_MAX_BYTES = 1024 * 1024;
const FEED_PROXY_WINDOW_MS = 60_000;
const FEED_PROXY_MAX_REQUESTS = 30;

function isPrivateOrLocalAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b, c] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || (b === 0 && c <= 2))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224;
  }

  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    if (normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || /^fe[89ab]/.test(normalized)) {
      return true;
    }
    if (normalized.startsWith('::ffff:')) {
      const mapped = normalized.slice(7);
      return net.isIPv4(mapped) ? isPrivateOrLocalAddress(mapped) : true;
    }
  }

  return false;
}

async function validateExternalFeedUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new functions.https.HttpsError('invalid-argument', 'Feed URL is invalid.');
  }

  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new functions.https.HttpsError('invalid-argument', 'Feed URLs must use HTTPS and cannot contain credentials.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname === 'metadata.google.internal') {
    throw new functions.https.HttpsError('permission-denied', 'Local network feed URLs are not allowed.');
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrLocalAddress(hostname)) {
      throw new functions.https.HttpsError('permission-denied', 'Private network feed URLs are not allowed.');
    }
    return parsed;
  }

  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new functions.https.HttpsError('unavailable', 'Feed host could not be resolved.');
  }
  if (!addresses.length || addresses.some(result => isPrivateOrLocalAddress(result.address))) {
    throw new functions.https.HttpsError('permission-denied', 'Private network feed URLs are not allowed.');
  }

  return parsed;
}

async function enforceFeedProxyRateLimit(uid: string): Promise<void> {
  const ref = db.doc(`feed_proxy_usage/${uid}`);
  const now = Date.now();
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data();
    const windowStart = data?.windowStart?.toMillis?.() || 0;
    const inWindow = now - windowStart < FEED_PROXY_WINDOW_MS;
    const count = inWindow ? Number(data?.count || 0) : 0;
    if (count >= FEED_PROXY_MAX_REQUESTS) {
      throw new functions.https.HttpsError('resource-exhausted', 'Feed request limit reached. Try again shortly.');
    }
    transaction.set(ref, {
      windowStart: admin.firestore.Timestamp.fromMillis(inWindow ? windowStart : now),
      count: count + 1,
      updatedAt: admin.firestore.Timestamp.now()
    }, { merge: true });
  });
}

async function fetchExternalFeedText(rawUrl: string, context: CallableContext): Promise<string> {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication is required to fetch external feeds.');
  }

  await enforceFeedProxyRateLimit(context.auth.uid);
  const safeUrl = await validateExternalFeedUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(safeUrl, {
      redirect: 'error',
      signal: controller.signal,
      headers: { 'user-agent': 'AccelRestaurantsFeedProxy/1.0' }
    });
    if (!response.ok) {
      throw new functions.https.HttpsError('unavailable', `Feed returned HTTP ${response.status}.`);
    }

    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > FEED_PROXY_MAX_BYTES) {
      throw new functions.https.HttpsError('resource-exhausted', 'Feed response is too large.');
    }

    if (!response.body) return '';
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > FEED_PROXY_MAX_BYTES) {
        await reader.cancel();
        throw new functions.https.HttpsError('resource-exhausted', 'Feed response is too large.');
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8');
  } finally {
    clearTimeout(timeout);
  }
}

export const fetchRssFeed = onCall(async (data: { url: string }, context: CallableContext) => {
  const { url } = data;
  if (!url) throw new functions.https.HttpsError('invalid-argument', 'Missing URL');
  try {
    return { content: await fetchExternalFeedText(url, context) };
  } catch (error: unknown) {
    functions.logger.error(`Failed to fetch RSS feed ${url}:`, error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('unavailable', 'Failed to fetch feed.');
  }
});

export const fetchCalendarFeed = onCall(async (data: { url: string }, context: CallableContext) => {
  const { url } = data;
  if (!url) throw new functions.https.HttpsError('invalid-argument', 'Missing URL');
  try {
    return { content: await fetchExternalFeedText(url, context) };
  } catch (error: unknown) {
    functions.logger.error(`Failed to fetch calendar feed ${url}:`, error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('unavailable', 'Failed to fetch calendar.');
  }
});

'''
replace_between(f, 'export const fetchRssFeed', 'export const fetchSocialFeed', feed_helpers)

# ----- Firestore rules -----
r = 'firestore.rules'
replace_once(
    r,
    '      // Allow creation of the demo org or if user is authenticated (for new signups)\n      allow create: if request.auth != null; \n',
    '      // Organizations are provisioned by trusted backend code.\n      allow create: if false;\n',
)
replace_once(
    r,
    "      // Allow update by Org Admin or Super Admin\n"
    "      allow update: if isOrgAdmin(orgId) || (isOrgMember(orgId) && isScreenCountDeltaOnly());\n",
    "      function isSafeOrgAdminUpdate() {\n"
    "        return request.resource.data.diff(resource.data).changedKeys().hasNone([\n"
    "          'ownerId', 'members', 'plan', 'screenCount', 'purchasedScreens', 'purchasedSeats',\n"
    "          'stripeCustomerId', 'subscriptionId', 'subscriptionStatus', 'subscriptionPeriodEnd',\n"
    "          'cancelAtPeriodEnd', 'tileAccess', 'customLimits', 'createdAt'\n"
    "        ]);\n"
    "      }\n\n"
    "      // Billing, ownership, plan, and entitlement fields are backend/super-admin controlled.\n"
    "      allow update: if isSuperAdmin() ||\n"
    "        (isOrgAdmin(orgId) && isSafeOrgAdminUpdate()) ||\n"
    "        (isOrgMember(orgId) && isScreenCountDeltaOnly());\n",
)
replace_once(
    r,
    '      allow delete: if isOrgAdmin(orgId);\n',
    "      allow delete: if isSuperAdmin() || (request.auth != null && resource.data.ownerId == request.auth.uid);\n",
)
replace_once(
    r,
    '    match /organizations/{orgId}/{document=**} {\n      allow read: if isOrgMember(orgId);\n      allow write: if isOrgAdmin(orgId);\n    }\n',
    '    match /organizations/{orgId}/{document=**} {\n      allow read: if isOrgMember(orgId);\n      // Specific nested collection rules above grant the writes that are intended.\n      allow write: if false;\n    }\n',
)
replace_once(
    r,
    '      allow update, delete: if isOrgMember(resource.data.orgId);\n    }\n\n    // Menus\n',
    '      allow update: if isOrgMember(resource.data.orgId) && request.resource.data.orgId == resource.data.orgId;\n      allow delete: if isOrgMember(resource.data.orgId);\n    }\n\n    // Menus\n',
)
replace_once(
    r,
    '      allow update, delete: if isOrgMember(resource.data.orgId);\n    }\n\n    // Slides\n',
    '      allow update: if isOrgMember(resource.data.orgId) && request.resource.data.orgId == resource.data.orgId;\n      allow delete: if isOrgMember(resource.data.orgId);\n    }\n\n    // Slides\n',
)
replace_once(
    r,
    '      allow update, delete: if isOrgMember(resource.data.orgId);\n    }\n\n    // Campaigns\n',
    '      allow update: if isOrgMember(resource.data.orgId) && request.resource.data.orgId == resource.data.orgId;\n      allow delete: if isOrgMember(resource.data.orgId);\n    }\n\n    // Campaigns\n',
)
replace_once(
    r,
    '      allow update, delete: if isOrgMember(resource.data.orgId);\n    }\n\n    // Templates Collection\n',
    '      allow update: if isOrgMember(resource.data.orgId) && request.resource.data.orgId == resource.data.orgId;\n      allow delete: if isOrgMember(resource.data.orgId);\n    }\n\n    // Templates Collection\n',
)
users_block = '''    // Users Collection
    match /users/{userId} {
      allow read: if (request.auth != null && request.auth.uid == userId) || isSuperAdmin();
      // User documents are created by backend auth provisioning. Super admins may
      // manage platform roles; ordinary users may only edit profile fields.
      allow create: if isSuperAdmin();
      allow update: if isSuperAdmin() || (
        request.auth != null && request.auth.uid == userId &&
        request.resource.data.diff(resource.data).changedKeys().hasOnly([
          'displayName', 'photoURL', 'phoneNumber', 'timezone', 'jobTitle',
          'city', 'state', 'zipCode', 'lastLoginAt', 'updatedAt'
        ])
      );
      allow delete: if isSuperAdmin();
    }
'''
replace_between(r, '    // Users Collection\n    match /users/{userId} {', '    // Designers Collection', users_block + '\n')
designers_block = '''    // Designers Collection
    match /designers/{designerId} {
      allow read: if true;
      allow create: if isSuperAdmin();
      allow update: if isSuperAdmin() || (
        request.auth != null && request.auth.uid == designerId &&
        request.resource.data.diff(resource.data).changedKeys().hasOnly([
          'displayName', 'bio', 'specialties', 'portfolioUrl', 'portfolioItems', 'rates', 'updatedAt'
        ])
      );
      allow delete: if isSuperAdmin();
    }
'''
replace_between(r, '    // Designers Collection\n    match /designers/{designerId} {', '    // Designer Invites Collection', designers_block + '\n')
sessions_block = '''    // Screen Sessions Collection
    function ownsScreenSession(sessionId) {
      return request.auth != null &&
        exists(/databases/$(database)/documents/screen_sessions/$(sessionId)) &&
        get(/databases/$(database)/documents/screen_sessions/$(sessionId)).data.authUid == request.auth.uid;
    }

    match /screen_sessions/{sessionId} {
      allow get: if ownsScreenSession(sessionId) || isSuperAdmin();
      allow list: if false;
      allow create, update, delete: if false;

      match /triggers/{triggerId} {
        allow read: if ownsScreenSession(sessionId) || isSuperAdmin();
        allow update: if (ownsScreenSession(sessionId) || isSuperAdmin()) &&
          request.resource.data.diff(resource.data).changedKeys().hasOnly(['processed']) &&
          request.resource.data.processed == true;
        allow create, delete: if false;
      }
    }
'''
replace_between(r, '    // Screen Sessions Collection\n    match /screen_sessions/{sessionId} {', '    // System Email Templates', sessions_block + '\n')

# ----- Player authenticated display identity and real pairing QR -----
p = 'src/pages/PlayerScreen.tsx'
replace_once(p, "import { functions } from '../lib/firebase';\n", "import { auth, functions } from '../lib/firebase';\nimport { signInAnonymously } from 'firebase/auth';\n")
replace_once(p, "import { QrCode, Clock } from 'lucide-react';\n", "import { Clock } from 'lucide-react';\nimport { QRCodeSVG } from 'qrcode.react';\n")
replace_once(p, "  const [error, setError] = useState<string | null>(null);\n", "  const [error, setError] = useState<string | null>(null);\n  const [playerAuthReady, setPlayerAuthReady] = useState(false);\n")
replace_once(
    p,
    "  // Initialize Configs\n  useEffect(() => {\n",
    "  // Public signage uses a scoped anonymous Firebase identity for callable\n"
    "  // functions and the session trigger stream. Anonymous users are never provisioned\n"
    "  // with restaurant organizations by the backend.\n"
    "  useEffect(() => {\n"
    "    let cancelled = false;\n"
    "    const authenticatePlayer = async () => {\n"
    "      try {\n"
    "        if (!auth.currentUser) {\n"
    "          await signInAnonymously(auth);\n"
    "        }\n"
    "      } catch (err) {\n"
    "        console.error('Player authentication failed:', err);\n"
    "        if (!cancelled) setError('Player authentication failed');\n"
    "      } finally {\n"
    "        if (!cancelled) setPlayerAuthReady(true);\n"
    "      }\n"
    "    };\n"
    "    void authenticatePlayer();\n"
    "    return () => { cancelled = true; };\n"
    "  }, []);\n\n"
    "  // Initialize Configs\n  useEffect(() => {\n",
)
replace_once(
    p,
    "  useEffect(() => {\n    if (!screenId) return;\n\n    // Send initial heartbeat\n",
    "  useEffect(() => {\n    if (!screenId || !playerAuthReady) return;\n\n    // Send initial heartbeat\n",
)
replace_once(p, "  }, [screenId]);\n\n  // Subscribe to Screen Data\n", "  }, [screenId, playerAuthReady]);\n\n  // Subscribe to Screen Data\n")
replace_once(
    p,
    "  useEffect(() => {\n    if (!screenId) return;\n\n    const initSession = async () => {\n",
    "  useEffect(() => {\n    if (!screenId || !playerAuthReady) return;\n\n    const initSession = async () => {\n",
)
replace_once(p, "  }, [screenId]);\n\n  // Pairing Flow: Request Code if unpaired\n", "  }, [screenId, playerAuthReady]);\n\n  // Pairing Flow: Request Code if unpaired\n")
replace_once(
    p,
    "  useEffect(() => {\n    if (!screenId || !screen) return;\n    \n    // Check if paired (has orgId)\n",
    "  useEffect(() => {\n    if (!screenId || !screen || !playerAuthReady) return;\n    \n    // Check if paired (has orgId)\n",
)
replace_once(p, "  }, [screenId, screen, pairingCode]);\n", "  }, [screenId, screen, pairingCode, playerAuthReady]);\n")
replace_once(
    p,
    '                <QrCode size={200} className="text-black" />\n',
    '                <QRCodeSVG\n'
    "                  value={`${window.location.origin}/pair/${encodeURIComponent(screenId || '')}?code=${encodeURIComponent(pairingCode)}`}\n"
    '                  size={200}\n'
    '                  level="M"\n'
    '                  bgColor="#ffffff"\n'
    '                  fgColor="#000000"\n'
    '                  title="Scan to pair this screen"\n'
    '                />\n',
)
replace_once(p, '  if (loading) {\n', '  if (loading || !playerAuthReady) {\n')

# ----- Pairing page: require a real restaurant user, preserve redirect -----
pair = 'src/pages/PairingPage.tsx'
replace_once(pair, "import { useParams, useSearchParams } from 'react-router-dom';\n", "import { useNavigate, useParams, useSearchParams } from 'react-router-dom';\n")
replace_once(pair, "import { signInAnonymously } from 'firebase/auth';\n", "")
replace_once(pair, "import logo from '../assets/logo.png';\n", "import logo from '../assets/logo.png';\nimport { useAuthStore } from '../store/useAuthStore';\n")
replace_once(pair, "  const { screenId } = useParams();\n  const [searchParams] = useSearchParams();\n", "  const { screenId } = useParams();\n  const [searchParams] = useSearchParams();\n  const navigate = useNavigate();\n  const { user, loading: authLoading } = useAuthStore();\n")
replace_once(pair, "  const [status, setStatus] = useState<'initializing' | 'pairing' | 'paired' | 'error'>('initializing');\n", "  const [status, setStatus] = useState<'initializing' | 'signin' | 'pairing' | 'paired' | 'error'>('initializing');\n")
replace_once(pair, "    const startPairing = async () => {\n      if (!screenId || !pairingCode) {\n", "    const startPairing = async () => {\n      if (authLoading) return;\n      if (!screenId || !pairingCode) {\n")
replace_once(
    pair,
    "        return;\n      }\n\n      try {\n        setStatus('pairing');\n        \n        // 1. Ensure user is authenticated (Anonymously if needed)\n        if (!auth.currentUser) {\n          await signInAnonymously(auth);\n        }\n\n        const user = auth.currentUser;\n        if (!user) throw new Error('Authentication failed');\n\n        // 2. Validate Pairing via Callable Function\n",
    "        return;\n      }\n\n      if (!user || user.isAnonymous) {\n        setStatus('signin');\n        return;\n      }\n\n      try {\n        setStatus('pairing');\n        if (!auth.currentUser || auth.currentUser.isAnonymous) {\n          setStatus('signin');\n          return;\n        }\n\n        // Validate pairing with the authenticated restaurant account.\n",
)
replace_once(pair, "  }, [screenId, pairingCode]);\n", "  }, [screenId, pairingCode, user, authLoading]);\n")
replace_once(
    pair,
    "          </div>\n        ) : status === 'paired' ? (\n",
    "          </div>\n        ) : status === 'signin' ? (\n"
    "          <div className=\"space-y-6\">\n"
    "            <div className=\"w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto\">\n"
    "              <Smartphone size={40} />\n"
    "            </div>\n"
    "            <div>\n"
    "              <h1 className=\"text-2xl font-bold mb-2\">Sign in to Pair</h1>\n"
    "              <p className=\"text-text-muted\">Use your restaurant account so this screen is linked to the correct organization.</p>\n"
    "            </div>\n"
    "            <button\n"
    "              type=\"button\"\n"
    "              onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/pair/${screenId}?code=${pairingCode}`)}`)}\n"
    "              className=\"w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold transition-colors\"\n"
    "            >\n"
    "              Sign in to continue\n"
    "            </button>\n"
    "          </div>\n"
    "        ) : status === 'paired' ? (\n",
)

# ----- Login keeps the safe pairing return target -----
login = 'src/pages/LoginPage.tsx'
replace_once(login, "import { useNavigate } from 'react-router-dom';\n", "import { useNavigate, useSearchParams } from 'react-router-dom';\n")
replace_once(login, "  const navigate = useNavigate();\n", "  const navigate = useNavigate();\n  const [searchParams] = useSearchParams();\n")
replace_once(
    login,
    "      navigate('/onboarding');\n",
    "      const redirect = searchParams.get('redirect');\n"
    "      const safeRedirect = redirect && redirect.startsWith('/') && !redirect.startsWith('//')\n"
    "        ? redirect\n"
    "        : '/onboarding';\n"
    "      navigate(safeRedirect);\n",
)

# ----- Auth listener skips tenant provisioning expectations for player identities -----
auth_listener = 'src/hooks/useAuthListener.ts'
replace_once(
    auth_listener,
    "      if (user) {\n        setUser(user);\n        \n        try {\n",
    "      if (user) {\n"
    "        setUser(user);\n\n"
    "        if (user.isAnonymous) {\n"
    "          setUserProfile(null);\n"
    "          setOrganization(null);\n"
    "          setLoading(false);\n"
    "          return;\n"
    "        }\n"
    "        \n"
    "        try {\n",
)

# ----- HIG failure: accessible names for all rendered schedule time controls -----
se = 'src/components/organisms/ScreenEditor.tsx'
replace_once(
    se,
    '<input type="time" value={schedule.startTime}',
    '<input type="time" aria-label={`${key === \'schedule\' ? \'Screen audio schedule\' : \'Quiet hours\'} start time`} value={schedule.startTime}',
)
replace_once(
    se,
    '<input type="time" value={schedule.endTime || \'23:59\'}',
    '<input type="time" aria-label={`${key === \'schedule\' ? \'Screen audio schedule\' : \'Quiet hours\'} end time`} value={schedule.endTime || \'23:59\'}',
)

# HIG's Firebase Auth boundary must export the new player symbol even though
# the player route is not used by the focused editor fixture.
mock = 'tests/hig/firebase-auth.js'
replace_once(
    mock,
    "export const sendPasswordResetEmail = signInWithEmailAndPassword;\n",
    "export const sendPasswordResetEmail = signInWithEmailAndPassword;\n"
    "export const signInAnonymously = async () => ({ user: { uid: 'hig-player', isAnonymous: true } });\n",
)

print('One-shot PR fixes applied successfully.')
