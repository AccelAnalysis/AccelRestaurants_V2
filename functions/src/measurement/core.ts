import { createHash, randomBytes } from 'node:crypto';

export const MINUTE = 60_000;
export const DAY = 86_400_000;
export const RAW_RETENTION_DAYS = 90;
export const REPLAY_DAYS = 7;
export type Mode = 'live' | 'test';
export type Question = {
  id: string; label: string; type: 'nps' | 'csat' | 'single' | 'text';
  required: boolean; options?: string[];
};
export type CampaignInput = {
  name: string; kind: 'external' | 'offer' | 'survey'; destinationUrl: string;
  ctaLabel: string; offerCode: string; questions: Question[]; thankYouMessage: string;
};
export type Counts = Record<string, number>;
export type Attribution = {
  orgId: string; campaignId: string; campaignName: string; locationId: string;
  locationName: string; screenId: string; screenName: string; slideId: string;
  tileId: string; revisionId: string; timezone: string; mode: Mode;
};
export type Bucket = {
  sessionId: string; placementId: string; windowStart: number; plays: number; visibleMs: number;
};
export class MeasurementError extends Error {
  constructor(public code: 'invalid-argument' | 'permission-denied' | 'unauthenticated' | 'not-found' | 'failed-precondition' | 'resource-exhausted', message: string) {
    super(message); this.name = 'MeasurementError';
  }
}
export function requireValue(condition: unknown, message: string, code: MeasurementError['code'] = 'invalid-argument'): asserts condition {
  if (!condition) throw new MeasurementError(code, message);
}
export function object(value: unknown): Record<string, unknown> {
  requireValue(!!value && typeof value === 'object' && !Array.isArray(value), 'Expected an object.');
  return value as Record<string, unknown>;
}
export function text(value: unknown, max = 200, required = true): string {
  requireValue(value === undefined || typeof value === 'string', 'Expected text.');
  const result = String(value || '').trim();
  requireValue(result.length <= max && (!required || result.length > 0), `Text must be ${required ? '1' : '0'}–${max} characters.`);
  return result;
}
export function id(value: unknown): string {
  requireValue(typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value), 'Invalid identifier.');
  return value;
}
export const opaque = () => randomBytes(24).toString('base64url');
export const hash = (...parts: unknown[]) => createHash('sha256').update(JSON.stringify(parts)).digest('hex');
export function safeDestination(value: unknown): string {
  const raw = text(value, 2048);
  let url: URL;
  try { url = new URL(raw); } catch { throw new MeasurementError('invalid-argument', 'Use an absolute HTTPS destination.'); }
  requireValue(url.protocol === 'https:' && !url.username && !url.password, 'Destination must use HTTPS without embedded credentials.');
  const host = url.hostname.toLowerCase();
  requireValue(host.includes('.') && !host.endsWith('.local') && !host.endsWith('.internal') && !host.endsWith('.localhost') && host !== 'localhost' && !/^[\d.]+$/.test(host) && !host.includes(':'), 'Destination must be a public domain name.');
  requireValue(!/^\/r(?:\/|$)/.test(url.pathname), 'A tracking redirect cannot be used as a destination.');
  return url.toString();
}
export function validateQuestions(value: unknown): Question[] {
  requireValue(Array.isArray(value) && value.length > 0 && value.length <= 8, 'A survey needs 1–8 questions.');
  const seen = new Set<string>();
  let nps = 0; let csat = 0;
  return value.map(item => {
    const q = object(item); const key = id(q.id);
    requireValue(!seen.has(key), 'Question identifiers must be unique.'); seen.add(key);
    requireValue(['nps', 'csat', 'single', 'text'].includes(String(q.type)), 'Unsupported question type.');
    if (q.type === 'nps') nps++;
    if (q.type === 'csat') csat++;
    requireValue(nps <= 1 && csat <= 1, 'Use at most one NPS and one CSAT question.');
    const result: Question = { id: key, label: text(q.label, 300), type: q.type as Question['type'], required: q.required !== false };
    if (q.type === 'single') {
      requireValue(Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 8, 'Polls need 2–8 options.');
      result.options = q.options.map(option => text(option, 100));
      requireValue(new Set(result.options).size === result.options.length, 'Poll options must be unique.');
    }
    return result;
  });
}
export function validateCampaign(value: unknown): CampaignInput {
  const input = object(value);
  requireValue(['external', 'offer', 'survey'].includes(String(input.kind)), 'Choose a destination type.');
  const kind = input.kind as CampaignInput['kind'];
  return {
    name: text(input.name, 120), kind,
    destinationUrl: kind === 'survey' ? '' : safeDestination(input.destinationUrl),
    ctaLabel: text(input.ctaLabel || 'Continue', 60),
    offerCode: kind === 'offer' ? text(input.offerCode, 80) : '',
    questions: kind === 'survey' ? validateQuestions(input.questions) : [],
    thankYouMessage: text(input.thankYouMessage || 'Thank you for your feedback.', 300),
  };
}
export function validateAnswers(questions: Question[], input: unknown): { answers: Record<string, string | number>; metrics: Counts } {
  const raw = object(input);
  const allowed = new Set(questions.map(q => q.id));
  requireValue(Object.keys(raw).every(key => allowed.has(key)), 'Unknown survey question.');
  const answers: Record<string, string | number> = {}; const metrics: Counts = {};
  for (const q of questions) {
    const value = raw[q.id];
    const empty = value === undefined || value === null || value === '';
    requireValue(!empty || !q.required, `Answer “${q.label}”.`);
    if (empty) continue;
    if (q.type === 'nps' || q.type === 'csat') {
      const min = q.type === 'nps' ? 0 : 1; const max = q.type === 'nps' ? 10 : 5;
      requireValue(typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max, `${q.type.toUpperCase()} must be an integer from ${min} to ${max}.`);
      answers[q.id] = value;
      if (q.type === 'nps') {
        metrics.npsResponses = 1; metrics[`nps${value}`] = 1;
        metrics[value >= 9 ? 'npsPromoters' : value >= 7 ? 'npsPassives' : 'npsDetractors'] = 1;
      } else {
        metrics.csatResponses = 1; metrics.csatScoreSum = value; metrics[`csat${value}`] = 1;
        metrics.csatSatisfied = value >= 4 ? 1 : 0;
      }
    } else if (q.type === 'single') {
      requireValue(typeof value === 'string' && q.options?.includes(value), 'Choose a valid poll option.');
      answers[q.id] = value; metrics[`poll_${q.id}_${q.options!.indexOf(value)}`] = 1;
    } else answers[q.id] = text(value, 1000);
  }
  requireValue(Object.keys(answers).length > 0, 'Submit at least one answer.');
  return { answers, metrics };
}
export function localTime(ms: number, timezone: string): { date: string; hour: string } {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms));
  const get = (key: string) => parts.find(p => p.type === key)!.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: get('hour') };
}
export function validateTimezone(value: unknown): string {
  const zone = text(value || 'America/New_York', 80);
  try { localTime(Date.now(), zone); } catch { throw new MeasurementError('invalid-argument', 'Location timezone is invalid.'); }
  return zone;
}
export function validateBucket(value: unknown, now: number): Bucket {
  const b = object(value);
  requireValue(typeof b.windowStart === 'number' && Number.isInteger(b.windowStart) && b.windowStart % MINUTE === 0, 'Bucket must start at a UTC minute boundary.');
  requireValue(b.windowStart >= now - REPLAY_DAYS * DAY && b.windowStart <= now + MINUTE, 'Bucket is outside the seven-day replay window.');
  requireValue(typeof b.visibleMs === 'number' && Number.isInteger(b.visibleMs) && b.visibleMs >= 0 && b.visibleMs <= MINUTE, 'Visible duration must be 0–60 seconds per minute.');
  requireValue(typeof b.plays === 'number' && Number.isInteger(b.plays) && b.plays >= 0 && b.plays <= 60 && b.plays <= Math.ceil(b.visibleMs / 1000), 'Invalid qualified play count.');
  return { sessionId: id(b.sessionId), placementId: id(b.placementId), windowStart: b.windowStart, plays: b.plays, visibleMs: b.visibleMs };
}
export function bucketDelta(previous: Counts, next: Bucket): Counts {
  return {
    plays: Math.max(0, next.plays - (previous.plays || 0)),
    visibleMs: Math.max(0, next.visibleMs - (previous.visibleMs || 0)),
  };
}
export function score(counts: Counts) {
  return {
    nps: counts.npsResponses ? 100 * ((counts.npsPromoters || 0) - (counts.npsDetractors || 0)) / counts.npsResponses : null,
    csat: counts.csatResponses ? 100 * (counts.csatSatisfied || 0) / counts.csatResponses : null,
    scansPer100Plays: counts.plays ? 100 * (counts.scans || 0) / counts.plays : null,
    engagementRate: counts.cohortScans ? 100 * (counts.cohortEngaged || 0) / counts.cohortScans : null,
    completionRate: counts.cohortSurveyStarts ? 100 * (counts.cohortSurveySubmits || 0) / counts.cohortSurveyStarts : null,
  };
}
export function addCounts(target: Counts, source: Counts) {
  for (const [key, value] of Object.entries(source)) if (Number.isFinite(value)) target[key] = (target[key] || 0) + value;
  return target;
}
export function scopeRows(a: Attribution) {
  return [
    { scope: 'org', scopeId: a.orgId, campaignId: '', locationId: '', screenId: '' },
    { scope: 'campaign', scopeId: a.campaignId, campaignId: a.campaignId, locationId: '', screenId: '' },
    { scope: 'location', scopeId: a.locationId, campaignId: '', locationId: a.locationId, screenId: '' },
    { scope: 'screen', scopeId: a.screenId, campaignId: '', locationId: a.locationId, screenId: a.screenId },
    { scope: 'campaign_location', scopeId: hash(a.campaignId, a.locationId), campaignId: a.campaignId, locationId: a.locationId, screenId: '' },
    { scope: 'campaign_screen', scopeId: hash(a.campaignId, a.locationId, a.screenId), campaignId: a.campaignId, locationId: a.locationId, screenId: a.screenId },
  ];
}
