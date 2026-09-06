# Isolated HIG regression tests

This fixture uses the real admin/editor components with synthetic data and service adapters. It is **not** a product route, authentication bypass, Firebase emulator project or production preview. No production environment variables are needed. All non-local browser requests are aborted by the test setup.

From the repository root:

```sh
npm ci
npm ci --prefix tests/hig
(cd tests/hig && npx playwright install --with-deps chromium webkit && npm test)
```

The separate fixture configuration starts Vite on 127.0.0.1:4173. Playwright runs desktop Chromium, phone-width touch Chromium, and tablet-width touch WebKit, with axe on the scoped workflows. WebKit engine testing does not replace acceptance on real Safari/iOS or VoiceOver.

Screenshots, traces and the HTML report are test output only and are excluded from Git. The production Vite configuration continues to use the root index.html and never imports this fixture.
