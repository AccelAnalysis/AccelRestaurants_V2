
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  increment, 
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface PollData {
  question: string;
  options: string[];
  votes: Record<string, number>; // optionIndex -> count
  totalVotes: number;
}

export const PollService = {
  /**
   * Subscribe to real-time poll results
   */
  subscribeToPoll: (pollId: string, callback: (data: PollData | null) => void) => {
    if (!pollId) return () => {};

    const docRef = doc(db, 'polls', pollId);
    
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as PollData);
        } else {
          callback(null);
        }
      },
      () => {
        callback(null);
      }
    );
  },

  /**
   * Initialize a poll if it doesn't exist
   */
  initializePoll: async (pollId: string, question: string, options: string[]) => {
    if (!pollId) return;

    const docRef = doc(db, 'polls', pollId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      await setDoc(docRef, {
        question,
        options,
        votes: {},
        totalVotes: 0,
        createdAt: serverTimestamp()
      });
    } else {
        // Optional: Update question/options if they changed in the editor?
        // For now, let's preserve existing votes and only update if needed.
        // If we want to reset, we'd need a separate action.
        const data = snap.data();
        if (data.question !== question || JSON.stringify(data.options) !== JSON.stringify(options)) {
             // Decide strategy: update metadata but keep votes? Or reset?
             // Safest is update metadata.
             await updateDoc(docRef, { question, options });
        }
    }
  },

  /**
   * Cast a vote
   */
  vote: async (pollId: string, optionIndex: number) => {
    if (!pollId) return;

    const docRef = doc(db, 'polls', pollId);
    
    // Use increment for atomic updates
    await updateDoc(docRef, {
      [`votes.${optionIndex}`]: increment(1),
      totalVotes: increment(1),
      lastVoteAt: serverTimestamp()
    });
  }
};
