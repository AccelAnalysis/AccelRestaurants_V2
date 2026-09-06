import { useState, useEffect } from 'react';
import { X, Mail, Shield, Plus, Users, MapPin } from 'lucide-react';
import type { OrgRole, Location } from '../../../types/schema';
import { LocationService } from '../../../services/locationService';
import { useAuthStore } from '../../../store/useAuthStore';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendInvite: (emails: string[], role: OrgRole, locationIds?: string[]) => Promise<void>;
}

export const InviteUserModal = ({ isOpen, onClose, onSendInvite }: InviteUserModalProps) => {
  const { organization } = useAuthStore();
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<OrgRole>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    if (isOpen && organization) {
      const fetchLocations = async () => {
        setLoadingLocations(true);
        try {
          const locs = await LocationService.getLocations(organization.id);
          setLocations(locs);
        } catch {
          console.error('Failed to fetch locations');
        } finally {
          setLoadingLocations(false);
        }
      };
      fetchLocations();
    }
  }, [isOpen, organization]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Parse emails (comma or newline separated)
    const emailList = emails
      .split(/[,\s\n]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (emailList.length === 0) {
      setError('Please enter at least one valid email address.');
      return;
    }

    // Validate location selection for location roles
    if ((role === 'locationAdmin' || role === 'locationUser') && selectedLocationIds.length === 0) {
      setError('Please select at least one location for this role.');
      return;
    }

    try {
      setLoading(true);
      await onSendInvite(emailList, role, selectedLocationIds);
      onClose();
      setEmails('');
      setRole('user');
      setSelectedLocationIds([]);
    } catch {
      setError('Failed to send invites. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isLocationRole = role === 'locationAdmin' || role === 'locationUser';

  const toggleLocation = (id: string) => {
    setSelectedLocationIds(prev => 
      prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface border border-surface-highlight rounded-lg shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-surface-highlight">
          <h3 className="text-lg font-bold text-text flex items-center gap-2">
            <Plus size={20} className="text-primary" />
            Invite Users
          </h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-surface-highlight rounded text-text-muted hover:text-text transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">
              Email Addresses
            </label>
            <div className="relative">
              <textarea
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="colleague@restaurant.com, manager@restaurant.com"
                className="w-full h-24 bg-background border border-surface-highlight rounded-lg p-3 text-sm text-text focus:border-primary focus:outline-none resize-none"
              />
              <Mail size={16} className="absolute top-3 right-3 text-text-muted" />
            </div>
            <p className="text-[10px] text-text-muted mt-1">
              Separate multiple emails with commas or new lines.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">
              Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${role === 'user' ? 'border-primary bg-primary/5' : 'border-surface-highlight hover:bg-surface-highlight/50'}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="user" 
                  checked={role === 'user'} 
                  onChange={() => setRole('user')}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={14} className={role === 'user' ? 'text-primary' : 'text-text-muted'} />
                    <span className="text-sm font-medium text-text">User</span>
                  </div>
                  <p className="text-[10px] text-text-muted leading-tight">
                    Can view and manage slides, menus, and assets. No access to billing or org settings.
                  </p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${role === 'orgAdmin' ? 'border-primary bg-primary/5' : 'border-surface-highlight hover:bg-surface-highlight/50'}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="orgAdmin" 
                  checked={role === 'orgAdmin'} 
                  onChange={() => setRole('orgAdmin')}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={14} className={role === 'orgAdmin' ? 'text-primary' : 'text-text-muted'} />
                    <span className="text-sm font-medium text-text">Admin</span>
                  </div>
                  <p className="text-[10px] text-text-muted leading-tight">
                    Full access to all settings, billing, team management, and organization data.
                  </p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${role === 'locationAdmin' ? 'border-blue-500 bg-blue-500/5' : 'border-surface-highlight hover:bg-surface-highlight/50'}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="locationAdmin" 
                  checked={role === 'locationAdmin'} 
                  onChange={() => setRole('locationAdmin')}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={14} className={role === 'locationAdmin' ? 'text-blue-500' : 'text-text-muted'} />
                    <span className="text-sm font-medium text-text">Location Admin</span>
                  </div>
                  <p className="text-[10px] text-text-muted leading-tight">
                    Can manage screens and menus for specific locations.
                  </p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${role === 'locationUser' ? 'border-emerald-500 bg-emerald-500/5' : 'border-surface-highlight hover:bg-surface-highlight/50'}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="locationUser" 
                  checked={role === 'locationUser'} 
                  onChange={() => setRole('locationUser')}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={14} className={role === 'locationUser' ? 'text-emerald-500' : 'text-text-muted'} />
                    <span className="text-sm font-medium text-text">Location User</span>
                  </div>
                  <p className="text-[10px] text-text-muted leading-tight">
                    Read-only access to specific locations.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {isLocationRole && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-medium text-text-muted mb-2">Select Locations</label>
              {loadingLocations ? (
                <div className="text-sm text-text-muted">Loading locations...</div>
              ) : locations.length > 0 ? (
                <div className="max-h-40 overflow-y-auto space-y-2 border border-surface-highlight rounded p-2 bg-background">
                  {locations.map(loc => (
                    <label key={loc.id} className="flex items-center gap-2 cursor-pointer hover:bg-surface-highlight/20 p-1 rounded">
                      <input 
                        type="checkbox"
                        checked={selectedLocationIds.includes(loc.id)}
                        onChange={() => toggleLocation(loc.id)}
                      />
                      <span className="text-sm text-text">{loc.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-text-muted italic">No locations found. Create locations first.</div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-500">
              {error}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-muted hover:text-text transition-colors mr-2"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded text-sm font-medium transition-colors shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Invites'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
