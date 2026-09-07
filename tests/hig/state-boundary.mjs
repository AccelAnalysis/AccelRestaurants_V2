import { fileURLToPath } from 'node:url';
// The fixture's Vite root is tests/hig, not the repository root. Use its allowed
// source URL so assertions read the same real store as the mounted component.
const storeModule = `/@fs${fileURLToPath(new URL('../../src/store/useAuthStore.ts', import.meta.url)).replaceAll('\\', '/')}`;
export const readOrganization = page => page.evaluate(async url => (await import(url)).useAuthStore.getState().organization, storeModule);
export const signedOutAccount = page => page.evaluate(async url => {
  (await import(url)).useAuthStore.setState({ user: null, userProfile: null, organization: null, loading: false });
}, storeModule);
