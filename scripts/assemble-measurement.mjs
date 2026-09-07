// One-shot source assembly; removed together with its branch-only workflow after integration.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const read = p => readFileSync(p, 'utf8');
const write = (p, s) => writeFileSync(p, s);
function patch(p, before, after) {
  const source = read(p);
  if (!source.includes(before)) throw new Error(`Integration anchor missing in ${p}: ${before.slice(0, 100)}`);
  write(p, source.replace(before, after));
}
function json(p, fn) { const value = JSON.parse(read(p)); fn(value); write(p, JSON.stringify(value, null, 2) + '\n'); }

patch('functions/src/index.ts', "admin.initializeApp();", "admin.initializeApp();\n\nexport { createMeasurementCampaign, setMeasurementCampaignStatus, bindMeasurementCampaign, requestMeasurementPairing, approveMeasurementPairing, openMeasurementSession, getMeasurementManifest, ingestMeasurementBuckets, getMeasurementDashboard, getMeasurementEngagement, recordMeasurementAction, submitMeasurementSurvey, measurementRedirect, aggregateMeasurementEvent, reconcileMeasurementEvents } from './measurement';");
json('functions/tsconfig.json', c => { c.compilerOptions.target = 'es2022'; c.compilerOptions.lib = ['es2022', 'dom']; });
patch('functions/src/measurement/engine.ts', 'Object.hasOwnProperty.call(fields, action)', 'Object.prototype.hasOwnProperty.call(fields, action)');
patch('src/types/schema.ts', '  trackScan?: boolean;', '  trackScan?: boolean;\n  measurementCampaignId?: string; // Server-authored campaign binding; never visitor-provided attribution.');

const player = 'src/pages/PlayerScreen.tsx';
patch(player, "import { auth, functions } from '../lib/firebase';", "import { auth, functions, db } from '../lib/firebase';\nimport { doc, onSnapshot } from 'firebase/firestore';\nimport { usePlayerMeasurement, type MeasurementRuntime } from '../hooks/usePlayerMeasurement';\nimport { MeasuredQR } from '../components/atoms/MeasuredQR';");
patch(player,
  'const SlideRenderer = ({ slide, isActive, screenId, orgId, adjustments }: { slide: Slide; isActive: boolean; screenId?: string; orgId?: string; adjustments?: ScreenAdjustments }) => {',
  'const SlideRenderer = ({ slide, isActive, screenId, orgId, adjustments, measurement, measurementActive }: { slide: Slide; isActive: boolean; screenId?: string; orgId?: string; adjustments?: ScreenAdjustments; measurement?: MeasurementRuntime; measurementActive?: boolean }) => {');
patch(player, '{slide.elements.map(tile => (', '{slide.elements.filter(tile => tile.visible !== false).map(tile => (');
patch(player, 'zIndex: tile.zIndex\n', 'zIndex: tile.zIndex,\n                opacity: tile.opacity ?? 1\n');
patch(player,
  '<TileContent tile={tile} screenId={screenId} orgId={orgId} />',
  `{tile.type === 'qr_code' && ((tile.properties as InteractiveTileProperties).measurementCampaignId || ((tile.properties as InteractiveTileProperties).trackScan && (tile.properties as InteractiveTileProperties).qrSource !== 'calendar_event')) ? (
                <MeasuredQR tile={tile} measurement={measurement} placement={measurement?.placements[slide.id + ':' + tile.id]} active={!!measurementActive} />
              ) : <TileContent tile={tile} screenId={screenId} orgId={orgId} />}`);
patch(player, '  // Check Deployment Duration Limit', `  const hasMeasuredTiles = allSlides.some(slide => slide.elements.some(tile => tile.type === 'qr_code' && ((tile.properties as InteractiveTileProperties).trackScan || (tile.properties as InteractiveTileProperties).measurementCampaignId)));
  const measurement = usePlayerMeasurement(screenId, playerAuthReady && hasMeasuredTiles, allSlides, screen?.locationId || '');

  // Refresh actual slide revisions without requiring an unrelated screen save.
  const liveSlideIds = JSON.stringify(normalizePlaylist(screen?.livePlaylist || []).map(entry => entry.slideId));
  useEffect(() => {
    const unsubscribes = (JSON.parse(liveSlideIds) as string[]).map(slideId => onSnapshot(doc(db, 'slides', slideId), snapshot => {
      if (!snapshot.exists()) return;
      const next = { ...snapshot.data(), id: snapshot.id } as Slide;
      setAllSlides(current => current.map(slide => slide.id === next.id ? next : slide));
    }, () => { /* Keep last known content; telemetry remains visibly delayed. */ }));
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, [liveSlideIds]);

  // Check Deployment Duration Limit`);
