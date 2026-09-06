import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { UserProfile } from '../types/schema';

/**
 * Helper function to remove undefined values from an object
 * Firestore doesn't accept undefined values
 */
const removeUndefined = (obj: Record<string, unknown>): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
};

export const UserService = {
  /**
   * Update user profile
   */
  updateProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
    try {
      const docRef = doc(db, 'users', uid);
      // Filter out undefined values before sending to Firestore
      const cleanedData = removeUndefined(data);
      await updateDoc(docRef, cleanedData);
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw new Error('Failed to update user profile.');
    }
  }
};
