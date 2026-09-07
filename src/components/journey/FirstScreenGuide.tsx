import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { ScreenService } from '../../services/screenService';
import { SlideService } from '../../services/slideService';
import { connectionState } from '../../lib/customerJourney';
import { InlineFeedback } from '../atoms/InlineFeedback';
import type { AppScreen } from '../../types/schema';
export const FirstScreenGuide = ({ screenId }: { screenId?: string }) => {
  const { user, organization } = useAuthStore();
  const [state, setState] = useState<{ screens: AppScreen[]; hasDesign: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null), [attempt, setAttempt] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(Date.now());
  const key = `accel:setup-tips:v1:${user?.uid}:${organization?.id}`;
  useEffect(() => { setState(null); setError(null); try { setDismissed(localStorage.getItem(key) === 'hidden'); } catch { setDismissed(false); } }, [key]);
  useEffect(() => {
    if (!organization?.id || !user || (dismissed && !screenId)) return;
    let disposed = false, inFlight = false;
    const load = async () => {
      if (document.hidden || inFlight) return;
      inFlight = true;
      try {
        const [screens, slides] = await Promise.all([screenId ? ScreenService.getScreen(screenId).then(screen => screen && screen.orgId === organization.id ? [screen] : []) : ScreenService.getScreens(organization.id), SlideService.getSlides(organization.id)]);
        if (!disposed) { setState({ screens, hasDesign: slides.length > 0 }); setError(null); setNow(Date.now()); }
      } catch { if (!disposed) setError('We could not check your screen setup. Your saved content has not changed.'); }
      finally { inFlight = false; }
    };
    void load();
    const timer = window.setInterval(() => { setNow(Date.now()); void load(); }, 15000);
    document.addEventListener('visibilitychange', load);
    return () => { disposed = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', load); };
  }, [organization?.id, user, screenId, dismissed, attempt]);
  if (!organization || !user) return null;
  if (dismissed && !screenId) return <button type="button" className="ui-button ui-button-secondary mb-5" onClick={() => setDismissed(false)}>Show screen setup tips</button>;
  const screen = state?.screens[0];
  const connection = error ? 'unknown' : connectionState(screen?.lastHeartbeatAt, now);
  const screenLink = screen ? `/admin/screens/${screen.id}?setup=1` : '/admin/screens/new';
  return <section aria-label="Screen setup help" className="rounded-xl border border-surface-highlight bg-surface p-5 sm:p-6 mb-8">
    <div className="flex flex-wrap justify-between gap-4"><h2 className="text-2xl font-semibold">{screenId ? 'Connect your restaurant screen' : 'Get your first screen ready'}</h2>{!screenId && <button type="button" className="ui-button ui-button-secondary" onClick={() => { setDismissed(true); try { localStorage.setItem(key, 'hidden'); } catch { /* Optional preference. */ } }} >Hide setup tips</button>}</div>
    <InlineFeedback tone="error" message={error}>{error && <button type="button" className="ui-button ui-button-secondary mt-2" onClick={() => setAttempt(n => n + 1)}>Check again</button>}</InlineFeedback>
    {!state && !error && <p role="status" className="mt-4">Checking your setup…</p>}
    {state && <ol className="grid md:grid-cols-3 gap-6 mt-6">
      <li><h3 className="font-semibold">1. Make your menu board</h3><p className="text-text-secondary my-3">{state.hasDesign ? 'Your design is saved. Check the items and prices before showing it to guests.' : 'Start with an editable restaurant design and add your menu.'}</p><Link className="ui-button ui-button-secondary" to={state.hasDesign ? '/admin/slides' : '/onboarding?design=1'}>{state.hasDesign ? 'Review designs' : 'Choose a design'}</Link></li>
      <li><h3 className="font-semibold">2. Connect your screen</h3><p className="text-text-secondary my-3">{screen ? `Open the player for ${screen.name} on the device connected to your display, then follow its connection instructions.` : 'Add a screen, choose its content, then follow the connection instructions.'}</p><Link className="ui-button ui-button-secondary" to={screenLink}>{screen ? 'Open screen setup' : 'Add a screen'}</Link>{screen && <a className="ui-button ui-button-secondary mt-2" href={`/player/${screen.id}`} target="_blank" rel="noreferrer">Open player in a new tab</a>}<p role="status" className="mt-3">{connection === 'connected' ? 'Screen connected. Check that your menu is visible on the display.' : connection === 'disconnected' ? 'No recent connection. Check that the player is open and connected to the internet.' : 'Waiting for a screen connection.'}</p><p className="text-sm text-text-secondary mt-2">A connection confirms that the player is responding. It does not confirm that the TV is on or the menu is visible.</p></li>
      <li><h3 className="font-semibold">3. Hear from your guests</h3><p className="text-text-secondary my-3">Add a QR offer or feedback form when you are ready. You can do this after your menu is showing.</p><Link className="ui-button ui-button-secondary" to="/admin/analytics/setup">Create a QR campaign</Link><Link className="ui-button ui-button-secondary mt-2" to="/admin/analytics">View guest responses</Link></li>
    </ol>}
  </section>;
};