patch(player, '              isActive={true}', '              isActive={isCurrent}\n              measurement={measurement}\n              measurementActive={isCurrent && !showPromoOverlay && !activeTrigger && !isTimeLimitReached}');
patch(player, '      <GlobalMediaPlane screen={screen} location={location} />', `      <GlobalMediaPlane screen={screen} location={location} />
      {hasMeasuredTiles && measurement.message && <div role="status" className="absolute bottom-2 left-2 z-[200] max-w-md rounded-lg bg-black/85 text-white p-2 text-xs pointer-events-none">{measurement.message}{measurement.pairingCode && <strong className="block text-lg tracking-widest mt-1">{measurement.pairingCode}</strong>}</div>}`);

const tileFile = 'src/components/atoms/TileContent.tsx';
patch(tileFile, 'const QRCodeTile = ({ properties, tileId, screenId, orgId }:', 'const QRCodeTile = ({ properties }:');
const qrSource = read(tileFile);
const wrapperStart = qrSource.indexOf('  let qrValue = generatedContent || content;');
const wrapperEnd = qrSource.indexOf('\n  }', wrapperStart) + '\n  }'.length;
if (wrapperStart < 0 || !qrSource.slice(wrapperStart, wrapperEnd).includes('/r?url=')) throw new Error('Legacy QR wrapper not found');
write(tileFile, qrSource.slice(0, wrapperStart) + '  const qrValue = generatedContent || content; // Measured player QR URLs come from immutable server placements.' + qrSource.slice(wrapperEnd));

patch('src/App.tsx', "const RedirectTracker = lazy(", "const EngagementPage = lazy(() => import('./pages/EngagementPage').then(module => ({ default: module.EngagementPage })));\nconst RedirectTracker = lazy(");
patch('src/App.tsx', '<Route path="/r" element={<RedirectTracker />} />', '<Route path="/r" element={<RedirectTracker />} />\n          <Route path="/engage/:placementId" element={<EngagementPage />} />');
patch('src/pages/AdminDashboard.tsx', '<Route path="/analytics" element={<div className="p-4 sm:p-8"><QRAnalyticsView /></div>} />', '<Route path="/analytics/*" element={<QRAnalyticsView />} />');
write('src/components/organisms/QRAnalyticsView.tsx', "export { MeasurementDashboard as QRAnalyticsView } from './MeasurementDashboard';\n");
write('src/components/organisms/PerformanceMetricsWidget.tsx', "export { MeasurementSummary as PerformanceMetricsWidget } from './MeasurementSummary';\n");
write('src/pages/RedirectTracker.tsx', `export const RedirectTracker = () => <main className="min-h-screen bg-background text-text flex flex-col items-center justify-center p-6"><h1 className="text-2xl font-bold mb-3">This QR link needs an update</h1><p>Ask the restaurant to republish this QR tile. Legacy links cannot provide trustworthy attribution.</p></main>;\n`);
const overview = 'src/components/organisms/DashboardOverview.tsx';
patch(overview, "import { AnalyticsService } from '../../services/analyticsService';\n", '');
patch(overview, '  QrCode,\n', '');
patch(overview, '    media: 0,\n    qrScans: 0', '    media: 0');
patch(overview, '[screens, menus, slides, mediaFiles, qrScans]', '[screens, menus, slides, mediaFiles]');
patch(overview, '          AnalyticsService.getQRScanCount(orgId)\n', '');
patch(overview, '          media: mediaFiles.length,\n          qrScans', '          media: mediaFiles.length');
const overviewSource = read(overview);
const legacyCard = /        <StatCard\s+title="Total Interactions"[\s\S]*?\/>/;
if (!legacyCard.test(overviewSource)) throw new Error('Legacy QR summary card missing');
write(overview, overviewSource.replace(legacyCard, ''));
write('src/services/analyticsService.ts', "// Deprecated public metric writers removed. All new analytics come from server-maintained aggregates.\nexport { MeasurementService as AnalyticsService } from './measurementService';\n");

