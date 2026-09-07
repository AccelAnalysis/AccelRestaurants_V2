import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { db, functions } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { User, MoreVertical, Shield, Trash2, UserX, CheckCircle, Search, Filter, Loader } from 'lucide-react';
import type { UserProfile, Membership, OrgRole } from '../../../types/schema';

import { EditMemberModal } from './EditMemberModal';

interface MemberData {
  uid: string;
  profile: UserProfile | null;
  membership: Membership | null;
}

export const MembersList = () => {
  const { organization, user } = useAuthStore();
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [editingMember, setEditingMember] = useState<MemberData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!organization?.id || !organization.members) return;

      try {
        setLoading(true);
        const memberPromises = organization.members.map(async (uid) => {
          // Fetch User Profile
          const userDoc = await getDoc(doc(db, 'users', uid));
          const profile = userDoc.exists() ? (userDoc.data() as UserProfile) : null;

          // Fetch Membership Details (Role, Status)
          const memberDoc = await getDoc(doc(db, 'organizations', organization.id, 'members', uid));
          const membership = memberDoc.exists() ? (memberDoc.data() as Membership) : null;

          // Fallback if membership doc doesn't exist yet (e.g. legacy data)
          const effectiveMembership = membership || {
            uid,
            role: (uid === organization.ownerId ? 'orgAdmin' : 'user') as OrgRole,
            status: 'active',
            createdAt: profile?.createdAt,
            createdBy: 'system'
          } as Membership;

          return { uid, profile, membership: effectiveMembership };
        });

        const results = await Promise.all(memberPromises);
        setMembers(results);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [organization]);

  const handleSaveRole = async (uid: string, newRole: OrgRole, locationIds?: string[]) => {
    if (!organization?.id) return;
    try {
      setActionLoading(uid);
      const updateMemberRole = httpsCallable(functions, 'updateMemberRole');
      await updateMemberRole({ orgId: organization.id, uid, role: newRole, locationIds });
      
      // Optimistic update
      setMembers(prev => prev.map(m => 
        m.uid === uid ? { ...m, membership: { ...m.membership!, role: newRole, locationIds } } : m
      ));
    } catch {
      alert("Failed to update role. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (uid: string) => {
    if (!organization?.id) return;
    if (!confirm("Are you sure you want to remove this member? They will lose access immediately.")) return;

    try {
      setActionLoading(uid);
      const removeMember = httpsCallable(functions, 'removeMember');
      await removeMember({ orgId: organization.id, uid });

      // Optimistic update
      setMembers(prev => prev.filter(m => m.uid !== uid));
    } catch {
      alert("Failed to remove member. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredMembers = members.filter(m => 
    m.profile?.displayName?.toLowerCase().includes(filter.toLowerCase()) || 
    m.profile?.email?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-text-muted">Loading members...</p>
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
            placeholder="Search members..." 
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
          {/* Export button could go here */}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-surface-highlight rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-highlight/20 border-b border-surface-highlight">
              <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Member</th>
              <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Joined</th>
              <th className="px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-highlight">
            {filteredMembers.map((member) => {
              const { uid, profile, membership } = member;
              const isMe = uid === user?.uid;
              const isOwner = uid === organization?.ownerId;
              const isProcessing = actionLoading === uid;

              return (
                <tr key={uid} className={`hover:bg-surface-highlight/5 transition-colors group ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-highlight flex items-center justify-center overflow-hidden border border-surface-highlight">
                        {profile?.photoURL ? (
                          <img src={profile.photoURL} alt={profile.displayName || ''} className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} className="text-text-muted" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text">
                          {profile?.displayName || 'Unknown User'} 
                          {isMe && <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">You</span>}
                        </p>
                        <p className="text-xs text-text-muted">{profile?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        {membership?.role === 'orgAdmin' ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-purple-400 bg-purple-400/10 px-2 py-1 rounded border border-purple-400/20">
                                <Shield size={12} /> Org Admin
                            </span>
                        ) : membership?.role === 'locationAdmin' ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-blue-400 bg-blue-400/10 px-2 py-1 rounded border border-blue-400/20">
                                <Shield size={12} /> Location Admin
                            </span>
                        ) : membership?.role === 'locationUser' ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20">
                                <User size={12} /> Location User
                            </span>
                        ) : (
                            <span className="text-xs text-text-muted bg-surface-highlight px-2 py-1 rounded border border-surface-highlight">
                                User
                            </span>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {membership?.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                            <CheckCircle size={12} /> Active
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                            <UserX size={12} /> Deactivated
                        </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted">
                    {membership?.createdAt ? new Date(membership.createdAt.seconds * 1000).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    {!isMe && !isOwner && (
                        <div className="group/actions relative inline-block text-left">
                            <button className="p-2 hover:bg-surface-highlight rounded text-text-muted hover:text-text transition-colors opacity-0 group-hover:opacity-100 group-focus-within/actions:opacity-100">
                                {isProcessing ? <Loader size={16} className="animate-spin" /> : <MoreVertical size={16} />}
                            </button>
                            
                            {/* Dropdown Menu */}
                            {!isProcessing && (
                              <div className="absolute right-0 mt-2 w-48 bg-surface border border-surface-highlight rounded-md shadow-lg z-50 hidden group-hover/actions:block group-focus-within/actions:block">
                                  <div className="py-1">
                                      <button 
                                          onClick={() => {
                                            setEditingMember(member);
                                            setIsEditModalOpen(true);
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-text hover:bg-surface-highlight flex items-center gap-2"
                                      >
                                          <Shield size={14} />
                                          Edit Role
                                      </button>
                                      <button 
                                          onClick={() => handleRemoveMember(uid)}
                                          className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                                      >
                                          <Trash2 size={14} />
                                          Remove Member
                                      </button>
                                  </div>
                              </div>
                            )}
                        </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredMembers.length === 0 && (
            <div className="p-8 text-center text-text-muted">
                No members found matching "{filter}"
            </div>
        )}
      </div>

      <EditMemberModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingMember(null);
        }}
        onSave={handleSaveRole}
        member={editingMember}
      />
    </div>
  );
};
