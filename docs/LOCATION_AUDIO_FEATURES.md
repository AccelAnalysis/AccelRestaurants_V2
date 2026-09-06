# Location-Based Audio Management

## Overview

This feature enables synchronized audio playback across all screens within a specific location, with advanced scheduling capabilities and granular control over which screens participate in the audio playback.

## Features

### 1. Location Management UI

**Navigation**: Main sidebar → Locations (between Screens and Designer Market)

**Location List View** (`/admin/locations`)
- Grid view of all locations
- Audio status badges (Playing/Configured)
- Location groups support
- Search and filter capabilities
- Click to view location details

**Location Detail View** (`/admin/locations/:locationId`)
- **Overview Tab**: Edit location details (name, address, timezone)
- **Screens Tab**: View all screens at location with audio exclusion toggles
- **Audio Tab**: Control audio playback and manage schedules

### 2. Synchronized Audio Playback

**Features:**
- Real-time audio synchronization across all screens at a location
- Volume control (0-100%)
- Loop playback option
- Screen exclusion list (toggle per screen)
- Manual play/stop controls

**How It Works:**
1. Admin uploads audio file to Media Assets
2. Navigate to Location → Audio tab
3. Select audio file, set volume and loop options
4. Click "Play Audio" to start synchronized playback
5. All screens at the location (except excluded ones) play audio in sync

**Technical Implementation:**
- Uses Firestore `location_audio_sync` collection for real-time state
- Client-side timing with `performance.now()` for precise synchronization
- Audio persists across slide transitions on PlayerScreen

### 3. Audio Scheduling

**Schedule Configuration:**
- Start time (required)
- End time (optional - leave empty for continuous playback)
- Days of week selection
- Enable/disable toggle per schedule
- Multiple schedules per location

**Schedule Examples:**
- **Weekday mornings**: Mon-Fri, 9:00 AM - 12:00 PM
- **Weekend all-day**: Sat-Sun, 8:00 AM (no end time)
- **Lunch rush**: Mon-Fri, 11:30 AM - 1:30 PM

**Automatic Playback:**
- Background scheduler checks every minute
- Automatically starts audio when schedule becomes active
- Automatically stops audio when schedule ends
- Respects timezone settings per location

### 4. Screen Editor Enhancements

**Slide Click Navigation:**
- Click on slide thumbnail or name in playlist
- Confirmation modal warns about unsaved changes
- Direct navigation to Slide Editor

**Benefits:**
- Faster workflow for editing slides
- No need to navigate through Slides list
- Context-aware editing

### 5. Permissions & Access Control

**Permission Levels:**
- **Org Owner/Admin**: Full access to all features
- **Regular Users**: View-only access to locations

**Protected Actions:**
- Edit location details
- Control audio playback
- Manage schedules
- Edit screens

## API Reference

### Audio Service

```typescript
// Start audio playback
await AudioService.startLocationAudio(
  locationId: string,
  assetId: string,
  volume: number,
  loop: boolean,
  excludedScreenIds: string[]
);

// Stop audio playback
await AudioService.stopLocationAudio(locationId: string);

// Update volume
await AudioService.updateLocationVolume(locationId: string, volume: number);

// Update exclusions
await AudioService.updateAudioExclusions(locationId: string, excludedScreenIds: string[]);

// Subscribe to real-time updates
const unsubscribe = AudioService.subscribeToLocationAudio(
  locationId: string,
  callback: (sync: LocationAudioSync | null) => void
);
```

### Schedule Management

```typescript
// Save schedule
await AudioService.saveAudioSchedule(
  orgId: string,
  locationId: string,
  schedule: Omit<AudioSchedule, 'id'>
);

// Update schedule
await AudioService.updateAudioSchedule(
  orgId: string,
  locationId: string,
  scheduleId: string,
  updates: Partial<Omit<AudioSchedule, 'id'>>
);

// Delete schedule
await AudioService.deleteAudioSchedule(
  orgId: string,
  locationId: string,
  scheduleId: string
);
```

