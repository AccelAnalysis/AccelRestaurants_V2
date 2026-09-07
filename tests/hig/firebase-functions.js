// No callable in this fixture can reach a Firebase backend.
export const httpsCallable = (_functions, name) => async input => {
  const f = window.__hig;
  f.callables.push({ name, input });
  if (f.failCallable) throw new Error('fixture callable unavailable');
  if (name === 'getInviteDetails') return { data: { orgId: 'hig-org', orgName: 'Test restaurant', email: 'review@example.invalid', type: f.inviteType || 'org' } };
  if (name === 'approveMeasurementPairing' && input?.playerRegistrationAction === 'list') return { data: { registrations: [] } };
  if (name === 'requestMeasurementPairing' && input?.playerActivation === true) return { data: { registration: null, code: '123456', expiresAt: Date.now() + 900000 } };
  return { data: {} };
};
export const getFunctions = () => ({});
export const connectFunctionsEmulator = () => {};
