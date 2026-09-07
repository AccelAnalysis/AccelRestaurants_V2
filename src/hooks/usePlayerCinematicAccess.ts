import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { entitlements } from '../../functions/src/cinematic/catalog';

/** The trusted, public plan mirror contains no billing identifiers or member data.
 * Missing/unavailable access stops decorative motion only; menus and audio keep playing.
 */
export function usePlayerCinematicAccess(orgId?: string): boolean {
  const [access, setAccess] = useState<{ orgId: string; allowed: boolean } | null>(null);
  useEffect(() => {
    if (!orgId) return;
    let active = true;
    const unsubscribe = onSnapshot(doc(db, 'public_organizations', orgId), snapshot => {
      if (active) setAccess({ orgId, allowed: snapshot.exists() && entitlements(snapshot.data()?.plan).atmosphere });
    }, () => { if (active) setAccess({ orgId, allowed: false }); });
    return () => { active = false; unsubscribe(); };
  }, [orgId]);
  return access?.orgId === orgId && access?.allowed === true;
}
