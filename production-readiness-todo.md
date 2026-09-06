# Production Readiness Todo List

This document outlines the prioritized tasks required to prepare AccelRestaurants for production. Issues have been evaluated for severity and impact, and related items have been aggregated.

## Level 1: Critical (Launch Blockers)
**Focus:** Security, Data Integrity, Core Functionality, Billing, and Legal Compliance. These must be resolved before any public release.

### Security & Data Isolation
- [x] **Fix Cross-Account Data Leak:** Ensure slides and other resources created by one account are not accessible to other accounts. (Currently, a new account can see slides from other accounts).
- [x] **Fix Dashboard Counts:** Specific counts (slides, etc.) do not update or reflect the current user's data, likely related to the data isolation issue.

### Core Functionality & Stability
- [x] **Fix Screen Saving:** Resolve "Failed to Save Screens" error.
- [x] **Fix Menu Saving:** Resolve 400 error when saving menus ("Failed to load resource").
- [x] **Fix Super Admin Console Errors:**
  - [x] Fix "Failed to load designers".
  - [x] Fix "Failed to invite designer".
  - [x] Fix "Failed to start impersonation".
  - [x] Fix "Failed to update tile access".
- [x] **Fix Settings Actions:**
  - [x] Fix Avatar Upload ("Click to upload" does nothing).
  - [x] Fix Data Export button (does nothing).
- [x] **Fix Support Contact:** "Send message" button in Help & Support does nothing.

### Billing (Stripe)
- [x] **Connect Platform Billing:** Link the following Stripe price keys to the application logic:
  - Free: `price_free`
  - Basic: `price_basic`
  - Growth: `price_growth`
  - Enterprise: `price_enterprise`
  - Franchise: `price_franchise`
  - Add-ons: `price_extra_screen_basic`, `price_extra_screen_growth`, `price_extra_seat_basic`, `price_extra_seat_growth`, `price_extra_seat_enterprise`

### Legal & Compliance
- [x] **Implement Terms of Service (TOS):** Add TOS page/modal using the text provided in **Appendix A**.
- [x] **Implement Privacy Policy:** Add Privacy Policy page/modal using the text provided in **Appendix B**.
- [x] **Update Copyright:** Ensure footer reads "Accel Analysis, LLC".

---

## Level 2: High Priority (Major Experience Issues)
**Focus:** Broken UI flows, Significant Bugs, and Misleading Content.

### UI/UX Layout & Polish
- [x] **Fix Full-Width Layout Issues:**
  - **Public View:** Ensure the view extends to the full width of the screen.
  - **Registration:** "Choose Your Plan" screen text is crunched; needs full width.
  - **Menus:** View does not appear to be full screen.
- [x] **Slide Editor UX:**
  - **Drag & Drop:** Fix clunky dragging; remove ghost image artifacting.
  - **Zoom:** Fix hardcoded "55%" zoom display; allow adjustment or remove misleading label.
  - **Franchise Tiles:** Fix issue where tiles appear locked (greyed out) but are still draggable.

### Feature Bugs (Slides & Atmosphere)
- [x] **Fix Atmosphere Effects:**
  - **Smoke:** Fix generation (currently non-functional).
  - **Hearts/Stars:** Fix incorrect rendering (hearts/stars not showing correct shapes).
  - **Leaves:** Add missing "Leaves" effect.
  - **Blend Mode:** Ensure blend mode selection applies changes.
  - **Effect Selection:** Fix bug where effect appears off-side until deselected/reselected.
- [x] **Fix Dynamic Text:** Hide source subtitles in deployment view.

### Content & Copy Accuracy
- [x] **Update Homepage Copy:**
  - Change "No expensive hardware required" to "No dedicated hardware required".
  - Revise "Join thousands of restaurants..." (Statement is not yet true, so we cannot say this yet).
  - Remove/Update "No credit card required for Free plan" CTA (Not in line with the overall business strategy of a differentiation strategy).
- [x] **Fix Broken Links:** Repair all footer links (Resources, etc.) and remove "API Docs" if not ready.

---

## Level 3: Medium Priority (Enhancements & Polish)
**Focus:** Visual upgrades, missing non-critical features, and standardizing the look.

### Visual Design
- [x] **Apply Branding:**
  - [x] Update Logo (use `resources/images` assets AccelRestaurants logo).
  - [x] Implement Speed Theme (backgrounds/styling).
  - [x] Apply Glassmorphism effects throughout.
- [x] **Video Integration:**
  - [x] Add the ability for the super admin to set a link or upload a video that appears in the Public View (upper right).
  - [x] Utilize videos from `resources/videos`.

### Feature Enhancements
- [x] **Slide Editor:**
  - [x] **Backgrounds:** Support Image URL input and File Upload for slide backgrounds.
  - [x] **Atmosphere:** Add "None" option to stop effects.
  - [x] **Text Tiles:** Allow configuration of background opacity/borders (fix transparency issues).
  - [x] **Canvas:** Add configuration for Slide Size and Orientation (Portrait/Landscape).
- [x] **Settings:**
  - [x] Add missing profile fields: Job Title, City, State, Zip Code.
  - [x] Implement Feedback Form for users/designers.
  - [x] Populate placeholder sections: "Getting Started", "Tiles & Components", "Screens & Deployment".

---

## Level 4: Low Priority (Future & Investigation)
**Focus:** Nice-to-haves, future features, and items requiring product definition.

### Future Features & Investigation
- [x] **Templates:** Evaluate implementation status and requirements including, but not limited to, examples on the public facing screen and their integration to the marketing flow, UI once logged in and super admin management of features
- [x] **Dayparting:** Verify if "Schedule menus" functionality exists or needs building.
- [x] **Multi-location:** Verify "Grouping tools" and master dashboard functionality.
- [x] **System Status:** Determine if a public System Status page is necessary for general users.
- [x] **Dashboard:** Identify additional widgets (e.g., Designer connections/progress).

### Content Strategy
- [ ] **Designers Value Prop:** Add content to Public view discussing the use of Designers.

---

## Investigation Findings

