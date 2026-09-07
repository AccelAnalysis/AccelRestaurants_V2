import { useCallback, useEffect, useState } from 'react';
import { ConfigService } from '../services/configService';
import { validateCatalogue, type PlanCatalogue } from '../../functions/src/journey/catalog';
export function usePlanCatalogue() {
  const [catalogue, setCatalogue] = useState<PlanCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(n => n + 1), []);
  useEffect(() => {
    let disposed = false;
    setLoading(true); setError(null); setCatalogue(null);
    ConfigService.getPlanConfigs().then(value => {
      const checked = validateCatalogue(value);
      if (!disposed) setCatalogue(checked);
    }).catch(() => { if (!disposed) setError('We could not load current plan details. You can still create a free design, or try again.'); }).finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [attempt]);
  return { catalogue, loading, error, retry };
}
