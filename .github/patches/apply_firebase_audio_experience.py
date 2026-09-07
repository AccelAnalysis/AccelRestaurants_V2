from pathlib import Path
import re

ROOT = Path('.')

def read(path): return (ROOT / path).read_text()
def write(path, text): (ROOT / path).write_text(text)
def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)
def regex_once(text, pattern, replacement, label, flags=re.S):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 regex match, found {count}')
    return updated

# --- Schema: Firebase/Firestore persisted audio experience ---
path = 'src/types/schema.ts'
text = read(path)
old = """// --- Audio Schedule for Location ---
export interface AudioSchedule {
  id: string;
  startTime: string; // HH:mm format
  endTime?: string;  // Optional end time
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  enabled: boolean;
}
"""
new = """// --- Audio / media scheduling and coordination ---
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
"""
text = replace_once(text, old, new, 'schema audio types')
text = regex_once(text, r"  audioConfig\?: \{\n    assetId\?: string;\n    isPlaying: boolean;\n    volume: number;\n    loop: boolean;\n    excludedScreenIds: string\[\];\n    schedule\?: AudioSchedule\[\];\n  \};", "  audioConfig?: LocationAudioConfig;", 'location audio config')
text = regex_once(text, r"export interface LocationAudioSync \{\n  id: string;\n  orgId: string;\n  locationId: string;\n  assetId: string;", "export interface LocationAudioSync {\n  id: string;\n  orgId: string;\n  locationId: string;\n  mediaUrl: string;\n  storagePath?: string;\n  assetId?: string; // legacy compatibility only", 'location sync media url')
text = replace_once(text, "  screenAdjustments?: ScreenAdjustments;\n  isActive: boolean;", "  screenAdjustments?: ScreenAdjustments;\n  audioConfig?: ScreenAudioConfig;\n  isActive: boolean;", 'screen audio config')
old_video = """export interface VideoTileProperties {
  url?: string;
  videoId?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  bounce?: boolean;
  reverse?: boolean;
}
"""
new_video = """export interface MediaAudioProperties {
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
"""
text = replace_once(text, old_video, new_video, 'tile audio properties')
write(path, text)

# --- Default tile properties ---
path = 'src/utils/editorGeometry.ts'
text = read(path)
text = replace_once(text,
"""    case 'text': return { content: 'New Text' };
    case 'image': case 'video': return { url: '' };
    case 'clock': return { format: '12h', showSeconds: true };
""",
"""    case 'text': return { content: 'New Text' };
    case 'image': return { url: '' };
    case 'video':
    case 'background_video': return {
      url: '', autoplay: true, loop: true, muted: true, controls: false,
      startTime: 0, volume: 100, priority: 50, duckBackground: true,
      oneShot: false, fadeInMs: 250, fadeOutMs: 250,
      scheduleEnabled: false, scheduleStart: '00:00', scheduleEnd: '23:59', scheduleDays: [0,1,2,3,4,5,6]
    };
    case 'audio': return {
      url: '', trackName: 'Audio', autoplay: true, loop: false, controls: true, showIndicator: true,
      startTime: 0, volume: 100, priority: 60, duckBackground: true,
      oneShot: false, fadeInMs: 250, fadeOutMs: 250,
      scheduleEnabled: false, scheduleStart: '00:00', scheduleEnd: '23:59', scheduleDays: [0,1,2,3,4,5,6]
    };
    case 'clock': return { format: '12h', showSeconds: true };
""", 'default media props')
write(path, text)

# --- Admin shell application output volume ---
path = 'src/components/organisms/AdminShell.tsx'
text = read(path)
text = replace_once(text, "import { AccessibleDialog } from '../atoms/AccessibleDialog';", "import { AccessibleDialog } from '../atoms/AccessibleDialog';\nimport { ApplicationVolumeControl } from '../atoms/ApplicationVolumeControl';", 'admin volume import')
text = replace_once(text, "<img src={logo} alt=\"\" className=\"h-7 w-auto\" /><span className=\"text-base sm:text-lg font-semibold text-primary\">AccelRestaurants</span>", "<img src={logo} alt=\"\" className=\"h-7 w-auto\" /><span className=\"text-base sm:text-lg font-semibold text-primary\">AccelRestaurants</span><ApplicationVolumeControl />", 'admin volume control')
write(path, text)