const firebase = 'src/lib/firebase.ts';
patch(firebase, 'import { getAuth }', 'import { getAuth, connectAuthEmulator }');
patch(firebase, 'import { initializeFirestore }', 'import { initializeFirestore, connectFirestoreEmulator }');
patch(firebase, 'import { getStorage }', 'import { getStorage, connectStorageEmulator }');
patch(firebase, 'import { getFunctions }', 'import { getFunctions, connectFunctionsEmulator }');
patch(firebase, 'const app = initializeApp(firebaseConfig);', `const emulatorMode = import.meta.env.VITE_USE_EMULATORS === 'true';
if (emulatorMode && !String(firebaseConfig.projectId).startsWith('demo-')) throw new Error('Emulator builds must use a demo-* Firebase project.');
const app = initializeApp(firebaseConfig);`);
const analyticsStart = read(firebase).indexOf('// Initialize Analytics and Performance');
if (analyticsStart < 0) throw new Error('Firebase telemetry initializer missing');
write(firebase, read(firebase).slice(0, analyticsStart) + `if (emulatorMode) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}
// Guest engagement tokens and survey answers never enter third-party product analytics.
const allowProductTelemetry = typeof window !== 'undefined' && !emulatorMode && !/^\\/(engage|r|player)(?:\\/|$)/.test(window.location.pathname);
export const analytics = allowProductTelemetry ? getAnalytics(app) : null;
export const performance = allowProductTelemetry ? getPerformance(app) : null;
`);
patch('vite.config.ts', '        cleanupOutdatedCaches: true,', '        cleanupOutdatedCaches: true,\n        navigateFallbackDenylist: [/^\\/r(?:\\/|$)/, /^\\/engage(?:\\/|$)/],');
json('firebase.json', c => {
  c.hosting.rewrites = [{ source: '/r', function: { functionId: 'measurementRedirect', region: 'us-central1' } }, { source: '/r/**', function: { functionId: 'measurementRedirect', region: 'us-central1' } }, ...c.hosting.rewrites];
  c.hosting.headers ||= [];
  for (const source of ['/r', '/r/**', '/engage/**']) c.hosting.headers.push({ source, headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }, { key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] });
});

let rules = read('firestore.rules');
rules = rules.replace(/    \/\/ Daily Metrics Collection[\s\S]*?    \/\/ Polls Collection/, `    // Legacy analytics are retained for offline export only, never trusted or writable by clients.
    match /daily_metrics/{metricId} { allow read, write: if false; }
    match /qr_scans/{scanId} { allow read, write: if false; }

    // First-party measurement: all operations go through server-authenticated, location-scoped APIs.
${['measurement_campaigns','measurement_surveys','measurement_devices','measurement_sessions','measurement_pairings','measurement_pairing_requests','measurement_placement_keys','campaign_placements','measurement_usage','measurement_salts','measurement_buckets','measurement_events','measurement_guests','measurement_responses','measurement_receipts','measurement_daily'].map(name => `    match /${name}/{document=**} { allow read, write: if false; }`).join('\n')}

    // Polls Collection`);
if (rules.includes('resource.data.orgId == null || // Legacy support')) throw new Error('Legacy public scan rule was not removed');
write('firestore.rules', rules);
json('firestore.indexes.json', c => {
  c.indexes.push({ collectionGroup: 'measurement_daily', queryScope: 'COLLECTION', fields: ['orgId','mode','scope','date'].map(fieldPath => ({ fieldPath, order: 'ASCENDING' })) });
  c.indexes.push({ collectionGroup: 'measurement_events', queryScope: 'COLLECTION', fields: ['projectedAt','receivedAt'].map(fieldPath => ({ fieldPath, order: 'ASCENDING' })) });
  for (const collectionGroup of ['measurement_events','measurement_buckets','measurement_receipts','measurement_guests','measurement_sessions','measurement_responses','measurement_pairings','measurement_pairing_requests','measurement_usage','measurement_salts']) c.fieldOverrides.push({ collectionGroup, fieldPath: 'expireAt', ttl: true, indexes: [] });
  for (const [collectionGroup, fieldPath] of [['measurement_responses','answers'], ['measurement_daily','counts'], ['measurement_daily','hours'], ['measurement_events','metrics'], ['measurement_events','cohortMetrics'], ['measurement_surveys','questions']]) c.fieldOverrides.push({ collectionGroup, fieldPath, indexes: [] });
});
// Keep cumulative exposure state across manifest refreshes; only identity changes start a new measurement effect.
patch('src/components/atoms/MeasuredQR.tsx', '  const enabled = measurement?.enabled;', '  const placementId = placement?.placementId;\n  const enabled = measurement?.enabled;');
patch('src/components/atoms/MeasuredQR.tsx', '!placement || !serverNow', '!placementId || !serverNow');
patch('src/components/atoms/MeasuredQR.tsx', 'sessionId, placement.placementId,', 'sessionId, placementId,');
patch('src/components/atoms/MeasuredQR.tsx', 'uid, placement, serverNow]', 'uid, placementId, serverNow]');
// Administrator previews stay test-only, but can enroll the browser and transition to a live device session.
patch('src/hooks/usePlayerMeasurement.ts', 'if (!current || current.expiresAt <= Date.now())', "if (!current || current.expiresAt <= Date.now() || current.mode === 'test')");
patch('src/hooks/usePlayerMeasurement.ts', "setSession(current); setPlacements(mapping); setPairingCode('');", "setSession(current); setPlacements(mapping); setPairingCode('');\n        if (current.mode === 'test') {\n          const pending = await MeasurementService.requestPairing(screenId).catch(() => null);\n          if (!cancelled && pending) setPairingCode(pending.code);\n        }");
console.log('Measurement source integration complete. No production Firebase resources were contacted.');
