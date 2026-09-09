import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useConfigStore } from '../../store/useConfigStore';
import type { GeneralConfig } from '../../services/configService';
import { StorageService } from '../../services/storageService';
import { WebsiteContentEditor } from '../journey/WebsiteContentEditor';
import { InlineFeedback } from '../atoms/InlineFeedback';
import { brandStyle, normalizeHex } from '../../utils/brandColors';
import { safeWebLink, contactLink } from '../../lib/customerJourney';

const keys = ['landingPageTitle', 'landingPageDescription', 'landingPageVideoUrl', 'logoUrl', 'primaryBrandColor', 'contactEmail', 'contactPhone', 'privacyPolicyUrl', 'termsOfServiceUrl', 'footerCopyrightText'] as const;
const fields: { key: Exclude<typeof keys[number], 'landingPageVideoUrl'>; label: string; type?: string; long?: boolean }[] = [
  { key: 'landingPageTitle', label: 'Website headline' },
  { key: 'landingPageDescription', label: 'Website introduction', long: true },
  { key: 'logoUrl', label: 'Logo address', type: 'url' },
  { key: 'contactEmail', label: 'Contact email', type: 'email' },
  { key: 'contactPhone', label: 'Contact phone', type: 'tel' },
  { key: 'privacyPolicyUrl', label: 'Privacy policy address', type: 'url' },
  { key: 'termsOfServiceUrl', label: 'Terms address', type: 'url' },
  { key: 'footerCopyrightText', label: 'Footer text' },
];
const fieldClass = 'block w-full min-h-11 mt-2 rounded-lg border border-surface-highlight bg-background p-3';
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);

