# Technical Design Document Outline: AccelRestaurants (Firebase Edition)

## 1. Executive Summary

### 1.1 Project Overview

AccelRestaurants 2.0 represents a comprehensive re-architecture of the existing digital signage platform, transforming it from a local prototype into a production-ready, cloud-native solution. The platform enables restaurants and hospitality businesses to create, manage, and display dynamic digital signage content across multiple screens in real-time.

### 1.2 Business Objectives

- **Market Expansion**: Enable scalable deployment across multiple restaurant locations and chains
- **Competitive Differentiation**: Introduce innovative visual effects through the Atmosphere Layer
- **Operational Efficiency**: Streamline content creation and management workflows
- **Customer Engagement**: Enhance dining experiences through dynamic, visually appealing displays
- **Revenue Growth**: Create new revenue streams through premium features and enterprise offerings

### 1.3 Technical Objectives

- **Cloud Migration**: Transition from local SQLite-based storage to Firebase cloud services
- **Real-time Synchronization**: Enable instant content updates across all connected screens
- **Performance Optimization**: Ensure smooth 60fps rendering even on lower-end devices
- **Scalability**: Support thousands of concurrent users and screens
- **Security**: Implement enterprise-grade security and compliance
- **Maintainability**: Create a robust, well-documented codebase for long-term maintenance

### 1.4 Key Differentiators

#### Atmosphere Layer
The core innovation of AccelRestaurants 2.0 is the Atmosphere Layer, a high-performance WebGL particle engine that renders cinematic visual effects. This layer sits between background images and UI content, providing:

- **Fluid Dynamics**: Realistic smoke and heat wave simulations using Navier-Stokes equations
- **Particle Systems**: Configurable snow, rain, hearts, stars, and custom particle effects
- **Real-time Control**: Live parameter adjustment with instant visual feedback
- **Performance Scaling**: Adaptive quality based on device capabilities

#### Real-time Architecture
- **Live Updates**: Content changes appear instantly on all screens without refresh
- **Collaborative Editing**: Multiple users can edit content simultaneously with conflict resolution
- **Offline Capability**: Full functionality continues during network interruptions
- **Global Distribution**: CDN-backed delivery ensures fast loading worldwide

### 1.5 Scope and Deliverables

#### Core Features
- **Admin Console**: Complete content creation and management interface
- **Player Application**: Lightweight, kiosk-mode digital signage display
- **Menu Management**: Hierarchical menu structure with real-time updates
- **Slide Editor**: Drag-and-drop canvas with 46+ tile types
- **Atmosphere Engine**: WebGL-based particle and fluid simulation system
- **Real-time Sync**: Firestore-powered instant content synchronization

#### Technical Deliverables
- **Production Application**: Fully tested, deployment-ready codebase
- **API Documentation**: Comprehensive developer documentation
- **Infrastructure Setup**: Automated deployment and scaling configuration
- **Monitoring System**: Performance and error tracking infrastructure
- **Testing Suite**: Automated and manual testing frameworks

### 1.6 Technology Stack

#### Frontend
- **Framework**: React 18 with TypeScript for type safety
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand for complex editor state
- **Graphics**: Native WebGL 2.0 for Atmosphere rendering

#### Backend & Cloud
- **Database**: Firebase Firestore for real-time NoSQL data
- **Authentication**: Firebase Auth with multi-provider support
- **Storage**: Firebase Storage for media assets with CDN
- **Hosting**: Firebase Hosting with global edge network
- **Functions**: Cloud Functions for serverless processing

#### Development Tools
- **Version Control**: Git with GitHub for collaboration
- **CI/CD**: GitHub Actions for automated testing and deployment
- **Testing**: Vitest, React Testing Library, Cypress
- **Code Quality**: ESLint, Prettier, Husky for consistency

### 1.7 Project Timeline

- **Total Duration**: 16-18 weeks from kickoff to launch
- **Phase 1**: Foundation (Weeks 1-3) - Firebase setup and base architecture
- **Phase 2**: Core Features (Weeks 4-8) - Auth, dashboard, menu management
- **Phase 3**: Atmosphere Engine (Weeks 9-12) - WebGL implementation and integration
- **Phase 4**: Advanced Features (Weeks 13-15) - Slide editor, player, optimizations
- **Phase 5**: Launch & Support (Weeks 16-18) - Testing, deployment, go-live

### 1.8 Success Criteria

#### Functional Success
- Admin users can create and edit slides with atmosphere effects
- Player applications display content with real-time synchronization
- Atmosphere effects render smoothly across target devices
- System supports 100+ concurrent screens without performance degradation

#### Technical Success
- 99.9% uptime with <5 second content sync latency
- <2 second initial load time for admin interface
- 60fps rendering for atmosphere effects on modern devices
- >80% automated test coverage with comprehensive manual testing

#### Business Success
- Successful migration from prototype to production platform
- Positive user feedback and adoption metrics
- Competitive differentiation through Atmosphere Layer
- Foundation for future feature development and scaling

### 1.9 Risk Assessment

#### Technical Risks
- **WebGL Compatibility**: Mitigated through progressive enhancement and fallbacks
- **Performance Requirements**: Addressed with adaptive quality scaling
- **Real-time Sync Complexity**: Managed through proven Firebase patterns

#### Business Risks
- **Timeline Delays**: Buffered schedule with parallel development streams
- **Resource Availability**: Cross-trained team with backup contractors
- **User Adoption**: Beta testing and iterative design based on feedback

#### Mitigation Strategies
- **Early Prototyping**: Key components prototyped before full implementation
- **Incremental Delivery**: Working software delivered every 2 weeks
- **Comprehensive Testing**: Multi-level testing from unit to user acceptance
- **Flexible Architecture**: Modular design allowing feature prioritization

### 1.10 Team and Resources

#### Development Team
- **Frontend Developer**: React/TypeScript expert for UI implementation
- **Graphics Specialist**: WebGL/OpenGL expert for Atmosphere engine
- **Backend Developer**: Firebase/Cloud expert for infrastructure
- **QA Engineer**: Testing and quality assurance specialist
- **Product Manager**: Requirements and stakeholder management

#### External Resources
- **Firebase Support**: Direct access to Firebase engineering team
- **Design Consultant**: UI/UX expertise for polished interfaces
- **Security Auditor**: Third-party security assessment
- **Performance Consultant**: Optimization expertise for complex rendering

### 1.11 Budget and Cost Considerations

#### Development Costs
- **Personnel**: 2-3 FTE developers for 16 weeks ($150K-$225K)
- **Infrastructure**: Firebase usage during development ($5K-$10K)
- **Tools and Software**: Development tools and third-party services ($10K)
- **Testing and QA**: Manual testing and user research ($15K)

#### Operational Costs (Monthly)
- **Firebase Services**: Firestore reads/writes, storage, hosting ($500-$2K)
- **Monitoring**: Application and infrastructure monitoring ($200)
- **Support**: Customer support and maintenance ($1K+)
- **Scaling**: Additional costs as user base grows

#### Cost Optimization
- **Efficient Architecture**: Minimize Firebase usage through caching
- **Automated Testing**: Reduce manual testing costs over time
- **Open Source**: Leverage community tools and libraries
- **Cloud Efficiency**: Optimize resource allocation and usage

### 1.12 Conclusion

AccelRestaurants 2.0 represents a significant advancement in digital signage technology, combining cutting-edge WebGL graphics with robust cloud infrastructure. The Atmosphere Layer provides a unique visual experience that sets the platform apart from competitors, while the real-time architecture ensures operational efficiency and scalability.

The project successfully bridges the gap between innovative technology and practical business needs, delivering a platform that can grow with the business while providing immediate value to restaurant operators seeking to enhance their customer experience through dynamic, visually appealing digital signage."The Atmosphere Layer") to render cinema-quality visual effects (smoke, snow, rain) between background and content layers.
*   **Delivery Platform:** Web-based (React), deployed via Firebase Hosting, utilizing Firestore for real-time data and config.

## 2. Technical Architecture & Stack

### 2.1 Core Technology Stack

#### Frontend Layer
- **Framework:** React 18+ with TypeScript for type safety and enhanced developer experience. TypeScript ensures robust code in a complex UI with multiple interactive components.
- **Build Tool:** Vite for fast development server, optimized builds, and modern ES modules support.
- **Styling:** Tailwind CSS for utility-first styling, enabling rapid UI development and consistent design system.
- **UI Components:** Radix UI primitives for accessible, unstyled components, combined with custom styling for the dark theme (neutral-900/800/700 palette with orange accents).

#### State Management
- **Local State:** React Hooks (useState, useEffect, useContext) for component-level state.
- **Global State:** Zustand for complex editor state (slide editor, tile properties, atmosphere controls) due to its lightweight nature and simple API compared to Redux.
- **Data Fetching:** Firebase SDK for real-time subscriptions to Firestore documents, eliminating the need for additional state management libraries.

#### Backend & Cloud Services
- **Database:** Firebase Firestore (NoSQL document database) for real-time data synchronization across admin consoles and player screens.
- **Authentication:** Firebase Auth supporting email/password and Google OAuth for secure user access.
- **File Storage:** Firebase Storage for media assets (background images, tile images, videos) with automatic CDN delivery.
- **Hosting:** Firebase Hosting for global CDN, automatic SSL, and GitHub Actions integration for CI/CD.

#### Graphics & Rendering Engine
- **WebGL Implementation:** Native WebGL 2.0 for the Atmosphere Layer particle/fluid simulations, providing low-level control over GPU rendering.
- **Shader Language:** GLSL (OpenGL Shading Language) for vertex and fragment shaders implementing the fluid dynamics and particle systems.
- **Fallbacks:** Three.js as an optional abstraction layer if native WebGL becomes too complex, though native WebGL is preferred for performance.

### 2.2 System Architecture Overview

#### Logical Architecture
The system follows a client-serverless architecture with Firebase as the backend:

1. **Client Applications:**
   - **Admin Console:** Full-featured web app for content creation and management.
   - **Player Application:** Lightweight, read-only display application for digital signage screens.

2. **Firebase Backend Services:**
   - **Firestore:** Document database for all application data.
   - **Firebase Auth:** User authentication and authorization.
   - **Firebase Storage:** Media asset storage and delivery.
   - **Firebase Hosting:** Static web hosting and CDN.

3. **Rendering Pipeline:**
   - **Background Layer:** CSS/HTML-based image rendering.
   - **Atmosphere Layer:** WebGL canvas for particle/fluid effects.
   - **Content Layer:** React-rendered UI components.

#### Application Architecture Patterns

##### Component Architecture
- **Atomic Design:** Components organized by complexity (atoms, molecules, organisms, templates, pages).
- **Container/Presentational:** Separation of data logic from presentation logic.
- **Custom Hooks:** Reusable logic for Firebase interactions, WebGL state, and UI behaviors.

##### Data Flow Architecture
- **Unidirectional Data Flow:** State flows down via props, actions flow up via callbacks.
- **Real-time Subscriptions:** Firestore listeners automatically update UI when data changes.
- **Optimistic Updates:** UI updates immediately on user actions, with rollback on errors.

##### Rendering Architecture
- **Layered Rendering:** Three distinct rendering layers with z-index stacking.
- **Canvas/WebGL Integration:** Atmosphere layer renders independently of React DOM.
- **Performance Isolation:** WebGL operations run on separate thread via requestAnimationFrame.

### 2.3 Performance & Scalability Considerations

