import { AudioService } from './audioService';
import { LocationService } from './locationService';
import type { Location } from '../types/schema';

/**
 * Audio Scheduler Service
 * Evaluates audio schedules and automatically starts/stops audio playback
 */
class AudioSchedulerService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private checkIntervalMs = 60000; // Check every minute
  private activeSchedules = new Map<string, string>(); // locationId -> scheduleId

  /**
   * Start the scheduler
   */
  start(orgId: string) {
    if (this.intervalId) {
      console.warn('Audio scheduler already running');
      return;
    }

    console.log('Starting audio scheduler');
    
    // Run immediately on start
    this.checkSchedules(orgId);
    
    // Then run every minute
    this.intervalId = setInterval(() => {
      this.checkSchedules(orgId);
    }, this.checkIntervalMs);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.activeSchedules.clear();
      console.log('Audio scheduler stopped');
    }
  }

  /**
   * Check all locations and evaluate their schedules
   */
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

  /**
   * Evaluate a single location's schedule
   */
  private async evaluateLocationSchedule(_orgId: string, location: Location) {
    if (!location.audioConfig?.schedule || location.audioConfig.schedule.length === 0) {
      return;
    }

    const activeSchedule = AudioService.getActiveSchedule(location.audioConfig.schedule);
    const currentActiveScheduleId = this.activeSchedules.get(location.id);

    // If there's an active schedule
    if (activeSchedule) {
      // If this is a new active schedule (different from current)
      if (currentActiveScheduleId !== activeSchedule.id) {
        console.log(`Starting scheduled audio for location ${location.name} (${location.id})`);
        
        try {
          // Start audio playback
          await AudioService.startLocationAudio(
            location.id,
            location.audioConfig.assetId || '',
            location.audioConfig.volume || 50,
            location.audioConfig.loop || false,
            location.audioConfig.excludedScreenIds || []
          );
          
          this.activeSchedules.set(location.id, activeSchedule.id);
        } catch (error) {
          console.error(`Failed to start scheduled audio for location ${location.id}:`, error);
        }
      }
      // else: schedule is already active, no action needed
    } else {
      // No active schedule
      if (currentActiveScheduleId) {
        // There was a schedule active before, but not anymore - stop audio
        console.log(`Stopping scheduled audio for location ${location.name} (${location.id})`);
        
        try {
          await AudioService.stopLocationAudio(location.id);
          this.activeSchedules.delete(location.id);
        } catch (error) {
          console.error(`Failed to stop scheduled audio for location ${location.id}:`, error);
        }
      }
    }
  }

  /**
   * Manually trigger a schedule check for a specific location
   */
  async checkLocationNow(orgId: string, locationId: string) {
    try {
      const location = await LocationService.getLocation(orgId, locationId);
      if (location) {
        await this.evaluateLocationSchedule(orgId, location);
      }
    } catch (error) {
      console.error(`Error checking schedule for location ${locationId}:`, error);
    }
  }
}

export const audioScheduler = new AudioSchedulerService();
