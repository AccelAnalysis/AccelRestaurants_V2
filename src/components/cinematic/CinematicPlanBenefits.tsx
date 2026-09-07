import { entitlements, PLAN_NAMES, ATMOSPHERE_PRESETS } from '../../../functions/src/cinematic/catalog';
import { RESTAURANT_TEMPLATES } from '../../../functions/src/cinematic/templates';
/** Display only. Authorization always uses the server-owned organization plan. */
export const CinematicPlanBenefits = ({ plan }: { plan: unknown }) => {
  const name = PLAN_NAMES.find(value => value.toLowerCase() === (typeof plan === 'string' ? plan.toLowerCase() : ''));
  const access = entitlements(name);
  const templates = RESTAURANT_TEMPLATES.filter(value => !value.signature || access.signatureTemplates).length;
  return <div className="my-4 border-t border-surface-highlight pt-4 text-sm text-text-secondary space-y-2">
    <p className="font-semibold text-text">Restaurant design package</p>
    <p>{templates} restaurant designs · landscape and portrait</p>
    <p>{access.atmosphere ? `${ATMOSPHERE_PRESETS.length - 1} motion presets with device quality controls` : 'Static, readable presentation'}</p>
    <p>Guided setup and editable menu content</p>
  </div>;
};
