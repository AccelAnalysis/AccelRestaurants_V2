# AccelRestaurants Design System

## Overview

This design system defines the visual language and reusable components for the AccelRestaurants platform, a digital signage solution for restaurants. The system emphasizes a dark theme with orange accents, prioritizing speed, innovation, and ease of use in hospitality environments.

## Design Principles

- **Acceleration**: Fast, intuitive interactions
- **Innovation**: Modern UI patterns for content creation
- **Hospitality-Focused**: Designed for restaurant operations
- **Accessibility**: WCAG AA is a design goal; verified scope and exceptions are recorded in `design/APPLE_HIG_AUDIT.md`.
- **Consistency**: Unified experience across admin console and player interfaces

## Design Tokens

### Color Palette

#### Primary Colors
- **Background**: `#111827` (neutral-900) - Main interface background
- **Surface**: `#1F2937` (neutral-800) - Secondary panels and cards
- **Surface Highlight**: `#374151` (neutral-700) - Borders and subtle highlights
- **Primary**: `#EA580C` (orange-600) - Primary actions, highlights, and brand elements
- **Primary Hover**: `#DC2626` (orange-700) - Hover states for primary elements

#### Text Colors
- **Text Primary**: `#F9FAFB` (neutral-50) - Primary text on dark backgrounds
- **Text Secondary**: `#D1D5DB` (neutral-300) - Secondary text and labels
- **Text Muted**: `#9CA3AF` (neutral-400) - Disabled states and hints

#### Semantic Colors
- **Success**: `#10B981` (emerald-500) - Confirmations and positive states
- **Warning**: `#F59E0B` (amber-500) - Alerts and notifications
- **Error**: `#EF4444` (red-500) - Errors and destructive actions