#### Client-Side Performance
- **Bundle Splitting:** Code splitting by route (admin vs player) and feature (atmosphere engine).
- **Lazy Loading:** Components and shaders loaded on-demand.
- **WebGL Optimization:** Adaptive resolution based on device capabilities (512x512 for mobile, 1024x1024 for desktop).
- **Memory Management:** Proper cleanup of WebGL contexts and Firestore listeners.

#### Firebase-Specific Optimizations
- **Query Optimization:** Compound queries and efficient data structures in Firestore.
- **Caching:** Firebase SDK automatic caching with offline support.
- **Real-time Efficiency:** Selective subscriptions to prevent over-fetching.
- **Storage Optimization:** Image resizing and compression via Cloud Functions.

#### Scalability Features
- **Horizontal Scaling:** Stateless React apps scale horizontally.
- **CDN Delivery:** Firebase Hosting provides global edge caching.
- **Database Sharding:** Firestore automatically handles scaling.
- **Concurrent Users:** Real-time sync supports multiple admin users editing simultaneously.

### 2.4 Security Architecture

#### Authentication & Authorization
- **Firebase Auth:** JWT-based authentication with session persistence.
- **Role-Based Access:** Organization-level permissions (owner, editor, viewer).
- **Data Security:** Firestore security rules enforcing data access based on user ID and organization membership.

#### Data Protection
- **Encryption:** All data encrypted in transit and at rest by Firebase.
- **Input Validation:** Client and server-side validation for all user inputs.
- **API Security:** Firebase SDK handles authentication tokens automatically.

### 2.5 Development & Deployment Pipeline

#### Development Environment
- **Local Development:** Vite dev server with hot module replacement.
- **Firebase Emulators:** Local emulation of Firestore, Auth, Storage, and Hosting.
- **TypeScript:** Strict type checking for all code.

#### CI/CD Pipeline
- **GitHub Actions:** Automated testing, building, and deployment.
- **Firebase Deployment:** Automatic deployment to staging and production environments.
- **Versioning:** Semantic versioning with automatic changelog generation.

#### Monitoring & Analytics
- **Firebase Analytics:** User behavior and performance metrics.
- **Error Tracking:** Integration with error reporting services.
- **Performance Monitoring:** Real-time performance metrics for WebGL and React rendering.

## 3. Data Model (Firestore Schema)

### 3.1 Overview and Transition Strategy

The data model migrates from a traditional relational PostgreSQL schema to Firestore's document-oriented NoSQL structure. This transition prioritizes:

- **Real-time Synchronization:** Firestore's live listeners enable instant updates across admin consoles and player screens.
- **Scalability:** NoSQL document structure handles variable data sizes and nested relationships efficiently.
- **Read-Heavy Optimization:** Digital signage applications read far more than they write, making Firestore's denormalized approach ideal.
- **Offline Support:** Built-in offline capabilities via Firebase SDK.

**Migration Strategy:**
- Export PostgreSQL data to JSON.
- Transform relational data to document structure (denormalize where beneficial).
- Use Firestore batch writes for initial import.
- Implement gradual rollout with dual-write period.

### 3.2 Collections Structure and Schemas

#### Root Collection: `organizations/{orgId}`

**Purpose:** Top-level container for each restaurant group or organization.

**Document Fields:**
```typescript
interface Organization {
  id: string; // Auto-generated Firestore ID
  name: string; // e.g., "Downtown Bistro Group"
  plan: 'Free' | 'Growth' | 'Enterprise';
  ownerId: string; // Firebase Auth UID
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

**Sub-collections:**
- `locations/{locationId}`
- `assets/{assetId}`
- `slides/{slideId}`
- `menus/{menuId}`
- `campaigns/{campaignId}`

#### Sub-collection: `locations/{locationId}`

**Purpose:** Physical restaurant locations within an organization.

**Document Fields:**
```typescript
interface Location {
  id: string;
  orgId: string; // Parent organization ID
  name: string; // e.g., "Main Street Location"
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  timezone: string; // e.g., "America/New_York"
  createdAt: FirebaseFirestore.Timestamp;
}
```

**Sub-collections:**
- `screens/{screenId}`

#### Sub-collection: `screens/{screenId}`

**Purpose:** Individual digital signage screens at each location.

**Document Fields:**
```typescript
interface Screen {
  id: string;
  locationId: string; // Parent location ID
  name: string; // e.g., "Main Menu Board"
  orientation: 'landscape' | 'portrait';
  livePlaylist: string[]; // Array of slide IDs in current order
  rotationSettings: {
    algorithm: 'loop' | 'random' | 'custom';
    customSequence?: string[]; // Custom order of slide IDs
    transition: 'fade' | 'slide' | 'none';
    rotationMs: number; // Time between slides in milliseconds
  };
  isActive: boolean;
  createdAt: FirebaseFirestore.Timestamp;
}
```

#### Sub-collection: `assets/{assetId}`

**Purpose:** Media assets (images, videos) uploaded by the organization.

**Document Fields:**
```typescript
interface Asset {
  id: string;
  orgId: string; // Parent organization ID
  name: string;
  type: 'image' | 'video' | 'audio';
  url: string; // Firebase Storage download URL
  storagePath: string; // Firebase Storage path
  metadata: {
    width?: number; // For images
    height?: number; // For images
    size: number; // File size in bytes
    contentType: string; // MIME type
  };
  tags: string[]; // User-defined tags for organization
  uploadedBy: string; // Firebase Auth UID
  createdAt: FirebaseFirestore.Timestamp;
}
```

#### Sub-collection: `slides/{slideId}`

**Purpose:** Individual slides containing tiles and atmosphere settings.

**Document Fields:**
```typescript
interface Slide {
  id: string;
  orgId: string; // Parent organization ID
  name: string; // e.g., "Breakfast Special"
  dimensions: {
    width: number; // e.g., 1920
    height: number; // e.g., 1080
  };
  backgroundColor: string; // Hex color, e.g., "#111827"
  backgroundImageUrl?: string; // Firebase Storage URL for background image
  particleConfig?: ParticleConfig; // See Section 4.3
  elements: TileInstance[]; // Array of tile objects
  duration?: number; // Override default duration in milliseconds
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

#### Sub-collection: `menus/{menuId}`

**Purpose:** Menu data aggregated for efficient reads in digital signage.

**Document Fields:**
```typescript
interface Menu {
  id: string;
  orgId: string; // Parent organization ID
  name: string; // e.g., "Main Menu"
  sections: MenuSection[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

interface MenuSection {
  id: string;
  name: string; // e.g., "Breakfast"
  sortOrder: number;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string; // e.g., "Avocado Toast"
  description?: string;
  price: string; // e.g., "$12.99"
  imageUrl?: string; // Firebase Storage URL
  calories?: string; // e.g., "450 cal"
  isAvailable: boolean; // For real-time availability
}
```

#### Sub-collection: `campaigns/{campaignId}`

**Purpose:** Marketing campaigns and promotions.

**Document Fields:**
```typescript
interface Campaign {
  id: string;
  orgId: string; // Parent organization ID
  name: string; // e.g., "Lunch Special"
  offerCode?: string; // e.g., "LUNCH25"
  status: 'Active' | 'Scheduled' | 'Ended';
  radiusMiles?: number; // Geo-fencing radius
  startDate?: FirebaseFirestore.Timestamp;
  endDate?: FirebaseFirestore.Timestamp;
  triggers: CampaignTrigger[]; // How the campaign is activated
  rules: CampaignRule[]; // Conditions and actions
  createdAt: FirebaseFirestore.Timestamp;
}

interface CampaignTrigger {
  type: 'qr_scan' | 'location_entry' | 'time_based';
  params: Record<string, any>; // Type-specific parameters
}

interface CampaignRule {
  condition: string; // e.g., "user_in_radius"
  action: string; // e.g., "show_discount"
  params: Record<string, any>;
}
```

### 3.3 Campaign Triggers — Mobile ↔ Screen Handshake and Real-Time Event Spec

This section provides the concrete implementation specification for Campaign Triggers, defining the mobile ↔ signage screen handshake, real-time event architecture, and full trigger firing mechanism.

#### Architecture Choice
Primary mechanism: WebSockets for real-time bidirectional communication between screens and server, with Firestore as a persistent event bus fallback. WebSockets are chosen for low-latency, persistent connections ideal for real-time signage updates, while Firestore ensures durability and offline resilience. If WebSockets fail (e.g., network issues), events fall back to Firestore writes with listeners. The WebSocket server runs on Cloud Run for scalability, authenticated via Firebase Auth.

#### Identities, Sessions, and Pairing Model
- **Screen Identity**: Each screen has a unique `screenId` (string, e.g., "screen-abc123"). Screens authenticate using a Firebase Auth device account with a JWT token.
- **Mobile User Identity**: Signed-in users have a `userId` (Firebase Auth UID); guests use an anonymous token.
- **Pairing**: QR code encodes `screenId` and a short-lived `pairingCode` (e.g., 6-digit numeric code valid for 5 minutes).
- **Session Lifecycle**: `screenSessionId` (UUID) created on screen boot, active while connected, expires after 24 hours of inactivity, revoked on screen shutdown.
- **Multi-User Rules**: Multiple mobiles can pair to one screen; triggers are queued; last trigger wins for conflicting actions.

#### Handshake Flows

**Flow 1: Screen Boot + Session Creation**
1. Screen app starts.
2. Calls Cloud Function `createScreenSession` with `screenId` and JWT.
3. Server validates auth, creates `screenSessionId`, stores in Firestore `screenSessions/{screenSessionId}`.
4. Server returns `screenSessionId` and WebSocket URL.
5. Screen opens WebSocket connection with `screenSessionId` in auth header.
6. Server registers connection in memory/session registry.
7. Screen generates pairing QR code with `screenId` and `pairingCode`.
8. Screen displays QR code for mobile scanning.

**Flow 2: qr_scan Trigger**
1. User scans QR code, opens mobile link with `screenId` and `pairingCode`.
2. Mobile app validates `pairingCode` locally (if cached) or calls `validatePairing` Cloud Function.
3. Mobile confirms pairing, stores `screenSessionId`.
4. User interacts with campaign (e.g., clicks discount).
5. Mobile calls Cloud Function `fireTrigger` with payload.
6. Server validates auth, session, campaign permissions.
7. Server emits WebSocket event `trigger:fired` to screen's session.
8. Screen receives event, updates campaign state, shows discount.
9. Screen sends ack event `trigger:ack` via WebSocket.

**Flow 3: location_entry Trigger**
1. Mobile app detects location entry (e.g., via Geolocation API, accuracy >50m).
2. Mobile calls `fireTrigger` with `triggerType: "location_entry"`, GPS coords, accuracy.
3. Server verifies location within campaign geofence.
4. Server emits `trigger:fired` to screen.
5. Screen updates campaign display.

#### API Endpoints and Realtime Event Contracts

**Endpoints (Cloud Functions):**
- `POST /createScreenSession`: Creates session. Headers: Authorization (JWT). Body: { screenId: string }. Response: { screenSessionId: string, wsUrl: string }.
- `POST /validatePairing`: Validates pairing. Headers: Authorization. Body: { screenId: string, pairingCode: string }. Response: { screenSessionId: string }.
- `POST /fireTrigger`: Fires trigger. Headers: Authorization. Body: { triggerType: "qr_scan"|"location_entry", screenSessionId: string, campaignId: string, userId?: string, timestamp: number, metadata: { qrParams?: any, gps?: { lat: number, lng: number, accuracy: number } } }. Response: { triggerId: string }.

**Realtime Events (WebSocket):**
- `trigger:fired`: { triggerId: string, type: string, campaignId: string, payload: any }
- `trigger:ack`: { triggerId: string, status: "success"|"error" }

#### Reliability
- At-least-once delivery: Triggers may fire multiple times; use idempotency key (triggerId).
- Idempotency: Server checks for duplicate triggerId within session.
- Reconnect: Screens auto-reconnect WebSocket; missed events replayed from Firestore.
- Offline: Mobile queues triggers; screen shows last known state.
- Ordering: Events processed in sequence per session.

#### Security and Abuse Prevention
- Pairing codes: Single-use, expire in 5 minutes, rate-limited (5 attempts/min per IP).
- Auth: All endpoints require valid JWT; screens reject events without active session.
- Permissions: Validate user can access campaign/screen via Firestore rules.
- Rate Limits: 10 triggers/min per user, 100/min per screen.
- Audit: Log all triggers in Firestore `triggerLogs/{triggerId}` with user, screen, timestamp.

#### Reference Implementation
- **Data Model**: `screenSessions/{id}`: { screenId, createdAt, expiresAt, wsConnected: bool }. `triggerLogs/{id}`: { ...payload fields }.
- **WebSocket Server**: Node.js on Cloud Run, using `ws` library, Firebase Auth for auth.
- **Example Payloads**: qr_scan: { triggerType: "qr_scan", screenSessionId: "uuid", campaignId: "camp-123", userId: "user-456", metadata: { qrParams: { discountCode: "SAVE10" } } }. location_entry: Similar, with gps metadata.

### 3.4 Indexing and Query Patterns

**Automatic Indexes:**
- Firestore auto-creates indexes for simple queries.

**Composite Indexes Required:**
- `organizations/{orgId}/slides/{slideId}` by `updatedAt` (for slide listing)
- `organizations/{orgId}/assets/{assetId}` by `type` and `tags` (for asset filtering)
- `organizations/{orgId}/campaigns/{campaignId}` by `status` and `startDate`

**Query Patterns:**
- List all slides for an organization: `collection('organizations').doc(orgId).collection('slides').orderBy('updatedAt')`
- Get active campaigns: `collection('campaigns').where('status', '==', 'Active').where('startDate', '<=', now)`

### 3.4 Security Rules

**Firestore Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Organizations
    match /organizations/{orgId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.ownerId || 
         request.auth.uid in resource.data.members);
    }
    
    // Sub-collections under organizations
    match /organizations/{orgId}/{document=**} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == get(/databases/$(database)/documents/organizations/$(orgId)).data.ownerId ||
         request.auth.uid in get(/databases/$(database)/documents/organizations/$(orgId)).data.members);
    }
  }
}
```

**Storage Security Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /organizations/{orgId}/{allPaths=**} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == firestore.get(/databases/(default)/documents/organizations/$(orgId)).data.ownerId ||
         request.auth.uid in firestore.get(/databases/(default)/documents/organizations/$(orgId)).data.members);
    }
  }
}
```

