import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuthStore } from '../../../store/useAuthStore';
import { OrganizationService } from '../../../services/organizationService';
import { MembersList } from './MembersList';
import { InvitationsList } from './InvitationsList';
import { LocationsList } from './LocationsList';
import { InlineFeedback } from '../../atoms/InlineFeedback';
import { customerError } from '../../../lib/customerJourney';
export const OrganizationView = () => {
  const { user, organization } = useAuthStore();
  const orgId = organization?.id, ownerId = organization?.ownerId;
  const [tab, setTab] = useState('Restaurant');
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [name, setName] = useState(''), [timezone, setTimezone] = useState('America/New_York');
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [success, setSuccess] = useState<string | null>(null);
  const dirty = useRef(false), loadedScope = useRef('');
  useEffect(() => {
    const scope = `${user?.uid}:${organization?.id}`;
    if (scope !== loadedScope.current) { loadedScope.current = scope; dirty.current = false; setSuccess(null); setError(null); }
    if (organization && !dirty.current) { setName(organization.name); setTimezone(organization.timezone || 'America/New_York'); }
  }, [user?.uid, organization]);
  useEffect(() => {
    let disposed = false; setAllowed(null);
    if (!user || !orgId) return;
    if (ownerId === user.uid) { setAllowed(true); return; }
    getDoc(doc(db, 'organizations', orgId, 'members', user.uid)).then(snapshot => {
      if (!disposed) setAllowed(snapshot.data()?.status === 'active' && snapshot.data()?.role === 'orgAdmin');
    }).catch(() => { if (!disposed) { setAllowed(false); setError('We could not check your access. Reload this page to try again.'); } });
    return () => { disposed = true; };
  }, [user, orgId, ownerId]);
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!organization || !allowed || busy) return;
    if (!name.trim()) { setError('Enter your restaurant name.'); return; }
    try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }); } catch { setError('Choose a valid time zone.'); return; }
    setBusy(true); setError(null); setSuccess(null);
    try { await OrganizationService.updateOrganization(organization.id, { name: name.trim(), timezone }); dirty.current = false; setSuccess('Restaurant details saved.'); }
    catch (e) { setError(customerError(e, 'Your changes could not be saved. They are still here. Try again.')); }
    finally { setBusy(false); }
  };
  if (allowed === null) return <p role="status">Loading restaurant settings…</p>;
  if (!allowed) return <section><h2 className="text-2xl font-semibold">Restaurant settings</h2><p className="mt-4">Ask your restaurant owner or administrator to manage these details.</p><InlineFeedback tone="error" message={error} /></section>;
  return <section className="space-y-6"><h2 className="text-2xl font-semibold">Restaurant settings</h2><div className="flex flex-wrap gap-2" role="group" aria-label="Restaurant settings sections">{['Restaurant', 'Team', 'Invitations', 'Locations'].map(value => <button key={value} type="button" className="ui-button ui-button-secondary" aria-pressed={tab === value} onClick={() => setTab(value)}>{value}</button>)}</div><InlineFeedback tone="error" message={error} /><InlineFeedback tone="success" message={success} />
    {tab === 'Restaurant' && <><form className="rounded-xl border border-surface-highlight p-5 space-y-5" onSubmit={save}><label className="block" htmlFor="org-name">Restaurant name<input id="org-name" value={name} required maxLength={100} autoComplete="organization" disabled={busy} onChange={e => { dirty.current = true; setName(e.target.value); }} className="block mt-2 min-h-11 rounded-lg border border-surface-highlight bg-background px-3 py-2 w-full" /></label><label className="block" htmlFor="org-timezone">Time zone<select id="org-timezone" value={timezone} disabled={busy} onChange={e => { dirty.current = true; setTimezone(e.target.value); }} className="block mt-2 min-h-11 rounded-lg border border-surface-highlight bg-background px-3 py-2 w-full">{Array.from(new Set([timezone, 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'UTC'])).map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label><button type="submit" className="ui-button ui-button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></form><section className="rounded-xl border border-surface-highlight p-5"><h3 className="font-semibold text-xl">Plan and billing</h3><p className="my-3">Current plan: {organization?.plan}</p><p className="text-text-secondary mb-4">View your subscription, payment details and invoices in billing.</p><Link className="ui-button ui-button-secondary" to="/admin/subscription">Manage plan and billing</Link></section><p className="text-text-secondary">For help with closing your account or removing restaurant data, <Link className="underline" to="/admin/help">contact support</Link>.</p></>}
    {tab === 'Team' && <MembersList />}{tab === 'Invitations' && <InvitationsList />}{tab === 'Locations' && <LocationsList />}
  </section>;
};
