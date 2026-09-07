import { fitStarterText } from './typography';
import { CINEMATIC_VERSION, entitlements, presetConfig, type Strength, type Quality } from './catalog';
export type Orientation = 'landscape' | 'portrait';
export interface MenuRow { name: string; price: string; description: string }
export interface StarterInput {
  templateId: string; orientation: Orientation; brandName: string; headline: string;
  footer: string; items: MenuRow[]; presetId: string; strength: Strength; quality: Quality;
}
export const RESTAURANT_TEMPLATES = [
  { id: 'coffee-house', name: 'Coffee house', category: 'Coffee & bakery', signature: false, eyebrow: 'CRAFTED DAILY', title: 'Good mornings.', footer: 'Coffee, conversation, and something fresh.', preset: 'warm-steam', bg: '#211d19', panel: '#eee2cd', ink: '#211d19', accent: '#dba86a', light: '#f9efdf', serif: true,
    items: [['Flat white', '$4.50', 'Espresso • steamed milk'], ['Cold brew', '$5.00', 'Slow steeped • served over ice'], ['Matcha latte', '$5.50', 'Ceremonial green tea • milk'], ['Butter croissant', '$3.75', 'Baked fresh • flaky layers'], ['Morning bun', '$4.25', 'Brown sugar • cinnamon'], ['Breakfast toast', '$8.50', 'Avocado • lemon • sea salt']] },
  { id: 'grill-house', name: 'Grill house', category: 'Burgers & barbecue', signature: false, eyebrow: 'FROM THE FIRE', title: 'Big on flavor.', footer: 'Make it a meal. Ask about today’s sides.', preset: 'ember-haze', bg: '#191c1b', panel: '#f0e8d8', ink: '#191c1b', accent: '#ed995f', light: '#fff4dd', serif: false,
    items: [['House burger', '$12.00', 'Smash patty • aged cheddar'], ['Smoked brisket', '$18.00', 'Slow smoked • house pickles'], ['Crispy chicken', '$13.00', 'Slaw • pepper mayo'], ['Loaded fries', '$7.00', 'Cheddar • herbs • house sauce'], ['Garden burger', '$12.00', 'Plant patty • tomato relish'], ['Family platter', '$42.00', 'A little of everything • serves four']] },
  { id: 'fresh-counter', name: 'Fresh counter', category: 'Fast casual & bowls', signature: false, eyebrow: 'FRESHLY MADE', title: 'Your daily good.', footer: 'Build your bowl. Make it your own.', preset: 'autumn-drift', bg: '#122d27', panel: '#e9efdc', ink: '#122d27', accent: '#c4d78b', light: '#f2f5e8', serif: false,
    items: [['Harvest bowl', '$12.50', 'Roasted roots • grains • tahini'], ['Green goddess', '$11.50', 'Crisp greens • herb dressing'], ['Citrus chicken', '$14.00', 'Grilled chicken • brown rice'], ['Tofu crunch', '$12.00', 'Sesame tofu • pickled slaw'], ['Fresh lemonade', '$4.00', 'Lemon • mint • sparkling water'], ['Add avocado', '$2.00', 'Creamy • freshly sliced']] },
  { id: 'dessert-studio', name: 'Dessert studio', category: 'Desserts & sweet treats', signature: false, eyebrow: 'SAVE ROOM', title: 'A sweet finish.', footer: 'A small indulgence. A very good idea.', preset: 'date-night', bg: '#3a2231', panel: '#f4e4e4', ink: '#3a2231', accent: '#edb7b9', light: '#fff2ed', serif: true,
    items: [['Chocolate torte', '$9.00', 'Dark chocolate • silky ganache'], ['Vanilla gelato', '$6.00', 'Two scoops • waffle crisp'], ['Berry cheesecake', '$8.50', 'Seasonal berries • biscuit base'], ['Affogato', '$7.00', 'Vanilla gelato • espresso'], ['Lemon tart', '$8.00', 'Bright lemon • crisp pastry'], ['Dessert duo', '$15.00', 'Two favorites • made to share']] },
  { id: 'chefs-table', name: 'Chef’s table', category: 'Boutique dining', signature: true, eyebrow: 'THE EVENING EDIT', title: 'Seasonal stories.', footer: 'Thoughtfully sourced. Beautifully prepared.', preset: 'warm-steam', bg: '#152327', panel: '#ede7d9', ink: '#152327', accent: '#d0bb88', light: '#f7f2e7', serif: true,
    items: [['Burrata', '$15.00', 'Tomato • basil • sourdough'], ['Market crudo', '$18.00', 'Citrus • herbs • olive oil'], ['Wild mushroom', '$26.00', 'Hand-cut pasta • aged cheese'], ['Roasted fish', '$32.00', 'Seasonal greens • lemon butter'], ['Steak frites', '$36.00', 'Pepper sauce • crisp potatoes'], ['Chef’s dessert', '$12.00', 'A seasonal finishing touch']] },
  { id: 'after-hours', name: 'After hours', category: 'Lounge & event nights', signature: true, eyebrow: 'STAY A LITTLE LONGER', title: 'The night is yours.', footer: 'Good company. Great bites. Your kind of night.', preset: 'celebration-stars', bg: '#1a1830', panel: '#e8e4f4', ink: '#1a1830', accent: '#c5b2ff', light: '#f3edff', serif: false,
    items: [['Midnight sliders', '$12.00', 'Three mini burgers • pickles'], ['Crispy calamari', '$13.00', 'Lemon • chili • aioli'], ['Sharing board', '$24.00', 'Cheese • cured meats • crackers'], ['Loaded nachos', '$14.00', 'Beans • salsa • melted cheese'], ['Ginger fizz', '$6.00', 'Ginger • lime • soda'], ['Late-night fries', '$7.00', 'Sea salt • signature sauce']] },
];
export function defaultStarter(templateId = 'coffee-house', brandName = 'Your restaurant'): StarterInput {
  const t = RESTAURANT_TEMPLATES.find(t => t.id === templateId);
  if (!t) throw new Error('Choose a known restaurant template.');
  return { templateId, brandName, headline: t.title, footer: t.footer,
    orientation: 'landscape', items: t.items.map(([name, price, description]) => ({ name, price, description })),
    presetId: 'clear', strength: 'subtle', quality: 'standard' };
}
function text(value: unknown, label: string, max: number, optional = false) {
  if (typeof value !== 'string' || (!optional && !value.trim()) || value.length > max || (/[<>]/.test(value) || [...value].some(char => char.charCodeAt(0) < 32)))
    throw new Error(`${label}: enter ${optional ? 'up to' : '1–'}${max} characters of plain text.`);
  return value.trim();
}
export function validateStarter(value: unknown): StarterInput {
  if (!value || typeof value !== 'object') throw new Error('Enter your restaurant details.');
  const v = value as Record<string, unknown>;
  const templateId = text(v.templateId, 'Template', 40);
  if (!RESTAURANT_TEMPLATES.some(t => t.id === templateId)) throw new Error('Choose a known restaurant template.');
  if (!['landscape', 'portrait'].includes(String(v.orientation))) throw new Error('Choose landscape or portrait.');
  if (!Array.isArray(v.items) || v.items.length < 1 || v.items.length > 6) throw new Error('Include between one and six menu items.');
  const items = v.items.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Enter a valid menu item.');
    const r = item as Record<string, unknown>;
    return { name: text(r.name, 'Item name', 26), price: text(r.price, 'Price', 10), description: text(r.description, 'Description', 44, true) };
  });
  const result: StarterInput = {
    templateId, orientation: v.orientation as Orientation, brandName: text(v.brandName, 'Restaurant name', 32),
    headline: text(v.headline, 'Headline', 28), footer: text(v.footer, 'Footer', 72, true), items,
    presetId: text(v.presetId, 'Atmosphere preset', 40), strength: v.strength as Strength, quality: v.quality as Quality,
  };
  presetConfig(result.presetId, result.strength, result.quality);
  return result;
}
export function assertStarterEntitled(plan: unknown, input: StarterInput) {
  const t = RESTAURANT_TEMPLATES.find(t => t.id === input.templateId);
  if (!t) throw new Error('Choose a known restaurant template.');
  const access = entitlements(plan);
  if (t.signature && !access.signatureTemplates) throw new Error('This signature template requires Growth. Choose a starter template to continue.');
  if (input.presetId !== 'clear' && !access.atmosphere) throw new Error('Motion presets require Growth. Choose Clear & readable to continue.');
}
export interface StarterTile {
  id: string; name: string; type: 'text' | 'shape'; position: { x: number; y: number };
  size: { width: number; height: number }; opacity: number; rotation: number; zIndex: number;
  visible: boolean; locked: boolean; properties: Record<string, unknown>;
}
/** Native editable text/layout: no rasterized menu text, external dependencies or fake QR destinations. */
export function buildRestaurantSlide(input: StarterInput, orgId: string, instanceId: string) {
  const v = validateStarter(input), t = RESTAURANT_TEMPLATES.find(t => t.id === v.templateId)!;
  const portrait = v.orientation === 'portrait', width = portrait ? 1080 : 1920, height = portrait ? 1920 : 1080;
  const elements: StarterTile[] = [];
  const add = (name: string, type: StarterTile['type'], x: number, y: number, w: number, h: number, properties: Record<string, unknown>, z = 2) => {
    elements.push({ id: `${instanceId}-${elements.length + 1}`, name, type, position: { x, y }, size: { width: w, height: h },
      opacity: 1, rotation: 0, zIndex: z, visible: true, locked: false, properties });
  };
  const label = (name: string, content: string, x: number, y: number, w: number, h: number, size: number, color: string, weight = 400, family = 'Arial, sans-serif', align = 'left') =>
    add(name, 'text', x, y, w, h, { ...fitStarterText(content, w, h, size, family.includes('Georgia'), name.startsWith('Price')), fontColor: color, fontWeight: weight, fontFamily: family, textAlign: align, lineHeight: 1.16, padding: 0 });
  // Opaque panels keep menu text readable regardless of effects or brightness behind them.
  const panelX = portrait ? 40 : 760, panelY = portrait ? 645 : 48, panelW = portrait ? 1000 : 1112, panelH = portrait ? 1135 : 984;
  add('Menu paper', 'text', panelX, panelY, panelW, panelH, { content: ' ', backgroundColor: t.panel, borderRadius: 20 }, 1);
  label('Restaurant name', v.brandName, 72, 60, portrait ? 936 : 612, 90, portrait ? 42 : 34, t.light, 700);
  label('Collection', t.eyebrow, 72, portrait ? 194 : 218, portrait ? 900 : 612, 52, 30, t.accent, 700);
  label('Headline', v.headline, 68, portrait ? 265 : 300, portrait ? 900 : 615, portrait ? 232 : 328, portrait ? 112 : 100, t.light, t.serif ? 400 : 800, t.serif ? 'Georgia, serif' : 'Arial, sans-serif');
  // A restrained editorial rule and edition marker add visual character without covering content.
  add('Accent rule', 'text', 72, portrait ? 562 : 694, portrait ? 936 : 590, 5, { content: ' ', backgroundColor: t.accent }, 2);
  label('Menu category', t.category.toUpperCase(), 72, portrait ? 575 : 730, portrait ? 936 : 590, 55, 28, t.accent, 700);
  label('Footer', v.footer, portrait ? 72 : 72, portrait ? 1806 : 906, portrait ? 936 : 590, portrait ? 70 : 106, portrait ? 26 : 28, t.light);
  const rowsX = panelX + 48, rowsW = panelW - 96, top = panelY + 38;
  label('Menu heading', 'ON THE MENU', rowsX, top, rowsW, 64, 30, t.ink, 700);
  const stride = portrait ? 162 : 139, rowY = top + 98;
  v.items.forEach((item, i) => {
    const y = rowY + i * stride;
    label(`Item ${i + 1}`, item.name, rowsX, y, rowsW - 212, 70, portrait ? 38 : 40, t.ink, 700);
    label(`Price ${i + 1}`, item.price, rowsX + rowsW - 200, y, 200, 70, 38, t.ink, 700, 'Arial, sans-serif', 'right');
    label(`Description ${i + 1}`, item.description, rowsX, y + 70, rowsW, 50, 28, t.ink);
    if (i < v.items.length - 1) add(`Separator ${i + 1}`, 'text', rowsX, y + stride - 7, rowsW, 1, { content: ' ', backgroundColor: t.ink }, 2);
  });
  return { orgId, name: `${v.brandName} · ${t.name}`, dimensions: { width, height }, orientation: v.orientation,
    backgroundColor: t.bg, duration: 12000, elements, particleConfig: presetConfig(v.presetId, v.strength, v.quality),
    restaurantTemplate: { id: t.id, version: CINEMATIC_VERSION },
  };
}
