/** sRGB contrast utilities. Authored signage colors are deliberately not rewritten. */
export const DEFAULT_BRAND = '#ea580c';
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const hex = value.trim();
  if (/^#[0-9a-f]{3}$/i.test(hex)) return '#' + [...hex.slice(1)].map(c => c + c).join('').toLowerCase();
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : null;
}
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const hexOf = (values: number[]) => '#' + values.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function luminance(hex: string) {
  const v = rgb(hex).map(c => { const s = c / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; });
  return v[0] * .2126 + v[1] * .7152 + v[2] * .0722;
}
export function contrastRatio(a: string, b: string) {
  const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
function adjust(color: string, against: string[], target: number, toward: number) {
  const base = rgb(color);
  for (let i = 0; i <= 255; i++) {
    const candidate = hexOf(base.map(v => v + (toward - v) * i / 255));
    if (against.every(bg => contrastRatio(candidate, bg) >= target)) return candidate;
  }
  return toward === 0 ? '#000000' : '#ffffff';
}
export function deriveBrandColors(value: unknown) {
  const brand = normalizeHex(value) ?? DEFAULT_BRAND;
  const action = adjust(brand, ['#ffffff'], 4.5, 0);
  const text = adjust(brand, ['#111827', '#1f2937', '#374151'], 4.5, 255);
  return { brand, action, actionHover: adjust(action, ['#ffffff'], 7, 0), text, onAction: '#ffffff', focus: text };
}
export function brandStyle(value: unknown): Record<string, string> {
  const c = deriveBrandColors(value);
  return { '--brand-text': c.text, '--brand-action': c.action, '--brand-action-hover': c.actionHover, '--brand-focus': c.focus };
}
