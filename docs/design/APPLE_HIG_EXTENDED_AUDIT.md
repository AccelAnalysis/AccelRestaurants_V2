# Extended Apple HIG remediation

## Scope and interpretation

September 6, 2026. Extends the initial responsive-web pass across super-admin,
designer, subscription/billing, onboarding/invitations, specialized tile inspectors,
and configurable brand colors. This is a code-and-browser remediation, not Apple
certification, a complete WCAG conformance assessment, or a production acceptance test.

Apple sources reviewed:
- https://developer.apple.com/design/human-interface-guidelines/design-principles
- https://developer.apple.com/design/human-interface-guidelines/accessibility/
- https://developer.apple.com/design/human-interface-guidelines/feedback
- https://developer.apple.com/design/human-interface-guidelines/onboarding
- https://developer.apple.com/design/human-interface-guidelines/modality

Apple's Simplicity principle calls for logical organization and clarity rather than
removing necessary functionality. Agency and Feedback call for reversible choices,
understandable outcomes, and recovery. Our web translation uses native controls,
named dialogs, explicit action states, persistent contextual errors, responsive
layouts, and 44 CSS-pixel control regions. That size is a web design target, not a
claim that native points and CSS pixels are universally interchangeable.

## Surface inventory and changes

| Surface | Remediation |
| --- | --- |
| Super-admin directories | Wrapping section navigation, selected-state semantics, labelled search and row actions, named scrollable tables, error/retry states, removal of an inert menu action. |
| Organization management | Shared named Radix dialog, keyboard-operable sections, labels for plan/limit/tile controls, retained errors, cancellable impersonation confirmation. Authorization logic is unchanged. |
| Designer invitations | Named fields, shared dialog, persistent invitation errors that retain the entered draft. |
| System and general settings | Explicit names for plan-specific controls, save/error feedback, no false success after a rejected config write, guarded brand-color input, previews, and preserved settings drafts. |
| Notifications | Template-load failure and retry are distinct from loading; subject/body labels; save feedback retains the selected draft; sidebar/editor stack at compact widths. |
| Knowledge base and templates | Accessible editing/confirmation dialogs, labelled row actions and fields, failure feedback, responsive layouts, honest partial-success reporting for theme generation, removed debug account text. |
| Designer workspace | Navigation visible at compact widths, active destinations, skip link and route focus, contextual profile/job-load errors. Profile is a keyboard-submittable form with labelled rates, specialties and pending states. |
| Marketplace and jobs | Labelled search/hiring actions, distinct loading/failure/empty states, removed inert filter button, cancellable assignment/review interactions and retained submission/review errors. |
| Subscription and billing | Explicit plan review before Stripe handoff, plan price/interval and final-checkout explanation, neutral cancellation, duplicate-request protection, current account-derived status, plan-load/portal/checkout recovery, no claim that a return URL proves payment success. |
| Onboarding and invitations | Visible step/progress semantics, labelled account and organization fields, step focus, mobile layout, genuine plan-selection controls, legal links outside protected routes, preserved progress after Free plan selection, wired template picker with neutral Cancel, finish-failure recovery, invitation network retry. |
| Specialized tiles | Inventory includes all 60 current TileType inspectors. Names for property fields and icon controls, keyboard-operable property editing, explicit notices for existing unsupported/placeholder interactions. Form/poll tiles acknowledge successful persistence rather than optimistic completion and retain inputs on failure. Embedded frame titles added. |
| Tenant/brand color application | Validate #RGB/#RRGGBB, preserve original configured color, derive separate action/text/focus tokens, and apply them to application surfaces and portal dialogs. White action text targets at least 4.5:1; accent text targets 4.5:1 against the standard dark chrome surfaces. Invalid runtime values fall back to the default. Published restaurant artwork is not recolored. |

## Verification design

`tests/hig` mounts real interface components, substituting only service adapters
and Firebase boundaries. Test browser requests to hosts other than localhost are
blocked. No production credentials, account creation, email, Stripe purchases,
Firestore writes, rules deployment, or Firebase Hosting deployment are performed.
The production entry does not import the fixture or mock modules.

The matrix includes the original 12 scenarios, 28 extended workflow scenarios,
and 60 individual tile inspectors across desktop Chromium, phone-width touch
Chromium, and tablet-width touch WebKit (300 cases).
The tile tests inspect the control panel, not accessibility of arbitrary authored
content on the canvas. Automated axe checks reject serious/critical findings in
the tested views; they do not establish full WCAG compliance. A 4,096-color grid
and invalid-format tests exercise the color derivation functions, supplemented
by browser checks of representative extreme brand colors.

Use the GitHub Actions run attached to the PR for actual results. A listed test is
not evidence that it passed. Local TypeScript, lint and production compilation
were checked; browser execution uses GitHub-hosted runners because local browser
policy blocks localhost.

## Remaining acceptance boundaries

- Physical iPhone/iPad Safari, VoiceOver, Voice Control, switch input, browser zoom,
  and enlarged-text acceptance are still required. Playwright WebKit is not an
  actual iPad or Safari/VoiceOver combination.
- Staging must validate real authentication, invitations, permissions, subscription
  prices, payment handoffs/webhooks, uploads, onboarding persistence and live data.
  Synthetic service tests cannot establish backend correctness or tenant isolation.
- Every current tile inspector is inventoried. This does not turn existing tile
  placeholders into complete features or validate external video/map/social APIs.
- Customer-authored HTML, media, polls/forms in every display configuration, captions,
  long content, motion and tenant-authored artwork need content-specific player review.
- Brand-token contrast protects the standard dark chrome combinations; it is not a
  guarantee for every arbitrary image, opacity blend, user-defined tile color or
  third-party embed. Saved restaurant content is intentionally left unchanged.
- Existing dependency/security findings, Recharts chunk warnings, backend runtime
  compatibility and production release readiness remain separate workstreams.

No PR merge or Firebase deployment is part of this task.
