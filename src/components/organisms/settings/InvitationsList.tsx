import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { db, functions } from '../../../lib/firebase';
import { collection, query, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Mail, Clock, CheckCircle, XCircle, RotateCcw, Trash2, Plus, Search, Filter, Loader } from 'lucide-react';
import { InviteUserModal } from './InviteUserModal';
import type { Invitation, OrgRole } from '../../../types/schema';

export const InvitationsList = () => {
  const { organization } = useAuthStore();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitations = async () => {
      if (!organization?.id) return;

      try {
        setLoading(true);
        // Query invitations for this org
        const q = query(
          collection(db, 'organizations', organization.id, 'invites'),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const invites = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Invitation));

        setInvitations(invites);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };

    fetchInvitations();
  }, [organization]);

  const handleSendInvite = async (emails: string[], role: OrgRole, locationIds?: string[]) => {
    if (!organization?.id) return;
    
    try {
      const sendInviteEmail = httpsCallable(functions, 'sendInviteEmail');
      const result = await sendInviteEmail({ orgId: organization.id, emails, role, locationIds });
      const data = result.data as { success: boolean; results: Array<{ email: string; status: string; error?: string }> };
      
      // Check if any emails failed
      const failed = data.results.filter(r => r.status === 'error');
      if (failed.length > 0) {
        const failedEmails = failed.map(f => `${f.email}: ${f.error || 'Unknown error'}`).join('\n');
        alert(`Some invitations failed to send:\n${failedEmails}`);
      } else {
        alert(`Successfully sent ${emails.length} invitation(s)!`);
      }
      
      // Refresh list
      const q = query(
        collection(db, 'organizations', organization.id, 'invites'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invitation));
      setInvitations(invites);
    } catch (error) {
      console.error('Error sending invites:', error);
      alert(`Failed to send invitations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!window.confirm('Are you sure you want to revoke this invitation?')) return;
    
    if (!organization?.id) {
      alert('Organization not found');
      return;
    }
    
    try {
      setActionLoading(inviteId);
      const revokeInvite = httpsCallable(functions, 'revokeInvite');
      await revokeInvite({ inviteId, orgId: organization.id });
      
      setInvitations(prev => prev.map(inv => 
        inv.id === inviteId ? { ...inv, status: 'revoked' as const } : inv
      ));
      alert('Invitation revoked successfully.');
    } catch (error) {
      console.error('Error revoking invite:', error);
      alert(`Failed to revoke invite: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    if (!organization?.id) {
      alert('Organization not found. Please refresh and try again.');
      return;
    }

    try {
      setActionLoading(inviteId);
      const resendInvite = httpsCallable(functions, 'resendInvite');
      await resendInvite({ inviteId, orgId: organization.id });
      
      setInvitations(prev => prev.map(inv => 
        inv.id === inviteId ? { ...inv, status: 'pending', createdAt: Timestamp.now() } : inv
      ));
      alert("Invite resent successfully.");
    } catch (error) {
      console.error('Error resending invite:', error);
      alert(`Failed to resend invite: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredInvitations = invitations.filter(inv => 
    inv.inviteeEmail.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-text-muted">Loading invitations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-2.5 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search invitations..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-surface border border-surface-highlight rounded pl-9 pr-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-surface border border-surface-highlight rounded text-sm text-text hover:bg-surface-highlight transition-colors">
            <Filter size={16} />
            Filter
          </button>
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded text-sm font-medium transition-colors shadow-lg shadow-primary/20"
          >
            <Plus size={16} />
            Invite Users
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-surface-highlight rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-highlight/20 border-b border-surface-highlight">
              <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Sent</th>
              <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-highlight">
            {filteredInvitations.map((invite) => {
              const isProcessing = actionLoading === invite.id;
              return (
                <tr key={invite.id} className={`hover:bg-surface-highlight/5 transition-colors group ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-highlight flex items-center justify-center border border-surface-highlight">
                        <Mail size={14} className="text-text-muted" />
                      </div>
                      <span className="text-sm font-medium text-text">{invite.inviteeEmail}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-text-muted bg-surface-highlight px-2 py-1 rounded border border-surface-highlight capitalize">
                      {invite.role === 'orgAdmin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {invite.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
                        <Clock size={12} /> Pending
                      </span>
                    )}
                    {invite.status === 'accepted' && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                        <CheckCircle size={12} /> Accepted
                      </span>
                    )}
                    {invite.status === 'expired' && (
                      <span className="inline-flex items-center gap-1 text-xs text-text-muted bg-surface-highlight px-2 py-1 rounded border border-surface-highlight">
                        <XCircle size={12} /> Expired
                      </span>
                    )}
                    {invite.status === 'revoked' && (
                      <span className="inline-flex items-center gap-1 text-xs text-red-500 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                        <XCircle size={12} /> Revoked
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted">
                    {invite.createdAt ? new Date(invite.createdAt.seconds * 1000).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isProcessing ? (
                        <Loader size={16} className="animate-spin text-text-muted" />
                      ) : (
                        invite.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleResendInvite(invite.id)}
                              className="p-1.5 hover:bg-surface-highlight rounded text-text-muted hover:text-primary transition-colors"
                              title="Resend Invite"
                            >
                              <RotateCcw size={16} />
                            </button>
                            <button 
                              onClick={() => handleRevokeInvite(invite.id)}
                              className="p-1.5 hover:bg-surface-highlight rounded text-text-muted hover:text-red-500 transition-colors"
                              title="Revoke Invite"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredInvitations.length === 0 && (
            <div className="p-8 text-center text-text-muted">
                {filter ? `No invitations found matching "${filter}"` : "No invitations yet. Invite your team!"}
            </div>
        )}
      </div>

      <InviteUserModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSendInvite={handleSendInvite}
      />
    </div>
  );
};
