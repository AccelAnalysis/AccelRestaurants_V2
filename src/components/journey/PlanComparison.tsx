import { PLAN_NAMES, type PlanCatalogue } from '../../../functions/src/journey/catalog';
import { entitlements } from '../../../functions/src/cinematic/catalog';
const money = (n: number | undefined) => n === undefined ? 'Not offered' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) + ' / month';
export function PlanComparison({ catalogue }: { catalogue: PlanCatalogue }) {
  const rows: { label: string; value: (name: typeof PLAN_NAMES[number]) => string }[] = [
    { label: 'Included screens', value: name => catalogue[name].screens === -1 ? 'Custom' : String(catalogue[name].screens) },
    { label: 'Included team members', value: name => catalogue[name].seats === -1 ? 'Custom' : String(catalogue[name].seats) },
    { label: 'Additional screen', value: name => money(catalogue[name].addOns?.screen) },
    { label: 'Additional team member', value: name => money(catalogue[name].addOns?.seat) },
    { label: 'Screen allowance ceiling', value: name => name === 'Franchise' ? 'By agreement' : catalogue[name].maxScreens !== undefined ? String(catalogue[name].maxScreens) : catalogue[name].addOns?.screen !== undefined ? 'No published cap' : String(catalogue[name].screens) },
    { label: 'Restaurant designs', value: name => entitlements(name).signatureTemplates ? 'All designs' : 'Core designs' },
    { label: 'Atmosphere effects', value: name => entitlements(name).signatureTemplates ? 'Included' : 'Still backgrounds' },
    { label: 'Photos, text and QR codes', value: name => catalogue[name].allowedTiles.includes('qr_code') ? 'Included' : 'See plan details' },
    { label: 'Video', value: name => catalogue[name].allowedTiles.includes('video') ? 'Included' : 'Not included' },
    { label: 'Charts and data displays', value: name => catalogue[name].allowedTiles.includes('bar_chart') ? 'Included' : 'Not included' },
    { label: 'Playback', value: name => catalogue[name].deploymentDurationLimit ? 'Five-minute preview' : 'Ongoing playback' },
  ];
  return <details className="rounded-xl border border-surface-highlight p-5 mt-8">
    <summary className="font-semibold text-xl min-h-11 py-2 cursor-pointer">Compare features and extras</summary>
    <div className="overflow-x-auto mt-5" role="region" aria-label="Plan feature comparison" tabIndex={0}>
      <table className="w-full text-left text-sm"><caption className="text-left text-text-secondary mb-4">Monthly allowances and optional extras. Plan selection does not change your subscription until you confirm payment.</caption><thead><tr><th scope="col" className="p-3">Feature</th>{PLAN_NAMES.map(name => <th scope="col" className="p-3" key={name}>{name}</th>)}</tr></thead><tbody>{rows.map(row => <tr className="border-t border-surface-highlight" key={row.label}><th scope="row" className="p-3 font-medium">{row.label}</th>{PLAN_NAMES.map(name => <td className="p-3 min-w-32" key={name}>{row.value(name)}</td>)}</tr>)}</tbody></table>
    </div>
  </details>;
}
