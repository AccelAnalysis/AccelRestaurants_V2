import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/useAuthStore';
import { useConfigStore } from '../../../store/useConfigStore';
import { OrganizationService } from '../../../services/organizationService';
import { getEffectivePlanLimits } from '../../../lib/plans';
import { Building2, Users, CreditCard, Shield, AlertTriangle, Save, Upload, Lock, Loader } from 'lucide-react';
import { MembersList } from './MembersList';
import { InvitationsList } from './InvitationsList';
import { LocationsList } from './LocationsList';

export const OrganizationView = () => {
  const { user, userProfile, organization, setOrganization } = useAuthStore();
  const { planConfigs } = useConfigStore();
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'invitations' | 'locations'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  // Form State
  const [orgName, setOrgName] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name);
      setTimezone(organization.timezone || 'UTC');
    }
  }, [organization]);

  const handleSaveOrg = async () => {
    if (!organization) return;
    setIsSaving(true);
    try {
      await OrganizationService.updateOrganization(organization.id, {
        name: orgName,
        timezone: timezone
      });
      // Update local store
      setOrganization({ ...organization, name: orgName, timezone });
      alert('Organization profile updated successfully.');
    } catch {
      alert('Failed to update organization.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!user || !userProfile || !organization) return null;

  const isOrgAdmin = organization.ownerId === user.uid || 
    (organization.members?.includes(user.uid) && userProfile.platformRole === 'admin');

  if (!isOrgAdmin) {
    return (
      <div className="p-8 text-center bg-surface border border-surface-highlight rounded-lg">
        <Shield size={48} className="mx-auto text-text-muted mb-4" />
        <h3 className="text-lg font-bold text-text">Access Denied</h3>
        <p className="text-text-muted">You do not have permission to view organization settings.</p>
      </div>
    );
  }

  const limits = getEffectivePlanLimits(organization, planConfigs);
  const seatLimit = limits.seats;
  const currentSeats = organization.members?.length || 0;
  const isSeatLimitReached = seatLimit !== -1 && currentSeats >= seatLimit;
  
  // Check if we can purchase more seats (i.e. haven't hit the hard cap)
  const planConfig = planConfigs[organization.plan];
  const maxSeats = planConfig?.maxSeats;
  const canPurchaseMoreSeats = seatLimit !== -1 && (maxSeats === undefined || seatLimit < maxSeats);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Tabs */}
      <div className="flex border-b border-surface-highlight">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
        >
          Members
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'invitations' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
        >
          Invitations
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'locations' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
        >
          Locations
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="space-y-8">
            {/* Organization Profile */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold text-text flex items-center gap-2">
                    <Building2 size={20} className="text-primary" />
                    Organization Profile
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Org Info */}
                    <div className="md:col-span-2 bg-surface border border-surface-highlight rounded-lg p-6 space-y-4 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-surface-highlight rounded-lg flex items-center justify-center border border-surface-highlight">
                                <Building2 size={32} className="text-text-muted" />
                            </div>
                            <div>
                                <h4 className="font-bold text-text">{organization.name}</h4>
                                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                                    <Upload size={12} /> Upload Logo
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-xs text-text-muted mb-1 block">Organization Name</label>
                                <input 
                                    type="text" 
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none transition-colors"
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-xs text-text-muted mb-1 block">Contact Email</label>
                                <input 
                                    type="email" 
                                    placeholder="admin@company.com"
                                    disabled
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none transition-colors opacity-50 cursor-not-allowed"
                                    title="Contact support to change email"
                                />
                            </div>
                             <div className="col-span-2 md:col-span-1">
                                <label className="text-xs text-text-muted mb-1 block">Time Zone</label>
                                <select 
                                  value={timezone}
                                  onChange={(e) => setTimezone(e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none appearance-none transition-colors"
                                >
                                    <option value="UTC">UTC (GMT+00:00)</option>
                                    <option value="America/New_York">Eastern Time (US & Canada)</option>
                                    <option value="America/Chicago">Central Time (US & Canada)</option>
                                    <option value="America/Denver">Mountain Time (US & Canada)</option>
                                    <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                                </select>
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end">
                            <button 
                              onClick={handleSaveOrg}
                              disabled={isSaving}
                              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded text-sm font-medium transition-colors shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Seats & Plan */}
            <section className="space-y-4">
                 <h3 className="text-lg font-bold text-text flex items-center gap-2">
                    <Users size={20} className="text-primary" />
                    Seats & Plan
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-surface border border-surface-highlight rounded-lg p-6 shadow-sm">
                        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Current Plan</h4>
                        <p className="text-2xl font-bold text-primary mb-1">{organization.plan}</p>
                        <p className="text-xs text-text-muted mb-4">Renews on Feb 1, 2026</p>
                        <button onClick={() => navigate('/admin/subscription')} className="w-full py-2 border border-surface-highlight rounded text-sm text-text hover:bg-surface-highlight transition-colors font-medium">
                            Manage Subscription
                        </button>
                    </div>

                    <div className="bg-surface border border-surface-highlight rounded-lg p-6 shadow-sm">
                        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Seat Usage</h4>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-2xl font-bold text-text">{currentSeats}</span>
                            <span className="text-sm text-text-muted mb-1">
                                {seatLimit === -1 ? '/ Unlimited' : `/ ${seatLimit} seats`}
                            </span>
                        </div>
                        <div className="w-full bg-surface-highlight h-2 rounded-full overflow-hidden mb-4">
                            <div 
                                className={`h-full rounded-full transition-all duration-300 ${isSeatLimitReached ? 'bg-red-500' : 'bg-primary'}`} 
                                style={{ width: seatLimit === -1 ? '0%' : `${Math.min((currentSeats / seatLimit) * 100, 100)}%` }}
                            ></div>
                        </div>
                        <button 
                            disabled={!canPurchaseMoreSeats}
                            className={`w-full py-2 border rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                                !canPurchaseMoreSeats
                                    ? 'bg-surface-highlight border-transparent text-text-muted cursor-not-allowed'
                                    : 'border-surface-highlight text-text hover:bg-surface-highlight'
                            }`}
                        >
                            {!canPurchaseMoreSeats && maxSeats !== undefined ? <Lock size={14} /> : null}
                            {seatLimit === -1 ? 'Manage Team' : canPurchaseMoreSeats ? 'Add Seats' : 'Max Capacity'}
                        </button>
                    </div>
                </div>
            </section>

             {/* Billing */}
             <section className="space-y-4">
                 <h3 className="text-lg font-bold text-text flex items-center gap-2">
                    <CreditCard size={20} className="text-primary" />
                    Billing & Payments
                </h3>
                 <div className="bg-surface border border-surface-highlight rounded-lg p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-text">Payment Method</p>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-8 h-5 bg-white rounded border border-surface-highlight flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-black">VISA</span>
                                </div>
                                <p className="text-sm text-text-muted">•••• 4242</p>
                            </div>
                        </div>
                         <button className="px-4 py-2 border border-surface-highlight rounded text-sm text-text hover:bg-surface-highlight transition-colors font-medium">
                            Update
                        </button>
                    </div>
                 </div>
             </section>

             {/* Danger Zone */}
             <section className="space-y-4">
                <h3 className="text-lg font-bold text-text flex items-center gap-2">
                    <AlertTriangle size={20} className="text-red-500" />
                    Danger Zone
                </h3>
                <div className="bg-surface border border-red-500/20 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                         <div>
                             <p className="text-sm font-medium text-text">Delete Organization</p>
                             <p className="text-xs text-text-muted">Permanently delete this organization and all data</p>
                         </div>
                         <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors shadow-lg shadow-red-500/20">
                             Delete Organization
                         </button>
                    </div>
                </div>
             </section>
        </div>
      )}

      {activeTab === 'members' && (
        <MembersList />
      )}

      {activeTab === 'invitations' && (
        <InvitationsList />
      )}

      {activeTab === 'locations' && (
        <LocationsList />
      )}
    </div>
  );
};
