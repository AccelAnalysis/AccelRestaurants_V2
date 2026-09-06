import * as admin from 'firebase-admin';
import firebaseFunctionsTest from 'firebase-functions-test';

// Offline mode: no Firebase project ID or service-account.json is required.
const testEnv = firebaseFunctionsTest();

// The Functions module calls admin.initializeApp() at import time and then
// creates a Firestore client. Give it a local default app with a synthetic
// project ID so module initialization remains fully offline, then prevent the
// module import from attempting to initialize a second default app.
const adminApp = admin.initializeApp({ projectId: 'demo-project' });
const initializeAppSpy = jest.spyOn(admin, 'initializeApp').mockReturnValue(adminApp);

// Firebase recommends loading the Functions module only after the offline test
// SDK and Admin initialization stubs are established.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const myFunctions = require('./index') as typeof import('./index');

describe('Cloud Functions', () => {
  afterAll(async () => {
    initializeAppSpy.mockRestore();
    testEnv.cleanup();
    await adminApp.delete();
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