# --- Player: remove obsolete direct audio construction; mount persistent media plane ---
path = 'src/pages/PlayerScreen.tsx'
text = read(path)
text = text.replace("import { AudioService } from '../services/audioService';\n", '')
text = replace_once(text, "import { TileContent } from '../components/atoms/TileContent';", "import { TileContent } from '../components/atoms/TileContent';\nimport { GlobalMediaPlane } from '../components/atoms/GlobalMediaPlane';", 'player global plane import')
text = text.replace(', LocationAudioSync', '')
text = text.replace("  const audioRef = useRef<HTMLAudioElement | null>(null);\n  \n  // Audio state\n  const [audioSync, setAudioSync] = useState<LocationAudioSync | null>(null);\n", '')
text = regex_once(text, r"\n  // Subscribe to location audio sync and manage playback.*?\n  // Filter slides based on active menus \(Dayparting Logic\)", "\n\n  // Filter slides based on active menus (Dayparting Logic)", 'remove legacy player audio')
text = replace_once(text, """    >
      {activeSlides.map((slide, index) => {
""", """    >
      <GlobalMediaPlane screen={screen} location={location} />
      {activeSlides.map((slide, index) => {
""", 'mount global plane')
write(path, text)

# --- Screen editor: persist and expose screen audio experience ---
path = 'src/components/organisms/ScreenEditor.tsx'
text = read(path)
text = replace_once(text, "import type { AppScreen, Slide, Location, PlaylistEntry, ScreenAdjustments } from '../../types/schema';", "import type { AppScreen, Slide, Location, PlaylistEntry, ScreenAdjustments, ScreenAudioConfig, GlobalMediaTrack } from '../../types/schema';\nimport { coordinationModeLabel, normalizeScreenAudioConfig } from '../../lib/audioExperience';", 'screen editor audio imports')
text = replace_once(text, "  const [screenAdjustments, setScreenAdjustments] = useState<ScreenAdjustments>({ scale: 1.0, offsetX: 0, offsetY: 0 });", "  const [screenAdjustments, setScreenAdjustments] = useState<ScreenAdjustments>({ scale: 1.0, offsetX: 0, offsetY: 0 });\n  const [audioConfig, setAudioConfig] = useState<ScreenAudioConfig>(() => normalizeScreenAudioConfig());", 'screen audio state')
text = text.replace("            if (initialData.screenAdjustments) setScreenAdjustments(initialData.screenAdjustments);", "            if (initialData.screenAdjustments) setScreenAdjustments(initialData.screenAdjustments);\n            setAudioConfig(normalizeScreenAudioConfig(initialData.audioConfig));")
text = text.replace("              if (screen.screenAdjustments) setScreenAdjustments(screen.screenAdjustments);", "              if (screen.screenAdjustments) setScreenAdjustments(screen.screenAdjustments);\n              setAudioConfig(normalizeScreenAudioConfig(screen.audioConfig));")
text = replace_once(text, """        rotationSettings: {
          algorithm: 'loop' as const,
          transition,
          rotationMs
        },
        screenAdjustments
""", """        rotationSettings: {
          algorithm: 'loop' as const,
          transition,
          rotationMs
        },
        screenAdjustments,
        audioConfig
""", 'persist screen audio')
helpers = """
  const addAudioTrack = () => setAudioConfig(prev => ({
    ...prev,
    playlist: [...prev.playlist, {
      id: crypto.randomUUID(), name: 'New Track', url: '', mediaType: 'audio',
      volume: 100, startTimeSeconds: 0, priority: 10,
      schedule: { enabled: false, startTime: '00:00', endTime: '23:59', daysOfWeek: [0,1,2,3,4,5,6] }
    }]
  }));

  const updateAudioTrack = (index: number, updates: Partial<GlobalMediaTrack>) => setAudioConfig(prev => ({
    ...prev,
    playlist: prev.playlist.map((track, trackIndex) => trackIndex === index ? { ...track, ...updates } : track)
  }));

  const removeAudioTrack = (index: number) => setAudioConfig(prev => ({
    ...prev,
    playlist: prev.playlist.filter((_, trackIndex) => trackIndex !== index)
  }));

"""
text = replace_once(text, "  if (loading) return <div role=\"status\" className=\"text-text p-8\">Loading editor...</div>;", helpers + "  if (loading) return <div role=\"status\" className=\"text-text p-8\">Loading editor...</div>;", 'screen audio helpers')
audio_ui = r'''
            {/* Audio / Global Media Plane */}
            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-text border-b border-surface-highlight pb-2">Audio & Global Media Plane</h3>
                <p className="text-xs text-text-muted mt-2">Persistent background media stays mounted while slides rotate. Slide audio and video sound remain slide-bound foreground sources.</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={audioConfig.enabled} onChange={e => setAudioConfig(prev => ({ ...prev, enabled: e.target.checked }))} /> Audio enabled</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1 text-sm text-text-secondary">Screen master volume: {audioConfig.masterVolume}%<input type="range" min="0" max="100" value={audioConfig.masterVolume} onChange={e => setAudioConfig(prev => ({ ...prev, masterVolume: Number(e.target.value) }))} className="w-full accent-primary" /></label>
                <label className="space-y-1 text-sm text-text-secondary">Persisted app multiplier: {audioConfig.applicationVolume}%<input type="range" min="0" max="100" value={audioConfig.applicationVolume} onChange={e => setAudioConfig(prev => ({ ...prev, applicationVolume: Number(e.target.value) }))} className="w-full accent-primary" /></label>
              </div>
              <label className="block text-sm text-text-secondary">Background music URL (Firebase Storage)<input value={audioConfig.backgroundMusicUrl || ''} onChange={e => setAudioConfig(prev => ({ ...prev, backgroundMusicUrl: e.target.value }))} className="mt-1 w-full bg-background border border-surface-highlight rounded p-2 text-text" placeholder="https://firebasestorage.googleapis.com/..." /></label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-sm text-text-secondary">Coordination mode<select value={audioConfig.coordinationMode} onChange={e => setAudioConfig(prev => ({ ...prev, coordinationMode: e.target.value as ScreenAudioConfig['coordinationMode'] }))} className="mt-1 w-full bg-background border border-surface-highlight rounded p-2 text-text"><option value="mix">Mixer — simultaneous audio</option><option value="priority">Priority + ducking</option><option value="exclusive">Only one source at a time</option></select><span className="block text-[10px] text-text-muted mt-1">{coordinationModeLabel(audioConfig.coordinationMode)}</span></label>
                <label className="text-sm text-text-secondary">Fade between tracks (ms)<input type="number" min="0" value={audioConfig.fadeBetweenTracksMs} onChange={e => setAudioConfig(prev => ({ ...prev, fadeBetweenTracksMs: Number(e.target.value) }))} className="mt-1 w-full bg-background border border-surface-highlight rounded p-2 text-text" /></label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={audioConfig.allowVideoAudio} onChange={e => setAudioConfig(prev => ({ ...prev, allowVideoAudio: e.target.checked }))} /> Allow video audio</label>
                <label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={audioConfig.duckingEnabled} onChange={e => setAudioConfig(prev => ({ ...prev, duckingEnabled: e.target.checked }))} /> Duck background under foreground audio</label>
              </div>
              {audioConfig.duckingEnabled && <label className="block text-sm text-text-secondary">Ducked background level: {audioConfig.duckLevel}%<input type="range" min="0" max="100" value={audioConfig.duckLevel} onChange={e => setAudioConfig(prev => ({ ...prev, duckLevel: Number(e.target.value) }))} className="w-full accent-primary" /></label>}
              {(['schedule','quietHours'] as const).map(key => {
                const schedule = audioConfig[key] || { enabled:false, startTime:'00:00', endTime:'23:59', daysOfWeek:[0,1,2,3,4,5,6] };
                return <div key={key} className="p-3 border border-surface-highlight rounded space-y-2"><label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={schedule.enabled} onChange={e => setAudioConfig(prev => ({ ...prev, [key]: { ...schedule, enabled: e.target.checked } }))} /> {key === 'schedule' ? 'Screen audio schedule' : 'Quiet hours (scheduler override)'}</label><div className="grid grid-cols-2 gap-2"><input type="time" value={schedule.startTime} onChange={e => setAudioConfig(prev => ({ ...prev, [key]: { ...schedule, startTime: e.target.value } }))} className="bg-background border border-surface-highlight rounded p-2 text-text" /><input type="time" value={schedule.endTime || '23:59'} onChange={e => setAudioConfig(prev => ({ ...prev, [key]: { ...schedule, endTime: e.target.value } }))} className="bg-background border border-surface-highlight rounded p-2 text-text" /></div><input value={schedule.daysOfWeek.join(',')} onChange={e => setAudioConfig(prev => ({ ...prev, [key]: { ...schedule, daysOfWeek: e.target.value.split(',').map(Number).filter(day => day >= 0 && day <= 6) } }))} className="w-full bg-background border border-surface-highlight rounded p-2 text-text text-sm" aria-label={`${key} days of week`} /><p className="text-[10px] text-text-muted">Days use 0–6 = Sunday–Saturday. Overnight windows are supported.</p></div>;
              })}
              <div className="space-y-3">
                <div className="flex items-center justify-between"><div><h4 className="font-semibold text-text">Global playlist</h4><p className="text-xs text-text-muted">Audio or video files used as audio-only atmosphere tracks.</p></div><button type="button" onClick={addAudioTrack} className="ui-button ui-button-secondary">+ Track</button></div>
                {audioConfig.playlist.map((track,index) => <div key={track.id} className="p-3 border border-surface-highlight rounded space-y-2"><div className="grid grid-cols-[120px_1fr_auto] gap-2"><select value={track.mediaType} onChange={e => updateAudioTrack(index,{mediaType:e.target.value as GlobalMediaTrack['mediaType']})} className="bg-background border border-surface-highlight rounded p-2 text-text"><option value="audio">Audio</option><option value="video-audio">Video audio</option></select><input value={track.name} onChange={e => updateAudioTrack(index,{name:e.target.value})} className="bg-background border border-surface-highlight rounded p-2 text-text" placeholder="Track name" /><button type="button" onClick={() => removeAudioTrack(index)} className="ui-button ui-button-secondary">Remove</button></div><input value={track.url} onChange={e => updateAudioTrack(index,{url:e.target.value})} className="w-full bg-background border border-surface-highlight rounded p-2 text-text" placeholder="Firebase Storage download URL" /><div className="grid grid-cols-3 gap-2"><label className="text-xs text-text-muted">Volume<input type="number" min="0" max="100" value={track.volume} onChange={e => updateAudioTrack(index,{volume:Number(e.target.value)})} className="mt-1 w-full bg-background border border-surface-highlight rounded p-2 text-text" /></label><label className="text-xs text-text-muted">Start Time (s)<input type="number" min="0" value={track.startTimeSeconds} onChange={e => updateAudioTrack(index,{startTimeSeconds:Number(e.target.value)})} className="mt-1 w-full bg-background border border-surface-highlight rounded p-2 text-text" /></label><label className="text-xs text-text-muted">Priority<input type="number" min="0" value={track.priority} onChange={e => updateAudioTrack(index,{priority:Number(e.target.value)})} className="mt-1 w-full bg-background border border-surface-highlight rounded p-2 text-text" /></label></div></div>)}
              </div>
            </section>

'''
text = replace_once(text, "            {/* Display Adjustments */}", audio_ui + "            {/* Display Adjustments */}", 'screen audio ui')
write(path, text)

