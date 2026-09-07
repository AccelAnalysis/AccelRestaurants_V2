import { 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FIRESTORE_COLLECTIONS } from '../lib/constants';
import type { Organization } from '../types/schema';

const COLLECTION_NAME = FIRESTORE_COLLECTIONS.ORGANIZATIONS;

export const OrganizationService = {
  /**
   * Fetch an organization by ID
   */
  getOrganization: async (orgId: string): Promise<Organization | null> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, orgId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Organization;
      } else {
        return null;
      }
    } catch {
      throw new Error('Failed to load organization.');
    }
  },

  /**
   * Fetch a public organization configuration by ID
   * Use this for public-facing views like the Player
   */
  getPublicOrganization: async (orgId: string): Promise<Organization | null> => {
    try {
      // Try fetching from the dedicated public collection first
      const publicDocRef = doc(db, 'public_organizations', orgId);
      const publicDocSnap = await getDoc(publicDocRef);

      if (publicDocSnap.exists()) {
        return { id: publicDocSnap.id, ...publicDocSnap.data() } as Organization;
      }
      
      // Fallback: If public doc doesn't exist (yet), try the main collection
      // This might fail if rules are already tightened, but provides a transition path
      // OR if we are actually an admin previewing the player
      const docRef = doc(db, COLLECTION_NAME, orgId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Organization;
      } else {
        return null;
      }
    } catch {
      // Don't throw here, just return null so the player can handle it gracefully (e.g. show default branding)
      console.warn('Failed to load public organization data.');
      return null;
    }
  },

  /**
   * Update organization details
   */
  updateOrganization: async (orgId: string, updates: Partial<Organization>): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, orgId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch {
      throw new Error('Failed to update organization.');
    }
  },

  /**
   * Add a member to the organization
   */
  addMember: async (orgId: string, userId: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, orgId);
      await updateDoc(docRef, {
        members: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });
    } catch {
      throw new Error('Failed to add member.');
    }
  },

  /**
   * Remove a member from the organization
   */
  removeMember: async (orgId: string, userId: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, orgId);
      await updateDoc(docRef, {
        members: arrayRemove(userId),
        updatedAt: serverTimestamp()
      });
    } catch {
      throw new Error('Failed to remove member.');
    }
  }
};