### 3.5 Performance Considerations

- **Document Size Limits:** Keep individual documents under 1MB. Split large menus if necessary.
- **Read Costs:** Use sub-collections to scope queries. Avoid deep nested reads.
- **Write Costs:** Batch writes for bulk operations during data import.
- **Real-time Listeners:** Use targeted listeners (e.g., specific slide updates) rather than entire collections.
- **Caching:** Leverage Firestore's offline persistence for better UX in low-connectivity environments.

### 3.6 Data Validation and Constraints

- **Client-Side:** Use TypeScript interfaces for compile-time validation.
- **Server-Side:** Implement Cloud Functions for complex business logic validation.
- **Data Integrity:** Use transactions for operations affecting multiple documents.
- **Backup Strategy:** Enable Firestore automated backups with point-in-time recovery.

## 4. Feature Specification: "The Atmosphere Layer" (Particle System)

### 4.1 Rendering Architecture (The Sandwich Model)

The Atmosphere Layer is the core differentiator of AccelRestaurants, providing cinematic visual effects between the background and UI layers. The rendering architecture uses a layered approach to ensure performance and flexibility.

#### Layer Composition
The Player application renders content in three distinct z-index layers:

1. **Background Layer (z-index: 0)**: 
   - Container: `div.background`
   - Content: CSS `background-image` or `<img>` element
   - Purpose: Displays toggleable/changeable background images per slide
   - Performance: Hardware-accelerated CSS rendering for static images

2. **Atmosphere Layer (z-index: 1)**:
   - Container: `canvas.atmosphere`
   - Context: WebGL 2.0 rendering context
   - Purpose: Real-time particle/fluid simulation
   - Performance: GPU-accelerated rendering for smooth 60fps animations

3. **UI Layer (z-index: 2)**:
   - Container: `div.ui-layer`
   - Content: React components rendered as HTML
   - Purpose: Digital signage tiles (text, images, charts, etc.)
   - Performance: DOM-based rendering for dynamic content

#### Layer Interaction
- Layers are stacked using CSS z-index with absolute positioning
- Atmosphere layer uses alpha blending to composite over background
- UI layer remains opaque and interactive
- All layers scale responsively to viewport dimensions

### 4.2 Simulation Logic (WebGL Fluid Smoke)

The atmosphere engine implements a real-time fluid dynamics simulation based on the stable fluids method. This creates realistic smoke, fog, and heat wave effects.

#### Core Algorithm Overview
The simulation uses a 4-pass render-to-texture approach with ping-pong framebuffers to maintain numerical stability.

#### Data Structures
- **Velocity Field V(x,y)**: RG texture storing horizontal and vertical velocity components
- **Density Field D(x,y)**: R texture storing smoke density values
- **Pressure Field P(x,y)**: Optional R texture for incompressible flow (simplified version omits this)
- **Divergence Field Div(x,y)**: Optional R texture for pressure solve

#### Simulation Resolution
- **Base Resolution**: 512x512 pixels for balanced performance/quality
- **Adaptive Scaling**: Automatically reduces to 256x256 on low-end devices
- **Upscaling**: Bilinear filtering to match viewport dimensions
- **Performance Monitoring**: Dynamically adjusts resolution based on frame time

#### Render Passes

##### Pass 1: Source Injection (Emitter)
Adds new smoke/density to the simulation at configured emitter regions.

**Inputs:**
- `emitRate`: Density addition per frame (0.0-1.0)
- `emitPosition`: Normalized Y position for emitter band (0.0-1.0)
- `emitHeight`: Height of emitter region as fraction of screen (0.0-0.1)
- `initialUpdraft`: Initial upward velocity bias

**Algorithm:**
```glsl
void injectDensity(vec2 uv) {
  float emitterY = params.emitterY;
  float emitterHeight = params.emitHeight;
  if (uv.y > emitterY && uv.y < emitterY + emitterHeight) {
    density += params.emitRate;
    velocity.y += params.initialUpdraft;
  }
}
```

##### Pass 2: Velocity Update (Advection + Forces)
Updates velocity field with advection, buoyancy, vorticity confinement, and dissipation.

**Inputs:**
- `advectionStrength`: How strongly velocity follows itself (0.9-1.0)
- `buoyancy`: Upward force proportional to density (0.0-0.1)
- `vorticityScale`: Strength of swirl generation (0.0-1.0)
- `dissipationVel`: Velocity decay per frame (0.99-1.0)

**Algorithm:**
1. **Advection**: Sample velocity at current position minus previous velocity
2. **Buoyancy**: Add upward force based on local density
3. **Vorticity Confinement**: Enhance curls in velocity field
4. **Dissipation**: Gradually reduce velocity magnitude

##### Pass 3: Density Advection
Moves density field through the velocity field.

**Inputs:**
- `advectionStrength`: How strongly density follows velocity (0.9-1.0)
- `dissipationDensity`: Density decay per frame (0.99-1.0)
- `diffusion`: Optional blur to soften density (0.0-0.01)

**Algorithm:**
```glsl
vec2 advect(vec2 uv, vec2 velocity, float dissipation) {
  vec2 prevUV = uv - velocity * dt;
  return texture(densityTexture, prevUV).r * dissipation;
}
```

##### Pass 4: Compositing and Rendering
Converts density field to final visual output with alpha blending.

**Inputs:**
- `color`: Base color for particles (hex string)
- `blendMode`: Compositing mode ('screen', 'overlay', 'normal')
- `opacity`: Overall opacity multiplier (0.0-1.0)
- `alphaLow`: Threshold for density-to-alpha curve (0.0-0.5)
- `alphaHigh`: Upper threshold for density-to-alpha curve (0.5-1.0)

**Algorithm:**
```glsl
float densityToAlpha(float density) {
  return smoothstep(params.alphaLow, params.alphaHigh, density) * params.opacity;
}

vec4 composite(vec4 background, float alpha) {
  // Apply blend mode
  if (params.blendMode == 'screen') {
    return vec4(mix(background.rgb, vec3(1.0), alpha), background.a);
  }
  // ... other blend modes
}
```

### 4.3 Configuration Object (`slide.particle_config`)

Each slide stores atmosphere configuration in Firestore for real-time synchronization.

```typescript
interface ParticleConfig {
  enabled: boolean; // Toggle atmosphere on/off
  type: 'smoke' | 'snow' | 'rain' | 'hearts' | 'stars' | 'heat_wave';
  preset: 'wispy' | 'heavy' | 'storm' | 'calm';
  
  params: {
    // Core simulation parameters
    density: number;      // 0.0 - 1.0: Particle density
    speed: number;        // 0.1 - 2.0: Simulation time step multiplier
    vorticity: number;    // 0.0 - 2.0: Curl strength for swirling
    
    // Visual parameters
    color: string;        // Hex color code
    blendMode: 'screen' | 'overlay' | 'normal' | 'soft-light';
    opacity: number;      // 0.0 - 1.0: Overall opacity
    
    // Spatial parameters
    emitterY: number;     // 0.0 (bottom) to 1.0 (top): Emitter position
    maskHeight: number;   // 0.0 to 1.0: Fade out height from top
    
    // Type-specific parameters
    particleSize?: number;  // For sprite modes
    gravity?: number;       // For falling particles
    windStrength?: number;  // For lateral movement
  };
}
```

#### Preset Configurations
- **Wispy**: Low density, high vorticity, screen blend mode
- **Heavy**: High density, low vorticity, overlay blend mode
- **Storm**: Maximum density, high speed, soft-light blend mode
- **Calm**: Low density, low speed, normal blend mode

### 4.4 Alternative Rendering Modes

#### Fluid Mode (Primary)
- Used for: Smoke, Heat Waves, Ink, Fog
- Algorithm: Navier-Stokes fluid simulation
- Performance: High (requires WebGL 2.0)
- Visual Quality: Realistic fluid dynamics with swirling and rising behavior

#### Sprite/Particle Mode (Fallback)
- Used for: Snow, Rain, Hearts, Stars, Leaves
- Algorithm: Traditional particle system with emitter
- Performance: Medium (CPU-based with WebGL sprites)
- Visual Quality: Discrete particles with physics simulation

