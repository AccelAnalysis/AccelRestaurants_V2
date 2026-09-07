import { AudioService } from './audioService';
import { LocationService } from './locationService';
import type { Location } from '../types/schema';

/**
 * Audio Scheduler Service
 * Evaluates venue audio schedules and automatically starts/stops playback.
 * The scheduler works only with Firebase-persisted media URLs; opaque legacy
 * asset IDs are intentionally not converted into guessed Storage URLs.
 */
class AudioSchedulerService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private checkIntervalMs = 60000;
  private activeSchedules = new Map<string, string>();

  start(orgId: string) {
    if (this.intervalId) {
      console.warn('Audio scheduler already running');
      return;
    }

    console.log('Starting audio scheduler');
    void this.checkSchedules(orgId);
    this.intervalId = setInterval(() => {
      void this.checkSchedules(orgId);
    }, this.checkIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.activeSchedules.clear();
      console.log('Audio scheduler stopped');
    }
  }

  private async checkSchedules(orgId: string) {
    try {
      const locations = await LocationService.getLocations(orgId);
      for (const location of locations) {
        await this.evaluateLocationSchedule(orgId, location);
      }
    } catch (error) {
      console.error('Error checking audio schedules:', error);
    }
  }

  private async evaluateLocationSchedule(orgId: string, location: Location) {
    if (!location.audioConfig?.schedule || location.audioConfig.schedule.length === 0) return;

    const activeSchedule = AudioService.getActiveSchedule(location.audioConfig.schedule);
    const currentActiveScheduleId = this.activeSchedules.get(location.id);

    if (activeSchedule) {
      if (currentActiveScheduleId === activeSchedule.id) return;

      const mediaUrl = location.audioConfig.mediaUrl ||
        (location.audioConfig.assetId?.startsWith('http') ? location.audioConfig.assetId : '');

      if (!mediaUrl) {
        console.warn(`Scheduled audio for ${location.id} has no Firebase Storage download URL; skipping playback.`);
        return;
      }

      console.log(`Starting scheduled audio for location ${location.name} (${location.id})`);
      try {
        await AudioService.startLocationAudio(
          orgId,
          location.id,
          mediaUrl,
          location.audioConfig.volume || 50,
          location.audioConfig.loop || false,
          location.audioConfig.excludedScreenIds || [],
          undefined,
          location.audioConfig.storagePath
        );
        this.activeSchedules.set(location.id, activeSchedule.id);
      } catch (error) {
        console.error(`Failed to start scheduled audio for location ${location.id}:`, error);
      }
      return;
    }

    if (currentActiveScheduleId) {
      console.log(`Stopping scheduled audio for location ${location.name} (${location.id})`);
      try {
        await AudioService.stopLocationAudio(orgId, location.id);
        this.activeSchedules.delete(location.id);
      } catch (error) {
        console.error(`Failed to stop scheduled audio for location ${location.id}:`, error);
      }
    }
  }

  async checkLocationNow(orgId: string, locationId: string) {
    try {
      const location = await LocationService.getLocation(orgId, locationId);
      if (location) await this.evaluateLocationSchedule(orgId, location);
    } catch (error) {
      console.error(`Error checking schedule for location ${locationId}:`, error);
    }
  }
}

export const audioScheduler = new AudioSchedulerService();
