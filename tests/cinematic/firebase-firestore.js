export * from '../hig/firebase-firestore.js';
export function onSnapshot(_ref, next, error) {
  const f = window.__cinematic;
  f.publishPlan = plan => next({exists:()=>plan !== null, data:()=>({plan})});
  f.mirrorError = () => error(new Error('fixture mirror unavailable'));
  f.subscriptions = (f.subscriptions || 0) + 1;
  queueMicrotask(() => f.publishPlan(null));
  return () => { f.subscriptions--; };
}
