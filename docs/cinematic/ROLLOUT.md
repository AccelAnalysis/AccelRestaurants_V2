# Cinematic restaurant package — v1

## Merge/deployment dependency

Land **after** `feat/first-party-measurement`, not before it. Integration baseline is
measurement commit `5445cf016ba8c18f31a2837fcbfd9848fb147cd2`; the draft PR is stacked
on that branch until the foundation lands on main. Original baseline: PR #1,
`19ea52705ce1f7b158c870c93e39da70ec940fcf`. This package does not replace QR measurement,
campaign metrics, surveys, analytics dashboards, player sessions, pairing, audio, recovery,
publishing revisions or schedules. Do not merge or deploy either owner's code on their behalf.

Overlap is deliberately narrow: `PlayerScreen.tsx` adds one eligibility hook and one renderer
prop; preserve measurement runtime/active props, MeasuredQR and player instrumentation.
`schema.ts` adds optional template provenance and atmosphere fields; retain measurement's QR
campaign field. `functions/src/index.ts` adds the starter export and preflight for the existing
importer; keep every measurement export. Rules add slide-motion access and close added/removed
protected-field bypasses; preserve measurement's server-only event-write rules. No measurement
schema, tracking events, QR destinations, metrics or attribution definitions are invented here.

Deploy the merged Functions (`createRestaurantStarter` and modified `importTemplate`) and
Firestore rules before the corresponding Hosting build. The foundation's functions, indexes,
routes and configuration must already be deployed. Use the existing Firebase project and
ordinary release process. This PR creates no Stripe products/prices, runs no production writes,
and adds no approval workflow.

## Product contract

The single pure contract is `functions/src/cinematic/catalog.ts`; frontend imports that same
file. It must stay independent of Firebase, Node-only modules, DOM and billing SDKs.
`templates.ts` and `typography.ts` likewise generate identical content on client and server.

| Existing plan | Restaurant designs | Presentation | Guided setup |
| --- | --- | --- | --- |
| Free / Basic | Four core designs, both orientations | Static | Included |
| Growth / Enterprise / Franchise | All six, including two signature designs | All seven motion presets and existing custom controls | Included |

These are cinematic feature entitlements, **not a replacement** for existing tile, screen, seat,
trial-duration or pricing rules. Prices and screen/seat allowances are unchanged. Unknown plan
values fail closed to static/core content. All users may preview premium designs; creating one
requires server eligibility. Choosing an included static alternative is explicit and never
starts checkout. Signature library access is feature packaging, not DRM for editable text shapes.

## Presets and rendering

Clear & readable (no motion), Warm steam, Ember haze, Winter snow, Window rain,
Celebration stars, Autumn drift and Date night. Every motion preset has Subtle/Balanced/Vivid
strength and Eco/Standard/High device quality. Serialized values, seed, preset ID and version
are stored on the slide; old slides do not silently acquire changed preset values. Manual
advanced edits remove preset provenance. Unknown/legacy settings are sanitized and bounded.

| Quality | Maximum framebuffer pixels | Particle cap | Smoke steps | Target render cap |
| --- | ---: | ---: | ---: | ---: |
| Eco | 230,400 | 120 | 12 | 24 fps |
| Standard | 921,600 | 240 | 20 | 30 fps |
| High | 2,073,600 | 400 | 30 | 30 fps |

The framebuffer limits correspond to 640×360, 1280×720 and 1920×1080 at 16:9, regardless
of a 4K/HiDPI output surface. They are enforced workload budgets, **not measured physical-device
FPS guarantees**. Target Fire TV/Chromebox/TV-browser hardware still needs a live soak before
claiming hardware certification. Eco is selectable, not automatic device profiling.

The renderer uses deterministic particles, real streaks for rain, premultiplied opacity,
CSS blend modes, bounded ray-marched smoke, lazy shader allocation, visibility/offscreen pause,
context-loss restoration and disposal. Decorative surfaces never capture pointer input.
Reduced motion, no effect and no entitlement allocate no canvas. Unsupported WebGL 2 leaves the
static slide usable. On a downgrade, the trusted public plan mirror disables motion; existing
menu/price edits still work and content is not deleted. Offline cached plan information may
remain until the trusted mirror updates; no promise of instantaneous offline revocation is made.

## Restaurant designs

Coffee house, Grill house, Fresh counter, Dessert studio, Chef’s table and After hours.
Each has native 1920×1080 and 1080×1920 variants, a brand/header hierarchy, opaque menu paper,
aligned prices, one to six items and a footer. All content remains ordinary editable text tiles.
No external images/fonts or fake QR links are required. Samples are labeled as samples in setup.
Names, prices, descriptions and headline lengths are bounded; deterministic wrapping/font fitting
is verified against the real text renderer, including long unbroken input. Subsequent manual
editor changes remain the operator's responsibility. No unsupported sales-lift claims are made.

## Setup and server behavior

Choose design → enter real copy/prices → preview atmosphere and confirm. Entry points:
onboarding's template option and the slide template picker. Browser drafts are scoped by org
and user; disabled/corrupt local storage does not block setup. Drafts never contain billing or
tracking data. Content creation is explicit; closing a preview creates nothing.

The callable checks non-anonymous authentication, current owner/active content membership,
server plan and all input. A Firestore transaction atomically creates a slide and success receipt.
The optional first-screen path additionally requires an administrator, checks that there are no
existing screens, creates one location and **inactive** screen draft, and updates usage in the same
transaction. It never overwrites an existing screen or claims that a physical display is live.
The existing screen editor owns assignment/activation/pairing. Setup-profile navigation failure
keeps a link to the already-created content rather than creating it again.

Receipt IDs contain UID + random request ID; fingerprints bind them to validated input. A retry
with the same request returns the same resource IDs, including after a lost response. Different
input cannot reuse a completed receipt. There is no public receipt-write path. The existing
Admin-SDK importer preflights all nested slide templates, permissions and cinematic access
**before** copying assets or writing content, and imports those validated snapshots. That legacy
importer's later storage/network failures are not made transactional by this work.

## Verification commands

```sh
npm ci
npm run lint
npm run build
node tests/cinematic/unit.mjs
npm ci --prefix functions
npm run build --prefix functions
npm test --prefix functions -- --runInBand
npm ci --prefix tests/cinematic
npx --prefix tests/cinematic playwright install --with-deps chromium webkit
npm test --prefix tests/cinematic
npm run test:rules --prefix tests/cinematic
```

Cinematic browser tests use an isolated fixture around real components, not live customer
accounts. Chromium exercises real software-WebGL pixels, context recovery, canvas lifecycle and
budgets; Chromium/phone/WebKit exercise readability, accessibility, cancellation, plan fallback,
mirror failure/revocation and lost-response retries. Emulator rules tests use only
`demo-cinematic`. Existing HIG onboarding expectations are updated for the actual new dialog;
other HIG assertions are unchanged. No physical-device soak is represented by these tests.

## Reversal

Revert this feature's frontend/renderer changes to return to the previous editor/player.
Existing optional metadata does not require a migration. Do not delete slides or success receipts.
Do not revert the independent measurement foundation. Removing server entitlement checks is a
separate deliberate product rollback, not a prerequisite for turning motion off.
