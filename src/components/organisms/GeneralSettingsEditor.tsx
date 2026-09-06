import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useConfigStore } from '../../store/useConfigStore';
import type { GeneralConfig } from '../../services/configService';

export const GeneralSettingsEditor = () => {
  const { generalConfig, updateGeneralConfig } = useConfigStore();
  const [settings, setSettings] = useState<GeneralConfig>({});
  const [socialLinksText, setSocialLinksText] = useState('[]');
  const [footerLinksText, setFooterLinksText] = useState('[]');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings(JSON.parse(JSON.stringify(generalConfig || {})));
    setSocialLinksText(JSON.stringify(generalConfig?.socialLinks || [], null, 2));
    setFooterLinksText(JSON.stringify(generalConfig?.footerLinks || [], null, 2));
    setJsonError(null);
  }, [generalConfig]);

  const parseJsonArray = (text: string, label: string) => {
    try {
      const value = JSON.parse(text || '[]') as unknown;
      if (!Array.isArray(value)) {
        throw new Error(`${label} must be a JSON array`);
      }
      return { ok: true as const, value };
    } catch (e) {
      const message = e instanceof Error ? e.message : `Invalid JSON for ${label}`;
      return { ok: false as const, error: message };
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setJsonError(null);
    try {
      const socialLinksParsed = parseJsonArray(socialLinksText, 'Social Links');
      if (!socialLinksParsed.ok) {
        setJsonError(socialLinksParsed.error);
        return;
      }

      const footerLinksParsed = parseJsonArray(footerLinksText, 'Footer Links');
      if (!footerLinksParsed.ok) {
        setJsonError(footerLinksParsed.error);
        return;
      }

      const nextSettings: GeneralConfig = {
        ...settings,
        socialLinks: socialLinksParsed.value as GeneralConfig['socialLinks'],
        footerLinks: footerLinksParsed.value as GeneralConfig['footerLinks']
      };

      await updateGeneralConfig(nextSettings);
      alert('General settings updated successfully');
    } catch {
      alert('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-text">General Settings</h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {jsonError && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-sm text-red-500">
          {jsonError}
        </div>
      )}

      <div className="bg-surface border border-surface-highlight rounded-xl p-6 space-y-4">
        <h4 className="text-lg font-bold text-text">Landing Page</h4>

        <div>
          <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block">Video URL</label>
          <input
            type="url"
            value={settings.landingPageVideoUrl || ''}
            onChange={(e) => setSettings({ ...settings, landingPageVideoUrl: e.target.value })}
            className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
            placeholder="https://example.com/video.mp4"
          />
        </div>

        <div>
          <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block">Title</label>
          <input
            type="text"
            value={settings.landingPageTitle || ''}
            onChange={(e) => setSettings({ ...settings, landingPageTitle: e.target.value })}
            className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
            placeholder="Design and deploy restaurant screens in minutes."
          />
        </div>

        <div>
          <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block">Description</label>
          <textarea
            value={settings.landingPageDescription || ''}
            onChange={(e) => setSettings({ ...settings, landingPageDescription: e.target.value })}
            className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text h-24"
            placeholder="Menus, promos, and multi-location boards—managed from one dashboard."
          />
        </div>
      </div>

      <div className="bg-surface border border-surface-highlight rounded-xl p-6 space-y-4">
        <h4 className="text-lg font-bold text-text">Branding</h4>

        <div>
          <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block">Logo URL</label>
          <input
            type="url"
            value={settings.logoUrl || ''}
            onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
            className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
            placeholder="https://example.com/logo.png"
          />
        </div>

        <div>
          <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block">Primary Brand Color</label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={settings.primaryBrandColor || '#EA580C'}
              onChange={(e) => setSettings({ ...settings, primaryBrandColor: e.target.value })}
              className="w-16 h-10 border border-surface-highlight rounded cursor-pointer"
            />
            <input
              type="text"
              value={settings.primaryBrandColor || '#EA580C'}
              onChange={(e) => setSettings({ ...settings, primaryBrandColor: e.target.value })}
              placeholder="#EA580C"
              className="flex-1 bg-background border border-surface-highlight rounded px-3 py-2 text-text"
            />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-surface-highlight rounded-xl p-6 space-y-4">
        <h4 className="text-lg font-bold text-text">Contact</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block">Contact Email</label>
            <input
              type="email"
              value={settings.contactEmail || ''}
              onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
              className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
              placeholder="support@example.com"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block">Contact Phone</label>
            <input
              type="tel"
              value={settings.contactPhone || ''}
              onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
              className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
              placeholder="+1 (555) 555-5555"
            />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-surface-highlight rounded-xl p-6 space-y-4">
        <h4 className="text-lg font-bold text-text">Social Links</h4>
        <div>
          <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block">JSON Array</label>
          <textarea
            value={socialLinksText}
            onChange={(e) => setSocialLinksText(e.target.value)}
            className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text h-40 font-mono text-xs"
            placeholder='[{"platform": "Twitter", "url": "https://twitter.com/..."}]'
          />
        </div>
      </div>

      <div className="bg-surface border border-surface-highlight rounded-xl p-6 space-y-4">
        <h4 className="text-lg font-bold text-text">Legal</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block">Privacy Policy URL</label>
            <input
              type="url"
              value={settings.privacyPolicyUrl || ''}
              onChange={(e) => setSettings({ ...settings, privacyPolicyUrl: e.target.value })}
              className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
              placeholder="https://example.com/privacy"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block">Terms of Service URL</label>
            <input
              type="url"
              value={settings.termsOfServiceUrl || ''}
              onChange={(e) => setSettings({ ...settings, termsOfServiceUrl: e.target.value })}
              className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
              placeholder="https://example.com/terms"
            />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-surface-highlight rounded-xl p-6 space-y-4">
        <h4 className="text-lg font-bold text-text">System Configuration</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Default Currency</label>
            <select
              value={settings.defaultCurrency || 'USD'}
              onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
              className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
            >
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Default Locale</label>
            <select
              value={settings.defaultLocale || 'en-US'}
              onChange={(e) => setSettings({ ...settings, defaultLocale: e.target.value })}
              className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
            >
              <option value="en-US">en-US</option>
              <option value="en-CA">en-CA</option>
              <option value="es-US">es-US</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Global Analytics Tracking ID</label>
          <input
            type="text"
            value={settings.analyticsTrackingId || ''}
            onChange={(e) => setSettings({ ...settings, analyticsTrackingId: e.target.value })}
            placeholder="G-XXXXXXXXXX"
            className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
          />
        </div>

        <div className="space-y-4 pt-4 border-t border-surface-highlight">
          <h5 className="text-md font-bold text-text">Support Integration</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Provider</label>
              <select
                value={settings.supportTicketIntegration?.provider || 'none'}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  supportTicketIntegration: { 
                    apiKey: '', 
                    ...settings.supportTicketIntegration, 
                    provider: e.target.value 
                  } 
                })}
                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
              >
                <option value="none">None</option>
                <option value="zendesk">Zendesk</option>
                <option value="intercom">Intercom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">API Key</label>
              <input
                type="text"
                value={settings.supportTicketIntegration?.apiKey || ''}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  supportTicketIntegration: { 
                    provider: 'none', 
                    ...settings.supportTicketIntegration, 
                    apiKey: e.target.value 
                  } 
                })}
                placeholder="API Key"
                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
              />
              <p className="text-xs text-warning mt-1">Store securely; consider server-side only.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-surface-highlight rounded-xl p-6 space-y-6">
        <h4 className="text-lg font-bold text-text">Advanced Features</h4>
        
        <div className="flex items-center gap-3 bg-surface-highlight/10 p-4 rounded-lg border border-surface-highlight">
          <input
            type="checkbox"
            id="maintenance"
            checked={settings.maintenanceMode || false}
            onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
            className="w-5 h-5 rounded border-surface-highlight bg-background text-primary"
          />
          <div>
            <label htmlFor="maintenance" className="text-text font-medium block">Enable Maintenance Mode</label>
            <p className="text-xs text-text-muted">Displays a maintenance banner on the landing page and restricts access.</p>
          </div>
        </div>

        <div className="space-y-4">
          <h5 className="text-md font-bold text-text">Feature Toggles</h5>
          <div className="space-y-3">
            {[
              { key: 'publicSignupEnabled', label: 'Enable Public Signups' },
              { key: 'showPricingPage', label: 'Show Pricing Page' },
              { key: 'enableDesignerMarketplace', label: 'Enable Designer Marketplace' }
            ].map(toggle => (
              <div key={toggle.key} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={toggle.key}
                  checked={settings.featureFlags?.[toggle.key] || false}
                  onChange={(e) => setSettings({
                    ...settings,
                    featureFlags: { ...settings.featureFlags, [toggle.key]: e.target.checked }
                  })}
                  className="w-5 h-5 rounded border-surface-highlight bg-background text-primary"
                />
                <label htmlFor={toggle.key} className="text-text">{toggle.label}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-surface-highlight">
          <h5 className="text-md font-bold text-text">Site Banner</h5>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="bannerEnabled"
                checked={settings.siteBanner?.enabled || false}
                onChange={(e) => setSettings({
                  ...settings,
                  siteBanner: { 
                    message: '', 
                    variant: 'info', 
                    ...settings.siteBanner, 
                    enabled: e.target.checked 
                  }
                })}
                className="w-5 h-5 rounded border-surface-highlight bg-background text-primary"
              />
              <label htmlFor="bannerEnabled" className="text-text">Enable Site Banner</label>
            </div>
            <input
              type="text"
              value={settings.siteBanner?.message || ''}
              onChange={(e) => setSettings({
                ...settings,
                siteBanner: { 
                  enabled: false, 
                  variant: 'info', 
                  ...settings.siteBanner, 
                  message: e.target.value 
                }
              })}
              placeholder="Banner message"
              className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
            />
            <select
              value={settings.siteBanner?.variant || 'info'}
              onChange={(e) => setSettings({
                ...settings,
                siteBanner: { 
                  enabled: false, 
                  message: '', 
                  ...settings.siteBanner, 
                  variant: e.target.value as 'info' | 'warning' | 'success' 
                }
              })}
              className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="success">Success</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-surface-highlight rounded-xl p-6 space-y-4">
        <h4 className="text-lg font-bold text-text">Footer</h4>

        <div>
          <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block">Footer Text</label>
          <input
            type="text"
            value={settings.footerCopyrightText || ''}
            onChange={(e) => setSettings({ ...settings, footerCopyrightText: e.target.value })}
            className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
            placeholder="© 2026 Accel Analysis, LLC. All rights reserved."
          />
        </div>

        <div>
          <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block">Footer Links JSON Array</label>
          <textarea
            value={footerLinksText}
            onChange={(e) => setFooterLinksText(e.target.value)}
            className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text h-40 font-mono text-xs"
            placeholder='[{"label": "Privacy", "url": "https://example.com/privacy"}]'
          />
        </div>
      </div>
    </div>
  );
};
