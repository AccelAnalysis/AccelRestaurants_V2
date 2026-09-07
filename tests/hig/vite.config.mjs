import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(here, '../..');
export default defineConfig({
  root: here,
  plugins: [
    {
      name: 'hig-offline-firebase-boundary',
      enforce: 'pre',
      load(id) {
        if (id.replaceAll('\\', '/').endsWith('/src/lib/firebase.ts')) {
          return 'export const auth = { currentUser: null, signOut: async () => {} }; export const db = {}; export const storage = {}; export const functions = {}; export const analytics = null; export const performance = null;';
        }
      },
    },
    react(),
  ],
  resolve: { alias: [{ find: 'firebase/auth', replacement: path.join(here, 'firebase-auth.js') }, { find: 'firebase/firestore', replacement: path.join(here, 'firebase-firestore.js') }, { find: 'firebase/functions', replacement: path.join(here, 'firebase-functions.js') }], dedupe: ['react', 'react-dom'] },
  css: { postcss: repository },
  server: { host: '127.0.0.1', port: 4173, strictPort: true, fs: { allow: [repository] } },
});
