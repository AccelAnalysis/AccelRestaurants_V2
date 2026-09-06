import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { db } from '../lib/firebase';
import type { DesignJob, DesignSubmission } from '../types/schema';
import { FIRESTORE_COLLECTIONS } from '../lib/constants';

const COLLECTION_NAME = FIRESTORE_COLLECTIONS.DESIGN_JOBS;

export const JobService = {
  /**
   * Create a new design job
   */
  createJob: async (jobData: Omit<DesignJob, 'id' | 'createdAt' | 'updatedAt' | 'paymentStatus'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...jobData,
        status: 'posted',
        paymentStatus: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch {
      throw new Error('Failed to create job. Please try again.');
    }
  },

  /**
   * Get jobs for a specific organization (Restaurant view)
   */
  getOrgJobs: async (orgId: string): Promise<DesignJob[]> => {
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
      } as DesignJob));
    } catch (error) {
      console.error('Failed to load designer jobs (getOrgJobs):', error);
      if (error instanceof FirebaseError) {
        throw new Error(`Failed to load jobs (${error.code}): ${error.message}`);
      }
      if (error instanceof Error) {
        throw new Error(`Failed to load jobs: ${error.message}`);
      }
      throw new Error('Failed to load jobs.');
    }
  },

  /**
   * Get available jobs for designers (Marketplace view)
   * Optionally filter by status (default: posted)
   */
  getAvailableJobs: async (): Promise<DesignJob[]> => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('status', '==', 'posted'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DesignJob));
    } catch {
      throw new Error('Failed to load available jobs.');
    }
  },

  /**
   * Get jobs assigned to a specific designer
   */
  getDesignerJobs: async (designerId: string): Promise<DesignJob[]> => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('designerId', '==', designerId),
        orderBy('updatedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DesignJob));
    } catch {
      throw new Error('Failed to load your jobs.');
    }
  },

  /**
   * Get a single job by ID
   */
  getJob: async (jobId: string): Promise<DesignJob | null> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, jobId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as DesignJob;
      }
      return null;
    } catch {
      throw new Error('Failed to load job details.');
    }
  },

  /**
   * Update a job (e.g. assign designer, change status)
   */
  updateJob: async (jobId: string, updates: Partial<DesignJob>): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, jobId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch {
      throw new Error('Failed to update job.');
    }
  },

  /**
   * Assign a designer to a job
   */
  assignDesigner: async (jobId: string, designerId: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, jobId);
      await updateDoc(docRef, {
        designerId,
        status: 'assigned',
        updatedAt: serverTimestamp()
      });
    } catch {
      throw new Error('Failed to assign designer.');
    }
  },

  /**
   * Submit a design for a job
   */
  submitDesign: async (jobId: string, submissionData: Omit<DesignSubmission, 'id' | 'createdAt' | 'status'>): Promise<string> => {
    try {
      const submissionsRef = collection(db, COLLECTION_NAME, jobId, 'submissions');
      const docRef = await addDoc(submissionsRef, {
        ...submissionData,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      // Update job status to 'review'
      const jobRef = doc(db, COLLECTION_NAME, jobId);
      await updateDoc(jobRef, {
        status: 'review',
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch {
      throw new Error('Failed to submit design.');
    }
  },

  /**
   * Get submissions for a job
   */
  getSubmissions: async (jobId: string): Promise<DesignSubmission[]> => {
    try {
      const submissionsRef = collection(db, COLLECTION_NAME, jobId, 'submissions');
      const q = query(submissionsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DesignSubmission));
    } catch {
      throw new Error('Failed to load submissions.');
    }
  },

  /**
   * Review a submission (Approve/Reject)
   */
  reviewSubmission: async (jobId: string, submissionId: string, status: 'approved' | 'rejected', feedback?: string): Promise<void> => {
    try {
      const submissionRef = doc(db, COLLECTION_NAME, jobId, 'submissions', submissionId);
      
      const updates: Partial<DesignSubmission> = {
        status,
        feedback: feedback || undefined
      };

      await updateDoc(submissionRef, updates);

      // If approved, update the job status to completed
      if (status === 'approved') {
        const jobRef = doc(db, COLLECTION_NAME, jobId);
        await updateDoc(jobRef, {
          status: 'completed',
          updatedAt: serverTimestamp()
        });
      }
    } catch {
      throw new Error('Failed to review submission.');
    }
  }
};
