import { useState, useEffect } from 'react';
import { X, Layers, Save } from 'lucide-react';
import { LocationService } from '../../../services/locationService';
import type { LocationGroup } from '../../../types/schema';

interface LocationGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  groupToEdit?: LocationGroup | null;
  onSave: () => void;
}

export const LocationGroupModal = ({ isOpen, onClose, orgId, groupToEdit, onSave }: LocationGroupModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groupToEdit) {
      setName(groupToEdit.name);
      setDescription(groupToEdit.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [groupToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const groupData = {
        orgId,
        name,
        description
      };

      if (groupToEdit) {
        await LocationService.updateLocationGroup(orgId, groupToEdit.id, groupData);
      } else {
        await LocationService.createLocationGroup(orgId, groupData);
      }
      
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save location group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface border border-surface-highlight rounded-lg shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-surface-highlight">
          <h3 className="text-lg font-bold text-text flex items-center gap-2">
            <Layers size={20} className="text-primary" />
            {groupToEdit ? 'Edit Group' : 'Add Group'}
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
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Northeast Region"
              className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Locations in NY, NJ, and CT"
              rows={3}
              className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none resize-none"
            />
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
              {loading ? 'Saving...' : groupToEdit ? 'Update Group' : 'Add Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