#### Implementation Details
```typescript
class AtmosphereEngine {
  private gl: WebGL2RenderingContext;
  private programs: { [key: string]: WebGLProgram };
  private framebuffers: WebGLFramebuffer[];
  private textures: WebGLTexture[];
  
  constructor(canvas: HTMLCanvasElement, config: ParticleConfig) {
    this.gl = canvas.getContext('webgl2');
    this.initializeShaders();
    this.initializeBuffers();
  }
  
  render(dt: number): void {
    if (this.config.type === 'fluid') {
      this.renderFluidPass(dt);
    } else {
      this.renderParticlePass(dt);
    }
  }
  
  private renderFluidPass(dt: number): void {
    // Pass 1: Source injection
    this.injectDensity();
    
    // Pass 2: Velocity update
    this.updateVelocity(dt);
    
    // Pass 3: Density advection
    this.advectDensity(dt);
    
    // Pass 4: Composite to screen
    this.compositeToScreen();
  }
}
```

For the complete shader implementations, see Section 4.8.

#### 4.8 Atmosphere Shaders (WebGL/GLSL) — Full Reference Implementation

This section provides the complete WebGL/GLSL shader code for implementing the real-time 2D Navier-Stokes fluid simulation described in Section 4.2. All shaders are designed for WebGL 2.0 (as specified in the tech stack) and assume a full-screen quad rendering approach. The pipeline follows the 4-pass structure outlined in Section 4.2, with additional passes for vorticity confinement and rendering.

##### WebGL Setup and Assumptions
- **WebGL Version**: WebGL 2.0 required for float textures and multiple render targets. No WebGL 1.0 fallbacks are included here (use Section 4.7 for fallbacks).
- **Texture Formats**: All simulation textures are `RGBA32F` (float precision). Velocity uses RG channels (horizontal/vertical), density uses R channel.
- **FBO Ping-Pong**: Two Framebuffer Objects (FBOs) for double-buffering each texture (velocity, density, pressure, divergence, curl). Total: 10 textures (5 pairs).
- **Coordinate System**: UV coordinates from (0,0) to (1,1), with texelSize uniform for sampling (e.g., 1.0 / resolution).
- **Boundary Handling**: Clamp to edge (simplified; no boundary shader). Divergence and pressure gradients are zero at boundaries.
- **Iteration Defaults**: Jacobi pressure solve uses 20-40 iterations (configurable via uniform).
- **Uniforms**: Shared across shaders where applicable. dt (time step, 0.016 for 60fps), dissipation (0.99-1.0), texelSize (vec2(1.0/resX, 1.0/resY)).

##### Common Full-Screen Quad Vertex Shader
```glsl
#version 300 es
precision highp float;

in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5; // Transform to 0-1 UV
  gl_Position = vec4(a_position, 0.0, 1.0);
}
```

##### Pass 1: Advect Velocity (Maps to Section 4.2 Pass 2)
Semi-Lagrangian advection for velocity field.

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_velocityTex;
uniform float u_dt;
uniform float u_dissipation;
uniform vec2 u_texelSize;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 coord = v_uv - u_dt * texture(u_velocityTex, v_uv).xy * u_texelSize;
  fragColor = u_dissipation * texture(u_velocityTex, coord);
}
```

##### Pass 2: Advect Density (Maps to Section 4.2 Pass 3)
Semi-Lagrangian advection for density field.

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_densityTex;
uniform sampler2D u_velocityTex;
uniform float u_dt;
uniform float u_dissipation;
uniform vec2 u_texelSize;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 coord = v_uv - u_dt * texture(u_velocityTex, v_uv).xy * u_texelSize;
  fragColor = u_dissipation * texture(u_densityTex, coord);
}
```

##### Pass 3: Inject Density (Maps to Section 4.2 Pass 1, expanded)
Adds density sources at emitter regions.

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_densityTex;
uniform float u_emitRate;
uniform float u_emitterY;
uniform float u_emitHeight;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec4 density = texture(u_densityTex, v_uv);
  if (v_uv.y > u_emitterY && v_uv.y < u_emitterY + u_emitHeight) {
    density.r += u_emitRate;
  }
  fragColor = density;
}
```

##### Pass 4: Inject Velocity / Add Forces (Buoyancy)
Adds buoyancy and initial velocity to emitters.

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_velocityTex;
uniform sampler2D u_densityTex;
uniform float u_buoyancy;
uniform float u_initialUpdraft;
uniform float u_emitterY;
uniform float u_emitHeight;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec4 velocity = texture(u_velocityTex, v_uv);
  float density = texture(u_densityTex, v_uv).r;
  velocity.y += u_buoyancy * density;
  if (v_uv.y > u_emitterY && v_uv.y < u_emitterY + u_emitHeight) {
    velocity.y += u_initialUpdraft;
  }
  fragColor = velocity;
}
```

##### Pass 5: Compute Divergence (Maps to Section 4.2 Algorithm)
Calculates divergence for incompressible flow.

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_velocityTex;
uniform vec2 u_texelSize;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  float L = texture(u_velocityTex, v_uv - vec2(u_texelSize.x, 0.0)).x;
  float R = texture(u_velocityTex, v_uv + vec2(u_texelSize.x, 0.0)).x;
  float T = texture(u_velocityTex, v_uv + vec2(0.0, u_texelSize.y)).y;
  float B = texture(u_velocityTex, v_uv - vec2(0.0, u_texelSize.y)).y;
  float div = 0.5 * (R - L + T - B);
  fragColor = vec4(div, 0.0, 0.0, 1.0);
}
```

##### Pass 6: Jacobi Pressure Solve (Maps to Section 4.2 Algorithm)
Iterative pressure computation.

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_pressureTex;
uniform sampler2D u_divergenceTex;
uniform vec2 u_texelSize;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  float L = texture(u_pressureTex, v_uv - vec2(u_texelSize.x, 0.0)).r;
  float R = texture(u_pressureTex, v_uv + vec2(u_texelSize.x, 0.0)).r;
  float T = texture(u_pressureTex, v_uv + vec2(0.0, u_texelSize.y)).r;
  float B = texture(u_pressureTex, v_uv - vec2(0.0, u_texelSize.y)).r;
  float C = texture(u_divergenceTex, v_uv).r;
  float pressure = (L + R + B + T - C) * 0.25;
  fragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
```

##### Pass 7: Subtract Pressure Gradient (Projection)
Removes divergence from velocity field.

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_velocityTex;
uniform sampler2D u_pressureTex;
uniform vec2 u_texelSize;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  float L = texture(u_pressureTex, v_uv - vec2(u_texelSize.x, 0.0)).r;
  float R = texture(u_pressureTex, v_uv + vec2(u_texelSize.x, 0.0)).r;
  float T = texture(u_pressureTex, v_uv + vec2(0.0, u_texelSize.y)).r;
  float B = texture(u_pressureTex, v_uv - vec2(0.0, u_texelSize.y)).r;
  vec2 grad = vec2(R - L, T - B) * 0.5;
  vec2 velocity = texture(u_velocityTex, v_uv).xy;
  fragColor = vec4(velocity - grad, 0.0, 1.0);
}
```

##### Optional Pass 8: Vorticity Confinement (Curl Computation + Confinement)
Enhances swirling effects.

**Curl Fragment Shader:**
```glsl
#version 300 es
precision highp float;

uniform sampler2D u_velocityTex;
uniform vec2 u_texelSize;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  float L = texture(u_velocityTex, v_uv - vec2(u_texelSize.x, 0.0)).y;
  float R = texture(u_velocityTex, v_uv + vec2(u_texelSize.x, 0.0)).y;
  float T = texture(u_velocityTex, v_uv + vec2(0.0, u_texelSize.y)).x;
  float B = texture(u_velocityTex, v_uv - vec2(0.0, u_texelSize.y)).x;
  float curl = (R - L - T + B) * 0.5;
  fragColor = vec4(curl, 0.0, 0.0, 1.0);
}
```

**Vorticity Confinement Fragment Shader:**
```glsl
#version 300 es
precision highp float;

uniform sampler2D u_velocityTex;
uniform sampler2D u_curlTex;
uniform float u_vorticityScale;
uniform vec2 u_texelSize;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  float L = texture(u_curlTex, v_uv - vec2(u_texelSize.x, 0.0)).r;
  float R = texture(u_curlTex, v_uv + vec2(u_texelSize.x, 0.0)).r;
  float T = texture(u_curlTex, v_uv + vec2(0.0, u_texelSize.y)).r;
  float B = texture(u_curlTex, v_uv - vec2(0.0, u_texelSize.y)).r;
  vec2 grad = vec2(abs(T) - abs(B), abs(R) - abs(L)) * 0.5;
  float len = length(grad) + 1e-5;
  vec2 force = u_vorticityScale * grad / len;
  vec2 velocity = texture(u_velocityTex, v_uv).xy;
  fragColor = vec4(velocity + force, 0.0, 1.0);
}
```

##### Pass 9: Display / Render (Maps to Section 4.2 Pass 4)
Converts density to visual output with blending.

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_densityTex;
uniform vec3 u_color;
uniform float u_opacity;
uniform float u_alphaLow;
uniform float u_alphaHigh;
uniform int u_blendMode; // 0: screen, 1: overlay, 2: normal

in vec2 v_uv;
out vec4 fragColor;

void main() {
  float density = texture(u_densityTex, v_uv).r;
  float alpha = smoothstep(u_alphaLow, u_alphaHigh, density) * u_opacity;
  vec3 color = u_color * alpha;
  // Simplified blending (extend for full modes)
  if (u_blendMode == 0) { // Screen
    fragColor = vec4(color, alpha);
  } else {
    fragColor = vec4(color, alpha);
  }
}
```

##### Integration Instructions
- **Textures Initialization**: Create float textures for velocity (RG), density (R), pressure (R), divergence (R), curl (R). Initialize velocity and density to zero, pressure to atmospheric pressure (0.0).
- **Frame Loop**:
  1. Inject density (Pass 3) → density.
  2. Advect density (Pass 2) → density.
  3. Inject velocity/forces (Pass 4) → velocity.
  4. Advect velocity (Pass 1) → velocity.
  5. Vorticity confinement (Pass 8) → velocity (optional).
  6. Compute divergence (Pass 5) → divergence.
  7. Jacobi solve (Pass 6, 20-40 iterations) → pressure.
  8. Subtract gradient (Pass 7) → velocity.
  9. Render (Pass 9) → display.
- **Inject Calls**: Call inject shaders based on config (e.g., u_emitterY from slide params).
- **Constraints**: Frame rate cap at 60fps; scale resolution for performance.

### 4.5 Performance Optimization

#### Adaptive Quality
- **Device Detection**: Check WebGL capabilities and GPU memory
- **Resolution Scaling**: Reduce simulation resolution on low-end devices
- **Shader Variants**: Compile-time shader selection based on features

#### Memory Management
- **Texture Pooling**: Reuse WebGL textures to avoid allocations
- **Buffer Management**: Double-buffered framebuffers for stable simulation
- **Cleanup**: Proper disposal of WebGL resources on component unmount

#### Frame Rate Control
- **Fixed Timestep**: Accumulate time for consistent physics
- **Quality Scaling**: Reduce resolution if frame time exceeds threshold
- **LOD System**: Different quality levels based on distance/viewport

### 4.6 Integration with React

#### Component Architecture
```tsx
const AtmosphereCanvas: React.FC<{ config: ParticleConfig }> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AtmosphereEngine>();
  
  useEffect(() => {
    if (canvasRef.current) {
      engineRef.current = new AtmosphereEngine(canvasRef.current, config);
    }
    
    return () => {
      engineRef.current?.dispose();
    };
  }, []);
  
  useEffect(() => {
    engineRef.current?.updateConfig(config);
  }, [config]);
  
  useFrame(() => {
    engineRef.current?.render(1/60);
  });
  
  return <canvas ref={canvasRef} className="atmosphere-layer" />;
};
```

