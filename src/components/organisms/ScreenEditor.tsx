import { AccessibleDialog } from '../atoms/AccessibleDialog';
import { InlineFeedback } from '../atoms/InlineFeedback';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDrag, useDrop } from 'react-dnd';
import type { XYCoord } from 'dnd-core';
import { ScreenService } from '../../services/screenService';
import { SlideService } from '../../services/slideService';
import { TemplateService } from '../../services/templateService';
import { LocationService } from '../../services/locationService';
import { useAuthStore } from '../../store/useAuthStore';
import { Save, ArrowLeft, Plus, X, GripVertical, Play, RotateCw, RotateCcw, Settings, ArrowUp, ArrowDown } from 'lucide-react';
import type { AppScreen, Slide, Location, PlaylistEntry, ScreenAdjustments } from '../../types/schema';
import { Timestamp } from 'firebase/firestore';
import { normalizePlaylist } from '../../utils/playlist';

// Internal state for playlist items: slide data + per-slide overrides
interface PlaylistItemData {
  key: string;
  slide: Slide;
  duration?: number;
  transition?: 'fade' | 'slide' | 'none';
  screenAdjustments?: ScreenAdjustments;
}

const PLAYLIST_ITEM_TYPE = 'PLAYLIST_ITEM';

interface PlaylistDragItem {
  index: number;
  type: typeof PLAYLIST_ITEM_TYPE;
}

