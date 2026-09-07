import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { MeasurementService, measurementError, measurementScores, type MeasurementReport } from '../../services/measurementService';

export function MeasurementSummary() {
  const { organization } = useAuthStore();
  const [report, setReport] = useState<MeasurementReport | null>(null); const [error, setError] = useState('');
  useEffect(() => {
    if (!organization?.id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const parts = new Intl.DateTimeFormat('en-GB', { timeZone: organization.timezone || 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
        const part = (key: string) => parts.find(p => p.type === key)!.value;
        const to = `${part('year')}-${part('month')}-${part('day')}`;
        const start = new Date(`${to}T12:00:00Z`); start.setUTCDate(start.getUTCDate() - 6);
        const result = await MeasurementService.report(organization.id, start.toISOString().slice(0, 10), to);
        if (!cancelled) { setReport(result); setError(''); }
      } catch (reason) { if (!cancelled) setError(measurementError(reason)); }
    };
    void load(); const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [organization?.id, organization?.timezone]);
  const counts = report?.totals || {}; const scores = measurementScores(counts);
  const observed = !!report?.updatedAt;
  return <section className="rounded-lg border border-surface-highlight bg-surface p-6 min-h-64">
    <h3 className="text-xl font-semibold mb-2">Measured guest engagement</h3><p className="text-sm text-text-muted mb-6">Last 7 location-local days · Live data only</p>
    {error ? <p role="alert" className="mb-4">{error}</p> : !report ? <p role="status">Loading measurement…</p> : <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">{[['QR scans', observed ? counts.scans || 0 : '—'], ['Engaged scans', observed ? counts.cohortEngaged || 0 : '—'], ['Responses', observed ? counts.surveySubmits || 0 : '—'], ['NPS', scores.nps === null ? '—' : Math.round(scores.nps)]].map(([label, amount]) => <div key={label}><p className="text-xs text-text-muted">{label}</p><p className="text-2xl font-bold tabular-nums">{amount}</p></div>)}</div>}
    <p className="text-sm text-text-muted mb-5">{observed ? `NPS sample: ${counts.npsResponses || 0}. Engagement is not verified revenue.` : 'Create a campaign and authorize a player to begin. Missing telemetry is not replaced with invented results.'}</p>
    <Link to="/admin/analytics" className="ui-button ui-button-primary">Open measurement dashboard</Link>
  </section>;
}