# --- Media library accepts audio in Firebase Storage ---
path = 'src/components/organisms/MediaAssetsView.tsx'
text = read(path)
text = text.replace("if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {\n      setError('Only image and video files are supported');", "if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/')) {\n      setError('Only image, video, and audio files are supported');")
text = text.replace('Manage images and videos for your slides and menus', 'Manage images, videos, and audio for slides, menus, and venue atmosphere')
text = text.replace('accept="image/*,video/*"', 'accept="image/*,video/*,audio/*"')
text = text.replace('Upload images or videos to use them in your digital signage slides and restaurant menus.', 'Upload images, videos, or audio to use them in digital signage slides, restaurant menus, and the cinematic atmosphere layer.')
text = text.replace("""                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-text-muted gap-2">
                    <FileIcon size={32} />
                    <span className="text-xs">Unsupported</span>
                  </div>
                )}
""", """                ) : file.contentType?.startsWith('audio/') ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-text-muted gap-3 bg-black/20 p-4">
                    <Volume2 size={36} />
                    <audio src={file.url} controls className="w-full" onClick={event => event.stopPropagation()} />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-text-muted gap-2">
                    <FileIcon size={32} />
                    <span className="text-xs">File</span>
                  </div>
                )}
""")
text = text.replace("import { Upload, Image as ImageIcon, Link as LinkIcon, Trash2, FileIcon } from 'lucide-react';", "import { Upload, Image as ImageIcon, Link as LinkIcon, Trash2, FileIcon, Volume2 } from 'lucide-react';")
write(path, text)

