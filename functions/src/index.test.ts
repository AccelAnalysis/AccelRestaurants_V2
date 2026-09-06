import * as functionsTest from 'firebase-functions-test';
import * as myFunctions from './index';

const testEnv = functionsTest.default({
  projectId: 'demo-project',
}, './service-account.json');

// Mock admin initialization
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
      commit: jest.fn(() => Promise.resolve()),
    })),
  }));
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (firestore as any).Timestamp = {
    now: () => ({ toMillis: () => Date.now() }),
    fromMillis: (ms: number) => ({ toMillis: () => ms }),
  };

  return {
    initializeApp: jest.fn(),
    firestore,
  };
});

describe('Cloud Functions', () => {
  afterAll(() => {
    testEnv.cleanup();
  });

  test('sendInviteEmail should throw if not authenticated', async () => {
    const wrapped = testEnv.wrap(myFunctions.sendInviteEmail);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect((wrapped as any)({} as any, { auth: undefined } as any)).rejects.toThrow('User must be logged in');
  });

  // Add more tests as needed
});
