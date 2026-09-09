import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useRestaurantSummary, type SummaryResult } from '../../hooks/useRestaurantSummary';
import { InlineFeedback } from '../atoms/InlineFeedback';

function Guide({ screenId, summary }: { screenId?: string; summary: SummaryResult }) {
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const state = summary.data;
  const screens = state?.screens?.filter(screen => !screenId || screen.id === screenId);
  const assigned = screens?.find(screen => state?.registrations?.includes(screen.id));
  const hasAssignedDesign = !!assigned?.livePlaylist?.some(entry => state?.slides?.some(slide => slide.id === (typeof entry === 'string' ? entry : entry.slideId)));
  const ready = !!assigned && hasAssignedDesign;
  const error = state?.failed.some(key => ['screens', 'slides', 'registrations'].includes(key));
  const collapsed = !expanded && (hidden || ready);
  if (collapsed) return <div className="flex flex-wrap items-center gap-3 mb-5">
    <button type="button" className="ui-button ui-button-secondary" onClick={() => { setExpanded(true); setHidden(false); }}>Screen setup</button>
    {ready && <span className="text-sm text-text-secondary">Display activated · design assigned</span>}
  </div>;
  const screen = assigned || screens?.[0];
  const hasDesign = (state?.slides?.length || 0) > 0;
  return <section aria-label="Screen setup help" className="rounded-xl border border-surface-highlight bg-surface p-5 sm:p-6 mb-8">
    {screenId && <p className="text-sm text-text-secondary mb-3">Step 4 of 4 · Connect your screen</p>}
    <div className="flex flex-wrap justify-between gap-4"><h2 className="text-2xl font-semibold">{screenId ? 'Connect your restaurant screen' : 'Get your first screen ready'}</h2><button type="button" className="ui-button ui-button-secondary" onClick={() => { setExpanded(false); setHidden(true); }}>Hide setup tips</button></div>
    <InlineFeedback tone="error" message={error ? 'Some screen setup details could not be checked. Your saved content has not changed.' : null} />
    {!state && <p role="status" className="mt-4">Checking your setup…</p>}
    {state && <ol className="grid md:grid-cols-3 gap-6 mt-6">
      <li><h3 className="font-semibold">1. Make your menu board</h3><p className="text-text-secondary my-3">{hasDesign ? 'Your design is saved. Check the items and prices before showing it to guests.' : 'Choose a design and add your menu.'}</p><Link className="ui-button ui-button-secondary" to={hasDesign ? '/admin/slides' : '/onboarding?design=1'}>{hasDesign ? 'Review designs' : 'Choose a design'}</Link></li>
      <li><h3 className="font-semibold">2. Activate your display</h3><p className="text-text-secondary my-3">Open displays.accelanalysis.com in your TV browser. Enter its code in Screens and choose the content it should show.</p><Link className="ui-button ui-button-secondary" to="/admin/screens">Open Screens</Link>{screen && <Link className="ui-button ui-button-secondary mt-2" to={`/admin/screens/${screen.id}`}>Edit screen content</Link>}<p className="text-sm text-text-secondary mt-3">{assigned ? 'Your display is activated. Check the TV to confirm your menu is visible.' : 'A browser preview is not an activated restaurant display.'}</p></li>
      <li><h3 className="font-semibold">3. Hear from your guests</h3><p className="text-text-secondary my-3">Add a QR offer or feedback form when you are ready.</p><Link className="ui-button ui-button-secondary" to="/admin/analytics/setup">Create a QR campaign</Link></li>
    </ol>}
    <button type="button" className="ui-button ui-button-secondary mt-5" disabled={!!state?.pending.length} onClick={summary.retry}>Check setup again</button>
  </section>;
}
export const FirstScreenGuide = ({ screenId, summary }: { screenId?: string; summary?: SummaryResult }) => {
  const { user, organization } = useAuthStore();
  const ownSummary = useRestaurantSummary(!summary, true);
  if (!organization || !user) return null;
  // A new account/screen gets fresh disclosure state; another restaurant's success never hides setup.
  return <Guide key={`${user.uid}:${organization.id}:${screenId || 'overview'}`} screenId={screenId} summary={summary || ownSummary} />;
};
