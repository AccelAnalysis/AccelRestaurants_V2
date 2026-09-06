import { 
  collection, 
  getDocs, 
  getDoc,
  query, 
  orderBy, 
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FIRESTORE_COLLECTIONS } from '../lib/constants';
import type { Organization, UserProfile, SystemTemplate } from '../types/schema';

const COLLECTION_NAME = FIRESTORE_COLLECTIONS.ORGANIZATIONS;

export const AdminService = {
  /**
   * Fetch all system templates (Admin only)
   */
  getSystemTemplates: async (): Promise<SystemTemplate[]> => {
    try {
      const q = query(collection(db, 'system_templates'), orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemTemplate));
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  },

  /**
   * Update a system template (Admin only)
   */
  updateSystemTemplate: async (id: string, updates: Partial<SystemTemplate>): Promise<void> => {
    try {
      await updateDoc(doc(db, 'system_templates', id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  },

  /**
   * Fetch all organizations (Admin only)
   */
  getAllOrganizations: async (): Promise<Organization[]> => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Organization));
    } catch {
      throw new Error('Failed to load organizations.');
    }
  },

  /**
   * Get a user profile by ID (Admin only)
   */
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch {
      throw new Error('Failed to load user profile.');
    }
  },

  /**
   * Update an organization's plan (Admin only)
   */
  updateOrgPlan: async (orgId: string, plan: Organization['plan']): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, orgId);
      await updateDoc(docRef, {
        plan,
        updatedAt: serverTimestamp()
      });
    } catch {
      throw new Error('Failed to update organization plan.');
    }
  },

  /**
   * Update an organization's custom limits (Admin only)
   */
  updateOrgLimits: async (orgId: string, limits: { seats?: number; screens?: number }): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, orgId);
      await updateDoc(docRef, {
        customLimits: limits,
        updatedAt: serverTimestamp()
      });
    } catch {
      throw new Error('Failed to update organization limits.');
    }
  },

  /**
   * Update an organization's tile access (Admin only)
   */
  updateOrgTileAccess: async (orgId: string, tileAccess: Organization['tileAccess']): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, orgId);
      await updateDoc(docRef, {
        tileAccess,
        updatedAt: serverTimestamp()
      });
    } catch {
      throw new Error('Failed to update organization tile access.');
    }
  }
};
