import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { validateCatalogue } from '../../functions/src/journey/catalog';
import type { WebsiteContent } from '../lib/websiteContent';
import { PLAN_CONFIGS, type PlanType, type PlanLimits } from '../lib/plans';

const SYSTEM_COLLECTION = 'system';
const PLANS_DOC = 'plans';
const GENERAL_DOC = 'general';

 const removeUndefinedDeep = <T>(value: T): T => {
   if (value === undefined || value === null) return value;
   if (value instanceof Timestamp) return value;
   if (value instanceof Date) return value;

   if (Array.isArray(value)) {
     return value
       .map((item) => removeUndefinedDeep(item))
       .filter((item) => item !== undefined) as unknown as T;
   }

   if (typeof value === 'object') {
     const isPlainObject = Object.prototype.toString.call(value) === '[object Object]';
     if (!isPlainObject) return value;

     const entries = Object.entries(value as Record<string, unknown>);
     const cleaned = entries.reduce<Record<string, unknown>>((acc, [k, v]) => {
       if (v === undefined) return acc;
       const next = removeUndefinedDeep(v);
       if (next === undefined) return acc;
       acc[k] = next;
       return acc;
     }, {});

     return cleaned as unknown as T;
   }

   return value;
 };

export interface SystemPlanConfig {
  configs: Record<PlanType, PlanLimits>;
  updatedAt: Timestamp;
}

export interface GeneralConfig {
  marketing?: WebsiteContent;
  landingPageVideoUrl?: string;
  landingPageTitle?: string;
  landingPageDescription?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: { platform: string; url: string }[];
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  footerCopyrightText?: string;
  footerLinks?: { label: string; url: string }[];
  primaryBrandColor?: string;
  maintenanceMode?: boolean;
  defaultCurrency?: string;
  defaultLocale?: string;
  analyticsTrackingId?: string;
  supportTicketIntegration?: { provider: string; apiKey: string };
  featureFlags?: Record<string, boolean>;
  siteBanner?: { enabled: boolean; message: string; variant?: 'info' | 'warning' | 'success' };
  updatedAt?: Timestamp;
}

export const ConfigService = {
  /**
   * Fetch general system configuration
   */
  getGeneralConfig: async (): Promise<GeneralConfig> => {
    try {
      const docRef = doc(db, SYSTEM_COLLECTION, GENERAL_DOC);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as GeneralConfig;
      } else {
        return {};
      }
    } catch {
      return {};
    }
  },

  /**
   * Save general system configuration
   */
  saveGeneralConfig: async (config: GeneralConfig): Promise<void> => {
    try {
      const docRef = doc(db, SYSTEM_COLLECTION, GENERAL_DOC);
      const cleanedConfig = removeUndefinedDeep(config);
      await setDoc(docRef, {
        ...cleanedConfig,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch {
      throw new Error('Failed to save general configuration.');
    }
  },

  /**
   * Fetch the remotely managed plan catalogue when it is available.
   * A bundled last-known-good catalogue keeps public plan comparison usable
   * during preview/backend skew, a missing system document, or a temporary read failure.
   * Checkout and paid access remain server-validated against the backend catalogue.
   */
  getPlanConfigs: async (): Promise<Record<PlanType, PlanLimits>> => {
    try {
      const snapshot = await getDoc(doc(db, SYSTEM_COLLECTION, PLANS_DOC));
      if (!snapshot.exists()) return validateCatalogue(PLAN_CONFIGS) as Record<PlanType, PlanLimits>;
      return validateCatalogue(snapshot.data().configs) as Record<PlanType, PlanLimits>;
    } catch {
      return validateCatalogue(PLAN_CONFIGS) as Record<PlanType, PlanLimits>;
    }
  },

  /**
   * Save plan configurations to Firestore
   */
  savePlanConfigs: async (configs: Record<PlanType, PlanLimits>): Promise<void> => {
    try {
      const docRef = doc(db, SYSTEM_COLLECTION, PLANS_DOC);
      await setDoc(docRef, {
        configs: validateCatalogue(configs),
        updatedAt: serverTimestamp()
      });
    } catch {
      throw new Error('Failed to save plan configurations.');
    }
  }
};
