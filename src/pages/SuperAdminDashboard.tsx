import { AccessibleDialog } from '../components/atoms/AccessibleDialog';
import { useFeedback } from '../hooks/useFeedback';
import { FeedbackRegion } from '../components/atoms/FeedbackRegion';
import { useConfirmation } from '../hooks/useConfirmation';
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { AdminService } from '../services/adminService';
import { DesignerService } from '../services/designerService';
import { useConfigStore } from '../store/useConfigStore';
import { useAuthStore } from '../store/useAuthStore';
import { type PlanType, type PlanLimits, ALL_TILES } from '../lib/plans';
import { TemplateManager } from '../components/organisms/TemplateManager';
import { ArticleManager } from '../components/organisms/ArticleManager';
import { NotificationTemplateEditor } from '../components/organisms/NotificationTemplateEditor';
import { GeneralSettingsEditor } from '../components/organisms/GeneralSettingsEditor';
import { 
  Shield,
  Save,
  Search,
  Users,
  LogOut,
  Plus,
  Settings,
  Mail,
  Clock,
  RotateCcw,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import type { Organization, DesignerProfile, DesignerInvite, TileType } from '../types/schema';
import logo from '../assets/logo.png';

const OrgManagementModal = ({  
  org, 
  onClose, 
  onUpdate 
}: { 
  org: Organization, 
  onClose: () => void,
  onUpdate: () => void 
}) => {
  const { feedback, notify } = useFeedback();
  const { confirmAction, confirmation } = useConfirmation();
  const navigate = useNavigate();
  const { startImpersonation } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'general' | 'limits' | 'tiles' | 'templates'>('general');
  const [saving, setSaving] = useState(false);
  
  // Local state for edits
  const [plan, setPlan] = useState<PlanType>(org.plan);
  const [customSeats, setCustomSeats] = useState<number | undefined>(org.customLimits?.seats);
  const [customScreens, setCustomScreens] = useState<number | undefined>(org.customLimits?.screens);
  const [tileAccessOverride, setTileAccessOverride] = useState(org.tileAccess?.override || false);
  const [allowedTiles, setAllowedTiles] = useState<TileType[]>(org.tileAccess?.allowedTiles || []);

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      await AdminService.updateOrgPlan(org.id, plan);
      onUpdate();
      notify('Plan updated successfully', 'success');
    } catch {
      notify('Failed to update plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLimits = async () => {
    setSaving(true);
    try {
      await AdminService.updateOrgLimits(org.id, {
        seats: customSeats,
        screens: customScreens
      });
      onUpdate();
      notify('Limits updated successfully', 'success');
    } catch {
      notify('Failed to update limits', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTiles = async () => {
    setSaving(true);
    try {
      await AdminService.updateOrgTileAccess(org.id, {
        override: tileAccessOverride,
        allowedTiles
      });
      onUpdate();
      notify('Tile access updated successfully', 'success');
    } catch {
      notify('Failed to update tile access', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImpersonate = async () => {
    if (!(await confirmAction(`Are you sure you want to impersonate the owner of ${org.name}?`))) return;
    
    setSaving(true);
    try {
      const ownerProfile = await AdminService.getUserProfile(org.ownerId);
      if (ownerProfile) {
        startImpersonation(ownerProfile, org);
        navigate('/admin');
      } else {
        notify('Owner profile not found', 'error');
      }
    } catch {
      notify('Failed to start impersonation', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccessibleDialog title={`Manage ${org.name}`} description="Review this organization’s plan, limits and available tools." onClose={onClose} busy={saving} wide>
      <FeedbackRegion feedback={feedback} />
      {confirmation}


        {/* Modal Header */}


        {/* Modal Tabs */}
        <div className="flex flex-wrap border-b border-surface-highlight px-6">
          <button aria-pressed={activeTab === 'general'}
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            General & Plan
          </button>
          <button aria-pressed={activeTab === 'limits'}
            onClick={() => setActiveTab('limits')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'limits' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            Limits & Quotas
          </button>
          <button aria-pressed={activeTab === 'tiles'}
            onClick={() => setActiveTab('tiles')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tiles' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            Tile Access
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-8">
              <div className="bg-surface-highlight/10 p-6 rounded-xl border border-surface-highlight">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Shield size={20} className="text-primary" />
                  Subscription Plan
                </h3>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Current Plan</label>
                    <select aria-label={"Current Plan"}
                      value={plan}
                      onChange={(e) => setPlan(e.target.value as PlanType)}
                      className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 text-text focus:border-primary focus:outline-none"
                    >
                      <option value="Free">Free</option>
                      <option value="Basic">Basic</option>
                      <option value="Growth">Growth</option>
                      <option value="Enterprise">Enterprise</option>
                      <option value="Franchise">Franchise</option>
                    </select>
                  </div>
                  <button 
                    onClick={handleSaveGeneral}
                    disabled={saving || plan === org.plan}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Update Plan
                  </button>
                </div>
              </div>

              <div className="bg-surface-highlight/10 p-6 rounded-xl border border-surface-highlight">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Users size={20} className="text-blue-400" />
                  Account Actions
                </h3>
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div>
                    <p className="font-medium text-text">Impersonate Owner</p>
                    <p className="text-sm text-text-muted">Log in as the owner of this organization to view their dashboard.</p>
                  </div>
                  <button 
                    onClick={handleImpersonate}
                    disabled={saving}
                    className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Impersonate
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'limits' && (
            <div className="space-y-6">
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                <p className="text-sm text-yellow-500">
                  Setting custom limits overrides the plan defaults. Set to empty/clear to revert to plan defaults.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Seat Limit</label>
                  <input aria-label={`${org.name} seat limit`} min={-1} disabled={saving}
                    type="number" 
                    placeholder="Plan Default"
                    value={customSeats ?? ''}
                    onChange={(e) => setCustomSeats(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 text-text"
                  />
                  <p className="text-xs text-text-muted mt-1">Current usage: {org.members?.length || 0}</p>
                </div>
                <div>
                  <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Screen Limit</label>
                  <input aria-label={"Screen Limit"}
                    type="number" 
                    placeholder="Plan Default"
                    value={customScreens ?? ''}
                    onChange={(e) => setCustomScreens(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 text-text"
                  />
                  <p className="text-xs text-text-muted mt-1">Current usage: {org.screenCount || 0}</p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleSaveLimits}
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <Save size={18} />
                  Save Limits
                </button>
              </div>
            </div>
          )}

          {activeTab === 'tiles' && (
            <div className="space-y-6 h-full flex flex-col">
               <div className="flex items-center gap-3 mb-4">
                <input 
                  type="checkbox"
                  id="overrideTiles"
                  checked={tileAccessOverride}
                  onChange={(e) => setTileAccessOverride(e.target.checked)}
                  className="w-5 h-5 rounded border-surface-highlight bg-background text-primary focus:ring-primary"
                />
                <div>
                  <label htmlFor="overrideTiles" className="text-text font-medium cursor-pointer">Override Plan Tile Access</label>
                  <p className="text-xs text-text-muted">Enable to manually control which tiles this org can use.</p>
                </div>
              </div>

              {tileAccessOverride && (
                <>
                  <div className="flex-1 overflow-y-auto bg-background border border-surface-highlight rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {ALL_TILES.map(tile => (
                        <label key={tile} className="flex items-center gap-2 p-2 hover:bg-surface-highlight rounded cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={allowedTiles.includes(tile)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAllowedTiles([...allowedTiles, tile]);
                              } else {
                                setAllowedTiles(allowedTiles.filter(t => t !== tile));
                              }
                            }}
                            className="rounded border-surface-highlight bg-surface text-primary"
                          />
                          <span className="text-sm font-mono">{tile}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button 
                      onClick={handleSaveTiles}
                      disabled={saving}
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      <Save size={18} />
                      Save Access
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </AccessibleDialog>
  );
};


const OrgRow = ({ org, onManage }: { org: Organization, onManage: (org: Organization) => void }) => {
  return (
    <tr className="border-b border-surface-highlight hover:bg-surface-highlight/5 transition-colors">
      <td className="p-4">
        <div className="font-medium text-text">{org.name}</div>
        <div className="text-xs text-text-muted font-mono">{org.id}</div>
      </td>
      <td className="p-4">
        <div className="text-sm text-text">{org.members?.length || 0} members</div>
        <div className="text-xs text-text-muted">Owner: {org.ownerId.slice(0, 8)}...</div>
      </td>
      <td className="p-4">
        <div className="text-sm text-text">{org.screenCount || 0} screens</div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
            org.plan === 'Enterprise' ? 'bg-purple-500/20 text-purple-400' :
            org.plan === 'Growth' ? 'bg-success/20 text-success' :
            org.plan === 'Basic' ? 'bg-blue-500/20 text-blue-400' :
            'bg-surface-highlight text-text-muted'
          }`}>
            {org.plan}
          </span>
        </div>
      </td>
      <td className="p-4 text-xs text-text-muted">
        {org.createdAt?.seconds ? new Date(org.createdAt.seconds * 1000).toLocaleDateString() : '-'}
      </td>
      <td className="p-4">
        <button aria-label={`Manage ${org.name}`}
          onClick={() => onManage(org)}
          className="p-2 text-text-muted hover:text-primary hover:bg-surface-highlight rounded transition-all"
          title="Manage Organization"
        >
          <Settings size={18} />
        </button>
      </td>
    </tr>
  );
};

const DesignerRow = ({ designer, invite, onRevoke, onResend }: { designer?: DesignerProfile, invite?: DesignerInvite, onRevoke?: (id: string) => void, onResend?: (id: string) => void }) => {
  if (invite) {
    return (
      <tr className="hover:bg-surface-highlight/50 transition-colors border-b border-surface-highlight">
        <td className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface-highlight flex items-center justify-center">
              <Mail size={14} className="text-text-muted" />
            </div>
            <div>
              <div className="font-medium text-text">{invite.name}</div>
              <div className="text-xs text-text-muted">{invite.email}</div>
            </div>
          </div>
        </td>
        <td className="p-4">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${
            invite.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
            invite.status === 'revoked' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
            invite.status === 'expired' ? 'bg-surface-highlight text-text-muted border-surface-highlight' :
            'bg-surface-highlight text-text-muted'
          }`}>
            {invite.status === 'pending' && <Clock size={12} />}
            {invite.status === 'revoked' && <XCircle size={12} />}
            <span className="capitalize">{invite.status}</span>
          </span>
        </td>
        <td className="p-4 text-text-muted">-</td>
        <td className="p-4 text-text-muted">-</td>
        <td className="p-4 text-text-muted">Invited {new Date(invite.createdAt.seconds * 1000).toLocaleDateString()}</td>
        <td className="p-4 text-right">
          {invite.status === 'pending' && (
            <div className="flex justify-end gap-2">
              <button aria-label={`Resend invitation to ${invite.email}`}
                onClick={() => onResend && onResend(invite.id)}
                className="p-1.5 hover:bg-surface-highlight rounded text-text-muted hover:text-primary transition-colors"
                title="Resend Invite"
              >
                <RotateCcw size={16} />
              </button>
              <button aria-label={`Revoke invitation to ${invite.email}`}
                onClick={() => onRevoke && onRevoke(invite.id)}
                className="p-1.5 hover:bg-surface-highlight rounded text-text-muted hover:text-red-500 transition-colors"
                title="Revoke Invite"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </td>
      </tr>
    );
  }

  if (!designer) return null;

  return (
    <tr className="border-b border-surface-highlight hover:bg-surface-highlight/5 transition-colors">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-highlight flex items-center justify-center overflow-hidden">
             <div className="text-xs font-bold text-text-muted">{designer.displayName?.[0] || '?'}</div>
          </div>
          <div>
            <div className="font-medium text-text">{designer.displayName}</div>
            <div className="text-xs text-text-muted">{designer.email}</div>
          </div>
        </div>
      </td>
      <td className="p-4">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${
          designer.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
          designer.status === 'suspended' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
          'bg-surface-highlight text-text-muted'
        }`}>
          {designer.status === 'active' && <CheckCircle size={12} />}
          <span className="capitalize">{designer.status}</span>
        </span>
      </td>
      <td className="p-4 text-text-muted text-xs">
        {designer.specialties?.slice(0, 2).join(', ')}
        {designer.specialties && designer.specialties.length > 2 && ` +${designer.specialties.length - 2}`}
      </td>
      <td className="p-4 text-text-muted text-xs">
        ⭐ {designer.rating?.toFixed(1) || 'N/A'} ({designer.reviewCount || 0})
      </td>
      <td className="p-4 text-text-muted">{new Date(designer.createdAt.seconds * 1000).toLocaleDateString()}</td>
      <td className="p-4 text-right">

      </td>
    </tr>
  );
};

const InviteDesignerModal = ({ onClose, onInvite }: { onClose: () => void, onInvite: (email: string, name: string) => Promise<void> }) => {
  const { feedback, notify } = useFeedback();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    
    setLoading(true);
    try {
      await onInvite(email, name);
      onClose();
    } catch {
      notify('Failed to invite designer', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccessibleDialog title="Invite designer" description="Send a designer an invitation to join the platform." onClose={onClose} busy={loading}>
      <FeedbackRegion feedback={feedback} />



        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Full Name</label>
            <input aria-label={"Full Name"}
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 text-text focus:border-primary focus:outline-none"
              placeholder="e.g. Jane Doe"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Email Address</label>
            <input aria-label={"Email Address"}
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 text-text focus:border-primary focus:outline-none"
              placeholder="jane@design.com"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-text-muted hover:text-text transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </AccessibleDialog>
  );
};

const ConfigEditor = () => {
  const { feedback, notify } = useFeedback();
  const { planConfigs, updateConfigs } = useConfigStore();
  const [localConfigs, setLocalConfigs] = useState<Record<PlanType, PlanLimits> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (planConfigs) {
      setLocalConfigs(JSON.parse(JSON.stringify(planConfigs)));
    }
  }, [planConfigs]);

  const handleSave = async () => {
    if (!localConfigs) return;
    try {
      setSaving(true);
      await updateConfigs(localConfigs);
      notify('System configuration updated successfully', 'success');
    } catch {
      notify('Failed to update configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!localConfigs) return <div>Loading config...</div>;

  return (
    <div className="space-y-8">
      <FeedbackRegion feedback={feedback} />
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-text">Plan Configurations</h3>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded transition-colors"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(Object.entries(localConfigs) as [PlanType, PlanLimits][]).map(([planName, limits]) => (
          <div key={planName} className="bg-surface border border-surface-highlight rounded-xl p-6">
            <h4 className="text-lg font-bold text-text mb-4 border-b border-surface-highlight pb-2 flex items-center gap-2">
              <Shield size={18} className="text-primary" />
              {planName} Plan
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block">Seat Limit</label>
                <input aria-label={`${planName} seat limit`} min={-1} disabled={saving}
                  type="number"
                  value={limits.seats}
                  onChange={(e) => setLocalConfigs({
                    ...localConfigs,
                    [planName]: { ...limits, seats: Number(e.target.value) }
                  })}
                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
                />
              </div>

              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block">Screen Limit (-1 for Unlimited)</label>
                <input aria-label={`${planName} screen limit, -1 for unlimited`} min={-1} disabled={saving}
                  type="number"
                  value={limits.screens}
                  onChange={(e) => setLocalConfigs({
                    ...localConfigs,
                    [planName]: { ...limits, screens: Number(e.target.value) }
                  })}
                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text"
                />
              </div>

              <div className="flex items-center gap-3">
                <input aria-label={`${planName} enforce 5-minute deployment limit`} disabled={saving}
                  type="checkbox"
                  checked={limits.deploymentDurationLimit}
                  onChange={(e) => setLocalConfigs({
                    ...localConfigs,
                    [planName]: { ...limits, deploymentDurationLimit: e.target.checked }
                  })}
                  className="w-4 h-4 rounded border-surface-highlight bg-background text-primary focus:ring-primary"
                />
                <label className="text-sm text-text">Enforce 5-minute deployment limit</label>
              </div>

              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider mb-1 block">Allowed Tiles ({limits.allowedTiles.length})</label>
                <div role="region" tabIndex={0} aria-label={`${planName} allowed tile types`} className="bg-background border border-surface-highlight rounded p-3 text-xs text-text-muted h-32 overflow-y-auto font-mono">
                  {limits.allowedTiles.join(', ')}
                </div>
                <p className="text-[10px] text-text-muted mt-1">
                  * Editing allowed tiles via UI is complex, please modify in code/database for now.
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SuperAdminDashboard = () => {
  const { feedback, notify } = useFeedback();
  const { confirmAction, confirmation } = useConfirmation();
  const { user } = useAuthStore();
  const location = useLocation();
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<'orgs' | 'config' | 'designers' | 'templates' | 'articles' | 'general' | 'notifications'>(() => location.pathname.includes('/templates') ? 'templates' : 'orgs');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [designers, setDesigners] = useState<DesignerProfile[]>([]);
  const [invites, setInvites] = useState<DesignerInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const fetchOrgs = useCallback(async () => {
    setLoading(true); setLoadError(false);
    try {
      const data = await AdminService.getAllOrganizations();
      setOrgs(data);
    } catch (error: unknown) {
      setLoadError(true);
      const message = error instanceof Error ? error.message : 'Unknown error';
      notify(`Failed to load organizations: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const fetchDesigners = useCallback(async () => {
    setLoading(true); setLoadError(false);
    try {
      const [designerData, inviteData] = await Promise.all([
        DesignerService.getAllDesigners(),
        DesignerService.getDesignerInvites()
      ]);
      setDesigners(designerData);
      setInvites(inviteData);
    } catch (error: unknown) {
      setLoadError(true);
      const message = error instanceof Error ? error.message : 'Unknown error';
      notify(`Failed to load designers: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (activeTab === 'orgs') {
      fetchOrgs();
    } else if (activeTab === 'designers') {
      fetchDesigners();
    }
  }, [activeTab, fetchOrgs, fetchDesigners]);

  const handleInviteDesigner = async (email: string, name: string) => {
    if (!user) return;
    const result = await DesignerService.inviteDesigner(email, name, user.uid);
    if (result.warning) {
      notify(`${result.warning}\n\nLink: ${result.inviteLink}`, 'info');
    }
    fetchDesigners();
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!(await confirmAction('Are you sure you want to revoke this invitation?'))) return;
    try {
      await DesignerService.revokeInvite(inviteId);
      fetchDesigners();
    } catch {
      notify('Failed to revoke invite', 'error');
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    try {
      const resendInvite = httpsCallable(functions, 'resendInvite');
      await resendInvite({ inviteId });
      notify('Invitation resent successfully', 'success');
    } catch {
      notify('Failed to resend invite', 'error');
    }
  };

  const filteredOrgs = orgs.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    org.id.includes(searchTerm) ||
    org.ownerId.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-background text-text full-hig-page">
      <FeedbackRegion feedback={feedback} onRetry={loadError ? () => void (activeTab === 'designers' ? fetchDesigners() : fetchOrgs()) : undefined} />
      {confirmation}
      {/* Header */}
      <div className="bg-surface border-b border-surface-highlight px-4 sm:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <img src={logo} alt="AccelRestaurants" className="h-8 w-auto object-contain" />
            <div className="p-2 bg-red-500/20 text-red-500 rounded-lg">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text">Super Admin Console</h1>
              <p className="text-xs text-text-muted">Platform Management & Configuration</p>
            </div>
          </div>
        </div>

        <div role="group" aria-label="Platform sections" className="ui-tabs">
          <button aria-pressed={activeTab === 'orgs'}
            onClick={() => setActiveTab('orgs')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'orgs' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            Organizations
          </button>
          <button aria-pressed={activeTab === 'designers'}
            onClick={() => setActiveTab('designers')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'designers' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            Designers
          </button>
          <button aria-pressed={activeTab === 'templates'}
            onClick={() => setActiveTab('templates')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'templates' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            Templates
          </button>
          <button aria-pressed={activeTab === 'articles'}
            onClick={() => setActiveTab('articles')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'articles' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            Knowledge Base
          </button>
          <button aria-pressed={activeTab === 'config'}
            onClick={() => setActiveTab('config')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'config' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            System Config
          </button>
          <button aria-pressed={activeTab === 'general'}
            onClick={() => setActiveTab('general')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'general' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            General Settings
          </button>
          <button aria-pressed={activeTab === 'notifications'}
            onClick={() => setActiveTab('notifications')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'notifications' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            Notifications
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-8 max-w-7xl mx-auto">
        {showInviteModal && (
          <InviteDesignerModal 
            onClose={() => setShowInviteModal(false)} 
            onInvite={handleInviteDesigner}
          />
        )}

        {selectedOrg && (
          <OrgManagementModal 
            org={selectedOrg} 
            onClose={() => setSelectedOrg(null)} 
            onUpdate={() => {
              setSelectedOrg(null);
              fetchOrgs();
            }} 
          />
        )}

        {activeTab === 'orgs' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 justify-between items-center">
              <div className="relative w-full sm:w-96">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input aria-label={"Search organizations"}
                  type="text" 
                  placeholder="Search organizations..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface border border-surface-highlight rounded-lg pl-10 pr-4 py-2 text-text focus:border-primary focus:outline-none"
                />
              </div>
              <div className="text-sm text-text-muted">
                Showing {filteredOrgs.length} of {orgs.length} organizations
              </div>
            </div>

            <div role="region" aria-label="Organization directory" tabIndex={0} className="ui-table-scroll bg-surface border border-surface-highlight rounded-lg shadow-lg">
              <table className="w-full text-left">
                <thead className="bg-surface-highlight/30 text-xs font-bold text-text-muted uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="p-4">Organization</th>
                    <th scope="col" className="p-4">Users</th>
                    <th scope="col" className="p-4">Usage</th>
                    <th scope="col" className="p-4">Plan</th>
                    <th scope="col" className="p-4">Created</th>
                    <th scope="col" className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-highlight">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-text-muted">Loading organizations...</td>
                    </tr>
                  ) : filteredOrgs.length > 0 ? (
                    filteredOrgs.map(org => (
                      <OrgRow key={org.id} org={org} onManage={setSelectedOrg} />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-text-muted">{loadError ? 'Organizations could not be loaded.' : 'No organizations found'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'designers' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 justify-between items-center">
              <div className="relative w-full sm:w-96">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input aria-label={"Search designers"}
                  type="text" 
                  placeholder="Search designers..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface border border-surface-highlight rounded-lg pl-10 pr-4 py-2 text-text focus:border-primary focus:outline-none"
                />
              </div>
              <button 
                onClick={() => setShowInviteModal(true)}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                Invite Designer
              </button>
            </div>

            <div role="region" aria-label="Designer directory" tabIndex={0} className="ui-table-scroll bg-surface border border-surface-highlight rounded-lg shadow-lg">
              <table className="w-full text-left">
                <thead className="bg-surface-highlight/30 text-xs font-bold text-text-muted uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="p-4">Designer</th>
                    <th scope="col" className="p-4">Status</th>
                    <th scope="col" className="p-4">Specialties</th>
                    <th scope="col" className="p-4">Rating</th>
                    <th scope="col" className="p-4">Joined/Invited</th>
                    <th scope="col" className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-highlight">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-text-muted">Loading designers...</td>
                    </tr>
                  ) : (designers.length > 0 || invites.length > 0) ? (
                    <>
                      {invites
                        .filter(i => 
                          i.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          i.email?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map(invite => (
                          <DesignerRow 
                            key={invite.id} 
                            invite={invite} 
                            onRevoke={handleRevokeInvite}
                            onResend={handleResendInvite}
                          />
                        ))}
                      {designers
                        .filter(d => 
                          d.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.email?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map(designer => (
                          <DesignerRow key={designer.uid} designer={designer} />
                        ))}
                    </>
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-text-muted">{loadError ? 'Designers could not be loaded.' : 'No designers found. Invite one to get started.'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <TemplateManager />
        )}

        {activeTab === 'articles' && (
          <ArticleManager />
        )}

        {activeTab === 'config' && (
          <ConfigEditor />
        )}

        {activeTab === 'general' && (
          <GeneralSettingsEditor />
        )}

        {activeTab === 'notifications' && (
          <NotificationTemplateEditor />
        )}
      </div>
    </div>
  );
};
