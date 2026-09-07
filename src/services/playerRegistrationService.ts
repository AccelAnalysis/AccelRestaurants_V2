import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export type PlayerRegistrationStatus = 'active' | 'replaced' | 'deactivated' | 'unregistered';
export type PlayerRegistration = {
  screenId: string;
  orgId: string;
  active: boolean;
  status: PlayerRegistrationStatus;
};
export type PlayerActivationResolution = {
  registration: PlayerRegistration | null;
  code: string | null;
  expiresAt: number;
};
export type PlayerRegistrationSummary = {
  screenId: string;
  playerUid: string;
  assignedAt: number;
};

const CACHE_KEY = 'accelrestaurants.player.assignment.v1';

const call = async <T>(name: string, data: unknown): Promise<T> => {
  const result = await httpsCallable<unknown, T>(functions, name, { timeout: 30_000 })(data);
  return result.data;
};

export const PlayerRegistrationService = {
  getCachedAssignment(): { screenId: string; orgId?: string } | null {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { screenId?: unknown; orgId?: unknown };
      if (typeof parsed.screenId !== 'string' || !parsed.screenId) return null;
      return { screenId: parsed.screenId, orgId: typeof parsed.orgId === 'string' ? parsed.orgId : undefined };
    } catch {
      return null;
    }
  },

  cacheAssignment(screenId: string, orgId?: string) {
    try { window.localStorage.setItem(CACHE_KEY, JSON.stringify({ screenId, orgId, savedAt: Date.now() })); } catch { /* Best effort only. */ }
  },

  clearCachedAssignment() {
    try { window.localStorage.removeItem(CACHE_KEY); } catch { /* Best effort only. */ }
  },

  requestActivation: () => call<PlayerActivationResolution>('requestMeasurementPairing', { playerActivation: true }),
  claim: (orgId: string, code: string, screenId: string) => call<{ success: true; screenId: string; orgId: string }>('approveMeasurementPairing', { playerRegistrationAction: 'claim', orgId, code, screenId }),
  list: (orgId: string) => call<{ registrations: PlayerRegistrationSummary[] }>('approveMeasurementPairing', { playerRegistrationAction: 'list', orgId }),
  reassign: (orgId: string, sourceScreenId: string, targetScreenId: string) => call<{ success: true }>('approveMeasurementPairing', { playerRegistrationAction: 'reassign', orgId, sourceScreenId, targetScreenId }),
  swap: (orgId: string, firstScreenId: string, secondScreenId: string) => call<{ success: true }>('approveMeasurementPairing', { playerRegistrationAction: 'swap', orgId, firstScreenId, secondScreenId }),
  deactivate: (orgId: string, screenId: string) => call<{ success: true }>('approveMeasurementPairing', { playerRegistrationAction: 'deactivate', orgId, screenId }),
};
