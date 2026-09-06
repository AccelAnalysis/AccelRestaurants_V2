import { 
  doc, 
  getDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import type { LocationAudioSync, AudioSchedule } from '../types/schema';

const AUDIO_SYNC_COLLECTION = 'location_audio_sync';

export const AudioService = {
  /**
   * Start synchronized audio playback across a location
   */
  startLocationAudio: async (
    locationId: string,
    assetId: string,
    volume: number,
    loop: boolean,
    excludedScreenIds: string[],
    scheduledStartTime?: Date
  ): Promise<void> => {
    try {
      const startLocationAudioFn = httpsCallable<{
        locationId: string;
        assetId: string;
        volume: number;
        loop: boolean;
        excludedScreenIds: string[];
        scheduledStartTime?: number;
      }, void>(functions, 'startLocationAudio');

      await startLocationAudioFn({
        locationId,
        assetId,
        volume,
        loop,
        excludedScreenIds,
        scheduledStartTime: scheduledStartTime ? scheduledStartTime.getTime() : undefined
      });
    } catch (error) {
      console.error('Error starting location audio:', error);
      throw new Error('Failed to start audio playback');
    }
  },

  /**
   * Stop audio playback across a location
   */
  stopLocationAudio: async (locationId: string): Promise<void> => {
    try {
      const stopLocationAudioFn = httpsCallable<{
        locationId: string;
      }, void>(functions, 'stopLocationAudio');

      await stopLocationAudioFn({ locationId });
    } catch (error) {
      console.error('Error stopping location audio:', error);
      throw new Error('Failed to stop audio playback');
    }
  },

  /**
   * Update volume for location audio
   */
  updateLocationVolume: async (locationId: string, volume: number): Promise<void> => {
    try {
      const docRef = doc(db, AUDIO_SYNC_COLLECTION, locationId);
      await updateDoc(docRef, {
        volume,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating volume:', error);
      throw new Error('Failed to update volume');
    }
  },

  /**
   * Update excluded screens for location audio
   */
  updateAudioExclusions: async (locationId: string, excludedScreenIds: string[]): Promise<void> => {
    try {
      const docRef = doc(db, AUDIO_SYNC_COLLECTION, locationId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          excludedScreenIds,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating audio exclusions:', error);
      throw new Error('Failed to update audio exclusions');
    }
  },

  /**
   * Subscribe to location audio sync updates (real-time)
   */
  subscribeToLocationAudio: (
    locationId: string,
    callback: (sync: LocationAudioSync | null) => void
  ): (() => void) => {
    const docRef = doc(db, AUDIO_SYNC_COLLECTION, locationId);
    
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() } as LocationAudioSync);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Error in audio sync subscription:', error);
        callback(null);
      }
    );
  },

  /**
   * Get current audio sync state for a location
   */
  getLocationAudioSync: async (locationId: string): Promise<LocationAudioSync | null> => {
    try {
      const docRef = doc(db, AUDIO_SYNC_COLLECTION, locationId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as LocationAudioSync;
      }
      return null;
    } catch (error) {
      console.error('Error getting audio sync:', error);
      return null;
    }
  },

  /**
   * Save audio schedule for a location
   */
  saveAudioSchedule: async (
    orgId: string,
    locationId: string,
    schedule: Omit<AudioSchedule, 'id'>
  ): Promise<string> => {
    try {
      const scheduleId = crypto.randomUUID();
      const newSchedule: AudioSchedule = {
        id: scheduleId,
        ...schedule
      };

      // Update location's audioConfig with new schedule
      const locationRef = doc(db, 'organizations', orgId, 'locations', locationId);
      const locationSnap = await getDoc(locationRef);
      
      if (locationSnap.exists()) {
        const locationData = locationSnap.data();
        const currentSchedules = locationData.audioConfig?.schedule || [];
        
        await updateDoc(locationRef, {
          'audioConfig.schedule': [...currentSchedules, newSchedule]
        });
      }

      return scheduleId;
    } catch (error) {
      console.error('Error saving audio schedule:', error);
      throw new Error('Failed to save audio schedule');
    }
  },

  /**
   * Update an existing audio schedule
   */
  updateAudioSchedule: async (
    orgId: string,
    locationId: string,
    scheduleId: string,
    updates: Partial<Omit<AudioSchedule, 'id'>>
  ): Promise<void> => {
    try {
      const locationRef = doc(db, 'organizations', orgId, 'locations', locationId);
      const locationSnap = await getDoc(locationRef);
      
      if (locationSnap.exists()) {
        const locationData = locationSnap.data();
        const schedules = locationData.audioConfig?.schedule || [];
        
        const updatedSchedules = schedules.map((s: AudioSchedule) =>
          s.id === scheduleId ? { ...s, ...updates } : s
        );
        
        await updateDoc(locationRef, {
          'audioConfig.schedule': updatedSchedules
        });
      }
    } catch (error) {
      console.error('Error updating audio schedule:', error);
      throw new Error('Failed to update audio schedule');
    }
  },

  /**
   * Delete an audio schedule
   */
  deleteAudioSchedule: async (
    orgId: string,
    locationId: string,
    scheduleId: string
  ): Promise<void> => {
    try {
      const locationRef = doc(db, 'organizations', orgId, 'locations', locationId);
      const locationSnap = await getDoc(locationRef);
      
      if (locationSnap.exists()) {
        const locationData = locationSnap.data();
        const schedules = locationData.audioConfig?.schedule || [];
        
        const filteredSchedules = schedules.filter((s: AudioSchedule) => s.id !== scheduleId);
        
        await updateDoc(locationRef, {
          'audioConfig.schedule': filteredSchedules
        });
      }
    } catch (error) {
      console.error('Error deleting audio schedule:', error);
      throw new Error('Failed to delete audio schedule');
    }
  },

  /**
   * Get all audio schedules for a location
   */
  getAudioSchedules: async (
    orgId: string,
    locationId: string
  ): Promise<AudioSchedule[]> => {
    try {
      const locationRef = doc(db, 'organizations', orgId, 'locations', locationId);
      const locationSnap = await getDoc(locationRef);
      
      if (locationSnap.exists()) {
        const locationData = locationSnap.data();
        return locationData.audioConfig?.schedule || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting audio schedules:', error);
      return [];
    }
  },

  /**
   * Evaluate if a schedule should be active at current time
   */
  evaluateSchedule: (schedule: AudioSchedule, currentTime: Date): boolean => {
    if (!schedule.enabled) return false;

    const currentDay = currentTime.getDay(); // 0-6
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    // Check if current day is in schedule
    if (!schedule.daysOfWeek.includes(currentDay)) return false;

    // Parse start time
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    const startTimeMinutes = startHour * 60 + startMinute;

    // If no end time, check if we're past start time
    if (!schedule.endTime) {
      return currentTimeMinutes >= startTimeMinutes;
    }

    // Parse end time
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
    const endTimeMinutes = endHour * 60 + endMinute;

    // Check if current time is within range
    if (endTimeMinutes > startTimeMinutes) {
      // Normal case: start and end on same day
      return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
    } else {
      // Crosses midnight
      return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes < endTimeMinutes;
    }
  },

  /**
   * Get the currently active schedule (if any)
   */
  getActiveSchedule: (schedules: AudioSchedule[]): AudioSchedule | null => {
    const now = new Date();
    
    for (const schedule of schedules) {
      if (AudioService.evaluateSchedule(schedule, now)) {
        return schedule;
      }
    }
    
    return null;
  }
};
