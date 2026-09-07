import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { Slide } from '../types/schema';
import { FIRESTORE_COLLECTIONS } from '../lib/constants';
import { ActivityService } from './activityService';

const COLLECTION_NAME = FIRESTORE_COLLECTIONS.SLIDES;

export const SlideService = {
  /**
   * Fetch all slides for a specific organization
   */
  getSlides: async (orgId: string): Promise<Slide[]> => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        where('orgId', '==', orgId),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Slide));
    } catch (error) {
      console.error('Error loading slides:', error);
      throw error;
    }
  },

  /**
   * Fetch a single slide by ID
   */
  getSlide: async (slideId: string): Promise<Slide | null> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, slideId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Slide;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error loading slide:', error);
      throw error;
    }
  },

  /**
   * Create a new slide
   */
  createSlide: async (slideData: Omit<Slide, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...slideData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Log activity
      const user = auth.currentUser;
      if (user) {
        ActivityService.logActivity(
          slideData.orgId,
          user.uid,
          'create',
          'slide',
          docRef.id,
          slideData.name,
          'Created new slide',
          user.displayName || undefined,
          user.photoURL || undefined
        );
      }

      return docRef.id;
    } catch (error) {
      console.error('Error creating slide:', error);
      throw error;
    }
  },

  /**
   * Update an existing slide
   */
  updateSlide: async (slideId: string, slideData: Partial<Omit<Slide, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, slideId);
      await updateDoc(docRef, {
        ...slideData,
        updatedAt: serverTimestamp()
      });

      // Log activity
      const user = auth.currentUser;
      if (user) {
        getDoc(docRef).then(snap => {
          if (snap.exists()) {
            const data = snap.data() as Slide;
            ActivityService.logActivity(
              data.orgId,
              user.uid,
              'update',
              'slide',
              slideId,
              slideData.name || data.name,
              'Updated slide',
              user.displayName || undefined,
              user.photoURL || undefined
            );
          }
        });
      }

    } catch (error) {
      console.error('Error updating slide:', error);
      throw error;
    }
  },

  /**
   * Delete a slide
   */
  deleteSlide: async (slideId: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, slideId);
      
      // Fetch before delete for logging
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const slideData = docSnap.data() as Slide;
        
        await deleteDoc(docRef);

        // Log activity
        const user = auth.currentUser;
        if (user) {
          ActivityService.logActivity(
            slideData.orgId,
            user.uid,
            'delete',
            'slide',
            slideId,
            slideData.name,
            'Deleted slide',
            user.displayName || undefined,
            user.photoURL || undefined
          );
        }
      } else {
        await deleteDoc(docRef);
      }
    } catch (error) {
      console.error('Error deleting slide:', error);
      throw error;
    }
  },

  /**
   * Duplicate a slide
   */
  duplicateSlide: async (slideId: string): Promise<string> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, slideId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Slide not found');
      }

      const originalSlide = docSnap.data() as Slide;
      
      // Create a copy with a new name
      const duplicatedSlideData: Omit<Slide, 'id' | 'createdAt' | 'updatedAt'> = {
        orgId: originalSlide.orgId,
        name: `${originalSlide.name} (Copy)`,
        dimensions: { ...originalSlide.dimensions },
        orientation: originalSlide.orientation,
        backgroundColor: originalSlide.backgroundColor,
        elements: originalSlide.elements.map(element => ({ ...element })),
      };

      // Copy optional properties if they exist
      if (originalSlide.backgroundImageUrl) {
        duplicatedSlideData.backgroundImageUrl = originalSlide.backgroundImageUrl;
      }
      if (originalSlide.particleConfig) {
        duplicatedSlideData.particleConfig = { ...originalSlide.particleConfig };
      }
      if (originalSlide.duration) {
        duplicatedSlideData.duration = originalSlide.duration;
      }

      const newDocRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...duplicatedSlideData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Log activity
      const user = auth.currentUser;
      if (user) {
        ActivityService.logActivity(
          originalSlide.orgId,
          user.uid,
          'create',
          'slide',
          newDocRef.id,
          duplicatedSlideData.name,
          `Duplicated slide from "${originalSlide.name}"`,
          user.displayName || undefined,
          user.photoURL || undefined
        );
      }

      return newDocRef.id;
    } catch (error) {
      console.error('Error duplicating slide:', error);
      throw error;
    }
  },
};
