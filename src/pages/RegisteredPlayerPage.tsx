import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { signInAnonymously, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { FullscreenGate } from '../components/atoms/FullscreenGate';
import { PlayerScreen } from './PlayerScreen';
import { PlayerRegistrationService } from '../services/playerRegistrationService';

const RECONCILE_MS = 10_000;

const ensurePlayerIdentity = async () => {
  await auth.authStateReady();
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    PlayerRegistrationService.clearCachedAssignment();
    await signOut(auth);
  }
  if (!auth.currentUser) await signInAnonymously(auth);
};

export const RegisteredPlayerPage = () => {
  const { screenId } = useParams();
  const navigate = useNavigate();
  const [identityReady, setIdentityReady] = useState(false);
  const disposed = useRef(false);

  useEffect(() => {
    disposed.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const reconcile = async () => {
      try {
        const result = await PlayerRegistrationService.requestActivation();
        if (disposed.current) return;
        const registration = result.registration;
        if (registration?.active) {
          PlayerRegistrationService.cacheAssignment(registration.screenId, registration.orgId);
          if (registration.screenId !== screenId) {
            // Reassign and Swap are backend-atomic. The browser identity stays the
            // same; only the logical screen route changes.
            navigate(`/display/player/${encodeURIComponent(registration.screenId)}`, { replace: true });
            return;
          }
        } else {
          PlayerRegistrationService.clearCachedAssignment();
          const reason = registration?.status === 'replaced' ? 'replaced' : registration?.status === 'deactivated' ? 'deactivated' : 'unregistered';
          navigate(`/display?reason=${reason}`, { replace: true });
          return;
        }
      } catch {
        // A network outage is not a reason to forget a valid local assignment or
        // blank the screen. Keep playing and reconcile again when connectivity returns.
      }
      if (!disposed.current) timer = setTimeout(reconcile, RECONCILE_MS);
    };

    const boot = async () => {
      try {
        await ensurePlayerIdentity();
        if (disposed.current) return;
        if (screenId) PlayerRegistrationService.cacheAssignment(screenId);
        setIdentityReady(true);
        void reconcile();
      } catch {
        if (!disposed.current) {
          PlayerRegistrationService.clearCachedAssignment();
          navigate('/display?reason=unregistered', { replace: true });
        }
      }
    };

    void boot();
    return () => {
      disposed.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [navigate, screenId]);

  if (!screenId || !identityReady) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center" role="status">Restoring display…</div>;
  }

  return (
    <FullscreenGate>
      <PlayerScreen />
    </FullscreenGate>
  );
};
