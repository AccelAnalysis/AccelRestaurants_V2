# Isolated HIG regression tests

This fixture mounts real application components with synthetic data and service adapters. It is **not** a product route, authentication bypass, Firebase emulator project or production preview. No production environment variables are needed. All non-local browser requests are aborted by the test setup.

From the repository root:

```sh
npm ci
npm ci --prefix tests/hig
(cd tests/hig && npx playwright install --with-deps chromium webkit && npm test)
```

The separate fixture configuration starts Vite on 127.0.0.1:4173. Playwright runs desktop Chromium, phone-width touch Chromium, and tablet-width touch WebKit. WebKit engine testing does not replace acceptance on real Safari/iOS or VoiceOver.

## Expanded surface coverage

- `hig.spec.mjs`: the original 12 admin/editor regression scenarios.
- `full.spec.mjs`: 28 account-workflow and color scenarios across super-admin, designer, subscription/billing, onboarding/invitations, templates and form/poll tiles.
- `tiles.spec.mjs`: one inspector scenario for each of the 60 current tile types.

Each scenario runs on all three browser/layout projects: **300 cases** in total. This number describes the matrix; use the workflow report for actual pass/fail results.

The color test checks 4,096 sRGB inputs against the supported dark interface surfaces, plus format validation and browser checks of six extreme brand colors. It does not recolor or certify restaurant-authored content.

For targeted execution:

```sh
(cd tests/hig && npm test -- full.spec.mjs)
(cd tests/hig && npm test -- tiles.spec.mjs --project=phone-chromium)
```

Axe checks reject serious/critical findings for the audited views; tile checks scope the audit to the inspector rather than arbitrary authored canvas content. Tests also cover navigation, cancel-without-mutation, retained drafts, retry and the Free-plan onboarding transition. They are not a substitute for actual Firebase/Stripe integration, permissions verification or physical iPhone/iPad assistive-technology acceptance.

Screenshots, traces and the HTML report are excluded from Git. The production Vite configuration uses the root index.html and never imports this fixture or its Firebase substitutes.

See `docs/design/APPLE_HIG_EXTENDED_AUDIT.md` for the expanded inventory and limitations, and `docs/design/APPLE_HIG_AUDIT.md` for the original focused pass.