# --- Location audio: use actual Firebase Storage download URLs, never pseudo asset IDs ---
path = 'src/components/organisms/LocationDetailView.tsx'
text = read(path)
text = replace_once(text, "import { AudioService } from '../../services/audioService';", "import { AudioService } from '../../services/audioService';\nimport { StorageService, type StorageFile } from '../../services/storageService';\nimport { STORAGE_PATHS } from '../../lib/constants';", 'location storage imports')
text = text.replace("const [audioAssetId, setAudioAssetId] = useState<string>('');", "const [audioMediaUrl, setAudioMediaUrl] = useState<string>('');\n  const [mediaFiles, setMediaFiles] = useState<StorageFile[]>([]);")
text = text.replace("const [locationData, screensData] = await Promise.all([\n        LocationService.getLocation(organization.id, locationId),\n        ScreenService.getScreens(organization.id)\n      ]);", "const [locationData, screensData, filesData] = await Promise.all([\n        LocationService.getLocation(organization.id, locationId),\n        ScreenService.getScreens(organization.id),\n        StorageService.listFiles(STORAGE_PATHS.ORGANIZATION_ASSETS(organization.id))\n      ]);\n      setMediaFiles(filesData.filter(file => file.contentType?.startsWith('audio/') || file.contentType?.startsWith('video/')));")
text = text.replace("setAudioAssetId(locationData.audioConfig.assetId || '');", "setAudioMediaUrl(locationData.audioConfig.mediaUrl || (locationData.audioConfig.assetId?.startsWith('http') ? locationData.audioConfig.assetId : '') || '');")
text = text.replace("if (!locationId) return;", "if (!organization?.id || !locationId) return;", 1)
text = text.replace("await AudioService.stopLocationAudio(locationId);", "await AudioService.stopLocationAudio(organization.id, locationId);")
text = text.replace("if (!audioAssetId) {", "if (!audioMediaUrl) {")
text = text.replace("""        await AudioService.startLocationAudio(
          locationId,
          audioAssetId,
          audioVolume,
          audioLoop,
          excludedScreenIds
        );
""", """        const selectedFile = mediaFiles.find(file => file.url === audioMediaUrl);
        await AudioService.startLocationAudio(
          organization.id,
          locationId,
          audioMediaUrl,
          audioVolume,
          audioLoop,
          excludedScreenIds,
          undefined,
          selectedFile?.fullPath
        );
""")
text = text.replace("if (!locationId) return;\n    \n    const newExcludedIds", "if (!organization?.id || !locationId) return;\n    \n    const newExcludedIds", 1)
text = text.replace("await AudioService.updateAudioExclusions(locationId, newExcludedIds);", "await AudioService.updateAudioExclusions(organization.id, locationId, newExcludedIds);")
text = text.replace("value={audioAssetId}\n                  onChange={(e) => setAudioAssetId(e.target.value)}", "value={audioMediaUrl}\n                  onChange={(e) => setAudioMediaUrl(e.target.value)}")
text = text.replace("""                  <option value="">Select an audio file...</option>
                  {/* TODO: Load audio assets from Asset collection */}
""", """                  <option value="">Select an audio or video-audio file...</option>
                  {mediaFiles.map(file => <option key={file.fullPath} value={file.url}>{file.name}</option>)}
""")
write(path, text)

