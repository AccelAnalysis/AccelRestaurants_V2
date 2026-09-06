import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Plus, Settings, ExternalLink, Trash2, Rocket, Copy, Check, Lock, MapPin, Wifi, WifiOff } from 'lucide-react';
import { ScreenService } from '../../services/screenService';
import { LocationService } from '../../services/locationService';
import type { AppScreen, Location } from '../../types/schema';
import { useAuthStore } from '../../store/useAuthStore';
import { useConfigStore } from '../../store/useConfigStore';
import { getEffectivePlanLimits } from '../../lib/plans';
import { TemplateSelectorModal } from './TemplateSelectorModal';

// Helper to check if screen is live (heartbeat within last 2 mins)
const isScreenLive = (screen: AppScreen) => {
  if (!screen.lastHeartbeatAt) return false;
  const now = Date.now();
  // Handle both Firestore Timestamp and serialized dates if any
  const heartbeatTime = typeof screen.lastHeartbeatAt.toMillis === 'function' 
    ? screen.lastHeartbeatAt.toMillis() 
    : 0;
  return (now - heartbeatTime) < 2 * 60 * 1000;
};

// Deploy Modal Component
const DeployModal = ({ 
  screen, 
  onClose 
}: { 
  screen: AppScreen; 
  onClose: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const playerUrl = `${window.location.origin}/player/${screen.id}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(playerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail for clipboard error
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-surface border border-surface-highlight rounded-xl w-full max-w-md shadow-2xl p-6 overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text transition-colors"
        >
          <Plus className="rotate-45" size={24} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/20 text-primary rounded-lg">
            <Rocket size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-text">Deploy Screen</h3>
            <p className="text-sm text-text-muted">{screen.name}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">
              Player URL
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={playerUrl}
                className="flex-1 bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text-muted font-mono overflow-hidden text-ellipsis"
              />
              <button 
                onClick={copyToClipboard}
                className={`p-2 rounded transition-all ${copied ? 'bg-success text-white' : 'bg-primary text-white hover:bg-primary-hover'}`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div className="bg-surface-highlight/10 p-4 rounded-lg border border-surface-highlight/30 text-xs text-text-muted">
            <p className="mb-2"><strong>How to use:</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Copy the unique player URL above.</li>
              <li>Open this URL on your digital signage hardware.</li>
              <li>Updates published in this dashboard will sync instantly.</li>
            </ol>
          </div>

          <button 
            onClick={() => window.open(playerUrl, '_blank')}
            className="w-full py-3 bg-surface-highlight hover:bg-surface-highlight/80 rounded-lg text-text font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink size={18} />
            Test Player Link
          </button>
        </div>
      </div>
    </div>
  );
};

export const ScreenListView = () => {
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  const { planConfigs } = useConfigStore();
  const [screens, setScreens] = useState<AppScreen[]>([]);
  const [loading, setLoading] = useState(true);
  const [deployingScreen, setDeployingScreen] = useState<AppScreen | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [locationMap, setLocationMap] = useState<Record<string, string>>({});

  const loadScreens = useCallback(async () => {
    try {
      if (!organization?.id) {
        setLoading(false);
        return;
      }
      const orgId = organization.id;
      
      const [fetchedScreens, fetchedLocations] = await Promise.all([
        ScreenService.getScreens(orgId),
        LocationService.getLocations(orgId)
      ]);
      
      setScreens(fetchedScreens);
      
      const locMap: Record<string, string> = {};
      fetchedLocations.forEach((loc: Location) => {
        locMap[loc.id] = loc.name;
      });
      setLocationMap(locMap);
      
    } catch {
      // Silent fail for screen loading
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    loadScreens();
  }, [loadScreens]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this screen?')) {
      await ScreenService.deleteScreen(id);
      loadScreens();
    }
  };

  const handleTemplateImport = (newId: string) => {
    setShowTemplateModal(false);
    navigate(`/admin/screens/${newId}`);
  };

  const handleCreateNew = () => {
    setShowTemplateModal(false);
    navigate('/admin/screens/new');
  };

  const limits = organization ? getEffectivePlanLimits(organization, planConfigs) : { screens: 1, seats: 1 };
  const planLimit = limits.screens;
  const isLimitReached = planLimit !== -1 && screens.length >= planLimit;

  if (loading) return <div className="text-text">Loading screens...</div>;

  if (!organization?.id) {
    return <div className="text-text">Organization not loaded. Please refresh or re-login.</div>;
  }

  return (
    <div className="p-8">
      {showTemplateModal && (
        <TemplateSelectorModal 
          type="screen" 
          onClose={handleCreateNew} 
          onImport={handleTemplateImport} 
        />
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-text">Screens</h2>
          <p className="text-text-muted text-sm mt-1">
            {planLimit === -1 
              ? `Using ${screens.length} screens (Unlimited)` 
              : `Using ${screens.length} of ${planLimit} available screens`}
          </p>
        </div>
        <button
          onClick={() => setShowTemplateModal(true)}
          disabled={isLimitReached}
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
            isLimitReached 
              ? 'bg-surface-highlight text-text-muted cursor-not-allowed' 
              : 'bg-primary text-white hover:bg-primary-hover'
          }`}
          title={isLimitReached ? `Upgrade to ${organization?.plan === 'Free' ? 'Growth' : 'Enterprise'} to add more screens` : 'Add New Screen'}
        >
          {isLimitReached ? <Lock size={20} /> : <Plus size={20} />}
          Add Screen
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {screens.map((screen) => (
          <div
            key={screen.id}
            onClick={() => navigate(`/admin/screens/${screen.id}`)}
            className="bg-surface border border-surface-highlight rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-all group relative"
          >
             <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => handleDelete(e, screen.id)}
                className="p-2 text-text-muted hover:text-error hover:bg-surface-highlight rounded-full"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-surface-highlight/30 rounded-lg text-primary">
                <Monitor size={32} />
              </div>
              <div className="flex flex-col gap-2 items-end">
                <div className={`px-2 py-1 rounded text-xs font-medium ${screen.isActive ? 'bg-success/20 text-success' : 'bg-text-muted/20 text-text-muted'}`}>
                  {screen.isActive ? 'Enabled' : 'Disabled'}
                </div>
                {isScreenLive(screen) && (
                   <div className="flex items-center gap-1.5 text-xs font-medium text-success animate-pulse">
                     <Wifi size={14} />
                     <span>Live</span>
                   </div>
                )}
                {!isScreenLive(screen) && (
                   <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted opacity-50">
                     <WifiOff size={14} />
                     <span>Offline</span>
                   </div>
                )}
              </div>
            </div>

            <h3 className="text-xl font-bold text-text mb-2">{screen.name}</h3>
            
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm text-text-muted">
                <span className="flex items-center gap-1"><MapPin size={12} /> Location:</span>
                <span className="font-medium text-text">{locationMap[screen.locationId] || screen.locationId || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between text-sm text-text-muted">
                <span>Effective Display:</span>
                <div className="flex items-center gap-2">
                  <span className="capitalize font-medium text-text">{screen.orientation}</span>
                  {screen.rotation ? (
                    <span className="px-1.5 py-0.5 bg-surface-highlight border border-surface-highlight rounded text-[10px] font-mono text-text-muted">
                      {screen.rotation}°
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex justify-between text-sm text-text-muted">
                <span>Playlist:</span>
                <span>{screen.livePlaylist?.length || 0} slides</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeployingScreen(screen);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary hover:bg-primary-hover rounded text-sm text-white transition-colors"
              >
                <Rocket size={16} />
                Deploy
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/player/${screen.id}`, '_blank');
                }}
                className="flex items-center justify-center p-2 bg-surface-highlight hover:bg-surface-highlight/80 rounded text-text transition-colors"
                title="Preview Player"
              >
                <ExternalLink size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/screens/${screen.id}`);
                }}
                className="flex items-center justify-center p-2 bg-surface-highlight hover:bg-surface-highlight/80 rounded text-text transition-colors"
                title="Screen Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>
        ))}

        {screens.length === 0 && (
          <div className="col-span-full py-12 text-center text-text-muted border-2 border-dashed border-surface-highlight rounded-lg">
            <Monitor size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No screens found</p>
            <p className="text-sm">Create your first screen to get started</p>
          </div>
        )}
      </div>

      {deployingScreen && (
        <DeployModal 
          screen={deployingScreen} 
          onClose={() => setDeployingScreen(null)} 
        />
      )}
    </div>
  );
};
