import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Location, LocationGroup } from '../types/schema';

 const removeUndefinedFields = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
   return Object.fromEntries(
     Object.entries(obj).filter(([, value]) => value !== undefined)
   ) as Partial<T>;
 };

export const LocationService = {
  /**
   * Get all locations for an organization
   */
  getLocations: async (orgId: string): Promise<Location[]> => {
    try {
      const q = query(
        collection(db, 'organizations', orgId, 'locations'),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Location));
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw new Error('Failed to load locations.');
    }
  },

  /**
   * Get a single location
   */
  getLocation: async (orgId: string, locationId: string): Promise<Location | null> => {
    try {
      const docRef = doc(db, 'organizations', orgId, 'locations', locationId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Location;
      }
      return null;
    } catch (error) {
      console.error('Error fetching location:', error);
      throw new Error('Failed to load location.');
    }
  },

  /**
   * Create a new location
   */
  createLocation: async (orgId: string, locationData: Omit<Location, 'id' | 'createdAt'>): Promise<string> => {
    try {
      const sanitizedData = removeUndefinedFields(locationData as unknown as Record<string, unknown>);
      const docRef = await addDoc(collection(db, 'organizations', orgId, 'locations'), {
        ...sanitizedData,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating location:', error);
      throw new Error('Failed to create location.');
    }
  },

  /**
   * Update a location
   */
  updateLocation: async (orgId: string, locationId: string, updates: Partial<Omit<Location, 'id' | 'createdAt'>>): Promise<void> => {
    try {
      const docRef = doc(db, 'organizations', orgId, 'locations', locationId);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating location:', error);
      throw new Error('Failed to update location.');
    }
  },

  /**
   * Delete a location
   */
  deleteLocation: async (orgId: string, locationId: string): Promise<void> => {
    try {
      const docRef = doc(db, 'organizations', orgId, 'locations', locationId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting location:', error);
      throw new Error('Failed to delete location.');
    }
  },

  // --- Location Groups ---

  /**
   * Get all location groups for an organization
   */
  getLocationGroups: async (orgId: string): Promise<LocationGroup[]> => {
    try {
      const q = query(
        collection(db, 'organizations', orgId, 'location_groups'),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as LocationGroup));
    } catch (error) {
      console.error('Error fetching location groups:', error);
      throw new Error('Failed to load location groups.');
    }
  },

  /**
   * Create a new location group
   */
  createLocationGroup: async (orgId: string, groupData: Omit<LocationGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, 'organizations', orgId, 'location_groups'), {
        ...groupData,
        orgId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating location group:', error);
      throw new Error('Failed to create location group.');
    }
  },

  /**
   * Update a location group
   */
  updateLocationGroup: async (orgId: string, groupId: string, updates: Partial<Omit<LocationGroup, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    try {
      const docRef = doc(db, 'organizations', orgId, 'location_groups', groupId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating location group:', error);
      throw new Error('Failed to update location group.');
    }
  },

  /**
   * Delete a location group
   */
  deleteLocationGroup: async (orgId: string, groupId: string): Promise<void> => {
    try {
      const docRef = doc(db, 'organizations', orgId, 'location_groups', groupId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting location group:', error);
      throw new Error('Failed to delete location group.');
    }
  }
};
