import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { LocationService } from '../../services/locationService';
import type { Location, LocationGroup } from '../../types/schema';
import { MapPin, Plus, Edit2, Trash2, Globe, Search, Loader, Layers, Music, Volume2 } from 'lucide-react';
import { LocationModal } from './settings/LocationModal';
import { LocationGroupModal } from './settings/LocationGroupModal';

export const LocationListView = () => {
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  const [locations, setLocations] = useState<Location[]>([]);
  const [groups, setGroups] = useState<LocationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingGroup, setEditingGroup] = useState<LocationGroup | null>(null);
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!organization?.id) return;
    try {
      setLoading(true);
      const [locationsData, groupsData] = await Promise.all([
        LocationService.getLocations(organization.id),
        LocationService.getLocationGroups(organization.id)
      ]);
      setLocations(locationsData);
      setGroups(groupsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (locationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!organization?.id) return;
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      setActionLoading(locationId);
      await LocationService.deleteLocation(organization.id, locationId);
      setLocations(prev => prev.filter(l => l.id !== locationId));
    } catch (err) {
      console.error('Failed to delete location:', err);
      alert('Failed to delete location.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (location: Location, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLocation(location);
    setIsModalOpen(true);
  };

  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!organization?.id) return;
    if (!confirm('Are you sure you want to delete this group? Locations in this group will be ungrouped.')) return;

    try {
      setActionLoading(`group-${groupId}`);
      await LocationService.deleteLocationGroup(organization.id, groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      
      // Update local locations to remove group reference
      setLocations(prev => prev.map(l => l.groupId === groupId ? { ...l, groupId: undefined } : l));
      
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
      }
    } catch (err) {
      console.error('Failed to delete group:', err);
      alert('Failed to delete group.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredLocations = locations.filter(l => {
    const matchesFilter = l.name.toLowerCase().includes(filter.toLowerCase()) ||
      l.address?.city?.toLowerCase().includes(filter.toLowerCase());
    
    const matchesGroup = selectedGroupId ? l.groupId === selectedGroupId : true;
    
    return matchesFilter && matchesGroup;
  });

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader size={24} className="animate-spin mx-auto text-primary mb-2" />
        <p className="text-text-muted">Loading locations...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar - Groups */}
      <div className="w-full md:w-64 flex-shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-text text-sm uppercase tracking-wider">Groups</h3>
          <button
            onClick={() => {
              setEditingGroup(null);
              setIsGroupModalOpen(true);
            }}
            className="text-primary hover:text-primary-hover p-1 rounded hover:bg-primary/10 transition-colors"
            title="Add Group"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => setSelectedGroupId(null)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-between group ${
              selectedGroupId === null
                ? 'bg-primary/10 text-primary'
                : 'text-text-muted hover:text-text hover:bg-surface-highlight/50'
            }`}
          >
            <span>All Locations</span>
            <span className="text-xs opacity-60 bg-surface-highlight/50 px-1.5 py-0.5 rounded-full">
              {locations.length}
            </span>
          </button>

          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-between group/item ${
                selectedGroupId === group.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-muted hover:text-text hover:bg-surface-highlight/50'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Layers size={14} />
                <span className="truncate">{group.name}</span>
              </div>
              <div className="flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                 <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingGroup(group);
                      setIsGroupModalOpen(true);
                    }}
                    className="p-1 hover:bg-surface-highlight rounded-full text-text-muted hover:text-primary cursor-pointer"
                 >
                   <Edit2 size={12} />
                 </div>
                 <div
                    onClick={(e) => handleDeleteGroup(group.id, e)}
                    className="p-1 hover:bg-surface-highlight rounded-full text-text-muted hover:text-red-500 cursor-pointer"
                 >
                   {actionLoading === `group-${group.id}` ? <Loader size={12} className="animate-spin" /> : <Trash2 size={12} />}
                 </div>
              </div>
            </button>
          ))}

          {groups.length === 0 && (
            <div className="text-xs text-text-muted italic px-3 py-2">
              No groups created
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-2.5 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search locations..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-surface border border-surface-highlight rounded pl-9 pr-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
            />
          </div>
          <button 
            onClick={() => {
              setEditingLocation(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded text-sm font-medium transition-colors shadow-lg shadow-primary/20"
          >
            <Plus size={16} />
            Add Location
          </button>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map((location) => (
            <div 
              key={location.id} 
              onClick={() => navigate(`/admin/locations/${location.id}`)}
              className="bg-surface border border-surface-highlight rounded-lg p-4 shadow-sm hover:border-primary/30 transition-all group relative cursor-pointer hover:shadow-md"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-surface-highlight rounded-lg text-primary">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-text">{location.name}</h4>
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                      <Globe size={12} />
                      {location.timezone}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => handleEdit(location, e)}
                    className="p-1.5 text-text-muted hover:text-text hover:bg-surface-highlight rounded"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(location.id, e)}
                    disabled={!!actionLoading}
                    className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded"
                    title="Delete"
                  >
                    {actionLoading === location.id ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>

              {/* Audio Status Badge */}
              {location.audioConfig && (
                <div className="mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                    location.audioConfig.isPlaying 
                      ? 'bg-success/20 text-success border border-success/30' 
                      : 'bg-surface-highlight/50 text-text-muted border border-surface-highlight'
                  }`}>
                    {location.audioConfig.isPlaying ? <Volume2 size={10} /> : <Music size={10} />}
                    {location.audioConfig.isPlaying ? 'Audio Playing' : 'Audio Configured'}
                  </span>
                </div>
              )}

              {location.groupId && (
                <div className="mb-2">
                  <span className="text-[10px] bg-surface-highlight/50 text-text-muted px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <Layers size={10} />
                    {groups.find(g => g.id === location.groupId)?.name || 'Unknown Group'}
                  </span>
                </div>
              )}

              {location.address && (
                <div className="mt-3 text-sm text-text-muted pl-11">
                  <p>{location.address.street}</p>
                  <p>
                    {[location.address.city, location.address.state, location.address.zipCode].filter(Boolean).join(', ')}
                  </p>
                  {location.address.country && <p>{location.address.country}</p>}
                </div>
              )}
            </div>
          ))}
          
          {filteredLocations.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-surface-highlight rounded-lg bg-surface-highlight/5">
              <MapPin size={48} className="mx-auto text-surface-highlight mb-4" />
              <h3 className="text-lg font-bold text-text mb-1">No Locations Found</h3>
              <p className="text-text-muted mb-4">
                {filter ? `No locations match "${filter}"` : selectedGroupId ? "No locations in this group." : "You haven't added any locations yet."}
              </p>
              {!filter && !selectedGroupId && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="text-primary hover:underline text-sm font-medium"
                >
                  Add your first location
                </button>
              )}
            </div>
          )}
        </div>

        <LocationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          orgId={organization?.id || ''}
          locationToEdit={editingLocation}
          onSave={fetchData}
        />

        <LocationGroupModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          orgId={organization?.id || ''}
          groupToEdit={editingGroup}
          onSave={fetchData}
        />
      </div>
    </div>
  );
};
