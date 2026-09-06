import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { auth, functions } from '../lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { Smartphone, CheckCircle2, AlertCircle, Loader2, Rocket } from 'lucide-react';
import logo from '../assets/logo.png';

export const PairingPage = () => {
  const { screenId } = useParams();
  const [searchParams] = useSearchParams();
  
  const pairingCode = searchParams.get('code');
  
  const [status, setStatus] = useState<'initializing' | 'pairing' | 'paired' | 'error'>('initializing');
  const [error, setError] = useState<string | null>(null);
  const [screenSessionId, setScreenSessionId] = useState<string | null>(null);

  useEffect(() => {
    const startPairing = async () => {
      if (!screenId || !pairingCode) {
        setStatus('error');
        setError('Invalid pairing link. Please scan the QR code on the screen again.');
        return;
      }

      try {
        setStatus('pairing');
        
        // 1. Ensure user is authenticated (Anonymously if needed)
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }

        const user = auth.currentUser;
        if (!user) throw new Error('Authentication failed');

        // 2. Validate Pairing via Callable Function
        const validatePairing = httpsCallable(functions, 'validatePairing');
        const result = await validatePairing({ screenId, pairingCode });
        const data = result.data as { success: boolean; screenSessionId: string };

        setScreenSessionId(data.screenSessionId);
        setStatus('paired');
      } catch (err: unknown) {
        const error = err as { message?: string; code?: string };
        setStatus('error');
        if (error.code === 'functions/failed-precondition') {
          setError('Pairing is not available yet. Please check back soon.');
        } else {
          setError(error.message || 'Failed to connect to screen');
        }
      }
    };

    startPairing();
  }, [screenId, pairingCode]);

  const handleFireTrigger = async (campaignId: string, type: 'qr_scan' | 'location_entry') => {
    if (!screenSessionId) return;

    try {
      const fireTrigger = httpsCallable(functions, 'fireTrigger');
      await fireTrigger({
        triggerType: type,
        screenSessionId,
        campaignId,
        payload: {
          timestamp: Date.now(),
          metadata: {
            message: 'User claimed a mobile offer!'
          }
        }
      });
      
      alert('Trigger sent to screen!');
    } catch {
      alert('Failed to send interaction to screen');
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface border border-surface-highlight rounded-3xl p-8 shadow-2xl text-center">
        <img src={logo} alt="AccelRestaurants" className="h-8 w-auto object-contain mx-auto mb-6" />
        {status === 'initializing' || status === 'pairing' ? (
          <div className="space-y-6">
            <div className="relative inline-block">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary animate-pulse">
                <Smartphone size={40} />
              </div>
              <div className="absolute -bottom-1 -right-1">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            </div>
            <h1 className="text-2xl font-bold">Connecting to Screen</h1>
            <p className="text-text-muted">Establishing a secure link with the digital signage display...</p>
          </div>
        ) : status === 'paired' ? (
          <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center text-success mx-auto">
              <CheckCircle2 size={40} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-text mb-2">Connected!</h1>
              <p className="text-text-muted">Your device is now linked to the screen.</p>
            </div>

            <div className="space-y-4 pt-4 border-t border-surface-highlight">
              <p className="text-sm font-bold text-text-muted uppercase tracking-widest">Available Interactions</p>
              
              <button 
                onClick={() => handleFireTrigger('demo-campaign', 'qr_scan')}
                className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-primary/20"
              >
                <Rocket size={20} />
                Send "Special Offer" to Screen
              </button>
              
              {/* 
              <button 
                disabled
                className="w-full bg-surface-highlight/50 text-text-muted py-4 rounded-2xl font-bold flex items-center justify-center gap-3 cursor-not-allowed border border-surface-highlight"
              >
                Browse Menu (Coming Soon)
              </button>
              */}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in">
            <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center text-error mx-auto">
              <AlertCircle size={40} />
            </div>
            <h1 className="text-2xl font-bold text-error">Pairing Failed</h1>
            <p className="text-text-muted">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-surface-highlight hover:bg-surface-highlight/80 text-text py-3 rounded-xl font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
      
      <p className="mt-8 text-xs text-text-muted text-center opacity-50">
        AccelRestaurants Interactive Signage v2.0<br/>
        Screen ID: {screenId}
      </p>
    </div>
  );
};