export const GeneralSettingsEditor = () => {
  const { generalConfig, updateGeneralConfig } = useConfigStore();
  const [settings, setSettings] = useState<GeneralConfig>({});
  const [busy, setBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) setSettings(Object.fromEntries([...keys, 'featureFlags', 'maintenanceMode', 'footerLinks', 'socialLinks'].map(key => [key, generalConfig[key as keyof GeneralConfig]])));
  }, [generalConfig]);

  const change = (next: GeneralConfig) => { dirty.current = true; setSaved(false); setSettings(next); };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || videoBusy) return;
    if (settings.primaryBrandColor && !normalizeHex(settings.primaryBrandColor)) {
      setError('Enter a valid brand color, such as #EA580C. Your changes have not been saved.');
      return;
    }
    const links = [settings.logoUrl, settings.landingPageVideoUrl, settings.privacyPolicyUrl, settings.termsOfServiceUrl, ...(settings.footerLinks || []).map(row => row.url), ...(settings.socialLinks || []).map(row => row.url)];
    if (links.some(value => value && !safeWebLink(value))) {
      setError('Use secure web addresses beginning with https://.');
      return;
    }
    if (settings.contactEmail && !contactLink(settings.contactEmail)) {
      setError('Enter a valid contact email.');
      return;
    }
    setBusy(true); setError(null); setSaved(false);
    try {
      await updateGeneralConfig(settings);
      dirty.current = false;
      setSaved(true);
    } catch {
      setError('Website settings could not be saved. Your edits are still here. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const uploadVideo = async (file?: File) => {
    if (!file) return;
    if (!VIDEO_TYPES.has(file.type)) {
      setError('Choose an MP4 or WebM video. MP4 is recommended for the widest browser support.');
      return;
    }
    if (file.size <= 0 || file.size >= MAX_VIDEO_BYTES) {
      setError('Choose a video smaller than 100 MB.');
      return;
    }
    setError(null); setSaved(false); setVideoBusy(true); setVideoProgress(0);
    try {
      const url = await StorageService.uploadFile(file, 'website/marketing/', setVideoProgress);
      dirty.current = true;
      setSettings(current => ({ ...current, landingPageVideoUrl: url }));
      setVideoProgress(100);
    } catch {
      setError('The video could not be uploaded. Your current website video has not changed. Try again.');
      setVideoProgress(null);
    } finally {
      setVideoBusy(false);
    }
  };

  const currentVideo = safeWebLink(settings.landingPageVideoUrl);
  const disabled = busy || videoBusy;

  return <div className="space-y-8">
    <h3 className="text-xl font-semibold">Website settings</h3>
    <InlineFeedback tone="error" message={error} />
    <InlineFeedback tone="success" message={saved ? 'Website settings saved.' : null} />
    <form onSubmit={save} className="space-y-7 rounded-xl border border-surface-highlight p-5 sm:p-6">
      <div className="grid md:grid-cols-2 gap-5">
        {fields.map(field => <label key={field.key} className={`block ${field.long ? 'md:col-span-2' : ''}`} htmlFor={`website-${field.key}`}>
          {field.label}
          {field.long ? <textarea id={`website-${field.key}`} value={settings[field.key] || ''} maxLength={1200} disabled={disabled} onChange={event => change({ ...settings, [field.key]: event.target.value })} className={fieldClass} /> : <input id={`website-${field.key}`} type={field.type || 'text'} value={settings[field.key] || ''} maxLength={field.type === 'url' ? 2048 : 240} disabled={disabled} onChange={event => change({ ...settings, [field.key]: event.target.value })} className={fieldClass} />}
        </label>)}
      </div>

      <fieldset className="rounded-xl border border-surface-highlight p-4 sm:p-5 space-y-4">
        <legend className="font-semibold px-1">Homepage video</legend>
        <p className="text-sm text-text-secondary">Add a product demonstration by pasting a secure video address or uploading an MP4 or WebM file. The video will not play until a visitor chooses Play.</p>
        <label className="block" htmlFor="website-video-url">Video address
          <input id="website-video-url" type="url" value={settings.landingPageVideoUrl || ''} maxLength={2048} disabled={disabled} onChange={event => change({ ...settings, landingPageVideoUrl: event.target.value })} className={fieldClass} placeholder="https://example.com/product-demo.mp4" />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="ui-button ui-button-secondary cursor-pointer" htmlFor="website-video-upload">{videoBusy ? 'Uploading…' : currentVideo ? 'Replace video' : 'Upload video'}
            <input id="website-video-upload" className="sr-only" type="file" accept="video/mp4,video/webm,.mp4,.webm" disabled={disabled} onChange={event => { void uploadVideo(event.target.files?.[0]); event.currentTarget.value = ''; }} />
          </label>
          {currentVideo && <button type="button" className="ui-button ui-button-secondary" disabled={disabled} onClick={() => { change({ ...settings, landingPageVideoUrl: '' }); setVideoProgress(null); }}>Remove video</button>}
        </div>
        {videoProgress !== null && <p role="status" className="text-sm text-text-secondary">{videoProgress < 100 ? `Uploading video… ${videoProgress}%` : 'Video uploaded. Save changes to show it on the website.'}</p>}
        {currentVideo && <video src={currentVideo} controls playsInline preload="metadata" className="w-full max-w-2xl aspect-video rounded-lg bg-black" aria-label="Homepage video preview" />}
      </fieldset>

      <p className="text-sm text-text-secondary">Leave optional addresses empty to use the built-in page or hide the link.</p>
      <label className="block">Primary brand color<input aria-label="Primary brand color hex" value={settings.primaryBrandColor || ''} placeholder="#EA580C" aria-invalid={!!settings.primaryBrandColor && !normalizeHex(settings.primaryBrandColor)} disabled={disabled} onChange={event => change({ ...settings, primaryBrandColor: event.target.value })} className={fieldClass} /></label>
      <div className="app-ui border border-surface-highlight rounded-lg p-4" style={brandStyle(settings.primaryBrandColor)} aria-label="Brand color preview"><span className="ui-button ui-button-primary">Button preview</span><span className="text-primary ml-4">Accent text preview</span><p className="text-sm text-text-secondary mt-3">Interface colors adjust for readability. Your menu designs keep their original colors.</p></div>

      <fieldset className="space-y-4"><legend className="font-semibold mb-3">Website options</legend>{[{ key: 'publicSignupEnabled', label: 'Show new-account registration' }, { key: 'showPricingPage', label: 'Show public plan comparison' }].map(option => <label key={option.key} className="flex items-center gap-3 min-h-11"><input type="checkbox" checked={settings.featureFlags?.[option.key] !== false} disabled={disabled} onChange={event => change({ ...settings, featureFlags: { ...settings.featureFlags, [option.key]: event.target.checked } })} />{option.label}</label>)}<label className="flex items-center gap-3 min-h-11"><input type="checkbox" checked={!!settings.maintenanceMode} disabled={disabled} onChange={event => change({ ...settings, maintenanceMode: event.target.checked })} />Show a website maintenance notice</label></fieldset>

      <fieldset className="space-y-4"><legend className="font-semibold mb-3">Footer links</legend>{(settings.footerLinks || []).map((row, index) => <div key={index} className="grid sm:grid-cols-2 gap-3"><label>Link name<input aria-label={`Footer link ${index + 1} name`} required value={row.label} disabled={disabled} maxLength={80} onChange={event => change({ ...settings, footerLinks: settings.footerLinks!.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) })} className={fieldClass} /></label><label>Web address<input aria-label={`Footer link ${index + 1} address`} required type="url" value={row.url} disabled={disabled} maxLength={2048} onChange={event => change({ ...settings, footerLinks: settings.footerLinks!.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item) })} className={fieldClass} /></label><button type="button" className="ui-button ui-button-secondary" disabled={disabled} onClick={() => change({ ...settings, footerLinks: settings.footerLinks!.filter((_, itemIndex) => itemIndex !== index) })}>Remove footer link {index + 1}</button></div>)}{(settings.footerLinks?.length || 0) < 10 && <button type="button" className="ui-button ui-button-secondary" disabled={disabled} onClick={() => change({ ...settings, footerLinks: [...(settings.footerLinks || []), { label: '', url: '' }] })}>Add footer link</button>}</fieldset>

      <fieldset className="space-y-4"><legend className="font-semibold mb-3">Social links</legend>
        {(settings.socialLinks || []).map((row, index) => <div key={index} className="grid sm:grid-cols-2 gap-3">
          <label>Platform<input aria-label={`Social link ${index + 1} platform`} required maxLength={80} value={row.platform} disabled={disabled} onChange={event => change({ ...settings, socialLinks: settings.socialLinks!.map((item, n) => n === index ? { ...item, platform: event.target.value } : item) })} className={fieldClass} /></label>
          <label>Web address<input aria-label={`Social link ${index + 1} address`} required type="url" maxLength={2048} value={row.url} disabled={disabled} onChange={event => change({ ...settings, socialLinks: settings.socialLinks!.map((item, n) => n === index ? { ...item, url: event.target.value } : item) })} className={fieldClass} /></label>
          <button type="button" className="ui-button ui-button-secondary" disabled={disabled} onClick={() => change({ ...settings, socialLinks: settings.socialLinks!.filter((_, n) => n !== index) })}>Remove social link {index + 1}</button>
        </div>)}
        {(settings.socialLinks?.length || 0) < 10 && <button type="button" className="ui-button ui-button-secondary" disabled={disabled} onClick={() => change({ ...settings, socialLinks: [...(settings.socialLinks || []), { platform: '', url: '' }] })}>Add social link</button>}
      </fieldset>

      <button type="submit" className="ui-button ui-button-primary" disabled={disabled}>{busy ? 'Saving…' : 'Save changes'}</button>
    </form>
    <WebsiteContentEditor />
  </div>;
};
