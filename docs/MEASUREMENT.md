# First-party restaurant measurement

Implementation base: PR #1 merged into `main` at `19ea52705ce1f7b158c870c93e39da70ec940fcf`. The source of truth is `AccelAnalysis/AccelRestaurants_V2`. Production remains `accelrestaurant-d2c1f`; developing or testing this feature does not deploy it.

## Product workflow

Open **Analytics → Setup** as an organization administrator. Create a tracked external menu, offer reveal, NPS, CSAT, NPS + CSAT, quick poll, or open-feedback campaign. Attach the campaign to an existing `qr_code` tile on a slide. Publish/assign the slide using the existing screen editor.

Player authorization now follows the normal display lifecycle instead of requiring a second measurement-pairing ceremony. On the TV, open `displays.accelanalysis.com`; an unknown browser receives a six-digit activation code. In **Screens → Activate display**, an organization administrator enters or scans that code and chooses the logical screen. The browser's persistent anonymous Firebase identity becomes the trusted player identity. Replacing, moving, swapping, or deactivating a display updates the measurement device binding in the same backend transaction. A direct player URL alone still cannot manufacture live proof-of-play; unregistered administrator previews remain test-only.

The player resolves an opaque QR placement for its real screen, location, slide revision, and campaign. Guests need no account. External-menu QRs redirect to the configured destination; offer/survey QRs open the first-party `/engage/:placementId` page. All scores and event attribution are calculated by the server.

## What the metrics mean

- **Recorded placement plays:** qualifying renders of tracked QR placements, not unique human viewers, physical television power verification, or audited advertising impressions. A render qualifies after one continuous visible second. Hidden tabs, preloaded slides, inactive slides, known full-screen overlays, low-opacity ancestors, mostly off-viewport QR tiles, and browser timer suspension are excluded. A continuously displayed QR is one play with accumulating visible duration; it does not invent a new impression each minute. Multiple tracked QR placements on a slide are measured separately.
- **Visible duration:** measured placement milliseconds. This is not audience dwell time. Minute buckets are cumulative, bounded at 60 seconds per placement/minute, and tolerate duplicate and out-of-order uploads.
- **Scans:** filtered HTTP GET requests to `/r/:opaquePlacementId`, not unique guests. Camera recognition without opening the URL is not observable. HEAD, recognized bots, previews and prefetch requests are excluded. Other automated requests can still resemble real browser traffic; no bot filter proves humanity.
- **Actions:** first-party offer reveal, clipboard action, outbound CTA click, or survey start. One session can produce several different action types; action totals are not a conversion percentage. Reveals, copies and clicks do not establish a redemption or purchase. Off-site actions after a direct external redirect are not observable.
- **Engaged scan sessions:** first qualifying action per engagement session. Cohort metrics retain the original scan date, while activity metrics use the actual event date.
- **Survey responses:** validated submissions. Repeating the same submission token/answers returns success without another response. Changing the answers after submission is rejected. A deliberate new scan can create another anonymous session; the product does not claim person-level deduplication.
- **NPS:** `100 × (promoters − detractors) / valid NPS responses`; 9–10 promoters, 7–8 passives, 0–6 detractors. Zero is a valid answer, not an absent value.
- **CSAT:** `100 × ratings of 4 or 5 / valid CSAT responses`, on a 1–5 scale. Counts, score sums and score distributions are retained. All date/location/campaign reports pool raw counts, never average daily percentages.
- **Survey cohort completion:** cohort submissions / cohort starts. A submission with a lost start event synthesizes the start in the same server transaction. Later actions are attributed to the original scan cohort to avoid cross-midnight numerator/denominator errors.

Sample sizes are shown alongside NPS/CSAT. Responses are self-selected, not a probability sample of all diners. Location comparisons are descriptive, not causal campaign lift or ROI. Missing aggregates, request failures and zero denominators are not silently replaced with measured zero.

## Immutable attribution

`campaign_placements/{random192BitId}` snapshots organization, campaign, screen, location, readable names, timezone, slide/tile IDs, exact slide revision hash/version and destination settings. A private hash registry makes repeated manifest requests stable. Moving a screen or changing content/campaign settings produces a new placement; old records keep their original meaning. A copied QR identifies its encoded source placement, not proof the visitor is still physically beside that screen.

Server manifests require the player's expected slide update timestamp to match current source content and verify that the slide belongs to its organization and actual screen playlist. There is no visitor-supplied organization, location or destination used for attribution. Legacy `trackScan` external QR tiles receive an automatically created measured campaign when a valid authorized player resolves them. Dynamic calendar payloads remain untracked rather than being incorrectly reported as HTTP scans.

Daily dates and hourly dimensions use the placement's location IANA timezone. DST repeated local hours are combined in the hourly view; UTC raw timestamps remain available for reconstruction. Multi-location date filters compare local civil dates, not a single global UTC interval.

