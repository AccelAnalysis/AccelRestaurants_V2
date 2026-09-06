// Test-only SDK boundary. This file is selected solely by tests/hig/vite.config.mjs.
export const signInWithEmailAndPassword = async () => { throw new Error('fixture auth failure'); };
export const createUserWithEmailAndPassword = signInWithEmailAndPassword;
export const sendPasswordResetEmail = signInWithEmailAndPassword;
export const signOut = async () => {};

export const getAuth = () => ({ currentUser: null });