# --- Tile renderer: functional Audio Indicator + coordinated video soundtrack + start time/schedules ---
path = 'src/components/atoms/TileContent.tsx'
text = read(path)
text = text.replace("  VideoTileProperties, \n", "  VideoTileProperties, \n  AudioTileProperties,\n  MediaSchedule,\n")
text = replace_once(text, "import { useTileInteractions } from '../../hooks/useTileInteractions';", "import { useTileInteractions } from '../../hooks/useTileInteractions';\nimport { audioExperienceCoordinator, isScheduleActive } from '../../lib/audioExperience';", 'tile coordinator import')
video_block = r'''const VideoTile = ({ properties, isEditor }: { properties: VideoTileProperties; isEditor: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceId = useId();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const directionRef = useRef<'forward' | 'backward'>('forward');
  const isPlayingRef = useRef<boolean>(!!properties.autoplay);
  const [scheduleTick, setScheduleTick] = useState(0);

  const mediaSchedule: MediaSchedule = {
    enabled: !!properties.scheduleEnabled,
    startTime: properties.scheduleStart || '00:00',
    endTime: properties.scheduleEnd || '23:59',
    daysOfWeek: properties.scheduleDays || [0,1,2,3,4,5,6],
  };
  const scheduleActive = isScheduleActive(mediaSchedule, new Date());
  void scheduleTick;

  useEffect(() => {
    const timer = setInterval(() => setScheduleTick(value => value + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const wantsPlayback = !isEditor && !!properties.autoplay && scheduleActive;
    return audioExperienceCoordinator.registerSource({
      id: `video:${sourceId}`,
      kind: 'video',
      priority: properties.priority ?? 50,
      volume: properties.volume ?? 100,
      duckBackground: properties.duckBackground ?? true,
      wantsPlayback: wantsPlayback && !properties.muted,
      applyGain: gain => { video.volume = Math.max(0, Math.min(1, gain)); },
      applyAllowed: allowed => { video.muted = isEditor || !!properties.muted || !allowed; },
    });
  }, [sourceId, isEditor, properties.autoplay, properties.muted, properties.priority, properties.volume, properties.duckBackground, scheduleActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    isPlayingRef.current = !isEditor && !!properties.autoplay && scheduleActive;
    directionRef.current = properties.reverse ? 'backward' : 'forward';
    const startAt = Math.max(0, properties.startTime ?? 0);
    const seekToStart = () => { if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = Math.min(startAt, Math.max(0, video.duration - 0.05)); else video.currentTime = startAt; };
    const onPlay = () => { isPlayingRef.current = true; };
    const onPause = () => { isPlayingRef.current = false; };
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    const handlePlayback = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      seekToStart();
      if (!properties.bounce && !properties.reverse) {
        video.playbackRate = 1;
        if (!isEditor && properties.autoplay && scheduleActive) video.play().catch(() => undefined);
        else video.pause();
        return;
      }
      video.pause();
      const step = 0.05;
      intervalRef.current = setInterval(() => {
        if (!isPlayingRef.current || !scheduleActive) return;
        let nextTime = video.currentTime;
        if (directionRef.current === 'forward') {
          nextTime += step;
          if (nextTime >= video.duration) {
            if (properties.bounce) { nextTime = video.duration; directionRef.current = 'backward'; }
            else if (properties.loop && !properties.oneShot) nextTime = startAt;
            else { nextTime = video.duration; isPlayingRef.current = false; }
          }
        } else {
          nextTime -= step;
          if (nextTime <= startAt) {
            if (properties.bounce) { nextTime = startAt; directionRef.current = 'forward'; }
            else if (properties.loop && !properties.oneShot) nextTime = video.duration;
            else { nextTime = startAt; isPlayingRef.current = false; }
          }
        }
        video.currentTime = Math.max(0, nextTime);
      }, 50);
    };
    video.addEventListener('loadedmetadata', handlePlayback);
    if (video.readyState >= 1) handlePlayback();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      video.removeEventListener('loadedmetadata', handlePlayback);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [properties.url, properties.bounce, properties.reverse, properties.autoplay, properties.loop, properties.oneShot, properties.startTime, isEditor, scheduleActive]);

  return <div className="w-full h-full bg-black overflow-hidden">{properties.url ? <video ref={videoRef} src={String(properties.url)} className="w-full h-full object-cover" muted={true} controls={!!properties.controls && !isEditor} loop={!!properties.loop && !properties.oneShot && !properties.bounce && !properties.reverse} autoPlay={false} playsInline /> : <div className="w-full h-full flex items-center justify-center text-text-muted"><Video size={24} /></div>}</div>;
};

const AudioIndicatorTile = ({ properties, isEditor }: { properties: AudioTileProperties; isEditor: boolean }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceId = useId();
  const [scheduleTick, setScheduleTick] = useState(0);
  const [status, setStatus] = useState<'idle' | 'playing' | 'blocked'>('idle');
  const schedule: MediaSchedule = { enabled: !!properties.scheduleEnabled, startTime: properties.scheduleStart || '00:00', endTime: properties.scheduleEnd || '23:59', daysOfWeek: properties.scheduleDays || [0,1,2,3,4,5,6] };
  const scheduleActive = isScheduleActive(schedule, new Date());
  void scheduleTick;

  useEffect(() => { const timer = setInterval(() => setScheduleTick(value => value + 1), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const wantsPlayback = !isEditor && !!properties.autoplay && scheduleActive;
    return audioExperienceCoordinator.registerSource({
      id: `audio:${sourceId}`,
      kind: 'audio',
      priority: properties.priority ?? 60,
      volume: properties.volume ?? 100,
      duckBackground: properties.duckBackground ?? true,
      wantsPlayback,
      applyGain: gain => { audio.volume = Math.max(0, Math.min(1, gain)); },
      applyAllowed: allowed => { audio.muted = !allowed; },
    });
  }, [sourceId, isEditor, properties.autoplay, properties.priority, properties.volume, properties.duckBackground, scheduleActive]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = !!properties.loop && !properties.oneShot;
    const seek = () => { const start = Math.max(0, properties.startTime ?? 0); if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Math.min(start, Math.max(0, audio.duration - 0.05)); else audio.currentTime = start; };
    if (audio.readyState >= 1) seek(); else audio.addEventListener('loadedmetadata', seek, { once: true });
    if (!isEditor && properties.autoplay && scheduleActive) audio.play().then(() => setStatus('playing')).catch(() => setStatus('blocked'));
    else { audio.pause(); setStatus('idle'); }
  }, [properties.url, properties.startTime, properties.loop, properties.oneShot, properties.autoplay, isEditor, scheduleActive]);

  return <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-surface gap-2"><audio ref={audioRef} src={String(properties.url || '')} controls={!!properties.controls} onPlay={() => setStatus('playing')} onPause={() => setStatus('idle')} onEnded={() => setStatus('idle')} className={properties.controls ? 'w-full' : 'hidden'} /><div className={properties.showIndicator === false ? 'hidden' : 'flex flex-col items-center gap-1 text-center'}><Volume2 size={28} className="text-primary" /><strong className="text-xs text-text">{properties.trackName || 'Audio'}</strong><span className="text-[10px] text-text-muted">{isEditor ? 'Slide-bound audio' : status === 'blocked' ? 'Audio blocked — interact with player to enable' : status === 'playing' ? 'Playing' : scheduleActive ? 'Ready' : 'Outside schedule'}</span></div></div>;
};

const CalendarTile'''
text = regex_once(text, r"const VideoTile = \(\{ properties \}: \{ properties: VideoTileProperties \}\) => \{.*?\nconst CalendarTile", video_block, 'replace video tile')
text = text.replace("return <VideoTile properties={properties as VideoTileProperties} />;", "return <VideoTile properties={properties as VideoTileProperties} isEditor={isEditor} />;")
text = regex_once(text, r"  if \(tile\.type === 'audio'\) \{.*?\n  \}\n  if \(tile\.type === 'slideshow'\)", "  if (tile.type === 'audio') {\n    return <AudioIndicatorTile properties={properties as AudioTileProperties} isEditor={isEditor} />;\n  }\n  if (tile.type === 'slideshow')", 'replace audio tile')
write(path, text)