## Schema

### Location (Extended)

```typescript
interface Location {
  id: string;
  orgId: string;
  name: string;
  groupId?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  timezone: string;
  audioConfig?: {
    assetId?: string;
    isPlaying: boolean;
    volume: number;
    loop: boolean;
    excludedScreenIds: string[];
    schedule?: AudioSchedule[];
  };
  createdAt: Timestamp;
}
```

### AudioSchedule

```typescript
interface AudioSchedule {
  id: string;
  startTime: string; // HH:mm format
  endTime?: string;  // Optional end time
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  enabled: boolean;
}
```

### LocationAudioSync (Root Collection)

```typescript
interface LocationAudioSync {
  id: string; // Same as locationId
  orgId: string;
  locationId: string;
  assetId: string;
  syncToken: string;
  scheduledStartTime: Timestamp;
  isPlaying: boolean;
  volume: number;
  loop: boolean;
  excludedScreenIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Cloud Functions

### startLocationAudio

**Trigger**: HTTPS Callable  
**Auth**: Required (orgAdmin or locationAdmin)  
**Purpose**: Initialize synchronized audio playback

**Parameters:**
```typescript
{
  locationId: string;
  assetId: string;
  volume: number;
  loop: boolean;
  excludedScreenIds: string[];
  scheduledStartTime?: number; // Unix timestamp
}
```

### stopLocationAudio

**Trigger**: HTTPS Callable  
**Auth**: Required (orgAdmin or locationAdmin)  
**Purpose**: Stop audio playback across location

**Parameters:**
```typescript
{
  locationId: string;
}
```

## Usage Guide

### Setting Up Location Audio

1. **Navigate to Locations**
   - Click "Locations" in main sidebar
   - Select your location

2. **Configure Audio**
   - Go to "Audio" tab
   - Select audio file from dropdown
   - Adjust volume slider (0-100%)
   - Toggle "Loop audio continuously" if desired

3. **Exclude Screens (Optional)**
   - Go to "Screens" tab
   - Toggle off "Include in Location Audio" for specific screens

4. **Start Playback**
   - Return to "Audio" tab
   - Click "Play Audio"
   - Audio begins playing on all included screens

### Creating a Schedule

1. **Open Schedule Modal**
   - Navigate to Location → Audio tab
   - Click "Add Schedule"

2. **Configure Schedule**
   - Set start time (required)
   - Set end time (optional)
   - Select days of week
   - Enable the schedule

3. **Save**
   - Click "Save Schedule"
   - Schedule will automatically activate at specified times

### Editing Slides from Screen View

1. **Open Screen Editor**
   - Navigate to Screens
   - Click on a screen

2. **Click Slide**
   - Click on slide thumbnail or name in playlist
   - Confirm navigation in modal
   - Slide Editor opens for that slide

## Troubleshooting

### Audio Not Playing

**Check:**
- Audio file is selected in Location → Audio tab
- "Play Audio" button was clicked
- Screen is not in exclusion list
- Screen is online (green "Live" indicator)
- Browser allows autoplay (may require user interaction first)

### Schedule Not Activating

**Check:**
- Schedule is enabled (green badge)
- Current time falls within schedule window
- Days of week include today
- Location timezone is correct
- Audio file is selected in audioConfig

### Permissions Issues

**Check:**
- User is org owner or admin
- User is logged in
- Organization is active

## Best Practices

1. **Audio Files**: Use compressed formats (MP3) for faster loading
2. **Volume**: Start at 50% and adjust based on environment
3. **Schedules**: Use end times to prevent audio running overnight
4. **Exclusions**: Exclude screens in quiet zones (offices, meeting rooms)
5. **Testing**: Test schedules before deploying to production

## Future Enhancements

- [ ] Audio fade in/out transitions
- [ ] Multiple audio tracks with crossfade
- [ ] Audio analytics (play duration, skip events)
- [ ] Location-specific user roles (locationAdmin, locationUser)
- [ ] Audio playlist support
- [ ] Volume zones within locations
