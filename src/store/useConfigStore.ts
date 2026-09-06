import { create } from 'zustand';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ConfigService, type GeneralConfig } from '../services/configService';
import { PLAN_CONFIGS } from '../lib/plans';
import type { PlanType, PlanLimits } from '../lib/plans';

interface ConfigState {
  planConfigs: Record<PlanType, PlanLimits>;
  generalConfig: GeneralConfig;
  loading: boolean;
  error: string | null;
  hasUnsavedChanges?: boolean;
  fetchConfigs: () => Promise<void>;
  updateConfigs: (configs: Record<PlanType, PlanLimits>) => Promise<void>;
  updateGeneralConfig: (config: GeneralConfig) => Promise<void>;
  updateLandingPageVideo: (url: string) => Promise<void>;
  updateContactInfo: (email: string, phone?: string) => Promise<void>;
  reset: () => void;
}

let unsubscribeGeneral: (() => void) | null = null;

export const useConfigStore = create<ConfigState>((set, get) => ({
  planConfigs: PLAN_CONFIGS, // Default to local constants initially
  generalConfig: {},
  loading: false,
  error: null,
  
  fetchConfigs: async () => {
    set({ loading: true, error: null });
    try {
      // Set up real-time listener for general config
      const generalDoc = doc(db, 'system', 'general');
      if (unsubscribeGeneral) unsubscribeGeneral();
      unsubscribeGeneral = onSnapshot(
        generalDoc,
        (docSnap) => {
          set({ generalConfig: docSnap.exists() ? docSnap.data() as GeneralConfig : {} });
        },
        () => {
          set({ error: 'Real-time config updates unavailable' });
        }
      );

      // Fetch plan configs (not real-time for now)
      const configs = await ConfigService.getPlanConfigs();
      set({ planConfigs: configs, loading: false });
    } catch {
      set({ error: 'Failed to load system configuration', loading: false });
    }
  },

  updateConfigs: async (configs: Record<PlanType, PlanLimits>) => {
    set({ loading: true, error: null });
    try {
      await ConfigService.savePlanConfigs(configs);
      set({ planConfigs: configs, loading: false });
    } catch {
      set({ error: 'Failed to save system configuration', loading: false });
      throw new Error('Could not save plan settings. Your edits are still here. Try again.');
    }
  },

  updateGeneralConfig: async (config: GeneralConfig) => {
    set({ loading: true, error: null });
    try {
      await ConfigService.saveGeneralConfig(config);
      set({ generalConfig: { ...get().generalConfig, ...config }, loading: false });
    } catch {
      set({ error: 'Failed to save general configuration', loading: false });
      throw new Error('Could not save general settings. Your edits are still here. Try again.');
    }
  },

  updateLandingPageVideo: async (url: string) => {
    await get().updateGeneralConfig({ landingPageVideoUrl: url });
  },

  updateContactInfo: async (email: string, phone?: string) => {
    await get().updateGeneralConfig({ contactEmail: email, contactPhone: phone });
  },

  reset: () => {
    if (unsubscribeGeneral) {
      unsubscribeGeneral();
      unsubscribeGeneral = null;
    }
    set({
      planConfigs: PLAN_CONFIGS,
      generalConfig: {},
      loading: false,
      error: null,
    });
  },
}));
