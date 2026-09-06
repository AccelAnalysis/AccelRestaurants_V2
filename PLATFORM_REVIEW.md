# Platform Comprehensive Review

## Critical Issues

### 1. Incomplete Stripe Payment Connection
**Severity: High**
- **Missing Webhooks:** The backend functions (`functions/src/index.ts`) lack a Stripe Webhook handler. This is critical for:
  - Verifying successful payments securely (instead of relying on client-side redirects).
  - Handling subscription renewals, cancellations, and failed payments.
  - Syncing Stripe status with Firestore (e.g., updating `org.plan` status).
- **Configuration:** The Stripe initialization uses a hardcoded placeholder (`<Stripe test-key placeholder>`) if the environment variable is missing.
- **Invalid API Version:** The configuration uses `apiVersion: '2025-12-15.clover'`, which appears to be invalid or a placeholder.

### 2. Authentication & Session Persistence
**Severity: Medium (Expected Behavior but confusing)**
- **Observation:** Navigating to `/admin` without explicit login grants access to an existing account (e.g., "World Tour" organization).
- **Cause:** Firebase Authentication persists user sessions in the browser (IndexedDB/LocalStorage) by default. If a previous session exists, `useAuthListener` automatically restores the user state and redirects to the dashboard.
- **Recommendation:** This is standard "Keep me signed in" behavior. To force a login prompt for testing, use an Incognito window or add a visible "Sign Out" button in the dev tools/admin dashboard.

## Security & Rules Review

### 3. Firestore Rules (`firestore.rules`)
- **Public Read Access:**
  - `match /organizations/{orgId} { allow read: if true; }`: This exposes all organization metadata (name, plan, ownerId) to the public. While potentially necessary for some player functionality, it is a data leak risk.
  - `match /screens/{screenId} { allow read: if true; }`: Allows anyone with a screen ID to read its configuration.
- **Recommendations:**
  - Restrict `organizations` read access to `isOrgMember(orgId)` except for specific public fields needed by players (consider a separate `public_org_info` collection or specific queries).

### 4. Hardcoded Credentials & Secrets
- **Pairing Code:** `functions/src/index.ts` contains a hardcoded pairing code check: `if (pairingCode !== '882194')`. This bypasses database validation.
- **Mock Services:**
  - **Email:** Falls back to console logging (Mock Mode) if `SENDGRID_API_KEY` is missing.
  - **WebSockets:** `createScreenSession` returns `wss://echo.websocket.org` instead of a real real-time service (e.g., Ably, Pusher, or custom WS server).

## Codebase Findings

### 5. Missing Implementations
- **Real-time Triggers:** The `fireTrigger` function in `index.ts` is a stub and does not execute any actual logic.
- **Environment Variables:**
  - Ensure `STRIPE_SECRET_KEY` and `SENDGRID_API_KEY` are set in the Firebase Functions environment (`firebase functions:config:set ...`).
  - Ensure `VITE_FIREBASE_...` keys are set for the frontend build.

### 6. TODOs and Code Cleanup
- **Onboarding:** `src/pages/OnboardingPage.tsx` (Line 303): `// TODO: Change to /onboarding/success to show Step 4?` - Indicates unfinished UI flow logic.
- **Functions:** `functions/src/index.ts`:
  - Uses `process.env` directly. Ensure `dotenv` is configured if running locally, or use `functions.config()` for Firebase environment variables.

## Recommendations for Deployment

1.  **Implement Stripe Webhooks:** Create a new function `exports.stripeWebhook` to handle `checkout.session.completed` and `invoice.payment_succeeded` events.
2.  **Secure Database Rules:** Tighten public read access on `organizations`.
3.  **Environment Setup:** Create a setup script or documentation for setting required API keys.
4.  **Remove Hardcoded Values:** Replace the hardcoded pairing code with a DB lookup.
5.  **Real-time Service:** Replace the echo WebSocket with a production-ready real-time solution (or Firestore `onSnapshot` listeners if latency permits).
