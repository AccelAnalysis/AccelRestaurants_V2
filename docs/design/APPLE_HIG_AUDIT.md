# Focused Apple HIG remediation

Date: September 6, 2026. Scope: responsive web UI, not native iOS certification.

## Basis and interpretation

Reviewed Apple's Human Interface Guidelines, especially **Design principles** (Purpose, Agency, Responsibility, Familiarity, Flexibility, Simplicity, Craft, Delight), **Accessibility**, **Feedback**, **Motion**, and **Modality**. Apple's Simplicity principle calls for clarity and logical organization, not merely removing functionality. This pass adapts those principles to semantic HTML and responsive web controls. The 44 CSS-pixel interaction regions below are our web implementation target, not a claim that CSS pixels and Apple points are universally interchangeable.

Sources reviewed:
- https://developer.apple.com/design/human-interface-guidelines/design-principles
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://developer.apple.com/design/human-interface-guidelines/feedback
- https://developer.apple.com/design/human-interface-guidelines/motion
- https://developer.apple.com/design/human-interface-guidelines/modality
- https://developer.apple.com/videos/play/wwdc2022/10001/

## Implemented scope

| Area | Changes and rationale |
| --- | --- |
| Navigation and organization | Group the admin sidebar into Workspace, Content, and Manage. On compact widths use a named modal navigation drawer instead of a permanently open sidebar. Keep all existing destinations, active links, a skip link, and focus main content after navigation. |
| Accessible names | Associate sign-in labels with inputs; add visible/action-specific names to core editor, playlist, screen, template, and schedule controls. Preserve text labels, use semantic buttons/links, expose selected/expanded/toggle states. |
| Touch targets | UI controls target 44 CSS pixels; canvas resize hit regions compensate for canvas zoom. On touch devices use the southeast handle plus numerical resize controls instead of overlapping eight small handles. |
| Non-drag alternatives | Add tiles with click, touch, Enter or Space. Move focused canvas tiles with arrow keys (Shift = 10 canvas pixels), or labeled position/size fields and nudge buttons. Playlist entries have up/down buttons. Duplicate slide entries have stable per-entry keys so overrides travel with the intended entry. |
| Modality and cancellation | Shared Radix Dialog supplies names, descriptions, focus containment, Escape and focus restoration. Template picker cancellation only dismisses; Start from scratch is a separate action and remains available with no templates. Destructive screen deletion defaults focus to Cancel. Busy dialogs retain their task until the asynchronous action finishes. |
| Feedback and edit preservation | Persistent inline success/error messages replace silent failure in screen loading, link copying, screen saving, slide saving and schedule saving. Retry is explicit. A failed load is not an empty library. A completed slide save no longer replaces edits made while that request was running. |
| Reduced complexity | Tile search and grouped disclosures replace a continuously expanded catalog. Tiles/Inspector controls are explicit. Advanced playlist overrides stay collapsed. Player link is named for its actual behavior rather than implying that opening a dialog publishes content. |
| Style | Preserve dark/orange branding, use separate legible action/text orange colors, quieter solid admin surfaces, consistent focus outlines and spacing. Declare dark color-scheme accurately. |
| Motion | Respect prefers-reduced-motion in UI transitions and WebGL startup; dispose engines when the preference changes. The UI control CSS excludes the actual player route and rendered signage content. No stored slide or restaurant configurations are rewritten. |

## Verification approach

`tests/hig` mounts the **real components** with synthetic service adapters. It is a separate Vite entry that is never imported by the production entry. The test-only Firebase module is selected only by the fixture's Vite configuration. Outbound browser traffic is blocked except for localhost; no Firebase, email, billing, or restaurant writes are made.

The suite covers screen control names/size/layout, axe serious/critical checks, template cancellation and focus, clipboard errors, loading retry, keyboard placement, save failures and in-flight edits, playlist reordering with duplicate slides, login reset errors, schedule controls and reduced motion. It runs on desktop Chromium, phone-width touch Chromium, and tablet-width touch WebKit. See the HIG verification workflow and its screenshots for actual run results.

Local frontend TypeScript/production build and lint were run during implementation. A local browser was unavailable because the container's browser policy blocks localhost; GitHub Actions is used for browser execution. Passing a synthetic UI test is not a live integration test or proof of full WCAG/HIG conformity.

## Remaining acceptance work / exclusions

- Real iPhone/iPad Safari with VoiceOver, Voice Control and external keyboard needs device acceptance, including browser zoom/text enlargement.
- Staging integration remains blocked until the user supplies Firebase/Vite environment values. Test actual auth, screen saving, pairing, uploads and backend authorization there before release.
- Full super-admin/designer/billing/onboarding coverage and every specialized tile property are outside this focused pass. Global UI sizing/focus/motion defaults help those views but do not establish complete accessibility.
- Native browser confirmations remain in some older menu/slide destructive flows; they are not claimed to have been converted to the shared dialog.
- Content authored by restaurant users (images, rich HTML, colors, autoplay media) needs a separate player/content-accessibility review. This pass does not modify customer content.
- Default dark styling is retained intentionally. Tenant branding contrast beyond the remediated action/text tokens still needs validation in the configuration layer.
- Dependency audit findings and the deployed Functions/runtime compatibility review are separate workstreams.

No Firebase deployments, rules changes, database migrations or PR merges are part of this pass.
