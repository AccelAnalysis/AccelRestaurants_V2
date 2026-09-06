// Test-only SDK boundary. This file is selected solely by tests/hig/vite.config.mjs.
export const signInWithEmailAndPassword = async () => { throw new Error('fixture auth failure'); };
export const createUserWithEmailAndPassword = async () => { if (!window.__hig?.allowAuth) throw new Error('fixture auth failure'); window.__hig.authenticate(); return { user: { uid: 'hig-user' } }; };
export const updateProfile = async () => {};
export const signInWithCustomToken = async () => { throw new Error('Impersonation is disabled in offline UI tests'); };
export const sendPasswordResetEmail = signInWithEmailAndPassword;
export const signOut = async () => {};

export const getAuth = () => ({ currentUser: null });
