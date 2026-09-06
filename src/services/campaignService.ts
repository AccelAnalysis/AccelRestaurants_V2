import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc,
  type Unsubscribe 
} from 'firebase/firestore';
import { functions, db } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';

export interface ScreenSession {
  screenSessionId: string;
  wsUrl?: string;
  mode?: 'firestore' | 'websocket';
}

export interface TriggerEvent {
  triggerId: string;
  type: string;
  campaignId: string;
  payload: Record<string, unknown>;
}

class CampaignService {
  private unsubscribe: Unsubscribe | null = null;

  /**
   * Flow 1: Create a screen session and get connection details
   */
  async createScreenSession(screenId: string): Promise<ScreenSession> {
    try {
      const createSession = httpsCallable(functions, 'createScreenSession');
      const result = await createSession({ screenId });
      return result.data as ScreenSession;
    } catch {
      throw new Error('Failed to create screen session');
    }
  }

  async sendHeartbeat(screenId: string): Promise<void> {
    try {
      const sendHeartbeatFn = httpsCallable(functions, 'sendHeartbeat');
      await sendHeartbeatFn({ screenId });
    } catch {
      // Silent fail for heartbeat
    }
  }

  /**
   * Connect to real-time session triggers
   */
  connect(session: ScreenSession, onTrigger: (event: TriggerEvent) => void) {
    this.disconnect(); // Ensure clean state

    if (session.mode === 'firestore' || !session.wsUrl) {
      this.connectFirestore(session.screenSessionId, onTrigger);
    }
  }

  private connectFirestore(screenSessionId: string, onTrigger: (event: TriggerEvent) => void) {
    const triggersRef = collection(db, `screen_sessions/${screenSessionId}/triggers`);
    // Listen for new triggers. New sessions start empty, so we catch all added docs.
    const q = query(triggersRef, orderBy('createdAt', 'asc'));

    this.unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const triggerEvent: TriggerEvent = {
              triggerId: change.doc.id,
              type: data.type,
              campaignId: data.campaignId,
              payload: data.payload
            };
            onTrigger(triggerEvent);
          }
        });
      },
      (error) => {
        console.error('Campaign trigger listener failed:', error);
      }
    );
  }

  /**
   * Mark a command as processed so it doesn't fire again
   */
  async markCommandProcessed(sessionId: string, triggerId: string) {
    try {
      const triggerRef = doc(db, `screen_sessions/${sessionId}/triggers/${triggerId}`);
      await updateDoc(triggerRef, { processed: true });
    } catch (e) {
      console.error('Failed to ack command', e);
    }
  }

  /**
   * Generate Pairing QR Data
   */
  getPairingData(screenId: string, pairingCode: string) {
    return {
      screenId,
      pairingCode,
      timestamp: Date.now()
    };
  }

  disconnect() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

export const campaignService = new CampaignService();
