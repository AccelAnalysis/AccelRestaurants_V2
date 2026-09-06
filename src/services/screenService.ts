import { 
  collection, 
  query, 
  getDocs, 
  runTransaction,
  increment,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db, auth, functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { FIRESTORE_COLLECTIONS } from '../lib/constants';
import type { AppScreen } from '../types/schema';
import { ActivityService } from './activityService';

const COLLECTION_NAME = FIRESTORE_COLLECTIONS.SCREENS;

export const ScreenService = {
  /**
   * Fetch all screens for a specific organization
   */
  getScreens: async (orgId: string): Promise<AppScreen[]> => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        where('orgId', '==', orgId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AppScreen));
    } catch (error) {
      console.error('Error loading screens:', error);
      throw error;
    }
  },

  /**
   * Fetch a single screen by ID
   */
  getScreen: async (screenId: string): Promise<AppScreen | null> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, screenId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as AppScreen;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error loading screen:', error);
      throw error;
    }
  },

  /**
   * Create a new screen and update org screen count
   */
  createScreen: async (screenData: Omit<AppScreen, 'id' | 'createdAt'>): Promise<string> => {
    try {
      const screenId = await runTransaction(db, async (transaction) => {
        // Create ref for new screen
        const screenRef = doc(collection(db, COLLECTION_NAME));
        
        // Get org ref to update count
        const orgRef = doc(db, FIRESTORE_COLLECTIONS.ORGANIZATIONS, screenData.orgId);
        
        // Write new screen
        transaction.set(screenRef, {
          ...screenData,
          createdAt: serverTimestamp()
        });

        // Increment screen count
        transaction.update(orgRef, {
          screenCount: increment(1),
          updatedAt: serverTimestamp()
        });

        return screenRef.id;
      });

      // Log activity
      const user = auth.currentUser;
      if (user) {
        ActivityService.logActivity(
          screenData.orgId,
          user.uid,
          'create',
          'screen',
          screenId,
          screenData.name,
          'Created new screen',
          user.displayName || undefined,
          user.photoURL || undefined
        );
      }

      return screenId;
    } catch (error) {
      console.error('Error creating screen:', error);
      throw new Error('Failed to create screen. Please try again.');
    }
  },

  /**
   * Update an existing screen
   */
  updateScreen: async (screenId: string, screenData: Partial<Omit<AppScreen, 'id' | 'createdAt'>>): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, screenId);
      await updateDoc(docRef, {
        ...screenData
      });

      // Log activity (fire and forget)
      const user = auth.currentUser;
      if (user) {
        getDoc(docRef).then(snap => {
          if (snap.exists()) {
            const data = snap.data() as AppScreen;
            ActivityService.logActivity(
              data.orgId,
              user.uid,
              'update',
              'screen',
              screenId,
              screenData.name || data.name,
              'Updated screen settings',
              user.displayName || undefined,
              user.photoURL || undefined
            );
          }
        });
      }

    } catch (error) {
      console.error('Error updating screen:', error);
      throw error;
    }
  },

  /**
   * Delete a screen and decrement org screen count
   */
  deleteScreen: async (screenId: string): Promise<void> => {
    try {
      const screenData = await runTransaction(db, async (transaction) => {
        const screenRef = doc(db, COLLECTION_NAME, screenId);
        const screenSnap = await transaction.get(screenRef);
        
        if (!screenSnap.exists()) {
          throw new Error('Screen does not exist');
        }

        const data = screenSnap.data() as AppScreen;
        const orgRef = doc(db, FIRESTORE_COLLECTIONS.ORGANIZATIONS, data.orgId);

        transaction.delete(screenRef);
        transaction.update(orgRef, {
          screenCount: increment(-1),
          updatedAt: serverTimestamp()
        });
        
        return data;
      });

      // Log activity
      const user = auth.currentUser;
      if (user) {
        ActivityService.logActivity(
          screenData.orgId,
          user.uid,
          'delete',
          'screen',
          screenId,
          screenData.name,
          'Deleted screen',
          user.displayName || undefined,
          user.photoURL || undefined
        );
      }

    } catch (error) {
      console.error('Error deleting screen:', error);
      throw new Error('Failed to delete screen. Please try again.');
    }
  },

  /**
   * Subscribe to screen updates
   */
  subscribeToScreen: (screenId: string, callback: (screen: AppScreen | null) => void) => {
    const docRef = doc(db, COLLECTION_NAME, screenId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as AppScreen);
      } else {
        callback(null);
      }
    }, () => {
      // Log error internally, but don't expose to user
      callback(null);
    });
  },

  /**
   * Request a new pairing code for a screen
   */
  requestPairingCode: async (screenId: string): Promise<{ code: string; expiresAt: number }> => {
    try {
      const requestPairingCodeFn = httpsCallable<{ screenId: string }, { code: string; expiresAt: number }>(functions, 'requestPairingCode');
      const result = await requestPairingCodeFn({ screenId });
      return result.data;
    } catch (error) {
      console.error('Error requesting pairing code:', error);
      throw new Error('Failed to generate pairing code');
    }
  }
};
