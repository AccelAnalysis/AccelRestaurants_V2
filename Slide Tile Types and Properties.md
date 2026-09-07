## Slide Tile Types and Properties

### Overview
AccelRestaurants supports 46+ tile types for creating dynamic digital signage content. Tiles are modular components that can be placed on slides, each with specific properties for customization. All tiles share common base properties while having type-specific configurations.

### Common Base Properties (All Tiles)
```typescript
interface BaseTileProperties {
  id: string;                    // Unique identifier
  type: TileType;               // Tile type enumeration
  position: { x: number; y: number };  // Top-left position in pixels
  size: { width: number; height: number }; // Dimensions in pixels
  opacity: number;               // 0.0 (transparent) to 1.0 (opaque)
  rotation: number;              // Rotation angle in degrees (0-360)
  zIndex: number;                // Layer order (0-100)
  visible: boolean;              // Toggle visibility
  locked: boolean;               // Prevent editing when true
  name?: string;                 // Optional display name for editor
}
```













# Comprehensive Tile Types Reference for AccelRestaurants

## Overview

This document provides a complete reference for all 60+ tile types available in the AccelRestaurants slide editor. Each tile type includes detailed properties, user configuration methods, implementation notes, and information on triggers and inputs. Tiles are organized by category for easy navigation.

All tiles inherit common base properties:
- `id`: Unique string identifier
- `position`: {x: number, y: number} in pixels
- `size`: {width: number, height: number} in pixels
- `opacity`: number (0.0-1.0)
- `rotation`: number (0-360 degrees)
- `zIndex`: number (0-100 for layering)
- `visible`: boolean
- `locked`: boolean (prevents editing)
- `name`: optional string for editor organization

## Text Tiles

### 1. Plain Text Tile
**Purpose**: Display static text content with basic formatting.

**Properties**:
- `text`: string (supports multi-line)
- `fontFamily`: 'Inter' | 'Arial' | 'Times New Roman' | custom
- `fontSize`: number (8-200px)
- `fontWeight`: 300 | 400 | 500 | 600 | 700
- `fontColor`: hex color string
- `textAlign`: 'left' | 'center' | 'right' | 'justify'
- `lineHeight`: number (0.8-3.0)
- `letterSpacing`: number (-10 to 20px)
- `textShadow`: {color: hex, blur: number, offsetX: number, offsetY: number}

**User Configuration**:
- Text input field in properties panel with multi-line support
- Font selector dropdown with Google Fonts integration
- Color picker for text and shadow
- Slider controls for size, spacing, and shadow parameters

**Implementation Notes**:
- Renders as HTML div with CSS styling
- Supports Unicode characters and emojis
- Text wrapping based on tile width
- Performance: Lightweight, no canvas rendering required

**Triggers and Inputs**:
- Static content, no user interaction
- Can be updated via Firestore real-time sync for dynamic content

### 2. Dynamic Text Tile
**Purpose**: Display text that updates from data sources or templates.

**Properties**:
- `textTemplate`: string with placeholders (e.g., "Current time: {{currentTime}}")
- `dataSource`: 'time' | 'weather' | 'menu' | 'firebase' | 'api'
- `updateInterval`: number (seconds, 0 for real-time)
- `fallbackText`: string (shown on error)
- `dateFormat`: string (for time/date placeholders)
- `timezone`: string (IANA timezone identifier)
- All Plain Text properties

**User Configuration**:
- Template editor with autocomplete for placeholders
- Data source selector with configuration options
- Interval slider for update frequency
- Preview panel showing current rendered text

**Implementation Notes**:
- Uses template engine (Handlebars.js) for placeholder replacement
- Firebase listeners for real-time data sources
- API calls with error handling and caching
- Background refresh to prevent UI blocking

**Triggers and Inputs**:
- Automatic updates based on interval or data source changes
- Placeholders: {{currentTime}}, {{currentDate}}, {{weather.temp}}, {{menu.item.price}}

### 3. Scrolling Text Tile
**Purpose**: Create animated scrolling text for announcements or tickers.

**Properties**:
- `text`: string (can be very long)
- `scrollSpeed`: number (10-500 pixels/second)
- `scrollDirection`: 'left' | 'right' | 'up' | 'down'
- `loop`: boolean
- `pauseOnHover`: boolean
- `bounce`: boolean (reverse direction at edges)
- All Plain Text styling properties

**User Configuration**:
- Text input with length validation
- Speed slider with visual preview
- Direction buttons with icons
- Toggle switches for loop, pause, and bounce

