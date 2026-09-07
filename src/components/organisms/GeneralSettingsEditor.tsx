import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useConfigStore } from '../../store/useConfigStore';
import type { GeneralConfig } from '../../services/configService';
import { WebsiteContentEditor } from '../journey/WebsiteContentEditor';
import { InlineFeedback } from '../atoms/InlineFeedback';
import { brandStyle, normalizeHex } from '../../utils/brandColors';
import { safeWebLink, contactLink } from '../../lib/customerJourney';
const keys = ['landingPageTitle', 'landingPageDescription', 'landingPageVideoUrl', 'logoUrl', 'primaryBrandColor', 'contactEmail', 'contactPhone', 'privacyPolicyUrl', 'termsOfServiceUrl', 'footerCopyrightText'] as const;
const fields: { key: typeof keys[number]; label: string; type?: string; long?: boolean }[] = [
  { key: 'landingPageTitle', label: 'Website headline' }, { key: 'landingPageDescription', label: 'Website introduction', long: true },
  { key: 'landingPageVideoUrl', label: 'Demonstration video address', type: 'url' }, { key: 'logoUrl', label: 'Logo address', type: 'url' },
  { key: 'contactEmail', label: 'Contact email', type: 'email' }, { key: 'contactPhone', label: 'Contact phone', type: 'tel' },
  { key: 'privacyPolicyUrl', label: 'Privacy policy address', type: 'url' }, { key: 'termsOfServiceUrl', label: 'Terms address', type: 'url' },
  { key: 'footerCopyrightText', label: 'Footer text' },
];
const fieldClass = 'block w-full min-h-11 mt-2 rounded-lg border border-surface-highlight bg-background p-3';
export const GeneralSettingsEditor = () => {
  const { generalConfig, updateGeneralConfig } = useConfigStore();
  const [settings, setSettings] = useState<GeneralConfig>({});
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [saved, setSaved] = useState(false);
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setSettings(Object.fromEntries([...keys, 'featureFlags', 'maintenanceMode', 'footerLinks', 'socialLinks'].map(key => [key, generalConfig[key as keyof GeneralConfig]])));
  }, [generalConfig]);
  const change = (next: GeneralConfig) => { dirty.current = true; setSaved(false); setSettings(next); };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    if (settings.primaryBrandColor && !normalizeHex(settings.primaryBrandColor)) { setError('Enter a valid brand color, such as #EA580C. Your changes have not been saved.'); return; }
    const links = [settings.logoUrl, settings.landingPageVideoUrl, settings.privacyPolicyUrl, settings.termsOfServiceUrl, ...(settings.footerLinks || []).map(row => row.url), ...(settings.socialLinks || []).map(row => row.url)];
    if (links.some(value => value && !safeWebLink(value))) { setError('Use secure web addresses beginning with https://.'); return; }
    if (settings.contactEmail && !contactLink(settings.contactEmail)) { setError('Enter a valid contact email.'); return; }
    setBusy(true); setError(null); setSaved(false);
    try {
      // Only public website fields are saved. Other settings and secret values are never copied into this payload.
      await updateGeneralConfig(settings); dirty.current = false; setSaved(true);
    } catch { setError('Website settings could not be saved. Your edits are still here. Try again.'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-8"><h3 className="text-xl font-semibold">Website settings</h3><InlineFeedback tone="error" message={error} /><InlineFeedback tone="success" message={saved ? 'Website settings saved.' : null} /><form onSubmit={save} className="space-y-6 rounded-xl border border-surface-highlight p-5 sm:p-6">
    <div className="grid md:grid-cols-2 gap-5">{fields.map(field => <label key={field.key} className={`block ${field.long ? 'md:col-span-2' : ''}`} htmlFor={`website-${field.key}`}>{field.label}{field.long ? <textarea id={`website-${field.key}`} value={settings[field.key] || ''} maxLength={1200} disabled={busy} onChange={e => change({ ...settings, [field.key]: e.target.value })} className={fieldClass} /> : <input id={`website-${field.key}`} type={field.type || 'text'} value={settings[field.key] || ''} maxLength={field.type === 'url' ? 2048 : 240} disabled={busy} onChange={e => change({ ...settings, [field.key]: e.target.value })} className={fieldClass} />}</label>)}</div>
    <p className="text-sm text-text-secondary">Leave optional addresses empty to use the built-in page or hide the link. Videos play only when a visitor chooses to watch.</p>
    <label className="block">Primary brand color<input aria-label="Primary brand color hex" value={settings.primaryBrandColor || ''} placeholder="#EA580C" aria-invalid={!!settings.primaryBrandColor && !normalizeHex(settings.primaryBrandColor)} disabled={busy} onChange={e => change({ ...settings, primaryBrandColor: e.target.value })} className={fieldClass} /></label>
    <div className="app-ui border border-surface-highlight rounded-lg p-4" style={brandStyle(settings.primaryBrandColor)} aria-label="Brand color preview"><span className="ui-button ui-button-primary">Button preview</span><span className="text-primary ml-4">Accent text preview</span><p className="text-sm text-text-secondary mt-3">Interface colors adjust for readability. Your menu designs keep their original colors.</p></div>
    <fieldset className="space-y-4"><legend className="font-semibold mb-3">Website options</legend>{[{ key: 'publicSignupEnabled', label: 'Show new-account registration' }, { key: 'showPricingPage', label: 'Show public plan comparison' }].map(option => <label key={option.key} className="flex items-center gap-3 min-h-11"><input type="checkbox" checked={settings.featureFlags?.[option.key] !== false} disabled={busy} onChange={e => change({ ...settings, featureFlags: { ...settings.featureFlags, [option.key]: e.target.checked } })} />{option.label}</label>)}<label className="flex items-center gap-3 min-h-11"><input type="checkbox" checked={!!settings.maintenanceMode} disabled={busy} onChange={e => change({ ...settings, maintenanceMode: e.target.checked })} />Show a website maintenance notice</label></fieldset>
    <fieldset className="space-y-4"><legend className="font-semibold mb-3">Footer links</legend>{(settings.footerLinks || []).map((row, i) => <div key={i} className="grid sm:grid-cols-2 gap-3"><label>Link name<input aria-label={`Footer link ${i + 1} name`} required value={row.label} disabled={busy} maxLength={80} onChange={e => change({ ...settings, footerLinks: settings.footerLinks!.map((r, n) => n === i ? { ...r, label: e.target.value } : r) })} className={fieldClass} /></label><label>Web address<input aria-label={`Footer link ${i + 1} address`} required type="url" value={row.url} disabled={busy} maxLength={2048} onChange={e => change({ ...settings, footerLinks: settings.footerLinks!.map((r, n) => n === i ? { ...r, url: e.target.value } : r) })} className={fieldClass} /></label><button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={() => change({ ...settings, footerLinks: settings.footerLinks!.filter((_, n) => n !== i) })}>Remove footer link {i + 1}</button></div>)}{(settings.footerLinks?.length || 0) < 10 && <button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={() => change({ ...settings, footerLinks: [...(settings.footerLinks || []), { label: '', url: '' }] })}>Add footer link</button>}</fieldset>
    <button type="submit" className="ui-button ui-button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
  </form><WebsiteContentEditor /></div>;
};
