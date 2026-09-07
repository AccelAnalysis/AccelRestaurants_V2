import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInAnonymously, signOut } from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react';
import { Monitor, RefreshCw } from 'lucide-react';
import { auth } from '../lib/firebase';
import { PlayerRegistrationService } from '../services/playerRegistrationService';

const POLL_MS = 2500;

const ensurePlayerIdentity = async () => {
  await auth.authStateReady();
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    // The display surface is intentionally a device context, not an operator
    // session. On the dedicated displays subdomain this normally never fires,
    // but it keeps /display safe during local/preview testing too.
    PlayerRegistrationService.clearCachedAssignment();
    await signOut(auth);
  }
  if (!auth.currentUser) await signInAnonymously(auth);
};

export const DisplayHomePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const disposed = useRef(false);

  const reason = searchParams.get('reason');
  const operatorOrigin = (import.meta.env.VITE_OPERATOR_ORIGIN as string | undefined)?.replace(/\/$/, '') || window.location.origin;
  const activationUrl = useMemo(() => code ? `${operatorOrigin}/admin/screens?activation=${encodeURIComponent(code)}` : '', [code, operatorOrigin]);

  useEffect(() => {
    disposed.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const resolve = async () => {
      try {
        setError(null);
        const result = await PlayerRegistrationService.requestActivation();
        if (disposed.current) return;
        if (result.registration?.active) {
          PlayerRegistrationService.cacheAssignment(result.registration.screenId, result.registration.orgId);
          navigate(`/display/player/${encodeURIComponent(result.registration.screenId)}`, { replace: true });
          return;
        }
        setCode(result.code);
        setExpiresAt(result.expiresAt);
        setReady(true);
      } catch {
        if (!disposed.current) {
          setError('Display activation is temporarily unavailable. The screen will keep retrying.');
          setReady(true);
        }
      }
      if (!disposed.current) timer = setTimeout(resolve, POLL_MS);
    };

    const boot = async () => {
      try {
        await ensurePlayerIdentity();
        if (disposed.current) return;
        const cached = PlayerRegistrationService.getCachedAssignment();
        if (cached?.screenId) {
          // Normal morning path: go straight back to the previous logical screen.
          // RegisteredPlayerPage reconciles this cached assignment with the server
          // without delaying startup when the browser storage survived overnight.
          navigate(`/display/player/${encodeURIComponent(cached.screenId)}`, { replace: true });
          return;
        }
        await resolve();
      } catch {
        if (!disposed.current) {
          setError('This TV browser could not initialize its display identity. Reload the page to try again.');
          setReady(true);
        }
      }
    };

    void boot();
    return () => {
      disposed.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [navigate]);

  const expiresInMinutes = expiresAt ? Math.max(1, Math.ceil((expiresAt - Date.now()) / 60_000)) : null;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <main className="w-full max-w-2xl text-center">
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
          <Monitor size={42} aria-hidden="true" />
        </div>

        {!ready ? (
          <div role="status" className="space-y-3">
            <h1 className="text-3xl font-bold">Opening AccelRestaurants display…</h1>
            <p className="text-white/60">Checking this TV browser’s saved screen.</p>
          </div>
        ) : code ? (
          <div className="space-y-7">
            <div>
              <h1 className="text-4xl font-bold">Activate this display</h1>
              <p className="text-white/65 mt-3">In AccelRestaurants, open <strong className="text-white">Screens → Activate display</strong>, then enter this code and choose the screen this TV should show.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <div className="rounded-2xl bg-white p-4">
                <QRCodeSVG value={activationUrl} size={190} level="M" bgColor="#ffffff" fgColor="#000000" title="Open AccelRestaurants display activation" />
              </div>
              <div className="text-left sm:text-center">
                <div className="text-sm uppercase tracking-[0.2em] text-white/45 font-semibold">Activation code</div>
                <div className="mt-2 font-mono text-6xl sm:text-7xl font-bold tracking-[0.12em] text-primary">{code}</div>
                {expiresInMinutes && <div className="mt-3 text-sm text-white/45">Refreshes automatically after about {expiresInMinutes} min.</div>}
              </div>
            </div>

            <p className="text-white/55">After activation, this browser remembers its assigned screen across normal browser closes and TV power-offs. You will not scan this code every morning.</p>
            {reason === 'replaced' && <p role="status" className="rounded-xl bg-amber-500/15 px-4 py-3 text-amber-200">This TV was replaced or moved from its previous screen. Activate it again only if you want to assign it somewhere else.</p>}
            {reason === 'deactivated' && <p role="status" className="rounded-xl bg-white/10 px-4 py-3 text-white/75">This display was deactivated from AccelRestaurants. Activate it again to assign a screen.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <RefreshCw className="mx-auto animate-spin" size={36} aria-hidden="true" />
            <h1 className="text-3xl font-bold">Preparing activation…</h1>
          </div>
        )}

        {error && <p role="status" className="mt-6 rounded-xl bg-red-500/15 px-4 py-3 text-red-200">{error}</p>}
      </main>
    </div>
  );
};