**Implementation Notes**:
- CSS animations or JavaScript requestAnimationFrame
- Text duplication for seamless looping
- Performance optimization: pauses when off-screen
- Accessibility: respects reduced motion preferences

**Triggers and Inputs**:
- Animation starts automatically on slide load
- Mouse hover pauses if enabled
- No user interaction beyond configuration

### 4. Rich Text Tile
**Purpose**: Display formatted text with HTML-like capabilities.

**Properties**:
- `htmlContent`: string (sanitized HTML)
- `allowedTags`: string[] (whitelist for security)
- `cssOverrides`: object (additional styles)
- `linkBehavior`: 'none' | 'open' | 'campaign'
- All Plain Text properties

**User Configuration**:
- Rich text editor (Quill.js or similar)
- Toolbar for bold, italic, underline, lists, links
- HTML source view for advanced users
- Link configuration for campaign integration

**Implementation Notes**:
- DOMPurify for HTML sanitization
- Inline CSS support with scoped styles
- Link handling for QR code generation or campaign triggers
- Responsive text scaling

**Triggers and Inputs**:
- Clickable links can trigger campaigns or external URLs
- Content can be updated via API for dynamic rich text

### 5. Marquee Tile
**Purpose**: Classic marquee-style scrolling text.

**Properties**:
- `text`: string
- `speed`: number (slow/medium/fast or pixels/second)
- `behavior`: 'scroll' | 'slide' | 'alternate'
- `direction`: 'left' | 'right' | 'up' | 'down'
- `loop`: number (-1 for infinite, or count)
- All Plain Text properties

**User Configuration**:
- Simple text input
- Preset speed buttons
- Direction selector
- Loop count input

**Implementation Notes**:
- HTML <marquee> fallback with CSS animation polyfill
- Seamless looping via text duplication
- Performance: GPU-accelerated animations

**Triggers and Inputs**:
- Automatic on load
- No interaction

### 6. Typewriter Tile
**Purpose**: Animated text that types out character by character.

**Properties**:
- `text`: string
- `typeSpeed`: number (characters/second)
- `startDelay`: number (milliseconds)
- `cursorChar`: string ('|' or '_')
- `loop`: boolean
- `showCursor`: boolean
- All Plain Text properties

**User Configuration**:
- Text input
- Speed slider
- Delay input
- Cursor character selector

**Implementation Notes**:
- JavaScript animation with setTimeout
- Cursor blinking animation
- Respects user prefers-reduced-motion

**Triggers and Inputs**:
- Starts automatically with optional delay
- Can restart on slide change

### 7. Word Art Tile
**Purpose**: Decorative text with effects like gradients and shadows.

**Properties**:
- `text`: string
- `effect`: 'gradient' | 'shadow' | 'outline' | '3d' | 'glow'
- `gradientColors`: string[] (for gradient effect)
- `shadowDepth`: number (for 3D effect)
- `glowColor`: hex string
- All Plain Text properties

**User Configuration**:
- Effect selector with previews
- Color pickers for effects
- Intensity sliders

**Implementation Notes**:
- CSS filters and gradients
- WebGL for complex 3D effects
- Fallback to basic styling

**Triggers and Inputs**:
- Static decorative element

### 8. Gradient Text Tile
**Purpose**: Text with color gradients.

**Properties**:
- `text`: string
- `gradientType`: 'linear' | 'radial' | 'conic'
- `gradientColors`: {position: number, color: hex}[]
- `gradientAngle`: number (degrees for linear)
- All Plain Text properties

**User Configuration**:
- Color stops editor with position sliders
- Gradient type selector
- Angle control for linear gradients

**Implementation Notes**:
- CSS background-clip: text
- Fallback for older browsers

**Triggers and Inputs**:
- Static

### 9. Animated Text Tile
**Purpose**: Text with entrance/exit animations.

**Properties**:
- `text`: string
- `animationType`: 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce'
- `animationDuration`: number (milliseconds)
- `animationDelay`: number
- `loop`: boolean
- All Plain Text properties

**User Configuration**:
- Animation preset selector
- Duration and delay sliders
- Preview button

**Implementation Notes**:
- CSS animations with keyframes
- JavaScript for complex sequences

**Triggers and Inputs**:
- Animates on slide load or trigger

### 10. Text Shadow Tile
**Purpose**: Text with multiple shadow effects.

