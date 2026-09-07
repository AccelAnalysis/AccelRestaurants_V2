# PR #5 regression audit

Baseline reviewed: PR #5 at `70f117f1ec3db76d49a36f1de00ba10b0737613a` against `16539a2837678d9b679e0ff33cf39d75e2afdb1f`, followed by integration with merged player PR #4 (`dbb9b0cbb42f223aaab828adbb03447ca11a0a5e`). This is a deleted-behavior/code review, not a declaration that every real service has been exercised.

| Original changed area | Retained or corrected behavior | Evidence boundary |
| --- | --- | --- |
| App, ProtectedRoute, LoginPage, useAuthListener | All customer routes retained; PR4 display root, activation redirect and registration route preserved. Account snapshots remain scoped. | Browser/routing and existing state-boundary tests; production sign-in not claimed. |
| OnboardingPage, customerJourney, onboardingService, RestaurantStarterWizard | Design-first setup, selected starter, legacy checkout return, current plan and skip-to-workspace retained. Clear completed intent to avoid restarting finished setup. | Synthetic browser/state tests; no real email or charge. |
| PricingPage, PlansPanel, usePlanCatalogue, configService | Restore availability with validated live/cache/bootstrap hierarchy. Restore feature/extras disclosure and admin FAQs. | Actual source tests, actual Firebase emulators, actual public preview smoke. |
| BillingStatusWidget, SubscriptionManager, OrganizationView | Restore usage, purchased limits, explicit overrides, warnings and current period. Restore platform-admin settings access. Fake payment data and inert destructive buttons stay removed. | UI and policy tests; provider billing lifecycle remains a separate release requirement. |
| DashboardOverview, FirstScreenGuide, ScreenSetupPage | Independent source failures; no invented zeroes; one shared initial read; no 15-second full reload; collapse from PR4 assignment, not heartbeat. | Service read-count/browser tests and PR4 integration. |
| SiteLayout, LandingPage, DesignsPage | Simplified acquisition surface, video placeholder and full catalogue route retained. Phone/social contacts restored. | Responsive screenshots and admin-to-page round-trip tests. |
| GeneralSettingsEditor, WebsiteContentEditor, websiteContent | Structured social editing, real phone rendering, FAQs on Plans, explicit destination help. Existing stored configuration keys are not deleted by the merge-save. | Settings persistence mocks + actual general ConfigService unchanged. |
| MeasurementDashboard, MeasurementSetup, measurementService | Offer-link metric wording, existing formula meanings retained. PR4 single activation flow replaces obsolete second pairing form. | Existing measurement pipeline plus text/browser checks. |
| AtmospherePresetPanel | Plain-language changes do not alter rendering, entitlement or reduced-motion behavior. | Existing cinematic validation. |
| storageService, storage.rules | Preserve uploads/list/delete APIs. Add progress; validate website upload namespace without a wildcard rule bypass. | Actual Storage emulator API/rules, not a mocked successful upload. |
| Functions index and journey billing/catalog | Strict payment authority; retain prior allowances on delinquency; legacy setup return preserved. Per-handler read-only compatibility fingerprint. | Unit policies and actual handler/emulator preflight; not real Stripe certification. |
| AdminShell, AdminDashboard | Billing navigation, existing content/management routes and screen-editor wrapper retained; player code is not replaced by the customer layer. | Existing HIG tests and PR4 browser suite. |
| Tests and customer journey documentation | Retain previous keyboard/state/measurement/cinematic tests, add source/emulator/deployed-preview layers and explicit verification limits. | Exact-head workflow evidence. |

## Deliberately not restored

The old settings editor also exposed support-provider credentials, a global analytics identifier, default currency/locale, a custom site-banner editor and a designer-marketplace switch. The baseline search did not establish working consumers for those controls. Their stored fields remain untouched; this repair does not advertise inactive configuration as a working feature or put provider secrets back into public `system/general`. A real integration needs its own secure implementation and tests.

Pricing remains USD/month because that is the existing server checkout contract; an old unused currency selector is not evidence of supported multi-currency billing. The disabled contact email, fake Visa card, hard-coded renewal date, unimplemented logo button, unimplemented Add Seats purchase button and unimplemented Delete Organization button remain removed. Real team management, invitations, locations, billing portal and content creation routes remain available.

## Remaining verification limits

The September 7 release-blocker pass re-read current `main` (`dbb9b0cbb42f223aaab828adbb03447ca11a0a5e`) and all four open review threads. Phone contact, social-link management and the shared non-polling dashboard summary are present and covered by `journey-regressions.spec.mjs`. The duplicate-subscription finding was still present for legacy customers without `subscriptionId`; the release repair adds provider-side lookup, portal routing and a disabled current-paid-plan choice, with unit tests for all non-ended subscription states and a responsive browser regression.

The renewed source comparison retains login/display redirects and anonymous-player handling, scoped organization updates, design-first onboarding and legacy return paths, screen setup using PR4 registration, restaurant/team/invitation/location administration, real dashboard widgets, homepage video controls without autoplay, footer/social/contact editing, Storage upload/list/delete APIs, measurement calculations and platform-admin access. This is source review plus synthetic/emulator coverage, not a real Firebase TEST lifecycle certification. CI now checks out the PR head explicitly; runtime evidence and screenshot review belong to the current PR report.

The read-only preflight can prove compatible deployed handler/rule fingerprints and a valid server catalogue, not successful payment, guest TV visibility, email delivery or video decoding. No green UI test may be used as evidence for those operations. A Hosting-only preview can pass its public pricing test while its backend-dependent flows are explicitly **unverified**. Release must stop in that case. Runtime results belong in the PR and attached workflow reports; this file does not predeclare them.
