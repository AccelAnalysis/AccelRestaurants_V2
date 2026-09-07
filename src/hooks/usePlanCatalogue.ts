import { useCallback, useEffect, useState } from 'react';
import { ConfigService } from '../services/configService';
import { validateCatalogue } from '../../functions/src/journey/catalog';
import type { CatalogueSnapshot } from '../lib/planCatalogueCache';

export function usePlanCatalogue() {
  const [snapshot, setSnapshot] = useState<CatalogueSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => { setLoading(true); setError(null); setAttempt(n => n + 1); }, []);
  useEffect(() => {
    let disposed = false;
    ConfigService.getPlanCatalogue().then(value => {
      const checked = { ...value, configs: validateCatalogue(value.configs) };
      if (!disposed) setSnapshot(checked);
    }).catch(() => { if (!disposed) setError('We could not load plan details. You can still create a free design, or try again.'); })
      .finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [attempt]);
  const notice = snapshot?.source === 'cached' ? 'Showing saved plan details. Final pricing is confirmed at checkout.'
    : snapshot?.source === 'bundled' ? 'Plan details could not be refreshed. Review current pricing before payment.' : null;
  return { catalogue: snapshot?.configs || null, source: snapshot?.source, savedAt: snapshot?.savedAt, loading, error, notice, retry };
}
