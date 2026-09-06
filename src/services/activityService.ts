import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ActivityLog } from '../types/schema';

const COLLECTION_NAME = 'activities';

export const ActivityService = {
  /**
   * Log a new activity
   */
  logActivity: async (
    orgId: string, 
    userId: string, 
    action: ActivityLog['action'], 
    resourceType: ActivityLog['resourceType'], 
    resourceId?: string, 
    resourceName?: string,
    details?: string,
    userDisplayName?: string,
    userPhotoURL?: string
  ): Promise<string> => {
    try {
      const activityData: Record<string, unknown> = {
        orgId,
        userId,
        action,
        resourceType,
        createdAt: serverTimestamp()
      };

      if (resourceId) activityData.resourceId = resourceId;
      if (resourceName) activityData.resourceName = resourceName;
      if (details) activityData.details = details;
      if (userDisplayName) activityData.userDisplayName = userDisplayName;
      if (userPhotoURL) activityData.userPhotoURL = userPhotoURL;

      const docRef = await addDoc(collection(db, COLLECTION_NAME), activityData);
      return docRef.id;
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw, just fail silently to not block the main action
      return '';
    }
  },

  /**
   * Get recent activities for an organization
   */
  getRecentActivities: async (orgId: string, limitCount = 20): Promise<ActivityLog[]> => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('orgId', '==', orgId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActivityLog));
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      throw new Error('Failed to load recent activity.');
    }
  }
};