**Properties**:
- `text`: string
- `shadows`: Array<{color: hex, blur: number, offsetX: number, offsetY: number}>
- `multipleShadows`: boolean
- All Plain Text properties

**User Configuration**:
- Shadow layer editor
- Add/remove shadow buttons
- Individual controls per shadow

**Implementation Notes**:
- CSS text-shadow with multiple values
- Performance: Limited to 3-4 shadows for rendering speed

**Triggers and Inputs**:
- Static

## Media Tiles

### 11. Image Tile
**Purpose**: Display static images with effects.

**Properties**:
- `imageUrl`: string (Firebase Storage URL)
- `altText`: string
- `fitMode`: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none'
- `crop`: {x: number, y: number, width: number, height: number} (0-1 normalized)
- `filters`: {brightness: number, contrast: number, saturation: number, hue: number, blur: number}
- `borderRadius`: number (0-50px)
- `lazyLoad`: boolean

**User Configuration**:
- File upload or URL input
- Crop tool with drag handles
- Filter sliders with real-time preview
- Fit mode selector

**Implementation Notes**:
- HTML img tag with CSS styling
- Firebase Storage integration
- Lazy loading with Intersection Observer
- Image optimization via Cloud Functions

**Triggers and Inputs**:
- Static display
- Can be updated via Firestore for dynamic images

### 12. Video Tile
**Purpose**: Play video content.

**Properties**:
- `videoUrl`: string
- `autoplay`: boolean
- `loop`: boolean
- `muted`: boolean
- `controls`: boolean
- `posterImage`: string
- `startTime`: number (seconds)
- `endTime`: number (seconds, 0 for full)
- `volume`: number (0.0-1.0)

**User Configuration**:
- File upload or URL input
- Toggle switches for autoplay, loop, etc.
- Time range selector
- Volume slider

**Implementation Notes**:
- HTML5 video element
- Preloading strategies
- Error handling for unsupported formats
- Mobile considerations (autoplay restrictions)

**Triggers and Inputs**:
- Autoplay on slide load
- User controls if enabled
- Can be triggered by campaign events

### 13. GIF Tile
**Purpose**: Display animated GIFs.

**Properties**:
- `gifUrl`: string
- `playbackSpeed`: number (0.1-3.0)
- `loop`: boolean
- `fitMode`: same as Image Tile
- `filters`: same as Image Tile

**User Configuration**:
- File upload
- Speed control
- Loop toggle
- Filters

**Implementation Notes**:
- HTML img tag (browsers handle GIF animation)
- Speed control via CSS animation-delay
- Performance: Large GIFs may impact rendering

**Triggers and Inputs**:
- Plays automatically
- Can be paused/resumed via triggers

### 14. Lottie Animation Tile
**Purpose**: Vector-based animations.

**Properties**:
- `lottieUrl`: string (JSON file)
- `autoplay`: boolean
- `loop`: boolean
- `speed`: number (0.1-3.0)
- `backgroundColor`: hex or 'transparent'
- `renderer`: 'svg' | 'canvas' | 'html'

**User Configuration**:
- File upload (JSON)
- Animation controls
- Background color picker

**Implementation Notes**:
- lottie-web library
- Multiple renderers for compatibility
- Lightweight vector graphics

**Triggers and Inputs**:
- Plays on load
- Can be controlled via JavaScript API

### 15. Audio Tile
**Purpose**: Play background audio.

**Properties**:
- `audioUrl`: string
- `autoplay`: boolean
- `loop`: boolean
- `volume`: number (0.0-1.0)
- `showControls`: boolean
- `startTime`: number
- `endTime`: number

**User Configuration**:
- File upload
- Audio controls in properties panel
- Volume slider

**Implementation Notes**:
- HTML5 audio element
- Hidden by default unless controls shown
- Cross-browser audio support

**Triggers and Inputs**:
- Autoplay (with browser restrictions)
- Campaign triggers can start/stop audio

### 16. Slideshow Tile
**Purpose**: Display multiple images in sequence.

**Properties**:
- `images`: Array<{url: string, duration: number, transition: string}>
- `transitionType`: 'fade' | 'slide' | 'zoom' | 'none'
- `transitionDuration`: number (milliseconds)
- `loop`: boolean
- `randomOrder`: boolean
- All Image Tile properties

**User Configuration**:
- Image upload with multiple selection
- Duration per image
- Transition selector

**Implementation Notes**:
- Preloads next image
- CSS transitions for performance
- Memory management for large slideshows

**Triggers and Inputs**:
- Automatic progression
- Can be controlled by external triggers