### Templates
- **Status:** Implemented.
- **Requirements:**
  - [x] **Database Schema:** Create Firestore collection for templates with fields: id, name, category, description, thumbnailUrl, content (screens/slides/menus JSON), createdBy, isPublic, tags.
    At full production readiness, the Firestore database includes a dedicated 'templates' collection with a comprehensive schema supporting all necessary fields for template management. This includes automatic indexing on key fields like category, createdBy, and tags for efficient querying. Data validation rules ensure required fields are present, and Firestore security rules restrict access based on user roles (e.g., only super admins can create public templates). The schema supports versioning of templates to track changes over time, with fields for lastModified, versionNumber, and changelog. Integration with Firebase Storage handles thumbnail images, with automatic cleanup of unused assets. The database supports soft deletes for templates, allowing recovery of accidentally deleted items.
  - [x] **Template Editor:** Build super admin interface to create/edit/delete templates, including drag-and-drop layout builder similar to slide editor.
    At full production readiness, the Template Editor is a comprehensive web-based interface accessible only to super admin users through the SuperAdminDashboard. It features a drag-and-drop canvas similar to the slide editor, allowing admins to build complex layouts with components like text blocks, images, menus, and dynamic content placeholders. The editor includes real-time preview across different screen sizes and orientations, with responsive design tools. Version control allows saving drafts and publishing updates without disrupting existing uses. Integration with asset libraries enables uploading and managing template-specific media. Advanced features include conditional logic for dynamic content, accessibility checks, and export/import capabilities for template sharing between environments. The editor enforces validation rules to ensure templates are compatible with the current platform version.
  - [x] **Template Gallery:** Make LandingPage TemplateCard components functional - clicking navigates to sign-up or demo preview.
    At full production readiness, the Landing Page includes a fully functional Template Gallery section showcasing curated template collections organized by categories (e.g., Restaurant Types, Menu Styles, Branding Themes). Each TemplateCard displays a high-quality thumbnail, title, description, and preview button. Clicking a card opens a modal with an interactive preview of the template, allowing visitors to see how it looks and functions without account creation. Preview includes navigation through sample screens/slides/menus. From the preview, users can sign up for a new account or request a demo. The gallery supports filtering and searching, with analytics tracking user interactions. Templates are cached for fast loading, and the section is optimized for SEO with structured data markup. Integration with marketing tools allows personalized recommendations based on user behavior.
  - [x] **Marketing Flow Integration:** Add template selection step in onboarding flow for new organizations.
    At full production readiness, the onboarding flow prioritizes the revenue-generating Designer marketplace as the primary option for new organizations, highlighting professional design services to create custom content. Templates are presented as a cost-effective alternative for users who prefer self-service or have simpler needs. The flow includes a clear bifurcation: first showcasing Designer onboarding with project briefs and budget options, then offering templates as a secondary path with curated selections. Users can switch between options during onboarding, with analytics tracking preference patterns. Templates are marketed as quick-start solutions that can be enhanced later with Designer services. The integration includes upsell prompts encouraging template users to consider Designer upgrades for premium customization.
  - [x] **Logged-in UI:** Add "Start from Template" option in screen/slide/menu creation wizards, with gallery modal.
    At full production readiness, all creation wizards for screens, slides, and menus include a prominent "Start from Template" button or tab at the beginning. Clicking it opens a modal gallery displaying available templates filtered by type (screen/slide/menu) and user permissions. Templates can be previewed within the modal, with options to customize before import. The gallery supports user-created templates, organization-shared templates, and public ones. Recent and popular templates are highlighted. Upon selection, the template content is cloned into the user's workspace, with intelligent asset duplication (e.g., copying images to user's storage). The UI provides feedback during import and suggests next steps. This feature is integrated across all relevant pages: ScreenManager, SlideEditor, MenuBuilder, and AdminDashboard creation flows. Accessibility features ensure the gallery is usable with keyboard navigation and screen readers.
  - [x] **Content Import:** Implement logic to clone template content into user's screens/slides/menus with proper asset duplication.
    At full production readiness, the content import system is a robust backend service that handles deep cloning of template structures into user accounts. It processes complex JSON structures for screens/slides/menus, resolving references and duplicating all associated assets (images, videos, fonts) to the user's Firebase Storage bucket with proper permissions. The system handles template versioning, ensuring compatibility with current platform features. It includes conflict resolution for duplicate names, with automatic renaming and user prompts for critical decisions. Import operations are logged for audit trails, and rollbacks are supported in case of errors. Performance optimizations include batch processing for large templates and progress indicators for long-running imports. Security measures prevent malicious template content, with sanitization of scripts and validation of asset URLs. The import logic supports partial imports and customization hooks for advanced users.
  - [x] **Super Admin Management:** Add template management panel in SuperAdminDashboard with CRUD operations and analytics.
    At full production readiness, the SuperAdminDashboard includes a dedicated Templates panel with full CRUD operations: create, read, update, delete, and bulk actions. Admins can manage template visibility (public/private), categories, tags, and approval workflows. The panel displays usage analytics including view counts, adoption rates, and user feedback. Advanced features include template duplication, export/import for backup, and version history with diff views. Moderation tools allow reviewing user-submitted templates before publication. The interface supports bulk operations like category reassignment and status changes. Integration with notification systems alerts admins of template issues or high-demand categories. Security logging tracks all admin actions for compliance. The panel is responsive and accessible, with search and filtering capabilities for managing large template libraries.

