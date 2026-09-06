import { InlineFeedback } from '../components/atoms/InlineFeedback';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { CheckCircle, AlertTriangle, ArrowRight, Loader } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, functions, db } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, setDoc } from 'firebase/firestore';
import logo from '../assets/logo.png';

export const JoinPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');
  const emailHint = queryParams.get('email');
  const inviteId = queryParams.get('id');
  const inviteType = queryParams.get('type'); // 'org' or 'designer'
  const orgId = queryParams.get('orgId'); // Organization ID for direct document access

  const [inviteState, setInviteState] = useState<'loading' | 'valid' | 'invalid' | 'expired' | 'error'>('loading');
  const [inviteDetails, setInviteDetails] = useState<{
    orgId?: string;
    orgName: string;
    email: string;
    inviterName?: string;
    type?: string;
    orgAddress?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  } | null>(null);
  
  // Form states
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signup');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: emailHint || '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [retry, setRetry] = useState(0);
  useEffect(() => { setIsSubmitting(false); }, [user]);

  // Validate invite
  useEffect(() => {
    const validateInvite = async () => {
      setInviteState('loading');
      if (!token || !inviteId) {
        setInviteState('invalid');
        return;
      }

      try {
        const getInviteDetails = httpsCallable(functions, 'getInviteDetails');
        type InviteDetailsResponse = {
          orgId?: string;
          orgName: string;
          email: string;
          inviterId?: string;
          inviterName?: string;
          type?: 'org' | 'designer';
          orgAddress?: {
            street?: string;
            city?: string;
            state?: string;
            zipCode?: string;
            country?: string;
          };
        };
        const result = await getInviteDetails({ token, inviteId, type: inviteType, orgId: orgId || undefined }) as { data: InviteDetailsResponse | null };
        
        if (result.data) {
            setInviteDetails({
                orgId: result.data.orgId,
                orgName: result.data.orgName,
                email: result.data.email,
                inviterName: result.data.inviterName || result.data.inviterId || 'A team member',
                type: result.data.type,
                orgAddress: result.data.orgAddress
            });
            setInviteState('valid');
        } else {
            setInviteState('invalid');
        }
      } catch {
        setInviteState('error');
      }
    };

    validateInvite();
  }, [token, inviteId, inviteType, orgId, retry]);

  const handleAccept = async () => {
    if (!token || !inviteId || isSubmitting) return;
    const resolvedOrgId = inviteDetails?.orgId || orgId || undefined;
    if (inviteDetails?.type !== 'designer' && !resolvedOrgId) {
      setError('Organization not found for this invitation. Please use the latest invite link.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      if (inviteDetails?.type === 'designer') {
        const acceptDesignerInvite = httpsCallable(functions, 'acceptDesignerInvite');
        await acceptDesignerInvite({ token, inviteId });
        navigate('/designer');
      } else {
        const acceptInvite = httpsCallable(functions, 'acceptInvite');
        await acceptInvite({ token, inviteId, orgId: resolvedOrgId });
        // Wait a moment for Firestore to propagate the orgId update
        await new Promise(resolve => setTimeout(resolve, 1000));
        navigate('/admin');
      }
    } catch (err) {
      console.error('Error accepting invite:', err);
      const message = err instanceof Error ? err.message : 'Failed to accept invite. Please try again.';
      setError(message);
      setIsSubmitting(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
        if (activeTab === 'signup') {
            if (!agreedToTerms) {
                throw new Error("You must agree to the Terms of Service and Privacy Policy.");
            }
            if (formData.password !== formData.confirmPassword) {
                throw new Error("Passwords don't match");
            }
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            
            // Save address and display name
            // Note: acceptInvite will update role and orgId later
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                displayName: formData.fullName,
                email: formData.email,
                createdAt: new Date(),
                // Platform role etc will be handled by acceptInvite or default triggers
            }, { merge: true });

            // On success, the user state will update, triggering the "Signed In" view
        } else {
            await signInWithEmailAndPassword(auth, formData.email, formData.password);
        }
    } catch (err: unknown) {
        let message = 'Authentication failed';
        if (err instanceof Error) {
            // Handle email-already-in-use error - suggest signing in instead
            if (err.message.includes('email-already-in-use')) {
                message = 'This email is already registered. Please sign in instead.';
                setActiveTab('signin');
            } else {
                message = err.message;
            }
        }
        setError(message);
        setIsSubmitting(false);
    }
  };

  if (inviteState === 'error') return <main className="max-w-md mx-auto p-6"><h1 className="text-2xl font-bold">Check your invitation</h1><InlineFeedback tone="error" message="We could not check this invitation. It may still be valid. Try again."><button className="ui-button ui-button-secondary" onClick={() => setRetry(v => v + 1)}>Retry</button></InlineFeedback></main>;

  if (inviteState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p role="status" className="text-text-muted">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (inviteState === 'invalid' || inviteState === 'expired') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface border border-surface-highlight rounded-lg p-8 text-center space-y-6">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="text-red-500" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text mb-2">Invalid Invitation</h1>
            <p className="text-text-muted">This invite link is invalid, expired, or has already been used.</p>
          </div>
          <Link to="/login" className="block w-full py-2 bg-surface-highlight hover:bg-surface-highlight/80 text-text rounded font-medium transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  // State B & C: User is signed in
  if (user && inviteDetails) {
    const isMatchingEmail = user.email?.toLowerCase() === inviteDetails.email.toLowerCase();

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface border border-surface-highlight rounded-lg overflow-hidden shadow-xl animate-in fade-in zoom-in duration-300">
          <div className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-text">Join {inviteDetails.orgName}</h1>
              <p className="text-text-muted">You've been invited by <span className="text-text font-medium">{inviteDetails.inviterName}</span></p>
            </div>

            {!isMatchingEmail ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-200">Wrong Account</p>
                    <p className="text-xs text-red-200">
                      This invite was sent to <span className="font-bold">{inviteDetails.email}</span>, but you are signed in as <span className="font-bold">{user.email}</span>.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => void auth.signOut().catch(() => setError('Could not sign out. Please try again.'))} className="flex-1 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs rounded font-medium transition-colors">
                        Sign Out
                    </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {error && (
                  <div role="alert" className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                      <p className="text-sm text-red-200">{error}</p>
                    </div>
                  </div>
                )}
                <div className="bg-surface-highlight/30 rounded-lg p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-surface-highlight rounded-full flex items-center justify-center border border-surface-highlight">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <div className="text-lg font-bold text-text-muted">{(user.displayName || user.email || '?')[0].toUpperCase()}</div>
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-text">Signed in as</p>
                        <p className="text-xs text-text-muted">{user.email}</p>
                    </div>
                    <CheckCircle className="ml-auto text-emerald-500" size={20} />
                </div>

                <button 
                    onClick={handleAccept}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <Loader className="animate-spin" size={18} />
                            Joining...
                        </>
                    ) : (
                        <>
                            Accept & Join Team
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>
              </div>
            )}
          </div>
          
          <div className="bg-surface-highlight/20 p-4 border-t border-surface-highlight text-center">
            <p className="text-xs text-text-muted">
                Need help? Contact your admin or support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State A: User is NOT signed in
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-surface-highlight rounded-lg overflow-hidden shadow-xl animate-in fade-in zoom-in duration-300">
        <div className="p-8 pb-6 text-center space-y-2">
            <img src={logo} alt="AccelRestaurants" className="h-10 w-auto object-contain mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-text">Join {inviteDetails?.orgName}</h1>
            <p className="text-sm text-text-muted">Create an account to accept your invitation.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-highlight px-8">
            <button aria-pressed={activeTab === 'signup'}
                onClick={() => setActiveTab('signup')}
                className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'signup' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
            >
                Create Account
            </button>
            <button aria-pressed={activeTab === 'signin'}
                onClick={() => setActiveTab('signin')}
                className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'signin' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
            >
                Sign In
            </button>
        </div>

        <div className="p-8 pt-6">
            <form onSubmit={handleAuth} className="space-y-4">
                {activeTab === 'signup' && (
                    <div>
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1 block">Full Name</label>
                        <input aria-label={"Full Name"}
                            type="text" 
                            required
                            value={formData.fullName}
                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                            className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                        />
                    </div>
                )}
                
                <div>
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1 block">Email</label>
                    <input aria-label={"Email"}
                        type="email" 
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        readOnly={activeTab === 'signup' && !!inviteDetails?.email} // Lock email if signup and invitation present
                        className={`w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none ${activeTab === 'signup' && !!inviteDetails?.email ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1 block">Password</label>
                    <input aria-label={"Password"}
                        type="password" 
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                    />
                </div>

                {activeTab === 'signup' && (
                    <div>
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1 block">Confirm Password</label>
                        <input aria-label={"Confirm Password"}
                            type="password" 
                            required
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                            className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                        />
                    </div>
                )}

                {activeTab === 'signup' && (
                    <>
                        <div className="flex items-start gap-2 pt-2">
                            <input 
                                type="checkbox"
                                id="termsJoin"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="mt-1 accent-primary"
                            />
                            <label htmlFor="termsJoin" className="text-xs text-text-muted">
                                I agree to the <Link to="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>.
                            </label>
                        </div>
                    </>
                )}

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-500">
                        {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white rounded font-bold transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                    {isSubmitting ? <Loader className="animate-spin" size={16} /> : (activeTab === 'signup' ? 'Create Account & Join' : 'Sign In')}
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};
