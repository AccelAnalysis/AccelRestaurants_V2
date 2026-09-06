import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { LocationService } from '../../services/locationService';
import { ScreenService } from '../../services/screenService';
import { AudioService } from '../../services/audioService';
import { AudioScheduleModal } from './AudioScheduleModal';
import { useLocationPermissions } from '../../hooks/useLocationPermissions';
import type { Location, AppScreen, AudioSchedule } from '../../types/schema';
import { 
  ArrowLeft, 
  MapPin, 
  Monitor, 
  Save, 
  Loader, 
  Play, 
  Pause, 
  Volume2,
  Plus,
  Trash2,
  Edit2,
  Wifi,
  WifiOff
} from 'lucide-react';

type TabType = 'overview' | 'screens' | 'audio';

export const LocationDetailView = () => {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [location, setLocation] = useState<Location | null>(null);
  const [screens, setScreens] = useState<AppScreen[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Overview tab state
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  });

  // Audio tab state
  const [audioAssetId, setAudioAssetId] = useState<string>('');
  const [audioVolume, setAudioVolume] = useState(50);
  const [audioLoop, setAudioLoop] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [excludedScreenIds, setExcludedScreenIds] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<AudioSchedule[]>([]);
  
  // Schedule modal state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<AudioSchedule | null>(null);
  
  // Permissions
  const permissions = useLocationPermissions();

  const fetchData = useCallback(async () => {
    if (!organization?.id || !locationId) return;
    
    try {
      setLoading(true);
      const [locationData, screensData] = await Promise.all([
        LocationService.getLocation(organization.id, locationId),
        ScreenService.getScreens(organization.id)
      ]);

      if (locationData) {
        setLocation(locationData);
        setName(locationData.name);
        setTimezone(locationData.timezone);
        if (locationData.address) {
          setAddress(locationData.address);
        }
        
        // Load audio config
        if (locationData.audioConfig) {
          setAudioAssetId(locationData.audioConfig.assetId || '');
          setAudioVolume(locationData.audioConfig.volume || 50);
          setAudioLoop(locationData.audioConfig.loop || false);
          setAudioPlaying(locationData.audioConfig.isPlaying || false);
          setExcludedScreenIds(locationData.audioConfig.excludedScreenIds || []);
          setSchedules(locationData.audioConfig.schedule || []);
        }
      }

      // Filter screens for this location
      const locationScreens = screensData.filter(s => s.locationId === locationId);
      setScreens(locationScreens);
    } catch (error) {
      console.error('Error fetching location data:', error);
    } finally {
      setLoading(false);
    }
  }, [organization?.id, locationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveOverview = async () => {
    if (!organization?.id || !locationId) return;
    
    try {
      setSaving(true);
      await LocationService.updateLocation(organization.id, locationId, {
        name,
        timezone,
        address
      });
      setEditMode(false);
      fetchData();
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAudio = async () => {
    if (!locationId) return;
    
    try {
      if (audioPlaying) {
        await AudioService.stopLocationAudio(locationId);
        setAudioPlaying(false);
      } else {
        if (!audioAssetId) {
          alert('Please select an audio file first');
          return;
        }
        await AudioService.startLocationAudio(
          locationId,
          audioAssetId,
          audioVolume,
          audioLoop,
          excludedScreenIds
        );
        setAudioPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling audio:', error);
      alert('Failed to control audio playback');
    }
  };

  const handleToggleScreenExclusion = async (screenId: string) => {
    if (!locationId) return;
    
    const newExcludedIds = excludedScreenIds.includes(screenId)
      ? excludedScreenIds.filter(id => id !== screenId)
      : [...excludedScreenIds, screenId];
    
    setExcludedScreenIds(newExcludedIds);
    
    try {
      await AudioService.updateAudioExclusions(locationId, newExcludedIds);
    } catch (error) {
      console.error('Error updating exclusions:', error);
      // Revert on error
      setExcludedScreenIds(excludedScreenIds);
    }
  };

  const handleSaveSchedule = async (scheduleData: Omit<AudioSchedule, 'id'>) => {
    if (!organization?.id || !locationId) return;

    try {
      if (editingSchedule) {
        await AudioService.updateAudioSchedule(
          organization.id,
          locationId,
          editingSchedule.id,
          scheduleData
        );
      } else {
        await AudioService.saveAudioSchedule(
          organization.id,
          locationId,
          scheduleData
        );
      }
      await fetchData();
      setIsScheduleModalOpen(false);
      setEditingSchedule(null);
    } catch (error) {
      console.error('Error saving schedule:', error);
      throw error;
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!organization?.id || !locationId) return;
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await AudioService.deleteAudioSchedule(organization.id, locationId, scheduleId);
      await fetchData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    }
  };

  const isScreenLive = (screen: AppScreen) => {
    if (!screen.lastHeartbeatAt) return false;
    const now = Date.now();
    const heartbeatTime = typeof screen.lastHeartbeatAt.toMillis === 'function' 
      ? screen.lastHeartbeatAt.toMillis() 
      : 0;
    return (now - heartbeatTime) < 2 * 60 * 1000;
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader size={24} className="animate-spin mx-auto text-primary mb-2" />
        <p className="text-text-muted">Loading location...</p>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-muted">Location not found</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/locations')}
          className="flex items-center gap-2 text-text-muted hover:text-text mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Locations
        </button>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-surface-highlight rounded-lg text-primary">
            <MapPin size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text">{location.name}</h1>
            <p className="text-text-muted text-sm mt-1">
              {screens.length} screen{screens.length !== 1 ? 's' : ''} at this location
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-highlight mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overview' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('screens')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'screens' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          Screens ({screens.length})
        </button>
        <button
          onClick={() => setActiveTab('audio')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'audio' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          Audio
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="max-w-2xl">
          <div className="bg-surface border border-surface-highlight rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-text">Location Details</h2>
              {!editMode && permissions.canEditLocation && (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded transition-colors"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-muted mb-1 block">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!editMode}
                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-text-muted mb-1 block">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={!editMode}
                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="UTC">UTC (GMT+00:00)</option>
                  <option value="America/New_York">Eastern Time (US & Canada)</option>
                  <option value="America/Chicago">Central Time (US & Canada)</option>
                  <option value="America/Denver">Mountain Time (US & Canada)</option>
                  <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-text-muted mb-1 block">Street Address</label>
                <input
                  type="text"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  disabled={!editMode}
                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-muted mb-1 block">City</label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    disabled={!editMode}
                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-muted mb-1 block">State</label>
                  <input
                    type="text"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    disabled={!editMode}
                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-muted mb-1 block">ZIP Code</label>
                  <input
                    type="text"
                    value={address.zipCode}
                    onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                    disabled={!editMode}
                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-muted mb-1 block">Country</label>
                  <input
                    type="text"
                    value={address.country}
                    onChange={(e) => setAddress({ ...address, country: e.target.value })}
                    disabled={!editMode}
                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {editMode && (
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSaveOverview}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setName(location.name);
                      setTimezone(location.timezone);
                      if (location.address) setAddress(location.address);
                    }}
                    className="px-4 py-2 border border-surface-highlight hover:bg-surface-highlight rounded transition-colors text-text"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'screens' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-text">Screens at {location.name}</h2>
          </div>

          {screens.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-surface-highlight rounded-lg">
              <Monitor size={48} className="mx-auto text-surface-highlight mb-4" />
              <p className="text-text-muted">No screens assigned to this location yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {screens.map((screen) => {
                const isExcluded = excludedScreenIds.includes(screen.id);
                
                return (
                  <div
                    key={screen.id}
                    onClick={() => navigate(`/admin/screens/${screen.id}`)}
                    className="bg-surface border border-surface-highlight rounded-lg p-4 cursor-pointer hover:border-primary/30 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-surface-highlight rounded-lg text-primary">
                          <Monitor size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-text">{screen.name}</h3>
                          <p className="text-xs text-text-muted capitalize">{screen.orientation}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isScreenLive(screen) ? (
                          <div className="flex items-center gap-1 text-xs font-medium text-success">
                            <Wifi size={12} />
                            Live
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs font-medium text-text-muted">
                            <WifiOff size={12} />
                            Offline
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mb-3 text-sm text-text-muted">
                      <p>{screen.livePlaylist?.length || 0} slides in playlist</p>
                    </div>

                    {/* Audio Exclusion Toggle */}
                    <div className="pt-3 border-t border-surface-highlight">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-text-muted">Include in Location Audio</span>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleScreenExclusion(screen.id);
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            isExcluded ? 'bg-surface-highlight' : 'bg-primary'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isExcluded ? 'translate-x-1' : 'translate-x-6'
                            }`}
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'audio' && (
        <div className="max-w-3xl space-y-6">
          {/* Audio Controls */}
          <div className="bg-surface border border-surface-highlight rounded-lg p-6">
            <h2 className="text-xl font-bold text-text mb-4">Audio Playback</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-muted mb-2 block">Audio File</label>
                <select
                  value={audioAssetId}
                  onChange={(e) => setAudioAssetId(e.target.value)}
                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text focus:border-primary focus:outline-none"
                >
                  <option value="">Select an audio file...</option>
                  {/* TODO: Load audio assets from Asset collection */}
                </select>
                <p className="text-xs text-text-muted mt-1">Upload audio files in the Media Assets section</p>
              </div>

              <div>
                <label className="text-sm font-medium text-text-muted mb-2 block">
                  Volume: {audioVolume}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={audioVolume}
                  onChange={(e) => setAudioVolume(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={audioLoop}
                    onChange={(e) => setAudioLoop(e.target.checked)}
                    className="rounded border-surface-highlight text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text">Loop audio continuously</span>
                </label>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  onClick={handleToggleAudio}
                  disabled={!permissions.canControlAudio}
                  className={`flex items-center gap-2 px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    audioPlaying
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-primary hover:bg-primary/90 text-white'
                  }`}
                >
                  {audioPlaying ? <Pause size={18} /> : <Play size={18} />}
                  {audioPlaying ? 'Stop Audio' : 'Play Audio'}
                </button>
                
                {audioPlaying && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-success/20 text-success rounded">
                    <Volume2 size={18} className="animate-pulse" />
                    <span className="text-sm font-medium">Playing</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Excluded Screens Summary */}
          {excludedScreenIds.length > 0 && (
            <div className="bg-surface border border-surface-highlight rounded-lg p-6">
              <h3 className="text-lg font-bold text-text mb-3">Excluded Screens</h3>
              <p className="text-sm text-text-muted mb-3">
                The following screens will not play location audio:
              </p>
              <div className="space-y-2">
                {excludedScreenIds.map(screenId => {
                  const screen = screens.find(s => s.id === screenId);
                  return screen ? (
                    <div key={screenId} className="text-sm text-text">
                      • {screen.name}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Audio Schedules */}
          <div className="bg-surface border border-surface-highlight rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-text">Scheduled Playback</h3>
              {permissions.canControlAudio && (
                <button 
                  onClick={() => {
                    setEditingSchedule(null);
                    setIsScheduleModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary hover:bg-primary/90 text-white rounded transition-colors"
                >
                  <Plus size={16} />
                  Add Schedule
                </button>
              )}
            </div>
            
            {schedules.length === 0 ? (
              <p className="text-sm text-text-muted">No schedules configured. Audio will play manually.</p>
            ) : (
              <div className="space-y-2">
                {schedules.map(schedule => (
                  <div key={schedule.id} className="flex items-center justify-between p-3 bg-background rounded border border-surface-highlight">
                    <div>
                      <p className="text-sm font-medium text-text">
                        {schedule.startTime} {schedule.endTime && `- ${schedule.endTime}`}
                      </p>
                      <p className="text-xs text-text-muted">
                        {schedule.daysOfWeek.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${schedule.enabled ? 'bg-success/20 text-success' : 'bg-surface-highlight text-text-muted'}`}>
                        {schedule.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button 
                        onClick={() => {
                          setEditingSchedule(schedule);
                          setIsScheduleModalOpen(true);
                        }}
                        className="p-1 hover:bg-surface-highlight rounded text-text-muted hover:text-text"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="p-1 hover:bg-surface-highlight rounded text-text-muted hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audio Schedule Modal */}
      <AudioScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setEditingSchedule(null);
        }}
        onSave={handleSaveSchedule}
        scheduleToEdit={editingSchedule}
      />
    </div>
  );
};