### Dayparting
- **Status:** Implemented.
- **Requirements:**
  - [x] **Schema Updates:** Add scheduling fields to Menu schema: schedule array with { startTime, endTime, daysOfWeek, timezone, active }.
    At full production readiness, the Menu schema in Firestore is enhanced with a comprehensive scheduling system supporting complex dayparting rules. The schedule array contains objects with detailed fields: startTime and endTime as UTC timestamps, daysOfWeek as an array of integers (0-6 for Sunday-Saturday), timezone as a string reference to the organization's timezone, active as a boolean flag, and additional metadata like priority for overlapping schedules. The schema includes fallback menus for off-hours, with fields for defaultMenuId and emergencyMenuId. Versioning supports schedule history, with createdAt, updatedAt, and updatedBy fields. Security rules ensure only authorized users can modify schedules, and data validation prevents invalid time ranges. The schema integrates with location-specific menus for multi-location support, allowing different schedules per location. Indexing on timezone and daysOfWeek enables efficient querying for active menus.
  - [x] **Menu Editor UI:** Extend MenuEditor component with scheduling tab, allowing users to add/edit/delete time-based rules for menu availability.
    At full production readiness, the MenuEditor component includes a dedicated Scheduling tab with an intuitive calendar-based interface for managing dayparting rules. Users can visually drag and drop time blocks on a weekly calendar grid, with color-coded schedules for different menus. The UI supports recurring rules (daily, weekly, custom), exceptions for holidays, and bulk operations for multiple locations. Advanced features include schedule templates (e.g., breakfast/lunch/dinner), conflict resolution wizards, and integration with Google Calendar for syncing events. The interface provides real-time feedback on schedule coverage, highlighting gaps or overlaps. Accessibility features include keyboard navigation and screen reader support. The tab includes analytics showing historical menu performance by time slot, helping users optimize scheduling. Undo/redo functionality and autosave prevent data loss during editing.
  - [x] **Screen Logic:** Modify Screen/Slide display logic to check active schedules and rotate content based on current time/day.
    At full production readiness, the screen display engine incorporates real-time schedule checking using a robust backend service that queries active menus based on current UTC time, location timezone, and day of week. The logic supports hierarchical menu selection: location-specific schedules override organization defaults, with fallback to global menus. For screen rotation, the system dynamically updates displayed content when schedules change, with smooth transitions to avoid jarring user experiences on digital signage. The engine handles concurrent schedule changes, caching frequently accessed schedules for performance. Integration with Firebase Cloud Functions enables server-side schedule validation and pushes updates to connected screens via WebSockets or polling. Error handling includes graceful degradation to last-known good menu if schedule queries fail. The logic supports advanced features like gradual transitions (e.g., warning slides before menu changes) and conditional content based on external factors like weather or events.
  - [x] **Timezone Support:** Implement timezone handling using organization/location timezones, with UTC storage and local conversion.
    At full production readiness, the system uses a comprehensive timezone management framework based on the IANA Time Zone Database. Organizations set a primary timezone during setup, with locations inheriting it by default but allowing overrides. All schedule times are stored in UTC internally for consistency, with automatic conversion to local time for display and editing. The backend uses libraries like moment-timezone for accurate conversions, handling daylight saving transitions seamlessly. User interfaces display times in local timezone with clear indicators, and APIs provide timezone-aware responses. The system supports global deployments with proper handling of international date lines and half-hour timezone offsets. Audit logging tracks timezone changes for compliance, and notifications alert users of upcoming DST changes that might affect schedules. Frontend caching reduces conversion overhead, with server-side validation ensuring schedule integrity across timezones.
  - [x] **Validation:** Add frontend validation for schedule overlaps and backend checks to prevent conflicting schedules.
    At full production readiness, validation occurs at multiple layers with comprehensive overlap detection. Frontend validation provides immediate feedback as users create schedules, highlighting potential conflicts with visual indicators and suggesting resolutions. The system uses algorithms to detect various overlap types: complete overlaps, partial overlaps, and edge cases like DST transitions. Backend validation runs on save, with server-side checks preventing invalid data from persisting. For multi-location setups, validation considers cross-location conflicts if screens share content. Advanced validation includes business rule checks (e.g., minimum menu duration, maximum schedules per day) and integration with external calendars. Error messages are contextual and actionable, with auto-fix suggestions like adjusting overlapping times. The validation system supports bulk operations, flagging issues in batch edits. Performance optimizations include incremental validation for large schedule sets, with async processing for complex rule sets.
  - [x] **Preview Mode:** Add schedule preview in menu editor to show how menus will rotate throughout the day/week.
    At full production readiness, the Preview Mode is an interactive timeline simulator within the MenuEditor that allows users to scrub through time and see exactly how menus will rotate. The interface displays a horizontal timeline with draggable current-time indicator, showing active menus at any point. Users can play/pause the simulation, jump to specific times, and see transitions between menus. The preview supports different view modes: daily, weekly, or custom ranges, with zoom controls for detailed minute-by-minute views. Integration with screen preview shows actual content changes, including transition effects. For multi-location organizations, the preview can switch between locations to compare schedules. Analytics overlay displays projected performance metrics like expected views per menu. The mode includes export functionality for sharing schedule previews with team members, and accessibility features like keyboard controls and high-contrast themes. Real-time updates reflect unsaved changes, providing instant feedback during editing.

