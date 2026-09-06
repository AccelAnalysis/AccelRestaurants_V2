import * as functionsTest from 'firebase-functions-test';

// Mock Firebase Admin before loading the Functions module. The current unit
// tests exercise authorization/validation paths and should not require a real
// Firebase project or service-account credential.
jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({ platformRole: 'admin' }) })),
      set: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve()),
    })),
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({ id: 'new-id' })),
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(() => Promise.resolve()),
    })),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (firestore as any).Timestamp = {
    now: () => ({ toMillis: () => Date.now() }),
    fromMillis: (ms: number) => ({ toMillis: () => ms }),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (firestore as any).FieldValue = {
    serverTimestamp: jest.fn(() => ({ __type: 'serverTimestamp' })),
    arrayUnion: jest.fn((...values: unknown[]) => ({ __type: 'arrayUnion', values })),
    arrayRemove: jest.fn((...values: unknown[]) => ({ __type: 'arrayRemove', values })),
    delete: jest.fn(() => ({ __type: 'delete' })),
  };

  return {
    initializeApp: jest.fn(),
    firestore,
    storage: jest.fn(() => ({
      bucket: jest.fn(),
    })),
  };
});

// Offline mode: no Firebase project ID or service-account.json is required.
const testEnv = functionsTest.default();

// Load the Functions module only after mocks and the offline test environment
// are established.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const myFunctions = require('./index') as typeof import('./index');

describe('Cloud Functions', () => {
  afterAll(() => {
    testEnv.cleanup();
  });

  test('sendInviteEmail should throw if not authenticated', async () => {
    const wrapped = testEnv.wrap(myFunctions.sendInviteEmail);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect((wrapped as any)({} as any, { auth: undefined } as any)).rejects.toThrow('User must be logged in');
  });
});
