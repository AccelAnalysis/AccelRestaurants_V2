import { validateAnswers, validateCampaign, validateQuestions, validateBucket, bucketDelta, score, localTime, safeDestination, addCounts, opaque, hash, MINUTE, DAY, scopeRows, type Attribution, type Question } from './core';

const questions: Question[] = [
  { id: 'nps', label: 'Recommend?', type: 'nps', required: true },
  { id: 'csat', label: 'Satisfied?', type: 'csat', required: true },
  { id: 'comment', label: 'Why?', type: 'text', required: false },
];
describe('measurement contracts', () => {
  test.each([0, 6, 7, 8, 9, 10])('NPS %i is accepted, classified and counted', nps => {
    const { answers, metrics } = validateAnswers(questions, { nps, csat: 5 });
    expect(answers.nps).toBe(nps); expect(metrics.npsResponses).toBe(1);
    expect(metrics[nps >= 9 ? 'npsPromoters' : nps >= 7 ? 'npsPassives' : 'npsDetractors']).toBe(1);
    expect(metrics[`nps${nps}`]).toBe(1);
  });
  test.each([1, 2, 3, 4, 5])('CSAT %i counts satisfied only for 4–5', csat => {
    const { metrics } = validateAnswers(questions, { nps: 7, csat });
    expect(metrics.csatSatisfied).toBe(csat >= 4 ? 1 : 0); expect(metrics.csatResponses).toBe(1);
  });
  test.each([-1, 11, 2.5, '10', null])('rejects invalid NPS %p', nps => {
    expect(() => validateAnswers(questions, { nps, csat: 3 })).toThrow();
  });
  test('rejects spoofed questions, empty submissions, and overlong answers', () => {
    expect(() => validateAnswers(questions, { nps: 10, csat: 5, orgId: 'victim' })).toThrow();
    expect(() => validateAnswers(questions, {})).toThrow();
    expect(() => validateAnswers(questions, { nps: 10, csat: 5, comment: 'x'.repeat(1001) })).toThrow();
  });
  test('poll validation produces an aggregate category, never arbitrary client metric names', () => {
    const q = validateQuestions([{ id: 'drink', label: 'Favorite?', type: 'single', required: true, options: ['Tea', 'Coffee'] }]);
    expect(validateAnswers(q, { drink: 'Coffee' }).metrics).toEqual({ poll_drink_1: 1 });
    expect(() => validateAnswers(q, { drink: 'Injected' })).toThrow();
  });
  test('question definitions reject duplicates, invalid scales and excessive questions', () => {
    expect(() => validateQuestions([questions[0], questions[0]])).toThrow();
    expect(() => validateQuestions(Array.from({ length: 9 }, (_, i) => ({ id: `q${i}`, label: 'Q', type: 'text' })))).toThrow();
    expect(() => validateQuestions([{ id: 'x', label: 'Poll', type: 'single', options: ['A', 'A'] }])).toThrow();
  });
  test('NPS and CSAT use pooled counts, not unweighted averages of daily scores', () => {
    const total = addCounts({ npsPromoters: 1, npsResponses: 1, csatSatisfied: 1, csatResponses: 1 }, { npsDetractors: 9, npsResponses: 9, csatSatisfied: 0, csatResponses: 9 });
    expect(score(total).nps).toBe(-80); expect(score(total).csat).toBe(10);
    expect(score({}).nps).toBeNull(); expect(score({}).completionRate).toBeNull();
  });
  test('cohort completion uses its own denominator', () => {
    expect(score({ cohortSurveyStarts: 4, cohortSurveySubmits: 3, surveySubmits: 80 }).completionRate).toBe(75);
  });
  test('local attribution respects midnight and daylight-saving transitions', () => {
    expect(localTime(Date.parse('2026-09-08T03:59:59Z'), 'America/New_York')).toEqual({ date: '2026-09-07', hour: '23' });
    expect(localTime(Date.parse('2026-09-08T04:00:00Z'), 'America/New_York')).toEqual({ date: '2026-09-08', hour: '00' });
    expect(localTime(Date.parse('2026-11-01T05:30:00Z'), 'America/New_York').hour).toBe('01');
    expect(localTime(Date.parse('2026-11-01T06:30:00Z'), 'America/New_York').hour).toBe('01');
    expect(localTime(Date.parse('2026-03-08T07:00:00Z'), 'America/New_York').hour).toBe('03');
  });
  test.each(['javascript:alert(1)', 'http://example.com', '//example.com', 'https://user:pass@example.com', 'https://127.0.0.1', 'https://192.168.1.5', 'https://metadata.google.internal', 'https://localhost', 'https://private.local', 'https://example.com/r/abc'])('rejects unsafe destination %s', url => {
    expect(() => safeDestination(url)).toThrow();
  });
  test('accepts ordinary HTTPS destinations and validates offer requirements', () => {
    expect(safeDestination('https://restaurant.example/menu?lang=en')).toBe('https://restaurant.example/menu?lang=en');
    expect(() => validateCampaign({ name: 'Offer', kind: 'offer', destinationUrl: 'https://restaurant.example', offerCode: '' })).toThrow();
    expect(validateCampaign({ name: 'Guest feedback', kind: 'survey', questions }).kind).toBe('survey');
  });
  test('opaque codes are random 192-bit IDs, not reversible tenant identifiers', () => {
    const a = opaque(); const b = opaque(); expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/); expect(a).not.toBe(b);
    expect(hash('a', 'b')).not.toBe(hash('ab'));
  });
  test('cumulative buckets make retries and out-of-order uploads non-inflating', () => {
    const now = Date.parse('2026-09-07T12:02:00Z');
    const bucket = validateBucket({ sessionId: 'session', placementId: 'placement', windowStart: now - MINUTE, plays: 3, visibleMs: 20000 }, now);
    expect(bucketDelta({ plays: 3, visibleMs: 20000 }, bucket)).toEqual({ plays: 0, visibleMs: 0 });
    expect(bucketDelta({ plays: 4, visibleMs: 25000 }, bucket)).toEqual({ plays: 0, visibleMs: 0 });
    expect(bucketDelta({ plays: 2, visibleMs: 15000 }, bucket)).toEqual({ plays: 1, visibleMs: 5000 });
    expect(() => validateBucket({ ...bucket, windowStart: now - 8 * DAY }, now)).toThrow();
    expect(() => validateBucket({ ...bucket, visibleMs: 60001 }, now)).toThrow();
    expect(() => validateBucket({ ...bucket, plays: 21 }, now)).toThrow();
    expect(() => validateBucket({ ...bucket, windowStart: now - 1 }, now)).toThrow();
  });
  test('attribution projections have exactly six distinct grains', () => {
    const attribution = { orgId: 'org', campaignId: 'campaign', locationId: 'location', screenId: 'screen' } as Attribution;
    const rows = scopeRows(attribution); expect(rows).toHaveLength(6);
    expect(new Set(rows.map(row => row.scope)).size).toBe(6);
    expect(rows.find(row => row.scope === 'campaign_screen')?.locationId).toBe('location');
  });
});
