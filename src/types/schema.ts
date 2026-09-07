import { Timestamp } from 'firebase/firestore';

// --- Root Collection: users/{uid} ---
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber?: string;
  timezone?: string;
  jobTitle?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  platformRole: 'user' | 'admin' | 'designer'; // 'admin' is super admin, 'designer' is platform-vetted designer
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  invitations?: Invitation[];
  orgId?: string;
}

export type OrgRole = 'orgAdmin' | 'user' | 'designer' | 'locationAdmin' | 'locationUser';

export interface Invitation {
  id: string;
  orgId: string;
  orgName: string;
  inviterId: string;
  inviteeEmail: string;
  role: OrgRole;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
  createdAt: Timestamp;
  expiresAt: Timestamp;
  tokenHash?: string;
  acceptedByUid?: string;
  acceptedAt?: Timestamp;
}

export interface Membership {
  uid: string;
  role: OrgRole;
  locationIds?: string[]; // IDs of locations this user has access to (if role is location-specific)
  status: 'active' | 'deactivated';
  createdAt: Timestamp;
  createdBy: string;
}

// --- Root Collection: designers/{uid} ---
export interface DesignerProfile {
  uid: string;
  displayName: string;
  email: string;
  bio: string;
  specialties: string[]; // e.g. "Menu Design", "Branding", "Logo"
  portfolioUrl?: string;
  portfolioItems: PortfolioItem[];
  rates: {
    menuDesign: number; // Base rate for menu design
    hourlyRate?: number;
  };
  status: 'pending' | 'active' | 'suspended';
  rating: number;
  reviewCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// --- Root Collection: designer_invites/{inviteId} ---
export interface DesignerInvite {
  id: string;
  email: string;
  name: string;
  invitedBy: string; // Super Admin UID
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  tokenHash?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  acceptedAt?: Timestamp;
  createdUserId?: string; // UID of the designer once they sign up
}

export interface PortfolioItem {
  id: string;
  title: string;
  imageUrl: string;
  description?: string;
}

// --- Root Collection: designJobs/{jobId} ---
export interface DesignJob {
  id: string;
  orgId: string; // The restaurant org requesting the design
  orgName: string;
  designerId?: string; // Assigned designer (optional initially if it's a marketplace request)
  status: 'draft' | 'posted' | 'assigned' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  title: string;
  description: string;
  menuId?: string; // Linked menu ID if applicable
  attachments: string[]; // URLs to assets
  budget: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deadline?: Timestamp;
  paymentStatus: 'pending' | 'escrowed' | 'paid' | 'refunded';
  paymentId?: string;
}

// --- Sub-collection: designJobs/{jobId}/submissions/{submissionId} ---
export interface DesignSubmission {
  id: string;
  jobId: string;
  designerId: string;
  message?: string;
  fileUrls: string[];
  version: number;
  createdAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
}

// --- Root Collection: organizations/{orgId} ---
export interface Organization {
  id: string;
  name: string;
  plan: 'Free' | 'Basic' | 'Growth' | 'Enterprise' | 'Franchise';
  ownerId: string;
  members: string[]; // Array of UID strings for RBAC
  pendingInvites?: string[]; // Array of invited emails
  screenCount: number; // Track active screens for plan limits
  purchasedScreens?: number; // Additional screens purchased beyond plan limit
  purchasedSeats?: number; // Additional seats purchased beyond plan limit
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'trialing';
  subscriptionPeriodEnd?: Timestamp;
  
  // Admin Overrides
  tileAccess?: {
    override: boolean;
    allowedTiles: TileType[];
  };
  customLimits?: {
    seats?: number;
    screens?: number;
  };