### 17. Webcam Tile
**Purpose**: Display live webcam feed.

**Properties**:
- `deviceId`: string (camera selection)
- `resolution`: 'low' | 'medium' | 'high'
- `filter`: same as Image Tile
- `borderRadius`: number

**User Configuration**:
- Camera selector dropdown
- Resolution selector
- Permission handling

**Implementation Notes**:
- getUserMedia API
- Fallback for unsupported browsers
- Privacy considerations

**Triggers and Inputs**:
- Automatic on load (with permission)
- Can be toggled via triggers

### 18. YouTube Tile
**Purpose**: Embed YouTube videos.

**Properties**:
- `videoId`: string
- `autoplay`: boolean
- `controls`: boolean
- `start`: number
- `end`: number

**User Configuration**:
- URL input with validation
- YouTube embed options

**Implementation Notes**:
- YouTube iframe API
- Privacy-enhanced mode
- Mobile optimization

**Triggers and Inputs**:
- YouTube player controls
- External triggers can control playback

### 19. Vimeo Tile
**Purpose**: Embed Vimeo videos.

**Properties**:
- Similar to YouTube Tile
- `videoId`: string

**User Configuration**:
- URL parsing
- Embed options

**Implementation Notes**:
- Vimeo player API
- Similar to YouTube implementation

**Triggers and Inputs**:
- Player controls

### 20. Background Video Tile
**Purpose**: Video as background with overlay content.

**Properties**:
- All Video Tile properties
- `overlayOpacity`: number
- `blur`: number (background blur)

**User Configuration**:
- Video settings
- Overlay controls

**Implementation Notes**:
- Positioned behind other tiles
- Performance considerations for continuous playback

**Triggers and Inputs**:
- Autoplay background

## Data Visualization Tiles

### 21. Bar Chart Tile
**Purpose**: Display categorical data as bars.

**Properties**:
- `data`: Array<{label: string, value: number, color?: hex}>
- `orientation`: 'vertical' | 'horizontal'
- `showValues`: boolean
- `showLabels`: boolean
- `maxBars`: number
- `colorScheme`: string
- `animation`: 'none' | 'grow' | 'slide'

**User Configuration**:
- Data table editor
- CSV import
- Chart options

**Implementation Notes**:
- Recharts library
- Responsive scaling
- Real-time data updates

**Triggers and Inputs**:
- Data updates via Firestore/API

### 22. Line Chart Tile
**Purpose**: Time series or trend data.

**Properties**:
- `data`: Array<{x: number|string, y: number}>
- `lineColor`: hex
- `lineWidth`: number
- `showPoints`: boolean
- `pointSize`: number
- `fillArea`: boolean
- `gradient`: boolean

**User Configuration**:
- Data input
- Styling options

**Implementation Notes**:
- SVG-based rendering
- Smooth curves

**Triggers and Inputs**:
- Real-time data streams

### 23. Pie Chart Tile
**Purpose**: Proportional data.

**Properties**:
- `data`: Array<{label: string, value: number, color?: hex}>
- `innerRadius`: number (for donut)
- `showLabels`: boolean
- `labelPosition`: 'inside' | 'outside'
- `animation`: boolean

**User Configuration**:
- Data editor
- Label options

**Implementation Notes**:
- D3.js or Recharts
- Interactive tooltips

**Triggers and Inputs**:
- Data updates

### 24. Gauge Tile
**Purpose**: KPI indicators.

**Properties**:
- `value`: number
- `min`: number
- `max`: number
- `colorScheme`: 'green-red' | 'custom'
- `showValue`: boolean
- `segments`: number

**User Configuration**:
- Value input or data binding
- Range settings

**Implementation Notes**:
- Canvas or SVG rendering
- Color interpolation

**Triggers and Inputs**:
- Real-time value updates

### 25. Table Tile
**Purpose**: Tabular data display.

**Properties**:
- `data`: Array<Array<string|number>>
- `headers`: string[]
- `striped`: boolean
- `bordered`: boolean
- `fontSize`: number
- `maxRows`: number

**User Configuration**:
- Spreadsheet-like editor
- CSV import/export

**Implementation Notes**:
- Virtual scrolling for large datasets
- Sortable columns

**Triggers and Inputs**:
- Data refresh

### 26. KPI Card Tile
**Purpose**: Key performance indicator display.

**Properties**:
- `title`: string
- `value`: number|string
- `unit`: string
- `change`: number
- `changeType`: 'percentage' | 'absolute'
- `icon`: string (Lucide icon name)
- `color`: hex

