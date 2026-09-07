import base from '../hig/vite.config.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export default { ...base, root: path.dirname(fileURLToPath(import.meta.url)), resolve: { ...base.resolve, alias: base.resolve.alias.map(a => a.find === 'firebase/firestore' ? { ...a, replacement: fileURLToPath(new URL('./firebase-firestore.js', import.meta.url)) } : a) }, server: { ...base.server, port: 4174 } };
