// Shared commercial rules. Importing this file never initializes Firebase or Stripe.
export const PLAN_NAMES = ['Free', 'Basic', 'Growth', 'Enterprise', 'Franchise'] as const;
export type PlanName = typeof PLAN_NAMES[number];
export interface PlanConfig {
  price: number; screens: number; seats: number; description: string;
  deploymentDurationLimit: boolean; allowedTiles: string[]; stripePriceId?: string;
  maxScreens?: number; maxSeats?: number;
  addOns?: { screen?: number; seat?: number; screenPriceId?: string; seatPriceId?: string };
}
export type PlanCatalogue = Record<PlanName, PlanConfig>;
export interface PlanQuote { total: number | null; extraScreens: number; extraSeats: number; error: string | null }
export function isPlanName(value: unknown): value is PlanName {
  return typeof value === 'string' && (PLAN_NAMES as readonly string[]).includes(value);
}
const count = (value: unknown, unlimited = false): value is number => typeof value === 'number' && Number.isInteger(value) && ((unlimited && value === -1) || (value >= 1 && value <= 10000));
const money = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100000 && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
export function validateCatalogue(value: unknown): PlanCatalogue {
  if (!value || typeof value !== 'object') throw new Error('Plan details are unavailable.');
  const result = {} as PlanCatalogue;
  for (const name of PLAN_NAMES) {
    const p = (value as Record<string, PlanConfig>)[name];
    if (!p || !money(p.price) || !count(p.screens, true) || !count(p.seats, true) || !Array.isArray(p.allowedTiles) || !p.allowedTiles.every(t => typeof t === 'string') || typeof p.description !== 'string' || typeof p.deploymentDurationLimit !== 'boolean') throw new Error('Plan details are unavailable.');
    if (name === 'Free' && p.price !== 0) throw new Error('Plan details are unavailable.');
    if ((p.maxScreens !== undefined && (!count(p.maxScreens) || (p.screens !== -1 && p.maxScreens < p.screens))) || (p.maxSeats !== undefined && (!count(p.maxSeats) || (p.seats !== -1 && p.maxSeats < p.seats)))) throw new Error('Plan details are unavailable.');
    if (p.addOns && ((p.addOns.screen !== undefined && !money(p.addOns.screen)) || (p.addOns.seat !== undefined && !money(p.addOns.seat)))) throw new Error('Plan details are unavailable.');
    result[name] = { ...p, allowedTiles: [...p.allowedTiles], ...(p.addOns ? { addOns: { ...p.addOns } } : {}) };
  }
  return result;
}
export function quotePlan(name: PlanName, p: PlanConfig, screens: number, seats: number): PlanQuote {
  const invalid = (error: string): PlanQuote => ({ total: null, extraScreens: 0, extraSeats: 0, error });
  if (!count(screens) || !count(seats)) return invalid('Enter whole numbers of at least one.');
  if (name === 'Franchise') return { total: null, extraScreens: 0, extraSeats: 0, error: null };
  if ((p.maxScreens !== undefined && screens > p.maxScreens) || (p.maxSeats !== undefined && seats > p.maxSeats)) return invalid('Choose a larger plan for this many screens or team members.');
  const extraScreens = p.screens === -1 ? 0 : Math.max(0, screens - p.screens);
  const extraSeats = p.seats === -1 ? 0 : Math.max(0, seats - p.seats);
  if ((extraScreens && p.addOns?.screen === undefined) || (extraSeats && p.addOns?.seat === undefined)) return invalid('This plan does not include enough screens or team members.');
  const total = (Math.round(p.price * 100) + extraScreens * Math.round((p.addOns?.screen || 0) * 100) + extraSeats * Math.round((p.addOns?.seat || 0) * 100)) / 100;
  return { total, extraScreens, extraSeats, error: null };
}
export function recommendedPlan(catalogue: PlanCatalogue, screens: number, seats: number): PlanName {
  const eligible = PLAN_NAMES.filter(n => n !== 'Free' && n !== 'Franchise').map(name => ({ name, quote: quotePlan(name, catalogue[name], screens, seats) })).filter(row => !row.quote.error && row.quote.total !== null).sort((a, b) => a.quote.total! - b.quote.total!);
  return eligible[0]?.name || 'Franchise';
}
export function resolvePlan(catalogue: PlanCatalogue, selection: unknown): PlanName {
  if (isPlanName(selection)) return selection;
  const name = PLAN_NAMES.find(n => catalogue[n].stripePriceId === selection && typeof selection === 'string');
  if (!name) throw new Error('Choose a current plan.');
  return name;
}
export function assertBillingMember(org: { ownerId?: string }, member: { status?: string; role?: string } | undefined, uid: string): void {
  if (org.ownerId === uid || (member?.status === 'active' && member.role === 'orgAdmin')) return;
  throw new Error('Only a restaurant owner or administrator can manage billing.');
}
