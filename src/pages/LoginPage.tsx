import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isResetPassword) {
        await sendPasswordResetEmail(auth, email);
        setSuccessMessage('Password reset email sent. Please check your inbox.');
        setLoading(false); // Stop loading but keep message visible
        return;
      }

      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/onboarding');
    } catch (err) {
      setError((err as Error).message || 'Authentication failed');
    } finally {
      if (!isResetPassword) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-text flex flex-col items-center justify-center p-4 bg-speed-pattern">
      <div className="w-full max-w-md glass-panel p-8 border-surface-highlight">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="AccelRestaurants" className="h-12 w-auto object-contain mb-4" />
          <h1 className="text-3xl font-bold text-primary">AccelRestaurants</h1>
        </div>
        <h2 className="text-xl font-semibold mb-6 text-center">
          {isResetPassword ? 'Reset Password' : (isSignUp ? 'Create Account' : 'Sign In')}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-500/10 border border-green-500 text-green-500 p-3 rounded mb-4 text-sm">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface/50 border border-surface-highlight rounded px-3 py-2 text-text focus:outline-none focus:border-primary"
              required
            />
          </div>
          
          {!isResetPassword && (
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface/50 border border-surface-highlight rounded px-3 py-2 text-text focus:outline-none focus:border-primary"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isResetPassword ? 'Send Reset Link' : (isSignUp ? 'Sign Up' : 'Sign In'))}
          </button>
        </form>

        <div className="mt-4 text-center space-y-2">
          {!isResetPassword && (
             <button
              onClick={() => {
                setIsResetPassword(true);
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-sm text-text-muted hover:text-text transition-colors block w-full"
            >
              Forgot Password?
            </button>
          )}

          {isResetPassword ? (
            <button
              onClick={() => {
                setIsResetPassword(false);
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-sm text-primary hover:underline"
            >
              Back to Sign In
            </button>
          ) : (
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