  // Onboarding / Profile Fields
  industry?: 'Restaurant' | 'Bar' | 'Cafe' | 'Food Truck' | 'Other';
  timezone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  isSetupComplete?: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// --- Audio / media scheduling and coordination ---
export type AudioCoordinationMode = 'mix' | 'priority' | 'exclusive';

export interface MediaSchedule {
  enabled: boolean;
  startTime: string; // HH:mm in the location/player timezone
  endTime?: string;
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
}

export interface AudioSchedule extends MediaSchedule {
  id: string;
}

export interface GlobalMediaTrack {
  id: string;
  name: string;
  url: string; // Firebase Storage download URL
  storagePath?: string;
  mediaType: 'audio' | 'video-audio';
  volume: number; // 0-100
  startTimeSeconds: number;
  priority: number;
  schedule?: MediaSchedule;
}

export interface ScreenAudioConfig {
  enabled: boolean;
  applicationVolume: number; // persisted screen multiplier; device volume is separate
  masterVolume: number;
  backgroundMusicUrl?: string;
  playlist: GlobalMediaTrack[];
  allowVideoAudio: boolean;
  coordinationMode: AudioCoordinationMode;
  duckingEnabled: boolean;
  duckLevel: number;
  fadeBetweenTracksMs: number;
  schedule?: MediaSchedule;
  quietHours?: MediaSchedule;
}

export interface LocationAudioConfig {
  mediaUrl?: string; // Firebase Storage download URL
  storagePath?: string;
  assetId?: string; // legacy compatibility only
  isPlaying: boolean;
  volume: number;
  loop: boolean;
  excludedScreenIds: string[];
  schedule?: AudioSchedule[];
}

// --- Sub-collection: locations/{locationId} ---
export interface Location {
  id: string;
  orgId: string;
  name: string;
  groupId?: string; // Reference to a LocationGroup
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  timezone: string;
  audioConfig?: LocationAudioConfig;
  createdAt: Timestamp;
}

// --- Root Collection: location_audio_sync/{locationId} ---
export interface LocationAudioSync {
  id: string;
  orgId: string;
  locationId: string;
  mediaUrl: string;
  storagePath?: string;
  assetId?: string; // legacy compatibility only
  syncToken: string;
  scheduledStartTime: Timestamp;
  isPlaying: boolean;
  volume: number;
  loop: boolean;
  excludedScreenIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// --- Sub-collection: location_groups/{groupId} ---
export interface LocationGroup {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// --- Screen Adjustment Parameters ---
export interface ScreenAdjustments {
  scale?: number;   // 0.5-2.0, default 1.0
  offsetX?: number; // pixels, -200 to +200, default 0
  offsetY?: number; // pixels, -200 to +200, default 0
}

// --- Playlist Entry (per-slide overrides on a screen) ---
export interface PlaylistEntry {
  slideId: string;
  duration?: number;    // ms, overrides rotationSettings.rotationMs
  transition?: 'fade' | 'slide' | 'none'; // overrides rotationSettings.transition
  screenAdjustments?: ScreenAdjustments;
}

// --- Sub-collection: screens/{screenId} ---
export interface AppScreen {
  id: string;
  orgId: string; // Added for multi-tenant filtering
  locationId: string;
  name: string;
  orientation: 'landscape' | 'portrait';
  rotation?: 0 | 90 | 180 | 270;
  livePlaylist: (PlaylistEntry | string)[]; // PlaylistEntry[] (new) or string[] (legacy)
  rotationSettings: {
    algorithm: 'loop' | 'random' | 'custom';
    customSequence?: string[];
    transition: 'fade' | 'slide' | 'none';
    rotationMs: number;
  };
  screenAdjustments?: ScreenAdjustments;
  audioConfig?: ScreenAudioConfig;
  isActive: boolean;
  lastHeartbeatAt?: Timestamp;
  createdAt: Timestamp;
}

// --- Sub-collection: assets/{assetId} ---
export interface Asset {
  id: string;
  orgId: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  storagePath: string;
  metadata: {
    width?: number;
    height?: number;
    size: number;
    contentType: string;
  };
  tags: string[];
  uploadedBy: string;
  createdAt: Timestamp;
}

// --- Sub-collection: slides/{slideId} ---
export interface Slide {
  id: string;
  orgId: string;
  name: string;
  dimensions: {
    width: number;
    height: number;
  };
  orientation: 'landscape' | 'portrait';
  backgroundColor: string;
  backgroundImageUrl?: string;
  particleConfig?: ParticleConfig;
  elements: TileInstance[];
  duration?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ParticleConfig {
  effectType: 'none' | 'smoke' | 'snow' | 'rain' | 'hearts' | 'stars' | 'leaves';
  density: number;
  speed: number;
  color: [number, number, number, number]; // RGBA tuple
  blendMode: 'screen' | 'overlay' | 'normal';
  emitterPosition: { x: number; y: number };
  vorticity: number;
  particleSize?: number;  // Base size multiplier (1-50, default varies by effect)
  particleAngle?: number; // Rotation angle in degrees (0-360, default 0)
}

export type TileType = 
  // Text Tiles
  | 'text' | 'dynamic_text' | 'scrolling_text' | 'rich_text' | 'marquee' | 'typewriter' | 'word_art' | 'gradient_text' | 'animated_text' | 'text_shadow'
  // Media Tiles
  | 'image' | 'video' | 'gif' | 'lottie' | 'audio' | 'slideshow' | 'webcam' | 'youtube' | 'vimeo' | 'background_video'
  // Data Visualization Tiles
  | 'bar_chart' | 'line_chart' | 'pie_chart' | 'gauge' | 'table' | 'kpi_card' | 'progress_bar' | 'heatmap' | 'sparklines' | 'timeline'
  // Interactive Tiles
  | 'button' | 'qr_code' | 'countdown' | 'form' | 'poll' | 'social_feed' | 'weather' | 'menu_selector' | 'promotion_banner' | 'loyalty_card'
  // Layout Tiles
  | 'container' | 'divider' | 'grid' | 'flex' | 'tabs' | 'accordion' | 'carousel' | 'sticky_note' | 'shape' | 'frame'
  // Special/Integration Tiles
  | 'clock' | 'calendar' | 'rss_feed' | 'social_proof' | 'testimonial' | 'stock_ticker' | 'menu_item' | 'special_offer' | 'event_countdown' | 'map';

export interface TextShadowProps {
  color?: string;
  blur?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface TileInteraction {
  trigger: 'click' | 'hover' | 'load' | 'interval' | 'event'; 
  eventName?: string; // For 'event' trigger (subscribe) or 'emit_event' (publish)
  action: 'navigate' | 'link' | 'emit_event' | 'update_property' | 'run_script';
  targetId?: string; // Slide ID for navigate, Tile ID for update_property
  payload?: Record<string, unknown>; 
}

export interface CommonTileStyleProperties {
  borderColor?: string;
  borderOpacity?: number;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  interactions?: TileInteraction[];
}

export interface BaseTextProperties {
  fontSize?: number;
  fontWeight?: number;
  fontColor?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  fontFamily?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textShadow?: TextShadowProps;
  backgroundColor?: string;
}

export interface BaseTextProperties extends CommonTileStyleProperties {
  fontSize?: number;
  fontWeight?: number;
  fontColor?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  fontFamily?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textShadow?: TextShadowProps;
  backgroundColor?: string;
}

export interface TextTileProperties extends BaseTextProperties {
  content?: string;
}

export interface DynamicTextProperties extends BaseTextProperties {
  textTemplate?: string;
  dataSource?: 'none' | 'time' | 'weather' | 'menu' | 'google_sheets';
  updateInterval?: number;
  fallbackText?: string;
  scriptUrl?: string;
  workbookId?: string;
  sheetName?: string;
  column?: string;
  row?: number;
}

export interface ScrollingTextProperties extends BaseTextProperties {
  content?: string;
  scrollSpeed?: number;
  scrollDirection?: 'left' | 'right' | 'up' | 'down';
  loop?: boolean;
  pauseOnHover?: boolean;
  bounce?: boolean;
}

export interface RichTextProperties extends BaseTextProperties {
  htmlContent?: string;
}

export interface MarqueeProperties extends BaseTextProperties {
  content?: string;
  direction?: 'left' | 'right' | 'up' | 'down';
  speed?: number;
}

export interface TypewriterProperties extends BaseTextProperties {
  content?: string;
}

export interface WordArtProperties extends BaseTextProperties {
  content?: string;
  effect?: 'glow' | 'outline' | '3d';
  glowColor?: string;
  outlineColor?: string;
}

export interface GradientTextProperties extends BaseTextProperties {
  content?: string;
  gradientColors?: string[];
  gradientAngle?: number;
}

export interface AnimatedTextProperties extends BaseTextProperties {
  content?: string;
  animationType?: 'bounce' | 'pulse' | 'spin' | 'ping';
  animationDuration?: number;
}

export interface TextShadowTileProperties extends BaseTextProperties {
  content?: string;
  shadows?: TextShadowProps[];
}

export interface ImageTileProperties {
  url?: string;
  fitMode?: 'cover' | 'contain' | 'fill';
  borderRadius?: number;
  filters?: {
    brightness?: number;
    blur?: number;
  };
}

export interface MediaAudioProperties {
  startTime?: number;
  volume?: number; // 0-100
  priority?: number;
  duckBackground?: boolean;
  oneShot?: boolean;
  fadeInMs?: number;
  fadeOutMs?: number;
  scheduleEnabled?: boolean;
  scheduleStart?: string;
  scheduleEnd?: string;
  scheduleDays?: number[];
}

export interface VideoTileProperties extends MediaAudioProperties {
  url?: string;
  videoId?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  bounce?: boolean;
  reverse?: boolean;
}

export interface AudioTileProperties extends MediaAudioProperties {
  url?: string;
  trackName?: string;
  autoplay?: boolean;
  loop?: boolean;
  controls?: boolean;
  showIndicator?: boolean;
}

export interface WebcamTileProperties {
  deviceId?: string;
  mirror?: boolean;
}

export interface SlideshowTileProperties {
  images?: Array<{ url: string }>;
  interval?: number;
}

export interface DataTileSourceProperties {
  dataSourceType?: 'manual' | 'json' | 'google_sheets';
  manualData?: string; // CSV format: "Label,Value\nA,10\nB,20"
  jsonData?: string; // JSON string: "[{name:'A',value:10},...]"
  googleSheetConfig?: {
    scriptUrl?: string;
    workbookId?: string;
    sheetName?: string;
    range?: string; // e.g. "A1:B10"
    updateInterval?: number;
  };
}

export interface ChartProperties extends DataTileSourceProperties {
  data?: Array<Record<string, string | number>>;
  color?: string;
}

export interface PieChartProperties extends ChartProperties {
  innerRadius?: number;
}

export interface GaugeProperties {
  min?: number;
  max?: number;
  value?: number;
}

export interface SparklineProperties extends ChartProperties {
  showArea?: boolean;
}

export interface TableTileProperties extends DataTileSourceProperties {
  headers?: string[];
  data?: (string | number)[][];
}

export interface KPICardProperties {
  title?: string;
  value?: string | number;
  unit?: string;
  change?: number;
  color?: string;
}

export interface ProgressBarProperties {
  label?: string;
  value?: number;
  color?: string;
}

export interface HeatmapProperties extends DataTileSourceProperties {
  data?: number[][];
  lowColor?: string;
  highColor?: string;
}

export interface TimelineProperties extends DataTileSourceProperties {
  events?: Array<{ time: string; title: string }>;
  title?: string;
}

export interface InteractiveTileProperties {
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  content?: string;
  targetDate?: string;
  title?: string;
  question?: string;
  options?: string[];
  platform?: string;
  account?: string;
  location?: string;
  categories?: string[];
  description?: string;
  actionButton?: { text: string };
  memberName?: string;
  points?: number;
  progress?: number;
  menuId?: string; // Link to a specific Menu
  
