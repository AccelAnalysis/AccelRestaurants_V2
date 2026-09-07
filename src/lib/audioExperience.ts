import type {
  AudioCoordinationMode,
  MediaSchedule,
  ScreenAudioConfig,
} from '../types/schema';

export type CoordinatedAudioSourceKind = 'background' | 'audio' | 'video';

export interface CoordinatedAudioSource {
  id: string;
  kind: CoordinatedAudioSourceKind;
  priority: number;
  volume: number;
  duckBackground: boolean;
  wantsPlayback: boolean;
  applyGain: (gain: number) => void;
  applyAllowed: (allowed: boolean) => void;
}

const DEFAULT_SCHEDULE: MediaSchedule = {
  enabled: false,
  startTime: '00:00',
  endTime: '23:59',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
};

export const DEFAULT_SCREEN_AUDIO_CONFIG: ScreenAudioConfig = {
  enabled: true,
  applicationVolume: 100,
  masterVolume: 70,
  backgroundMusicUrl: '',
  playlist: [],
  allowVideoAudio: true,
  coordinationMode: 'priority',
  duckingEnabled: true,
  duckLevel: 25,
  fadeBetweenTracksMs: 1200,
  schedule: { ...DEFAULT_SCHEDULE },
  quietHours: { ...DEFAULT_SCHEDULE },
};

const clampPercent = (value: number | undefined, fallback: number): number => {
  const numeric = Number.isFinite(value) ? Number(value) : fallback;
  return Math.max(0, Math.min(100, numeric));
};

export const normalizeSchedule = (schedule?: Partial<MediaSchedule>): MediaSchedule => ({
  enabled: schedule?.enabled ?? false,
  startTime: schedule?.startTime || '00:00',
  endTime: schedule?.endTime || '23:59',
  daysOfWeek: Array.isArray(schedule?.daysOfWeek) && schedule.daysOfWeek.length > 0
    ? schedule.daysOfWeek.filter(day => day >= 0 && day <= 6)
    : [0, 1, 2, 3, 4, 5, 6],
});

export const normalizeScreenAudioConfig = (config?: Partial<ScreenAudioConfig>): ScreenAudioConfig => ({
  ...DEFAULT_SCREEN_AUDIO_CONFIG,
  ...config,
  applicationVolume: clampPercent(config?.applicationVolume, DEFAULT_SCREEN_AUDIO_CONFIG.applicationVolume),
  masterVolume: clampPercent(config?.masterVolume, DEFAULT_SCREEN_AUDIO_CONFIG.masterVolume),
  duckLevel: clampPercent(config?.duckLevel, DEFAULT_SCREEN_AUDIO_CONFIG.duckLevel),
  fadeBetweenTracksMs: Math.max(0, Number(config?.fadeBetweenTracksMs ?? DEFAULT_SCREEN_AUDIO_CONFIG.fadeBetweenTracksMs)),
  playlist: Array.isArray(config?.playlist) ? config.playlist : [],
  schedule: normalizeSchedule(config?.schedule),
  quietHours: normalizeSchedule(config?.quietHours),
});

const timeToMinutes = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return fallback;
  return Math.max(0, Math.min(1439, hour * 60 + minute));
};

/**
 * Evaluates day/time windows locally on the player. Windows whose end time is
 * earlier than their start time cross midnight. In that case the previous day
 * is also considered for the after-midnight portion.
 */
export const isScheduleActive = (schedule: MediaSchedule | undefined, now = new Date()): boolean => {
  if (!schedule?.enabled) return true;

  const start = timeToMinutes(schedule.startTime, 0);
  const end = timeToMinutes(schedule.endTime, 1439);
  const current = now.getHours() * 60 + now.getMinutes();
  const currentDay = now.getDay();
  const days = schedule.daysOfWeek?.length ? schedule.daysOfWeek : [0, 1, 2, 3, 4, 5, 6];

  if (end > start) {
    return days.includes(currentDay) && current >= start && current < end;
  }

  // Overnight window, e.g. 22:00 -> 06:00.
  if (current >= start) return days.includes(currentDay);
  const previousDay = (currentDay + 6) % 7;
  return current < end && days.includes(previousDay);
};

