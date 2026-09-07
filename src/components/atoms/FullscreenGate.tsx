import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Maximize2 } from 'lucide-react';

type FullscreenState = 'attempting' | 'prompt' | 'playing';

const fullscreenElement = () => document.fullscreenElement;

export const FullscreenGate = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<FullscreenState>('attempting');
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useRef(true);
  const trying = useRef(false);

  const tryFullscreen = useCallback(async (fromUserGesture = false) => {
    if (trying.current) return;
    if (fullscreenElement()) {
      if (mounted.current) { setState('playing'); setNotice(null); }
      return;
    }

    const root = document.documentElement;
    if (!root.requestFullscreen) {
      if (mounted.current) {
        setState('playing');
        setNotice('This browser does not expose web fullscreen. Use the TV browser’s fullscreen controls if needed.');
      }
      return;
    }

    trying.current = true;
    try {
      await root.requestFullscreen({ navigationUI: 'hide' });
      if (mounted.current) { setState('playing'); setNotice(null); }
    } catch {
      if (!mounted.current) return;
      if (fromUserGesture) {
        // Never block signage forever on a browser that advertises Fullscreen API
        // support but still refuses the request. Playback continues with a clear,
        // non-interrupting instruction.
        setState('playing');
        setNotice('Fullscreen was blocked by this TV browser. Use its fullscreen control if available.');
      } else {
        setState('prompt');
      }
    } finally {
      trying.current = false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void tryFullscreen(false);

    const handleFullscreenChange = () => {
      if (!mounted.current) return;
      if (fullscreenElement()) {
        setState('playing');
        setNotice(null);
      } else if (document.visibilityState === 'visible') {
        // Browsers normally leave fullscreen when a TV/browser session is closed.
        // Returning to the player should therefore require the same one-press
        // fallback as first activation when automatic fullscreen is unavailable.
        setState('attempting');
        void tryFullscreen(false);
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !fullscreenElement()) {
        setState('attempting');
        void tryFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      mounted.current = false;
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [tryFullscreen]);

  if (state !== 'playing') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-lg text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
            <Maximize2 size={40} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{state === 'attempting' ? 'Opening display…' : 'Press OK to enter full screen'}</h1>
            {state === 'prompt' && <p className="text-white/65 mt-3">Use the TV remote to select OK. Your assigned screen is already loaded.</p>}
          </div>
          {state === 'prompt' && (
            <button
              type="button"
              autoFocus
              onClick={() => void tryFullscreen(true)}
              className="mx-auto min-w-64 rounded-xl bg-primary px-8 py-4 text-xl font-semibold text-white focus:outline-none focus:ring-4 focus:ring-white/70"
            >
              OK — Full Screen
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {notice && (
        <div role="status" className="fixed bottom-4 left-1/2 z-[500] -translate-x-1/2 rounded-lg bg-black/85 px-4 py-2 text-sm text-white pointer-events-none">
          {notice}
        </div>
      )}
    </>
  );
};
