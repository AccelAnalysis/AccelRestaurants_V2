import firebaseFunctionsTest from 'firebase-functions-test';

// Offline mode: no Firebase project ID or service-account.json is required.
// Initialize the Firebase Functions Test SDK before mocking firebase-admin so
// the test SDK itself continues to use its real implementation.
const testEnv = firebaseFunctionsTest();

// Mock only the Admin SDK used by the Functions module. jest.doMock is
// intentionally non-hoisted, so it does not affect the test SDK import above.
jest.doMock('firebase-admin', () => {
  const firestore = jest.fn(() => ({}));

  // Provide the static helpers referenced by function bodies. The tests below
  // return during auth/argument validation, before any Firestore operation.
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
    storage: jest.fn(() => ({ bucket: jest.fn() })),
  };
});

// Load the Functions module only after the offline test SDK and Admin mock are
// established. Jest maps the ESM-only nanoid import to the local test mock.
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

  test('sendInviteEmail should validate required fields before database access', async () => {
    const wrapped = testEnv.wrap(myFunctions.sendInviteEmail);
    const context = {
      auth: {
        uid: 'test-user',
        token: { email: 'test@example.com' },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect((wrapped as any)({} as any, context as any)).rejects.toThrow('Missing required fields');
  });
});
