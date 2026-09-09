import { validateCatalogue, type PlanCatalogue } from '../../functions/src/journey/catalog';

export type CatalogueSource = 'live' | 'cached' | 'bundled';
export interface CatalogueSnapshot { configs: PlanCatalogue; source: CatalogueSource; savedAt: number | null }
interface StoredCatalogue { version: 1; savedAt: number; configs: PlanCatalogue }
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const READ_TIMEOUT_MS = 5000;

/** Display-only cache. Never read by Functions, checkout, or authorization rules. */
export function createCatalogueReader(scope: string, bootstrap: unknown, storage: () => StoragePort | undefined = () => globalThis.localStorage) {
  const key = `accel:public-plans:v1:${scope}`;
  let memory: StoredCatalogue | undefined;
  let pending: Promise<CatalogueSnapshot> | undefined;
  const unpack = (value: unknown): StoredCatalogue | undefined => {
    if (!value || typeof value !== 'object') return;
    const raw = value as StoredCatalogue;
    if (raw.version !== 1 || !Number.isFinite(raw.savedAt) || raw.savedAt > Date.now() || Date.now() - raw.savedAt > MAX_AGE_MS) return;
    return { version: 1, savedAt: raw.savedAt, configs: validateCatalogue(raw.configs) };
  };
  const remember = (value: unknown): CatalogueSnapshot => {
    const configs = validateCatalogue(value);
    memory = { version: 1, savedAt: Date.now(), configs };
    try { storage()?.setItem(key, JSON.stringify(memory)); } catch { /* Storage denial must not reject a successful read/save. */ }
    return { configs: validateCatalogue(configs), source: 'live', savedAt: memory.savedAt };
  };
  const fallback = (): CatalogueSnapshot => {
    let saved: StoredCatalogue | undefined;
    try { saved = unpack(memory); } catch { /* Invalid memory is never trusted. */ }
    try {
      const raw = storage()?.getItem(key);
      const persisted = raw && raw.length < 128000 ? unpack(JSON.parse(raw)) : undefined;
      if (persisted && (!saved || persisted.savedAt > saved.savedAt)) saved = persisted;
    } catch { /* Corrupt, expired, or unavailable browser storage uses the bootstrap catalogue. */ }
    if (saved) return { configs: validateCatalogue(saved.configs), source: 'cached', savedAt: saved.savedAt };
    return { configs: validateCatalogue(bootstrap), source: 'bundled', savedAt: null };
  };
  const load = (read: () => Promise<unknown>): Promise<CatalogueSnapshot> => {
    if (pending) return pending;
    pending = (async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const value = await Promise.race([
          Promise.resolve().then(read),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Plan read timed out')), READ_TIMEOUT_MS); }),
        ]);
        return remember(value);
      } catch { return fallback(); }
      finally { clearTimeout(timer); pending = undefined; }
    })();
    return pending;
  };
  return { load, remember };
}
