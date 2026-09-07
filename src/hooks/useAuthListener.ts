import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import type { Organization, UserProfile } from '../types/schema';

export const useAuthListener = () => {
  const { user, organization, isImpersonating, setUser, setOrganization, setUserProfile, setLoading } = useAuthStore();
  const orgId = organization?.id;

  useEffect(() => {
    let generation = 0;
    let disposed = false;
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (useAuthStore.getState().isImpersonating && nextUser) return;
      const request = ++generation;
      const current = () => !disposed && request === generation && !useAuthStore.getState().isImpersonating;
      if (!nextUser) {
        setUser(null); setOrganization(null); setUserProfile(null); setLoading(false);
        return;
      }
      if (useAuthStore.getState().user?.uid !== nextUser.uid) {
        setOrganization(null); setUserProfile(null);
      }
      setUser(nextUser);
      if (nextUser.isAnonymous) {
        setUserProfile(null); setOrganization(null); setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const userRef = doc(db, 'users', nextUser.uid);
        let snapshot = await getDoc(userRef);
        for (let retry = 0; !snapshot.exists() && retry < 5 && current(); retry++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (!current()) return;
          snapshot = await getDoc(userRef);
        }
        if (!current()) return;
        if (!snapshot.exists()) throw new Error('Account profile is not available yet.');
        const profile = snapshot.data() as UserProfile;
        setUserProfile(profile);
        // A last-login write is not a prerequisite for opening the restaurant.
        void setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true }).catch(() => {});
        if (profile.orgId) {
          const restaurant = await getDoc(doc(db, 'organizations', profile.orgId));
          if (!current()) return;
          setOrganization(restaurant.exists() ? { ...(restaurant.data() as Omit<Organization, 'id'>), id: restaurant.id } : null);
        } else setOrganization(null);
      } catch (error) {
        if (current()) console.error('Account initialization could not finish', error);
      } finally {
        if (current()) setLoading(false);
      }
    });
    return () => { disposed = true; generation++; unsubscribe(); };
  }, [setUser, setOrganization, setUserProfile, setLoading]);

  // Keep confirmed payment and restaurant changes current without restarting setup.
  // Ignore local pending writes: a checkout return or optimistic browser update is not payment confirmation.
  useEffect(() => {
    if (!user || user.isAnonymous || !orgId || isImpersonating) return;
    const uid = user.uid;
    return onSnapshot(doc(db, 'organizations', orgId), snapshot => {
      const state = useAuthStore.getState();
      if (state.user?.uid !== uid || state.organization?.id !== orgId || state.isImpersonating || snapshot.metadata.hasPendingWrites) return;
      if (snapshot.exists()) setOrganization({ ...(snapshot.data() as Omit<Organization, 'id'>), id: snapshot.id });
    }, error => {
      console.error('Restaurant updates are temporarily unavailable', error);
    });
  }, [user, orgId, isImpersonating, setOrganization]);
};