#### State Synchronization
- Real-time updates from Firestore slide changes
- Smooth interpolation of parameter changes
- Pause/resume on slide transitions

### 4.7 Fallback Strategies

#### WebGL Unavailable
- Graceful degradation to CSS-only effects
- Animated background gradients or particle images
- No atmosphere layer, background only

#### Performance Issues
- Automatic quality reduction
- Switch to sprite mode for fluid effects
- Disable atmosphere on low-end devices

#### Browser Compatibility
- WebGL 2.0 preferred, fall back to WebGL 1.0
- Canvas 2D fallback for very old browsers
- Progressive enhancement approach

## 5. Development Roadmap

### 5.1 Overall Project Timeline

- **Total Duration:** 12-16 weeks
- **Team Size:** 2-3 developers (1 frontend, 1 backend/fullstack, 1 optional graphics specialist)
- **Methodology:** Agile with 2-week sprints
- **Key Milestones:** Firebase foundation, MVP editor, Atmosphere engine, Production deployment

### 5.2 Phase 1: Foundation (Weeks 1-3)

#### Objectives
Establish the core Firebase infrastructure and basic application shell.

#### Technical Implementation
##### Firebase Setup
- Initialize Firebase project with CLI
- Configure Firestore database with initial schema
- Set up Firebase Auth with email/password and Google providers
- Configure Firebase Storage with security rules
- Deploy Firebase Hosting initial site

##### Authentication System
- Implement `AuthContext` using React Context API
- Create login/logout components with Firebase Auth
- Add protected routes for admin sections
- Implement user registration and password reset flows

##### Base Application Architecture
- Set up Vite + React + TypeScript project structure
- Implement routing with React Router
- Create base layouts for Admin and Player applications
- Set up Tailwind CSS with custom theme (neutral-900 palette)
- Implement responsive design patterns

##### Data Layer Setup
- Create Firestore service layer with TypeScript interfaces
- Implement basic CRUD operations for organizations
- Set up real-time listeners for initial data synchronization
- Configure offline persistence

#### Deliverables
- Functional Firebase project with Auth and Firestore
- Basic login/logout functionality
- Empty admin dashboard and player preview
- TypeScript interfaces for core data models

#### Testing Strategy
- Unit tests for Firebase service functions
- Integration tests for authentication flows
- E2E tests for basic navigation

#### Technical Implementation
##### Menu Management Module
- Implement menu management component with Firestore integration
- Implement CRUD operations for menu sections and items
- Add real-time synchronization for menu updates
- Create image upload functionality for menu items

The menu management component provides a comprehensive interface for creating and managing restaurant menus. Key features include hierarchical organization of menu sections and items, real-time synchronization via Firestore, and media asset management. Implement using React with state management via Zustand or React hooks. Core interfaces:

```typescript
interface MenuManagementProps {
  orgId: string;
}

interface MenuSection {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: string;
  imageUrl?: string;
  calories?: string;
  isAvailable: boolean;
}
```

Features: CRUD operations with optimistic updates, drag-and-drop reordering, image upload with Firebase Storage, availability toggles, and real-time collaborative editing.

##### Slide Editor Development
- Implement drag-and-drop canvas with React DnD
- Create tile registry and rendering components
- Add properties panel with real-time preview
- Integrate background image upload to Firebase Storage

The slide editor component enables visual creation of digital signage content through an interactive canvas. Key features include drag-and-drop tile placement, dynamic property panels, and real-time collaboration. Implement using React DnD for drag operations, with a responsive canvas that supports multiple tile types (text, images, charts). Core interfaces (referencing data model from Section 3.2):

```typescript
interface SlideEditorProps {
  slideId: string;
  orgId: string;
}

interface TileInstance {
  id: string;
  type: 'text' | 'image' | 'chart' | 'video';
  position: { x: number; y: number };
  size: { width: number; height: number };
  properties: Record<string, any>; // Type-specific properties
  zIndex: number;
}
```

Features: Grid snapping, multi-selection, copy/paste, undo/redo stack, real-time sync, and preview mode with atmosphere effects.

##### Atmosphere Configuration UI
- Add Atmosphere tab to properties panel
- Implement parameter sliders and controls
- Create preset selection interface
- Add real-time preview of atmosphere effects

##### Data Synchronization
- Implement Firestore listeners for slide changes
- Add optimistic updates for better UX
- Handle offline editing scenarios

#### Deliverables
- Complete menu management interface
- Functional slide editor with tile placement
- Atmosphere parameter controls
- Real-time data synchronization

#### Testing Strategy
- Component tests for editor interactions
- Integration tests for Firestore operations
- Performance tests for large menu datasets

#### Risks and Mitigation
- Complex drag-and-drop: Use established libraries (React DnD)
- Real-time sync conflicts: Implement conflict resolution strategies

### 5.4 Phase 3: Atmosphere Engine Implementation (Weeks 8-11)

#### Objectives
Develop the WebGL particle and fluid simulation system.

#### Technical Implementation
##### WebGL Foundation
- Set up WebGL 2.0 context and canvas management
- Implement shader compilation and program management
- Create framebuffer and texture utilities
- Set up render loop with requestAnimationFrame

##### Fluid Simulation Core
- Implement 4-pass fluid simulation algorithm
- Create GLSL shaders for advection, divergence, Jacobi, subtraction
- Add ping-pong framebuffer system
- Implement adaptive resolution scaling

##### Particle System Alternative
- Develop sprite-based particle emitter
- Implement physics simulation (gravity, wind)
- Create particle lifecycle management
- Add blending and rendering optimizations

##### React Integration
- Create AtmosphereCanvas React component
- Implement config updates and state synchronization
- Add performance monitoring and quality scaling
- Handle WebGL context loss gracefully

The AtmosphereCanvas component renders real-time particle and fluid effects using WebGL, integrated as a React component for seamless UI layering. Key features include parameter-driven simulations, adaptive quality scaling, and graceful degradation. Implement using WebGL 2.0 with shader programs for fluid dynamics and particle systems. Core interfaces:

```typescript
interface AtmosphereCanvasProps {
  config: ParticleConfig;
  width: number;
  height: number;
  onError?: (error: string) => void;
}

interface ParticleConfig {
  effectType: 'smoke' | 'snow' | 'rain' | 'hearts' | 'stars';
  density: number;
  speed: number;
  color: [number, number, number, number];
  blendMode: 'screen' | 'overlay' | 'normal';
  emitterPosition: { x: number; y: number };
  vorticity: number;
}
```

Features: Shader hot-reloading, performance monitoring with FPS tracking, automatic quality reduction, WebGL context recovery, and fallback to CSS animations on unsupported devices.

##### Shader Development
- Write vertex and fragment shaders for each pass
- Implement uniform parameter passing
- Add shader debugging and hot-reloading
- Optimize for different device capabilities

#### Deliverables
- Functional fluid simulation engine
- Particle system for alternative effects
- Integrated AtmosphereCanvas component
- Performance-optimized shader implementations

#### Testing Strategy
- Shader compilation tests
- Performance benchmarks across devices
- Visual regression tests for effects

#### Risks and Mitigation
- WebGL complexity: Start with simplified version, iterate
- Performance issues: Implement quality scaling early
- Browser compatibility: Progressive fallbacks

### 5.5 Phase 4: Player Application & Production (Weeks 12-14)

#### Objectives
Complete the player application and prepare for production deployment.

#### Technical Implementation
##### Player Application Development
- Create read-only player route `/player/:screenId`
- Implement slide playlist management
- Add real-time Firestore listeners for content updates
- Create smooth slide transitions with preloading

The player application is a full-screen, read-only digital signage display that renders slides with atmosphere effects and UI content. Key features include real-time synchronization, playlist management, and offline resilience. Implement as a React application with full-screen routing, Firestore listeners, and canvas-based rendering. Core interfaces:

```typescript
interface PlayerAppProps {
  screenId: string;
}

interface SlidePlaylist {
  slides: Slide[];
  currentIndex: number;
  rotationSettings: {
    algorithm: 'loop' | 'random' | 'custom';
    transition: 'fade' | 'slide' | 'none';
    durationMs: number;
  };
}

interface PlayerState {
  currentSlide: Slide | null;
  nextSlide: Slide | null;
  atmosphereConfig: ParticleConfig;
  isTransitioning: boolean;
}
```

Features: Automatic slide cycling, preloading of assets, atmosphere rendering integration, error recovery with fallback content, kiosk mode with touch/keyboard disabled, and real-time sync with conflict-free updates.

##### Atmosphere Integration
- Integrate AtmosphereCanvas into player layout
- Implement slide-specific atmosphere configurations
- Add warm-up period for fluid simulations
- Optimize rendering for continuous playback

##### Production Optimizations
- Implement code splitting and lazy loading
- Add service worker for caching
- Configure performance monitoring
- Set up error tracking and reporting

##### Deployment Pipeline
- Set up GitHub Actions for CI/CD
- Configure Firebase Hosting deployment
- Implement staging and production environments
- Add automated testing in pipeline

#### Deliverables
- Complete player application
- Production-ready deployment pipeline
- Performance monitoring and analytics
- Documentation and setup guides

#### Testing Strategy
- Cross-browser compatibility testing
- Performance testing on target devices
- Load testing for multiple concurrent players
- Accessibility testing

#### Risks and Mitigation
- Real-time sync delays: Optimize Firestore queries
- Performance on low-end devices: Graceful degradation

### 5.6 Phase 5: Launch and Optimization (Weeks 15-16)

#### Objectives
Final polish, testing, and go-live preparation.

#### Technical Implementation
##### Final Testing and QA
- Comprehensive user acceptance testing
- Performance optimization and profiling
- Security audit and penetration testing
- Accessibility compliance check

##### Monitoring and Analytics Setup
- Implement Firebase Analytics for user behavior
- Set up performance monitoring dashboards
- Configure error reporting and alerting
- Add business metrics tracking

##### Documentation and Training
- Complete API documentation
- Create user manuals and tutorials
- Develop admin training materials
- Set up support and maintenance procedures

#### Deliverables
- Production deployment
- Complete documentation suite
- Monitoring and support infrastructure
- Go-live checklist and rollback plans

#### Testing Strategy
- Beta testing with select customers
- Load testing under production conditions
- Disaster recovery testing

#### Risks and Mitigation
- Launch issues: Comprehensive testing and phased rollout
- User adoption: Training and support materials

### 5.7 Technology Stack and Dependencies

#### Core Dependencies
- **React 18+**: UI framework
- **TypeScript 4.9+**: Type safety
- **Vite 4+**: Build tool
- **Tailwind CSS 3+**: Styling
- **Firebase SDK 9+**: Backend services
- **React Router 6+**: Routing
- **React DnD**: Drag-and-drop
- **Recharts**: Data visualization

#### Development Dependencies
- **Jest**: Unit testing
- **React Testing Library**: Component testing
- **Cypress**: E2E testing
- **ESLint + Prettier**: Code quality
- **Husky**: Git hooks

### 5.8 Success Criteria and KPIs

#### Functional Criteria
- Admin can create and edit slides with atmosphere effects
- Player displays content with real-time updates
- Atmosphere effects render smoothly on target devices
- System handles multiple concurrent users

#### Performance Criteria
- Page load time < 3 seconds
- Atmosphere rendering at 60fps on modern devices
- Real-time sync latency < 1 second
- Support for 100+ concurrent players