# --- Slide property editor: expose start time, scheduling and coordination fields ---
path = 'src/components/organisms/SlideEditor.tsx'
text = read(path)
text = text.replace("  VideoTileProperties,\n", "  VideoTileProperties,\n  AudioTileProperties,\n")
media_controls = r'''
                              {(selectedTile.type === 'video' || selectedTile.type === 'background_video' || selectedTile.type === 'audio') && (() => {
                                const media = selectedTile.properties as VideoTileProperties & AudioTileProperties;
                                const days = media.scheduleDays || [0,1,2,3,4,5,6];
                                return <div className="mt-4 pt-4 border-t border-surface-highlight space-y-3"><label className="text-xs font-bold text-text-muted uppercase tracking-wider">Audio coordination & schedule</label><div className="grid grid-cols-2 gap-2"><label className="text-xs text-text-muted">Start Time (s)<input type="number" min="0" value={media.startTime ?? 0} onChange={e => updateSelectedTileProperty('startTime', Number(e.target.value))} className="mt-1 w-full bg-background border border-surface-highlight rounded p-2 text-text" /></label><label className="text-xs text-text-muted">Volume (0–100)<input type="number" min="0" max="100" value={media.volume ?? 100} onChange={e => updateSelectedTileProperty('volume', Number(e.target.value))} className="mt-1 w-full bg-background border border-surface-highlight rounded p-2 text-text" /></label><label className="text-xs text-text-muted">Priority<input type="number" min="0" value={media.priority ?? (selectedTile.type === 'audio' ? 60 : 50)} onChange={e => updateSelectedTileProperty('priority', Number(e.target.value))} className="mt-1 w-full bg-background border border-surface-highlight rounded p-2 text-text" /></label><label className="flex items-end gap-2 pb-2 text-sm text-text"><input type="checkbox" checked={media.duckBackground ?? true} onChange={e => updateSelectedTileProperty('duckBackground', e.target.checked)} /> Duck background</label><label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={media.oneShot ?? false} onChange={e => updateSelectedTileProperty('oneShot', e.target.checked)} /> One-shot playback</label><label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={media.scheduleEnabled ?? false} onChange={e => updateSelectedTileProperty('scheduleEnabled', e.target.checked)} /> Scheduled playback</label></div>{media.scheduleEnabled && <div className="grid grid-cols-2 gap-2"><input type="time" value={media.scheduleStart || '00:00'} onChange={e => updateSelectedTileProperty('scheduleStart', e.target.value)} className="bg-background border border-surface-highlight rounded p-2 text-text" /><input type="time" value={media.scheduleEnd || '23:59'} onChange={e => updateSelectedTileProperty('scheduleEnd', e.target.value)} className="bg-background border border-surface-highlight rounded p-2 text-text" /><input className="col-span-2 bg-background border border-surface-highlight rounded p-2 text-text text-xs" value={days.join(',')} onChange={e => updateSelectedTileProperty('scheduleDays', e.target.value.split(',').map(Number).filter(day => day >= 0 && day <= 6))} aria-label="Schedule days (0 Sunday through 6 Saturday)" /></div>}{selectedTile.type === 'audio' && <><label className="block text-xs text-text-muted">Track name<input value={String(media.trackName || 'Audio')} onChange={e => updateSelectedTileProperty('trackName', e.target.value)} className="mt-1 w-full bg-background border border-surface-highlight rounded p-2 text-text" /></label><label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={media.showIndicator ?? true} onChange={e => updateSelectedTileProperty('showIndicator', e.target.checked)} /> Show Audio Indicator on display</label></>}</div>;
                              })()}
'''
needle = """                              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Playback</label>
"""
# Insert only once, before the next category/editor block after Playback controls. Use the end of the reverse label grid.
marker = """                                  Reverse
                                </label>
                              </div>
"""
text = replace_once(text, marker, marker + media_controls, 'slide media controls')
write(path, text)

