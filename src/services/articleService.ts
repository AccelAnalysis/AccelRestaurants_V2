import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Article {
  id: string;
  title: string;
  content: string; // HTML or Markdown
  category: string;
  description: string;
  updatedAt: Timestamp;
}

const COLLECTION_NAME = 'articles';

export const ArticleService = {
  getArticles: async (): Promise<Article[]> => {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Article));
    } catch (error) {
      console.error('Error fetching articles:', error);
      return [];
    }
  },

  createArticle: async (article: Omit<Article, 'id' | 'updatedAt'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), { 
        ...article, 
        updatedAt: serverTimestamp() 
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating article:', error);
      throw error;
    }
  },

  updateArticle: async (id: string, updates: Partial<Omit<Article, 'id' | 'updatedAt'>>): Promise<void> => {
    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), { 
        ...updates, 
        updatedAt: serverTimestamp() 
      });
    } catch (error) {
      console.error('Error updating article:', error);
      throw error;
    }
  },

  deleteArticle: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.error('Error deleting article:', error);
      throw error;
    }
  }
};
