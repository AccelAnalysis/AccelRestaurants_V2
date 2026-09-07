import { useAuthStore } from '../../store/useAuthStore';
import { usePlanCatalogue } from '../../hooks/usePlanCatalogue';
import { getEffectivePlanLimits, type PlanLimits, type PlanType } from '../../lib/plans';

function Usage({ label, used, limit }: { label: string; used: number | undefined; limit: number | undefined }) {
  const ratio = used !== undefined && limit !== undefined && limit > 0 ? used / limit : null;
  const warning = ratio !== null && ratio >= 1 ? (ratio > 1 ? 'Above your allowance' : 'Allowance reached')
    : ratio !== null && ratio >= 0.8 ? 'Approaching your allowance' : limit === 0 && used !== undefined ? 'No allowance available' : null;
  return <div>
    <div className="flex justify-between gap-3 text-sm"><span>{label}</span><span className="tabular-nums">{used ?? '—'} / {limit === -1 ? 'Unlimited' : limit ?? '—'}</span></div>
    {ratio !== null && <progress className="block w-full h-2 mt-2 accent-primary" aria-label={`${label} allowance used`} max={100} value={Math.min(100, ratio * 100)} />}
    {warning && <p className="text-sm text-text-secondary mt-2">{warning}</p>}
  </div>;
}

/** Read-only usage: the browser never grants allowances or changes a subscription. */
export function PlanUsage() {
  const { organization } = useAuthStore();
  const { catalogue, notice, error, loading, retry } = usePlanCatalogue();
  if (!organization) return null;
  const limits = catalogue ? getEffectivePlanLimits(organization, catalogue as Record<PlanType, PlanLimits>) : undefined;
  const screens = Number.isInteger(organization.screenCount) && organization.screenCount >= 0 ? organization.screenCount : undefined;
  // The server maintains this member UID list; do not replace an unavailable count with zero.
  const seats = Array.isArray(organization.members) ? new Set(organization.members).size : undefined;
  return <section aria-label="Plan usage" className="space-y-4 mt-5">
    <h3 className="font-semibold">Usage and allowances</h3>
    <Usage label="Screens" used={screens} limit={limits?.screens} />
    <Usage label="Team members" used={seats} limit={limits?.seats} />
    <p className="text-sm text-text-secondary">Allowances include purchased extras and any restaurant-specific adjustments.</p>
    {(notice || error) && <p role="status" className="text-sm text-text-secondary">{notice || error} <button type="button" disabled={loading} className="underline min-h-11" onClick={retry}>Refresh allowances</button></p>}
  </section>;
}
