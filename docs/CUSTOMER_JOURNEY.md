# Customer journey update

## Integration and release boundaries

This change is layered on cinematic PR #3 at `4cd9a71afd9f00273eb7d7318fb3b72347731594`, which includes merged measurement PR #2. The customer journey branch must land after that dependency. It does not merge or deploy another owner's work.

PlayerScreen, ScreenEditor, measurement ingestion, and cinematic rendering/entitlement logic remain owned by their existing workstreams. The restaurant wizard receives one additive, optional `initialTemplateId` input; its transaction, request identifiers and draft-resume contract are preserved. The customer layer wraps screen setup instead of replacing the editor or player.

The connection checklist reads existing `lastHeartbeatAt`. It says **connected**, not **live**, and explains that TV power and visible content are not verified. Published-revision acknowledgement and durable first-render milestones remain the player workstream's authority. Do not substitute an `isActive` flag, browser return parameter or checked checklist box for playback evidence. The legacy `isSetupComplete` flag remains profile setup, not activation.

## Customer-facing changes

The public page demonstrates actual editable restaurant starters with sample labels. It introduces QR offers and feedback without invented customer results, revenue attribution, unsupported hardware guarantees or a 14-day trial. Prices and quantities are calculated from the stored plan catalogue. Native controls and links, readable focus states, expandable questions, nonautoplay demonstration video and accessible dialogs support keyboard and compact-screen use.

Setup requires an account and minimal restaurant details. Designing comes before optional payment. Account creation is consolidated so the login page no longer offers a second signup implementation. Template choices are validated and carried into the existing restaurant wizard. Browser storage holds only short-lived design/plan/count choices, not passwords, email addresses, payment information or authorization. Scoped wizard drafts retain their existing durable request identifiers.

Restaurant settings remove sample card details, fixed renewal dates and nonfunctional actions. Billing displays actual account fields, and existing subscriptions use the payment portal instead of starting another subscription. Website copy editing uses bounded form fields for benefits, frequently asked questions, guest feedback explanation and an optional real booking destination; no raw JSON editing or approval workflow is required.

## Catalogue and billing contract

`system/plans.configs` is the commercial catalogue for pricing, onboarding, billing choices and server checkout validation. A failed or absent read produces an unavailable state, never a silently substituted checkout price or a public initialization write. Existing cinematic entitlements remain in the cinematic catalogue; no plan prices or package limits are changed by this code.

Checkout derives the base/add-on price IDs on the server and checks current Stripe prices against the advertised USD/month amounts. It requires ownership or active restaurant-administrator membership, rejects invalid quantities and mismatched add-ons, uses request idempotency, and does not start a new subscription when an existing subscription is recorded. Existing paid plan changes use the billing portal. Actual subscription items determine plan and purchased allowances after signed webhook processing. Return URLs choose UI navigation only.

The deployment owner must release the changed `getSubscriptionPlans`, `createStripeCheckoutSession`, `createStripePortalSession` and existing Stripe webhook entry point before the associated Hosting build. Keep the existing configured plan/price mappings and Stripe webhook secret. Confirm the canonical HTTPS root origin in `APP_URL`; the safe default remains `https://accelrestaurant-d2c1f.web.app`. Do not assume the proposed custom domain is already configured. No new secret values belong in public website settings.

This is not a rewrite of designer job payments, payouts, all authorization rules or every legacy subscription edge case. Tests do not represent a real charge or a production payment-provider integration certification. Validate a complete subscription lifecycle with test-mode Stripe before releasing these billing changes. Do not deploy the temporary integration workflow; it removes itself after successful verification on the isolated feature branch.

## Validation scope

Backend unit tests exercise catalogue validation, quote calculations, administrator permissions, server-derived checkout line items, price mismatch refusal and subscription item mapping with synthetic boundaries. The existing HIG harness exercises actual React components with explicitly mocked service boundaries, blocked external requests, accessibility audits and screenshots on desktop Chromium, phone Chromium and tablet WebKit. These are not physical-TV, real-email, real-Stripe or production-data tests.

Required regressions include selected design continuity, optional setup, canceled/failed checkout without plan changes, signup validation, price-load failure/retry, existing-subscription portal routing, absent/stale heartbeat labels, website copy edits and plain-language errors. Current runtime verification results belong in the PR, not as unearned claims in this document.

No new approval gates, feature deployment automation, artificial customer analytics or camera-based impression claims are introduced. Acquisition funnel event collection and a persisted first-play milestone are not delivered by this customer-interface change.

## Design reference

Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines
Related guidance: accessibility, onboarding and writing. HIG informs interaction decisions; this web app is not represented as Apple-certified or as having passed a complete manual assistive-technology audit.