## Firebase persistence and APIs

All measurement collections are root collections and deny direct browser reads and writes. Operator reads go through a callable that checks current active organization membership and location scope. Firebase Admin operations have their own explicit authorization because they bypass Firestore Security Rules.

| Collection | Purpose | Retention |
|---|---|---|
| `measurement_campaigns` | Server-managed campaign definitions/status | Retained |
| `measurement_surveys` | Immutable versioned question definitions | Retained |
| `campaign_placements` | Immutable attribution/destination snapshots | Retained |
| `measurement_placement_keys` | Stable placement lookup registry | Retained |
| `player_registrations` / `player_screen_registrations` | Durable browser-player identity and current logical-screen assignment | Retained until display lifecycle cleanup |
| `player_activation_codes` / `player_activation_requests` | Single-use six-digit display activation | 15-minute validity; expiry enforced in code |
| `measurement_devices` / `measurement_screen_devices` | Measurement authorization derived from current player registration | Retained until lifecycle cleanup |
| `measurement_pairings` / `measurement_pairing_requests` | Legacy compatibility records for the original measurement authorization API; not exposed as an operator workflow | Short-lived / lifecycle cleanup |
| `measurement_sessions` | Auth UID/screen/device-bound telemetry sessions | 31 days |
| `measurement_guests` | Hashed, capability-limited guest sessions | 24 hours |
| `measurement_buckets` | Cumulative playback retry state | 98 days |
| `measurement_events` | Server-authored append-only event facts and projection status | 90 days |
| `measurement_responses` | Private validated survey answers and scores | 180 days |
| `measurement_receipts` | Transactional aggregation deduplication receipts | 98 days from event receipt |
| `measurement_daily` | Daily counters and local-hour subcounters | Retained |
| `measurement_usage` / `measurement_salts` | Short-lived rate counters and daily random salts | 2 days |

TTL policy declarations and index exemptions are checked into `firestore.indexes.json`. TTL deletion is asynchronous; every sensitive session/activation expiry is enforced in code immediately, regardless of whether its document has been deleted. No aggregate deletion is triggered when a raw event expires. Retention values are product defaults, not claims that they satisfy every jurisdiction or customer contract.

Raw events are transformed into six aggregates in one transaction: organization, campaign, location, screen, campaign/location, campaign/screen. The event receipt and all increments commit together. Trigger retries cannot double-increment totals. A scheduled reconciliation function processes the oldest 100 unprojected events every 15 minutes; alert/inspect backlog growth instead of treating stale data as a successful campaign result.

The dashboard reads the canonical campaign/screen aggregate grain through a paginated server API and combines it into overview, campaign, feedback, location and screen views. It does not sum overlapping grains or download the newest 500 raw events. Bounded reports fail explicitly rather than truncate totals.

New function exports:

```text
createMeasurementCampaign       setMeasurementCampaignStatus
bindMeasurementCampaign         requestMeasurementPairing
approveMeasurementPairing       openMeasurementSession
getMeasurementManifest          ingestMeasurementBuckets
getMeasurementDashboard         getMeasurementEngagement
recordMeasurementAction         submitMeasurementSurvey
measurementRedirect             aggregateMeasurementEvent
reconcileMeasurementEvents
```

`requestMeasurementPairing` and `approveMeasurementPairing` remain callable export names for release compatibility, but display activation/player-registration requests are routed through the shared player registration engine. The product does not ask an operator to authorize measurement separately.

The old v1 player functions are not used as the measurement trust boundary. Their Timestamp/FieldValue access has been updated to modular Firebase Admin imports because real emulator testing exposed undefined namespace helpers. The measurement release also updates `syncPublicOrgConfig`, `createScreenSession`, and `sendHeartbeat`; unrelated billing Functions are not redeployed by this workflow.

## Offline behavior and integrity limits

The player maintains cumulative telemetry in IndexedDB, uploads batches of at most 25, preserves increments that occur while an upload is pending, and retries with exponential backoff and jitter. It only replays data owned by the currently authenticated UID. Cached manifests preserve the exact recorded attribution when offline; the server validates uploaded session/placement identity. A Web Lock admits only one foreground measuring tab per device/browser/screen. Unsupported Web Locks produce a visible telemetry warning, not fabricated plays.

The replay window is seven days, local queue cap 20,000 rows, and accepted bucket duration is at most one minute. Expired or excess local telemetry is dropped with an explicit status warning. This is a bounded telemetry queue, not a replacement for a full last-known-good media player cache. Restart/device deletion/cleared browser storage can lose unsent data. Complete clock rollback resistance and physical display state are not claimed.

