import { isPlanName, type PlanName } from '../../functions/src/journey/catalog';
export interface JourneyIntent { templateId?: string; plan?: PlanName; screens?: number; seats?: number; savedAt: number }
const INTENT_KEY = 'accel:setup-intent:v1';
const MAX_AGE = 24 * 60 * 60 * 1000;
export function sanitizeIntent(raw: unknown, now = Date.now()): JourneyIntent {
  const v = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const result: JourneyIntent = { savedAt: now };
  if (typeof v.templateId === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(v.templateId)) result.templateId = v.templateId;
  if (isPlanName(v.plan)) result.plan = v.plan;
  for (const key of ['screens', 'seats'] as const) if (typeof v[key] === 'number' && Number.isInteger(v[key]) && v[key] >= 1 && v[key] <= 10000) result[key] = v[key];
  return result;
}
export function saveJourneyIntent(intent: unknown, scope = 'visitor'): JourneyIntent {
  const safe = sanitizeIntent(intent);
  try { sessionStorage.setItem(`${INTENT_KEY}:${scope}`, JSON.stringify(safe)); } catch { /* A browser with storage disabled can still complete setup. */ }
  return safe;
}
export function readJourneyIntent(scope = 'visitor'): JourneyIntent {
  try {
    const raw = JSON.parse(sessionStorage.getItem(`${INTENT_KEY}:${scope}`) || 'null');
    if (!raw || !Number.isFinite(raw.savedAt) || raw.savedAt > Date.now() || Date.now() - raw.savedAt > MAX_AGE) return { savedAt: Date.now() };
    return sanitizeIntent(raw);
  } catch { return { savedAt: Date.now() }; }
}
export function claimJourneyIntent(scope: string): JourneyIntent {
  const saved = readJourneyIntent(scope), incoming = readJourneyIntent();
  const result = saveJourneyIntent({ ...saved, ...incoming }, scope);
  try { sessionStorage.removeItem(`${INTENT_KEY}:visitor`); } catch { /* Optional persistence. */ }
  return result;
}
export function safeWebLink(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048) return undefined;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}
export function contactLink(email: unknown): string | undefined {
  return typeof email === 'string' && /^[^\s@<>?]+@[^\s@<>?]+\.[^\s@<>?]+$/.test(email) ? `mailto:${email}` : undefined;
}
export function connectionState(timestamp: { seconds: number } | undefined, now = Date.now()): 'connected' | 'disconnected' | 'unknown' {
  if (!timestamp || !Number.isFinite(timestamp.seconds)) return 'unknown';
  const age = now - timestamp.seconds * 1000;
  if (age < -5000) return 'unknown';
  return age <= 120000 ? 'connected' : 'disconnected';
}
export function customerError(error: unknown, fallback: string): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code.endsWith('permission-denied')) return 'You do not have access to make this change. Ask your restaurant owner for help.';
  if (code.endsWith('unauthenticated')) return 'Please sign in again to continue.';
  if (code.endsWith('email-already-in-use')) return 'This email already has an account. Sign in to continue.';
  if (code.endsWith('weak-password')) return 'Choose a stronger password and try again.';
  if (code.endsWith('invalid-email')) return 'Enter a valid email address.';
  if (code.endsWith('network-request-failed') || code.endsWith('unavailable')) return 'The connection was interrupted. Your choices are still here. Please try again.';
  if (code.endsWith('resource-exhausted') || code.endsWith('too-many-requests')) return 'There have been too many attempts. Please try again later.';
  return fallback;
}

// Stable operator destinations never claim the display host's TV activation homepage.
export function safeWorkspaceDestination(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048 || !/^\/(admin|designer|super-admin|pair)(\/|\?|$)/.test(value)) return undefined;
  if (Array.from(value).some(c => c === '\\' || c.charCodeAt(0) < 32)) return undefined;
  try { const url = new URL(value, 'https://workspace.invalid'); return url.origin === 'https://workspace.invalid' && /^\/(admin|designer|super-admin|pair)(\/|$)/.test(url.pathname) ? url.pathname + url.search + url.hash : undefined; } catch { return undefined; }
}
