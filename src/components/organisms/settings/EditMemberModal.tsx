import { useState, useEffect } from 'react';
import { X, Shield, MapPin, Save, Loader } from 'lucide-react';
import type { OrgRole, Location, Membership, UserProfile } from '../../../types/schema';
import { LocationService } from '../../../services/locationService';
import { useAuthStore } from '../../../store/useAuthStore';

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (uid: string, role: OrgRole, locationIds?: string[]) => Promise<void>;
  member: {
    uid: string;
    profile: UserProfile | null;
    membership: Membership | null;
  } | null;
}

export const EditMemberModal = ({ isOpen, onClose, onSave, member }: EditMemberModalProps) => {
  const { organization } = useAuthStore();
  const [role, setRole] = useState<OrgRole>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    if (isOpen && member) {
      setRole(member.membership?.role || 'user');
      setSelectedLocationIds(member.membership?.locationIds || []);
    }
  }, [isOpen, member]);

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

  if (!isOpen || !member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate location selection for location roles
    if ((role === 'locationAdmin' || role === 'locationUser') && selectedLocationIds.length === 0) {
      setError('Please select at least one location for this role.');
      return;
    }

    try {
      setLoading(true);
      await onSave(member.uid, role, selectedLocationIds);
      onClose();
    } catch {
      setError('Failed to update member. Please try again.');
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
          <h3 className="font-bold text-lg text-text">Edit Member Role</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-highlight rounded-full transition-colors text-text-muted hover:text-text">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-surface-highlight/30 p-3 rounded-lg border border-surface-highlight">
            <p className="text-sm font-medium text-text">{member.profile?.displayName || member.profile?.email || 'Unknown User'}</p>
            <p className="text-xs text-text-muted">{member.profile?.email}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Role</label>
            <div className="grid grid-cols-1 gap-2">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${role === 'user' ? 'border-primary bg-primary/5' : 'border-surface-highlight hover:border-surface-highlight/80'}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="user" 
                  checked={role === 'user'} 
                  onChange={() => setRole('user')}
                  className="mt-1"
                />
                <div>
                  <span className="block text-sm font-medium text-text">User</span>
                  <span className="block text-xs text-text-muted">Standard access. Cannot manage billing or users.</span>
                </div>
              </label>
              
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${role === 'orgAdmin' ? 'border-purple-500 bg-purple-500/5' : 'border-surface-highlight hover:border-surface-highlight/80'}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="orgAdmin" 
                  checked={role === 'orgAdmin'} 
                  onChange={() => setRole('orgAdmin')}
                  className="mt-1"
                />
                <div>
                  <span className="block text-sm font-medium text-text flex items-center gap-1">
                    <Shield size={12} className="text-purple-500" />
                    Org Admin
                  </span>
                  <span className="block text-xs text-text-muted">Full access to everything.</span>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${role === 'locationAdmin' ? 'border-blue-500 bg-blue-500/5' : 'border-surface-highlight hover:border-surface-highlight/80'}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="locationAdmin" 
                  checked={role === 'locationAdmin'} 
                  onChange={() => setRole('locationAdmin')}
                  className="mt-1"
                />
                <div>
                  <span className="block text-sm font-medium text-text flex items-center gap-1">
                    <MapPin size={12} className="text-blue-500" />
                    Location Admin
                  </span>
                  <span className="block text-xs text-text-muted">Manage screens/menus for specific locations.</span>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${role === 'locationUser' ? 'border-emerald-500 bg-emerald-500/5' : 'border-surface-highlight hover:border-surface-highlight/80'}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="locationUser" 
                  checked={role === 'locationUser'} 
                  onChange={() => setRole('locationUser')}
                  className="mt-1"
                />
                <div>
                  <span className="block text-sm font-medium text-text flex items-center gap-1">
                    <MapPin size={12} className="text-emerald-500" />
                    Location User
                  </span>
                  <span className="block text-xs text-text-muted">Read-only access to specific locations.</span>
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
                <div className="text-sm text-text-muted italic">No locations found.</div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-500">
              {error}
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text hover:bg-surface-highlight rounded transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