**User Configuration**:
- Data binding
- Icon selector
- Formatting options

**Implementation Notes**:
- Card-based layout
- Trend indicators

**Triggers and Inputs**:
- Real-time KPI updates

### 27. Progress Bar Tile
**Purpose**: Show completion or progress.

**Properties**:
- `value`: number (0-100)
- `label`: string
- `color`: hex
- `animated`: boolean
- `striped`: boolean

**User Configuration**:
- Value input
- Styling options

**Implementation Notes**:
- CSS animations
- Bootstrap-style progress bars

**Triggers and Inputs**:
- Value updates

### 28. Heatmap Tile
**Purpose**: Data density visualization.

**Properties**:
- `data`: Array<{x: number, y: number, value: number}>
- `colorScale`: string[]
- `gridSize`: number

**User Configuration**:
- Data matrix input
- Color scale editor

**Implementation Notes**:
- Canvas rendering
- Color interpolation

**Triggers and Inputs**:
- Data updates

### 29. Sparklines Tile
**Purpose**: Miniature line charts.

**Properties**:
- `data`: number[]
- `color`: hex
- `width`: number
- `height`: number

**User Configuration**:
- Data array input
- Styling

**Implementation Notes**:
- Lightweight SVG
- No axes or labels

**Triggers and Inputs**:
- Data streams

### 30. Timeline Tile
**Purpose**: Event timeline display.

**Properties**:
- `events`: Array<{date: Date, title: string, description: string}>
- `orientation`: 'vertical' | 'horizontal'
- `showDates`: boolean

**User Configuration**:
- Event editor
- Layout options

**Implementation Notes**:
- Chronological sorting
- Responsive design

**Triggers and Inputs**:
- Event updates

## Interactive Tiles

### 31. Button Tile
**Purpose**: Call-to-action buttons.

**Properties**:
- `text`: string
- `action`: 'url' | 'campaign' | 'menu' | 'slide'
- `actionUrl`: string
- `backgroundColor`: hex
- `textColor`: hex
- `borderRadius`: number
- `hoverEffect`: 'none' | 'glow' | 'scale'

**User Configuration**:
- Text input
- Action selector
- Styling controls

**Implementation Notes**:
- HTML button element
- Touch-friendly sizing
- Accessibility compliant

**Triggers and Inputs**:
- Click/tap triggers action
- Can integrate with campaigns

### 32. QR Code Tile
**Purpose**: Generate and display QR codes.

**Properties**:
- `content`: string
- `size`: number (pixels)
- `errorCorrection`: 'L' | 'M' | 'Q' | 'H'
- `foregroundColor`: hex
- `backgroundColor`: hex

**User Configuration**:
- Content input (URL, text, etc.)
- Size and color controls

**Implementation Notes**:
- QR code generation library (qrcode.js)
- Scalable vector graphics

**Triggers and Inputs**:
- Static QR code
- Content can be dynamic

### 33. Countdown Tile
**Purpose**: Event or promotion timers.

**Properties**:
- `targetDate`: Date
- `format`: 'DHMS' | 'HMS' | 'MS' | 'S'
- `expiredText`: string
- `fontSize`: number
- `color`: hex

**User Configuration**:
- Date/time picker
- Format selector

**Implementation Notes**:
- JavaScript Date calculations
- Real-time updates

**Triggers and Inputs**:
- Automatic countdown
- Can trigger actions when expired

### 34. Form Tile
**Purpose**: Collect user input.

**Properties**:
- `fields`: Array<FieldConfig>
- `submitAction`: 'email' | 'firestore' | 'api'
- `submitUrl`: string
- `successMessage`: string

**User Configuration**:
- Form builder with drag-and-drop fields
- Validation rules
- Submit actions

**Implementation Notes**:
- React Hook Form
- Validation with Yup
- Secure data handling

**Triggers and Inputs**:
- User fills form and submits

### 35. Poll Tile
**Purpose**: Interactive polling.

**Properties**:
- `question`: string
- `options`: string[]
- `multipleChoice`: boolean
- `showResults`: boolean
- `storeResponses`: boolean

**User Configuration**:
- Question and options editor
- Poll settings

**Implementation Notes**:
- Firestore for response storage
- Real-time result updates

**Triggers and Inputs**:
- User selects options
- Results displayed live

### 36. Social Feed Tile
**Purpose**: Display social media content.

