import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MeasurementService, measurementError, type MeasurementCampaign, type SurveyQuestion } from '../../services/measurementService';
import { SlideService } from '../../services/slideService';
import type { Slide } from '../../types/schema';

type Template = 'external' | 'offer' | 'nps' | 'csat' | 'both' | 'poll' | 'feedback';
const inputClass = 'w-full min-h-12 rounded-lg border border-surface-highlight bg-background p-3 text-text';

export function MeasurementSetup({ orgId, campaigns, onChange, canManage }: { orgId: string; campaigns: MeasurementCampaign[]; onChange: () => void; canManage: boolean }) {
  const [name, setName] = useState(''); const [template, setTemplate] = useState<Template>('nps');
  const [destinationUrl, setDestinationUrl] = useState(''); const [offerCode, setOfferCode] = useState('');
  const [question, setQuestion] = useState('What would make your next visit better?'); const [pollOptions, setPollOptions] = useState('Option A\nOption B');
  const [comments, setComments] = useState(true); const [slides, setSlides] = useState<Slide[]>([]);
  const [campaignId, setCampaignId] = useState(''); const [slideId, setSlideId] = useState(''); const [tileId, setTileId] = useState('');
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const requestId = useRef(crypto.randomUUID());
  useEffect(() => {
    let cancelled = false;
    if (!canManage) return;
    void SlideService.getSlides(orgId).then(result => { if (!cancelled) setSlides(result); }).catch(reason => { if (!cancelled) setError(measurementError(reason)); });
    return () => { cancelled = true; };
  }, [orgId, canManage]);
  const run = async (work: () => Promise<unknown>, success: string) => {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    try { await work(); setNotice(success); onChange(); } catch (reason) { setError(measurementError(reason)); } finally { setBusy(false); }
  };
  const create = (event: FormEvent) => {
    event.preventDefault();
    const questions: SurveyQuestion[] = [];
    if (template === 'nps' || template === 'both') questions.push({ id: 'recommend', label: 'How likely are you to recommend us to a friend or colleague?', type: 'nps', required: true });
    if (template === 'csat' || template === 'both') questions.push({ id: 'satisfaction', label: 'How satisfied were you with your visit today?', type: 'csat', required: true });
    if (template === 'poll') questions.push({ id: 'choice', label: question, type: 'single', required: true, options: pollOptions.split('\n').map(s => s.trim()).filter(Boolean) });
    if (template === 'feedback') questions.push({ id: 'feedback', label: question, type: 'text', required: true });
    else if (comments && !['external', 'offer'].includes(template)) questions.push({ id: 'comment', label: 'What is the main reason for your answer?', type: 'text', required: false });
    void run(async () => {
      const result = await MeasurementService.create(orgId, requestId.current, {
        name, kind: template === 'external' ? 'external' : template === 'offer' ? 'offer' : 'survey',
        destinationUrl, offerCode, ctaLabel: 'Visit our menu', questions, thankYouMessage: 'Thank you. Your feedback helps us improve.',
      });
      setCampaignId(result.campaignId); requestId.current = crypto.randomUUID(); setName('');
    }, 'Campaign created. Add it to a QR code in your design below.');
  };
  const availableTiles = slides.find(slide => slide.id === slideId)?.elements.filter(tile => tile.type === 'qr_code') || [];
  if (!canManage) return <p className="rounded-lg border border-surface-highlight bg-surface p-6">Ask your restaurant owner or administrator to set up campaigns and screens. You can view results for your assigned restaurants.</p>;
  return <div className="space-y-8">
    <section className="rounded-xl border border-surface-highlight bg-surface p-5 sm:p-6">
      <h2 className="text-xl font-semibold mb-2">Create a QR campaign</h2>
      <p className="text-text-muted mb-6">Choose what guests see after scanning. To change an offer or question later, create a new campaign so earlier responses stay with the original.</p>
      <form onSubmit={create} className="grid sm:grid-cols-2 gap-4">
        <label className="space-y-2"><span>Campaign name</span><input className={inputClass} required maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="September guest feedback" /></label>
        <label className="space-y-2"><span>Experience</span><select aria-label="Experience" className={inputClass} value={template} onChange={event => setTemplate(event.target.value as Template)}>
          <option value="external">Menu or website link</option><option value="offer">Offer code and menu link</option><option value="nps">Likelihood to recommend (NPS)</option><option value="csat">Visit satisfaction (CSAT)</option><option value="both">Recommendation and satisfaction</option><option value="poll">Quick poll</option><option value="feedback">Open feedback question</option>
        </select></label>
        {['external', 'offer'].includes(template) && <label className="space-y-2 sm:col-span-2"><span>Menu or website address</span><input className={inputClass} type="url" required value={destinationUrl} onChange={event => setDestinationUrl(event.target.value)} placeholder="https://your-restaurant.example/menu" /></label>}
        {template === 'offer' && <label className="space-y-2"><span>Offer code</span><input className={inputClass} required maxLength={80} value={offerCode} onChange={event => setOfferCode(event.target.value)} placeholder="LUNCH10" /></label>}
        {['poll', 'feedback'].includes(template) && <label className="space-y-2 sm:col-span-2"><span>Question</span><input className={inputClass} required maxLength={300} value={question} onChange={event => setQuestion(event.target.value)} /></label>}
        {template === 'poll' && <label className="space-y-2 sm:col-span-2"><span>Options (2–8, one per line)</span><textarea className={inputClass} required rows={4} value={pollOptions} onChange={event => setPollOptions(event.target.value)} /></label>}
        {!['external', 'offer', 'feedback'].includes(template) && <label className="flex items-center gap-3 sm:col-span-2 min-h-12"><input type="checkbox" checked={comments} onChange={event => setComments(event.target.checked)} /> Include an optional comment</label>}
        <button type="submit" disabled={busy} className="ui-button ui-button-primary min-h-12 sm:col-span-2">Create campaign</button>
      </form>
    </section>
    <section className="rounded-xl border border-surface-highlight bg-surface p-5 sm:p-6">
      <h2 className="text-xl font-semibold mb-2">Add a campaign to your design</h2>
      <p className="text-text-muted mb-6">Results are grouped by screen and restaurant. Add a QR code in the <Link className="text-primary underline" to="/admin/slides">design editor</Link> first.</p>
      <form onSubmit={event => { event.preventDefault(); void run(() => MeasurementService.bind(orgId, campaignId, slideId, tileId), 'Campaign added. Check your screen setup to make sure the updated design is showing.'); }} className="grid sm:grid-cols-3 gap-4">
        <label className="space-y-2"><span>Campaign</span><select aria-label="Campaign" required className={inputClass} value={campaignId} onChange={event => setCampaignId(event.target.value)}><option value="">Choose campaign</option>{campaigns.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="space-y-2"><span>Slide</span><select aria-label="Slide" required className={inputClass} value={slideId} onChange={event => { setSlideId(event.target.value); setTileId(''); }}><option value="">Choose slide</option>{slides.map(slide => <option key={slide.id} value={slide.id}>{slide.name}</option>)}</select></label>
        <label className="space-y-2"><span>QR tile</span><select aria-label="QR tile" required className={inputClass} value={tileId} onChange={event => setTileId(event.target.value)}><option value="">Choose QR</option>{availableTiles.map((tile, index) => <option key={tile.id} value={tile.id}>{tile.name || `QR code ${index + 1}`}</option>)}</select></label>
        <button type="submit" disabled={busy} className="ui-button ui-button-primary min-h-12 sm:col-span-3">Attach campaign</button>
      </form>
    </section>
    <section className="rounded-xl border border-surface-highlight bg-surface p-5 sm:p-6">
      <h2 className="text-xl font-semibold mb-2">Authorize a physical player</h2>
      <p className="text-text-muted mb-6">Enter the code shown on your restaurant screen to include it in your campaign results. Your menu can continue showing while you complete this step.</p>
      <form onSubmit={event => { event.preventDefault(); void run(() => MeasurementService.approvePairing(orgId, code.trim()), 'Screen connected to campaign reporting. Results appear when activity is recorded.'); }} className="flex flex-col sm:flex-row gap-3">
        <label className="flex-1"><span className="sr-only">Measurement pairing code</span><input aria-label="Measurement pairing code" className={inputClass} required minLength={10} maxLength={10} autoComplete="off" value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="10-character screen code" /></label>
        <button disabled={busy} type="submit" className="ui-button ui-button-primary min-h-12">Authorize player</button>
      </form>
    </section>
    <section className="rounded-xl border border-surface-highlight bg-surface p-5 sm:p-6">
      <h2 className="text-xl font-semibold mb-4">Campaign library</h2>
      <div className="space-y-3">{campaigns.map(campaign => <div key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-highlight py-3"><div><p className="font-medium">{campaign.name}</p><p className="text-sm text-text-muted">{campaign.kind === 'external' ? 'Menu or website link' : campaign.kind === 'offer' ? 'Offer' : 'Guest feedback'} · {campaign.status === 'active' ? 'Active' : 'Paused'}</p></div><button type="button" disabled={busy} className="ui-button ui-button-secondary min-h-11" onClick={() => { void run(() => MeasurementService.status(orgId, campaign.id, campaign.status === 'active' ? 'paused' : 'active'), 'Campaign status updated.'); }}>{campaign.status === 'active' ? 'Pause' : 'Resume'}</button></div>)}{!campaigns.length && <p className="text-text-muted">No QR campaigns yet.</p>}</div>
    </section>
    {error && <div role="alert" className="rounded-lg border border-red-500 p-4">{error}</div>}
    {notice && <div role="status" className="rounded-lg border border-primary p-4">{notice}</div>}
  </div>;
}
