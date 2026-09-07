import { getFirestore } from 'firebase-admin/firestore';
import { onCall, onRequest, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineString, defineBoolean } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import { MeasurementEngine } from './engine';
import { MeasurementError, object, id, text, hash, requireValue } from './core';

const publicOrigin = defineString('MEASUREMENT_ORIGIN', { default: 'https://accelrestaurant-d2c1f.web.app', description: 'Canonical first-party QR origin. Use the verified custom domain after DNS/Hosting setup.' });
const requireAppCheck = defineBoolean('MEASUREMENT_REQUIRE_APP_CHECK', { default: false, description: 'Enable after App Check is configured on supported player and guest browsers.' });
const options = { region: 'us-central1', maxInstances: 10, timeoutSeconds: 30 };
const engine = () => new MeasurementEngine(getFirestore(), publicOrigin.value().replace(/\/$/, ''));

function callable(run: (service: MeasurementEngine, data: Record<string, unknown>, uid: string, request: CallableRequest) => Promise<unknown>, authenticated = true) {
  return onCall(options, async request => {
    try {
      requireValue(JSON.stringify(request.data || {}).length <= 16_000, 'Request is too large.');
      if (requireAppCheck.value() && !request.app) throw new HttpsError('failed-precondition', 'Application verification required.');
      if (authenticated && !request.auth) throw new HttpsError('unauthenticated', 'Sign in before making this request.');
      return await run(engine(), object(request.data), request.auth?.uid || '', request);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      if (error instanceof MeasurementError) throw new HttpsError(error.code, error.message);
      logger.error('measurement_request_failed', { errorType: error instanceof Error ? error.name : 'unknown' });
      throw new HttpsError('internal', 'Measurement is temporarily unavailable. Please retry.');
    }
  });
}

export const createMeasurementCampaign = callable((service, data, uid) => service.createCampaign(uid, data));
export const setMeasurementCampaignStatus = callable((service, data, uid) => service.campaignStatus(uid, data));
export const bindMeasurementCampaign = callable((service, data, uid) => service.bindCampaign(uid, data));
export const requestMeasurementPairing = callable((service, data, uid) => service.requestPairing(uid, id(data.screenId)));
export const approveMeasurementPairing = callable((service, data, uid) => service.approvePairing(uid, data));
export const openMeasurementSession = callable((service, data, uid, request) => {
  // Preview Hosting shares production Firestore. Its instrumentation MUST be marked test by the server.
  const origin = request.rawRequest.get('origin');
  const mode = data.test === true || origin !== service.origin ? 'test' : 'live';
  return service.openSession(uid, id(data.screenId), mode);
});
export const getMeasurementManifest = callable((service, data, uid) => service.manifest(uid, data));
export const ingestMeasurementBuckets = callable((service, data, uid) => service.ingest(uid, data));
export const getMeasurementDashboard = callable((service, data, uid) => service.dashboard(uid, data));
export const getMeasurementEngagement = callable(async (service, data) => {
  const token = id(data.token); await service.rate(`guest:${hash(token)}`, 40);
  const result = await service.engagement(token);
  await service.action(token, 'landing_view');
  return result;
}, false);
export const recordMeasurementAction = callable(async (service, data) => {
  const token = id(data.token); await service.rate(`guest:${hash(token)}`, 40);
  return service.action(token, text(data.action, 30));
}, false);
export const submitMeasurementSurvey = callable(async (service, data) => {
  const token = id(data.token); await service.rate(`guest:${hash(token)}`, 40);
  return service.submit(token, data.answers);
}, false);

/** No SPA boot, client Firestore write, visitor login, or arbitrary destination query parameter. */
export const measurementRedirect = onRequest({ ...options, timeoutSeconds: 15, cors: false }, async (req, res) => {
  res.set('Cache-Control', 'private, no-store, max-age=0, s-maxage=0');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'HEAD'].includes(req.method)) { res.set('Allow', 'GET, HEAD').status(405).send('Method not allowed'); return; }
  const match = req.path.match(/^\/r\/([A-Za-z0-9_-]{32})\/?$/);
  if (!match) { res.status(410).send('This legacy QR link needs to be republished from AccelRestaurants.'); return; }
  const service = engine();
  try {
    const p = await service.placement(match[1]);
    const userAgent = req.get('user-agent') || '';
    const automated = /bot\b|spider|crawler|preview|facebookexternalhit|slack|discord|whatsapp|telegram|headless/i.test(userAgent) || /prefetch|prerender/i.test(`${req.get('purpose') || ''} ${req.get('sec-purpose') || ''}`);
    if (req.method === 'HEAD' || automated) {
      res.redirect(302, p.kind === 'external' ? p.destinationUrl : `${service.origin}/engage/${p.id}`); return;
    }
    await service.publicRate(req.ip || '', p.id);
    let destination: string;
    try { destination = await service.scan(p); }
    catch (error) {
      logger.error('measurement_scan_write_failed', { placementId: p.id, errorType: error instanceof Error ? error.name : 'unknown' });
      // A measurement outage must not block an external restaurant menu; do not pretend this scan was counted.
      if (p.kind !== 'external') { res.status(503).send('Feedback is temporarily unavailable. Please try again.'); return; }
      destination = p.destinationUrl;
    }
    res.redirect(302, destination);
  } catch (error) {
    if (error instanceof MeasurementError) {
      if (error.code === 'resource-exhausted') { res.set('Retry-After', '60').status(429).send(error.message); return; }
      res.status(error.code === 'not-found' ? 404 : 410).send(error.message); return;
    }
    logger.error('measurement_redirect_failed', { errorType: error instanceof Error ? error.name : 'unknown' });
    res.status(503).send('This QR link is temporarily unavailable.');
  }
});

export const aggregateMeasurementEvent = onDocumentCreated({ document: 'measurement_events/{eventId}', region: 'us-central1', retry: true, maxInstances: 10 }, async event => {
  await engine().project(event.params.eventId);
});
export const reconcileMeasurementEvents = onSchedule({ schedule: 'every 15 minutes', region: 'us-central1', maxInstances: 1 }, async () => {
  await engine().reconcile();
});