#### Quality Criteria
- 99.9% uptime
- < 0.1% error rate
- WCAG 2.1 AA accessibility compliance
- Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

### 5.9 Risk Management and Contingencies

#### Technical Risks
- **WebGL Performance Issues**: Fallback to CSS animations, simplified particle systems
- **Firebase Quota Limits**: Implement caching, monitor usage, upgrade plan if needed
- **Real-time Sync Conflicts**: Conflict resolution algorithms, user notifications
- **Browser Compatibility**: Progressive enhancement, polyfills

#### Project Risks
- **Scope Creep**: Strict requirements management, phased delivery
- **Timeline Delays**: Parallel development streams, MVP-first approach
- **Resource Constraints**: External contractor support for graphics engine
- **User Adoption**: Beta testing, user feedback integration

#### Contingency Plans
- **Reduced Atmosphere Features**: Launch with basic effects, add advanced features post-launch
- **Alternative Backend**: PostgreSQL backup if Firebase issues arise
- **Simplified Player**: HTML/CSS-only version for low-end devices
- **Phased Rollout**: Deploy to single location first, expand gradually

## 6. Deployment & Deliverables

### 6.1 Deployment Architecture

#### Infrastructure Overview
- **Firebase Hosting**: Global CDN for static assets and SSR
- **Firestore**: Real-time database with automatic scaling
- **Firebase Storage**: Media asset storage with CDN
- **Firebase Auth**: User authentication and authorization
- **Cloud Functions**: Serverless backend for image processing and complex logic

#### Environment Strategy
- **Development**: Local Firebase emulators
- **Staging**: Separate Firebase project for testing
- **Production**: Live Firebase project with monitoring

#### Scaling Considerations
- **Horizontal Scaling**: Firebase services auto-scale
- **Geographic Distribution**: Multi-region deployment for global coverage
- **Load Balancing**: Firebase Hosting automatic load balancing

### 6.2 CI/CD Pipeline

#### GitHub Actions Workflow
- **Trigger**: Push to main branch and pull requests
- **Build Process**: Vite build with TypeScript checking
- **Testing**: Unit tests, integration tests, E2E tests
- **Deployment**: Automatic deploy to staging, manual to production

#### Pipeline Stages
1. **Linting and Type Checking**: ESLint + TypeScript
2. **Unit Tests**: Jest with coverage reporting
3. **Build**: Vite production build
4. **Integration Tests**: Firebase emulator tests
5. **E2E Tests**: Cypress for critical user flows
6. **Security Scan**: Automated vulnerability scanning
7. **Deploy**: Firebase Hosting deployment

#### Quality Gates
- **Test Coverage**: Minimum 80% coverage required
- **Performance Budget**: Bundle size limits
- **Security**: Automated security scanning
- **Accessibility**: Basic accessibility checks

### 6.3 Infrastructure Setup

#### Firebase Project Configuration
- **Project ID**: `accel-restaurants-prod`
- **Regions**: us-central1 (primary), us-east1 (backup)
- **Billing Plan**: Blaze plan for pay-as-you-go scaling

#### Firestore Configuration
- **Database ID**: default
- **Security Rules**: Enforce organization-based access control
- **Indexes**: Composite indexes for query optimization

#### Storage Configuration
- **Bucket**: accel-restaurants-prod.appspot.com
- **Security Rules**: Organization-scoped access
- **Lifecycle Rules**: Automatic cleanup of temp files

#### Hosting Configuration
- **Site**: accel-restaurants-prod.web.app
- **Rewrites**: SPA routing for React Router
- **Headers**: Security headers and caching rules

### 6.4 Monitoring and Observability

#### Application Monitoring
- **Firebase Performance Monitoring**: Page load times, network requests
- **Firebase Crashlytics**: Error tracking and crash reporting
- **Firebase Analytics**: User behavior and conversion tracking

#### Infrastructure Monitoring
- **Firebase Console**: Service health and usage metrics
- **Custom Dashboards**: Real-time performance dashboards
- **Alerting**: Automated alerts for critical issues

#### Logging Strategy
- **Client-side Logging**: Structured logging with context
- **Server-side Logging**: Cloud Functions logging
- **Log Aggregation**: Centralized log storage and analysis

### 6.5 Security Implementation

#### Authentication Security
- **Multi-factor Authentication**: Optional 2FA for admin accounts
- **Session Management**: Secure token handling
- **Password Policies**: Strong password requirements

#### Data Security
- **Encryption**: All data encrypted at rest and in transit
- **Access Control**: Role-based permissions
- **Audit Logging**: Comprehensive audit trails

#### Network Security
- **HTTPS Only**: Enforced SSL/TLS
- **CSP Headers**: Content Security Policy
- **CORS Configuration**: Restricted cross-origin access

### 6.6 Deliverables

#### Core Application
- **Admin Console**: Complete slide editor and menu management
- **Player Application**: Real-time digital signage player
- **API Documentation**: RESTful API endpoints
- **SDK**: Client libraries for integrations

#### Documentation
- **User Manual**: Step-by-step guides for administrators
- **API Reference**: Complete API documentation
- **Developer Guide**: Setup and development instructions
- **Troubleshooting Guide**: Common issues and solutions

#### Supporting Materials
- **Deployment Scripts**: Automated setup scripts
- **Monitoring Dashboards**: Pre-configured monitoring
- **Backup Procedures**: Data backup and recovery guides
- **Training Materials**: Video tutorials and webinars

#### Quality Assurance
- **Test Suites**: Comprehensive test coverage
- **Performance Benchmarks**: Baseline performance metrics
- **Security Audit Report**: Third-party security assessment
- **Accessibility Report**: WCAG compliance verification

### 6.7 Maintenance and Support

#### Operational Procedures
- **Backup Strategy**: Automated daily backups with point-in-time recovery
- **Update Process**: Rolling updates with zero-downtime deployment
- **Incident Response**: 24/7 monitoring with escalation procedures
- **Disaster Recovery**: Multi-region failover capability

#### Support Structure
- **Tier 1 Support**: Basic troubleshooting and user assistance
- **Tier 2 Support**: Technical issue resolution
- **Tier 3 Support**: Escalation to development team
- **Self-Service**: Knowledge base and community forums

#### SLAs and Guarantees
- **Uptime SLA**: 99.9% availability guarantee
- **Performance SLA**: Sub-second response times
- **Support SLA**: 4-hour response time for critical issues
- **Data Retention**: 7-year audit log retention

### 6.8 Go-Live Checklist

#### Pre-Launch Checklist
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] User acceptance testing passed
- [ ] Documentation finalized
- [ ] Training completed for support team

#### Launch Day Checklist
- [ ] Production environment configured
- [ ] Monitoring systems activated
- [ ] Backup systems verified
- [ ] Support team on standby
- [ ] Rollback plan ready

#### Post-Launch Checklist
- [ ] Initial data migration completed
- [ ] User onboarding successful
- [ ] Performance monitoring active
- [ ] Feedback collection started

### 6.9 Cost Optimization

#### Firebase Pricing Optimization
- **Firestore**: Optimize reads/writes with efficient queries
- **Storage**: Implement lifecycle policies for cost reduction
- **Functions**: Minimize cold starts with appropriate memory allocation
- **Hosting**: Leverage CDN caching for bandwidth savings

#### Usage Monitoring
- **Cost Alerts**: Set up budget alerts and spending limits
- **Usage Analytics**: Monitor resource consumption patterns
- **Optimization Recommendations**: Automated cost optimization suggestions

## 7. Known Constraints & Optimizations

### 7.1 Performance Constraints

#### WebGL Rendering Limitations
- **GPU Memory**: Fluid simulations require significant VRAM (512MB+ recommended)
- **Shader Complexity**: GLSL compilation limits on older mobile GPUs
- **Context Loss**: WebGL contexts can be lost on mobile devices during backgrounding
- **Power Consumption**: Continuous rendering drains battery on mobile devices

#### Browser Compatibility Issues
- **WebGL Support**: Not available on all browsers (especially older versions)
- **Extension Requirements**: Some effects require specific WebGL extensions
- **Canvas Size Limits**: Maximum texture sizes vary by device (2048x2048 to 4096x4096)

#### Device-Specific Constraints
- **Mobile GPUs**: Limited parallel processing compared to desktop
- **Memory Pressure**: iOS Safari aggressively limits memory usage
- **Thermal Throttling**: Continuous rendering can cause device overheating

### 7.2 Bandwidth and Network Optimizations

#### Image Optimization Pipeline
- **Format Selection**: Automatic WebP/AVIF conversion for modern browsers
- **Progressive Loading**: Blur-to-sharp image loading for backgrounds
- **Lazy Loading**: Background images loaded only when slides are active
- **CDN Caching**: Firebase Storage automatic edge caching

#### Data Synchronization Optimizations
- **Delta Updates**: Only sync changed slide properties
- **Compression**: Gzip compression for Firestore payloads
- **Offline Caching**: Service worker caching for critical assets
- **Preloading**: Next slides preloaded during transitions

### 7.3 Atmosphere Engine Optimizations

#### Adaptive Quality Scaling
- **Resolution Scaling**: Automatic reduction based on device capabilities
- **Particle Count**: Dynamic particle limits based on performance
- **Shader Variants**: Compile-time optimization for different feature sets
- **Frame Rate Limiting**: Cap at 30fps on low-end devices

#### Memory Management
- **Texture Pooling**: Reuse WebGL textures to avoid allocations
- **Buffer Optimization**: Minimize vertex buffer sizes
- **Cleanup Routines**: Automatic disposal of unused resources
- **Context Recovery**: Handle WebGL context loss gracefully

#### CPU Optimizations
- **Simulation Stepping**: Variable time steps for consistent physics
- **Multithreading**: Use Web Workers for particle calculations where possible
- **Batch Operations**: Group similar operations to reduce draw calls
- **LOD System**: Level-of-detail based on viewport distance

### 7.4 User Experience Optimizations

#### Progressive Enhancement
- **Graceful Degradation**: Fall back to simpler effects on unsupported devices
- **Feature Detection**: Runtime checks for WebGL and extension support
- **User Preferences**: Allow users to disable effects for better performance
- **Loading States**: Visual feedback during effect initialization

#### Accessibility Considerations
- **Reduced Motion**: Respect user's motion preferences
- **High Contrast**: Ensure effects don't interfere with text readability
- **Screen Reader**: Alternative content for visual effects
- **Keyboard Navigation**: Full keyboard support for controls

### 8.2 UI Design System — Tokens, CSS Variables, and Component Specs (Reference Implementation)

This section provides the concrete UI design system for AccelRestaurants, enabling pixel-perfect reproduction of the previous iteration's look-and-feel. It includes design tokens, CSS variables, component specifications, layout rules, and integration instructions.
- **Batch Operations**: Use batch writes for bulk updates

#### Storage Optimizations
- **Upload Chunking**: Large file uploads split into chunks
- **Metadata Extraction**: Automatic image size and format detection
- **Lifecycle Policies**: Automatic cleanup of unused assets
- **CDN Integration**: Leverage Firebase Storage CDN

#### Hosting Optimizations
- **Bundle Splitting**: Code splitting by feature and route
- **Asset Optimization**: Minification, compression, and caching headers
- **Service Worker**: Offline support and background sync
- **Preloading**: Critical resources preloaded for faster startup

### 7.6 Development and Testing Optimizations