# --- Firestore rules: realtime audio state is public-get, tenant-authorized write ---
path = 'firestore.rules'
text = read(path)
rule = """
    // Realtime venue audio sync. Players may fetch a known location document;
    // writes remain scoped to organization membership/admin roles.
    match /location_audio_sync/{locationId} {
      allow get: if true;
      allow list: if false;
      allow create: if request.auth != null && isOrgMember(request.resource.data.orgId);
      allow update: if request.auth != null && isOrgMember(resource.data.orgId);
      allow delete: if request.auth != null && isOrgAdmin(resource.data.orgId);
    }

"""
text = replace_once(text, "    // Screen Sessions Collection\n", rule + "    // Screen Sessions Collection\n", 'audio firestore rule')
write(path, text)

# --- Firebase Functions: tenant-safe synchronized venue audio ---
path = 'functions/src/index.ts'
text = read(path)
helper = r'''
const assertOrgAudioAccess = async (uid: string, orgId: string) => {
  const orgRef = admin.firestore().doc(`organizations/${orgId}`);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) throw new functions.https.HttpsError('not-found', 'Organization not found');
  const org = orgSnap.data() || {};
  if (org.ownerId === uid || (Array.isArray(org.members) && org.members.includes(uid))) return;
  const memberSnap = await orgRef.collection('members').doc(uid).get();
  if (!memberSnap.exists) throw new functions.https.HttpsError('permission-denied', 'User is not a member of this organization');
};

'''
anchor = "/**\n * Start synchronized audio playback across all screens in a location\n */"
if 'const assertOrgAudioAccess' not in text:
    text = replace_once(text, anchor, helper + anchor, 'function auth helper')
