# Customer journey integration and release

## Integration boundary

PR #4 landed on main at `dbb9b0cbb42f223aaab828adbb03447ca11a0a5e`. This repair includes that exact player-registration baseline. The universal `/display` entry point, logged-out activation return destination, registration service, measurement authorization, fullscreen behavior and player persistence remain owned by PR #4. Direct player URLs remain previews, not proof of activation.

The customer setup helper shares the Overview data request. It performs no timer polling and collapses when the registration service confirms an assigned display with saved design content. That means **display activated and design assigned**, not proof that a TV is powered on or visibly showing content. Reopen Screen setup or Check setup again to refresh. A durable first-visible-render milestone is not invented by this UI.

## Public plans versus billing authority

Plan comparison uses this hierarchy: validated server read, then a validated seven-day browser cache scoped to the Firebase project, then validated bundled bootstrap values. Public clients do not initialize or overwrite `system/plans`. Reads have a five-second timeout and share in-flight work. Cache entries have a schema version, timestamp, size bound and validation; unavailable browser storage does not prevent use. Failed refreshes do not overwrite the last successful catalogue. Successful administrator saves refresh the cache only after the server confirms the write.

Fallback displays explicitly say their plan details could not be refreshed. They are not advertised as a confirmed checkout quote. The UI never assigns paid access. The backend reads `system/plans.configs`, resolves price identifiers itself, validates actual Stripe recurring prices and charges only through authenticated checkout. The plan editor must maintain the correct deployed Stripe IDs; bootstrap placeholder IDs are not payment configuration.

Usage panels retain real screen/member counts, purchased extras, plan caps, explicit restaurant overrides and unlimited values. Missing counts remain blank instead of becoming zero. The general plan helper changes no server authorization or payment rules. Server-side capacity enforcement remains in its existing services/rules.

## Payment policy and compatibility

This UI repair does not introduce a delinquency policy. Active and trialing subscriptions use confirmed provider items. Past-due, unpaid, paused and incomplete subscriptions retain the organization's previously confirmed plan and purchased allowances, with a payment-attention status. They do not grant new paid access. Explicitly canceled or incomplete-expired subscriptions revert to Free and clear purchased extras. A separate commercial decision is required before automatic suspension is introduced.

Both the new `returnTo` request and a legacy checkout `successUrl` pointing to `/onboarding` return to setup on the configured canonical HTTPS origin. Browser return parameters never grant access. Existing subscriptions use the billing portal rather than duplicate checkout. Completed setup clears its short-lived intent so a later sign-in does not resume a finished purchase/design choice.

## Website behavior

The homepage retains one primary hero action, a dedicated non-autoplay 16:9 video region, three featured designs and a full navigation footer. Editable social links and the configured phone number appear in that footer. Common questions edited under Website content render on Plans, below the expandable feature/extras comparison, not as another homepage wall. Direct video addresses and MP4/WebM upload are supported; a YouTube page URL is not represented as a playable media file. Upload transport/rules validation is distinct from media codec/browser-playback validation.

The website-media rule allows public reads and platform-admin video uploads under 100 MB. The generic organization rule cannot bypass that restriction using an organization named `website`. Failed uploads preserve the previous configured video; upload completion still requires Save changes to publish its address.

## Exact deployment preflight

The release gate now distinguishes `backendCompatible` (the four handler contracts, actual Storage rules and validated authoritative catalogue) from overall `compatible`. The read-only probe cannot establish a Stripe checkout/webhook lifecycle or a playable homepage upload, so it reports both lifecycle fields as false and blocks release even if backend fingerprints match. There is intentionally no flag or editable success-file override. Integrating the real lifecycle suites and their independently checked observations remains required once a dedicated TEST environment is available; this change does not claim to implement that missing proof.

Server catalogue reads require unique, syntactically valid Stripe mappings for each paid base plan and configured add-on. Display-only fallback remains less restrictive so unavailable payment configuration cannot erase public pricing. Checkout checks Stripe's current subscriptions (with pagination) for legacy customers lacking a stored subscription ID and opens the portal for non-ended subscriptions before reading new-plan pricing. Provider lookup/portal failures never fall through to another purchase. Taxes and the commercial model are unchanged by this repair.

A Hosting preview is not a backend release. The same Firebase project may still run older Functions and Storage rules. `scripts/journey-release.mjs` computes a public fingerprint of the billing sources and Storage rule text. The Functions build generates the matching manifest. Read-only health requests to **each** affected callable and webhook verify the deployed code; a read-only Firebase Rules management request separately verifies the actually deployed Storage rules. No preflight creates a customer, starts a checkout, charges money or uploads into production.

`node scripts/journey-release.mjs --preview` records missing/mismatched dependencies and explicitly labels backend-dependent flows unverified while allowing visual preview review. `--release` fails if any handler, the actual rules, or the authoritative plan catalogue is unverified. The production Hosting workflow invokes this gate before publishing. The gate does not automatically deploy backend changes.

Release order for an authorized deployment owner:

1. Validate the server plan catalogue and current Stripe IDs in the intended environment, preserving existing subscriptions and historical price mappings.
2. Run the Functions build (generates `functions/src/journey/release.generated.ts`). Release `getSubscriptionPlans`, `createStripeCheckoutSession`, `createStripePortalSession` and `stripeWebhook`, then the reviewed Storage rules, to that same environment.
3. Supply `FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, and the environment's existing `FIREBASE_SERVICE_ACCOUNT` through secured environment settings; run `node scripts/journey-release.mjs --release`. Insufficient read permission is unverified, not success.
4. Exercise a complete Stripe test-mode lifecycle, including cancellation/return and confirmed allowance update, with test credentials before a commercial release. The read-only gate and synthetic tests do not certify this.
5. Publish the corresponding Hosting build only after compatibility passes. Roll back Hosting and backend together if their contract changes.

No production merge or deployment is authorized by the regression tests.

## Validation layers

- Source-service tests execute actual ConfigService/cache code with only SDK transport controlled. They cover live/cached/bootstrap, corrupt/expired/project-mismatched storage, storage denial and failed saves.
- Firebase emulator tests execute the real ConfigService and StorageService against isolated Auth/Firestore/Storage rules and real Functions handlers. They cover missing/invalid plan data, public-write refusal, upload permissions, progress, download URLs and contract probes. A tiny uploaded test file proves transport, not video decoding.
- Functions unit tests cover quoting, authorization, line items, return routes and delinquency transitions. Stripe is synthetic here: no charge is claimed.
- HIG browser tests exercise the real React components with synthetic services on phone Chromium, tablet WebKit and desktop Chromium. They include restored administration, independent metric failures, registration-based guide collapse, no duplicated timer reads, and screenshots.
- Public preview smoke tests open the actual deployed pricing page without service mocks and verify cards, quantity editing and responsive layout. They do not buy a subscription or upload privileged media.

Each report is tied to its revision. Automated pass, visual inspection, deployed compatibility, payment-provider verification, merge and production deployment are separate statements. Unknown or failed checks must not be summarized as success.

Design reference: Apple Human Interface Guidelines, especially accessibility, onboarding and writing. This is not an Apple certification or a complete assistive-technology audit.
