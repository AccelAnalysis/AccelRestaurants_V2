import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Monitor, Plus, Settings, ExternalLink, Trash2, Copy, Check, Lock } from 'lucide-react';
import { ScreenService } from '../../services/screenService';
import { LocationService } from '../../services/locationService';
import type { AppScreen } from '../../types/schema';
import { useAuthStore } from '../../store/useAuthStore';
import { useConfigStore } from '../../store/useConfigStore';
import { getEffectivePlanLimits } from '../../lib/plans';
import { TemplateSelectorModal } from './TemplateSelectorModal';
import { AccessibleDialog } from '../atoms/AccessibleDialog';
import { InlineFeedback } from '../atoms/InlineFeedback';

const isScreenLive = (screen: AppScreen, now: number) => {
  const time = screen.lastHeartbeatAt?.toMillis?.() ?? 0;
  return time > 0 && now - time < 120000;
};

const DeployModal = ({ screen, onClose }: { screen: AppScreen; onClose: () => void }) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerUrl = `${window.location.origin}/player/${screen.id}`;
  const copy = async () => {
    setError(null);
    try { await navigator.clipboard.writeText(playerUrl); setCopied(true); }
    catch { setCopied(false); setError('Copy is unavailable. Select the player URL below and copy it manually.'); }
  };
  return <AccessibleDialog title="Open player link" description={`Use this link on the display for ${screen.name}.`} onClose={onClose}>
    <p className="text-sm text-text-secondary mb-4">Opening this dialog does not publish changes. Save the screen playlist before opening its player.</p>
    <label htmlFor="player-url" className="block text-sm font-medium mb-2">Player URL</label>
    <input id="player-url" type="text" readOnly value={playerUrl} onFocus={e => e.currentTarget.select()} className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text" />
    <InlineFeedback message={error} tone="error" />
    <InlineFeedback message={copied ? 'Player link copied.' : null} tone="success" />
    <div className="flex flex-wrap gap-3 mt-4">
      <button type="button" onClick={copy} className="ui-button ui-button-primary">{copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}Copy link</button>
      <a href={playerUrl} target="_blank" rel="noopener noreferrer" className="ui-button ui-button-secondary">Open player <ExternalLink size={18} aria-hidden="true" /><span className="sr-only"> in a new tab</span></a>
    </div>
  </AccessibleDialog>;
};

