import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  increment, 
  serverTimestamp, 
  orderBy,
  Timestamp,
  getCountFromServer
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const METRICS_COLLECTION = 'daily_metrics';

export interface DailyMetric {
  id: string; // YYYY-MM-DD
  date: string;
  orgId: string;
  screenViews: number;
  activeScreens: number;
  uptimeMinutes: number;
  updatedAt: Timestamp;
}

export const AnalyticsService = {
  /**
   * Log a screen heartbeat (for uptime tracking)
   * Should be called every minute by active screens
   */
  logHeartbeat: async (orgId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const docId = `${orgId}_${today}`;
    const docRef = doc(db, METRICS_COLLECTION, docId);

    try {
      await setDoc(docRef, {
        id: today,
        date: today,
        orgId,
        uptimeMinutes: increment(1),
        activeScreens: increment(0), // Just to ensure field exists
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Failed to log heartbeat:', error);
    }
  },

  /**
   * Log screen views (content impressions)
   */
  logView: async (orgId: string, count = 1) => {
    const today = new Date().toISOString().split('T')[0];
    const docId = `${orgId}_${today}`;
    const docRef = doc(db, METRICS_COLLECTION, docId);

    try {
      await setDoc(docRef, {
        id: today,
        date: today,
        orgId,
        screenViews: increment(count),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Failed to log view:', error);
    }
  },

  /**
   * Get metrics for the last N days
   */
  getMetrics: async (orgId: string, days = 7): Promise<DailyMetric[]> => {
    try {
      // Calculate start date
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const q = query(
        collection(db, METRICS_COLLECTION),
        where('orgId', '==', orgId),
        where('date', '>=', startDateStr),
        orderBy('date', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const metrics = querySnapshot.docs.map(doc => doc.data() as DailyMetric);

      // Fill in missing days if necessary (optional, doing basic return for now)
      
      return metrics;
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      return [];
    }
  },

  /**
   * Generate zeroed metrics for when no data exists
   */
  getEmptyMetrics: (days = 7): DailyMetric[] => {
    const metrics: DailyMetric[] = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      metrics.push({
        id: dateStr,
        date: dateStr,
        orgId: 'empty',
        screenViews: 0,
        activeScreens: 0,
        uptimeMinutes: 0,
        updatedAt: Timestamp.now()
      });
    }
    
    return metrics;
  },

  /**
   * Get total number of QR scans for an organization
   */
  getQRScanCount: async (orgId: string): Promise<number> => {
    try {
      const q = query(
        collection(db, 'qr_scans'),
        where('orgId', '==', orgId)
      );
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error('Failed to count QR scans:', error);
      return 0;
    }
  }
};
