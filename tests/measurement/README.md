# Measurement verification

This suite validates the implementation, not a mock analytics screen.

The `Measurement verification` workflow builds the actual application and Functions from the PR commit. It uses only the loopback Firebase Emulator Suite and the project `demo-accel-measurement`. It does not receive production credentials, and the browser build refuses emulator mode with a non-demo project ID.

## Test layers

- `functions/src/measurement/core.test.ts`: 36 validation, timezone, NPS/CSAT, destination-safety, cohort and replay contract cases. The existing Functions suite adds two other tests.
- `functions/src/measurement/engine.integration.test.ts`: 15 real Firestore emulator tests covering tenant/location access, physical device authorization and replacement, stable immutable placement revisions, cumulative uploads and reverse-order aggregate delivery, survey validation/idempotency, guest expiry, offer constraints, source-local dates, retention policies, public write/read denial, external-only denominator exclusion and replay after receipt cleanup.
- `tests/measurement/browser.mjs`: Playwright against the actual production build plus Auth, Firestore, Functions, Hosting and Storage emulators. It exercises the HTTP redirect, anonymous mobile surveys and offers, the actual PlayerScreen, persistent offline telemetry/replay, physical-player auth restoration after reload, hidden tiles, and the aggregate dashboard routes.

Screenshots and diagnostics are uploaded as a GitHub Actions artifact. A successful screenshot alone is not sufficient: the browser script asserts persisted server-side responses, real playback buckets, correct NPS-zero handling, duplicate-submit protection, and no uncaught JavaScript runtime errors. On failure it saves both the desktop/player and mobile page state, console output and network diagnostics.

The unrelated HIG UI suite keeps its own existing synthetic service boundaries. Those are not used by this measurement end-to-end suite.

## Regressions covered

The player must wait for `auth.authStateReady()` before deciding whether to create an anonymous identity. A temporarily null `auth.currentUser` during persistence hydration must not replace a previously authorized identity.

A retained raw event's `projectedAt` flag and its transaction receipt both protect against duplicate projection. Expiring or deleting a receipt cannot make an already projected retained event increment metrics again.

External-only redirects are counted as scans but do not enter the denominator for observed first-party offer/survey engagement. Their off-site actions are not observable.

## Interpreting results

Use the latest workflow run for the PR head commit as the authoritative pass/fail result. Unit-test mode deliberately skips emulator tests when `FIRESTORE_EMULATOR_HOST` is absent; the workflow then runs those tests explicitly in a separate emulator step. This is not a production deployment or verification that production TTL deletion/index build jobs have completed.