  // QR Code Specific
  qrErrorCorrection?: 'L' | 'M' | 'Q' | 'H';
  qrForegroundColor?: string;
  trackScan?: boolean;
  measurementCampaignId?: string; // Server-authored campaign binding; never visitor-provided attribution.
  qrSource?: 'custom' | 'calendar_event';
  calendarUrl?: string;

  // Form Specific
  fields?: Array<{
    id: string;
    type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'checkbox' | 'select';
    label: string;
    placeholder?: string;
    required?: boolean;
    options?: string[]; // For select type
  }>;
  submitUrl?: string; // Optional webhook URL override
  successMessage?: string;

  // Button Actions (Legacy - prefer interactions[])
  actionType?: 'link' | 'navigate' | 'trigger' | 'none';
  actionValue?: string; // URL, Slide ID, or Trigger Name
}

export interface LayoutTileProperties extends CommonTileStyleProperties {
  backgroundColor?: string;
  backgroundImageUrl?: string;
  orientation?: 'horizontal' | 'vertical';
  thickness?: number;
  rows?: number;
  columns?: number;
  direction?: 'row' | 'column';
  justifyContent?: string;
  alignItems?: string;
  tabs?: string[];
  items?: string[];
  autoPlaySpeed?: number;
  shape?: 'circle' | 'square';
  fillColor?: string;
  frameStyle?: 'simple' | 'ornate' | 'modern' | 'shadow';
  color?: string; // For sticky_note background or divider color
  text?: string; // For sticky_note content
}

export interface SpecialTileProperties {
  format?: '12h' | '24h';
  showSeconds?: boolean;
  view?: 'month' | 'week' | 'day' | 'agenda';
  url?: string;
  calendarUrl?: string;
  backgroundFolderName?: string;
  maxItems?: number;
  quote?: string;
  author?: string;
  symbols?: string[];
  showChange?: boolean;
  imageUrl?: string;
  itemName?: string;
  price?: string;
  description?: string;
  discount?: string;
  subTitle?: string;
  title?: string;
  eventName?: string;
  targetDate?: string;
  address?: string;
  zoom?: number;
  mapType?: 'roadmap' | 'satellite';
  locationName?: string;
}

export type AllTileProperties = (
  | TextTileProperties 
  | DynamicTextProperties 
  | ScrollingTextProperties 
  | RichTextProperties 
  | MarqueeProperties 
  | TypewriterProperties 
  | WordArtProperties 
  | GradientTextProperties 
  | AnimatedTextProperties 
  | TextShadowTileProperties
  | ImageTileProperties
  | VideoTileProperties
  | WebcamTileProperties
  | SlideshowTileProperties
  | ChartProperties
  | PieChartProperties
  | GaugeProperties
  | SparklineProperties
  | TableTileProperties
  | KPICardProperties
  | ProgressBarProperties
  | HeatmapProperties
  | TimelineProperties
  | InteractiveTileProperties
  | LayoutTileProperties
  | SpecialTileProperties
) & CommonTileStyleProperties;


export interface TileInstance {
  id: string;
  type: TileType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  opacity: number;
  rotation: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  name?: string;
  properties: AllTileProperties;
}

// --- Sub-collection: menus/{menuId} ---
export interface Menu {
  id: string;
  orgId: string;
  name: string;
  sections: MenuSection[];
  schedule?: MenuSchedule[];
  locationIds?: string[]; // Array of specific location IDs
  locationGroupIds?: string[]; // Array of location group IDs
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MenuSchedule {
  id: string;
  name: string;
  startTime: string; // "HH:mm" 24h format
  endTime: string; // "HH:mm" 24h format
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, etc.
  timezone?: string;
  active: boolean;
}

export interface MenuSection {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: string;
  imageUrl?: string;
  calories?: string;
  isAvailable: boolean;
}

// --- Sub-collection: campaigns/{campaignId} ---
export interface Campaign {
  id: string;
  orgId: string;
  name: string;
  offerCode?: string;
  status: 'Active' | 'Scheduled' | 'Ended';
  radiusMiles?: number;
  startDate?: Timestamp;
  endDate?: Timestamp;
  triggers: CampaignTrigger[];
  rules: CampaignRule[];
  createdAt: Timestamp;
}

export interface CampaignTrigger {
  type: 'qr_scan' | 'location_entry' | 'time_based';
  params: Record<string, unknown>;
}

export interface CampaignRule {
  condition: string;
  action: string;
  params: Record<string, unknown>;
}

// --- Root Collection: templates/{templateId} ---
export interface Template {
  id: string;
  orgId?: string; // Optional: If present, template is scoped to this organization
  name: string;
  description: string;
  category: string;
  tags: string[];
  thumbnailUrl?: string;
  
