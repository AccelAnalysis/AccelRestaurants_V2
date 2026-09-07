import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Copy, ExternalLink, MessageSquare } from 'lucide-react';
import { MeasurementService, measurementError, type Engagement, type SurveyQuestion } from '../services/measurementService';

function readToken(placementId: string) {
  const key = `accel-engagement:${placementId}`; const fragment = window.location.hash.slice(1);
  if (/^[A-Za-z0-9_-]{32}$/.test(fragment)) {
    try { sessionStorage.setItem(key, fragment); } catch { /* A live tab can participate without persistent storage. */ }
    history.replaceState(history.state, '', window.location.pathname + window.location.search);
    return fragment;
  }
  try { return sessionStorage.getItem(key) || ''; } catch { return ''; }
}

export function EngagementPage() {
  const { placementId = '' } = useParams();
  const [token] = useState(() => readToken(placementId));
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); const [complete, setComplete] = useState(false);
  const [offerCode, setOfferCode] = useState(''); const [notice, setNotice] = useState('');
  const started = useRef(false);
  useEffect(() => {
    let cancelled = false;
    if (!token) { setError('Scan the original restaurant QR code to start a private feedback session.'); setLoading(false); return; }
    void MeasurementService.engagement(token).then(result => {
      if (!cancelled) { setEngagement(result); setComplete(result.submitted); }
    }).catch(reason => { if (!cancelled) setError(measurementError(reason)); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const answer = (question: SurveyQuestion, value: string | number) => {
    setAnswers(previous => ({ ...previous, [question.id]: value }));
    if (!started.current) {
      started.current = true;
      void MeasurementService.action(token, 'survey_start').catch(() => { started.current = false; });
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { const result = await MeasurementService.submit(token, answers); if (result.success) setComplete(true); }
    catch (reason) { setError(measurementError(reason)); }
    finally { setBusy(false); }
  };
  const reveal = async () => {
    if (busy) return; setBusy(true); setError('');
    try { const result = await MeasurementService.action(token, 'offer_reveal'); setOfferCode(result.offerCode); }
    catch (reason) { setError(measurementError(reason)); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(offerCode); setNotice('Offer code copied.');
      await MeasurementService.action(token, 'offer_copy');
    } catch { setNotice('Select the displayed code to copy it manually.'); }
  };
  const follow = async () => {
    if (busy) return; setBusy(true); setError('');
    try { const result = await MeasurementService.action(token, 'cta_click'); if (result.destinationUrl) window.location.assign(result.destinationUrl); }
    catch (reason) { setError(measurementError(reason)); }
    finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-background text-text px-4 py-8 sm:py-12">
    <div className="mx-auto max-w-xl">
      <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-8"><MessageSquare size={20} aria-hidden="true" /> Guest engagement</div>
      {loading ? <p role="status">Loading your restaurant experience…</p> : <>
        {engagement?.mode === 'test' && <p className="rounded-lg border border-primary p-3 mb-6 text-sm" role="status">Test experience — these results are excluded from live reports.</p>}
        <h1 className="text-3xl font-bold mb-3">{engagement?.name || 'Restaurant feedback'}</h1>
        {complete ? <section className="rounded-2xl border border-surface-highlight bg-surface p-8 my-8" aria-live="polite">
          <CheckCircle2 className="text-primary mb-4" size={36} aria-hidden="true" />
          <h2 className="text-2xl font-semibold mb-3">Thank you</h2><p>{engagement?.thankYouMessage || 'Your response has been recorded.'}</p>
        </section> : engagement?.kind === 'survey' ? <>
          <p className="text-text-muted mb-8">No account or contact information is required. Please do not include personal information in written feedback.</p>
          <form onSubmit={submit} className="space-y-8">
            {engagement.questions.map(q => <fieldset key={q.id} className="min-w-0 rounded-2xl border border-surface-highlight bg-surface p-4 sm:p-6">
              <legend className="px-2 font-semibold text-lg">{q.label}{!q.required && <span className="text-sm font-normal text-text-muted"> (optional)</span>}</legend>
              {q.type === 'nps' || q.type === 'csat' ? <>
                <div className={`grid gap-2 mt-2 ${q.type === 'nps' ? 'grid-cols-6' : 'grid-cols-5'}`}>
                  {Array.from({ length: q.type === 'nps' ? 11 : 5 }, (_, i) => q.type === 'nps' ? i : i + 1).map(value => <label key={value} className="cursor-pointer">
                    <input className="sr-only peer" type="radio" name={q.id} value={value} required={q.required} checked={answers[q.id] === value} onChange={() => answer(q, value)} aria-label={`${value} — ${q.label}`} />
                    <span className="flex min-h-12 items-center justify-center rounded-lg border border-surface-highlight bg-background font-bold peer-checked:bg-primary peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary">{value}</span>
                  </label>)}
                </div>
                <p className="mt-3 text-sm text-text-muted">{q.type === 'nps' ? '0 = Not at all likely · 10 = Extremely likely' : '1 = Very dissatisfied · 5 = Very satisfied'}</p>
              </> : q.type === 'single' ? <div className="space-y-2 mt-2">{q.options?.map(option => <label key={option} className="flex min-h-12 items-center gap-3 border border-surface-highlight rounded-lg p-3 cursor-pointer">
                <input type="radio" name={q.id} required={q.required} checked={answers[q.id] === option} onChange={() => answer(q, option)} value={option} /><span>{option}</span>
              </label>)}</div> : <textarea className="w-full min-h-28 rounded-lg border border-surface-highlight bg-background p-3 text-text mt-2" aria-label={q.label} required={q.required} maxLength={1000} value={answers[q.id] || ''} onChange={event => answer(q, event.target.value)} placeholder="Your feedback (please omit personal information)" />}
            </fieldset>)}
            <button type="submit" disabled={busy} className="ui-button ui-button-primary w-full min-h-12">{busy ? 'Recording your response…' : 'Submit feedback'}</button>
          </form>
        </> : engagement?.kind === 'offer' ? <section className="rounded-2xl border border-surface-highlight bg-surface p-6 my-8 space-y-5">
          <h2 className="text-xl font-semibold">Your restaurant offer</h2>
          {offerCode ? <div className="rounded-xl border border-dashed border-primary bg-background p-5 text-center"><p className="text-2xl font-mono font-bold break-all select-all">{offerCode}</p><button type="button" onClick={copy} className="ui-button ui-button-secondary mt-4 min-h-12"><Copy size={18} aria-hidden="true" /> Copy code</button></div> : <button type="button" disabled={busy} onClick={reveal} className="ui-button ui-button-primary w-full min-h-12">Reveal offer code</button>}
          <button type="button" disabled={busy} onClick={follow} className="ui-button ui-button-secondary w-full min-h-12">{engagement.ctaLabel}<ExternalLink size={18} aria-hidden="true" /></button>
          <p className="text-sm text-text-muted">Revealing or copying a code does not confirm redemption. Restaurant terms apply.</p>
        </section> : null}
      </>}
      {error && <div role="alert" className="mt-6 rounded-lg border border-red-500 p-4 text-text">{error}</div>}
      {notice && <p role="status" className="mt-4 text-sm">{notice}</p>}
      <footer className="mt-10 pt-5 border-t border-surface-highlight text-sm text-text-muted">Powered by AccelRestaurants · <a href="/privacy" className="underline">Privacy</a></footer>
    </div>
  </main>;
}