**Properties**:
- `platform`: 'twitter' | 'instagram' | 'facebook'
- `account`: string
- `postCount`: number
- `refreshInterval`: number

**User Configuration**:
- Platform and account selection
- API key configuration
- Display options

**Implementation Notes**:
- Platform APIs integration
- Caching for performance
- Privacy compliance

**Triggers and Inputs**:
- Automatic feed refresh
- API data updates

### 37. Weather Widget Tile
**Purpose**: Display weather information.

**Properties**:
- `location`: string
- `units`: 'metric' | 'imperial'
- `showForecast`: boolean
- `forecastDays`: number

**User Configuration**:
- Location input with autocomplete
- Display preferences

**Implementation Notes**:
- Weather API integration
- Geolocation support
- Icon sets

**Triggers and Inputs**:
- Location-based updates
- Real-time weather data

### 38. Menu Selector Tile
**Purpose**: Interactive menu browsing.

**Properties**:
- `menuId`: string
- `showPrices`: boolean
- `showImages`: boolean
- `categories`: string[]

**User Configuration**:
- Menu selection
- Display options

**Implementation Notes**:
- Firestore menu data
- Search and filter capabilities

**Triggers and Inputs**:
- User browses menu
- Can trigger orders or campaigns

### 39. Promotion Banner Tile
**Purpose**: Highlight special offers.

**Properties**:
- `title`: string
- `description`: string
- `imageUrl`: string
- `actionButton`: ButtonConfig
- `backgroundColor`: hex

**User Configuration**:
- Content editor
- Image upload
- Button configuration

**Implementation Notes**:
- Eye-catching design
- Campaign integration

**Triggers and Inputs**:
- Button click triggers action

### 40. Loyalty Card Tile
**Purpose**: Display customer loyalty status.

**Properties**:
- `points`: number
- `level`: string
- `nextReward`: string
- `progress`: number (0-1)

**User Configuration**:
- Data binding to user system
- Styling

**Implementation Notes**:
- Progress bars and badges
- Personalization

**Triggers and Inputs**:
- User data updates

## Layout Tiles

### 41. Container Tile
**Purpose**: Group and organize other tiles.

**Properties**:
- `backgroundColor`: hex
- `borderColor`: hex
- `borderWidth`: number
- `borderRadius`: number
- `padding`: number
- `children`: TileInstance[]

**User Configuration**:
- Background and border styling
- Child tile management

**Implementation Notes**:
- Acts as parent container
- CSS flexbox layout
- Nested tile support

**Triggers and Inputs**:
- Contains interactive children

### 42. Divider Tile
**Purpose**: Visual separation.

**Properties**:
- `orientation`: 'horizontal' | 'vertical'
- `thickness`: number
- `color`: hex
- `style`: 'solid' | 'dashed' | 'dotted'

**User Configuration**:
- Orientation toggle
- Style options

**Implementation Notes**:
- CSS borders
- Flexible positioning

**Triggers and Inputs**:
- Static

### 43. Grid Tile
**Purpose**: Arrange tiles in a grid layout.

**Properties**:
- `rows`: number
- `columns`: number
- `gap`: number
- `children`: TileInstance[]

**User Configuration**:
- Grid dimensions
- Gap control

**Implementation Notes**:
- CSS Grid
- Responsive behavior

**Triggers and Inputs**:
- Layout container

### 44. Flex Layout Tile
**Purpose**: Flexible box layout container.

**Properties**:
- `direction`: 'row' | 'column'
- `justifyContent`: 'start' | 'center' | 'end' | 'space-between'
- `alignItems`: 'start' | 'center' | 'end'
- `children`: TileInstance[]

**User Configuration**:
- Flex properties
- Child arrangement

**Implementation Notes**:
- CSS Flexbox
- Advanced layout control

**Triggers and Inputs**:
- Container behavior

### 45. Tabs Tile
**Purpose**: Tabbed content organization.

**Properties**:
- `tabs`: Array<{title: string, content: TileInstance[]}>
- `activeTab`: number
- `tabStyle`: 'default' | 'pills' | 'underline'

**User Configuration**:
- Tab creation and editing
- Content assignment

**Implementation Notes**:
- State management for active tab
- Lazy loading content

**Triggers and Inputs**:
- Tab switching by user

### 46. Accordion Tile
**Purpose**: Collapsible content sections.

**Properties**:
- `sections`: Array<{title: string, content: TileInstance[], expanded: boolean}>
- `multiple`: boolean (allow multiple open)

