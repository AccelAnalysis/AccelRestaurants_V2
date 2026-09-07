import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import type { StarterInput } from '../../functions/src/cinematic/templates';
export interface StarterRequest { orgId: string; requestId: string; input: StarterInput; createScreen: boolean }
export interface StarterResult { success: boolean; slideId: string; screenId?: string; locationId?: string }
export const CinematicService = {
  createStarter: async (request: StarterRequest): Promise<StarterResult> => {
    const result = await httpsCallable<StarterRequest, StarterResult>(functions, 'createRestaurantStarter')(request);
    if (!result.data.success || !result.data.slideId) throw new Error('Content creation was not confirmed. Retry without changing your choices.');
    return result.data;
  },
};
