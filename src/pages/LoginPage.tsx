import type { FormEvent } from 'react';
import { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { useConfigStore } from '../store/useConfigStore';
import { InlineFeedback } from '../components/atoms/InlineFeedback';
import logo from '../assets/logo.png';
import { safeWorkspaceDestination } from '../lib/customerJourney';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { generalConfig } = useConfigStore();
  const [reset, setReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (reset) {
        await sendPasswordResetEmail(auth, email.trim());
        setMessage('Password reset email sent. Please check your inbox.');
        return;
      }
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const requested = params.get('redirect');
      const safe = safeWorkspaceDestination(requested) || '/onboarding';
      navigate(safe, { replace: true });
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(
        code === 'auth/network-request-failed'
          ? 'Connection lost. Check your connection and try again.'
          : code === 'auth/too-many-requests'
            ? 'Too many attempts. Please try again later.'
            : reset
              ? 'We could not complete the password reset request. Check your email and connection, then try again.'
              : 'We could not complete that request. Check your email and password, then try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const requestedDestination = safeWorkspaceDestination(params.get('redirect'));
  const onboardingDestination = requestedDestination
    ? `/onboarding?redirect=${encodeURIComponent(requestedDestination)}`
    : '/onboarding';

  return (
    <main className="min-h-screen bg-transparent bg-speed-pattern text-text flex items-center justify-center p-4">
      <section className="w-full max-w-md glass-panel border-surface-highlight p-5 sm:p-8">
        <Link to="/restaurants" className="flex flex-col items-center justify-center min-h-11 mb-6">
          <img src={logo} alt="" className="h-12 w-auto object-contain mb-3" />
          <span className="text-3xl font-bold text-primary">AccelRestaurants</span>
        </Link>
        <h1 className="text-2xl font-semibold text-center mb-6">{reset ? 'Reset password' : 'Sign in'}</h1>
        <InlineFeedback id="login-error" tone="error" message={error} />
        <InlineFeedback tone="success" message={message} />
        <form onSubmit={submit} aria-busy={busy} className="space-y-5">
          <label className="block" htmlFor="login-email">
            Email
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              aria-describedby={error ? 'login-error' : undefined}
              onChange={e => setEmail(e.target.value)}
              className="block w-full min-h-11 mt-2 bg-background border border-surface-highlight rounded-lg p-3"
            />
          </label>
          {!reset && (
            <label className="block" htmlFor="login-password">
              Password
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="block w-full min-h-11 mt-2 bg-background border border-surface-highlight rounded-lg p-3"
              />
            </label>
          )}
          <button type="submit" className="ui-button ui-button-primary w-full" disabled={busy}>
            {busy ? 'Processing…' : reset ? 'Send reset link' : 'Sign in'}
          </button>
        </form>
        <button
          type="button"
          className="ui-button ui-button-secondary w-full mt-4"
          onClick={() => {
            setReset(value => !value);
            setError(null);
            setMessage(null);
          }}
        >
          {reset ? 'Back to sign in' : 'Forgot password?'}
        </button>
        {!reset && generalConfig.featureFlags?.publicSignupEnabled !== false && (
          <button
            type="button"
            className="ui-button ui-button-secondary w-full mt-3"
            onClick={() => navigate(onboardingDestination, { state: { email } })}
          >
            Create an account
          </button>
        )}
      </section>
    </main>
  );
};
