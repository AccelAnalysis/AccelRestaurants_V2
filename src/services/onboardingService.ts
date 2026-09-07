import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import type { Organization } from '../types/schema';

type SetupChanges = Partial<Pick<Organization, 'name' | 'industry' | 'timezone' | 'isSetupComplete'>>;

/** Apply only confirmed profile changes to the same account. Payment fields never pass through this helper. */
export async function saveSetupChanges(orgId: string, uid: string, changes: SetupChanges): Promise<boolean> {
  const before = useAuthStore.getState();
  if (before.user?.uid !== uid || before.organization?.id !== orgId) throw new Error('The current account has changed.');
  await updateDoc(doc(db, 'organizations', orgId), changes);
  const current = useAuthStore.getState();
  if (current.user?.uid !== uid || current.organization?.id !== orgId) return false;
  const allowed: SetupChanges = {};
  for (const key of ['name', 'industry', 'timezone', 'isSetupComplete'] as const) {
    if (Object.prototype.hasOwnProperty.call(changes, key)) Object.assign(allowed, { [key]: changes[key] });
  }
  current.setOrganization({ ...current.organization, ...allowed });
  return true;
}