### Multi-location
- **Status:** Location schema, UI, and functionality implemented including grouping tools and master dashboard.
- **Requirements:**
  - [x] **Location Management UI:** Build location CRUD interface in organization settings, allowing add/edit/delete locations with address, timezone, name.
    At full production readiness, the Organization Settings includes a comprehensive Location Management interface with full CRUD operations for locations. The UI features a map-based view using Mapbox integration, allowing users to visually place locations on a map by clicking or searching addresses. Each location form includes detailed fields: name, address (with autocomplete via Google Places API), timezone selection from a dropdown, contact information, operating hours, and custom metadata fields. The interface supports bulk operations for adding multiple locations and importing from CSV files. Advanced features include location grouping (e.g., regions or chains), duplicate detection, and integration with external systems like POS or CRM. Validation ensures address accuracy and timezone consistency. The UI includes search and filtering for managing large location sets, with export capabilities. Permissions control who can manage locations based on organizational roles. Audit logging tracks all changes for compliance and troubleshooting.
  - [x] **Screen Association:** Add locationId field to Screen schema and UI to assign screens to specific locations during creation/editing.
    At full production readiness, the Screen schema includes a locationId field referencing the locations collection, with cascading updates for location changes. The UI for screen creation and editing includes a location selector with hierarchical dropdowns (organization > region > location) and search functionality. Screens can be assigned to multiple locations for shared content, with inheritance rules for content distribution. The association supports dynamic assignment based on rules (e.g., all screens in a location get certain menus). During editing, the UI shows location-specific previews and validation warnings for incompatible assignments. Bulk assignment tools allow moving screens between locations efficiently. Integration with location permissions ensures users can only assign screens to accessible locations. The system includes conflict resolution for location-specific content overrides and audit trails for assignment changes. Real-time synchronization ensures screen content updates when location associations change.
  - [x] **Menu Association:** Optionally associate menus with locations for location-specific offerings.
    At full production readiness, menus can be optionally associated with specific locations through a flexible association system in the Menu schema. The association supports one-to-many relationships, allowing a menu to serve multiple locations while locations can have multiple menus. The UI includes association controls in menu editing, with location pickers and inheritance settings. Advanced features support location-specific overrides for menu items (e.g., different prices or availability). The system integrates with dayparting schedules, allowing location-specific timing rules. During menu publishing, the platform validates associations and provides warnings for unassigned locations. Bulk association tools enable efficient setup for new locations or menu rollouts. The association supports conditional logic based on location attributes (e.g., seasonal menus for certain regions). Audit logging and versioning track association changes for compliance and rollback capabilities.
  - [x] **Grouping Tools:** Implement location-based filtering and grouping in AdminDashboard screens list, with tabs/groups for each location.
    At full production readiness, the AdminDashboard screens list includes advanced location-based grouping and filtering tools. The interface features tabbed views for each location, with collapsible groups showing screens hierarchically. Filtering options include location, status, type, and custom tags, with saved filter presets. The list supports drag-and-drop for bulk operations like moving screens between locations or applying templates. Advanced grouping includes virtual groups (e.g., 
  - [x] **Master Dashboard:** Create aggregated overview page showing stats across all locations (total screens active, menus, etc.) with location breakdown.
    At full production readiness, the Master Dashboard provides a comprehensive aggregated view across all locations in the organization. The page displays key metrics like total active screens, deployed menus, content views, and performance indicators with location-by-location breakdowns. Interactive charts show trends over time, with drill-down capabilities to individual locations or screens. The dashboard includes heat maps for location performance, alerts for issues (e.g., offline screens), and comparative analytics between locations. Customizable widgets allow users to add organization-specific metrics. Real-time updates via WebSockets keep data current, with offline mode for cached views. Export functionality supports PDF reports and CSV data dumps. Permissions control dashboard access, with role-based views (e.g., location managers see only their locations). Integration with external BI tools allows advanced reporting and forecasting.
  - [x] **Permissions:** Update role-based access to allow location-specific management (e.g., location admins).
    At full production readiness, the permission system is enhanced with granular location-based access controls. Roles include platform admins, organization owners, location admins, and location users, with inheritance and override capabilities. Location admins can manage screens, menus, and users within their assigned locations, with approval workflows for cross-location actions. The system supports permission templates for quick role assignment and custom permissions for specific resources. UI components respect permissions dynamically, hiding or disabling unauthorized actions. Audit logging captures all permission changes and access attempts. Integration with SSO providers allows location-specific authentication. The permissions extend to API access, ensuring secure data isolation between locations. Training and onboarding materials explain permission structures, with automated notifications for permission updates or expirations.

### System Status
- **Status:** No public status page; only internal dashboard widget.
- **Requirements:**
  - [ ] **Public Status Page:** Create /status route and page component displaying real-time service status (database, API, storage, etc.).
    At full production readiness, the Public Status Page is a dedicated route (/status) and React component providing transparent real-time visibility into service health for all users and visitors. The page displays status indicators for critical services: database (Firestore), API endpoints, storage (Firebase Storage), functions, authentication, and external integrations. Status is color-coded (green/operational, yellow/degraded, red/outage) with detailed descriptions and last updated timestamps. The page includes uptime statistics for the last 30/90 days, with historical charts showing service reliability. Real-time updates via WebSockets or polling ensure current status, with caching for performance. The interface supports multiple languages, is fully responsive, and optimized for SEO. Integration with incident tracking shows active and resolved issues. Users can subscribe to updates, and the page includes links to support resources. Security measures prevent abuse while allowing public access, and analytics track page views for improvement insights.
  - [ ] **Backend Health Checks:** Implement Firebase Functions for periodic health checks of critical services (Firestore, Storage, Functions).
    At full production readiness, the backend health check system uses Firebase Cloud Functions to perform comprehensive, automated monitoring of all critical services. Functions run on scheduled intervals (every 1-5 minutes) executing synthetic transactions: database read/writes, storage uploads/downloads, API endpoint calls, and function invocations. Results are stored in Firestore with detailed metrics including response times, error rates, and throughput. The system supports custom health check scripts for complex validations, with configurable thresholds for alerting. Integration with external monitoring services (e.g., UptimeRobot, DataDog) provides redundancy. Health checks include geographic distribution testing from multiple regions to detect regional issues. The system maintains historical data for trend analysis and SLA compliance. Security ensures health checks don't expose sensitive data, and the functions are optimized for cost and performance with efficient resource allocation.
  - [ ] **Status API:** Build RESTful API endpoints to query current status and historical uptime metrics.
    At full production readiness, the Status API provides RESTful endpoints for programmatic access to service status and metrics. Endpoints include /api/v1/status/current for real-time status, /api/v1/status/history for uptime metrics over specified periods, and /api/v1/status/incidents for incident details. The API supports filtering by service, time range, and status type, with JSON responses including timestamps, status codes, and detailed messages. Rate limiting and authentication (API keys) prevent abuse while allowing integrations. The API includes webhook capabilities for automated notifications. Documentation with OpenAPI spec enables easy integration for third-party monitoring tools. Caching layers improve performance, and the API supports CORS for web integrations. Historical data retention follows compliance requirements, with aggregation for long-term trends. Security includes encryption in transit and input validation to prevent injection attacks.
  - [ ] **Incident Tracking:** Add incident logging and display system for downtime/incidents with timestamps and descriptions.
    At full production readiness, the Incident Tracking system is a comprehensive logging and management platform for service disruptions. Incidents are automatically detected by health checks or manually created by admins, with fields including title, description, impact level (minor/major/critical), affected services, start/end times, and root cause analysis. The system maintains incident timelines with updates, and integrates with communication tools for automatic notifications. A public incident page displays active and resolved incidents with user-friendly descriptions. Post-incident reviews are supported with lessons learned and preventive actions. The system includes analytics on incident frequency, resolution times, and impact metrics. Integration with external tools like PagerDuty or Slack enhances alerting capabilities. Access controls ensure only authorized personnel can create or update incidents, with audit trails for compliance. The interface supports rich text formatting and file attachments for detailed documentation.
  - [ ] **Status Components:** Create reusable status indicator components (green/yellow/red) with tooltips showing last check time.
    At full production readiness, the Status Components are a library of reusable React components providing consistent status visualization across the platform. Core components include StatusBadge (icon + color), StatusIndicator (dot/circle), and StatusCard (detailed panel). Each component supports green/yellow/red states with customizable labels, tooltips showing last check time and next check, and click handlers for detailed views. Components are theme-aware, supporting light/dark modes and custom color schemes. Accessibility features include ARIA labels and keyboard navigation. The library includes animated transitions for status changes and loading states. Components integrate with the status API for real-time data, with caching for performance. TypeScript interfaces ensure type safety, and the components are optimized for bundle size. Storybook documentation provides usage examples and testing. Integration with design systems ensures consistency with overall UI patterns.
  - [ ] **Notifications:** Optional: Implement webhook/email notifications for status changes to subscribed users.
    At full production readiness, the Notifications system provides flexible alerting for status changes to subscribed users and systems. Webhook integrations allow real-time notifications to Slack, Discord, PagerDuty, or custom endpoints with configurable payloads. Email notifications use templates for status updates, incidents, and maintenance windows, with unsubscribe options. Users can subscribe to specific services or all updates via their account settings. The system supports escalation rules for critical incidents and scheduled maintenance notifications. Integration with incident tracking automatically triggers notifications for new incidents. Rate limiting prevents notification spam, and the system includes retry logic for failed deliveries. Analytics track notification engagement and effectiveness. Security ensures webhook URLs are encrypted and email content is sanitized. The feature is optional but enabled by default for admins, with granular controls for notification preferences.

### Dashboard Widgets
- **Current Widgets:** Total Screens, Digital Menus, Content Slides, Media Assets, System Status, Quick Actions.
- **Suggested Additional Widgets:**
  - [x] **Designer Connections Widget:** Query active designer jobs from Firestore, display job status, deadlines, designer ratings, and quick actions to view details.
    At full production readiness, the Designer Connections Widget is a dynamic dashboard component that provides real-time visibility into active design projects and designer interactions. It queries Firestore for jobs associated with the user's organization, displaying status indicators (draft, in-progress, review, completed), deadlines with color-coded urgency alerts, and designer profiles with ratings, portfolio links, and communication history. Quick actions include messaging designers, viewing project details, approving revisions, and rating completed work. The widget supports filtering by project type, status, or designer, with notifications for upcoming deadlines or status changes. Integration with the Designer marketplace allows direct booking of new projects from the widget. Analytics track engagement metrics like response times and project completion rates. The widget is responsive, with mobile-optimized layouts and accessibility features for screen readers. Security ensures users only see their organization's projects, with audit logging for all interactions.
  - [x] **Recent Activity Feed:** Implement activity logging system (user actions like screen creation, menu updates), store in Firestore, display in scrollable widget with timestamps and icons.
    At full production readiness, the Recent Activity Feed is a comprehensive logging and display system that captures all user and system actions across the platform. Activities are stored in a dedicated Firestore collection with structured fields including action type, user ID, organization ID, timestamps, affected resources, and metadata. The widget displays a scrollable feed with chronological entries, each featuring icons representing action types (create, update, delete, deploy), user avatars, and concise descriptions. Filtering options allow users to view activities by user, resource type, time range, or location. Advanced features include export functionality for compliance audits, real-time updates via WebSockets, and integration with notification systems for important events. The feed supports pagination for performance with large datasets, and includes search capabilities. Permissions control visibility based on user roles, ensuring sensitive actions are appropriately restricted. The system includes data retention policies and aggregation for performance optimization.
  - [x] **Performance Metrics Widget:** Add analytics tracking for screen views/uptime (via Firebase Analytics or custom events), display charts for daily/weekly metrics.
    At full production readiness, the Performance Metrics Widget provides comprehensive analytics on screen performance and system uptime using Firebase Analytics integrated with custom event tracking. It displays interactive charts showing daily and weekly metrics including screen view counts, uptime percentages, load times, and engagement rates. The widget supports drill-down into specific screens, locations, or time periods, with comparative views against historical data or benchmarks. Advanced features include predictive analytics for uptime trends, anomaly detection for performance issues, and integration with external monitoring tools. Data visualization uses Recharts with customizable themes and export options for reports. Real-time updates ensure current data, with caching for performance. The widget includes alerts for significant metric changes and integrates with notification systems. Permissions allow role-based access to sensitive metrics, and data is aggregated to protect user privacy while providing actionable insights for optimization.
  - [x] **Billing Status Widget:** Fetch subscription data from Stripe API, show current plan, usage limits, next billing date, and payment status.
    At full production readiness, the Billing Status Widget integrates directly with Stripe API to provide real-time subscription and billing information. It displays current plan details, usage metrics against limits (screens, storage, API calls), next billing date with amount, and payment status indicators. The widget includes visual progress bars for usage limits, alerts for approaching thresholds, and quick actions for plan upgrades or payment method updates. Advanced features support multi-currency display, invoice history with download links, and integration with accounting systems. Real-time updates via webhooks ensure accuracy, with offline caching for reliability. The widget respects permissions, showing organization-level billing for admins and individual usage for users. Security measures include encrypted API communication and compliance with PCI standards. The interface includes help links for billing questions and proactive notifications for payment failures or changes.

---

# Appendix A: Terms of Service (TOS) Addendum

*Insert into existing TOS draft.*

### Definitions
**“Designer Marketplace”** (also referred to as “Designer Marker Place”) means any feature of the Services that enables Users to discover, communicate with, contract with, or pay third-party designers.
**“Designer”** means any third party that offers design, creative, content, branding, layout, menu board design, media creation, templates, or other creative services through the Designer Marketplace, and who is **not** an employee, agent, partner, or subcontractor of Company unless expressly stated in a signed writing by Company.
**“Designer Services”** means services provided by a Designer to a User.
**“Project”** means any engagement, job, order, or request between a User and a Designer.
**“Deliverables”** means all work product, files, creative output, designs, layouts, documents, media, or other materials produced in connection with a Project.

### Section: Designer Marketplace and Third-Party Designers

#### 2.1 Platform Only; No Employment or Agency
Company provides the Designer Marketplace solely as a neutral platform to facilitate connections between Users and Designers. **Designers are independent third parties** and are not employees, agents, joint venturers, partners, subcontractors, or representatives of Company. Company does not control Designers, does not direct their work, and is not responsible for any Designer’s acts, omissions, communications, or performance.

#### 2.2 Your Relationship is Directly With the Designer
Any Project is **a direct agreement between you and the Designer**. You are solely responsible for:
* confirming scope, timing, pricing, revisions, and acceptance criteria;
* confirming rights/permissions (including fonts, stock media, trademarks, likeness rights);
* confirming compliance (advertising claims, pricing accuracy, required disclosures, allergen/nutrition statements, etc.); and
* determining whether a Designer is suitable for your needs.

Company is not a party to any agreement between you and a Designer and **disclaims all responsibility** for such agreements.

#### 2.3 No Endorsement; No Screening Guarantee
Company may display Designer profiles, portfolios, ratings, or other information, but **does not endorse, guarantee, or warrant** any Designer or Designer Services. Any checks, verifications, badges, or “recommended” designations (if offered) are informational only and do not create any warranty or obligation by Company.

#### 2.4 Payments, Fees, and Refunds (If Enabled)
If the platform enables payments to Designers, you authorize Company and/or its payment processor to process payments and applicable platform fees. **All payment disputes related to the Designer’s work—including quality, scope, timing, revisions, or non-performance—must be handled directly with the Designer**, not Company.

To the maximum extent permitted by law, Company:
* does not guarantee refunds for Designer Services;
* is not responsible for chargebacks or reversals initiated by you or the Designer; and
* may (but is not obligated to) provide limited administrative support for payment processing issues.

#### 2.5 Deliverables, IP, and Licensing Are Between You and the Designer
Unless expressly stated otherwise in a separate written agreement between you and the Designer, Deliverables and intellectual property rights are determined solely between you and the Designer. Company does not guarantee that Deliverables are non-infringing or fit for a particular purpose.
You are responsible for ensuring your use of Deliverables complies with applicable law and third-party rights.

#### 2.6 Disputes With Designers Must Be Resolved With the Designer
You agree that **any dispute, claim, or controversy arising from or relating to a Designer, Designer Services, a Project, or Deliverables is strictly between you and the Designer**. You agree:
* to pursue resolution directly with the Designer first; and
* **not to name, include, or join Company** in any such dispute to the maximum extent permitted by law.

Company may, at its sole discretion, attempt to facilitate communication between you and a Designer, but has **no obligation** to do so and does not act as an arbitrator, mediator, or decision-maker.

#### 2.7 Release
To the maximum extent permitted by law, you release Company from any and all claims, demands, damages, liabilities, losses, costs, and expenses arising out of or related to:
* your interactions with any Designer,
* any Project or Deliverables,
* any Designer’s acts or omissions,
* any alleged infringement or misuse of intellectual property in Deliverables,
* any content displayed or published based on Designer Deliverables.

#### 2.8 Indemnity for Designer-Related Claims
Without limiting your indemnification obligations elsewhere in these Terms, you agree to defend, indemnify, and hold harmless Company from any claims or disputes arising out of or related to any Designer, Designer Services, Project, or Deliverables, including claims by a Designer against you or by third parties arising from Deliverables you use or display.

### Update: Dispute Resolution / Arbitration

**Designer Disputes Excluded From Company Dispute Process**
For clarity: **Company’s informal resolution and arbitration provisions apply only to disputes between you and Company.** Disputes between you and any Designer (including Designer Services, Projects, payments for Designer work, quality, scope, timing, revisions, or Deliverables) must be handled directly with the Designer under Section “Designer Marketplace and Third-Party Designers,” and Company is not a proper party to such disputes.
**If you nonetheless assert a claim against Company arising out of a Designer dispute**, that claim remains subject to the mandatory arbitration, limitation of liability, and other protections in these Terms.

### Update: Limitation of Liability
Add: "Company’s limitations and disclaimers apply fully to Designer-related claims."

### Mandatory Designer–User Arbitration (JAMS; Keep Company Out)
**10.1 Mandatory Arbitration for Designer–User Disputes**
You agree that all disputes, claims, or controversies between you and any User arising out of or relating to Designer Services, Projects, Deliverables, revisions, payments, refunds, chargebacks, communications, alleged infringement, or any other interaction between you and the User (each, a “Designer–User Dispute”) will be resolved by binding arbitration administered by JAMS, and not in court, except:
* either party may bring an individual claim in small claims court if eligible under applicable law and rules, and
* either party may seek temporary injunctive relief in a court of competent jurisdiction solely to prevent imminent harm related to misuse of intellectual property or confidential information (with the merits still resolved by arbitration unless prohibited by law).

**10.2 Administrator and Rules**
Arbitration will be administered by JAMS under the JAMS rules then in effect that are applicable to the dispute type (including any consumer or expedited rules, if applicable).

**10.3 Seat / Location (Virginia Default; User’s State When Required)**
* Default Seat: Unless required otherwise by applicable law, the seat of arbitration will be Commonwealth of Virginia, and hearings may occur in Fairfax County, Virginia (or another Virginia location selected by JAMS consistent with its rules).
* User’s State When Required: If applicable law requires that arbitration occur in the User’s state of residence (or otherwise prohibits requiring Virginia as the seat), then the seat will be the User’s state of residence, in a location determined by JAMS consistent with its rules.
* Remote Option: The arbitrator may permit the arbitration to be conducted by video, telephone, or based on written submissions, to the maximum extent permitted by JAMS rules and applicable law.

**10.4 Governing Law for Arbitration Enforcement**
The Federal Arbitration Act (FAA) governs the interpretation and enforcement of this arbitration provision to the maximum extent permitted. For substantive claims, the arbitrator will apply the applicable governing law as determined by Section 15 (Governing Law) below, except where prohibited by law.

**10.5 Class, Collective, and Representative Action Waiver**
You and the User agree that any Designer–User Dispute must be brought only in an individual capacity, and not as a plaintiff or class member in any purported class, collective, private attorney general, or representative proceeding, to the maximum extent permitted by law.

**10.6 Company Not a Party; No Joinder**
You and the User agree that Company is not a party to any Designer–User Dispute and must not be named, joined, or impleaded in any such dispute.

**10.7 No Compelled Participation by Company (Maximum Extent Permitted)**
To the maximum extent permitted by law, you agree you will not seek to require Company to participate in Designer–User Disputes, including through subpoenas for testimony or production. If a subpoena or legal process is served on Company, you agree to reimburse Company for reasonable costs and attorneys’ fees incurred in responding, unless prohibited by law.

**10.8 Pre-Arbitration Informal Resolution (Direct to Each Other)**
Before initiating arbitration, you and the User agree to attempt good-faith informal resolution for at least 30 days by sending a written notice of dispute to the other party (email is acceptable if provided in profile or project terms), describing the issue and the relief requested.

**Update to Section 15 “Governing Law”**
“If applicable law requires a different governing law for a Designer–User Dispute (including consumer protection requirements), the arbitrator will apply that law to the extent required.”

---

# Appendix B: Privacy Policy

**Effective Date:** [Insert Date]
**Last Updated:** [Insert Date]

This Privacy Policy explains how **Accel Analysis, LLC** and its brands and affiliated entities, including **AccelRestaurants** (collectively, “**Company**,” “**we**,” “**us**,” “**our**”), collect, use, disclose, and protect information when you access or use our websites, applications, software, and related services (collectively, the “**Services**”).

By using the Services, you agree to the practices described in this Privacy Policy. If you do not agree, do not use the Services.

## 1) Scope
This Privacy Policy applies to information we collect:
* through the Services (including account creation, platform usage, and support),
* through communications with us (email, chat, phone, forms),
* from integrations and third-party providers you connect to the Services, and
* from your devices and browsers (e.g., cookies and analytics).
This Privacy Policy does **not** apply to third-party websites, apps, or services that we do not control, even if they are linked from our Services.

## 2) Key Definitions
* **“Personal Information”** means information that identifies, relates to, describes, or could reasonably be linked to an individual (as defined by applicable law).
* **“Customer Data”** means data submitted to the Services by or on behalf of a business customer (including business content, menu content, images/videos, layouts, screen configurations, and any personal data contained within such content).
* **“Partner Designer” / “Designer”** means a third-party design provider accessible through a Partner Designer feature or marketplace. Designers are **not employees** of Company. They may be independent contractors or third parties and may have their own privacy practices.
* **“Design Transaction”** means a user-requested design project facilitated through the Services, including scope, communication, and delivery of design outputs.

## 3) Information We Collect
### A) Information you provide to us
Depending on how you use the Services, you may provide:
* **Account Information:** name, email, phone number, password/credentials (stored in encrypted/hashed form where applicable), account role.
* **Business Information:** business name, location(s), address, business contact details, branding details, operating hours, and related profile information.
* **Content and Files:** menus, prices, promotions, product descriptions, images, videos, brand assets, templates, layouts, screen configurations, and other content you upload or create.
* **Communications:** messages, emails, support requests, feedback, and other communications.
* **Transaction Information:** subscription plan selection, billing contact details, and transaction metadata (note: payment card details are typically processed by third-party payment processors, not stored by Company, unless expressly stated).

### B) Information collected automatically
When you use the Services, we may automatically collect:
* **Device and Usage Data:** IP address, browser type, device identifiers, operating system, app version, timestamps, pages/screens viewed, actions taken, and referral URLs.
* **Log Data:** diagnostic, crash, and performance logs.
* **Approximate Location:** derived from IP address (e.g., city/state), primarily for security, analytics, and localization.

### C) Information from third parties
We may receive information from:
* **Payment processors** (e.g., confirmation of payment status, billing events),
* **Authentication providers** (e.g., single sign-on),
* **Integrations you enable** (e.g., content sources, analytics, media platforms),
* **Service providers** that support our operations (hosting, security, analytics, customer support tools, communications tools, security monitoring).

## 4) How We Use Information
We may use the information we collect to:
1. **Provide and operate the Services** (account creation, authentication, content management, screen deployment, syncing, hosting, and delivery).
2. **Process subscriptions and transactions** and manage billing, renewals, and account administration.
3. **Enable collaboration features** (multi-user access, role permissions, sharing).
4. **Enable and support Partner Designer functionality** (see Section 6).
5. **Maintain security and integrity** (fraud prevention, access control, monitoring, debugging).
6. **Improve and develop the Services** (product analytics, feature testing, performance optimization, research and development).
7. **Provide customer support** and respond to inquiries.
8. **Send service communications** (technical notices, confirmations, updates, security alerts).
9. **Send marketing communications** (where permitted by law and subject to your choices).
10. **Enforce our terms and policies** and comply with legal obligations.

We may also use information in **aggregated or de-identified** form for analytics, benchmarking, product improvement, and business planning, to the extent permitted by law.

## 5) How We Disclose Information
We may disclose information in the following circumstances:

### A) Service providers (processors)
We may share information with vendors and service providers that help us run the Services (e.g., hosting, databases, analytics, customer support tools, communications tools, security monitoring). They are authorized to use information only as necessary to provide services to us.

### B) Affiliates
We may share information with our affiliates and related entities for internal business purposes consistent with this Privacy Policy.

### C) Legal, safety, and enforcement
We may disclose information if we believe it is necessary to:
* comply with law, regulation, legal process, or governmental request,
* enforce our agreements or policies,
* protect the rights, safety, and security of Company, users, or others,
* detect, prevent, or address fraud, misuse, or security issues.

### D) Business transfers
If we are involved in a merger, acquisition, financing, reorganization, bankruptcy, or sale of assets, information may be transferred as part of that transaction.

### E) With your direction
We may share information when you direct us to (e.g., enabling integrations, inviting users, or requesting Designer involvement).

## 6) Partner Designer Functionality and Design Transactions
This section is specific to your request and is intended to clearly allocate responsibilities and limit Company liability.

### 6.1 Designers are not Company employees
Partner Designers are **not employed by Company**. They are independent contractors or third-party providers and may operate under their own policies and practices.

### 6.2 What we share with a Designer through the platform
If you use Partner Designer functionality, Company may share **only the information reasonably necessary** to complete the Design Transaction you requested. Depending on the project, this may include:
* your name and contact details (e.g., email),
* business name and general business context (e.g., restaurant type),
* design requirements you submit (brief, scope, preferences),
* brand assets you provide (logos, fonts, colors),
* menu content or layout content you request the Designer to work on,
* project status information needed to coordinate delivery.

**We do not intend to share more than is necessary** for the Designer to complete the work you requested through the platform.

### 6.3 Information you share directly with a Designer (outside the platform)
If you choose to communicate with a Designer outside the Services (e.g., personal email, phone, text, file-sharing links), you do so at your discretion.
**Company is not responsible or liable for:**
* information you share directly with a Designer outside the platform,
* the Designer’s privacy, security, storage, or use of that information,
* any disclosures, losses, or disputes arising from off-platform communications.

### 6.4 Disputes are between you and the Designer
To the maximum extent permitted by law, disputes regarding Designer conduct, deliverables, scope, quality, timelines, communications, or Designer communications are between you and the Designer. Company is not a party to that relationship.

### 6.5 Designer as separate recipient of information
A Designer who receives information for a Design Transaction may be considered a **separate business** with respect to the data they receive. Their handling of information is governed by their own practices, and you are responsible for reviewing/agreeing to any Designer terms or policies presented to you.

## 7) Data Retention
We retain information for as long as reasonably necessary to:
* provide the Services,
* maintain your account and content,
* comply with legal obligations,
* resolve disputes, and
* enforce our agreements.

Retention periods can vary depending on the type of data, how it is used, and applicable legal requirements. We may retain aggregated or de-identified information longer.

## 8) Security
We use reasonable administrative, technical, and physical safeguards designed to protect information. However, **no security system is impenetrable**, and we cannot guarantee absolute security. You are responsible for maintaining the confidentiality of your credentials and restricting access to your account.

## 9) Your Choices and Controls
Depending on your location and how you use the Services, you may have options to:
* update account/profile information,
* manage user permissions within your organization,
* opt out of marketing emails (via unsubscribe links),
* restrict cookies through browser settings (where applicable).

If you disable certain cookies or tracking technologies, some features may not function properly.

## 10) Cookies and Analytics
We may use cookies, pixels, local storage, and similar technologies to:
* keep you logged in,
* remember preferences,
* understand usage and improve performance,
* measure marketing effectiveness (where permitted).

You can control cookies via browser settings and other tools. Some cookies are required for core functionality.

## 11) Children’s Privacy
The Services are not directed to children under 13 (or under 16 in certain jurisdictions), and we do not knowingly collect personal information from children. If you believe a child has provided information, contact us so we can take appropriate steps.

## 12) Business Customers and Customer Data
If you use the Services on behalf of a business or organization:
* you are responsible for ensuring you have the right to upload and process Customer Data (including any personal information contained in it),
* you are responsible for providing notices and obtaining consents required by law for any end-user or customer data you place into the Services,
* Company processes Customer Data to provide the Services and for purposes described in this Privacy Policy.
If needed, we may provide a data processing addendum (DPA) upon request.

## 13) Jurisdiction-Specific Rights
Depending on your state/country, you may have rights such as access, correction, deletion, portability, or objection/opt-out of certain processing.
Where legally required, we will provide applicable rights and methods to submit requests. We may need to verify your identity and authority before fulfilling requests.

## 14) Changes to this Privacy Policy
We may update this Privacy Policy from time to time. The “Last Updated” date will reflect changes. If changes are material, we may provide additional notice as required by law. Continued use of the Services after changes becomes effective constitutes acceptance.

## 15) Contact Us
**Accel Analysis, LLC / AccelRestaurants**
**Privacy Contact Email:** [Insert Privacy Email]
**Support Email:** [Insert Support Email]
**Mailing Address:** [Insert Address]

---

# Appendix C: Designer Privacy Addendum & Disclosure

### Designer Privacy Addendum (Required Acceptance)
**Designer Privacy Addendum**
**Effective Date:** [Insert Date]

This Designer Privacy Addendum (“**Addendum**”) is entered into by and between **Accel Analysis, LLC** and its brands/affiliates including **AccelRestaurants** (collectively, “**Company**”) and the designer entity accepting this Addendum (“**Designer**,” “**you**,” “**your**”). This Addendum governs Designer’s receipt and use of certain information related to platform users and design projects.
By clicking “I Agree,” accessing the Partner Designer feature, or receiving any information from Company or Users through the platform, Designer agrees to be bound by this Addendum.

#### 1) Definitions
* **“User”** means a Company customer or authorized user of the Services requesting design work.
* **“Design Transaction”** means a user-requested design project facilitated through the Services.
* **“Designer Data”** means any information disclosed to Designer through the platform or by Company in connection with a Design Transaction, including User contact info, business info, brand assets, menu content, creative briefs, messages, and project metadata.
* **“Deliverables”** means the work product provided by Designer to a User.

#### 2) Purpose Limitation (Use Only for the Transaction)
Designer shall use Designer Data **only** as necessary to:
1. communicate with the User about the Design Transaction,
2. perform and deliver the requested design services and Deliverables, and
3. provide reasonable post-delivery support directly related to that Design Transaction (e.g., minor fixes, file delivery confirmations), unless otherwise agreed between Designer and User.

Designer shall **not**:
* use Designer Data for marketing, prospecting, lead generation, retargeting, or advertising,
* sell, rent, disclose, or otherwise monetize Designer Data,
* build user profiles or datasets unrelated to the specific Design Transaction,
* use Designer Data to contact Users for unrelated services unless the User separately, explicitly consents outside the platform.

#### 3) Data Minimization + No Excess Collection
Designer agrees to request, collect, and retain **only the minimum information needed** to perform the Design Transaction. If Designer believes additional information is necessary, Designer must request it **from the User** and explain why it is needed.

#### 4) Confidentiality
Designer Data is confidential. Designer must keep Designer Data confidential and restrict access to:
* Designer’s personnel who have a need to know for the Design Transaction, and
* any permitted subcontractors only as allowed under Section 6.

#### 5) Reasonable Security Controls (Baseline)
Designer will implement **reasonable administrative, technical, and physical safeguards** to protect Designer Data from unauthorized access, disclosure, alteration, or destruction. At a minimum, Designer agrees to:
* use strong, unique passwords and multi-factor authentication where available,
* restrict access to project files to authorized persons only,
* store files in reputable storage solutions and avoid public links without access controls,
* keep devices used to access Designer Data reasonably secured (e.g., lock screen, OS updates),
* avoid sharing Designer Data over insecure or public channels where practical.

#### 6) Subcontractors (No Sharing Without Controls)
Designer may not share Designer Data with subcontractors unless:
1. such sharing is necessary to complete the Design Transaction, and
2. the subcontractor is bound by written confidentiality and security obligations at least as protective as this Addendum.
Designer remains fully responsible for subcontractor acts and omissions.

#### 7) Prohibited Disclosures
Designer shall not disclose Designer Data to any third party except:
* to the User as part of the Design Transaction,
* to subcontractors as allowed above, or
* if required by law (in which case Designer must provide notice to Company to the extent legally permitted).

#### 8) Data Retention and Deletion
Designer shall retain Designer Data **only as long as reasonably necessary** to complete the Design Transaction and any agreed post-delivery support. Unless a longer period is required by law, Designer agrees to:
* delete or securely destroy Designer Data within **30 days** after completion of the Design Transaction **upon User request**, and
* in all cases, delete or securely destroy Designer Data within **180 days** after completion of the Design Transaction (except for limited records required for tax/accounting/legal compliance).
Designer may retain Deliverables solely to the extent needed for portfolio use **only if** the User separately and explicitly grants permission.

#### 9) Security Incident Notification
If Designer becomes aware of any actual or reasonably suspected unauthorized access to Designer Data (a “**Security Incident**”), Designer must:
* take prompt steps to contain and remediate,
* notify Company within **72 hours** of discovery with known details, and
* cooperate reasonably with Company and Users as needed.

#### 10) Disputes Are Directly Between Designer and User
Designer acknowledges and agrees that:
* Designer is an independent provider and not a Company employee, agent, or representative.
* Any disputes with Users (including scope, quality, timing, revisions, pricing, refunds, chargebacks, communications) are **solely between Designer and User** and must be handled directly by Designer.
* Designer shall not represent that Company is responsible for, guarantees, or is a party to Designer services.

#### 11) Indemnity (Designer → Company)
Designer will defend, indemnify, and hold harmless Company from any claims, damages, losses, liabilities, costs, and expenses (including attorneys’ fees) arising from or relating to:
* Designer’s breach of this Addendum,
* Designer’s handling of Designer Data,
* Designer’s Deliverables (including alleged infringement), and
* Designer’s services, communications, acts, or omissions.

#### 12) Termination and Survival
Company may suspend or terminate Designer’s access to Partner Designer features for breach of this Addendum. Sections on confidentiality, security, retention/deletion, disputes, indemnity, and any obligations that by their nature should survive will survive termination.

#### 13) Governing Law
This Addendum shall be governed by the laws of the Commonwealth of Virginia, without regard to conflict-of-law principles, except where federal law applies.

### User-Facing “Partner Designer Disclosure” Modal (One-Screen Acknowledgement)
**Title:** Partner Designer Disclosure

**Body (single screen):**
You’re about to share information with a **Partner Designer**, who is an **independent contractor** and **not an employee** of AccelRestaurants or Accel Analysis, LLC.
* **What we share:** We only provide the Designer the information **needed to complete your requested design transaction** (such as your project brief, relevant menu content, and brand assets).
* **Your choice:** If you share additional information with the Designer (especially **outside** the platform via email, text, phone, or file links), you do so at your discretion.
* **Disputes:** Any issues related to the Designer’s work (scope, quality, timing, revisions, refunds) must be resolved **directly with the Designer**.
* **Liability:** AccelRestaurants / Accel Analysis is **not responsible** for information you share directly with a Designer or how a Designer stores/uses it outside the platform.

**Checkbox (required):**
☐ I understand and agree to proceed and share information with a Partner Designer.

**Buttons:**
* **Cancel**
* **Continue**

**Optional microcopy (under buttons):**
You can stop sharing at any time and manage your project details in your account settings.
