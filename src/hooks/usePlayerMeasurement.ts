import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { auth } from '../lib/firebase';
import { flushPlayback } from '../lib/measurementQueue';
import { MeasurementService, measurementError, type MeasurementSession, type PlacementHint } from '../services/measurementService';
import type { Slide } from '../types/schema';

export type MeasurementRuntime = {
  session: MeasurementSession | null; placements: Record<string, PlacementHint>; enabled: boolean;
  uid: string; message: string; pairingCode: string; serverNow: () => number;
};
type CachedManifest = { session: MeasurementSession; placements: Record<string, PlacementHint>; fingerprint: string; offset: number };

export function usePlayerMeasurement(screenId: string | undefined, ready: boolean, slides: Slide[], locationId: string): MeasurementRuntime {
  const [session, setSession] = useState<MeasurementSession | null>(null);
  const [placements, setPlacements] = useState<Record<string, PlacementHint>>({});
  const [message, setMessage] = useState(''); const [pairingCode, setPairingCode] = useState('');
  const [visible, setVisible] = useState(document.visibilityState === 'visible'); const [leader, setLeader] = useState(false);
  const anchor = useRef({ epoch: Date.now(), monotonic: performance.now() });
  const uid = auth.currentUser?.uid || '';
  const fingerprint = useMemo(() => JSON.stringify({ locationId, versions: Object.fromEntries(slides.map(s => [s.id, s.updatedAt?.toMillis?.() || 0])) }), [slides, locationId]);
  const serverNow = useCallback(() => anchor.current.epoch + performance.now() - anchor.current.monotonic, []);

  useEffect(() => {
    const onVisibility = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!ready || !screenId || !uid || !visible) return;
    const controller = new AbortController(); let release: (() => void) | undefined; let cancelled = false;
    if (!navigator.locks) { setMessage('This browser cannot coordinate playback measurement. QR engagement still works.'); return; }
    const held = new Promise<void>(resolve => { release = resolve; });
    void navigator.locks.request(`accel-proof:${uid}:${screenId}`, { signal: controller.signal }, async () => {
      if (cancelled) return;
      setLeader(true); await held;
      if (!cancelled) setLeader(false);
    }).catch(() => { /* A pending lock is cancelled when this player leaves the foreground. */ });
    return () => { cancelled = true; setLeader(false); release?.(); controller.abort(); };
  }, [ready, screenId, uid, visible]);

  useEffect(() => {
    if (!ready || !screenId || !uid || !locationId) return;
    let cancelled = false; let loading = false;
    const storageKey = `accel-measurement:${uid}:${screenId}:${window.location.origin}`;
    let cached: CachedManifest | null = null;
    try { cached = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { /* Storage may be disabled. */ }
    let current = cached?.session && cached.session.expiresAt > Date.now() ? cached.session : null;
    if (current && cached?.fingerprint === fingerprint) {
      setSession(current); setPlacements(cached.placements);
      anchor.current = { epoch: Date.now() + cached.offset, monotonic: performance.now() };
    } else { setSession(null); setPlacements({}); }
    const refresh = async () => {
      if (loading || cancelled) return;
      loading = true;
      try {
        if (!current || current.expiresAt <= Date.now() || current.mode === 'test') current = await MeasurementService.openSession(screenId);
        const slideVersions = (JSON.parse(fingerprint) as { versions: Record<string, number> }).versions;
        const manifest = await MeasurementService.manifest(current.sessionId, slideVersions);
        if (cancelled) return;
        const mapping = Object.fromEntries(manifest.placements.map(p => [`${p.slideId}:${p.tileId}`, p]));
        anchor.current = { epoch: manifest.serverTime, monotonic: performance.now() };
        setSession(current); setPlacements(mapping); setPairingCode('');
        if (current.mode === 'test') {
          const pending = await MeasurementService.requestPairing(screenId).catch(() => null);
          if (!cancelled && pending) setPairingCode(pending.code);
        }
        setMessage(manifest.warnings[0] || (manifest.mode === 'test' ? 'Test measurement — excluded from live reports' : ''));
        try { localStorage.setItem(storageKey, JSON.stringify({ session: current, placements: mapping, fingerprint, offset: manifest.serverTime - Date.now() } satisfies CachedManifest)); } catch { /* In-memory measurement still works. */ }
        void flushPlayback();
      } catch (error) {
        if (cancelled) return;
        const code = (error as { code?: string }).code || '';
        if (code.includes('permission-denied') || code.includes('unauthenticated')) {
          current = null; setSession(null); setPlacements({});
          try {
            const pair = await MeasurementService.requestPairing(screenId);
            if (!cancelled) { setPairingCode(pair.code); setMessage('Enable measurement in Analytics → Setup using this code. Playback is unaffected.'); }
          } catch (pairError) { if (!cancelled) setMessage(measurementError(pairError)); }
        } else setMessage(current ? 'Offline telemetry queue active; live reporting will catch up after reconnection.' : measurementError(error));
      } finally { loading = false; }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 60_000);
    const online = () => { void refresh(); };
    window.addEventListener('online', online);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('online', online); };
  }, [ready, screenId, uid, fingerprint, locationId]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setInterval(() => { void flushPlayback(); }, 20_000);
    const upload = () => { void flushPlayback(); };
    const onHealth = (event: Event) => setMessage((event as CustomEvent<string>).detail);
    window.addEventListener('online', upload); window.addEventListener('measurement-health', onHealth);
    return () => { clearInterval(timer); window.removeEventListener('online', upload); window.removeEventListener('measurement-health', onHealth); };
  }, [ready]);
  return { session, placements, enabled: ready && leader && visible && !!session, uid, message, pairingCode, serverNow };
}