Reports allow at most 93 days and 20,000 leaf aggregate records; exceeding the limit returns an instruction to narrow the report. Manifests support at most 100 slides and 200 placements. The setup library is bounded to 200 campaign definitions. These are v1 resource limits, not enterprise-scale performance claims.

## Privacy and abuse handling

Guest tokens are random, stored server-side only as hashes, and removed from the browser URL fragment after retrieval. They are not query parameters or personal identifiers. Guest answers never enter product analytics. GA/Performance initialization is disabled on first-party engagement, redirect and player routes.

Measurement event documents do not store raw IP or full user-agent strings. The public limiter uses daily-random salted keys with short TTLs. Hosting/Cloud Logging still have their platform request logging behavior; configure log access/retention for the production account separately. User-agent bot filtering is a best-effort filter only. The redirect does not fetch destination content, and accepts only configured HTTPS public-domain destinations, never a visitor's `url` parameter.

Rate limits, payload bounds, server-side token validation, authorization and immutable placements are active without CAPTCHA. `MEASUREMENT_REQUIRE_APP_CHECK` defaults to false: do not enable it until App Check has been configured and tested across guest and player browsers. It is not represented as already enforced. Survey forms do not require names, email, phone, location permission or tracking across sites. Free-text fields instruct guests not to include personal information.

## Verification

`.github/workflows/measurement-tests.yml` installs locked dependencies, lints, builds the production frontend and Functions, runs unit contracts, then uses loopback Firebase emulators with project `demo-accel-measurement` for Firestore transaction/security tests and real Playwright browser flows. No Firebase production service-account secret is available to those jobs. The built frontend refuses emulator mode unless its project ID starts with `demo-`.

Browser evidence and emulator diagnostics are uploaded as workflow artifacts. Cases include redirect tampering/cache headers/HEAD exclusion, NPS zero, idempotent survey reload, offer actions, actual player playback buckets, offline replay, hidden tiles, dashboard routing, display activation, next-session restoration, fullscreen fallback, and remote reassignment. The Actions run is authoritative for current pass/fail status; this document does not certify an unexecuted test.

The existing dependency lockfiles may report audit findings unrelated to this implementation. No forced dependency upgrade or claim of a clean vulnerability audit is part of this change. Review those findings separately before broad release.

## Production cutover — explicitly manual

1. Review the implementation PR and its measurement/player verification run, then merge into `main`. Keep `accelrestaurant-d2c1f` as the only production target.
2. Set GitHub's existing `production` environment variable `MEASUREMENT_ORIGIN` to the already verified HTTPS Hosting origin without a trailing slash. The safe default is `https://accelrestaurant-d2c1f.web.app`. Use `https://displays.accelanalysis.com` only after its DNS, certificate and Firebase Hosting attachment are complete. The server—not `window.location.origin`—chooses QR origin.
3. Run **Deploy Measurement Backend** from `main`, entering `DEPLOY`. The workflow builds/tests against a demo emulator before loading deployment credentials. It checks both the selected Firebase project and service-account project ID, then deploys the named measurement/player Functions plus checked-in Firestore rules/indexes/TTL configurations. It does not release Hosting. Confirm composite indexes are ready and TTL policies enabled before declaring reporting operational; emulator tests validate expiry fields and access logic, not production TTL cleanup execution.
4. Run the existing **Deploy Production** Hosting workflow from the same reviewed commit. `/r` and `/r/**` must reach `measurementRedirect` before the SPA fallback; updated service workers must exclude those navigation routes. Do not publish first-party QR links pointing to a frontend/backend that has not yet been released.
5. Open `displays.accelanalysis.com` on one physical TV browser, activate it from **Screens → Activate display**, attach a pilot campaign, and make a test scan/submission. Close and reopen the browser once to confirm the same screen restores without another activation code and the fullscreen attempt/OK fallback runs again. Verify the expected screen/location and score sample count in the dashboard.

The backend rule cutover intentionally disables untrusted legacy `qr_scans` and `daily_metrics` writes. Old `/r?url=...` links return a republish notice instead of remaining an open redirect. Coordinate backend and Hosting releases in one maintenance window and republish any externally printed legacy tracked QRs. Legacy scan history is not silently promoted into the new trustworthy dataset. Existing ordinary nontracked QR destinations and signage playback remain usable.

Rollback should pause newly affected campaigns and restore the reviewed frontend/backend commit as needed while preserving server-only measurement rules. Do not reopen public event writes as a recovery shortcut. Do not delete historical placements or aggregates during a rollback.

## Scope boundaries

This release is QR-placement proof-of-play plus first-party engagement measurement, not a complete creative-level audience measurement system. It does not implement POS revenue attribution, coupon redemption validation, unique-diner identity, camera-based audience counts, multi-touch conversion credit, controlled experiment uplift, automated AI advice, or a raw-comment moderation inbox. Those capabilities must not be inferred from the dashboards.