**User Configuration**:
- Section management
- Expansion settings

**Implementation Notes**:
- Smooth animations
- Accessibility features

**Triggers and Inputs**:
- Click to expand/collapse

### 47. Carousel Tile
**Purpose**: Rotating content display.

**Properties**:
- `slides`: TileInstance[]
- `autoplay`: boolean
- `interval`: number
- `showIndicators`: boolean
- `showArrows`: boolean

**User Configuration**:
- Slide management
- Timing controls

**Implementation Notes**:
- Swipe gestures on mobile
- Keyboard navigation

**Triggers and Inputs**:
- Auto-rotation or manual navigation

### 48. Sticky Note Tile
**Purpose**: Note-like appearance.

**Properties**:
- `text`: string
- `color`: hex
- `rotation`: number (random tilt)
- `shadow`: boolean

**User Configuration**:
- Text and color selection

**Implementation Notes**:
- CSS transforms for tilt
- Hand-drawn appearance

**Triggers and Inputs**:
- Static note display

### 49. Shape Tile
**Purpose**: Decorative geometric shapes.

**Properties**:
- `shape`: 'circle' | 'square' | 'triangle' | 'star' | 'hexagon'
- `fillColor`: hex
- `strokeColor`: hex
- `strokeWidth`: number

**User Configuration**:
- Shape selector
- Color controls

**Implementation Notes**:
- SVG or CSS shapes
- Scalable vector graphics

**Triggers and Inputs**:
- Static decoration

### 50. Frame Tile
**Purpose**: Border/frame around content.

**Properties**:
- `frameStyle`: 'simple' | 'ornate' | 'photo'
- `frameColor`: hex
- `frameWidth`: number
- `innerContent`: TileInstance

**User Configuration**:
- Style selection
- Customization options

**Implementation Notes**:
- CSS borders with creative styling
- Content clipping

**Triggers and Inputs**:
- Frames content

## Special/Integration Tiles

### 51. Clock Tile
**Purpose**: Display current time.

**Properties**:
- `format`: '12h' | '24h'
- `showSeconds`: boolean
- `timezone`: string
- `fontSize`: number

**User Configuration**:
- Time format options
- Timezone selection

**Implementation Notes**:
- Real-time JavaScript updates
- Accurate timekeeping

**Triggers and Inputs**:
- Automatic time updates

### 52. Calendar Tile
**Purpose**: Show calendar view.

**Properties**:
- `view`: 'month' | 'week' | 'day'
- `highlightDates`: Date[]
- `events`: CalendarEvent[]

**User Configuration**:
- Date range selection
- Event management

**Implementation Notes**:
- Date picker integration
- Event display

**Triggers and Inputs**:
- Date navigation

### 53. RSS Feed Tile
**Purpose**: Display RSS feed content.

**Properties**:
- `feedUrl`: string
- `maxItems`: number
- `showImages`: boolean
- `refreshInterval`: number

**User Configuration**:
- URL input
- Display settings

**Implementation Notes**:
- RSS parsing
- Caching
- Error handling

**Triggers and Inputs**:
- Feed updates

### 54. Social Proof Tile
**Purpose**: Show testimonials or reviews.

**Properties**:
- `testimonials`: Array<{text: string, author: string, rating: number}>
- `displayType`: 'carousel' | 'grid' | 'single'
- `autoRotate`: boolean

**User Configuration**:
- Testimonial editor
- Display options

**Implementation Notes**:
- Star ratings
- Attribution

**Triggers and Inputs**:
- Auto-rotation

### 55. Testimonial Tile
**Purpose**: Individual testimonial display.

**Properties**:
- `quote`: string
- `author`: string
- `title`: string
- `imageUrl`: string
- `rating`: number

**User Configuration**:
- Content input
- Image upload

**Implementation Notes**:
- Quote styling
- Photo integration

**Triggers and Inputs**:
- Static or rotating

### 56. Weather Tile
**Purpose**: Current weather display.

**Properties**:
- `location`: string
- `showForecast`: boolean
- `units`: 'metric' | 'imperial'

**User Configuration**:
- Location setup

**Implementation Notes**:
- Weather API
- Icon display

**Triggers and Inputs**:
- Weather updates

### 57. Stock Ticker Tile
**Purpose**: Stock price display.

**Properties**:
- `symbols`: string[]
- `showChange`: boolean
- `refreshInterval`: number

**User Configuration**:
- Symbol input
- Display preferences

**Implementation Notes**:
- Financial API integration
- Real-time updates

