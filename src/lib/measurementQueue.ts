import { auth } from './firebase';
import { MeasurementService, type PlaybackBucket } from '../services/measurementService';

type StoredBucket = PlaybackBucket & { key: string; uid: string; ackPlays: number; ackVisibleMs: number };
const MINUTE = 60_000;
const MAX_AGE = 7 * 86_400_000;
const MAX_ROWS = 20_000;
const wireKey = (b: PlaybackBucket) => `${b.sessionId}:${b.placementId}:${b.windowStart}`;
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  database ||= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('accel-measurement-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('buckets', { keyPath: 'key' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Measurement local storage is blocked.'));
  });
  return database;
}
async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction('buckets', mode); let result: T;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Measurement storage transaction aborted.'));
    run(tx.objectStore('buckets'), value => { result = value; });
  });
}
const health = (message: string) => window.dispatchEvent(new CustomEvent('measurement-health', { detail: message }));

/** IndexedDB read-modify-write transactions preserve counters when samples overlap an acknowledgement. */
export async function recordPlayback(uid: string, sessionId: string, placementId: string, end: number, elapsedMs: number, plays: number) {
  if (!uid || elapsedMs <= 0) return;
  try {
    let cursor = Math.floor(end - elapsedMs); const until = Math.floor(end);
    while (cursor < until) {
      const windowStart = Math.floor(cursor / MINUTE) * MINUTE;
      const segmentEnd = Math.min(until, windowStart + MINUTE);
      const segmentPlays = segmentEnd === until ? plays : 0;
      const delta = segmentEnd - cursor;
      const key = `${uid}:${sessionId}:${placementId}:${windowStart}`;
      await transaction<void>('readwrite', (store, done) => {
        const request = store.get(key);
        request.onsuccess = () => {
          const previous: StoredBucket = request.result || { key, uid, sessionId, placementId, windowStart, plays: 0, visibleMs: 0, ackPlays: 0, ackVisibleMs: 0 };
          store.put({ ...previous, plays: Math.min(60, previous.plays + segmentPlays), visibleMs: Math.min(MINUTE, previous.visibleMs + delta) }); done();
        };
      });
      cursor = segmentEnd;
    }
  } catch { health('Playback continues, but local measurement storage is unavailable.'); }
}
async function rows() {
  return transaction<StoredBucket[]>('readonly', (store, done) => { const request = store.getAll(); request.onsuccess = () => done(request.result); });
}
async function acknowledge(sent: StoredBucket, rejected: boolean) {
  await transaction<void>('readwrite', (store, done) => {
    const request = store.get(sent.key);
    request.onsuccess = () => {
      const current = request.result as StoredBucket | undefined;
      if (current) {
        if (rejected) store.delete(sent.key);
        else store.put({ ...current, ackPlays: Math.max(current.ackPlays, sent.plays), ackVisibleMs: Math.max(current.ackVisibleMs, sent.visibleMs) });
      }
      done();
    };
  });
}
let flushing = false; let retryAt = 0; let failures = 0;
export async function flushPlayback() {
  if (flushing || !navigator.onLine || Date.now() < retryAt || !auth.currentUser) return;
  flushing = true;
  const uid = auth.currentUser.uid;
  try {
    const all = (await rows()).sort((a, b) => a.windowStart - b.windowStart);
    const stale = all.filter(b => b.windowStart < Date.now() - MAX_AGE || (b.ackPlays >= b.plays && b.ackVisibleMs >= b.visibleMs && b.windowStart < Date.now() - 2 * MINUTE));
    const staleKeys = new Set(stale.map(b => b.key));
    const retained = all.filter(b => !staleKeys.has(b.key));
    const overflow = retained.slice(0, Math.max(0, retained.length - MAX_ROWS));
    if (stale.some(b => b.plays > b.ackPlays || b.visibleMs > b.ackVisibleMs) || overflow.length) health('Some playback telemetry expired or exceeded local capacity; it has not been counted.');
    await transaction<void>('readwrite', (store, done) => { [...stale, ...overflow].forEach(b => store.delete(b.key)); done(); });
    const overflowKeys = new Set(overflow.map(b => b.key));
    const pending = retained.filter(b => b.uid === uid && !overflowKeys.has(b.key) && (b.plays > b.ackPlays || b.visibleMs > b.ackVisibleMs)).slice(0, 125);
    for (let i = 0; i < pending.length; i += 25) {
      if (auth.currentUser?.uid !== uid) break;
      const batch = pending.slice(i, i + 25);
      const result = await MeasurementService.ingest(batch.map(({ sessionId, placementId, windowStart, plays, visibleMs }) => ({ sessionId, placementId, windowStart, plays, visibleMs })));
      const accepted = new Set(result.accepted); const rejected = new Set(result.rejected.map(r => r.key));
      for (const b of batch) if (accepted.has(wireKey(b)) || rejected.has(wireKey(b))) await acknowledge(b, rejected.has(wireKey(b)));
      if (result.rejected.length) health(`Some telemetry was rejected: ${result.rejected[0].reason}`);
    }
    failures = 0; retryAt = 0;
  } catch {
    failures++; retryAt = Date.now() + Math.min(120_000, 2000 * 2 ** Math.min(failures, 6)) + Math.random() * 1000;
    health('Telemetry upload delayed; playback continues and measurements are queued locally.');
  } finally { flushing = false; }
}
