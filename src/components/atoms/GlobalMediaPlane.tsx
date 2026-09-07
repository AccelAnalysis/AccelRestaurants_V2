import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AppScreen,
  GlobalMediaTrack,
  Location,
  LocationAudioSync,
} from '../../types/schema';
import { AudioService } from '../../services/audioService';
import {
  audioExperienceCoordinator,
  isScheduleActive,
  normalizeScreenAudioConfig,
} from '../../lib/audioExperience';

interface GlobalMediaPlaneProps {
  screen: AppScreen;
  location: Location | null;
}

interface PersistentMediaSourceProps {
  sourceId: string;
  url: string;
  kind?: 'background' | 'audio' | 'video';
  priority: number;
  volume: number;
  startTimeSeconds?: number;
  scheduledStartTimeMs?: number;
  loop?: boolean;
  wantsPlayback: boolean;
  fadeLevel?: number;
  onNearEnd?: () => void;
  onEnded?: () => void;
}

const PersistentMediaSource = ({
  sourceId,
  url,
  kind = 'background',
  priority,
  volume,
  startTimeSeconds = 0,
  scheduledStartTimeMs,
  loop = false,
  wantsPlayback,
  fadeLevel = 1,
  onNearEnd,
  onEnded,
}: PersistentMediaSourceProps) => {
  const mediaRef = useRef<HTMLAudioElement | null>(null);
  const lastGainRef = useRef(0);
  const fadeRef = useRef(fadeLevel);
  const nearEndFiredRef = useRef(false);

  useEffect(() => {
    fadeRef.current = fadeLevel;
    if (mediaRef.current) {
      mediaRef.current.volume = Math.max(0, Math.min(1, lastGainRef.current * fadeLevel));
    }
  }, [fadeLevel]);

  useEffect(() => {
    const media = new Audio();
    mediaRef.current = media;
    media.preload = 'auto';
    media.src = url;
    media.loop = loop;

    const applyGain = (gain: number) => {
      lastGainRef.current = gain;
      media.volume = Math.max(0, Math.min(1, gain * fadeRef.current));
    };
    const applyAllowed = (allowed: boolean) => {
      media.muted = !allowed;
      if (!allowed && !wantsPlayback) media.pause();
    };

    const unregister = audioExperienceCoordinator.registerSource({
      id: sourceId,
      kind,
      priority,
      volume,
      duckBackground: false,
      wantsPlayback,
      applyGain,
      applyAllowed,
    });

    const startPlayback = () => {
      if (!wantsPlayback) return;
      const seek = () => {
        if (Number.isFinite(media.duration) && media.duration > 0) {
          media.currentTime = Math.min(Math.max(0, startTimeSeconds), Math.max(0, media.duration - 0.05));
        } else {
          media.currentTime = Math.max(0, startTimeSeconds);
        }
      };
      if (media.readyState >= 1) seek();
      else media.addEventListener('loadedmetadata', seek, { once: true });
      media.play().catch(error => {
        // Audible autoplay can be blocked by a browser/kiosk policy. Keep the
        // source registered so a later user gesture or policy change can resume it.
        console.warn('Persistent audio autoplay was blocked', error);
      });
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const delay = scheduledStartTimeMs ? Math.max(0, scheduledStartTimeMs - Date.now()) : 0;
    if (delay > 0) timer = setTimeout(startPlayback, delay);
    else startPlayback();

    const handleTimeUpdate = () => {
      if (!onNearEnd || nearEndFiredRef.current || !Number.isFinite(media.duration) || media.duration <= 0) return;
      const fadeWindowSeconds = Math.max(0.25, normalizeScreenAudioConfig(audioExperienceCoordinator.getConfig()).fadeBetweenTracksMs / 1000);
      if (media.duration - media.currentTime <= fadeWindowSeconds) {
        nearEndFiredRef.current = true;
        onNearEnd();
      }
    };
    const handleEnded = () => onEnded?.();
    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('ended', handleEnded);

    return () => {
      if (timer) clearTimeout(timer);
      unregister();
      media.pause();
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('ended', handleEnded);
      media.src = '';
      if (mediaRef.current === media) mediaRef.current = null;
    };
  }, [sourceId, url, kind, priority, volume, startTimeSeconds, scheduledStartTimeMs, loop, wantsPlayback, onNearEnd, onEnded]);

  useEffect(() => {
    audioExperienceCoordinator.updateSource(sourceId, {
      priority,
      volume,
      wantsPlayback,
    });
    const media = mediaRef.current;
    if (!media) return;
    if (wantsPlayback && media.paused) {
      media.play().catch(() => undefined);
    }
    if (!wantsPlayback && !media.paused) media.pause();
  }, [sourceId, priority, volume, wantsPlayback]);

  return null;
};

const buildScreenTracks = (screen: AppScreen): GlobalMediaTrack[] => {
  const config = normalizeScreenAudioConfig(screen.audioConfig);
  const playlist = config.playlist.filter(track => Boolean(track.url));
  if (playlist.length > 0) return playlist;
  if (!config.backgroundMusicUrl) return [];
  return [{
    id: 'screen-background-music',
    name: 'Background Music',
    url: config.backgroundMusicUrl,
    mediaType: 'audio',
    volume: 100,
    startTimeSeconds: 0,
    priority: 10,
  }];
};

export const GlobalMediaPlane = ({ screen, location }: GlobalMediaPlaneProps) => {
  const config = useMemo(() => normalizeScreenAudioConfig(screen.audioConfig), [screen.audioConfig]);
  const [clock, setClock] = useState(() => new Date());
  const [locationSync, setLocationSync] = useState<LocationAudioSync | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [crossfadeProgress, setCrossfadeProgress] = useState(0);
  const crossfadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    audioExperienceCoordinator.setConfig(config);
    return () => audioExperienceCoordinator.setConfig(undefined);
  }, [config]);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date());
      audioExperienceCoordinator.refresh();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!location?.id) return;
    return AudioService.subscribeToLocationAudio(location.id, setLocationSync);
  }, [location?.id]);

  const tracks = useMemo(
    () => buildScreenTracks(screen).filter(track => isScheduleActive(track.schedule, clock)),
    [screen, clock]
  );

  useEffect(() => {
    const reset = window.setTimeout(() => {
      if (currentIndex >= tracks.length) setCurrentIndex(0);
      setNextIndex(null);
      setCrossfadeProgress(0);
    }, 0);
    return () => window.clearTimeout(reset);
  }, [tracks.length, currentIndex]);

  useEffect(() => () => {
    if (crossfadeTimerRef.current) clearInterval(crossfadeTimerRef.current);
  }, []);

  const beginCrossfade = () => {
    if (tracks.length <= 1 || nextIndex !== null) return;
    const target = (currentIndex + 1) % tracks.length;
    setNextIndex(target);
    setCrossfadeProgress(0);
    if (crossfadeTimerRef.current) clearInterval(crossfadeTimerRef.current);
    const duration = Math.max(100, config.fadeBetweenTracksMs);
    const startedAt = Date.now();
    crossfadeTimerRef.current = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      setCrossfadeProgress(progress);
      if (progress >= 1) {
        if (crossfadeTimerRef.current) clearInterval(crossfadeTimerRef.current);
        crossfadeTimerRef.current = null;
        setCurrentIndex(target);
        setNextIndex(null);
        setCrossfadeProgress(0);
      }
    }, 50);
  };

  const currentTrack = tracks[currentIndex];
  const nextTrack = nextIndex !== null ? tracks[nextIndex] : undefined;
  const screenScheduleAllowsPlayback = config.enabled && isScheduleActive(config.schedule, clock);

  const venueUrl = locationSync?.mediaUrl || (locationSync?.assetId?.startsWith('http') ? locationSync.assetId : '');
  const venueAllowed = Boolean(
    locationSync?.isPlaying &&
    venueUrl &&
    !locationSync.excludedScreenIds?.includes(screen.id)
  );
  const venueStartMs = locationSync?.scheduledStartTime?.toMillis?.();

  return (
    <>
      {/* Venue-wide synchronized audio from Firestore location_audio_sync. */}
      {venueUrl && (
        <PersistentMediaSource
          sourceId={`venue:${location?.id || 'unknown'}`}
          url={venueUrl}
          priority={15}
          volume={locationSync?.volume ?? 50}
          scheduledStartTimeMs={venueStartMs}
          loop={locationSync?.loop ?? false}
          wantsPlayback={venueAllowed}
        />
      )}

      {/* Screen-level global media plane. These sources remain mounted while slides rotate. */}
      {currentTrack && (
        <PersistentMediaSource
          key={`current:${currentTrack.id}`}
          sourceId={`screen:${screen.id}:track:${currentTrack.id}`}
          url={currentTrack.url}
          priority={currentTrack.priority ?? 10}
          volume={currentTrack.volume ?? 100}
          startTimeSeconds={currentTrack.startTimeSeconds ?? 0}
          wantsPlayback={screenScheduleAllowsPlayback}
          loop={tracks.length === 1}
          fadeLevel={nextTrack ? 1 - crossfadeProgress : 1}
          onNearEnd={tracks.length > 1 ? beginCrossfade : undefined}
          onEnded={tracks.length > 1 ? beginCrossfade : undefined}
        />
      )}
      {nextTrack && (
        <PersistentMediaSource
          key={`next:${nextTrack.id}`}
          sourceId={`screen:${screen.id}:track:${nextTrack.id}:next`}
          url={nextTrack.url}
          priority={nextTrack.priority ?? 10}
          volume={nextTrack.volume ?? 100}
          startTimeSeconds={nextTrack.startTimeSeconds ?? 0}
          wantsPlayback={screenScheduleAllowsPlayback}
          fadeLevel={crossfadeProgress}
        />
      )}
    </>
  );
};
