import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import type {
  AudioSchedule,
  LocationAudioSync,
  LocationAudioConfig,
} from '../types/schema';

const AUDIO_SYNC_COLLECTION = 'location_audio_sync';

export const AudioService = {
  /** Start synchronized venue audio using a resolved Firebase Storage download URL. */
  startLocationAudio: async (
    orgId: string,
    locationId: string,
    mediaUrl: string,
    volume: number,
    loop: boolean,
    excludedScreenIds: string[],
    scheduledStartTime?: Date,
    storagePath?: string
  ): Promise<void> => {
    try {
      const startLocationAudioFn = httpsCallable<{
        orgId: string;
        locationId: string;
        mediaUrl: string;
        storagePath?: string;
        volume: number;
        loop: boolean;
        excludedScreenIds: string[];
        scheduledStartTime?: number;
      }, void>(functions, 'startLocationAudio');

      await startLocationAudioFn({
        orgId,
        locationId,
        mediaUrl,
        storagePath,
        volume,
        loop,
        excludedScreenIds,
        scheduledStartTime: scheduledStartTime?.getTime(),
      });
    } catch (error) {
      console.error('Error starting location audio:', error);
      throw new Error('Failed to start audio playback');
    }
  },

  /** Stop synchronized venue audio. */
  stopLocationAudio: async (orgId: string, locationId: string): Promise<void> => {
    try {
      const stopLocationAudioFn = httpsCallable<{
        orgId: string;
        locationId: string;
      }, void>(functions, 'stopLocationAudio');
      await stopLocationAudioFn({ orgId, locationId });
    } catch (error) {
      console.error('Error stopping location audio:', error);
      throw new Error('Failed to stop audio playback');
    }
  },

  /** Persist the venue audio experience on the organization/location document. */
  saveLocationAudioConfig: async (
    orgId: string,
    locationId: string,
    audioConfig: LocationAudioConfig
  ): Promise<void> => {
    const locationRef = doc(db, 'organizations', orgId, 'locations', locationId);
    await updateDoc(locationRef, { audioConfig });
  },

  /** Update live output volume and its durable venue setting. */
  updateLocationVolume: async (orgId: string, locationId: string, volume: number): Promise<void> => {
    try {
      const docRef = doc(db, AUDIO_SYNC_COLLECTION, locationId);
      const sync = await getDoc(docRef);
      if (sync.exists()) {
        await updateDoc(docRef, { volume, updatedAt: serverTimestamp() });
      }
      const locationRef = doc(db, 'organizations', orgId, 'locations', locationId);
      await updateDoc(locationRef, { 'audioConfig.volume': volume });
    } catch (error) {
      console.error('Error updating volume:', error);
      throw new Error('Failed to update volume');
    }
  },

  /** Update the screen exclusion list in live and durable Firebase state. */
  updateAudioExclusions: async (
    orgId: string,
    locationId: string,
    excludedScreenIds: string[]
  ): Promise<void> => {
    try {
      const docRef = doc(db, AUDIO_SYNC_COLLECTION, locationId);
      const sync = await getDoc(docRef);
      if (sync.exists()) {
        await updateDoc(docRef, { excludedScreenIds, updatedAt: serverTimestamp() });
      }
      const locationRef = doc(db, 'organizations', orgId, 'locations', locationId);
      await updateDoc(locationRef, { 'audioConfig.excludedScreenIds': excludedScreenIds });
    } catch (error) {
      console.error('Error updating audio exclusions:', error);
      throw new Error('Failed to update audio exclusions');
    }
  },

  /** Subscribe to the ephemeral live venue-audio command document. */
  subscribeToLocationAudio: (
    locationId: string,
    callback: (sync: LocationAudioSync | null) => void
  ): (() => void) => {
    const docRef = doc(db, AUDIO_SYNC_COLLECTION, locationId);
    return onSnapshot(
      docRef,
      docSnap => callback(docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as LocationAudioSync) : null),
      error => {
        console.error('Error in audio sync subscription:', error);
        callback(null);
      }
    );
  },

  getLocationAudioSync: async (locationId: string): Promise<LocationAudioSync | null> => {
    try {
      const docRef = doc(db, AUDIO_SYNC_COLLECTION, locationId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as LocationAudioSync) : null;
    } catch (error) {
      console.error('Error getting audio sync:', error);
      return null;
    }
  },

  saveAudioSchedule: async (
    orgId: string,
    locationId: string,
    schedule: Omit<AudioSchedule, 'id'>
  ): Promise<string> => {
    const scheduleId = crypto.randomUUID();
    const newSchedule: AudioSchedule = { id: scheduleId, ...schedule };
    const locationRef = doc(db, 'organizations', orgId, 'locations', locationId);
    const locationSnap = await getDoc(locationRef);
    if (!locationSnap.exists()) throw new Error('Location not found');
    const currentSchedules = locationSnap.data().audioConfig?.schedule || [];
    await updateDoc(locationRef, { 'audioConfig.schedule': [...currentSchedules, newSchedule] });
    return scheduleId;
  },

  updateAudioSchedule: async (
    orgId: string,
    locationId: string,
    scheduleId: string,
    updates: Partial<Omit<AudioSchedule, 'id'>>
  ): Promise<void> => {
    const locationRef = doc(db, 'organizations', orgId, 'locations', locationId);
    const locationSnap = await getDoc(locationRef);
    if (!locationSnap.exists()) throw new Error('Location not found');
    const schedules = locationSnap.data().audioConfig?.schedule || [];
    const updatedSchedules = schedules.map((schedule: AudioSchedule) =>
      schedule.id === scheduleId ? { ...schedule, ...updates } : schedule
    );
    await updateDoc(locationRef, { 'audioConfig.schedule': updatedSchedules });
  },

  deleteAudioSchedule: async (
    orgId: string,
    locationId: string,
    scheduleId: string
  ): Promise<void> => {
    const locationRef = doc(db, 'organizations', orgId, 'locations', locationId);
    const locationSnap = await getDoc(locationRef);
    if (!locationSnap.exists()) throw new Error('Location not found');
    const schedules = locationSnap.data().audioConfig?.schedule || [];
    await updateDoc(locationRef, {
      'audioConfig.schedule': schedules.filter((schedule: AudioSchedule) => schedule.id !== scheduleId),
    });
  },

  getAudioSchedules: async (orgId: string, locationId: string): Promise<AudioSchedule[]> => {
    try {
      const locationRef = doc(db, 'organizations', orgId, 'locations', locationId);
      const locationSnap = await getDoc(locationRef);
      return locationSnap.exists() ? (locationSnap.data().audioConfig?.schedule || []) : [];
    } catch (error) {
      console.error('Error getting audio schedules:', error);
      return [];
    }
  },

  evaluateSchedule: (schedule: AudioSchedule, currentTime: Date): boolean => {
    if (!schedule.enabled) return false;
    const currentDay = currentTime.getDay();
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    if (!schedule.endTime) return schedule.daysOfWeek.includes(currentDay) && currentMinutes >= startMinutes;
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
    const endMinutes = endHour * 60 + endMinute;
    if (endMinutes > startMinutes) {
      return schedule.daysOfWeek.includes(currentDay) && currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
    if (currentMinutes >= startMinutes) return schedule.daysOfWeek.includes(currentDay);
    const previousDay = (currentDay + 6) % 7;
    return currentMinutes < endMinutes && schedule.daysOfWeek.includes(previousDay);
  },

  getActiveSchedule: (schedules: AudioSchedule[]): AudioSchedule | null => {
    const now = new Date();
    return schedules.find(schedule => AudioService.evaluateSchedule(schedule, now)) || null;
  },
};
