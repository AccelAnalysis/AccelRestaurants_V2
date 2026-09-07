import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  listAll,
  deleteObject,
  getMetadata
} from 'firebase/storage';
import { storage } from '../lib/firebase';

export interface StorageFile {
  name: string;
  url: string;
  fullPath: string;
  size: number;
  contentType: string | undefined;
  timeCreated: string;
}

export const StorageService = {
  /**
   * Upload a file to Firebase Storage
   * @param file The file to upload
   * @param path The path where the file should be stored (e.g., 'orgId/menus/')
   * @returns Promise resolving to the download URL
   */
  uploadFile: async (file: File, path: string): Promise<string> => {
    try {
      const storageRef = ref(storage, `${path}${Date.now()}_${file.name}`);
      const uploadTask = await uploadBytesResumable(storageRef, file);
      return await getDownloadURL(uploadTask.ref);
    } catch (error) {
      console.error('Storage upload failed:', error);
      throw new Error('Failed to upload file.');
    }
  },

  /**
   * List all files in a specific directory
   * @param path The directory path to list
   * @returns Promise resolving to an array of StorageFile objects
   */
  listFiles: async (path: string): Promise<StorageFile[]> => {
    try {
      const listRef = ref(storage, path);
      const res = await listAll(listRef);
      
      const filesPromises = res.items.map(async (itemRef) => {
        try {
          const url = await getDownloadURL(itemRef);
          const metadata = await getMetadata(itemRef);
          return {
            name: itemRef.name,
            url,
            fullPath: itemRef.fullPath,
            size: metadata.size,
            contentType: metadata.contentType,
            timeCreated: metadata.timeCreated
          };
        } catch (error: unknown) {
          // Skip files that no longer exist (404 errors from stale references)
          if (error && typeof error === 'object' && 'code' in error && error.code === 'storage/object-not-found') {
            console.warn(`Skipping missing file: ${itemRef.fullPath}`);
            return null;
          }
          throw error;
        }
      });

      const results = await Promise.all(filesPromises);
      // Filter out null entries (missing files)
      return results.filter((file): file is StorageFile => file !== null);
    } catch (error) {
      console.error('Storage list failed:', error);
      throw new Error('Failed to list files.');
    }
  },

  /**
   * Delete a file from storage
   * @param fullPath The full path of the file to delete
   */
  deleteFile: async (fullPath: string): Promise<void> => {
    try {
      const fileRef = ref(storage, fullPath);
      await deleteObject(fileRef);
    } catch (error: unknown) {
      // If file doesn't exist, treat as success (already deleted)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'storage/object-not-found') {
        console.warn(`File already deleted: ${fullPath}`);
        return;
      }
      console.error('Storage delete failed:', error);
      throw new Error('Failed to delete file.');
    }
  }
};
