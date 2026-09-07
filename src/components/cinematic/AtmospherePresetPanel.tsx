import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ATMOSPHERE_PRESETS, entitlements, presetConfig, normalizeAtmosphere, type Strength, type Quality } from '../../../functions/src/cinematic/catalog';
import type { ParticleConfig } from '../../types/schema';
interface Props { config?: ParticleConfig; plan: unknown; onChange: (config: ParticleConfig) => void; previewOnly?: boolean }
export const AtmospherePresetPanel = ({ config, plan, onChange, previewOnly = false }: Props) => {
  const [error, setError] = useState('');
  const available = entitlements(plan).atmosphere;
  const safe = normalizeAtmosphere(config);
  const selectedId = safe.presetId || (safe.effectType !== 'none' ? '' : 'clear');
  const choose = (id: string, strength: Strength = safe.strength || 'subtle', quality: Quality = safe.quality || 'standard') => {
    if (id !== 'clear' && !available && !previewOnly) { setError('Growth includes all cinematic presets. Clear & readable is available now.'); return; }
    setError(''); onChange(presetConfig(id, strength, quality));
  };
  return <section aria-label="Atmosphere presets" className="space-y-4">
    <div><h3 className="font-semibold text-lg">Atmosphere, made simple</h3><p className="text-sm text-text-secondary mt-1">Choose a mood, not dozens of settings. Text and prices stay above the atmosphere.</p></div>
    {!available && <p className="text-sm text-text-secondary">A still background is included. Motion presets are {previewOnly ? 'preview-only on your plan' : 'included with Growth and above'}. <Link to="/admin/subscription" className="underline text-primary">Compare plans</Link></p>}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {ATMOSPHERE_PRESETS.map(p => <button type="button" key={p.id} aria-pressed={selectedId === p.id}
        onClick={() => choose(p.id)} disabled={p.id !== 'clear' && !available && !previewOnly}
        className={`text-left p-3 rounded-lg border ${selectedId === p.id ? 'border-primary bg-primary/10' : 'border-surface-highlight'} disabled:opacity-60`}>
        <span className="block font-semibold text-sm">{p.name}{p.id !== 'clear' && !available ? ' · Growth' : ''}</span><span className="block text-xs text-text-secondary mt-1">{p.id === 'clear' ? 'A clean, still background that keeps your menu easy to read.' : p.description}</span>
      </button>)}
    </div>
    {selectedId && selectedId !== 'clear' && <div className="grid grid-cols-2 gap-3">
      <label className="text-sm">Strength<select aria-label="Atmosphere strength" className="w-full mt-1 bg-background rounded border border-surface-highlight p-2" value={safe.strength || 'subtle'} onChange={e => choose(selectedId, e.target.value as Strength)}>
        <option value="subtle">Subtle</option><option value="balanced">Balanced</option><option value="vivid">Vivid</option>
      </select></label>
      <label className="text-sm">Device quality<select aria-label="Atmosphere quality" className="w-full mt-1 bg-background rounded border border-surface-highlight p-2" value={safe.quality || 'standard'} onChange={e => choose(selectedId, safe.strength, e.target.value as Quality)}>
        <option value="eco">Eco</option><option value="standard">Standard</option><option value="high">High</option>
      </select></label>
    </div>}
    {!selectedId && <p className="text-sm text-text-secondary">This slide uses custom settings. Choosing a preset replaces atmosphere settings only.</p>}
    <p className="text-xs text-text-secondary">When Reduce Motion is on, the background stays still. If your device cannot show an effect, your menu remains readable without it. Eco reduces the load on your screen device.</p>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </section>;
};