start_fn = r'''export const startLocationAudio = onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  const { orgId, locationId, mediaUrl, storagePath, volume = 50, loop = false, excludedScreenIds = [], scheduledStartTime } = data || {};
  if (!orgId || !locationId || !mediaUrl) throw new functions.https.HttpsError('invalid-argument', 'orgId, locationId, and mediaUrl are required');
  await assertOrgAudioAccess(context.auth.uid, orgId);

  const db = admin.firestore();
  const locationRef = db.doc(`organizations/${orgId}/locations/${locationId}`);
  const locationSnap = await locationRef.get();
  if (!locationSnap.exists) throw new functions.https.HttpsError('not-found', 'Location not found');

  const now = admin.firestore.Timestamp.now();
  const scheduled = scheduledStartTime
    ? admin.firestore.Timestamp.fromMillis(Number(scheduledStartTime))
    : admin.firestore.Timestamp.fromMillis(Date.now() + 750);
  const syncRef = db.doc(`location_audio_sync/${locationId}`);
  const syncToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await syncRef.set({
    id: locationId, orgId, locationId, mediaUrl, storagePath: storagePath || null,
    syncToken, scheduledStartTime: scheduled, isPlaying: true,
    volume: Math.max(0, Math.min(100, Number(volume))), loop: Boolean(loop),
    excludedScreenIds: Array.isArray(excludedScreenIds) ? excludedScreenIds : [],
    createdAt: now, updatedAt: now,
  }, { merge: true });
  await locationRef.set({ audioConfig: {
    mediaUrl, storagePath: storagePath || null, isPlaying: true,
    volume: Math.max(0, Math.min(100, Number(volume))), loop: Boolean(loop),
    excludedScreenIds: Array.isArray(excludedScreenIds) ? excludedScreenIds : [],
  }}, { merge: true });
});'''
text = regex_once(text, r"export const startLocationAudio = onCall\(async \(data, context\) => \{.*?\n\}\);\n\n/\*\*\n \* Stop audio playback", start_fn + "\n\n/**\n * Stop audio playback", 'start location audio function')
stop_fn = r'''export const stopLocationAudio = onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  const { orgId, locationId } = data || {};
  if (!orgId || !locationId) throw new functions.https.HttpsError('invalid-argument', 'orgId and locationId are required');
  await assertOrgAudioAccess(context.auth.uid, orgId);
  const db = admin.firestore();
  await db.doc(`location_audio_sync/${locationId}`).set({ isPlaying: false, updatedAt: admin.firestore.Timestamp.now() }, { merge: true });
  await db.doc(`organizations/${orgId}/locations/${locationId}`).set({ audioConfig: { isPlaying: false } }, { merge: true });
});'''
text = regex_once(text, r"export const stopLocationAudio = onCall\(async \(data, context\) => \{.*?\n\}\);", stop_fn, 'stop location audio function')
write(path, text)

# --- Architecture docs: make Firebase source-of-truth unmistakable ---
path = 'docs/LOCATION_AUDIO_FEATURES.md'
text = read(path)
prefix = """> **Architecture authority:** AccelRestaurants V2 is Firebase-native. Audio state is stored in Firestore, media lives in Firebase Storage, synchronized commands use Firebase Functions/Firestore, and the player is served through Firebase Hosting. Supabase is not part of this application architecture.\n\n"""
if not text.startswith('> **Architecture authority:**'):
    text = prefix + text
write(path, text)

print('Applied Firebase audio experience integration patch.')