#### Atmosphere Effects
- Dynamic colors based on effect type: smoke (#6B7280), snow (#F9FAFB), rain (#3B82F6), hearts (#EF4444), stars (#F59E0B)

### Typography

#### Font Family
- **Primary**: Inter (Google Fonts)
- **Weights**: Regular (400), Medium (500), Semibold (600), Bold (700)

#### Type Scale
- **Display Large**: 3.5rem (56px) / Bold / Line height: 1.1
- **Display Medium**: 2.5rem (40px) / Bold / Line height: 1.2
- **Display Small**: 2rem (32px) / Semibold / Line height: 1.3
- **Headline Large**: 1.5rem (24px) / Semibold / Line height: 1.4
- **Headline Medium**: 1.25rem (20px) / Semibold / Line height: 1.4
- **Headline Small**: 1.125rem (18px) / Medium / Line height: 1.4
- **Body Large**: 1rem (16px) / Regular / Line height: 1.6
- **Body Medium**: 0.875rem (14px) / Regular / Line height: 1.6
- **Body Small**: 0.75rem (12px) / Regular / Line height: 1.5
- **Label Large**: 0.875rem (14px) / Medium / Line height: 1.4
- **Label Small**: 0.75rem (12px) / Medium / Line height: 1.4

### Spacing Scale
- Base unit: 4px
- Scale: 4, 8, 12, 16, 24, 32, 48, 64px
- Grid baseline: 8px

### Border Radius
- Small elements: 4px
- Cards and buttons: 6px
- Large panels: 12px (rounded-xl)
- Special elements: 9999px (rounded-full)

### Shadows
- Subtle: `shadow-sm` or neutral-900 with low opacity
- Standard: `shadow-lg`
- Strong: `shadow-xl` with colored variants (e.g., shadow-primary/25)

## Components

### Buttons

#### Primary Button
```css
bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-full transition-all transform hover:scale-105
```
- Used for main actions and CTAs
- Orange background with white text
- Hover: darker orange, scale transform

#### Secondary Button
```css
bg-transparent border border-primary text-primary hover:bg-primary/10 rounded-lg
```
- Used for secondary actions
- Transparent background with orange border
- Hover: light orange background

#### Ghost Button
```css
bg-transparent text-text-secondary hover:bg-surface rounded-lg
```
- Used for tertiary actions
- Transparent background
- Hover: surface background

#### Text Button
```css
text-primary hover:text-primary-hover transition-colors
```
- Used for navigation and inline actions
- Text only, no background
- Hover: color change

### Form Elements

#### Input Field
```css
bg-surface border border-surface-highlight rounded-lg px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
```
- Dark surface background
- Neutral border, orange focus ring
- Consistent padding and typography

#### Textarea
```css
bg-surface border border-surface-highlight rounded-lg px-3 py-2 text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none
```
- Same as input but with resize-none
- Multi-line support

### Cards

#### Standard Card
```css
bg-surface rounded-xl border border-surface-highlight p-6 shadow-lg
```
- Used for content containers
- Glassmorphism variant with backdrop-blur

#### Feature Card
```css
glass p-6 rounded-xl hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5
```
- Enhanced with hover effects
- Icon containers with background

### Layout Components

#### Grid System
- Container: max-width 1280px, centered
- Responsive grid: 12-column system
- Gutters: 16px base, 24px tablet, 32px desktop

#### Navigation
- Sidebar: 280px collapsed, 320px expanded
- Header bar: 64px height
- Tab navigation: horizontal with orange underline

### Glassmorphism Utilities

#### Glass
```css
bg-surface/70 backdrop-blur-md border border-surface-highlight/50
```

#### Glass Strong
```css
bg-surface/90 backdrop-blur-xl border border-surface-highlight/70
```

#### Glass Panel
```css
glass rounded-xl shadow-xl
```

## Interactive States

### Hover States
- Buttons: color change, scale transform (1.05)
- Cards: shadow increase, border color change
- Links: color transition to primary

### Focus States
- Visible focus ring: 2px orange outline
- Form elements: border and ring color change

### Loading States
- Spinner animation with primary color
- Disabled opacity and pointer-events

### Error States
- Red border and text
- Error message positioning below input

## Layout Patterns

### Application Structure

#### Admin Console
- Fixed header (64px)
- Collapsible sidebar (280-320px)
- Main content with max-width 1280px
- Properties panel (320px right sidebar)

#### Player Interface
- Full-screen viewport (100vw x 100vh)
- Minimal UI overlay for controls
- Status indicator (32x32px bottom-right)

### Responsive Breakpoints
- Mobile: < 640px (single column, touch-optimized)
- Tablet: 640px - 1024px (two-column layouts)
- Desktop: > 1024px (multi-column, full features)

## Accessibility

### Standards
- WCAG AA design goal, not a blanket certification claim
- Minimum contrast ratio: 4.5:1
- Color not used as sole differentiator

### Implementation
- Semantic HTML structure
- ARIA labels for complex components
- Keyboard navigation support
- Screen reader compatibility
- Focus management with visible indicators
- Reduced motion support

### Touch Targets
- Minimum 44px for mobile interactions
- Adequate spacing between interactive elements

## Iconography

### Icon Style
- Outline style with 2px stroke weight
- 2px corner radius for consistency
- Lucide React as primary icon set

### Icon Sizes
- Small: 16px (w-4 h-4)
- Medium: 20px (w-5 h-5)
- Large: 24px (w-6 h-6)

### Custom Icons
- Brand-specific icons for Atmosphere effects
- Signature smoke effect as brand element
- Animated icons for dynamic effects

## Usage Guidelines

### Do's
- Use dark theme consistently
- Apply orange accents sparingly for emphasis
- Maintain consistent spacing using the 4px scale
- Use Inter font family throughout
- Implement glassmorphism for modern feel

### Don'ts
- Don't use orange as background color
- Avoid light themes or white backgrounds
- Don't modify logo colors or proportions
- Never use competing color schemes
- Don't apply branding to non-approved materials

### Component Usage
- Primary buttons for main CTAs
- Glass panels for elevated content
- Consistent card layouts for lists
- Semantic color usage (success, warning, error)

This design system ensures a cohesive, accessible, and scalable UI across the AccelRestaurants platform, supporting both complex slide editing and streamlined player interfaces while maintaining brand consistency.


## September 2026 HIG remediation conventions

Use `AccessibleDialog` for new application dialogs and `InlineFeedback` for persistent task results. A close/cancel action must never create a resource; offer a separately named creation action. Prefer real links for destinations and buttons for mutations. Expose expanded, selected and toggle states. Icon-only controls need an action-and-object accessible name.

Application controls target 44 CSS-pixel hit regions and retain a visible focus outline. Buttons use dark orange #C2410C with white text; orange text on dark surfaces uses #FB923C. These are UI contrast tokens, not replacements for customer-authored slide colors. Admin panels prioritize solid surfaces and restrained motion.

Keep complex tools discoverable with search, grouped disclosures and explicit Tiles/Inspector toggles. Always provide non-drag controls for core authoring tasks. Respect prefers-reduced-motion; do not rely on motion alone for status. UI-only CSS is scoped under ApplicationSurface, excluding the player route and rendered signage content.

See [focused audit](design/APPLE_HIG_AUDIT.md) and [regression tests](../tests/hig/README.md) for coverage and outstanding device acceptance.
