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
import type { Menu } from '../types/schema';
import { FIRESTORE_COLLECTIONS } from '../lib/constants';
import { ActivityService } from './activityService';

const COLLECTION_NAME = FIRESTORE_COLLECTIONS.MENUS;

export const MenuService = {
  /**
   * Fetch all menus for a specific organization
   */
  getMenus: async (orgId: string): Promise<Menu[]> => {
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
      } as Menu));
    } catch (error) {
      console.error('Error fetching menus:', error);
      throw new Error('Failed to load menus.');
    }
  },

  /**
   * Fetch a single menu by ID
   */
  getMenu: async (menuId: string): Promise<Menu | null> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, menuId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Menu;
      } else {
        return null;
      }
    } catch {
      throw new Error('Failed to load menu.');
    }
  },

  /**
   * Create a new menu
   */
  createMenu: async (menuData: Omit<Menu, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
      // Deep sanitize to remove undefined values from nested arrays/objects
      const sanitizedData = JSON.parse(JSON.stringify(menuData));
      
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...sanitizedData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Log activity
      const user = auth.currentUser;
      if (user) {
        ActivityService.logActivity(
          menuData.orgId,
          user.uid,
          'create',
          'menu',
          docRef.id,
          menuData.name,
          'Created new menu',
          user.displayName || undefined,
          user.photoURL || undefined
        );
      }

      return docRef.id;
    } catch (error) {
      console.error('Error creating menu:', error);
      throw new Error('Failed to create menu.');
    }
  },

  /**
   * Update an existing menu
   */
  updateMenu: async (menuId: string, menuData: Partial<Omit<Menu, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    try {
      // Deep sanitize to remove undefined values
      const sanitizedData = JSON.parse(JSON.stringify(menuData));

      const docRef = doc(db, COLLECTION_NAME, menuId);
      await updateDoc(docRef, {
        ...sanitizedData,
        updatedAt: serverTimestamp()
      });

      // Log activity
      const user = auth.currentUser;
      if (user) {
        // Optimistically log if we have the name, otherwise we might skip name or fetch it (skipping fetch for perf)
        // If name is being updated, use it. If not, ideally we'd have it from state or context.
        // For now, logging generic "Updated menu" if name missing.
        getDoc(docRef).then(snap => {
          if (snap.exists()) {
            const data = snap.data() as Menu;
            ActivityService.logActivity(
              data.orgId,
              user.uid,
              'update',
              'menu',
              menuId,
              menuData.name || data.name,
              'Updated menu',
              user.displayName || undefined,
              user.photoURL || undefined
            );
          }
        });
      }

    } catch (error) {
      console.error('Error updating menu:', error);
      throw new Error('Failed to update menu.');
    }
  },

  /**
   * Delete a menu
   */
  deleteMenu: async (menuId: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, menuId);
      
      // Fetch before delete to get orgId for logging
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const menuData = docSnap.data() as Menu;
        
        await deleteDoc(docRef);

        // Log activity
        const user = auth.currentUser;
        if (user) {
          ActivityService.logActivity(
            menuData.orgId,
            user.uid,
            'delete',
            'menu',
            menuId,
            menuData.name,
            'Deleted menu',
            user.displayName || undefined,
            user.photoURL || undefined
          );
        }
      } else {
        await deleteDoc(docRef); // Just delete if not found? Or throw.
      }
    } catch {
      throw new Error('Failed to delete menu.');
    }
  }
};
