import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
  deleteObject,
  getMetadata,
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
  uploadFile: (file: File, path: string, onProgress?: (percent: number) => void): Promise<string> => new Promise((resolve, reject) => {
    const storageRef = ref(storage, `${path}${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on('state_changed', snapshot => {
      if (snapshot.totalBytes > 0) onProgress?.(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
    }, error => {
      console.error('Storage upload failed:', error);
      reject(new Error('Failed to upload file.'));
    }, async () => {
      try {
        resolve(await getDownloadURL(uploadTask.snapshot.ref));
      } catch (error) {
        console.error('Storage download URL failed:', error);
        reject(new Error('Failed to finish file upload.'));
      }
    });
  }),

  listFiles: async (path: string): Promise<StorageFile[]> => {
    try {
      const listRef = ref(storage, path);
      const res = await listAll(listRef);
      const filesPromises = res.items.map(async itemRef => {
        try {
          const url = await getDownloadURL(itemRef);
          const metadata = await getMetadata(itemRef);
          return { name: itemRef.name, url, fullPath: itemRef.fullPath, size: metadata.size, contentType: metadata.contentType, timeCreated: metadata.timeCreated };
        } catch (error: unknown) {
          if (error && typeof error === 'object' && 'code' in error && error.code === 'storage/object-not-found') return null;
          throw error;
        }
      });
      const results = await Promise.all(filesPromises);
      return results.filter((file): file is StorageFile => file !== null);
    } catch (error) {
      console.error('Storage list failed:', error);
      throw new Error('Failed to list files.');
    }
  },

  deleteFile: async (fullPath: string): Promise<void> => {
    try {
      await deleteObject(ref(storage, fullPath));
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'storage/object-not-found') return;
      console.error('Storage delete failed:', error);
      throw new Error('Failed to delete file.');
    }
  },
};
