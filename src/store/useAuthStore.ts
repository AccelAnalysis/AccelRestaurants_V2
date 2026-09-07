import { create } from 'zustand';
import type { User } from 'firebase/auth';
import type { Organization, UserProfile } from '../types/schema';

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  organization: Organization | null;
  loading: boolean;
  
  // Impersonation state
  isImpersonating: boolean;
  originalUser: User | null;
  originalProfile: UserProfile | null;
  originalOrganization: Organization | null;

  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setOrganization: (org: Organization | null) => void;
  setLoading: (loading: boolean) => void;
  
  startImpersonation: (profile: UserProfile, org: Organization) => void;
  stopImpersonation: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userProfile: null,
  organization: null,
  loading: true,
  
  isImpersonating: false,
  originalUser: null,
  originalProfile: null,
  originalOrganization: null,

  setUser: (user) => set({ user }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setOrganization: (organization) => set({ organization }),
  setLoading: (loading) => set({ loading }),
  
  startImpersonation: (profile, org) => {
    const currentState = get();
    // Don't overwrite originals if already impersonating
    if (currentState.isImpersonating) {
      set({
        userProfile: profile,
        organization: org
      });
      return;
    }

    set({
      isImpersonating: true,
      originalUser: currentState.user,
      originalProfile: currentState.userProfile,
      originalOrganization: currentState.organization,
      userProfile: profile,
      organization: org
      // Note: We don't change 'user' (Firebase Auth object) because we can't mint a new one easily client-side.
      // The app should rely on userProfile for display and roles.
    });
  },

  stopImpersonation: () => {
    const { originalUser, originalProfile, originalOrganization } = get();
    set({
      isImpersonating: false,
      user: originalUser,
      userProfile: originalProfile,
      organization: originalOrganization,
      originalUser: null,
      originalProfile: null,
      originalOrganization: null
    });
  }
}));
