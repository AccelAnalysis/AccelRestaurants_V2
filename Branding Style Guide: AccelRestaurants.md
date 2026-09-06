Branding Style Guide: AccelRestaurants
Brand Overview
AccelRestaurants is a premium digital signage platform that transforms restaurant operations through innovative visual effects and real-time content management. The brand embodies acceleration, innovation, and culinary excellence, targeting restaurant operators seeking cutting-edge technology to enhance customer experiences. The branding conveys sophistication, reliability, and visual impact suitable for hospitality environments.

Logo and Visual Identity
Primary Logo
Typography: Custom typeface "Accel" in bold sans-serif, with "Restaurants" in lighter weight
Icon: Abstract geometric shape representing acceleration (diagonal arrow or dynamic wave pattern)
Color Application: Logo mark in orange (#EA580C), text in neutral-700 (#374151)
Variations: Horizontal and stacked formats for different contexts
Clear Space: Minimum 1x logo height around all sides
Usage Guidelines: Never distort, maintain aspect ratio, minimum size 24px height
Secondary Elements
Tagline: "Elevate Every Moment" (positioned below logo in light gray)
Brand Mark: Standalone geometric icon for favicons and small spaces
Color Palette
Primary Colors
Dark Background: #111827 (neutral-900) - Main interface background
Medium Background: #1F2937 (neutral-800) - Secondary panels and cards
Light Background: #374151 (neutral-700) - Borders and subtle highlights
Orange Accent: #EA580C - Primary actions, highlights, and brand elements
Secondary Colors
Text Primary: #F9FAFB (neutral-50) - Primary text on dark backgrounds
Text Secondary: #D1D5DB (neutral-300) - Secondary text and labels
Text Muted: #9CA3AF (neutral-400) - Disabled states and hints
Success: #10B981 (emerald-500) - Confirmations and positive states
Warning: #F59E0B (amber-500) - Alerts and notifications
Error: #EF4444 (red-500) - Errors and destructive actions
Extended Palette
Atmosphere Effects: Dynamic colors based on effect type (smoke: #6B7280, snow: #F9FAFB, rain: #3B82F6, hearts: #EF4444, stars: #F59E0B)
Chart Colors: Sequential palette for data visualization (orange variations: #EA580C, #FB923C, #FED7AA)
Typography
Primary Typeface
Font Family: Inter (Google Fonts)
Weights Used: Regular (400), Medium (500), Semibold (600), Bold (700)
Usage: All digital interfaces, marketing materials, documentation
Hierarchy
Display Large: 3.5rem (56px) / Bold / Line height: 1.1 - Headlines and hero text
Display Medium: 2.5rem (40px) / Bold / Line height: 1.2 - Section headers
Display Small: 2rem (32px) / Semibold / Line height: 1.3 - Card titles
Headline Large: 1.5rem (24px) / Semibold / Line height: 1.4 - Major section headers
Headline Medium: 1.25rem (20px) / Semibold / Line height: 1.4 - Subsection headers
Headline Small: 1.125rem (18px) / Medium / Line height: 1.4 - Minor headers
Body Large: 1rem (16px) / Regular / Line height: 1.6 - Primary body text
Body Medium: 0.875rem (14px) / Regular / Line height: 1.6 - Secondary body text
Body Small: 0.75rem (12px) / Regular / Line height: 1.5 - Captions and labels
Label Large: 0.875rem (14px) / Medium / Line height: 1.4 - Form labels
Label Small: 0.75rem (12px) / Medium / Line height: 1.4 - Small labels
Iconography
Icon Style
Design System: Outline icons with 2px stroke weight
Corner Radius: 2px for consistency
Icon Set: Lucide React icons as primary set
Custom Icons: Brand-specific icons for Atmosphere effects and signage features
Usage: 16px, 20px, 24px sizes with consistent optical weight
Icon Categories
Navigation: Home, dashboard, settings (standard Lucide icons)
Content: Image, video, text, chart (custom branded icons)
Atmosphere: Smoke, snow, rain, hearts, stars (custom animated icons)
Actions: Add, edit, delete, save (standard with brand colors)
Visual Elements
Atmosphere Layer Branding
Signature Effect: Wispy smoke simulation as brand signature
Color Mapping: Orange accent particles for premium branding
Animation: Smooth, continuous motion representing acceleration
Component Styling
Border Radius: 6px for cards and buttons, 4px for inputs
Shadows: Subtle elevation using neutral-900 with low opacity
Spacing: 4px base unit (4, 8, 12, 16, 24, 32, 48, 64px scale)
Grid: 8px baseline grid for alignment
Interactive States
Buttons
Primary: Orange background (#EA580C), white text, hover: darker orange (#DC2626)
Secondary: Transparent background, orange border, hover: light orange background
Ghost: Transparent background, neutral-300 text, hover: neutral-800 background
Form Elements
Input Fields: Neutral-800 background, neutral-700 border, focus: orange border
Focus States: Orange ring (#EA580C) with 2px outline
Error States: Red border (#EF4444) with error text
Digital Guidelines
Web Application
Layout: Dark theme with orange accents throughout
Navigation: Sidebar with neutral-800 background, orange active states
Canvas: Full-screen editor with grid overlay in neutral-700
Player Mode: Immersive full-screen with minimal UI elements
Responsive Design
Breakpoints: Mobile (640px), Tablet (768px), Desktop (1024px+)
Mobile First: Optimized for touch interactions in restaurant environments
Kiosk Mode: Full-screen player with touch/keyboard disabled
Brand Voice and Messaging
Tone
Professional: Technical expertise and reliability
Innovative: Forward-thinking approach to digital signage
Hospitality-Focused: Understanding of restaurant operations
Confident: Assured in delivering premium solutions
Key Messages
"Transform your restaurant with cinematic digital signage"
"Real-time content management, effortless execution"
"Elevate customer experiences with Atmosphere effects"
"Scale your brand across multiple locations seamlessly"
Usage Restrictions
Don'ts
Never use orange as background color (reserved for accents)
Avoid light themes or white backgrounds
Don't modify logo colors or proportions
Never use competing color schemes
Don't apply branding to non-approved materials
Accessibility
WCAG 2.1 AA compliance maintained
High contrast ratios (minimum 4.5:1 for text)
Color not used as sole differentiator
Keyboard navigation support
Screen reader compatibility
This branding system creates a cohesive, professional identity that reflects AccelRestaurants' position as a premium digital signage platform, combining technical sophistication with hospitality industry needs. The dark theme with orange accents provides excellent visual hierarchy and modern appeal suitable for restaurant environments.

## Element Layout

### Application Structure

#### Admin Console Layout
The admin interface follows a dashboard pattern optimized for content creation and management:

- **Header Bar**: Fixed top navigation with brand logo, user menu, and notifications (height: 64px)
- **Sidebar Navigation**: Collapsible left sidebar with main sections (width: 280px collapsed, 320px expanded)
  - Organization selector at top
  - Main navigation: Dashboard, Slides, Menus, Assets, Campaigns, Settings
  - Bottom section: Help, Support, Account
- **Main Content Area**: Responsive grid-based layout with:
  - Page header with breadcrumbs and actions
  - Content grid (max-width: 1280px, centered)
  - Sidebar panels for properties and settings (width: 320px)

#### Player Application Layout
Full-screen immersive display for digital signage:

- **Full Viewport**: 100vw x 100vh container with no scrollbars
- **Layered Rendering**: Three z-index layers as described in technical architecture
- **Minimal UI**: Touch controls hidden by default, activated by admin gestures
- **Status Indicator**: Small overlay in bottom-right for connection status (32px x 32px)

### Component Layout Patterns

#### Card Components
- **Standard Card**: Rounded corners (6px), neutral-800 background, subtle shadow
- **Header**: 48px height with title and actions
- **Content**: Padded content area with 16px padding
- **Footer**: Optional footer with actions (48px height)

#### Form Layout
- **Field Spacing**: 16px vertical spacing between form elements
- **Label Position**: Top-aligned labels with 8px spacing above input
- **Input Dimensions**: Height 40px for single-line, auto-height for multiline
- **Validation**: Error messages positioned below input with 4px spacing

#### Grid Systems
- **Container**: Max-width 1280px, centered with 16px side margins on mobile
- **Responsive Grid**: 12-column system with 16px gutters
- **Breakpoints**: 
  - Mobile: Single column, 16px margins
  - Tablet: 2-4 columns, 24px gutters
  - Desktop: 4-12 columns, 32px gutters

#### Navigation Patterns
- **Tab Navigation**: Horizontal tabs with orange underline for active state
- **Breadcrumb**: Left-aligned, neutral-400 text, chevron separators
- **Pagination**: Centered below content lists, with previous/next and page numbers

### Slide Editor Layout

#### Canvas Area
- **Full Workspace**: 100% width/height of content area
- **Grid Overlay**: Optional 8px grid lines in neutral-700 with low opacity
- **Rulers**: Horizontal/vertical rulers (24px width) with measurements
- **Zoom Controls**: Bottom-left floating panel with zoom slider and fit buttons

#### Properties Panel
- **Right Sidebar**: Fixed width 320px, collapsible
- **Tabbed Interface**: Properties, Atmosphere, Settings tabs
- **Scrollable Content**: Vertical scroll for long property lists
- **Real-time Preview**: Mini canvas (200px height) showing current slide

#### Toolbar
- **Top Toolbar**: 48px height, left-aligned tools, right-aligned actions
- **Tool Groups**: Selection, drawing, effects, alignment tools
- **Context Menus**: Right-click menus for quick actions

### Atmosphere Configuration Layout

#### Parameter Controls
- **Grouped Sliders**: Vertical stack with label above, slider below, value display right
- **Preset Selector**: Grid of 4 preset buttons (wispy, heavy, storm, calm)
- **Color Picker**: Inline color selector with swatches
- **Effect Type Selector**: Horizontal radio buttons for smoke/snow/rain/hearts/stars

#### Preview Area
- **Mini Canvas**: 200x150px preview with real-time updates
- **Controls Overlay**: Play/pause, reset buttons positioned over canvas
- **Performance Indicator**: FPS counter in bottom-right corner

### Responsive Breakpoints

#### Mobile (< 640px)
- Single column layout
- Collapsed sidebar navigation
- Touch-optimized controls (44px minimum touch targets)
- Simplified property panels

#### Tablet (640px - 1024px)
- Two-column layout where applicable
- Expandable sidebar
- Medium-sized controls and spacing

#### Desktop (> 1024px)
- Multi-column layouts
- Persistent sidebar
- Full feature set with advanced controls

### Accessibility Layout Considerations

#### Focus Management
- Visible focus rings (2px orange outline)
- Logical tab order following visual layout
- Skip links for main content areas

#### Screen Reader Support
- Semantic HTML structure with proper headings
- ARIA labels for complex components
- Live regions for dynamic content updates

#### Touch and Motion
- Minimum 44px touch targets
- Reduced motion support for animations
- Swipe gestures for mobile navigation

This element layout system ensures consistent, accessible, and scalable UI patterns across the AccelRestaurants platform, supporting both the complex slide editor and the streamlined player interface.