// Helper component for playlist item with per-slide overrides
const PlaylistItem = ({ 
  item, 
  onRemove, 
  onUpdate,
  onMove,
  index,
  total,
  globalDuration,
  globalTransition,
  onSlideClick
}: { 
  item: PlaylistItemData;
  onRemove: () => void;
  onUpdate: (updates: Partial<PlaylistItemData>) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  index: number;
  total: number;
  globalDuration: number;
  globalTransition: 'fade' | 'slide' | 'none';
  onSlideClick: (slideId: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const itemRef = useRef<HTMLDivElement | null>(null);
  const { slide } = item;
  const hasOverrides = item.duration !== undefined || item.transition !== undefined || item.screenAdjustments !== undefined;

  const [{ isDragging }, drag] = useDrag<PlaylistDragItem, void, { isDragging: boolean }>(() => ({
    type: PLAYLIST_ITEM_TYPE,
    item: { index, type: PLAYLIST_ITEM_TYPE },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [index]);

  const [, drop] = useDrop<PlaylistDragItem>(() => ({
    accept: PLAYLIST_ITEM_TYPE,
    hover(draggedItem, monitor) {
      if (!itemRef.current) return;

      const dragIndex = draggedItem.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = itemRef.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();

      if (!clientOffset) return;

      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      onMove(dragIndex, hoverIndex);
      draggedItem.index = hoverIndex;
    },
  }), [index, onMove]);

  const setDropRef = useCallback((node: HTMLDivElement | null) => {
    itemRef.current = node;
    if (node) drop(node);
  }, [drop]);

  return (
    <div
      ref={setDropRef}
      role="group" aria-label={`Playlist entry ${index + 1}: ${slide.name}`}
      className="bg-surface border border-surface-highlight rounded mb-2 group"
      style={{ opacity: isDragging ? 0.45 : 1 }}
    >
      <div className="flex flex-wrap items-center gap-3 p-3">
        <div ref={drag} className="cursor-move text-text-muted hover:text-text">
          <GripVertical size={20} />
        </div>
        <div aria-hidden="true"
          className="w-16 h-9 bg-black/50 rounded overflow-hidden flex-shrink-0 relative cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          title="Click to edit this slide"
        >
          {slide.backgroundImageUrl ? (
            <img src={slide.backgroundImageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted text-[10px]">
              No Preview
            </div>
          )}
        </div>
        <div className="flex-1">
          <h4><button type="button" onClick={() => onSlideClick(slide.id)} className="text-left font-medium text-text hover:text-primary" aria-label={`Edit ${slide.name}`}>{slide.name}</button></h4>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${slide.orientation === 'portrait' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
              {slide.orientation === 'portrait' ? 'Portrait' : 'Landscape'}
            </span>
            {hasOverrides ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-primary/10 text-primary border-primary/20">
                {[
                  item.duration !== undefined && 'Duration',
                  item.transition !== undefined && 'Transition',
                  item.screenAdjustments !== undefined && 'Display'
                ].filter(Boolean).join(', ')} Override{hasOverrides && (item.duration !== undefined ? 1 : 0) + (item.transition !== undefined ? 1 : 0) + (item.screenAdjustments !== undefined ? 1 : 0) > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-[10px] text-text-muted">Using Global Settings</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">{index + 1} of {total}</span>
          <button type="button" onClick={() => onMove(index, index - 1)} disabled={index === 0} aria-label={`Move ${slide.name} up`} className="ui-button ui-button-secondary p-2"><ArrowUp size={16} aria-hidden="true" /></button>
          <button type="button" onClick={() => onMove(index, index + 1)} disabled={index === total - 1} aria-label={`Move ${slide.name} down`} className="ui-button ui-button-secondary p-2"><ArrowDown size={16} aria-hidden="true" /></button>
          <button
            aria-label={`Settings for ${slide.name}`} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}
            className={`p-1 rounded transition-colors ${expanded ? 'bg-primary/20 text-primary' : 'hover:bg-surface-highlight text-text-muted hover:text-text'}`}
            title="Slide Settings"
          >
            <Settings size={16} />
          </button>
          <button 
            aria-label={`Remove ${slide.name} from playlist`} onClick={onRemove}
            className="p-1 hover:bg-surface-highlight rounded text-text-muted hover:text-error transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-surface-highlight mx-3 mt-1">
          <div className="mb-3 pb-2 border-b border-surface-highlight/50">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Per-Slide Overrides (Optional)</p>
            <p className="text-[10px] text-text-muted mt-1">Override global settings for this specific slide</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-muted flex items-center justify-between">
                <span>Duration (ms)</span>
                {item.duration !== undefined && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">Override</span>}
              </label>
              <input
                aria-label={`Duration for ${slide.name} in milliseconds`}
                type="number"
                value={item.duration ?? ''}
                onChange={(e) => onUpdate({ duration: e.target.value ? Number(e.target.value) : undefined })}
                placeholder={`Use global (${globalDuration}ms)`}
                step={1000}
                min={1000}
                className={`w-full border rounded px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none ${
                  item.duration !== undefined 
                    ? 'bg-primary/5 border-primary/30' 
                    : 'bg-background border-surface-highlight'
                }`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-muted flex items-center justify-between">
                <span>Transition</span>
                {item.transition !== undefined && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">Override</span>}
              </label>
              <select
                aria-label={`Transition for ${slide.name}`}
                value={item.transition ?? ''}
                onChange={(e) => onUpdate({ transition: e.target.value ? e.target.value as 'fade' | 'slide' | 'none' : undefined })}
                className={`w-full border rounded px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none ${
                  item.transition !== undefined 
                    ? 'bg-primary/5 border-primary/30' 
                    : 'bg-background border-surface-highlight'
                }`}
              >
                <option value="">Use global ({globalTransition === 'fade' ? 'Cross Fade' : globalTransition === 'slide' ? 'Slide' : 'None'})</option>
                <option value="fade">Cross Fade</option>
                <option value="slide">Slide</option>
                <option value="none">None (Instant)</option>
              </select>
            </div>
          </div>

          <div className="border-t border-surface-highlight pt-3 mt-3">
            <p className="text-[11px] font-semibold text-text-muted mb-2 uppercase tracking-wide flex items-center justify-between">
              <span>Screen Adjustments</span>
              {item.screenAdjustments && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">Override</span>}
            </p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-muted">Scale</label>
                <input aria-label="Scale"
                  type="number"
                  value={item.screenAdjustments?.scale ?? ''}
                  onChange={(e) => onUpdate({ screenAdjustments: { ...item.screenAdjustments, scale: e.target.value ? Number(e.target.value) : undefined } })}
                  placeholder="1.0"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  className="w-full bg-background border border-surface-highlight rounded px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-muted">Offset X</label>
                <input aria-label="Offset X"
                  type="number"
                  value={item.screenAdjustments?.offsetX ?? ''}
                  onChange={(e) => onUpdate({ screenAdjustments: { ...item.screenAdjustments, offsetX: e.target.value ? Number(e.target.value) : undefined } })}
                  placeholder="0"
                  min="-1000"
                  max="1000"
                  className="w-full bg-background border border-surface-highlight rounded px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-muted">Offset Y</label>
                <input aria-label="Offset Y"
                  type="number"
                  value={item.screenAdjustments?.offsetY ?? ''}
                  onChange={(e) => onUpdate({ screenAdjustments: { ...item.screenAdjustments, offsetY: e.target.value ? Number(e.target.value) : undefined } })}
                  placeholder="0"
                  min="-1000"
                  max="1000"
                  className="w-full bg-background border border-surface-highlight rounded px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={() => onUpdate({ screenAdjustments: undefined })}
              className="w-full py-1 bg-surface-highlight hover:bg-surface-highlight/80 rounded text-xs text-text-muted transition-colors"
            >
              Clear Adjustments (Use Global)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ScreenEditor = ({
  initialData,
  onSave,
  isTemplateMode = false
}: {
  initialData?: AppScreen;
  onSave?: (screen: AppScreen) => Promise<void>;
  isTemplateMode?: boolean;
}) => {
  const { screenId } = useParams();
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  const isNew = !screenId;

  const [loading, setLoading] = useState(true);
  const [availableSlides, setAvailableSlides] = useState<Slide[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  // Form State
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [isActive, setIsActive] = useState(true);
  const [rotationMs, setRotationMs] = useState(10000);
  const [transition, setTransition] = useState<'fade' | 'slide' | 'none'>('fade');
  const [playlist, setPlaylist] = useState<PlaylistItemData[]>([]);
  const [screenAdjustments, setScreenAdjustments] = useState<ScreenAdjustments>({ scale: 1.0, offsetX: 0, offsetY: 0 });
  
  // Slide navigation confirmation modal
  const [confirmNavigateSlideId, setConfirmNavigateSlideId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        let slides: Slide[] = [];

        // Fetch locations if we have an org
        if (organization?.id) {
          try {
            const locs = await LocationService.getLocations(organization.id);
            setLocations(locs);
            if (locs.length > 0 && isNew) {
               setLocationId(current => current || locs[0].id);
            }
          } catch (err) {
            console.error('Failed to fetch locations', err);
          }
        }

        if (isTemplateMode) {
          // In template mode, fetch Slide Templates and map them to Slides
          const templates = await TemplateService.getTemplates();
          // Filter only slide templates and mapping them
          slides = templates
            .filter(t => t.type === 'slide')
            .map(t => {
              const content = t.content as Partial<Slide>;
              return {
                id: t.id,
                orgId: content.orgId || 'template',
                name: t.name,
                dimensions: content.dimensions || { width: 1920, height: 1080 },
                backgroundColor: content.backgroundColor || '#000000',
                elements: content.elements || [],
                createdAt: content.createdAt || Timestamp.now(),
                updatedAt: content.updatedAt || Timestamp.now(),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                backgroundImageUrl: t.thumbnailUrl || (t.content as any).backgroundImageUrl,
                particleConfig: content.particleConfig,
                duration: content.duration
              } as Slide;
            });
          
          if (initialData) {
            setName(initialData.name);
            setLocationId(initialData.locationId);
            setRotation(initialData.rotation || 0);
            setIsActive(initialData.isActive);
            setRotationMs(initialData.rotationSettings.rotationMs);
            setTransition(initialData.rotationSettings.transition);
            if (initialData.screenAdjustments) setScreenAdjustments(initialData.screenAdjustments);
            
            // Map playlist entries back to the slide objects (which are templates now)
            const entries = normalizePlaylist(initialData.livePlaylist || []);
            const currentPlaylist: PlaylistItemData[] = [];
            for (const entry of entries) {
              const slide = slides.find(s => s.id === entry.slideId);
              if (slide) currentPlaylist.push({ key: crypto.randomUUID(), slide, duration: entry.duration, transition: entry.transition, screenAdjustments: entry.screenAdjustments });
            }
            setPlaylist(currentPlaylist);
          } else {
             // Default init for new template
             setName('New Screen Template');
          }
        } else {
          // Normal mode
          if (!organization) return;
          slides = await SlideService.getSlides(organization.id);
          
          if (!isNew && screenId) {
            const screen = await ScreenService.getScreen(screenId);
            if (screen) {
              setName(screen.name);
              setLocationId(screen.locationId);
              setRotation(screen.rotation || 0);
              setIsActive(screen.isActive);
              setRotationMs(screen.rotationSettings.rotationMs);
              setTransition(screen.rotationSettings.transition);
              if (screen.screenAdjustments) setScreenAdjustments(screen.screenAdjustments);
              
              const entries = normalizePlaylist(screen.livePlaylist || []);
              const currentPlaylist: PlaylistItemData[] = [];
              for (const entry of entries) {
                const slide = slides.find(s => s.id === entry.slideId);
                if (slide) currentPlaylist.push({ key: crypto.randomUUID(), slide, duration: entry.duration, transition: entry.transition, screenAdjustments: entry.screenAdjustments });
              }
              setPlaylist(currentPlaylist);
            }
          }
        }
        setAvailableSlides(slides);
      } catch (error) {
        console.error("Failed to init screen editor:", error);
        setError("Screen details could not be loaded. Reload before editing this screen.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [screenId, isNew, organization, isTemplateMode, initialData]);

  const handleSave = async () => {
    if (saving) return;
    setError(null);
    if (!name.trim()) { setError('Enter a screen name before saving.'); return; }
    if (!isTemplateMode && !organization) {
      console.error('Cannot save: Organization context missing');
      setError('Your organization is not available. Reload or sign in again.');
      return;
    }
    
    setSaving(true);
    try {
      const screenData: AppScreen = {
        id: isTemplateMode ? (initialData?.id || 'template-draft') : (screenId || 'new'),
        createdAt: isTemplateMode ? (initialData?.createdAt || Timestamp.now()) : Timestamp.now(), // This might be overwritten by service
        orgId: isTemplateMode ? 'template' : organization!.id,
        name,
        locationId,
        orientation: (rotation === 90 || rotation === 270) ? 'portrait' : 'landscape',
        rotation,
        isActive,
        livePlaylist: playlist.map(item => {
          const entry: PlaylistEntry = { slideId: item.slide.id };
          if (item.duration !== undefined) entry.duration = item.duration;
          if (item.transition !== undefined) entry.transition = item.transition;
          if (item.screenAdjustments) entry.screenAdjustments = item.screenAdjustments;
          return entry;
        }),
        rotationSettings: {
          algorithm: 'loop' as const,
          transition,
          rotationMs
        },
        screenAdjustments
      };

      if (isTemplateMode && onSave) {
        await onSave(screenData);
      } else if (isNew) {
        // Omit id/createdAt for creation as service handles it
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, createdAt, ...createData } = screenData;
        await ScreenService.createScreen(createData);
        navigate('/admin/screens');
      } else if (screenId) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, createdAt, ...updateData } = screenData;
        await ScreenService.updateScreen(screenId, updateData);
        navigate('/admin/screens');
      }
    } catch (error) {
      console.error('Failed to save screen:', error);
      setError('Screen changes could not be saved. Your edits are still here. Try Save again.');
    } finally {
      setSaving(false);
    }
  };

  const addToPlaylist = (slide: Slide) => {
    setPlaylist([...playlist, { key: crypto.randomUUID(), slide }]);
    setMessage(`${slide.name} added to playlist. Save to apply changes.`);
  };

  const updatePlaylistItem = (index: number, updates: Partial<PlaylistItemData>) => {
    const newPlaylist = [...playlist];
    newPlaylist[index] = { ...newPlaylist[index], ...updates };
    setPlaylist(newPlaylist);
  };

  const removeFromPlaylist = (index: number) => {
    const newPlaylist = [...playlist];
    newPlaylist.splice(index, 1);
    setPlaylist(newPlaylist);
  };

  const movePlaylistItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex !== toIndex && playlist[fromIndex] && toIndex >= 0 && toIndex < playlist.length) setMessage(`${playlist[fromIndex].slide.name} moved to position ${toIndex + 1}. Save to apply changes.`);
    setPlaylist((prev) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }

      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  if (loading) return <div role="status" className="text-text p-8">Loading editor...</div>;

  return (
    <div className={`flex flex-col bg-background ${isTemplateMode ? 'h-full' : 'h-full'}`}>
      {/* Header */}
      {!isTemplateMode ? (
        <div className="min-h-16 py-2 gap-3 flex-wrap border-b border-surface-highlight bg-surface px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              aria-label="Back to screens" onClick={() => navigate('/admin/screens')}
              className="p-2 hover:bg-surface-highlight rounded-full text-text-muted hover:text-text transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-text">
              {isNew ? 'New Screen' : 'Edit Screen'}
            </h2>
          </div>
          <button
            disabled={saving} onClick={() => void handleSave()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors"
          >
            <Save size={18} />
            {saving ? 'Saving…' : 'Save screen'}
          </button>
        </div>
      ) : (
        <div className="bg-surface border-b border-surface-highlight px-6 py-4 flex items-center justify-between mb-6 sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-text">Screen Template</h2>
            <p className="text-xs text-text-muted">Configure default playlist and settings</p>
          </div>
          <button
            disabled={saving} onClick={() => void handleSave()}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md transition-colors text-sm"
          >
            <Save size={16} />
            <span>{saving ? 'Saving…' : 'Save changes'}</span>
          </button>
        </div>
      )}

      <div className="px-4 sm:px-6"><InlineFeedback message={error} tone="error" /><InlineFeedback message={message} /></div>
      <p className="px-4 sm:px-6 py-2 text-sm text-text-secondary">Saving updates the playlist used by this screen.</p>
      <div className="screen-workspace flex-1 min-w-0 flex overflow-hidden">
        {/* Main Settings */}
        <div className="flex-1 min-w-0 p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Basic Info */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-text border-b border-surface-highlight pb-2">Basic Information</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Screen Name</label>
                  <input aria-label="Screen Name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Main Lobby Display"
                    className="w-full bg-background border border-surface-highlight rounded p-2 text-text focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Location</label>
                  {locations.length > 0 ? (
                    <select
                      aria-label="Location" value={locationId}
                      onChange={(e) => setLocationId(e.target.value)}
                      className="w-full bg-background border border-surface-highlight rounded p-2 text-text focus:border-primary focus:outline-none"
                    >
                      <option value="">Select a location</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        aria-label="Location" value={locationId || 'default-location'}
                        disabled
                        className="flex-1 bg-background border border-surface-highlight rounded p-2 text-text-muted cursor-not-allowed"
                      />
                      <div className="text-xs text-warning flex items-center">
                        No locations found. 
                      </div>
                    </div>
                  )}
                  {locations.length === 0 && !isTemplateMode && (
                     <p className="text-xs text-text-muted">
                       Go to Organization Settings {'>'} Locations to add locations.
                     </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-text-secondary">Screen Rotation</label>
                    <span className="text-xs text-text-muted">
                      Effective: <span className="font-medium text-text">{(rotation === 90 || rotation === 270) ? 'Portrait' : 'Landscape'}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button aria-label="Rotate Left 90°"
                      onClick={() => setRotation((prev) => (prev - 90 < 0 ? 270 : prev - 90) as 0 | 90 | 180 | 270)}
                      className="p-2 bg-surface-highlight hover:bg-primary/20 hover:text-primary rounded text-text-muted transition-colors"
                      title="Rotate Left 90°"
                    >
                      <RotateCcw size={18} />
                    </button>
                    <div className="flex-1 text-center bg-background border border-surface-highlight rounded p-2 text-text font-mono">
                      {rotation}°
                    </div>
                    <button aria-label="Rotate Right 90°"
                      onClick={() => setRotation((prev) => (prev + 90 >= 360 ? 0 : prev + 90) as 0 | 90 | 180 | 270)}
                      className="p-2 bg-surface-highlight hover:bg-primary/20 hover:text-primary rounded text-text-muted transition-colors"
                      title="Rotate Right 90°"
                    >
                      <RotateCw size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Status</label>
                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={isActive}
                        onChange={() => setIsActive(true)}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-text">Enabled</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!isActive}
                        onChange={() => setIsActive(false)}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-text">Disabled</span>
                    </label>
                  </div>
                </div>
              </div>
            </section>

            {/* Playback Settings */}
            <section className="space-y-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-text border-b border-surface-highlight pb-2">Global Playback Settings</h3>
                  <p className="text-xs text-text-muted mt-2">Default settings applied to all slides unless overridden per-slide</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Slide Duration (ms)</label>
                  <input aria-label="Slide Duration (ms)"
                    type="number"
                    value={rotationMs}
                    onChange={(e) => setRotationMs(Number(e.target.value))}
                    step={1000}
                    min={1000}
                    className="w-full bg-background border border-surface-highlight rounded p-2 text-text focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Transition Effect</label>
                  <select aria-label="Transition Effect"
                    value={transition}
                    onChange={(e) => setTransition(e.target.value as 'fade' | 'slide' | 'none')}
                    className="w-full bg-background border border-surface-highlight rounded p-2 text-text focus:border-primary focus:outline-none"
                  >
                    <option value="fade">Cross Fade</option>
                    <option value="slide">Slide</option>
                    <option value="none">None (Instant)</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Display Adjustments */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-text border-b border-surface-highlight pb-2">Display Adjustments</h3>
              <p className="text-sm text-text-muted">Correct content positioning and scale for this TV or display. These apply globally to all slides unless overridden per slide.</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-text-secondary">Scale</label>
                    <span className="text-sm text-text-muted font-mono">{(screenAdjustments.scale ?? 1.0).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={screenAdjustments.scale ?? 1.0}
                    onChange={(e) => setScreenAdjustments(prev => ({ ...prev, scale: Number(e.target.value) }))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>0.5x (zoom out)</span>
                    <span>1.0x (default)</span>
                    <span>2.0x (zoom in)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Offset X (px)</label>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setScreenAdjustments(prev => ({ ...prev, offsetX: Math.max(-1000, (prev.offsetX ?? 0) - 5) }))}
                        className="px-2 py-1.5 bg-surface-highlight hover:bg-primary/20 hover:text-primary rounded text-text-muted text-xs transition-colors flex-shrink-0"
                      >-5</button>
                      <input
                        type="number"
                        value={screenAdjustments.offsetX ?? 0}
                        onChange={(e) => setScreenAdjustments(prev => ({ ...prev, offsetX: Math.max(-1000, Math.min(1000, Number(e.target.value) || 0)) }))}
                        min="-1000"
                        max="1000"
                        className="flex-1 bg-background border border-surface-highlight rounded p-2 text-text focus:border-primary focus:outline-none text-center text-sm"
                      />
                      <button
                        onClick={() => setScreenAdjustments(prev => ({ ...prev, offsetX: Math.min(1000, (prev.offsetX ?? 0) + 5) }))}
                        className="px-2 py-1.5 bg-surface-highlight hover:bg-primary/20 hover:text-primary rounded text-text-muted text-xs transition-colors flex-shrink-0"
                      >+5</button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Offset Y (px)</label>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setScreenAdjustments(prev => ({ ...prev, offsetY: Math.max(-1000, (prev.offsetY ?? 0) - 5) }))}
                        className="px-2 py-1.5 bg-surface-highlight hover:bg-primary/20 hover:text-primary rounded text-text-muted text-xs transition-colors flex-shrink-0"
                      >-5</button>
                      <input
                        type="number"
                        value={screenAdjustments.offsetY ?? 0}
                        onChange={(e) => setScreenAdjustments(prev => ({ ...prev, offsetY: Math.max(-1000, Math.min(1000, Number(e.target.value) || 0)) }))}
                        min="-1000"
                        max="1000"
                        className="flex-1 bg-background border border-surface-highlight rounded p-2 text-text focus:border-primary focus:outline-none text-center text-sm"
                      />
                      <button
                        onClick={() => setScreenAdjustments(prev => ({ ...prev, offsetY: Math.min(1000, (prev.offsetY ?? 0) + 5) }))}
                        className="px-2 py-1.5 bg-surface-highlight hover:bg-primary/20 hover:text-primary rounded text-text-muted text-xs transition-colors flex-shrink-0"
                      >+5</button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setScreenAdjustments({ scale: 1.0, offsetX: 0, offsetY: 0 })}
                  className="w-full py-2 bg-surface-highlight hover:bg-surface-highlight/80 rounded text-text font-medium transition-colors text-sm"
                >
                  Reset to Default (Center Screen)
                </button>
              </div>
            </section>

            {/* Playlist Management */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-text border-b border-surface-highlight pb-2 flex justify-between items-center">
                <span>Playlist</span>
                <span className="text-sm font-normal text-text-muted">{playlist.length} slides</span>
              </h3>

              <div className="min-h-[200px] bg-background/50 border-2 border-dashed border-surface-highlight rounded-lg p-4">
                {playlist.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-text-muted py-8">
                    <Play size={32} className="mb-2 opacity-50" />
                    <p>Playlist is empty</p>
                    <p className="text-sm">Select slides from the sidebar to add them</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {playlist.map((item, idx) => (
                      <PlaylistItem 
                        key={item.key}
                        item={item} 
                        index={idx}
                        total={playlist.length}
                        onRemove={() => removeFromPlaylist(idx)}
                        onUpdate={(updates) => updatePlaylistItem(idx, updates)}
                        onMove={movePlaylistItem}
                        globalDuration={rotationMs}
                        globalTransition={transition}
                        onSlideClick={(slideId) => setConfirmNavigateSlideId(slideId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Sidebar: Available Slides */}
        <div className="screen-library w-80 shrink-0 bg-surface border-l border-surface-highlight flex flex-col">
          <div className="p-4 border-b border-surface-highlight">
            <h3 className="font-semibold text-text">Available Slides</h3>
            <p className="text-xs text-text-muted">Add a slide, then use Move up or Move down to reorder.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {availableSlides.map(slide => (
              <div key={slide.id} className="bg-background border border-surface-highlight rounded p-3 group hover:border-primary/50 transition-colors">
                <div className="aspect-video bg-black/50 rounded mb-2 overflow-hidden relative">
                   {slide.backgroundImageUrl && (
                    <img src={slide.backgroundImageUrl} alt="" className="w-full h-full object-cover opacity-50" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <button
                      aria-label={`Add ${slide.name} to playlist`} onClick={() => addToPlaylist(slide)}
                      className="p-2 bg-primary text-white rounded-full hover:bg-primary-hover transform hover:scale-110 transition-all"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-text text-sm">{slide.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${slide.orientation === 'portrait' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                        {slide.orientation === 'portrait' ? 'Portrait' : 'Landscape'}
                      </span>
                      <p className="text-[10px] text-text-muted">{new Date(slide.updatedAt?.seconds * 1000).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {confirmNavigateSlideId && <AccessibleDialog title="Leave screen editor?" description="Unsaved screen changes will be lost. Cancel to save them first." onClose={() => setConfirmNavigateSlideId(null)} closeLabel="Cancel">
        <button type="button" className="ui-button ui-button-danger" onClick={() => navigate(`/admin/slides/${confirmNavigateSlideId}`)}>Leave without saving</button>
      </AccessibleDialog>}
    </div>
  );
};
