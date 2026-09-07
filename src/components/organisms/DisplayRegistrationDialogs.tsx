import { useMemo, useState } from 'react';
import { Monitor, RefreshCw } from 'lucide-react';
import { AccessibleDialog } from '../atoms/AccessibleDialog';
import { InlineFeedback } from '../atoms/InlineFeedback';
import type { AppScreen } from '../../types/schema';
import { PlayerRegistrationService, type PlayerRegistrationSummary } from '../../services/playerRegistrationService';

const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message.replace(/^FirebaseError:\s*/, '') || fallback;
  return fallback;
};

export const ActivateDisplayDialog = ({
  orgId,
  screens,
  registrations,
  initialCode = '',
  initialScreenId = '',
  onClose,
  onActivated,
}: {
  orgId: string;
  screens: AppScreen[];
  registrations: PlayerRegistrationSummary[];
  initialCode?: string;
  initialScreenId?: string;
  onClose: () => void;
  onActivated: (screenId: string) => void;
}) => {
  const [code, setCode] = useState(initialCode.replace(/\D/g, '').slice(0, 6));
  const [screenId, setScreenId] = useState(initialScreenId || screens[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const occupied = registrations.some(item => item.screenId === screenId);

  const activate = async () => {
    if (busy) return;
    if (!/^\d{6}$/.test(code) || !screenId) {
      setError('Enter the six-digit code shown on the TV and choose a screen.');
      return;
    }
    setBusy(true); setError(null);
    try {
      await PlayerRegistrationService.claim(orgId, code, screenId);
      onActivated(screenId);
    } catch (err) {
      setError(errorMessage(err, 'This display could not be activated. Check the code and try again.'));
    } finally { setBusy(false); }
  };

  return (
    <AccessibleDialog title="Activate display" description="Connect the browser code shown on a TV to one logical AccelRestaurants screen." onClose={onClose} busy={busy}>
      <div className="space-y-5">
        <div>
          <label htmlFor="display-activation-code" className="block text-sm font-medium mb-2">Activation code</label>
          <input
            id="display-activation-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="483291"
            className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-3 text-2xl font-mono tracking-[0.22em] text-text"
          />
        </div>
        <div>
          <label htmlFor="display-screen" className="block text-sm font-medium mb-2">Screen this TV should show</label>
          <select id="display-screen" value={screenId} onChange={event => setScreenId(event.target.value)} className="w-full bg-background border border-surface-highlight rounded-lg px-3 py-3 text-text">
            {screens.map(screen => <option key={screen.id} value={screen.id}>{screen.name}</option>)}
          </select>
        </div>
        {occupied && <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300">This screen already has an activated display. Activating the new TV here will replace that browser assignment; the old TV will return to the activation screen.</p>}
        <InlineFeedback message={error} tone="error" />
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy || screens.length === 0} onClick={() => void activate()} className="ui-button ui-button-primary">
            <Monitor size={18} aria-hidden="true" />{busy ? 'Activating…' : 'Activate display'}
          </button>
          <button type="button" disabled={busy} onClick={onClose} className="ui-button ui-button-secondary">Cancel</button>
        </div>
      </div>
    </AccessibleDialog>
  );
};

export const ManageDisplayDialog = ({
  orgId,
  source,
  screens,
  registrations,
  onClose,
  onChanged,
}: {
  orgId: string;
  source: AppScreen;
  screens: AppScreen[];
  registrations: PlayerRegistrationSummary[];
  onClose: () => void;
  onChanged: (message: string) => void;
}) => {
  const availableTargets = useMemo(() => screens.filter(screen => screen.id !== source.id), [screens, source.id]);
  const [targetId, setTargetId] = useState(availableTargets[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const target = screens.find(screen => screen.id === targetId);
  const targetOccupied = registrations.some(item => item.screenId === targetId);

  const moveOrSwap = async () => {
    if (busy || !targetId || !target) return;
    setBusy(true); setError(null);
    try {
      if (targetOccupied) {
        await PlayerRegistrationService.swap(orgId, source.id, targetId);
        onChanged(`Displays for ${source.name} and ${target.name} swapped.`);
      } else {
        await PlayerRegistrationService.reassign(orgId, source.id, targetId);
        onChanged(`Display moved from ${source.name} to ${target.name}.`);
      }
    } catch (err) {
      setError(errorMessage(err, 'The display assignment could not be changed. Refresh and try again.'));
    } finally { setBusy(false); }
  };

  const deactivate = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await PlayerRegistrationService.deactivate(orgId, source.id);
      onChanged(`${source.name} display deactivated.`);
    } catch (err) {
      setError(errorMessage(err, 'The display could not be deactivated. Refresh and try again.'));
    } finally { setBusy(false); }
  };

  return (
    <AccessibleDialog title={`Manage display — ${source.name}`} description="Move this browser to another logical screen, swap two activated displays, or deactivate it." onClose={onClose} busy={busy}>
      <div className="space-y-5">
        {availableTargets.length > 0 ? (
          <>
            <div>
              <label htmlFor="display-target" className="block text-sm font-medium mb-2">Destination screen</label>
              <select id="display-target" value={targetId} onChange={event => setTargetId(event.target.value)} className="w-full bg-background border border-surface-highlight rounded-lg px-3 py-3 text-text">
                {availableTargets.map(screen => {
                  const active = registrations.some(item => item.screenId === screen.id);
                  return <option key={screen.id} value={screen.id}>{screen.name}{active ? ' — display active' : ' — no display'}</option>;
                })}
              </select>
            </div>
            <p className="text-sm text-text-secondary">
              {targetOccupied
                ? 'The destination already has an activated TV, so this will swap the two browser assignments atomically. Neither TV needs a new activation code.'
                : 'The destination has no activated TV, so this browser will move there. The browser identity remains registered.'}
            </p>
            <button type="button" disabled={busy || !targetId} onClick={() => void moveOrSwap()} className="ui-button ui-button-primary">
              <RefreshCw size={18} aria-hidden="true" />{busy ? 'Updating…' : targetOccupied ? 'Swap displays' : 'Move display'}
            </button>
          </>
        ) : <p className="text-sm text-text-secondary">Add another logical screen before moving or swapping this display.</p>}

        <InlineFeedback message={error} tone="error" />
        <div className="border-t border-surface-highlight pt-4">
          <p className="text-sm text-text-secondary mb-3">Deactivate only when this TV is being retired or intentionally returned to the activation screen.</p>
          <button type="button" disabled={busy} onClick={() => void deactivate()} className="ui-button ui-button-danger">Deactivate display</button>
        </div>
      </div>
    </AccessibleDialog>
  );
};
