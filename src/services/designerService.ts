import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { db, functions } from '../lib/firebase';
import type { DesignerProfile, DesignerInvite } from '../types/schema';
import { FIRESTORE_COLLECTIONS } from '../lib/constants';
import { httpsCallable } from 'firebase/functions';

const COLLECTION_NAME = FIRESTORE_COLLECTIONS.DESIGNERS;
const INVITES_COLLECTION = 'designer_invites';

export const DesignerService = {
  /**
   * Fetch all designers (for super admin or marketplace)
   */
  getAllDesigners: async (): Promise<DesignerProfile[]> => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      } as DesignerProfile));
    } catch {
      throw new Error('Failed to load designers.');
    }
  },

  /**
   * Fetch active designers (for marketplace)
   */
  getActiveDesigners: async (): Promise<DesignerProfile[]> => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('status', '==', 'active'),
        orderBy('rating', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      } as DesignerProfile));
    } catch {
      throw new Error('Failed to load active designers.');
    }
  },

  /**
   * Get a single designer profile
   */
  getDesigner: async (uid: string): Promise<DesignerProfile | null> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), uid: docSnap.id } as DesignerProfile;
      }
      return null;
    } catch {
      throw new Error('Failed to load designer profile.');
    }
  },

  /**
   * Create or update a designer profile
   */
  updateProfile: async (uid: string, data: Partial<DesignerProfile>): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, uid);
      await setDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch {
      throw new Error('Failed to update designer profile.');
    }
  },

  /**
   * Invite a designer (Creates an invite record and triggers email)
   */
  inviteDesigner: async (email: string, name: string, invitedBy: string): Promise<{ id: string, warning?: string, inviteLink?: string }> => {
    try {
      // Create invite record
      const inviteData = {
        email: email.toLowerCase(),
        name,
        invitedBy,
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt: new Timestamp(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, 0), // 7 days
      };
      
      const docRef = await addDoc(collection(db, INVITES_COLLECTION), inviteData);
      
      // Trigger email (Cloud Function would handle this in production based on create trigger or manual call)
      const sendDesignerInviteEmail = httpsCallable(functions, 'sendDesignerInviteEmail');
      const result = await sendDesignerInviteEmail({ inviteId: docRef.id, email, name });
      const data = result.data as { success: boolean; warning?: string; inviteLink?: string };

      return { 
        id: docRef.id,
        warning: data.warning,
        inviteLink: data.inviteLink
      };
    } catch (error) {
      console.error('Invite designer error:', error);
      throw new Error('Failed to invite designer.');
    }
  },

  /**
   * Fetch all designer invites (for super admin)
   */
  getDesignerInvites: async (): Promise<DesignerInvite[]> => {
    try {
      const q = query(
        collection(db, INVITES_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DesignerInvite));
    } catch {
      throw new Error('Failed to load designer invites.');
    }
  },

  /**
   * Revoke a designer invite
   */
  revokeInvite: async (inviteId: string): Promise<void> => {
    try {
      const docRef = doc(db, INVITES_COLLECTION, inviteId);
      await updateDoc(docRef, {
        status: 'revoked'
      });
    } catch {
      throw new Error('Failed to revoke invite.');
    }
  }
};
