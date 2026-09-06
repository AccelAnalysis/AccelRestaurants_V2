import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import type { Template } from '../types/schema';

const COLLECTION_NAME = 'templates';

export const TemplateService = {
  /**
   * Fetch all templates (optionally filtered by orgId or public status)
   */
  getTemplates: async (filter?: { orgId?: string, isPublic?: boolean }): Promise<Template[]> => {
    try {
      let q = query(collection(db, COLLECTION_NAME));

      if (filter?.orgId) {
        q = query(q, where('orgId', '==', filter.orgId));
      }
      
      if (filter?.isPublic !== undefined) {
        q = query(q, where('isPublic', '==', filter.isPublic));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Template));
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  },

  /**
   * Fetch a single template by ID
   */
  getTemplate: async (templateId: string): Promise<Template | null> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, templateId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Template;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      throw new Error('Failed to load template.');
    }
  },

  /**
   * Create a new template
   */
  createTemplate: async (templateData: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...templateData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw new Error('Failed to create template.');
    }
  },

  /**
   * Update an existing template
   */
  updateTemplate: async (templateId: string, templateData: Partial<Omit<Template, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, templateId);
      await updateDoc(docRef, {
        ...templateData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating template:', error);
      throw new Error('Failed to update template.');
    }
  },

  /**
   * Delete a template
   */
  deleteTemplate: async (templateId: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, templateId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw new Error('Failed to delete template.');
    }
  },

  createBurgerTemplate: async (): Promise<{ success: boolean; templateId: string }> => {
    try {
      const createBurgerFn = httpsCallable<Record<string, never>, { success: boolean; templateId: string }>(functions, 'createBurgerTemplate');
      const result = await createBurgerFn({});
      return result.data;
    } catch (error) {
      console.error('Error creating burger template:', error);
      throw new Error('Failed to create burger template.');
    }
  },

  createThemeTemplates: async (themeName: string): Promise<{ success: boolean; created: number }> => {
    const createThemeTemplates = httpsCallable(functions, 'createThemeTemplates');
    const result = await createThemeTemplates({ themeName });
    return result.data as { success: boolean; created: number };
  },

  importTemplate: async (templateId: string, orgId: string): Promise<{ success: boolean; resourceId: string }> => {
    try {
      const importTemplateFn = httpsCallable<{ templateId: string; targetOrgId: string }, { success: boolean; resourceId: string }>(functions, 'importTemplate');
      const result = await importTemplateFn({ templateId, targetOrgId: orgId });
      return result.data;
    } catch (error) {
      console.error('Error importing template:', error);
      throw new Error('Failed to import template');
    }
  },

  updateTemplatePublic: async (id: string, isPublic: boolean): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, { 
        isPublic,
        updatedAt: serverTimestamp() 
      });
    } catch (error) {
      console.error('Error updating template visibility:', error);
      throw new Error('Failed to update template visibility');
    }
  }
};
