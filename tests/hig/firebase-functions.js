// No callable in this fixture can reach a Firebase backend.
export const httpsCallable = (_functions, name) => async input => {
  const f = window.__hig;
  f.callables.push({ name, input });
  if (f.failCallable) throw new Error('fixture callable unavailable');
  if (name === 'getInviteDetails') return { data: { orgId: 'hig-org', orgName: 'Test restaurant', email: 'review@example.invalid', type: f.inviteType || 'org' } };
  return { data: {} };
};
export const getFunctions = () => ({});
