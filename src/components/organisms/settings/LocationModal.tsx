import { useState, useEffect } from 'react';
import { X, MapPin, Globe, Save, Building, Layers } from 'lucide-react';
import { LocationService } from '../../../services/locationService';
import type { Location, LocationGroup } from '../../../types/schema';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  locationToEdit?: Location | null;
  onSave: () => void;
}

export const LocationModal = ({ isOpen, onClose, orgId, locationToEdit, onSave }: LocationModalProps) => {
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<LocationGroup[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch groups
    if (orgId) {
      LocationService.getLocationGroups(orgId).then(setGroups).catch(console.error);
    }
  }, [orgId]);

  useEffect(() => {
    if (locationToEdit) {
      setName(locationToEdit.name);
      setGroupId(locationToEdit.groupId || '');
      setTimezone(locationToEdit.timezone);
      setStreet(locationToEdit.address?.street || '');
      setCity(locationToEdit.address?.city || '');
      setState(locationToEdit.address?.state || '');
      setZipCode(locationToEdit.address?.zipCode || '');
      setCountry(locationToEdit.address?.country || '');
    } else {
      // Reset form for new location
      setName('');
      setGroupId('');
      setTimezone('UTC');
      setStreet('');
      setCity('');
      setState('');
      setZipCode('');
      setCountry('');
    }
  }, [locationToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const locationData: Omit<Location, 'id' | 'createdAt'> = {
        orgId,
        name,
        timezone,
        ...(groupId ? { groupId } : {}),
        ...(street || city || state || zipCode || country
          ? {
              address: {
                street,
                city,
                state,
                zipCode,
                country
              }
            }
          : {})
      };

      if (locationToEdit) {
        await LocationService.updateLocation(orgId, locationToEdit.id, locationData);
      } else {
        await LocationService.createLocation(orgId, locationData);
      }

      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface border border-surface-highlight rounded-lg shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-surface-highlight">
          <h3 className="text-lg font-bold text-text flex items-center gap-2">
            <MapPin size={20} className="text-primary" />
            {locationToEdit ? 'Edit Location' : 'Add Location'}
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
              Location Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Downtown Branch"
                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 pl-9 text-sm text-text focus:border-primary focus:outline-none"
                required
              />
              <Building size={16} className="absolute left-3 top-2.5 text-text-muted" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">
              Location Group (Optional)
            </label>
            <div className="relative">
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 pl-9 text-sm text-text focus:border-primary focus:outline-none appearance-none"
              >
                <option value="">No Group</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
              <Layers size={16} className="absolute left-3 top-2.5 text-text-muted" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">
              Timezone
            </label>
            <div className="relative">
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 pl-9 text-sm text-text focus:border-primary focus:outline-none appearance-none"
              >
                 <option value="UTC">UTC (GMT+00:00)</option>
                 <option value="America/New_York">Eastern Time (US & Canada)</option>
                 <option value="America/Chicago">Central Time (US & Canada)</option>
                 <option value="America/Denver">Mountain Time (US & Canada)</option>
                 <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                 <option value="America/Phoenix">Arizona (MT no DST)</option>
                 <option value="America/Anchorage">Alaska (AKT)</option>
                 <option value="Pacific/Honolulu">Hawaii (HST)</option>
                 <option value="Europe/London">London (GMT/BST)</option>
                 <option value="Europe/Paris">Paris (CET/CEST)</option>
                 <option value="Asia/Tokyo">Tokyo (JST)</option>
                 <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
              </select>
              <Globe size={16} className="absolute left-3 top-2.5 text-text-muted" />
            </div>
          </div>

          <div className="pt-2 border-t border-surface-highlight">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 block">
              Address
            </label>
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Street Address"
                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                />
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State/Province"
                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="Zip/Postal Code"
                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                />
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country"
                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-500">
              {error}
            </div>
          )}

          <div className="flex justify-end pt-2 gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-muted hover:text-text transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded text-sm font-medium transition-colors shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {loading ? 'Saving...' : locationToEdit ? 'Update Location' : 'Add Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
