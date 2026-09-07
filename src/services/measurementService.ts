import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export type Counts = Record<string, number>;
export type MeasurementMode = 'live' | 'test';
export type SurveyQuestion = { id: string; label: string; type: 'nps' | 'csat' | 'single' | 'text'; required: boolean; options?: string[] };
export type MeasurementCampaign = { id: string; name: string; kind?: 'external' | 'offer' | 'survey'; status?: string; questions?: SurveyQuestion[] };
export type AggregateRow = { id: string; name: string; locationId?: string; counts: Counts };
export type MeasurementReport = {
  totals: Counts; daily: { date: string; counts: Counts }[]; hourly: { hour: string; counts: Counts }[];
  campaignRows: AggregateRow[]; locationRows: AggregateRow[]; screenRows: AggregateRow[];
  campaigns: MeasurementCampaign[]; updatedAt: number | null; mode: MeasurementMode;
  admin: boolean; restrictedLocations: string[] | null; source: string;
};
export type MeasurementSession = { sessionId: string; mode: MeasurementMode; serverTime: number; expiresAt: number };
export type PlacementHint = { placementId: string; tileId: string; slideId: string; slideVersion: number; redirectUrl: string };
export type PlaybackBucket = { sessionId: string; placementId: string; windowStart: number; plays: number; visibleMs: number };
export type Engagement = { name: string; kind: 'external' | 'offer' | 'survey'; ctaLabel: string; questions: SurveyQuestion[]; thankYouMessage: string; submitted: boolean; mode: MeasurementMode };

const call = async <T>(name: string, data: unknown): Promise<T> => {
  const result = await httpsCallable<unknown, T>(functions, name, { timeout: 30_000 })(data);
  return result.data;
};
export const MeasurementService = {
  report: (orgId: string, from: string, to: string, campaignId = '', mode: MeasurementMode = 'live') => call<MeasurementReport>('getMeasurementDashboard', { orgId, from, to, campaignId, mode }),
  create: (orgId: string, requestId: string, campaign: unknown) => call<{ campaignId: string }>('createMeasurementCampaign', { orgId, requestId, campaign }),
  status: (orgId: string, campaignId: string, status: string) => call('setMeasurementCampaignStatus', { orgId, campaignId, status }),
  bind: (orgId: string, campaignId: string, slideId: string, tileId: string) => call('bindMeasurementCampaign', { orgId, campaignId, slideId, tileId }),
  requestPairing: (screenId: string) => call<{ code: string; expiresAt: number }>('requestMeasurementPairing', { screenId }),
  approvePairing: (orgId: string, code: string) => call('approveMeasurementPairing', { orgId, code }),
  openSession: (screenId: string) => call<MeasurementSession>('openMeasurementSession', { screenId, test: import.meta.env.DEV }),
  manifest: (sessionId: string, slideVersions: Record<string, number>) => call<{ placements: PlacementHint[]; warnings: string[]; mode: MeasurementMode; serverTime: number }>('getMeasurementManifest', { sessionId, slideVersions }),
  ingest: (buckets: PlaybackBucket[]) => call<{ accepted: string[]; rejected: { key: string; reason: string }[] }>('ingestMeasurementBuckets', { buckets }),
  engagement: (token: string) => call<Engagement>('getMeasurementEngagement', { token }),
  action: (token: string, action: string) => call<{ success: boolean; destinationUrl: string; offerCode: string }>('recordMeasurementAction', { token, action }),
  submit: (token: string, answers: Record<string, string | number>) => call<{ success: boolean; duplicate: boolean }>('submitMeasurementSurvey', { token, answers }),
};

export function measurementScores(c: Counts) {
  return {
    nps: c.npsResponses ? 100 * ((c.npsPromoters || 0) - (c.npsDetractors || 0)) / c.npsResponses : null,
    csat: c.csatResponses ? 100 * (c.csatSatisfied || 0) / c.csatResponses : null,
    scanYield: c.plays ? 100 * (c.scans || 0) / c.plays : null,
    engagement: c.cohortScans ? 100 * (c.cohortEngaged || 0) / c.cohortScans : null,
    completion: c.cohortSurveyStarts ? 100 * (c.cohortSurveySubmits || 0) / c.cohortSurveyStarts : null,
  };
}
export const measurementError = (error: unknown) => error instanceof Error ? error.message.replace(/^FirebaseError: /, '') : 'Measurement is unavailable. Please retry.';