#### Build Optimizations
- **Tree Shaking**: Remove unused code from bundles
- **Code Splitting**: Dynamic imports for large modules
- **Asset Optimization**: Image and font optimization in build pipeline
- **Source Maps**: Optimized source maps for debugging

#### Testing Optimizations
- **Mock Services**: Fast unit tests with Firebase emulators
- **Visual Regression**: Automated testing for UI consistency
- **Performance Budgets**: Enforce bundle size and load time limits
- **Cross-Device Testing**: Automated testing on multiple device types

### 7.7 Security and Privacy Optimizations

#### Data Protection
- **Encryption**: All data encrypted in transit and at rest
- **Access Controls**: Fine-grained permissions for data access
- **Audit Logging**: Comprehensive logging for compliance
- **Data Minimization**: Only collect necessary user data

#### Network Security
- **HTTPS Enforcement**: All connections secured with TLS 1.3
- **CSP Headers**: Strict Content Security Policy
- **CORS Policies**: Restricted cross-origin resource sharing
- **API Rate Limiting**: Prevent abuse of public endpoints

### 7.8 Scalability Considerations

#### Horizontal Scaling
- **Stateless Design**: Application scales horizontally without session affinity
- **CDN Distribution**: Global content delivery for reduced latency
- **Database Sharding**: Firestore automatic scaling handles increased load
- **Load Balancing**: Firebase Hosting automatic load distribution

#### Vertical Scaling
- **Resource Allocation**: Dynamic resource allocation based on load
- **Caching Strategies**: Multi-level caching (browser, CDN, application)
- **Database Optimization**: Query optimization and connection pooling
- **Monitoring**: Real-time performance monitoring for scaling decisions

### 7.9 Future Optimization Opportunities

#### WebGL 2.0 Features
- **Compute Shaders**: GPU compute for advanced fluid simulations
- **Multiple Render Targets**: More efficient multi-pass algorithms
- **Texture Arrays**: Better memory management for large datasets
- **Anisotropic Filtering**: Improved texture quality

#### Web Standards Evolution
- **WebGPU**: Next-generation graphics API for better performance
- **Web Assembly**: High-performance computation for complex simulations
- **Service Workers**: Advanced offline capabilities
- **WebRTC**: Real-time communication for multi-device synchronization

#### Hardware Acceleration
- **GPU Compute**: Leverage GPU for non-rendering computations
- **Hardware Encoding**: Hardware-accelerated video processing
- **Neural Networks**: AI-powered image and effect optimization
- **Edge Computing**: Computation moved closer to users

## 8. User Interface Wireframes (Mental Model)

### 8.1 Design Principles

#### Core Design Philosophy
- **Minimalism**: Clean, uncluttered interfaces focused on content creation
- **Real-time Feedback**: Immediate visual feedback for all user actions
- **Progressive Disclosure**: Complex features revealed contextually
- **Accessibility First**: WCAG 2.1 AA compliance throughout