export const ScreenListView = () => {
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  const { planConfigs } = useConfigStore();
  const [screens, setScreens] = useState<AppScreen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deployingScreen, setDeployingScreen] = useState<AppScreen | null>(null);
  const [deletingScreen, setDeletingScreen] = useState<AppScreen | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [locationMap, setLocationMap] = useState<Record<string, string>>({});
  const [now, setNow] = useState(Date.now);
  const request = useRef(0);
  const addButton = useRef<HTMLButtonElement>(null);
  const loadScreens = useCallback(async () => {
    const current = ++request.current;
    setError(null);
    if (!organization?.id) { setScreens([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [items, locations] = await Promise.all([ScreenService.getScreens(organization.id), LocationService.getLocations(organization.id)]);
      if (current !== request.current) return;
      setScreens(items);
      setLocationMap(Object.fromEntries(locations.map(loc => [loc.id, loc.name])));
    } catch {
      if (current === request.current) setError('Screens could not be loaded. Your saved screens have not been changed.');
    } finally { if (current === request.current) setLoading(false); }
  }, [organization?.id]);
  useEffect(() => { void loadScreens(); const counter = request; return () => { counter.current++; }; }, [loadScreens]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const deleteScreen = async () => {
    if (!deletingScreen || deleting) return;
    setDeleting(true); setDeleteError(null);
    try {
      await ScreenService.deleteScreen(deletingScreen.id);
      setScreens(items => items.filter(item => item.id !== deletingScreen.id));
      setMessage(`${deletingScreen.name} deleted.`);
      setDeletingScreen(null);
      requestAnimationFrame(() => addButton.current?.focus());
    } catch { setDeleteError('The screen could not be deleted. Try again.'); }
    finally { setDeleting(false); }
  };
  const limits = organization ? getEffectivePlanLimits(organization, planConfigs) : { screens: 1, seats: 1 };
  const limitReached = limits.screens !== -1 && screens.length >= limits.screens;
  return <div className="p-4 sm:p-8" aria-busy={loading}>
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div><h1 className="text-2xl font-semibold text-text">Screens</h1><p className="text-sm text-text-secondary mt-1">{limits.screens === -1 ? `${screens.length} screens` : `${screens.length} of ${limits.screens} screens in use`}</p></div>
      <button ref={addButton} type="button" onClick={() => setShowTemplateModal(true)} disabled={limitReached || !organization || loading} aria-describedby={limitReached ? 'screen-limit' : undefined} className="ui-button ui-button-primary">{limitReached ? <Lock size={20} aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}Add screen</button>
    </div>
    {limitReached && <p id="screen-limit" className="text-sm text-text-secondary mb-4">Your plan’s screen limit has been reached. <Link to="/admin/subscription" className="underline">Review your plan</Link>.</p>}
    <InlineFeedback message={error} tone="error"><button type="button" className="ui-button ui-button-secondary ml-3" onClick={() => void loadScreens()}>Retry</button></InlineFeedback>
    <InlineFeedback message={message} tone="success" />
    {loading && <p role="status">Loading screens…</p>}
    {!organization && !loading && <p role="status">Your organization is not available. Reload the page or sign in again.</p>}
    {!loading && organization && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {screens.map(screen => <article key={screen.id} className="bg-surface border border-surface-highlight rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3"><Monitor size={24} aria-hidden="true" className="text-primary shrink-0" /><h2 className="min-w-0 text-lg font-semibold break-words"><Link className="inline-flex items-center min-h-11 underline-offset-4 hover:underline" to={`/admin/screens/${screen.id}`}>{screen.name}</Link></h2></div>
        <div className="flex flex-wrap gap-3 text-sm text-text-secondary"><span>{screen.isActive ? 'Enabled' : 'Disabled'}</span><span>{isScreenLive(screen, now) ? 'Online' : 'Offline'}</span></div>
        <dl className="text-sm space-y-2"><div className="flex justify-between gap-3"><dt className="text-text-secondary">Location</dt><dd className="text-right break-words">{locationMap[screen.locationId] || 'Unassigned'}</dd></div><div className="flex justify-between gap-3"><dt className="text-text-secondary">Playlist</dt><dd>{screen.livePlaylist?.length || 0} slides</dd></div></dl>
        <div className="flex flex-wrap gap-2 border-t border-surface-highlight pt-4">
          <button type="button" onClick={() => setDeployingScreen(screen)} className="ui-button ui-button-primary">Player link</button>
          <Link to={`/admin/screens/${screen.id}`} aria-label={`Edit ${screen.name}`} className="ui-button ui-button-secondary"><Settings size={18} aria-hidden="true" /></Link>
          <button type="button" aria-label={`Delete ${screen.name}`} className="ui-button ui-button-secondary" onClick={() => { setDeleteError(null); setDeletingScreen(screen); }}><Trash2 size={18} aria-hidden="true" /></button>
        </div>
      </article>)}
      {!error && screens.length === 0 && <div className="col-span-full py-12 text-center"><h2 className="text-lg font-semibold">No screens yet</h2><p className="text-text-secondary mt-2">Add a screen to choose a template and playlist.</p></div>}
    </div>}
    {showTemplateModal && <TemplateSelectorModal type="screen" onClose={() => setShowTemplateModal(false)} onCreateBlank={() => { setShowTemplateModal(false); navigate('/admin/screens/new'); }} onImport={id => { setShowTemplateModal(false); navigate(`/admin/screens/${id}`); }} />}
    {deployingScreen && <DeployModal screen={deployingScreen} onClose={() => setDeployingScreen(null)} />}
    {deletingScreen && <AccessibleDialog title={`Delete ${deletingScreen.name}?`} description="This removes the screen configuration. This action cannot be undone." onClose={() => setDeletingScreen(null)} closeLabel="Cancel" busy={deleting}>
      <InlineFeedback message={deleteError} tone="error" />
      <button type="button" disabled={deleting} onClick={() => void deleteScreen()} className="ui-button ui-button-danger">{deleting ? 'Deleting…' : 'Delete screen'}</button>
    </AccessibleDialog>}
  </div>;
};
