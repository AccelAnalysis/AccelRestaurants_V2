/** Pure, versioned product contract shared by the Firebase backend and Vite client.
 * No Firebase, DOM, billing SDK or environment dependencies belong in this file.
 */
export const CINEMATIC_VERSION = 1;
export const PLAN_NAMES = ['Free', 'Basic', 'Growth', 'Enterprise', 'Franchise'] as const;
export type CinematicPlan = typeof PLAN_NAMES[number];
export type Effect = 'none' | 'smoke' | 'snow' | 'rain' | 'hearts' | 'stars' | 'leaves';
export type Strength = 'subtle' | 'balanced' | 'vivid';
export type Quality = 'eco' | 'standard' | 'high';
export interface AtmosphereConfig {
  effectType: Effect;
  density: number;
  speed: number;
  color: [number, number, number, number];
  blendMode: 'screen' | 'overlay' | 'normal';
  emitterPosition: { x: number; y: number };
  vorticity: number;
  particleSize?: number;
  particleAngle?: number;
  presetId?: string;
  presetVersion?: number;
  strength?: Strength;
  quality?: Quality;
  seed?: number;
}
export const QUALITY_BUDGETS = {
  eco: { maxPixels: 230400, maxParticles: 120, smokeSteps: 12, fps: 24 },
  standard: { maxPixels: 921600, maxParticles: 240, smokeSteps: 20, fps: 30 },
  high: { maxPixels: 2073600, maxParticles: 400, smokeSteps: 30, fps: 30 },
} as const;
export function normalizePlan(value: unknown): CinematicPlan {
  return PLAN_NAMES.includes(value as CinematicPlan) ? value as CinematicPlan : 'Free';
}
export function entitlements(plan: unknown) {
  const cinematic = ['Growth', 'Enterprise', 'Franchise'].includes(normalizePlan(plan));
  return { starterTemplates: true, guidedSetup: true, atmosphere: cinematic, signatureTemplates: cinematic };
}
const spec = (id: string, name: string, description: string, effectType: Effect,
  density: number, speed: number, color: AtmosphereConfig['color'], particleSize = 10) => ({
  id, name, description, version: CINEMATIC_VERSION,
  config: { effectType, density, speed, color, particleSize, particleAngle: 0,
    blendMode: 'normal' as const, emitterPosition: { x: 0.5, y: 0.5 }, vorticity: 3 },
});
export const ATMOSPHERE_PRESETS = [
  spec('clear', 'Clear & readable', 'Static presentation. No motion or graphics workload.', 'none', 0, 0, [255, 255, 255, 0]),
  spec('warm-steam', 'Warm steam', 'Quiet rising steam for coffee and bakery features.', 'smoke', 32, 0.45, [247, 231, 208, 0.34]),
  spec('ember-haze', 'Ember haze', 'Warm, low smoke for grill-house and evening menus.', 'smoke', 42, 0.65, [238, 158, 90, 0.40]),
  spec('winter-snow', 'Winter snow', 'Slow snowfall for a seasonal feature, never a blizzard.', 'snow', 24, 0.7, [232, 242, 255, 0.55], 9),
  spec('window-rain', 'Window rain', 'Fine moving rain streaks for a calm lounge setting.', 'rain', 30, 0.9, [179, 213, 237, 0.45], 16),
  spec('celebration-stars', 'Celebration stars', 'Gentle gold stars for celebrations and limited-time offers.', 'stars', 16, 0.55, [255, 214, 125, 0.60], 18),
  spec('autumn-drift', 'Autumn drift', 'Warm drifting leaves for harvest menus and seasonal drinks.', 'leaves', 18, 0.6, [218, 152, 80, 0.55], 22),
  spec('date-night', 'Date night', 'Soft, slow hearts for a special evening or dessert feature.', 'hearts', 14, 0.45, [235, 140, 158, 0.45], 22),
];
const finite = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
/** Never allocate GPU resources from unchecked Firestore/import data. Invalid types are static. */
export function normalizeAtmosphere(input: unknown): AtmosphereConfig {
  const raw = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const effects: Effect[] = ['none', 'smoke', 'snow', 'rain', 'hearts', 'stars', 'leaves'];
  const color = Array.isArray(raw.color) ? raw.color : [];
  const emitter = raw.emitterPosition && typeof raw.emitterPosition === 'object'
    ? raw.emitterPosition as Record<string, unknown> : {};
  return {
    effectType: effects.includes(raw.effectType as Effect) ? raw.effectType as Effect : 'none',
    density: finite(raw.density, 0, 0, 100), speed: finite(raw.speed, 1, 0, 5),
    color: [finite(color[0], 255, 0, 255), finite(color[1], 255, 0, 255), finite(color[2], 255, 0, 255), finite(color[3], 1, 0, 1)],
    blendMode: typeof raw.blendMode === 'string' && ['normal', 'screen', 'overlay'].includes(raw.blendMode) ? raw.blendMode as AtmosphereConfig['blendMode'] : 'normal',
    emitterPosition: { x: finite(emitter.x, 0.5, 0, 1), y: finite(emitter.y, 0.5, 0, 1) },
    vorticity: finite(raw.vorticity, 3, 0, 10), particleSize: finite(raw.particleSize, 10, 1, 50),
    particleAngle: finite(raw.particleAngle, 0, 0, 360),
    quality: typeof raw.quality === 'string' && ['eco', 'standard', 'high'].includes(raw.quality) ? raw.quality as Quality : 'standard',
    strength: typeof raw.strength === 'string' && ['subtle', 'balanced', 'vivid'].includes(raw.strength) ? raw.strength as Strength : 'balanced',
    seed: Math.floor(finite(raw.seed, 731, 0, 2147483647)),
    ...(raw.presetVersion === CINEMATIC_VERSION && typeof raw.presetId === 'string' && ATMOSPHERE_PRESETS.some(p => p.id === raw.presetId) ? { presetId: raw.presetId, presetVersion: CINEMATIC_VERSION } : {}),
  };
}
export function presetConfig(id: string, strength: Strength = 'balanced', quality: Quality = 'standard'): AtmosphereConfig {
  const preset = ATMOSPHERE_PRESETS.find(p => p.id === id);
  if (!preset) throw new Error('Choose a known atmosphere preset.');
  if (!['subtle', 'balanced', 'vivid'].includes(strength) || !Object.prototype.hasOwnProperty.call(QUALITY_BUDGETS, quality)) throw new Error('Choose a supported strength and quality.');
  const multiplier = { subtle: 0.55, balanced: 1, vivid: 1.4 }[strength];
  return normalizeAtmosphere({ ...preset.config, density: preset.config.density * multiplier,
    color: [...preset.config.color.slice(0, 3), preset.config.color[3] * Math.min(multiplier, 1.2)],
    presetId: id, presetVersion: preset.version, strength, quality,
    seed: 731 + ATMOSPHERE_PRESETS.indexOf(preset) * 113 });
}
export function assertAtmosphereEntitled(plan: unknown, content: { particleConfig?: unknown }) {
  const raw = content.particleConfig as Record<string, unknown> | undefined;
  // Unknown effects are rejected, rather than becoming a free path through imports.
  if (raw && raw.effectType !== 'none' && !entitlements(plan).atmosphere) {
    throw new Error('Cinematic atmosphere requires Growth or above. Use the static version to continue.');
  }
}
export function renderSize(width: number, height: number, dpr: number, quality: Quality) {
  const w = finite(width, 1, 1, 16384), h = finite(height, 1, 1, 16384);
  const scale = Math.min(finite(dpr, 1, 1, 2), Math.sqrt(QUALITY_BUDGETS[quality].maxPixels / (w * h)));
  return { width: Math.max(1, Math.floor(w * scale)), height: Math.max(1, Math.floor(h * scale)) };
}
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
}