**Triggers and Inputs**:
- Price changes

### 58. Menu Item Tile
**Purpose**: Individual menu item display.

**Properties**:
- `item`: MenuItem
- `showPrice`: boolean
- `showImage`: boolean
- `showDescription`: boolean

**User Configuration**:
- Menu item selection
- Display options

**Implementation Notes**:
- Menu data integration
- Availability indicators

**Triggers and Inputs**:
- Static display

### 59. Special Offer Tile
**Purpose**: Highlight promotions.

**Properties**:
- `title`: string
- `description`: string
- `discount`: string
- `validUntil`: Date

**User Configuration**:
- Offer details
- Timing

**Implementation Notes**:
- Expiry handling
- Campaign links

**Triggers and Inputs**:
- Time-based display

### 60. Event Countdown Tile
**Purpose**: Event countdown display.

**Properties**:
- `eventName`: string
- `eventDate`: Date
- `showDays`: boolean
- `showHours`: boolean

**User Configuration**:
- Event setup

**Implementation Notes**:
- Countdown calculation
- Formatting

**Triggers and Inputs**:
- Time updates


### Drag and Drop System

#### Implementation
- **Library**: React DnD with HTML5 backend
- **Drag Sources**: Each tile in the canvas is a drag source
- **Drop Targets**: Canvas accepts tile drops, container tiles accept child drops
- **Drag Preview**: Semi-transparent clone with real-time position feedback
- **Snap-to-Grid**: 8px grid snapping with visual guides
- **Multi-Selection**: Ctrl/Cmd+click for multiple tiles, drag as group

#### Drag Behavior
- **Initiation**: Mouse down + 5px movement or touch start + gesture
- **Feedback**: Cursor changes, tile opacity reduces to 0.7 during drag
- **Constraints**: Tiles cannot be dragged outside canvas bounds
- **Collision Detection**: Prevents overlapping when snap-to-grid enabled
- **Undo/Redo**: Full drag operations recorded in history stack

### Resizing System

#### Resize Handles
- **Position**: 8 corner and edge handles (4 corners, 4 edges)
- **Appearance**: 8px circular handles, orange (#EA580C) with hover scaling
- **Activation**: Visible on tile selection, hover shows all handles

#### Resize Behavior
- **Aspect Ratio**: Shift+drag maintains aspect ratio
- **Minimum Size**: 20x20px minimum dimensions
- **Maximum Size**: Canvas dimensions maximum
- **Proportional Scaling**: Content scales with tile size where applicable
- **Live Preview**: Real-time visual feedback during resize

#### Advanced Features
- **Smart Guides**: Alignment lines to other tiles and canvas edges
- **Size Presets**: Common sizes (thumbnail, card, banner) via right-click menu
- **Responsive**: Tiles adapt to different screen orientations

### Opacity Controls

#### Implementation
- **Property**: 0.0 (fully transparent) to 1.0 (fully opaque)
- **Control**: Slider in properties panel with 0.1 increments
- **Visual Feedback**: Tile preview shows opacity in real-time
- **Rendering**: Applied at WebGL level for performance
- **Inheritance**: Container tiles can set base opacity for children

#### Use Cases
- **Layering**: Create depth with overlapping semi-transparent tiles
- **Transitions**: Fade effects for dynamic content
- **Atmosphere Integration**: Tiles can blend with atmosphere layer
- **Accessibility**: Ensure sufficient contrast ratios

### Typography and Fonts

#### Font System
- **Primary Font**: Inter (Google Fonts) - Clean, readable sans-serif
- **Weights Available**: 300 (Light), 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- **Fallback**: system-ui, -apple-system, sans-serif
- **Loading**: Preloaded via Google Fonts API

#### Font Properties
- **Size Range**: 8px to 200px
- **Line Height**: Automatic (1.2-1.6) or manual override
- **Letter Spacing**: -10px to 20px
- **Text Transform**: none | uppercase | lowercase | capitalize
- **Text Decoration**: none | underline | line-through

#### Advanced Typography
- **Google Fonts Integration**: Additional fonts can be loaded dynamically
- **Web Font Optimization**: Font-display: swap for performance
- **Subsetting**: Latin character set for faster loading
- **Variable Fonts**: Support for weight interpolation (future enhancement)

This comprehensive tile system enables rich, interactive digital signage content creation with professional design controls and real-time editing capabilities. The modular architecture supports easy extension with new tile types while maintaining consistent behavior across all components.