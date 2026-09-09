import { useCallback, useEffect, useState } from 'react';
import { ScreenService } from '../services/screenService';
import { SlideService } from '../services/slideService';
import { MenuService } from '../services/menuService';
import { StorageService } from '../services/storageService';
import { PlayerRegistrationService } from '../services/playerRegistrationService';
import { STORAGE_PATHS } from '../lib/constants';
import { useAuthStore } from '../store/useAuthStore';
import type { AppScreen, Slide } from '../types/schema';

export type SummaryKey = 'screens' | 'slides' | 'menus' | 'media' | 'registrations';
export interface RestaurantSummary {
  scope: string; screens?: AppScreen[]; slides?: Slide[]; menus?: number; media?: number;
  registrations?: string[]; failed: SummaryKey[]; pending: SummaryKey[];
}
export interface SummaryResult { data: RestaurantSummary | null; retry: () => void }
const setupKeys: SummaryKey[] = ['screens', 'slides', 'registrations'];
const allKeys: SummaryKey[] = [...setupKeys, 'menus', 'media'];

/** One load per mounted account, independent outcomes, no polling and no stale cross-account results. */
export function useRestaurantSummary(enabled = true, setupOnly = false): SummaryResult {
  const { user, organization } = useAuthStore();
  const orgId = organization?.id, uid = user?.uid;
  const scope = `${uid}:${orgId}`;
  const [data, setData] = useState<RestaurantSummary | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(n => n + 1), []);
  useEffect(() => {
    if (!enabled || !uid || !orgId) return;
    let disposed = false;
    const keys = setupOnly ? setupKeys : allKeys;
    queueMicrotask(() => { if (!disposed) setData({ scope, failed: [], pending: keys }); });
    const settle = async (key: SummaryKey, read: () => Promise<Partial<RestaurantSummary>>) => {
      try {
        const result = await read();
        if (!disposed) setData(current => current?.scope === scope ? { ...current, ...result, pending: current.pending.filter(k => k !== key) } : current);
      } catch {
        if (!disposed) setData(current => current?.scope === scope ? { ...current, failed: [...current.failed, key], pending: current.pending.filter(k => k !== key) } : current);
      }
    };
    void settle('screens', async () => ({ screens: (await ScreenService.getScreens(orgId)).filter(screen => screen.orgId === orgId) }));
    void settle('slides', async () => ({ slides: (await SlideService.getSlides(orgId)).filter(slide => slide.orgId === orgId) }));
    // PR4 is the single display-registration authority. No heartbeat substitutes.
    void settle('registrations', async () => ({ registrations: (await PlayerRegistrationService.list(orgId)).registrations.map(row => row.screenId) }));
    if (!setupOnly) {
      void settle('menus', async () => ({ menus: (await MenuService.getMenus(orgId)).length }));
      void settle('media', async () => ({ media: (await StorageService.listFiles(STORAGE_PATHS.ORGANIZATION_ASSETS(orgId))).length }));
    }
    return () => { disposed = true; };
  }, [enabled, setupOnly, uid, orgId, scope, attempt]);
  return { data: data?.scope === scope ? data : null, retry };
}