  type: 'screen' | 'slide' | 'menu';
  content: Record<string, unknown>; // The actual JSON structure of the screen/slide/menu
  
  isPublic: boolean; // Only super admins can set this to true
  createdBy: string; // User ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Versioning
  version: number;
  changelog?: string[];
  
  // Soft delete
  isDeleted?: boolean;
}

// --- Root Collection: activities/{activityId} ---
export interface ActivityLog {
  id: string;
  orgId: string;
  userId: string;
  userDisplayName?: string;
  userPhotoURL?: string;
  action: 'create' | 'update' | 'delete' | 'publish' | 'deploy' | 'invite' | 'login';
  resourceType: 'screen' | 'menu' | 'slide' | 'location' | 'member' | 'campaign' | 'organization' | 'template';
  resourceId?: string;
  resourceName?: string;
  details?: string;
  createdAt: Timestamp;
}

// --- Root Collection: system_templates/{templateId} ---
export interface SystemTemplate {
  id: string;             // e.g., 'org_invite', 'designer_invite'
  name: string;           // Human-readable name
  type: 'email' | 'notification';
  subject?: string;       // Email subject line
  content: string;        // HTML/Text content
  variables: string[];    // e.g., ['orgName', 'inviteLink']
  updatedAt?: Timestamp;
}
