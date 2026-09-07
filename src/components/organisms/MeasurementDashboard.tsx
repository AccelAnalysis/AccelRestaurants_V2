import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useMatch, useSearchParams } from 'react-router-dom';
import { Activity, ArrowDownToLine, RefreshCw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuthStore } from '../../store/useAuthStore';
import { MeasurementService, measurementError, measurementScores, type AggregateRow, type Counts, type MeasurementMode, type MeasurementReport } from '../../services/measurementService';
import { MeasurementSetup } from './MeasurementSetup';

const format = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const value = (n: number | null | undefined, suffix = '') => n === null || n === undefined ? '—' : `${format.format(n)}${suffix}`;
function localToday(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function shiftDate(date: string, days: number) { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }

function Metric({ label, amount, detail }: { label: string; amount: string; detail: string }) {
  return <div className="rounded-xl border border-surface-highlight bg-surface p-5"><p className="text-sm text-text-muted mb-2">{label}</p><p className="text-3xl font-semibold tabular-nums">{amount}</p><p className="mt-2 text-xs text-text-muted">{detail}</p></div>;
}
function ResultTable({ rows, dimension }: { rows: AggregateRow[]; dimension: string }) {
  const ordered = [...rows].sort((a, b) => (b.counts.scans || 0) - (a.counts.scans || 0));
  return <div className="overflow-x-auto rounded-xl border border-surface-highlight bg-surface"><table className="w-full text-sm text-left">
    <caption className="text-left p-4 font-semibold">{dimension} comparison — recorded activity, not a causal ranking</caption>
    <thead className="bg-background text-text-muted"><tr>{[dimension, 'Plays', 'Scans', 'Scans / 100 plays', 'Survey responses', 'NPS · sample', 'CSAT · sample'].map(label => <th scope="col" className="px-4 py-3 whitespace-nowrap" key={label}>{label}</th>)}</tr></thead>
    <tbody>{ordered.map(row => { const score = measurementScores(row.counts); return <tr key={row.id} className="border-t border-surface-highlight"><th scope="row" className="px-4 py-4 font-medium">{dimension === 'Campaign' ? <Link to={`/admin/analytics/campaign/${row.id}`} className="text-primary underline">{row.name}</Link> : row.name}</th><td className="px-4 py-4 tabular-nums">{value(row.counts.plays || 0)}</td><td className="px-4 py-4 tabular-nums">{value(row.counts.scans || 0)}</td><td className="px-4 py-4 tabular-nums">{value(score.scanYield)}</td><td className="px-4 py-4 tabular-nums">{value(row.counts.surveySubmits || 0)}</td><td className="px-4 py-4 whitespace-nowrap">{value(score.nps)} · n={row.counts.npsResponses || 0}</td><td className="px-4 py-4 whitespace-nowrap">{value(score.csat, '%')} · n={row.counts.csatResponses || 0}</td></tr>; })}{!rows.length && <tr><td colSpan={7} className="px-4 py-8 text-text-muted text-center">No recorded measurement for this selection.</td></tr>}</tbody>
  </table></div>;
}
function Distribution({ title, data }: { title: string; data: { label: string; count: number }[] }) {
  return <section className="rounded-xl border border-surface-highlight bg-surface p-5"><h2 className="font-semibold mb-4">{title}</h2><div className="h-56" role="img" aria-label={`${title}: ${data.map(d => `${d.label}: ${d.count}`).join(', ')}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" opacity={0.15} /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#ea580c" /></BarChart></ResponsiveContainer></div><p className="text-sm text-text-muted mt-4">{data.map(d => `${d.label}: ${d.count}`).join(' · ')}</p></section>;
}
function exportReport(report: MeasurementReport, from: string, to: string) {
  const escape = (input: unknown) => { let str = String(input ?? ''); if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`; return `"${str.replace(/"/g, '""')}"`; };
  const rows: unknown[][] = [['Dimension', 'Name', 'Plays', 'Scans', 'Actions', 'Survey responses', 'NPS', 'NPS sample', 'CSAT percent', 'CSAT sample', 'From', 'To', 'Mode']];
  for (const [dimension, records] of [['Campaign', report.campaignRows], ['Location', report.locationRows], ['Screen', report.screenRows]] as const) for (const row of records) {
    const score = measurementScores(row.counts); rows.push([dimension, row.name, row.counts.plays || 0, row.counts.scans || 0, row.counts.actions || 0, row.counts.surveySubmits || 0, score.nps, row.counts.npsResponses || 0, score.csat, row.counts.csatResponses || 0, from, to, report.mode]);
  }
  const url = URL.createObjectURL(new Blob([rows.map(row => row.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `accel-engagement-${from}-${to}.csv`; link.click(); URL.revokeObjectURL(url);
}

export function MeasurementDashboard() {
  const { organization } = useAuthStore(); const location = useLocation();
  const campaignMatch = useMatch('/admin/analytics/campaign/:campaignId');
  const [params, setParams] = useSearchParams();
  const campaignId = campaignMatch?.params.campaignId || params.get('campaign') || '';
  const timezone = organization?.timezone || 'America/New_York';
  const [to, setTo] = useState(() => localToday(timezone)); const [from, setFrom] = useState(() => shiftDate(localToday(timezone), -6));
  const [mode, setMode] = useState<MeasurementMode>('live');
  const [report, setReport] = useState<MeasurementReport | null>(null); const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false); const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(n => n + 1), []);
  const view = location.pathname.endsWith('/setup') ? 'setup' : location.pathname.endsWith('/feedback') ? 'feedback' : location.pathname.endsWith('/locations') ? 'locations' : campaignMatch ? 'campaign' : 'overview';
  useEffect(() => {
    if (!organization?.id) return;
    let cancelled = false; let inFlight = false;
    setReport(null); setError('');
    const load = async () => {
      if (inFlight) return; inFlight = true; setRefreshing(true);
      try { const result = await MeasurementService.report(organization.id, from, to, campaignId, mode); if (!cancelled) { setReport(result); setError(''); } }
      catch (reason) { if (!cancelled) setError(measurementError(reason)); }
      finally { inFlight = false; if (!cancelled) setRefreshing(false); }
    };
    void load(); const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 20_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [organization?.id, from, to, campaignId, mode, revision]);
  const totals: Counts = report?.totals || {}; const scores = measurementScores(totals); const hasData = report?.updatedAt !== null && !!report;
  const campaign = report?.campaigns.find(c => c.id === campaignId);
  const series = useMemo(() => {
    if (!report) return [];
    const observed = new Map(report.daily.map(day => [day.date, day.counts]));
    const result = []; let cursor = from;
    for (let i = 0; cursor <= to && i < 94; i++, cursor = shiftDate(cursor, 1)) result.push({ date: cursor, scans: observed.has(cursor) ? observed.get(cursor)!.scans || 0 : null });
    return result;
  }, [report, from, to]);
  if (!organization) return <p role="status">Select your restaurant organization to view measurements.</p>;
  return <div className="p-4 sm:p-8 space-y-7 text-text">
    <header className="flex flex-wrap justify-between items-start gap-4"><div><p className="text-primary font-semibold text-sm flex items-center gap-2 mb-2"><Activity size={18} aria-hidden="true" /> AccelRestaurants Measurement</p><h1 className="text-3xl font-bold">{view === 'campaign' ? campaign?.name || 'Campaign detail' : view === 'feedback' ? 'Guest feedback' : view === 'locations' ? 'Locations & screens' : view === 'setup' ? 'Measurement setup' : 'Engagement overview'}</h1><p className="text-text-muted mt-2">Real campaign activity, guest actions, and satisfaction — attributed to their source.</p></div><div className="flex gap-2"><button type="button" className="ui-button ui-button-secondary" onClick={refresh} disabled={refreshing} aria-label="Refresh measurements"><RefreshCw size={18} aria-hidden="true" />Refresh</button>{report && <button type="button" className="ui-button ui-button-secondary" onClick={() => exportReport(report, from, to)}><ArrowDownToLine size={18} aria-hidden="true" />Export</button>}</div></header>
    <nav aria-label="Measurement views" className="flex flex-wrap gap-2 border-b border-surface-highlight pb-4">{[['Overview', '/admin/analytics'], ['Feedback', '/admin/analytics/feedback'], ['Locations & screens', '/admin/analytics/locations'], ['Setup', '/admin/analytics/setup']].map(([label, path]) => <NavLink key={path} to={path} end className={({ isActive }) => `ui-button ${isActive ? 'ui-button-primary' : 'ui-button-secondary'}`}>{label}</NavLink>)}</nav>
    {view !== 'setup' && <div className="flex flex-wrap gap-4 items-end">
      <label className="text-sm space-y-2"><span className="block">From (location-local dates)</span><input type="date" className="min-h-11 bg-surface border border-surface-highlight rounded-lg p-2" value={from} onChange={event => setFrom(event.target.value)} /></label>
      <label className="text-sm space-y-2"><span className="block">To</span><input type="date" className="min-h-11 bg-surface border border-surface-highlight rounded-lg p-2" value={to} onChange={event => setTo(event.target.value)} /></label>
      <label className="text-sm space-y-2"><span className="block">Dataset</span><select className="min-h-11 bg-surface border border-surface-highlight rounded-lg p-2" value={mode} onChange={event => setMode(event.target.value as MeasurementMode)}><option value="live">Live measurements</option><option value="test">Test measurements</option></select></label>
      {!campaignMatch && <label className="text-sm space-y-2"><span className="block">Campaign</span><select className="min-h-11 max-w-full bg-surface border border-surface-highlight rounded-lg p-2" value={campaignId} onChange={event => setParams(event.target.value ? { campaign: event.target.value } : {})}><option value="">All campaigns</option>{report?.campaigns.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label>}
    </div>}
    {error && <div role="alert" className="border border-red-500 rounded-lg p-4">{error}{report && ' Displayed results may be stale; no missing values have been replaced with zero.'}</div>}
    {!report && !error && <p role="status">Loading server-maintained aggregates…</p>}
    {report && <>
      <div className="rounded-lg border border-surface-highlight bg-surface p-4 text-sm text-text-muted"><p>{mode === 'test' ? 'TEST DATA · Excluded from live reporting. ' : ''}{report.restrictedLocations ? 'Limited to your assigned locations. ' : ''}{report.updatedAt ? `Latest aggregate update: ${new Date(report.updatedAt).toLocaleString('en-US', { timeZone: timezone })} (${timezone}).` : 'No aggregate data has been recorded for this selection.'}{refreshing ? ' Refreshing…' : ' Refreshes every 20 seconds.'}</p><p className="mt-1">Plays count qualifying QR placement renders, not people. Scans count filtered redirect requests, not unique diners. Copied offers and outbound clicks are not verified purchases.</p></div>
      {view === 'setup' ? <MeasurementSetup orgId={organization.id} campaigns={report.campaigns} canManage={report.admin} onChange={refresh} /> : <>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Metric label="Recorded placement plays" amount={hasData ? value(totals.plays || 0) : '—'} detail={`${value((totals.visibleMs || 0) / 3_600_000)} recorded placement-hours`} />
          <Metric label="QR scans" amount={hasData ? value(totals.scans || 0) : '—'} detail={`${value(scores.scanYield)} scans per 100 plays — not a viewer conversion rate`} />
          <Metric label="Engaged scan sessions" amount={hasData ? value(totals.cohortEngaged || 0) : '—'} detail={`${value(scores.engagement, '%')} of scan cohorts in this date range`} />
          <Metric label="Survey responses" amount={hasData ? value(totals.surveySubmits || 0) : '—'} detail={`${value(scores.completion, '%')} completion within scan cohorts`} />
          <Metric label="Net Promoter Score" amount={value(scores.nps)} detail={`n=${totals.npsResponses || 0} · promoters minus detractors`} />
          <Metric label="Customer satisfaction" amount={value(scores.csat, '%')} detail={`n=${totals.csatResponses || 0} · ratings 4–5 on a 1–5 scale`} />
          <Metric label="Offer reveals / copies" amount={hasData ? `${totals.offerReveals || 0} / ${totals.offerCopies || 0}` : '—'} detail="Observed intent, not redemptions" />
          <Metric label="Outbound CTA clicks" amount={hasData ? value(totals.ctaClicks || 0) : '—'} detail="Measured on first-party offer pages" />
        </div>
        {!hasData && <section className="rounded-xl border border-dashed border-surface-highlight p-6"><h2 className="font-semibold mb-2">No measurement yet</h2><p className="text-text-muted">Create a campaign, attach it to a QR tile, and authorize its physical player. Missing telemetry is not reported as zero audience engagement.</p><Link className="ui-button ui-button-primary mt-4" to="/admin/analytics/setup">Set up a measured campaign</Link></section>}
        {(view === 'overview' || view === 'campaign') && <>
          <section className="rounded-xl border border-surface-highlight bg-surface p-5"><h2 className="font-semibold mb-2">Scan activity</h2><p className="text-sm text-text-muted mb-4">Activity dates use each placement’s location timezone. Gaps indicate missing aggregates, not measured zero.</p><div className="h-64" role="img" aria-label="Daily QR scan activity"><ResponsiveContainer width="100%" height="100%"><LineChart data={series}><CartesianGrid strokeDasharray="3 3" opacity={0.15} /><XAxis dataKey="date" minTickGap={32} /><YAxis allowDecimals={false} /><Tooltip /><Line type="linear" dataKey="scans" stroke="#ea580c" strokeWidth={2} connectNulls={false} /></LineChart></ResponsiveContainer></div></section>
          {view === 'overview' ? <ResultTable rows={report.campaignRows} dimension="Campaign" /> : <><ResultTable rows={report.locationRows} dimension="Location" /><ResultTable rows={report.screenRows} dimension="Screen" /><Distribution title="Scans by local hour" data={report.hourly.map(h => ({ label: `${h.hour}:00`, count: h.counts.scans || 0 }))} /></>}
        </>}
        {view === 'locations' && <><ResultTable rows={report.locationRows} dimension="Location" /><ResultTable rows={report.screenRows} dimension="Screen" /><Distribution title="Scans by local hour" data={report.hourly.map(h => ({ label: `${h.hour}:00`, count: h.counts.scans || 0 }))} /></>}
        {view === 'feedback' && <>
          <p className="text-sm text-text-muted">These are self-selected guest responses, not a representative sample of all diners. Compare consistent questions and periods; small samples remain directional. NPS/CSAT are recomputed from summed response counts, never averaged from daily scores.</p>
          <div className="grid lg:grid-cols-2 gap-5"><Distribution title="NPS response distribution" data={Array.from({ length: 11 }, (_, i) => ({ label: String(i), count: totals[`nps${i}`] || 0 }))} /><Distribution title="CSAT response distribution" data={Array.from({ length: 5 }, (_, i) => ({ label: String(i + 1), count: totals[`csat${i + 1}`] || 0 }))} /></div>
          {campaign?.questions?.filter(q => q.type === 'single').map(q => <Distribution key={q.id} title={q.label} data={(q.options || []).map((option, i) => ({ label: option, count: totals[`poll_${q.id}_${i}`] || 0 }))} />)}
          <ResultTable rows={report.locationRows} dimension="Location" />
        </>}
      </>}
    </>}
  </div>;
}