export const isQuietHours = (schedule: MediaSchedule | undefined, now = new Date()): boolean => {
  if (!schedule?.enabled) return false;
  return isScheduleActive(schedule, now);
};

class AudioExperienceCoordinator {
  private config: ScreenAudioConfig = normalizeScreenAudioConfig();
  private sources = new Map<string, CoordinatedAudioSource>();

  setConfig(config?: Partial<ScreenAudioConfig>) {
    this.config = normalizeScreenAudioConfig(config);
    this.recompute();
  }

  getConfig(): ScreenAudioConfig {
    return this.config;
  }

  registerSource(source: CoordinatedAudioSource): () => void {
    this.sources.set(source.id, source);
    this.recompute();
    return () => {
      this.sources.delete(source.id);
      this.recompute();
    };
  }

  updateSource(id: string, updates: Partial<Omit<CoordinatedAudioSource, 'id'>>) {
    const current = this.sources.get(id);
    if (!current) return;
    this.sources.set(id, { ...current, ...updates });
    this.recompute();
  }

  refresh() {
    this.recompute();
  }

  private recompute() {
    const now = new Date();
    const config = this.config;
    const globallyEnabled = config.enabled && isScheduleActive(config.schedule, now) && !isQuietHours(config.quietHours, now);
    const requested = Array.from(this.sources.values()).filter(source => source.wantsPlayback);
    const foreground = requested.filter(source => source.kind !== 'background');
    const allowedIds = new Set<string>();

    if (globallyEnabled) {
      if (config.coordinationMode === 'mix') {
        requested.forEach(source => allowedIds.add(source.id));
      } else if (config.coordinationMode === 'exclusive') {
        const winner = [...requested].sort((a, b) => b.priority - a.priority)[0];
        if (winner) allowedIds.add(winner.id);
      } else {
        // Priority mode preserves the persistent atmosphere plane while only
        // allowing the highest-priority foreground group to speak.
        const highestForegroundPriority = foreground.length
          ? Math.max(...foreground.map(source => source.priority))
          : null;
        requested.forEach(source => {
          if (source.kind === 'background') allowedIds.add(source.id);
          if (highestForegroundPriority !== null && source.kind !== 'background' && source.priority === highestForegroundPriority) {
            allowedIds.add(source.id);
          }
        });
      }
    }

    const audibleForeground = foreground.filter(source => allowedIds.has(source.id));
    const shouldDuckBackground = config.duckingEnabled && audibleForeground.some(source => source.duckBackground);
    const appGain = clampPercent(config.applicationVolume, 100) / 100;
    const masterGain = clampPercent(config.masterVolume, 70) / 100;

    this.sources.forEach(source => {
      const videoAudioAllowed = source.kind !== 'video' || config.allowVideoAudio;
      const allowed = globallyEnabled && videoAudioAllowed && allowedIds.has(source.id);
      let gain = allowed ? clampPercent(source.volume, 100) / 100 * appGain * masterGain : 0;
      if (allowed && source.kind === 'background' && shouldDuckBackground) {
        gain *= clampPercent(config.duckLevel, 25) / 100;
      }

      try {
        source.applyAllowed(allowed);
        source.applyGain(Math.max(0, Math.min(1, gain)));
      } catch (error) {
        console.warn('Audio source coordination update failed', source.id, error);
      }
    });
  }
}

export const audioExperienceCoordinator = new AudioExperienceCoordinator();

export const coordinationModeLabel = (mode: AudioCoordinationMode): string => {
  if (mode === 'mix') return 'Mixer: simultaneous sources are allowed.';
  if (mode === 'exclusive') return 'Exclusive: only the highest-priority source can be heard.';
  return 'Priority: the highest-priority foreground source speaks while background audio can duck.';
};
