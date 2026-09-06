import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import type { Organization, UserProfile } from '../types/schema';

export const useAuthListener = () => {
  const { setUser, setOrganization, setUserProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // If we are impersonating, do not let the auth listener overwrite the impersonated state
      // unless the user logs out (user becomes null)
      if (useAuthStore.getState().isImpersonating && user) {
        return;
      }

      if (user) {
        setUser(user);
        
        try {
          // The `createOrganizationForUser` Cloud Function handles profile and org creation.
          // This listener just needs to fetch the data and update the user's last login.

          const userRef = doc(db, 'users', user.uid);
          
          // We'll try to fetch the user profile. It might not exist yet if the Cloud Function
          // is still running. We'll add a small delay and retry.
          let userSnap = await getDoc(userRef);
          let retries = 0;
          while (!userSnap.exists() && retries < 5) {
            retries++;
            console.log(`Auth listener: User doc not found, retry #${retries}...`);
            await new Promise(res => setTimeout(res, 1000));
            userSnap = await getDoc(userRef);
          }

          if (!userSnap.exists()) {
            throw new Error('User profile was not created by the backend. Please contact support.');
          }

          // Update last login timestamp only - don't overwrite other fields
          await setDoc(userRef, { 
            lastLoginAt: serverTimestamp()
          }, { merge: true });

          // Re-fetch to get the updated profile with lastLoginAt
          const updatedUserSnap = await getDoc(userRef);
          const profileData = updatedUserSnap.data() as UserProfile;
          setUserProfile(profileData);

          // Fetch the organization linked to the user profile
          if (profileData.orgId) {
            const orgRef = doc(db, 'organizations', profileData.orgId);
            const orgDoc = await getDoc(orgRef);
            if (orgDoc.exists()) {
              const resolvedOrg = { id: orgDoc.id, ...(orgDoc.data() as Omit<Organization, 'id'>) };
              setOrganization(resolvedOrg);
            } else {
              console.error(`Auth listener: Organization with ID ${profileData.orgId} not found!`);
              setOrganization(null);
            }
          } else {
            // User doesn't have an orgId yet - this is normal for new users who haven't accepted an invitation
            // or for users who are in the process of accepting an invitation
            console.log('Auth listener: User profile does not have an orgId yet.');
            setOrganization(null);
          }

        } catch (err) {
          console.error('Auth initialization failed:', err);
        }
      } else {
        setUser(null);
        setOrganization(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setOrganization, setUserProfile, setLoading]);
};
