
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface FormSubmissionData {
  formId: string;
  data: Record<string, string>;
  title?: string;
}

export const FormService = {
  submitForm: async (formId: string, formData: Record<string, string>, title?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const submitFormFn = httpsCallable(functions, 'submitForm');
      await submitFormFn({ formId, data: formData, title });
      return { success: true };
    } catch (error) {
      console.error('FormService Error:', error);
      return { success: false, message: 'Failed to submit form. Please try again.' };
    }
  }
};
