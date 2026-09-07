import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useConfigStore } from '../../store/useConfigStore';
import { WEBSITE_CONTENT, type WebsiteContent } from '../../lib/websiteContent';
import { safeWebLink } from '../../lib/customerJourney';
import { InlineFeedback } from '../atoms/InlineFeedback';
const fieldClass = 'block w-full min-h-11 mt-2 rounded-lg border border-surface-highlight bg-background p-3';
export const WebsiteContentEditor = () => {
  const { generalConfig, updateGeneralConfig } = useConfigStore();
  const [copy, setCopy] = useState<Required<WebsiteContent>>(WEBSITE_CONTENT);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [saved, setSaved] = useState(false);
  const dirty = useRef(false);
  useEffect(() => { if (!dirty.current) setCopy({ ...WEBSITE_CONTENT, ...generalConfig.marketing }); }, [generalConfig.marketing]);
  const change = (next: Required<WebsiteContent>) => { dirty.current = true; setSaved(false); setCopy(next); };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    if (copy.bookingUrl && !safeWebLink(copy.bookingUrl)) { setError('Enter a secure web address for booking, beginning with https://.'); return; }
    if (copy.benefits.length !== 3 || copy.benefits.some(row => !row.title.trim() || !row.body.trim()) || copy.faqs.length < 1 || copy.faqs.length > 8 || copy.faqs.some(row => !row.question.trim() || !row.answer.trim()) || !copy.measurementDescription.trim()) { setError('Complete each heading and description before saving.'); return; }
    setBusy(true); setError(null); setSaved(false);
    try { await updateGeneralConfig({ marketing: copy }); dirty.current = false; setSaved(true); }
    catch { setError('Website content could not be saved. Your edits are still here. Try again.'); }
    finally { setBusy(false); }
  };
  return <section className="rounded-xl border border-surface-highlight p-5 sm:p-6 space-y-5"><h3 className="text-xl font-semibold">Website content</h3><p className="text-text-secondary">Update the benefits, guest feedback explanation and common questions. Changes appear on the website after saving.</p><InlineFeedback tone="error" message={error} /><InlineFeedback tone="success" message={saved ? 'Website content saved.' : null} /><form onSubmit={save} className="space-y-6">
    <label className="block">Booking page <span className="text-text-secondary">(optional)</span><input aria-label="Booking page address" type="url" value={copy.bookingUrl} maxLength={2048} disabled={busy} onChange={e => change({ ...copy, bookingUrl: e.target.value })} className={fieldClass} /><span className="text-sm text-text-secondary">Use a booking page you already manage. Leave empty to hide the booking button.</span></label>
    {copy.benefits.map((row, i) => <fieldset key={i} className="border border-surface-highlight rounded-lg p-4 space-y-4"><legend className="px-2">Benefit {i + 1}</legend><label className="block">Heading<input aria-label={`Benefit ${i + 1} heading`} required maxLength={100} disabled={busy} value={row.title} onChange={e => change({ ...copy, benefits: copy.benefits.map((value, n) => n === i ? { ...value, title: e.target.value } : value) })} className={fieldClass} /></label><label className="block">Description<textarea aria-label={`Benefit ${i + 1} description`} required maxLength={600} disabled={busy} value={row.body} onChange={e => change({ ...copy, benefits: copy.benefits.map((value, n) => n === i ? { ...value, body: e.target.value } : value) })} className={fieldClass} /></label></fieldset>)}
    <label className="block">Guest feedback explanation<textarea aria-label="Guest feedback explanation" required maxLength={1200} disabled={busy} value={copy.measurementDescription} onChange={e => change({ ...copy, measurementDescription: e.target.value })} className={fieldClass} /></label>
    <h4 className="font-semibold">Common questions</h4>{copy.faqs.map((row, i) => <fieldset key={i} className="border border-surface-highlight rounded-lg p-4 space-y-4"><legend className="px-2">Question {i + 1}</legend><label className="block">Question<input aria-label={`Question ${i + 1}`} required maxLength={180} disabled={busy} value={row.question} onChange={e => change({ ...copy, faqs: copy.faqs.map((value, n) => n === i ? { ...value, question: e.target.value } : value) })} className={fieldClass} /></label><label className="block">Answer<textarea aria-label={`Answer ${i + 1}`} required maxLength={1200} disabled={busy} value={row.answer} onChange={e => change({ ...copy, faqs: copy.faqs.map((value, n) => n === i ? { ...value, answer: e.target.value } : value) })} className={fieldClass} /></label>{copy.faqs.length > 1 && <button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={() => change({ ...copy, faqs: copy.faqs.filter((_, n) => n !== i) })}>Remove question {i + 1}</button>}</fieldset>)}
    <div className="flex flex-wrap gap-3">{copy.faqs.length < 8 && <button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={() => change({ ...copy, faqs: [...copy.faqs, { question: '', answer: '' }] })}>Add a question</button>}<button type="submit" className="ui-button ui-button-primary" disabled={busy}>{busy ? 'Saving website content…' : 'Save website content'}</button></div>
  </form><details className="border-t border-surface-highlight pt-4"><summary className="min-h-11 py-3 cursor-pointer font-semibold">Preview your website text</summary><div className="grid md:grid-cols-3 gap-5 py-4">{copy.benefits.map((row, i) => <article key={i}><h4 className="font-semibold">{row.title}</h4><p className="text-text-secondary mt-2">{row.body}</p></article>)}</div><p>{copy.measurementDescription}</p></details></section>;
};
