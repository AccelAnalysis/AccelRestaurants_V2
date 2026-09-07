import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibleDialog } from '../atoms/AccessibleDialog';
import { InlineFeedback } from '../atoms/InlineFeedback';
import { AtmospherePresetPanel } from './AtmospherePresetPanel';
import { RestaurantSlidePreview } from './RestaurantSlidePreview';
import { CinematicService, type StarterRequest, type StarterResult } from '../../services/cinematicService';
import { ATMOSPHERE_PRESETS, entitlements, presetConfig } from '../../../functions/src/cinematic/catalog';
import { RESTAURANT_TEMPLATES, defaultStarter, validateStarter, assertStarterEntitled, buildRestaurantSlide, type StarterInput } from '../../../functions/src/cinematic/templates';
import type { Slide } from '../../types/schema';
interface Props {
  orgId: string; userId: string; plan: unknown; brandName: string; firstScreen?: boolean;
  onClose: () => void; onComplete: (result: StarterResult) => void | Promise<void>;
  createStarter?: (request: StarterRequest) => Promise<StarterResult>;
}
interface Draft { version: 1; input: StarterInput; createScreen: boolean; requestId: string }
function newRequestId() {
  // Random UUID where supported; cryptographic fallback for older kiosk browsers.
  return crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
}
function readDraft(key: string, brandName: string, firstScreen: boolean): Draft {
  try {
    const raw = localStorage.getItem(key);
    if (raw && raw.length < 20000) {
      const draft = JSON.parse(raw) as Draft;
      if (draft.version === 1 && typeof draft.requestId === 'string' && /^[\w-]{8,64}$/.test(draft.requestId) && typeof draft.createScreen === 'boolean')
        return { ...draft, input: validateStarter(draft.input) };
    }
  } catch { /* A stale draft or disabled storage must never block setup. */ }
  return { version: 1, input: defaultStarter('coffee-house', brandName.slice(0, 32) || 'Your restaurant'), createScreen: firstScreen, requestId: newRequestId() };
}
const fieldClass = 'mt-1 w-full rounded-lg border border-surface-highlight bg-background p-2 text-text';
export const RestaurantStarterWizard = ({ orgId, userId, plan, brandName, firstScreen = false, onClose, onComplete, createStarter = CinematicService.createStarter }: Props) => {
  const key = `accel:restaurant-starter:v1:${orgId}:${userId}`;
  const [draft, setDraft] = useState<Draft>(() => readDraft(key, brandName, firstScreen));
  const [step, setStep] = useState(1), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [motion, setMotion] = useState(true), [result, setResult] = useState<StarterResult | null>(null);
  const submitting = useRef(false), heading = useRef<HTMLHeadingElement>(null);
  const access = entitlements(plan), input = draft.input;
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(draft)); } catch { /* In-memory setup still works. */ } }, [key, draft]);
  useEffect(() => { heading.current?.focus(); }, [step]);
  const change = (updates: Partial<StarterInput>) => {
    if (submitting.current || result) return;
    setDraft(d => ({ ...d, input: { ...d.input, ...updates }, requestId: newRequestId() })); setError(null);
  };
  const preview = useMemo(() => {
    try { return buildRestaurantSlide(input, orgId, 'preview') as unknown as Slide; } catch { return null; }
  }, [input, orgId]);
  let planError: string | null = null;
  try { assertStarterEntitled(plan, input); } catch (e) { planError = e instanceof Error ? e.message : 'Choose an included design.'; }
  const next = () => {
    try { validateStarter(input); setError(null); setStep(s => Math.min(3, s + 1)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Check your details.'); }
  };
  const create = async () => {
    if (submitting.current || result) return;
    try { validateStarter(input); assertStarterEntitled(plan, input); }
    catch (e) { setError(e instanceof Error ? e.message : 'Check your choices.'); return; }
    submitting.current = true; setBusy(true); setError(null);
    try {
      const created = await createStarter({ orgId, requestId: draft.requestId, input, createScreen: draft.createScreen });
      setResult(created);
      try { localStorage.removeItem(key); } catch { /* Persistence is optional. */ }
      await onComplete(created);
    } catch (e) { setError(e instanceof Error ? e.message : 'Content could not be created. Your choices are saved; retry safely.'); }
    finally { submitting.current = false; setBusy(false); }
  };
  const chooseTemplate = (id: string) => {
    const next = defaultStarter(id, input.brandName);
    change({ ...next, orientation: input.orientation });
  };
  return <AccessibleDialog title="Your restaurant, screen-ready" description="Choose a design, add your menu, then review. Nothing is created until you confirm." onClose={onClose} busy={busy} closeLabel="Save for later" wide>
    <nav aria-label="Restaurant setup progress" className="text-sm text-text-secondary mb-4">{['Choose a design', 'Make it yours', 'Review & create'].map((label, i) => <span key={label} aria-current={step === i + 1 ? 'step' : undefined} className={`inline-block mr-5 mb-1 ${step === i + 1 ? 'text-primary font-semibold' : ''}`}>{i + 1}. {label}</span>)}</nav>
    <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold mb-4">{step === 1 ? 'Start with a restaurant design' : step === 2 ? 'Add your real menu and pricing' : 'Check the board before creating it'}</h2>
    <InlineFeedback message={error} tone="error" />
    {result ? <div role="status"><p>Your content was created successfully.</p><a className="ui-button ui-button-primary mt-4" href={result.screenId ? `/admin/screens/${result.screenId}` : `/admin/slides/${result.slideId}`}>Open {result.screenId ? 'screen setup' : 'slide editor'}</a></div> : <>
      {step === 1 && <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {RESTAURANT_TEMPLATES.map(t => <button type="button" key={t.id} aria-pressed={input.templateId === t.id} onClick={() => chooseTemplate(t.id)} disabled={busy}
            className={`text-left rounded-xl overflow-hidden border ${input.templateId === t.id ? 'border-primary ring-1 ring-primary' : 'border-surface-highlight'}`}>
            <RestaurantSlidePreview slide={buildRestaurantSlide({ ...defaultStarter(t.id), orientation: input.orientation }, orgId, t.id) as unknown as Slide} />
            <span className="block p-3"><span className="block font-semibold">{t.name} {t.signature && !access.signatureTemplates ? '· Growth preview' : ''}</span><span className="text-sm text-text-secondary">{t.category}</span></span>
          </button>)}
        </div>
        <label className="block text-sm mt-5 max-w-sm">Screen orientation<select aria-label="Screen orientation" value={input.orientation} onChange={e => change({ orientation: e.target.value as StarterInput['orientation'] })} className={fieldClass}><option value="landscape">Landscape · 16:9</option><option value="portrait">Portrait · 9:16</option></select></label>
      </>}
      {step === 2 && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="block text-sm">Restaurant name<input aria-label="Restaurant name" maxLength={32} value={input.brandName} onChange={e => change({ brandName: e.target.value })} className={fieldClass} /></label>
          <label className="block text-sm">Headline<input aria-label="Menu headline" maxLength={28} value={input.headline} onChange={e => change({ headline: e.target.value })} className={fieldClass} /></label>
          <p className="text-sm text-text-secondary">These are sample items and prices. Replace them with your menu; fewer items keep the board readable.</p>
          {input.items.map((item, i) => <fieldset key={i} className="border border-surface-highlight rounded-lg p-3"><legend className="px-1 text-sm">Item {i + 1}</legend>
            <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2"><label className="text-sm">Name<input aria-label={`Item ${i + 1} name`} maxLength={26} value={item.name} onChange={e => change({ items: input.items.map((r, n) => n === i ? { ...r, name: e.target.value } : r) })} className={fieldClass} /></label>
              <label className="text-sm">Price<input aria-label={`Item ${i + 1} price`} maxLength={10} value={item.price} onChange={e => change({ items: input.items.map((r, n) => n === i ? { ...r, price: e.target.value } : r) })} className={fieldClass} /></label></div>
            <label className="block text-sm mt-2">Description<input aria-label={`Item ${i + 1} description`} maxLength={44} value={item.description} onChange={e => change({ items: input.items.map((r, n) => n === i ? { ...r, description: e.target.value } : r) })} className={fieldClass} /></label>
            {input.items.length > 1 && <button type="button" onClick={() => change({ items: input.items.filter((_, n) => n !== i) })} className="ui-button ui-button-secondary mt-2" aria-label={`Remove item ${i + 1}`}>Remove item</button>}
          </fieldset>)}
          {input.items.length < 6 && <button type="button" className="ui-button ui-button-secondary" onClick={() => change({ items: [...input.items, { name: 'New item', price: '$0.00', description: '' }] })}>Add menu item</button>}
          <label className="block text-sm">Footer<input aria-label="Menu footer" maxLength={72} value={input.footer} onChange={e => change({ footer: e.target.value })} className={fieldClass} /></label>
        </div>
        <div>{preview ? <RestaurantSlidePreview slide={preview} /> : <p>Complete the fields to preview your board.</p>}</div>
      </div>}
      {step === 3 && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4"><AtmospherePresetPanel config={presetConfig(input.presetId, input.strength, input.quality)} plan={plan} previewOnly onChange={config => change({ presetId: config.presetId || 'clear', strength: config.strength, quality: config.quality })} />
          {planError && <div role="status" className="rounded-lg border border-surface-highlight p-3 text-sm"><p>{planError}</p><button type="button" className="ui-button ui-button-secondary mt-2" onClick={() => {
            const t = RESTAURANT_TEMPLATES.find(t => t.id === input.templateId)!;
            change({ presetId: 'clear', ...(t.signature && !access.signatureTemplates ? { templateId: 'coffee-house' } : {}) });
          }}>Use an included static design</button></div>}
          <label className="flex gap-3 items-start text-sm"><input type="checkbox" checked={draft.createScreen} onChange={e => setDraft(d => ({ ...d, createScreen: e.target.checked, requestId: newRequestId() }))} />
            <span>Set up my first screen<small className="block mt-1 text-text-secondary">Creates a location and inactive screen draft. Existing screens are never replaced. Leave off to create a slide only.</small></span></label>
          <p className="text-sm text-text-secondary">Review names and prices before publishing. QR tracking can be added in the editor using the measurement tools; this wizard creates no QR destinations or tracking events.</p>
        </div>
        <div className="space-y-3">{preview && <RestaurantSlidePreview slide={preview} motion={motion} />}<button type="button" aria-pressed={!motion} className="ui-button ui-button-secondary" onClick={() => setMotion(m => !m)}>{motion ? 'Pause atmosphere preview' : 'Play atmosphere preview'}</button>
          <p className="text-sm text-text-secondary">{input.orientation} · {ATMOSPHERE_PRESETS.find(p => p.id === input.presetId)?.name} · {input.items.length} editable menu items</p>
        </div>
      </div>}
      <div className="mt-6 pt-4 border-t border-surface-highlight flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="ui-button ui-button-secondary" onClick={() => { setStep(s => Math.max(1, s - 1)); setError(null); }} disabled={step === 1 || busy}>Back</button>
        <p className="text-xs text-text-secondary">Your draft is saved on this browser for this account.</p>
        {step < 3 ? <button type="button" className="ui-button ui-button-primary" onClick={next}>Continue</button> : <button type="button" className="ui-button ui-button-primary" disabled={busy || !!planError || !preview} onClick={() => void create()}>{busy ? 'Creating…' : draft.createScreen ? 'Create screen draft' : 'Create editable slide'}</button>}
      </div>
    </>}
  </AccessibleDialog>;
};
