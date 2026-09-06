// Only the isolated fixture resolves this boundary. Production uses the real SDK.
export * from '../../node_modules/firebase/firestore/dist/esm/index.esm.js';
export const doc = (_db, ...parts) => ({ path: parts.join('/') });
export const updateDoc = async (ref, data) => {
  const f = window.__hig;
  f.dbWrites.push({ path: ref.path, data });
  if (f.failDatabase) throw new Error('fixture write unavailable');
};
export const setDoc = updateDoc;
