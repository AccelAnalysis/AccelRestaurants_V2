import type { firestore } from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v1/https';
import { assertAtmosphereEntitled, entitlements } from './catalog';
import { RESTAURANT_TEMPLATES } from './templates';

/** Preflight all source content before the existing importer performs any writes.
 * Keep the fetched snapshots for the import itself, avoiding a validation/use race.
 */
export async function preflightCinematicImport(
  db: firestore.Firestore, template: firestore.DocumentData,
  uid: string, targetOrgId: string, plan: unknown,
): Promise<Map<string, firestore.DocumentData>> {
  const check = async (source: firestore.DocumentData) => {
    if (!['slide', 'menu', 'screen'].includes(source.type)) throw new HttpsError('invalid-argument', 'Unsupported template type.');
    if (source.isPublic !== true && source.createdBy !== uid && source.orgId !== targetOrgId) {
      if (typeof source.orgId !== 'string' || !/^[\w-]{1,128}$/.test(source.orgId)) throw new HttpsError('permission-denied', 'This template is private.');
      const [org, member] = await Promise.all([
        db.doc(`organizations/${source.orgId}`).get(), db.doc(`organizations/${source.orgId}/members/${uid}`).get(),
      ]);
      if (org.data()?.ownerId !== uid && member.data()?.status !== 'active') throw new HttpsError('permission-denied', 'This template is private.');
    }
    if (source.type === 'slide') {
      try { assertAtmosphereEntitled(plan, source.content || {}); }
      catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'Motion requires Growth.'); }
      const signature = RESTAURANT_TEMPLATES.find(item => item.id === source.content?.restaurantTemplate?.id)?.signature;
      if (signature && !entitlements(plan).signatureTemplates) throw new HttpsError('failed-precondition', 'Signature restaurant templates require Growth.');
    }
  };
  await check(template);
  const nested = new Map<string, firestore.DocumentData>();
  if (template.type === 'screen') {
    const entries: unknown = template.content?.livePlaylist || [];
    if (!Array.isArray(entries) || entries.length > 100) throw new HttpsError('invalid-argument', 'A screen template supports up to 100 slides.');
    for (const entry of entries) {
      const id: unknown = typeof entry === 'string' ? entry : entry?.slideId;
      if (typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id)) throw new HttpsError('invalid-argument', 'Invalid nested template reference.');
      if (nested.has(id)) continue;
      const child = (await db.doc(`templates/${id}`).get()).data();
      if (!child || child.type !== 'slide') throw new HttpsError('failed-precondition', 'A screen template slide is missing or invalid.');
      await check(child);
      nested.set(id, child);
    }
  }
  return nested;
}
