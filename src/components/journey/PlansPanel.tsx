import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlanCatalogue } from '../../hooks/usePlanCatalogue';
import { InlineFeedback } from '../atoms/InlineFeedback';
import { PLAN_NAMES, quotePlan, recommendedPlan, type PlanName } from '../../../functions/src/journey/catalog';
import { entitlements } from '../../../functions/src/cinematic/catalog';
interface Props { initialScreens?: number; initialSeats?: number; selectedPlan?: PlanName; busy?: boolean; onChoose: (name: PlanName, screens: number, seats: number) => void; }
export const PlansPanel = ({ initialScreens = 1, initialSeats = 1, selectedPlan, busy = false, onChoose }: Props) => {
  const { catalogue, loading, error, retry } = usePlanCatalogue();
  const [screenText, setScreens] = useState(String(initialScreens));
  const [seatText, setSeats] = useState(String(initialSeats));
  const screens = Number(screenText), seats = Number(seatText);
  const valid = Number.isInteger(screens) && screens >= 1 && screens <= 10000 && Number.isInteger(seats) && seats >= 1 && seats <= 10000;
  const recommendation = catalogue && valid ? recommendedPlan(catalogue, screens, seats) : null;
  const currency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount);
  return <section aria-label="Available plans" aria-busy={loading || busy} className="space-y-6">
    <fieldset className="rounded-xl border border-surface-highlight p-4 sm:p-6 max-w-3xl mx-auto"><legend className="px-2 font-semibold">What does your restaurant need?</legend>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">Screens<input aria-label="Number of screens" inputMode="numeric" type="number" min={1} max={10000} step={1} value={screenText} disabled={busy} onChange={e => setScreens(e.target.value)} className="mt-2 block w-full min-h-11 bg-background border border-surface-highlight rounded-lg px-3 py-2" /><span className="block text-sm text-text-secondary mt-2">TVs or displays showing your content.</span></label>
        <label className="block">Team members<input aria-label="Number of team members" inputMode="numeric" type="number" min={1} max={10000} step={1} value={seatText} disabled={busy} onChange={e => setSeats(e.target.value)} className="mt-2 block w-full min-h-11 bg-background border border-surface-highlight rounded-lg px-3 py-2" /><span className="block text-sm text-text-secondary mt-2">People who can update your restaurant screens.</span></label>
      </div>
      {!valid && <p role="status" className="mt-3">Enter whole numbers between 1 and 10,000.</p>}
      {recommendation && <p className="mt-4 text-text-secondary">Lowest monthly price for ongoing playback at this size: <strong className="text-text">{recommendation === 'Franchise' ? 'Contact us for a larger plan' : recommendation}</strong>. Choose the features that fit your restaurant.</p>}
    </fieldset>
    <InlineFeedback message={loading ? 'Loading current plans…' : null} />
    <InlineFeedback tone="error" message={error}>{error && <button type="button" className="ui-button ui-button-secondary mt-3" onClick={retry}>Try again</button>}</InlineFeedback>
    {catalogue && <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {PLAN_NAMES.map(name => {
        const config = catalogue[name], quote = quotePlan(name, config, screens, seats);
        const selected = name === selectedPlan;
        return <article key={name} className={`p-5 sm:p-6 rounded-xl border bg-surface flex flex-col ${selected ? 'border-primary ring-1 ring-primary' : 'border-surface-highlight'}`}>
          <h3 className="text-xl font-semibold">{name}{selected && <span className="block text-sm text-text-secondary mt-1">Selected plan</span>}</h3>
          <p className="text-3xl font-semibold my-4">{name === 'Franchise' ? 'Let’s talk' : currency(quote.total ?? config.price)}{name !== 'Franchise' && <span className="text-base font-normal text-text-secondary"> / month</span>}</p>
          <p className="text-text-secondary">{name === 'Free' ? 'Try a design and a five-minute screen preview.' : name === 'Franchise' ? 'Let’s plan a rollout for your restaurants.' : config.description}</p>
          <ul className="space-y-3 my-5 flex-1 text-text-secondary">
            <li>{config.screens === -1 ? 'Custom screen allowance' : `${config.screens} ${config.screens === 1 ? 'screen' : 'screens'} included`}</li>
            <li>{config.seats === -1 ? 'Custom team access' : `${config.seats} ${config.seats === 1 ? 'team member' : 'team members'} included`}</li>
            <li>{config.deploymentDurationLimit ? 'Five-minute screen preview' : 'Ongoing playback'}</li>
            <li>{entitlements(name).signatureTemplates ? 'All restaurant designs and atmosphere effects' : 'Core restaurant designs with a clean, still background'}</li>
          </ul>
          {quote.extraScreens > 0 && !quote.error && <p className="text-sm mb-2">Includes {quote.extraScreens} extra screens at {currency(config.addOns!.screen!)} each.</p>}
          {quote.extraSeats > 0 && !quote.error && <p className="text-sm mb-2">Includes {quote.extraSeats} extra team members at {currency(config.addOns!.seat!)} each.</p>}
          {quote.error && <p className="text-sm mb-3">{quote.error}</p>}
          {name === 'Franchise' ? <Link className="ui-button ui-button-secondary" to="/#contact">Contact us about a larger plan</Link> : <button type="button" className="ui-button ui-button-primary mt-3" aria-pressed={selected} aria-label={`Choose ${name} plan`} disabled={!valid || !!quote.error || busy} onClick={() => onChoose(name, screens, seats)}>{busy && selected ? 'Opening…' : name === 'Free' ? 'Continue free' : `Choose ${name}`}</button>}
        </article>;
      })}
    </div>}
    <p className="text-sm text-text-secondary text-center">Prices are in US dollars per month. Any applicable taxes and the final total appear before you confirm payment. Free is a limited preview, not a 14-day trial.</p>
  </section>;
};