#### Visual Design System
- **Color Palette**: Neutral grays (#111827, #374151) with orange accents (#fbbf24)
- **Typography**: Inter font family with clear hierarchy
- **Spacing**: 8px grid system for consistent layouts
- **Shadows**: Subtle shadows for depth without distraction

### 8.2 Admin Console Interface

#### Dashboard Overview
```text
+---------------------------------------------------------------+
|  AccelRestaurants™                    [Logout] [Help] [Settings] |
+---------------------------------------------------------------+
|  [Screens]  [Menu]  [Campaigns]  [Insights]                    |
+---------------------------------------------------------------+
|                                                               |
|  +-------------------+  +-------------------+  +-------------+ |
|  | Screen: Downtown  |  | Screen: Uptown    |  | + Add Screen| |
|  | Status: Online    |  | Status: Offline   |  |             | |
|  | Last Updated: 5m  |  | Last Updated: 2h  |  +-------------+ |
|  +-------------------+  +-------------------+                 |
|                                                               |
|  Quick Stats: 8 Screens | 24 Slides | 156 Items | 3 Campaigns  |
+---------------------------------------------------------------+
```

#### Slide Editor Interface

##### Main Canvas Area
```text
+---------------------------------------------------------------+
|  [ ← Back ]   Slide: Morning Special      [Save] [Preview] [⋮] |
+---------------------------------------------------------------+
|  Layers Panel         | Canvas Area                     | Props |
+-----------------------+----------------------------------+-----+
|  □ Background         |                                  |     |
|  □ Atmosphere         |  [Drag tiles here]               |     |
|  □ Text: "Good Morning"|                                  |     |
|  □ Image: Coffee      |  Visual preview with handles     |     |
|  □ Text: "$4.99"      |                                  |     |
+-----------------------+----------------------------------+-----+
```

##### Properties Panel
```text
Properties Panel
─────────────────
Position & Size
  X: 100px  Y: 200px
  W: 300px  H: 50px
  Z: 2

Appearance
  □ Visible
  Opacity: 100%
  Blend Mode: Normal

Content (Text)
  Font: Inter Bold
  Size: 32px
  Color: #ffffff
  Align: Left

Animation
  □ Fade In
  Duration: 0.5s
  Delay: 0s
```

##### Atmosphere Controls
```text
Atmosphere Settings
───────────────────
Enabled: ☑

Type: Smoke ▼
  ○ Smoke
  ○ Snow
  ○ Rain
  ○ Hearts
  ○ Stars
  ○ Heat Wave

Preset: Wispy ▼
  ○ Wispy
  ○ Heavy
  ○ Storm
  ○ Calm

Parameters
  Density: ▓▓▓▓▓░░░ 70%
  Speed: ▓▓▓░░░░░░ 30%
  Vorticity: ▓▓▓▓▓▓▓▓ 100%

Visual
  Color: [#ffffff] 
  Blend: Screen ▼
  Opacity: ▓▓▓▓▓▓░░░ 80%

Spatial
  Emitter Y: ▓▓▓░░░░░░ 20%
  Mask Height: ▓▓▓▓▓▓▓▓ 60%
```

#### Menu Management Interface
```text
+---------------------------------------------------------------+
| Menu Management                                               |
+---------------------------------------------------------------+
|  +-------------------+  +-------------------+                 |
|  | Breakfast         |  | Burgers           |                 |
|  | 8 items           |  | 12 items          |   [Add Section] |
|  +-------------------+  +-------------------+                 |
|                                                               |
|  Selected: Avocado Toast                                      |
|  ──────────────────────────────────────────────────────────── |
|  Name: Avocado Toast                                          |
|  Description: Sourdough, avocado, chili flakes                |
|  Price: $12.99                                                |
|  Calories: 450 cal                                            |
|                                                               |
|  Image: [thumbnail] [Change]                                  |
|                                                               |
|  [Save Changes]                                               |
+---------------------------------------------------------------+
```

### 8.4 Player Interface

#### Digital Signage Display
```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Background Image: Coffee Shop Interior]                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  Atmosphere Layer:                                      │ │
│  │  • Smoke particles rising from bottom                   │ │
│  │  • White wisps with screen blend mode                   │ │
│  │  • Fading out at 60% screen height                      │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  UI Layer:                                              │ │
│  │  • "BREAKFAST SPECIAL" (top center)                     │ │
│  │  • Menu items with prices (left side)                   │ │
│  │  • Restaurant logo (bottom right)                       │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Full-Screen Layout
- **Resolution Support**: 1920x1080, 3840x2160, responsive scaling
- **Aspect Ratios**: 16:9, 16:10, 4:3 with content centering
- **Safe Areas**: Content positioned within TV safe zones
- **Orientation**: Landscape-only with rotation warnings

### 8.5 User Flows and Interactions

#### Content Creation Flow
1. **Login** → Dashboard → Select Screen → Create Slide
2. **Add Background** → Upload Image or Select from Library
3. **Configure Atmosphere** → Select Type → Adjust Parameters → Preview
4. **Add Content Tiles** → Drag from Library → Position → Style
5. **Save and Publish** → Auto-sync to Player devices

#### Real-time Collaboration Flow
1. **Multiple Users** → Concurrent editing with conflict resolution
2. **Live Preview** → Changes reflected immediately on test screens
3. **Version Control** → Automatic snapshots of slide states
4. **Approval Workflow** → Draft → Review → Publish stages

#### Player Synchronization Flow
1. **Device Registration** → Unique screen ID generation
2. **Content Download** → Background images cached locally
3. **Real-time Updates** → Firestore listeners trigger refreshes
4. **Offline Fallback** → Last known content displayed
5. **Error Recovery** → Automatic reconnection and sync

### 8.6 Responsive Design Patterns

#### Multi-Device Support
- **Desktop Admin**: Full-featured editing interface
- **Tablet Admin**: Touch-optimized controls
- **Mobile Admin**: Essential features only
- **Digital Signage**: Full-screen, touch-disabled displays

#### Adaptive Layouts
- **Breakpoint System**: Mobile (320px), Tablet (768px), Desktop (1024px+)
- **Component Scaling**: UI elements scale proportionally
- **Touch Targets**: Minimum 44px touch targets for mobile
- **Keyboard Navigation**: Full keyboard support for accessibility

### 8.7 Accessibility Features

#### Visual Accessibility
- **High Contrast Mode**: Enhanced contrast for low vision users
- **Color Blind Support**: Color-independent design patterns
- **Font Scaling**: Resizable text with minimum/maximum limits
- **Reduced Motion**: Respect system motion preferences

#### Keyboard Accessibility
- **Tab Navigation**: Logical tab order through all controls
- **Shortcut Keys**: Keyboard shortcuts for common actions
- **Focus Indicators**: Clear visual focus states
- **Screen Reader**: ARIA labels and semantic HTML

#### Content Accessibility
- **Alt Text**: Descriptive text for all images
- **Semantic Structure**: Proper heading hierarchy
- **Language Support**: Multi-language interface
- **Caption Support**: Text alternatives for visual content

### 8.8 Error States and Feedback

#### Loading States
- **Skeleton Screens**: Placeholder layouts during loading
- **Progress Indicators**: Percentage completion for uploads
- **Spinner Animations**: Non-blocking loading feedback

#### Error Handling
- **Inline Validation**: Real-time form validation feedback
- **Error Messages**: Clear, actionable error descriptions
- **Recovery Options**: One-click fixes where possible
- **Offline Indicators**: Clear offline/online status

#### Success Feedback
- **Toast Notifications**: Non-intrusive success confirmations
- **Visual Feedback**: Color changes and animations
- **Status Updates**: Real-time progress tracking

### 8.9 Performance Considerations

#### Interface Responsiveness
- **60fps Interactions**: Smooth animations and transitions
- **Lazy Loading**: Components loaded on demand
- **Virtual Scrolling**: Efficient rendering of large lists
- **Debounced Inputs**: Optimized real-time parameter adjustments

#### Memory Management
- **Component Cleanup**: Proper unmounting and resource disposal
- **Image Optimization**: Automatic resizing and compression
- **Cache Management**: Intelligent caching strategies
- **Memory Monitoring**: Automatic performance adjustments

### 8.10 Future UI Enhancements

#### Advanced Editing Features
- **Multi-touch Gestures**: Pinch-to-zoom, multi-finger drag
- **Voice Commands**: Voice-activated content creation
- **AI Assistance**: Smart layout suggestions
- **Template System**: Drag-and-drop slide templates

#### Enhanced Visualization
- **3D Preview**: Three-dimensional slide preview
- **Timeline Editor**: Time-based animation editing
- **Live Collaboration**: Real-time cursor sharing
- **Version History**: Visual diff of slide changes

#### Mobile Optimization
- **Progressive Web App**: Installable admin interface
- **Offline Editing**: Full functionality without internet
- **Touch Gestures**: Native mobile interaction patterns
- **Camera Integration**: Direct photo capture for content

### 8.11 User Experience Metrics

#### Usability Goals
- **Task Completion Time**: < 5 minutes for common slide creation
- **Error Rate**: < 5% user errors with clear recovery
- **Learnability**: New users productive within 30 minutes
- **Satisfaction**: > 4.5/5 user satisfaction rating

#### Performance Targets
- **Load Time**: < 2 seconds initial page load
- **Interaction Response**: < 100ms for UI interactions
- **Content Sync**: < 5 seconds for slide changes to appear
- **Offline Capability**: Full functionality for 24 hours offline

## 9. Next Steps for Developer

### 9.1 Pre-Implementation Checklist

#### Architecture Review
- [ ] Schedule architecture review meeting with stakeholders
- [ ] Present technical document and gather feedback
- [ ] Validate Firebase service limits and pricing
- [ ] Confirm WebGL compatibility requirements
- [ ] Review security and compliance requirements

#### Environment Setup
- [ ] Set up development workstations with required tools
- [ ] Configure Firebase project and service accounts
- [ ] Establish Git repository and branching strategy
- [ ] Set up CI/CD pipelines and deployment environments
- [ ] Configure monitoring and logging systems

#### Team Preparation
- [ ] Assemble development team with required skills
- [ ] Conduct kickoff meeting and role assignments
- [ ] Set up communication channels and project management tools
- [ ] Establish coding standards and review processes
- [ ] Schedule regular standups and milestone reviews

### 9.2 Implementation Phase 1: Foundation (Weeks 1-2)

#### Firebase Infrastructure Setup
1. **Create Firebase Project**
   ```bash
   firebase projects:create accel-restaurants-prod
   firebase use accel-restaurants-prod
   ```

2. **Initialize Services**
   ```bash
   firebase init firestore hosting storage auth
   ```

3. **Configure Firestore Security Rules**
   - Implement organization-based access control
   - Set up data validation rules
   - Configure real-time listener permissions

4. **Set Up Authentication**
   - Configure email/password and Google OAuth
   - Implement custom claims for role-based access
   - Set up password reset and email verification

#### Application Scaffolding
1. **Initialize React Application**
   ```bash
   npm create vite@latest accel-restaurants -- --template react-ts
   cd accel-restaurants
   npm install
   ```

2. **Install Core Dependencies**
   ```bash
   npm install firebase react-router-dom zustand tailwindcss lucide-react recharts
   npm install -D @types/node eslint prettier husky
   ```

3. **Configure Build Tools**
   - Set up Vite configuration for optimal bundling
   - Configure Tailwind CSS with custom theme
   - Set up ESLint and Prettier for code quality
   - Implement Git hooks with Husky

4. **Implement Base Architecture**
   - Create Firebase service layer with TypeScript interfaces
   - Set up React context for authentication state
   - Implement routing structure for admin and player
   - Create base component library with design system

#### Testing Infrastructure
1. **Unit Testing Setup**
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom
   ```

2. **Firebase Emulators**
   ```bash
   firebase init emulators
   firebase emulators:start
   ```

3. **Integration Testing**
   - Set up test utilities for Firebase mocking
   - Create test helpers for component rendering
   - Implement snapshot testing for UI components

### 9.3 Implementation Phase 2: Core Features (Weeks 3-6)

#### Authentication & Authorization
1. **Login/Logout Implementation**
   - Create login component with form validation
   - Implement protected routes with auth guards
   - Add user profile management
   - Handle authentication state persistence

2. **User Management**
   - Implement organization creation and management
   - Set up user invitation and role assignment
   - Create user profile and settings pages

#### Dashboard & Navigation
1. **Admin Dashboard**
   - Build main navigation with tab system
   - Implement screen overview with status indicators
   - Create quick stats and recent activity feeds
   - Add screen management (add/edit/delete)

2. **Real-time Updates**
   - Set up Firestore listeners for live data
   - Implement optimistic updates for better UX
   - Handle offline scenarios with local caching
   - Add conflict resolution for concurrent edits

#### Menu Management System
1. **Menu Data Structure**
   - Implement Firestore collections for menus, sections, items
   - Create CRUD operations with real-time sync
   - Add image upload and optimization
   - Implement data validation and error handling

2. **Menu Editor Interface**
   - Build tree view for menu sections and items
   - Create item detail editor with rich text support
   - Implement drag-and-drop for reordering
   - Add bulk operations and import/export

### 9.4 Implementation Phase 3: Atmosphere Engine (Weeks 7-10)

#### WebGL Foundation
1. **Canvas Setup**
   - Create WebGL context initialization
   - Implement canvas resizing and scaling
   - Set up render loop with requestAnimationFrame
   - Handle WebGL context loss recovery

2. **Shader System**
   - Implement GLSL shader compilation and linking
   - Create shader program management system
   - Set up uniform and attribute handling
   - Add shader debugging and hot-reloading

#### Fluid Simulation Core
1. **4-Pass Algorithm Implementation**
   - Implement advection pass with semi-Lagrangian method
   - Create divergence and pressure solve passes
   - Add buoyancy and vorticity confinement
   - Optimize for real-time performance

2. **Particle System Alternative**
   - Build emitter system with configurable parameters
   - Implement physics simulation (gravity, wind, turbulence)
   - Create particle lifecycle management
   - Add sprite rendering with blending modes

#### React Integration
1. **AtmosphereCanvas Component**
   - Create React wrapper for WebGL canvas
   - Implement props for configuration updates
   - Add performance monitoring and quality scaling
   - Handle component lifecycle and cleanup

2. **Configuration System**
   - Build UI controls for atmosphere parameters
   - Implement preset system with quick settings
   - Add real-time parameter adjustment
   - Create parameter validation and constraints

### 9.5 Implementation Phase 4: Slide Editor (Weeks 11-14)

#### Canvas System
1. **Drag-and-Drop Canvas**
   - Implement React DnD for tile placement
   - Create canvas coordinate system and scaling
   - Add snap-to-grid and alignment guides
   - Implement multi-selection and group operations

2. **Tile System**
   - Build tile registry with dynamic component loading
   - Create tile property editors for each type
   - Implement tile rendering and interaction
   - Add tile templates and library system

#### Background Management
1. **Image Upload System**
   - Implement Firebase Storage integration
   - Create image optimization pipeline
   - Add background positioning and scaling controls
   - Support multiple background formats

2. **Atmosphere Integration**
   - Integrate atmosphere controls in editor
   - Add real-time preview capabilities
   - Implement parameter persistence
   - Create atmosphere presets and templates

### 9.6 Implementation Phase 5: Player Application (Weeks 15-16)

#### Player Architecture
1. **Real-time Synchronization**
   - Implement Firestore listeners for slide updates
   - Create playlist management system
   - Add smooth transitions between slides
   - Handle offline fallback scenarios

2. **Atmosphere Rendering**
   - Integrate AtmosphereCanvas in player layout
   - Implement slide-specific atmosphere configurations
   - Add warm-up periods for fluid simulations
   - Optimize rendering for continuous playback

#### Performance Optimization
1. **Asset Management**
   - Implement lazy loading for images and videos
   - Create asset preloading system
   - Add memory management and cleanup
   - Optimize for low-end devices

2. **Monitoring and Analytics**
   - Implement Firebase Performance Monitoring
   - Add error tracking and crash reporting
   - Create custom analytics events
   - Set up alerting and notification systems

### 9.7 Testing and Quality Assurance (Ongoing)

#### Automated Testing
1. **Unit Tests**
   - Test all utility functions and services
   - Mock Firebase services for isolated testing
   - Achieve >80% code coverage
   - Run tests on every commit

2. **Integration Tests**
   - Test Firebase service interactions
   - Validate data flow between components
   - Test authentication and authorization flows
   - Run integration tests in CI pipeline

3. **End-to-End Tests**
   - Test complete user workflows
   - Validate cross-browser compatibility
   - Test mobile responsiveness
   - Include accessibility testing

#### Manual Testing
1. **User Acceptance Testing**
   - Conduct testing sessions with target users
   - Gather feedback on usability and features
   - Validate against business requirements
   - Document and prioritize issues

2. **Performance Testing**
   - Load testing with multiple concurrent users
   - Memory leak testing and profiling
   - Network condition simulation
   - Device compatibility testing

### 9.8 Deployment and Launch (Week 17)

#### Production Deployment
1. **Environment Setup**
   - Configure production Firebase project
   - Set up custom domain and SSL certificates
   - Configure CDN and global distribution
   - Set up monitoring and alerting

2. **Data Migration**
   - Migrate existing data if applicable
   - Validate data integrity post-migration
   - Set up backup and recovery procedures
   - Test data synchronization

3. **Go-Live Checklist**
   - Complete security audit
   - Performance benchmark validation
   - User training and documentation
   - Rollback plan preparation

#### Post-Launch Activities
1. **Monitoring and Support**
   - Monitor application performance and errors
   - Provide user support and issue resolution
   - Collect user feedback and analytics
   - Plan feature updates and improvements

2. **Maintenance and Updates**
   - Regular security updates and patches
   - Performance optimizations based on usage
   - Feature additions based on user feedback
   - Infrastructure scaling as needed

### 9.9 Development Best Practices

#### Code Quality
- Follow TypeScript strict mode
- Implement comprehensive error handling
- Write self-documenting code with clear naming
- Regular code reviews and pair programming

#### Version Control
- Use Git Flow branching strategy
- Write meaningful commit messages
- Require pull request reviews
- Maintain clean git history

#### Documentation
- Keep API documentation current
- Document complex algorithms and decisions
- Create setup and deployment guides
- Maintain troubleshooting runbooks

#### Security
- Regular security code reviews
- Keep dependencies updated
- Implement secure coding practices
- Regular security testing and audits

### 9.10 Risk Mitigation and Contingencies

#### Technical Risks
- **WebGL Compatibility Issues**: Have Canvas 2D fallbacks ready
- **Firebase Quota Exceedance**: Monitor usage and implement caching
- **Performance Bottlenecks**: Profile early and optimize hot paths
- **Browser API Changes**: Use polyfills and progressive enhancement

#### Project Risks
- **Timeline Delays**: Build buffer time into schedule
- **Resource Shortages**: Cross-train team members
- **Scope Creep**: Strict change control process
- **External Dependencies**: Have backup solutions ready

#### Business Risks
- **User Adoption**: Beta testing and user feedback loops
- **Competitive Response**: Focus on unique Atmosphere feature
- **Regulatory Changes**: Stay informed of privacy regulations
- **Market Changes**: Flexible architecture for feature additions

### 9.11 Success Metrics and KPIs

#### Development Metrics
- **Code Quality**: Maintain >80% test coverage
- **Performance**: Meet all performance budgets
- **Reliability**: <0.1% error rate in production
- **Velocity**: Consistent sprint completion

#### Product Metrics
- **User Engagement**: Track active users and session duration
- **Feature Usage**: Monitor Atmosphere and editor usage
- **Performance**: Measure load times and interaction response
- **Satisfaction**: User feedback and NPS scores

#### Business Metrics
- **Adoption Rate**: Track new organization signups
- **Retention**: Monitor user retention and churn
- **Revenue**: Track subscription and usage metrics
- **Support Load**: Measure support ticket volume and resolution time
