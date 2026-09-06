import { InlineFeedback } from '../atoms/InlineFeedback';
import { TilePlacementControls } from '../molecules/TilePlacementControls';
import { getDefaultTileProperties, moveTileWithKey } from '../../utils/editorGeometry';
import { STORAGE_PATHS } from '../../lib/constants';
import { getEmptyImage } from 'react-dnd-html5-backend';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDrag, useDrop, type DropTargetMonitor } from 'react-dnd';
import type { XYCoord } from 'dnd-core';
import { useParams, useNavigate } from 'react-router-dom';
import { SlideService } from '../../services/slideService';
import { StorageService } from '../../services/storageService';
import { useAuthStore } from '../../store/useAuthStore';
import { useConfigStore } from '../../store/useConfigStore';
import { AtmosphereCanvas } from '../atoms/AtmosphereCanvas';
import { TileContent } from '../atoms/TileContent';
import { CustomDragLayer } from '../atoms/CustomDragLayer';
import { ErrorBoundary } from '../atoms/ErrorBoundary';
import type { 
  Slide, 
  TileInstance, 
  ParticleConfig, 
  TextShadowProps,
  TextShadowTileProperties,
  BaseTextProperties,
  TextTileProperties,
  DynamicTextProperties,
  ScrollingTextProperties,
  RichTextProperties,
  MarqueeProperties,
  WordArtProperties,
  GradientTextProperties,
  AnimatedTextProperties,
  ImageTileProperties,
  VideoTileProperties,
  SlideshowTileProperties,
  ChartProperties,
  PieChartProperties,
  GaugeProperties,
  TableTileProperties,
  KPICardProperties,
  ProgressBarProperties,
  HeatmapProperties,
  TimelineProperties,
  InteractiveTileProperties,
  LayoutTileProperties,
  SpecialTileProperties,
  SparklineProperties,
  DataTileSourceProperties,
  WebcamTileProperties
} from '../../types/schema';
import { 
  Type, 
  Image as ImageIcon, 
  Video, 
  BarChart, 
  ArrowLeft, 
  Save, 
  Trash2, 
  Copy,
  Layers, 
  Move, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Layout,
  Settings,
  Activity,
  MousePointer2,
  Wind,
  Upload,
  QrCode,
  Timer,
  FileText,
  ListChecks,
  MessageSquare,
  CloudSun,
  Utensils,
  Megaphone,
  CreditCard,
  Clock,
  Calendar as CalendarIcon,
  Rss,
  MapPin,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize,
  ChevronRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

// Item types for DnD
const ItemTypes = {
  TILE: 'tile',
  CANVAS_TILE: 'CANVAS_TILE',
};
const TEXT_TILES = ['text', 'dynamic_text', 'scrolling_text', 'rich_text', 'marquee', 'typewriter', 'word_art', 'gradient_text', 'animated_text', 'text_shadow'];
const MEDIA_TILES = ['image', 'video', 'gif', 'lottie', 'audio', 'slideshow', 'webcam', 'youtube', 'vimeo', 'background_video'];
const DATA_TILES = ['bar_chart', 'line_chart', 'pie_chart', 'gauge', 'table', 'kpi_card', 'progress_bar', 'heatmap', 'sparklines', 'timeline'];
const INTERACTIVE_TILES = ['button', 'qr_code', 'countdown', 'form', 'poll', 'social_feed', 'weather', 'menu_selector', 'promotion_banner', 'loyalty_card'];
const LAYOUT_TILES = ['container', 'divider', 'grid', 'flex', 'tabs', 'accordion', 'carousel', 'sticky_note', 'shape', 'frame'];
const SPECIAL_TILES = ['clock', 'calendar', 'rss_feed', 'social_proof', 'testimonial', 'stock_ticker', 'menu_item', 'special_offer', 'event_countdown', 'map'];

const isTextTile = (type: string) => TEXT_TILES.includes(type);
const isMediaTile = (type: string) => MEDIA_TILES.includes(type);
const isDataTile = (type: string) => DATA_TILES.includes(type);
const isInteractiveTile = (type: string) => INTERACTIVE_TILES.includes(type);
const isLayoutTile = (type: string) => LAYOUT_TILES.includes(type);
const isSpecialTile = (type: string) => SPECIAL_TILES.includes(type);

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const MIN_TILE_SIZE = 20;
const TILE_EDGE_MARGIN = 10;

const clampTilePosition = (
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number
) => {
  const clampedX = Math.min(
    canvasWidth - width + TILE_EDGE_MARGIN,
    Math.max(-TILE_EDGE_MARGIN, x)
  );
  const clampedY = Math.min(
    canvasHeight - height + TILE_EDGE_MARGIN,
    Math.max(-TILE_EDGE_MARGIN, y)
  );

  return {
    x: Math.round(clampedX),
    y: Math.round(clampedY),
  };
};

const getSlideSaveSignature = (currentSlide: Slide) => JSON.stringify({
  name: currentSlide.name,
  elements: currentSlide.elements,
  backgroundColor: currentSlide.backgroundColor,
  dimensions: currentSlide.dimensions,
  orientation: currentSlide.orientation,
  backgroundImageUrl: currentSlide.backgroundImageUrl ?? '',
  particleConfig: currentSlide.particleConfig ?? null,
});

interface DragItem {
  id?: string;
  type: TileInstance['type'];
  left?: number;
  top?: number;
}

interface DraggableTileProps {
  type: TileInstance['type'];
  icon: React.ReactNode;
  label: string;
  onAdd: (type: TileInstance['type']) => void;
  search: string;
}

const DraggableTile = ({ type, icon, label, onAdd, search }: DraggableTileProps) => {
  const { organization } = useAuthStore();
  const { planConfigs } = useConfigStore();
  
  // Fallback to Free plan config if organization plan is invalid or missing
  const planConfig = organization 
    ? (planConfigs[organization.plan] || planConfigs['Free']) 
    : planConfigs['Free'];
    
  const isAllowed = planConfig?.allowedTiles?.includes(type) ?? false;


  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: ItemTypes.TILE,
    item: { type },
    options: { dropEffect: 'copy' },
    canDrag: isAllowed,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [type, isAllowed]);

  const dragRef = useCallback((node: HTMLButtonElement | null) => {
    if (node) drag(node);
  }, [drag]);

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);


  if (!label.toLowerCase().includes(search.toLowerCase())) return null;
  return (
    <button
      type="button"
      aria-label={`Add ${label} tile${isAllowed ? '' : ' (plan upgrade required)'}`}
      aria-disabled={!isAllowed}
      onClick={() => { if (isAllowed) onAdd(type); }}
      ref={dragRef}
      className={`w-full text-left flex items-center gap-3 p-3 bg-surface border rounded-lg transition-all ${
        !isAllowed 
          ? 'opacity-50 cursor-not-allowed border-surface-highlight grayscale' 
          : `cursor-pointer hover:border-primary/50 hover:bg-surface-highlight/10 border-surface-highlight ${isDragging ? 'opacity-50' : 'opacity-100'}`
      } select-none`}
      title={!isAllowed ? `Upgrade to ${organization?.plan === 'Free' ? 'Growth' : 'Enterprise'} to unlock` : label}
    >
      <span className="text-primary pointer-events-none">{icon}</span>
      <span className="flex-1 flex items-center justify-between pointer-events-none select-none">
        <span className="text-sm font-medium text-text select-none">{label}</span>
        {!isAllowed && <Lock size={12} className="text-text-muted" />}
      </span>
    </button>
  );
};

interface CanvasTileProps {
  tile: TileInstance;
  isSelected: boolean;
  scale: number;
  canvasDimensions: { width: number; height: number };
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<TileInstance>) => void;
}

const CanvasTile = ({ tile, isSelected, scale, canvasDimensions, onSelect, onUpdate }: CanvasTileProps) => {
  const [resizing, setResizing] = useState<{ direction: string; startX: number; startY: number; startWidth: number; startHeight: number; startLeft: number; startTop: number } | null>(null);

  const positionRef = useRef(tile.position);

  useEffect(() => {
    positionRef.current = tile.position;
  }, [tile.position]);

  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: ItemTypes.CANVAS_TILE,
    item: () => ({ id: tile.id, left: positionRef.current.x, top: positionRef.current.y }),
    options: { dropEffect: 'move' },
    canDrag: !tile.locked && !resizing,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [tile.id, tile.locked, resizing]);

  const dragRef = useCallback((node: HTMLDivElement | null) => {
    if (node) drag(node);
  }, [drag]);

  // Hide default drag preview (ghost image)
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);


  const handleResizeStart = (e: React.PointerEvent, direction: string) => {
    e.stopPropagation();
    e.preventDefault();
    setResizing({
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: tile.size.width,
      startHeight: tile.size.height,
      startLeft: tile.position.x,
      startTop: tile.position.y,
    });
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: PointerEvent) => {
      const dx = (e.clientX - resizing.startX) / scale;
      const dy = (e.clientY - resizing.startY) / scale;
      
      let newWidth = resizing.startWidth;
      let newHeight = resizing.startHeight;
      let newLeft = resizing.startLeft;
      let newTop = resizing.startTop;

      if (resizing.direction.includes('e')) newWidth = Math.max(MIN_TILE_SIZE, resizing.startWidth + dx);
      if (resizing.direction.includes('w')) {
        const delta = Math.min(resizing.startWidth - MIN_TILE_SIZE, dx);
        newWidth = resizing.startWidth - delta;
        newLeft = resizing.startLeft + delta;
      }
      if (resizing.direction.includes('s')) newHeight = Math.max(MIN_TILE_SIZE, resizing.startHeight + dy);
      if (resizing.direction.includes('n')) {
        const delta = Math.min(resizing.startHeight - MIN_TILE_SIZE, dy);
        newHeight = resizing.startHeight - delta;
        newTop = resizing.startTop + delta;
      }

      newLeft = Math.min(
        canvasDimensions.width - MIN_TILE_SIZE + TILE_EDGE_MARGIN,
        Math.max(-TILE_EDGE_MARGIN, newLeft)
      );
      newTop = Math.min(
        canvasDimensions.height - MIN_TILE_SIZE + TILE_EDGE_MARGIN,
        Math.max(-TILE_EDGE_MARGIN, newTop)
      );

      const maxWidth = Math.max(MIN_TILE_SIZE, canvasDimensions.width - newLeft + TILE_EDGE_MARGIN);
      const maxHeight = Math.max(MIN_TILE_SIZE, canvasDimensions.height - newTop + TILE_EDGE_MARGIN);
      newWidth = Math.min(Math.max(MIN_TILE_SIZE, newWidth), maxWidth);
      newHeight = Math.min(Math.max(MIN_TILE_SIZE, newHeight), maxHeight);

      onUpdate(tile.id, {
        size: { width: Math.round(newWidth), height: Math.round(newHeight) },
        position: { x: Math.round(newLeft), y: Math.round(newTop) }
      });
    };

    const handleMouseUp = () => setResizing(null);

    window.addEventListener('pointermove', handleMouseMove);
    window.addEventListener('pointerup', handleMouseUp);
    window.addEventListener('pointercancel', handleMouseUp);
    return () => {
      window.removeEventListener('pointermove', handleMouseMove);
      window.removeEventListener('pointerup', handleMouseUp);
      window.removeEventListener('pointercancel', handleMouseUp);
    };
  }, [resizing, tile.id, onUpdate, scale, canvasDimensions]);

  return (
    <div
      ref={dragRef}
      role="group"
      tabIndex={0}
      aria-label={`${tile.name}${tile.locked ? ', locked' : ''}`}
      aria-describedby="canvas-keyboard-help"
      onFocus={(event) => { if (event.target === event.currentTarget) onSelect(tile.id); }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
        const updates = moveTileWithKey(tile, event.key, event.shiftKey ? 10 : 1, canvasDimensions);
        if (updates) { event.preventDefault(); event.stopPropagation(); onUpdate(tile.id, updates); }
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(tile.id);
      }}
      style={{
        position: 'absolute',
        left: tile.position.x,
        top: tile.position.y,
        width: tile.size.width,
        height: tile.size.height,
        opacity: isDragging ? 0.5 : (tile.visible ? tile.opacity : 0.3),
        transform: `rotate(${tile.rotation}deg)`,
        zIndex: tile.zIndex,
      }}
      className={`group border-2 rounded-lg flex items-center justify-center ${!tile.locked ? 'cursor-move' : 'cursor-not-allowed'} overflow-visible transition-shadow ${
        isSelected 
          ? 'border-primary shadow-[0_0_0_2px_rgba(234,88,12,0.3)]' 
          : 'border-surface-highlight hover:border-primary/50'
      } ${!tile.visible ? 'grayscale border-dashed' : ''}`}
    >
      {/* Move Handle (visible on hover/select) */}
      {!tile.locked && (
        <div className={`absolute top-1 left-1 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none ${isSelected ? 'opacity-100' : ''}`}>
          <Move size={12} className="text-white" />
        </div>
      )}
      
      {/* Lock Indicator */}
      {tile.locked && (
        <div className="absolute top-1 right-1 p-1 bg-black/50 rounded z-50">
          <Lock size={12} className="text-white" />
        </div>
      )}

      {isSelected && !tile.locked && (['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'] as const).map(direction => (
        <button key={direction} type="button" tabIndex={-1} data-direction={direction}
          aria-label={`Resize ${tile.name} ${direction}`}
          onPointerDown={event => handleResizeStart(event, direction)}
          className="resize-handle absolute z-50 flex items-center justify-center bg-transparent p-0"
          style={{
            left: direction.includes('w') ? 0 : direction.includes('e') ? '100%' : '50%',
            top: direction.includes('n') ? 0 : direction.includes('s') ? '100%' : '50%',
            width: 44 / scale, height: 44 / scale, minWidth: 44 / scale, minHeight: 44 / scale,
            transform: 'translate(-50%, -50%)', touchAction: 'none', cursor: `${direction}-resize`,
          }}>
          <span aria-hidden="true" className="bg-primary border-2 border-white rounded-full" style={{ width: 12 / scale, height: 12 / scale }} />
        </button>
      ))}

      <div ref={node => { if (node) node.inert = true; }} className="signage-content w-full h-full pointer-events-none" aria-hidden="true">
        <TileContent tile={tile} isEditor={true} />
      </div>
    </div>
  );
};

export const SlideEditor = ({ 
  initialData, 
  onSave, 
  isTemplateMode = false 
}: { 
  initialData?: Slide; 
  onSave?: (slide: Slide) => Promise<void>; 
  isTemplateMode?: boolean; 
}) => {
  const { slideId } = useParams();
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  const { planConfigs } = useConfigStore();
  const [tileSearch, setTileSearch] = useState('');
  const [editorMessage, setEditorMessage] = useState<string | null>(null);
  
  const [slide, setSlide] = useState<Slide | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'properties' | 'atmosphere' | 'layers'>('properties');
  const [loading, setLoading] = useState(!isTemplateMode);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toolsCollapsed, setToolsCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  const [backgroundUrlInput, setBackgroundUrlInput] = useState('');
  const [uploadedBackgroundUrl, setUploadedBackgroundUrl] = useState('');

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSignatureRef = useRef<string | null>(null);
  const lastFailedSignatureRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const latestSlide = useRef(slide);
  useEffect(() => { latestSlide.current = slide; }, [slide]);

  useEffect(() => {
    if (isTemplateMode && initialData) {
      setSlide(initialData);
      lastSavedSignatureRef.current = getSlideSaveSignature(initialData);
      setHasUnsavedChanges(false);
      setLoading(false);

      if (initialData.backgroundImageUrl) {
        setUploadedBackgroundUrl(initialData.backgroundImageUrl);
        setBackgroundUrlInput('');
      }
      return;
    }

    if (!slideId) return;

    const fetchSlide = async () => {
      try {
        setLoading(true);
        const data = await SlideService.getSlide(slideId);
        if (data) {
          setSlide(data);
          lastSavedSignatureRef.current = getSlideSaveSignature(data);
          setHasUnsavedChanges(false);
          if (data.backgroundImageUrl) {
            setUploadedBackgroundUrl(data.backgroundImageUrl);
            setBackgroundUrlInput('');
          }
        } else {
          setError('Slide not found');
        }
      } catch (err) {
        console.error('Failed to load slide:', err);
        setError('Failed to load slide');
      } finally {
        setLoading(false);
      }
    };

    void fetchSlide();
  }, [slideId, isTemplateMode, initialData]);

  const saveSlide = useCallback(async (updatedSlide: Slide) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setError(null);
    try {
      setSaving(true);

      if (isTemplateMode && onSave) {
        await onSave(updatedSlide);
        lastSavedSignatureRef.current = getSlideSaveSignature(updatedSlide);
        setEditorMessage('Template saved.');
        return;
      }

      if (!slideId) return;

      const updateData: Partial<Omit<Slide, 'id' | 'createdAt' | 'updatedAt'>> = {
        name: updatedSlide.name,
        elements: updatedSlide.elements,
        backgroundColor: updatedSlide.backgroundColor,
        dimensions: updatedSlide.dimensions,
        orientation: updatedSlide.orientation,
      };

      if (updatedSlide.backgroundImageUrl !== undefined) {
        updateData.backgroundImageUrl = updatedSlide.backgroundImageUrl;
      }

      if (updatedSlide.particleConfig !== undefined) {
        updateData.particleConfig = updatedSlide.particleConfig;
      }

      await SlideService.updateSlide(slideId, updateData);
      lastSavedSignatureRef.current = getSlideSaveSignature(updatedSlide);
      lastFailedSignatureRef.current = null;
      setHasUnsavedChanges(!!latestSlide.current && getSlideSaveSignature(latestSlide.current) !== lastSavedSignatureRef.current);
    } catch (err) {
      console.error('Failed to save slide:', err);
      lastFailedSignatureRef.current = getSlideSaveSignature(updatedSlide);
      setError('Changes could not be saved. Your edits are still here. Use Save to retry.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [slideId, isTemplateMode, onSave]);

  const addTile = (type: TileInstance['type']) => {
    if (!slide) return;
    const plan = planConfigs[organization?.plan || 'Free'] || planConfigs.Free;
    if (!plan?.allowedTiles?.includes(type)) return;
    const id = generateId();
    const position = clampTilePosition((slide.dimensions.width - 200) / 2, (slide.dimensions.height - 150) / 2, 200, 150, slide.dimensions.width, slide.dimensions.height);
    const tile: TileInstance = { id, type, name: `${type.replaceAll('_', ' ')} tile`, position,
      size: { width: 200, height: 150 }, opacity: 1, rotation: 0,
      zIndex: Math.max(0, ...slide.elements.map(item => item.zIndex)) + 1,
      visible: true, locked: false, properties: getDefaultTileProperties(type) };
    setSlide({ ...slide, elements: [...slide.elements, tile] });
    setSelectedTileId(id); setActiveTab('properties'); setPropertiesCollapsed(false);
    if (window.innerWidth < 1024) setToolsCollapsed(true);
    setEditorMessage(`${tile.name} added. Adjust it with Position and size or the canvas arrow keys.`);
  };

  const handleDrop = useCallback((item: DragItem, monitor: DropTargetMonitor<DragItem>) => {
    if (!slide) return;

    const canvasEl = document.getElementById('editor-canvas');
    const canvasRect = canvasEl?.getBoundingClientRect();
    if (!canvasRect) return;

    const delta = monitor.getDifferenceFromInitialOffset() as XYCoord | null;
    const clientOffset = monitor.getClientOffset() as XYCoord | null;

    let x: number;
    let y: number;
    let tileWidth = 200;
    let tileHeight = 150;

    if (item.id && delta) {
      const existingTile = slide.elements.find((el) => el.id === item.id);
      tileWidth = existingTile?.size.width ?? 200;
      tileHeight = existingTile?.size.height ?? 150;
      x = (item.left || 0) + delta.x / scale;
      y = (item.top || 0) + delta.y / scale;
    } else if (clientOffset) {
      const defaultWidth = 200;
      const defaultHeight = 150;
      tileWidth = defaultWidth;
      tileHeight = defaultHeight;
      x = (clientOffset.x - canvasRect.left) / scale - defaultWidth / 2;
      y = (clientOffset.y - canvasRect.top) / scale - defaultHeight / 2;
    } else {
      return;
    }

    const clamped = clampTilePosition(
      x,
      y,
      tileWidth,
      tileHeight,
      slide.dimensions.width,
      slide.dimensions.height
    );

    const newElements = [...slide.elements];

    if (item.id) {
      const index = newElements.findIndex(e => e.id === item.id);
      if (index !== -1) {
        newElements[index] = {
          ...newElements[index],
          position: { x: clamped.x, y: clamped.y }
        };
      }
    } else {
      const defaultProps = getDefaultTileProperties(item.type);

      const newTile: TileInstance = {
        id: generateId(),
        type: item.type,
        position: { x: clamped.x, y: clamped.y },
        size: { width: 200, height: 150 },
        opacity: 1,
        rotation: 0,
        zIndex: newElements.length + 1,
        visible: true,
        locked: false,
        name: `${item.type.charAt(0).toUpperCase() + item.type.slice(1).replace('_', ' ')} Tile`,
        properties: defaultProps,
      };

      newElements.push(newTile);
      setSelectedTileId(newTile.id);
      setActiveTab('properties');
    }

    const updatedSlide = { ...slide, elements: newElements };
    setSlide(updatedSlide);
  }, [slide, scale]);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: [ItemTypes.TILE, ItemTypes.CANVAS_TILE],
    drop: (item: DragItem, monitor: DropTargetMonitor<DragItem>) => handleDrop(item, monitor),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [handleDrop]);

  // Combine container ref with drop ref
  const containerRefCallback = useCallback((node: HTMLDivElement | null) => {
    canvasContainerRef.current = node;
    drop(node);
  }, [drop]);


  useEffect(() => {
    if (!slide || isTemplateMode || saving) return;

    const currentSignature = getSlideSaveSignature(slide);

    if (!lastSavedSignatureRef.current) {
      lastSavedSignatureRef.current = currentSignature;
      setHasUnsavedChanges(false);
      return;
    }

    if (currentSignature === lastSavedSignatureRef.current) {
      setHasUnsavedChanges(false);
      return;
    }

    setHasUnsavedChanges(true);
    if (currentSignature === lastFailedSignatureRef.current) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      void saveSlide(slide);
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [slide, saveSlide, isTemplateMode, saving]);

  const updateSelectedTile = (updates: Partial<TileInstance>) => {
    if (!slide || !selectedTileId) return;

    const newElements = slide.elements.map(el => 
      el.id === selectedTileId ? { ...el, ...updates } : el
    );
    
    const updatedSlide = { ...slide, elements: newElements };
    setSlide(updatedSlide);
  };

  const updateSelectedTileProperty = (key: string, value: unknown) => {
    if (!slide || !selectedTileId) return;
    const tile = slide.elements.find(e => e.id === selectedTileId);
    if (!tile) return;

    const newProperties = { ...tile.properties, [key]: value };
    updateSelectedTile({ properties: newProperties });
  };

  const deleteSelectedTile = () => {
    if (!slide || !selectedTileId) return;
    const newElements = slide.elements.filter(e => e.id !== selectedTileId);
    setSlide({ ...slide, elements: newElements });
    setSelectedTileId(null);
  };

  const duplicateSelectedTile = () => {
    if (!slide || !selectedTileId) return;
    const tileToDuplicate = slide.elements.find(e => e.id === selectedTileId);
    if (!tileToDuplicate) return;

    const newId = generateId();
    // Offset by 20px so it's visible
    const offset = 20;
    
    const newPosition = clampTilePosition(
      tileToDuplicate.position.x + offset,
      tileToDuplicate.position.y + offset,
      tileToDuplicate.size.width,
      tileToDuplicate.size.height,
      slide.dimensions.width,
      slide.dimensions.height
    );

    const newTile: TileInstance = {
      ...JSON.parse(JSON.stringify(tileToDuplicate)),
      id: newId,
      name: `${tileToDuplicate.name} (Copy)`,
      position: newPosition,
      zIndex: Math.max(...slide.elements.map(e => e.zIndex), 0) + 1,
    };

    const newElements = [...slide.elements, newTile];
    setSlide({ ...slide, elements: newElements });
    setSelectedTileId(newId);
  };

  // Layer management functions
  const toggleTileVisibility = (tileId: string) => {
    if (!slide) return;
    const newElements = slide.elements.map(tile =>
      tile.id === tileId ? { ...tile, visible: !tile.visible } : tile
    );
    setSlide({ ...slide, elements: newElements });
  };

  const toggleTileLock = (tileId: string) => {
    if (!slide) return;
    const newElements = slide.elements.map(tile =>
      tile.id === tileId ? { ...tile, locked: !tile.locked } : tile
    );
    setSlide({ ...slide, elements: newElements });
  };

  const moveLayerUp = (tileId: string) => {
    if (!slide) return;
    const tile = slide.elements.find(t => t.id === tileId);
    if (!tile) return;

    // Get all unique z-indices sorted
    const zIndices = [...new Set(slide.elements.map(t => t.zIndex))].sort((a, b) => a - b);
    const currentIndex = zIndices.indexOf(tile.zIndex);
    
    // Already at top
    if (currentIndex === zIndices.length - 1) return;

    const targetZIndex = zIndices[currentIndex + 1];
    const tileAbove = slide.elements.find(t => t.zIndex === targetZIndex);
    if (!tileAbove) return;

    const newElements = slide.elements.map(t => {
      if (t.id === tileId) return { ...t, zIndex: targetZIndex };
      if (t.id === tileAbove.id) return { ...t, zIndex: tile.zIndex };
      return t;
    });

    setSlide({ ...slide, elements: newElements });
  };

  const moveLayerDown = (tileId: string) => {
    if (!slide) return;
    const tile = slide.elements.find(t => t.id === tileId);
    if (!tile) return;

    // Get all unique z-indices sorted
    const zIndices = [...new Set(slide.elements.map(t => t.zIndex))].sort((a, b) => a - b);
    const currentIndex = zIndices.indexOf(tile.zIndex);
    
    // Already at bottom
    if (currentIndex === 0) return;

    const targetZIndex = zIndices[currentIndex - 1];
    const tileBelow = slide.elements.find(t => t.zIndex === targetZIndex);
    if (!tileBelow) return;

    const newElements = slide.elements.map(t => {
      if (t.id === tileId) return { ...t, zIndex: targetZIndex };
      if (t.id === tileBelow.id) return { ...t, zIndex: tile.zIndex };
      return t;
    });

    setSlide({ ...slide, elements: newElements });
  };

  const handleImageUpload = async (file: File, propertyKey: string = 'url') => {
    if (!slide || !selectedTileId) return;
    try {
      setUploading(true);
      const path = isTemplateMode 
        ? `templates/slides/${generateId()}/${file.name}`
        : STORAGE_PATHS.SLIDE_ASSETS(slide.id);
        
      const url = await StorageService.uploadFile(file, path);
      updateSelectedTileProperty(propertyKey, url);
    } catch {
      setError('The image could not be uploaded. Check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleBackgroundUpload = async (file: File) => {
    if (!slide) return;
    const { organization, userProfile } = useAuthStore.getState();
    if (import.meta.env.DEV) {
      console.log('Slide orgId:', slide.orgId, 'User orgId:', organization?.id, 'User platformRole:', userProfile?.platformRole);
    }
    try {
      setUploading(true);
      const path = isTemplateMode
        ? `templates/slides/${generateId()}/background_${file.name}`
        : STORAGE_PATHS.SLIDE_BACKGROUNDS(slide.id);
        
      const url = await StorageService.uploadFile(file, path);
      setUploadedBackgroundUrl(url);
      
      const finalUrl = backgroundUrlInput || url;
      const updatedSlide = { ...slide, backgroundImageUrl: finalUrl || '' };
      setSlide(updatedSlide);
    } catch (error) {
      console.error('Upload error:', error);
      setError('The background could not be uploaded. Your previous background is unchanged.');
    } finally {
      setUploading(false);
    }
  };

  const updateAtmosphere = (updates: Partial<ParticleConfig>) => {
    if (!slide) return;
    const currentConfig = slide.particleConfig || {
      effectType: 'smoke',
      density: 50,
      speed: 1,
      color: [255, 255, 255, 1],
      blendMode: 'screen',
      emitterPosition: { x: 0.5, y: 0.5 },
      vorticity: 5,
      particleSize: 10,
      particleAngle: 0
    };
    
    const updatedSlide = { 
      ...slide, 
      particleConfig: { ...currentConfig, ...updates } 
    };
    setSlide(updatedSlide);
  };

  if (loading) return <div role="status" className="p-8 text-text-muted">Loading editor...</div>;
  if (!slide) return <InlineFeedback tone="error" message={error || 'Slide not found'} />;

  const selectedTile = slide.elements.find(e => e.id === selectedTileId);

  return (
    <ErrorBoundary>
      <div className={`flex flex-col min-w-0 bg-background text-text ${isTemplateMode ? 'h-full' : 'min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4rem)]'}`} onKeyDown={event => { if (event.key === 'Escape' && !event.defaultPrevented && !(event.target as HTMLElement).closest('[role="dialog"]')) setSelectedTileId(null); }}>
        <CustomDragLayer tiles={slide.elements} scale={scale} />
        {/* Header - Hide specific parts if in Template Mode if header is handled by parent */}
        {!isTemplateMode && (
          <div className="min-h-16 bg-surface border-b border-surface-highlight flex flex-wrap gap-3 items-center justify-between px-4 py-2 shadow-sm z-20">
            <div className="flex items-center gap-4">
              <button aria-label="Back to Slides"
                onClick={() => navigate('/admin/slides')} 
                className="text-text-muted hover:text-text p-2 hover:bg-surface-highlight/50 rounded-full transition-colors"
                title="Back to Slides"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-text leading-tight">{slide.name}</h1>
                <span role="status" aria-live="polite" className="text-xs text-text-muted">
                   {error ? 'Changes not saved' : saving ? 'Saving...' : (hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved')}
                </span>
              </div>
            </div>
            <button 
              disabled={saving} onClick={() => void saveSlide(slide)}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md transition-colors shadow-lg shadow-primary/20"
            >
              <Save size={18} />
              <span>Save</span>
            </button>
          </div>
        )}
        
        {isTemplateMode && (
           <div className="bg-surface border-b border-surface-highlight px-4 py-2 flex items-center justify-between">
             <div className="text-xs text-text-muted">Template Mode</div>
             <button 
              disabled={saving} onClick={() => void saveSlide(slide)}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-3 py-1 rounded-md transition-colors text-sm"
            >
              <Save size={14} />
              <span>Save Changes</span>
            </button>
           </div>
        )}
        <div className="px-4 py-2 flex flex-wrap items-center gap-2 border-b border-surface-highlight">
          <button type="button" className="ui-button ui-button-secondary" aria-expanded={!toolsCollapsed} aria-controls="editor-tools" onClick={() => setToolsCollapsed(v => !v)}>Tiles</button>
          <button type="button" className="ui-button ui-button-secondary" aria-expanded={!propertiesCollapsed} aria-controls="editor-properties" onClick={() => setPropertiesCollapsed(v => !v)}>Inspector</button>
          <p id="canvas-keyboard-help" className="text-sm text-text-secondary">Select a tile. Arrow keys move it; Shift moves 10 pixels.</p>
        </div>
        <div className="px-4"><InlineFeedback message={error} tone="error" /><InlineFeedback message={editorMessage} /></div>
        <div className="editor-workspace flex-1 min-h-0 flex overflow-hidden relative">
          {/* Tools Sidebar */}
          <div id="editor-tools" hidden={toolsCollapsed} className={`editor-tools ${toolsCollapsed ? 'w-0 p-0 border-none' : 'w-64 p-4 border-r'} bg-surface border-surface-highlight flex flex-col gap-3 z-10 overflow-y-auto custom-scrollbar transition-all duration-300 relative`}>
            <label htmlFor="tile-search" className="block text-sm font-medium">Find a tile</label>
            <input id="tile-search" type="search" value={tileSearch} onChange={event => setTileSearch(event.target.value)} className="w-full bg-background border border-surface-highlight rounded px-3 py-2" />
            <p className="text-xs text-text-secondary">Tap a tile to add it, or drag it to the canvas.</p>
            <details open><summary>Text</summary>
            <DraggableTile onAdd={addTile} search={tileSearch} type="text" icon={<Type size={20} />} label="Text Block" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="dynamic_text" icon={<Type size={20} />} label="Dynamic Text" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="scrolling_text" icon={<Type size={20} />} label="Scrolling Text" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="rich_text" icon={<FileText size={20} />} label="Rich Text" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="marquee" icon={<Type size={20} />} label="Marquee" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="typewriter" icon={<Type size={20} />} label="Typewriter" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="word_art" icon={<Type size={20} />} label="Word Art" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="gradient_text" icon={<Type size={20} />} label="Gradient Text" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="animated_text" icon={<Type size={20} />} label="Animated Text" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="text_shadow" icon={<Type size={20} />} label="Shadow Text" />

            </details>
            <details open><summary>Media</summary>
            <DraggableTile onAdd={addTile} search={tileSearch} type="image" icon={<ImageIcon size={20} />} label="Image" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="video" icon={<Video size={20} />} label="Video" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="gif" icon={<ImageIcon size={20} />} label="GIF" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="slideshow" icon={<Layers size={20} />} label="Slideshow" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="youtube" icon={<Video size={20} />} label="YouTube" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="vimeo" icon={<Video size={20} />} label="Vimeo" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="webcam" icon={<Video size={20} />} label="Webcam" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="audio" icon={<Video size={20} />} label="Audio" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="lottie" icon={<Sparkles size={20} />} label="Lottie" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="background_video" icon={<Video size={20} />} label="BG Video" />

            </details>
            <details open={tileSearch ? true : undefined}><summary>Data</summary>
            <DraggableTile onAdd={addTile} search={tileSearch} type="bar_chart" icon={<BarChart size={20} />} label="Bar Chart" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="line_chart" icon={<BarChart size={20} />} label="Line Chart" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="pie_chart" icon={<BarChart size={20} />} label="Pie Chart" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="gauge" icon={<BarChart size={20} />} label="Gauge" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="kpi_card" icon={<Activity size={20} />} label="KPI Card" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="progress_bar" icon={<Activity size={20} />} label="Progress" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="table" icon={<ListChecks size={20} />} label="Table" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="timeline" icon={<Clock size={20} />} label="Timeline" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="heatmap" icon={<BarChart size={20} />} label="Heatmap" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="sparklines" icon={<BarChart size={20} />} label="Sparklines" />

            </details>
            <details open={tileSearch ? true : undefined}><summary>Interactive</summary>
            <DraggableTile onAdd={addTile} search={tileSearch} type="button" icon={<MousePointer2 size={20} />} label="Button" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="qr_code" icon={<QrCode size={20} />} label="QR Code" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="countdown" icon={<Timer size={20} />} label="Countdown" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="form" icon={<FileText size={20} />} label="Form" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="poll" icon={<ListChecks size={20} />} label="Poll" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="social_feed" icon={<MessageSquare size={20} />} label="Social Feed" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="weather" icon={<CloudSun size={20} />} label="Weather" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="menu_selector" icon={<Utensils size={20} />} label="Menu Selector" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="promotion_banner" icon={<Megaphone size={20} />} label="Promotion" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="loyalty_card" icon={<CreditCard size={20} />} label="Loyalty Card" />

            </details>
            <details open={tileSearch ? true : undefined}><summary>Layout</summary>
            <DraggableTile onAdd={addTile} search={tileSearch} type="container" icon={<Layout size={20} />} label="Container" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="divider" icon={<Layout size={20} />} label="Divider" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="grid" icon={<Layout size={20} />} label="Grid" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="flex" icon={<Layout size={20} />} label="Flex Box" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="tabs" icon={<Layout size={20} />} label="Tabs" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="accordion" icon={<Layout size={20} />} label="Accordion" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="carousel" icon={<Layout size={20} />} label="Carousel" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="sticky_note" icon={<Layout size={20} />} label="Sticky Note" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="shape" icon={<Layout size={20} />} label="Shape" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="frame" icon={<Layout size={20} />} label="Frame" />

            </details>
            <details open={tileSearch ? true : undefined}><summary>Special</summary>
            <DraggableTile onAdd={addTile} search={tileSearch} type="clock" icon={<Clock size={20} />} label="Clock" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="calendar" icon={<CalendarIcon size={20} />} label="Calendar" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="rss_feed" icon={<Rss size={20} />} label="RSS Feed" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="social_proof" icon={<MessageSquare size={20} />} label="Social Proof" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="testimonial" icon={<MessageSquare size={20} />} label="Testimonial" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="stock_ticker" icon={<Activity size={20} />} label="Stock Ticker" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="menu_item" icon={<Utensils size={20} />} label="Menu Item" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="special_offer" icon={<Megaphone size={20} />} label="Special Offer" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="event_countdown" icon={<Timer size={20} />} label="Event Countdown" />
            <DraggableTile onAdd={addTile} search={tileSearch} type="map" icon={<MapPin size={20} />} label="Map Location" />
            </details>
          </div>
          {/* Canvas Area */}
          <div
            className="editor-canvas-area flex-1 bg-surface p-4 overflow-auto relative"
            ref={containerRefCallback}
          >
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
            />
            
            <div 
              id="editor-canvas"
              onClick={() => setSelectedTileId(null)}
              className={`relative shadow-2xl transition-all ring-1 ring-white/10 ${isOver && canDrop ? 'ring-2 ring-primary/70' : ''}`}
              style={{
                width: slide.dimensions.width,
                height: slide.dimensions.height,
                transform: `scale(${scale})`, // Scaled to fit
                transformOrigin: 'top left',
                backgroundColor: slide.backgroundColor,
                backgroundImage: slide.backgroundImageUrl ? `url(${slide.backgroundImageUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'absolute',
                top: 0,
                left: 0
              }}
            >
              {/* Atmosphere Layer */}
              {slide.particleConfig && (
                <>
                  <div className="absolute inset-0 pointer-events-none z-0">
                    <AtmosphereCanvas config={slide.particleConfig} />
                  </div>
                  <div className="absolute inset-0 pointer-events-none flex items-start justify-center pt-4 z-50">
                    <span className="bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs border border-white/10 flex items-center gap-2">
                      <Wind size={12} className="text-primary" />
                      Atmosphere: {slide.particleConfig.effectType}
                    </span>
                  </div>
                </>
              )}

              {slide.elements.map(tile => (
                <CanvasTile 
                  key={tile.id} 
                  tile={tile} 
                  isSelected={selectedTileId === tile.id}
                  scale={scale}
                  canvasDimensions={slide.dimensions}
                  onSelect={setSelectedTileId}
                  onUpdate={(id, updates) => {
                    const newElements = slide.elements.map(el => 
                      el.id === id ? { ...el, ...updates } : el
                    );
                    setSlide({ ...slide, elements: newElements });
                  }}
                />
              ))}
            </div>
            
            {/* Canvas Controls Overlay */}
            <div className="absolute bottom-6 right-6 bg-surface border border-surface-highlight rounded-lg p-2 flex gap-2 shadow-lg">
              <button aria-label="Zoom Out"
                onClick={() => setScale(s => Math.max(0.1, s - 0.05))}
                className="p-1 hover:bg-surface-highlight rounded text-text-muted hover:text-text transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <div className="text-xs text-text font-medium px-2 py-1 min-w-[3rem] text-center border-x border-surface-highlight flex items-center justify-center">
                {Math.round(scale * 100)}%
              </div>
              <button aria-label="Zoom In"
                onClick={() => setScale(s => Math.min(2, s + 0.05))}
                className="p-1 hover:bg-surface-highlight rounded text-text-muted hover:text-text transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button aria-label="Reset Zoom"
                onClick={() => setScale(1)}
                className="p-1 hover:bg-surface-highlight rounded text-text-muted hover:text-text transition-colors ml-2 border-l border-surface-highlight pl-3"
                title="Reset Zoom"
              >
                <Maximize size={16} />
              </button>
            </div>
          </div>

          {/* Properties Panel */}
          <div id="editor-properties" hidden={propertiesCollapsed} className={`editor-properties ${propertiesCollapsed ? 'w-0 border-none' : 'w-80 border-l'} bg-surface border-surface-highlight flex flex-col z-10 shadow-xl transition-all duration-300 relative`}>
            {/* Tabs */}
            <div className={`flex border-b border-surface-highlight bg-surface ${propertiesCollapsed ? 'hidden' : ''}`}>
              <button aria-label="Collapse Properties"
                onClick={() => setPropertiesCollapsed(true)}
                className="px-3 border-r border-surface-highlight text-text-muted hover:text-text hover:bg-surface-highlight/10 transition-colors"
                title="Collapse Properties"
              >
                <ChevronRight size={14} />
              </button>
              <button
                aria-pressed={activeTab === 'properties'} onClick={() => setActiveTab('properties')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'properties' 
                    ? 'text-primary border-b-2 border-primary bg-surface-highlight/5' 
                    : 'text-text-muted hover:text-text hover:bg-surface-highlight/10'
                }`}
              >
                <Settings size={16} />
                Properties
              </button>
              <button
                aria-pressed={activeTab === 'atmosphere'} onClick={() => setActiveTab('atmosphere')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'atmosphere' 
                    ? 'text-primary border-b-2 border-primary bg-surface-highlight/5' 
                    : 'text-text-muted hover:text-text hover:bg-surface-highlight/10'
                }`}
              >
                <Wind size={16} />
                Atmosphere
              </button>
              <button
                aria-pressed={activeTab === 'layers'} onClick={() => setActiveTab('layers')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'layers' 
                    ? 'text-primary border-b-2 border-primary bg-surface-highlight/5' 
                    : 'text-text-muted hover:text-text hover:bg-surface-highlight/10'
                }`}
              >
                <Layers size={16} />
                Layers
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto p-5 custom-scrollbar ${propertiesCollapsed ? 'hidden' : ''}`}>
              {activeTab === 'properties' ? (
                <>
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-text mb-4 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Layers size={16} className="text-primary" />
                        {selectedTile ? 'Element Properties' : 'Slide Properties'}
                      </span>
                      {selectedTile && (
                        <div className="flex items-center gap-2">
                          <button aria-label="Duplicate Tile"
                            onClick={duplicateSelectedTile}
                            className="bg-surface-highlight hover:bg-primary/20 text-text p-1 rounded transition-colors"
                            title="Duplicate Tile"
                          >
                            <Copy size={16} />
                          </button>
                          <button aria-label="Delete Tile"
                            onClick={deleteSelectedTile}
                            className="bg-red-500 hover:bg-red-600 text-white p-1 rounded transition-colors"
                            title="Delete Tile"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </h3>
                  </div>
                  
                  {selectedTile ? (
                    <div className="space-y-6">
                      <div className="space-y-3">
                         <label className="text-xs font-bold text-text-muted uppercase tracking-wider">General</label>
                         <div className="space-y-3">
                           <div>
                             <label className="text-xs text-text-muted mb-1 block">Name</label>
                             <input aria-label="Name"
                               type="text" 
                               value={selectedTile.name || ''} 
                               onChange={(e) => updateSelectedTile({ name: e.target.value })}
                               className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                               placeholder="Tile Name"
                             />
                           </div>
                           <div className="flex items-center gap-2">
                             <div className="flex-1 bg-background border border-surface-highlight rounded px-3 py-2 flex items-center justify-between">
                               <span className="text-sm text-text">Visible</span>
                               <button 
                                 onClick={() => updateSelectedTile({ visible: !selectedTile.visible })}
                                 className={`p-1 rounded hover:bg-surface-highlight transition-colors ${selectedTile.visible ? 'text-primary' : 'text-text-muted'}`}
                               >
                                 {selectedTile.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                               </button>
                             </div>
                             <div className="flex-1 bg-background border border-surface-highlight rounded px-3 py-2 flex items-center justify-between">
                               <span className="text-sm text-text">Locked</span>
                               <button 
                                 onClick={() => updateSelectedTile({ locked: !selectedTile.locked })}
                                 className={`p-1 rounded hover:bg-surface-highlight transition-colors ${selectedTile.locked ? 'text-red-500' : 'text-text-muted'}`}
                               >
                                 {selectedTile.locked ? <Lock size={16} /> : <Unlock size={16} />}
                               </button>
                             </div>
                           </div>
                         </div>
                      </div>

                      <div className="space-y-3">
                         <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Type</label>
                         <div className="text-text capitalize bg-background px-3 py-2 rounded border border-surface-highlight text-sm">
                           {selectedTile.type}
                         </div>
                      </div>

                      <TilePlacementControls tile={selectedTile} canvas={slide.dimensions} onUpdate={updateSelectedTile} />

                      <div className="space-y-3">
                         <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Appearance</label>
                         <div className="space-y-3">
                           <div>
                             <div className="flex justify-between items-center mb-1">
                               <label className="text-xs text-text-muted">Opacity</label>
                               <span className="text-xs text-primary">{Math.round(selectedTile.opacity * 100)}%</span>
                             </div>
                             <input 
                               type="range" 
                               min="0" 
                               max="1" 
                               step="0.01"
                               aria-label="Tile opacity" value={selectedTile.opacity}
                               onChange={(e) => updateSelectedTile({ opacity: Number(e.target.value) })}
                               className="w-full accent-primary h-1 bg-surface-highlight rounded-lg appearance-none cursor-pointer"
                             />
                           </div>
                           <div>
                             <div className="flex justify-between items-center mb-1">
                               <label className="text-xs text-text-muted">Rotation</label>
                               <span className="text-xs text-primary">{selectedTile.rotation}°</span>
                             </div>
                             <input 
                               type="range" 
                               min="0" 
                               max="360" 
                               aria-label="Tile rotation" value={selectedTile.rotation}
                               onChange={(e) => updateSelectedTile({ rotation: Number(e.target.value) })}
                               className="w-full accent-primary h-1 bg-surface-highlight rounded-lg appearance-none cursor-pointer"
                             />
                           </div>
                         </div>
                      </div>

                      <div className="space-y-3">
                         <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Layer (Z-Index)</label>
                         <input aria-label="Layer (Z-Index)"
                            type="number" 
                            value={selectedTile.zIndex} 
                            onChange={(e) => updateSelectedTile({ zIndex: Number(e.target.value) })}
                            className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                          />
                      </div>

                      {isTextTile(selectedTile.type) && (
                        <>
                          <div className="space-y-3">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                              {selectedTile.type === 'dynamic_text' ? 'Template' : 
                               selectedTile.type === 'rich_text' ? 'HTML Content' : 'Content'}
                            </label>
                            <textarea aria-label="Tile text content"
                              value={String(
                                selectedTile.type === 'dynamic_text' ? ((selectedTile.properties as DynamicTextProperties).textTemplate || '') :
                                selectedTile.type === 'rich_text' ? ((selectedTile.properties as RichTextProperties).htmlContent || '') :
                                ((selectedTile.properties as TextTileProperties).content || '')
                              )}
                              onChange={(e) => updateSelectedTileProperty(
                                selectedTile.type === 'dynamic_text' ? 'textTemplate' : 
                                selectedTile.type === 'rich_text' ? 'htmlContent' : 'content', 
                                e.target.value
                              )}
                              className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none min-h-[100px]"
                              rows={3}
                            />
                          </div>

                          <div className="space-y-3">
                             <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Typography</label>
                             <div className="grid grid-cols-2 gap-3">
                               <div className="col-span-2">
                                 <label className="text-xs text-text-muted mb-1 block">Font Family</label>
                                 <select aria-label="Font Family"
                                   value={String((selectedTile.properties as BaseTextProperties).fontFamily || 'Inter, sans-serif')}
                                   onChange={(e) => updateSelectedTileProperty('fontFamily', e.target.value)}
                                   className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none appearance-none"
                                 >
                                   <option value="Inter, sans-serif">Inter</option>
                                   <option value="'Roboto', sans-serif">Roboto</option>
                                   <option value="'Open Sans', sans-serif">Open Sans</option>
                                   <option value="'Montserrat', sans-serif">Montserrat</option>
                                   <option value="'Oswald', sans-serif">Oswald</option>
                                   <option value="'Raleway', sans-serif">Raleway</option>
                                   <option value="'Playfair Display', serif">Playfair Display</option>
                                   <option value="'Merriweather', serif">Merriweather</option>
                                   <option value="'Courier New', monospace">Monospace</option>
                                 </select>
                               </div>
                               <div>
                                 <label className="text-xs text-text-muted mb-1 block">Size (px)</label>
                                 <input aria-label="Size (px)"
                                   type="number" 
                                   value={Number((selectedTile.properties as BaseTextProperties).fontSize || 24)}
                                   onChange={(e) => updateSelectedTileProperty('fontSize', Number(e.target.value))}
                                   className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                 />
                               </div>
                               <div>
                                 <label className="text-xs text-text-muted mb-1 block">Color</label>
                                 <div className="flex items-center gap-2 bg-background border border-surface-highlight rounded px-2 py-1 h-[38px]">
                                   <input 
                                     aria-label="Text color" type="color"
                                     value={String((selectedTile.properties as BaseTextProperties).fontColor || '#ffffff')}
                                     onChange={(e) => updateSelectedTileProperty('fontColor', e.target.value)}
                                     className="w-6 h-6 cursor-pointer rounded border-none bg-transparent p-0"
                                   />
                                   <span className="text-xs text-text font-mono truncate">{String((selectedTile.properties as BaseTextProperties).fontColor || '#ffffff')}</span>
                                 </div>
                               </div>
                               <div>
                                 <label className="text-xs text-text-muted mb-1 block">Line Height</label>
                                 <input aria-label="Line Height"
                                   type="number" 
                                   step="0.1"
                                   min="0.5"
                                   max="3"
                                   value={Number((selectedTile.properties as BaseTextProperties).lineHeight || 1.2)}
                                   onChange={(e) => updateSelectedTileProperty('lineHeight', Number(e.target.value))}
                                   className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                 />
                               </div>
                               <div>
                                 <label className="text-xs text-text-muted mb-1 block">Spacing (px)</label>
                                 <input aria-label="Spacing (px)"
                                   type="number" 
                                   step="0.5"
                                   value={Number((selectedTile.properties as BaseTextProperties).letterSpacing || 0)}
                                   onChange={(e) => updateSelectedTileProperty('letterSpacing', Number(e.target.value))}
                                   className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                 />
                               </div>
                               <div>
                                 <label className="text-xs text-text-muted mb-1 block">Align</label>
                                 <select aria-label="Align"
                                   value={String((selectedTile.properties as BaseTextProperties).textAlign || 'left')}
                                   onChange={(e) => updateSelectedTileProperty('textAlign', e.target.value)}
                                   className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none appearance-none"
                                 >
                                   <option value="left">Left</option>
                                   <option value="center">Center</option>
                                   <option value="right">Right</option>
                                   <option value="justify">Justify</option>
                                 </select>
                               </div>
                               <div>
                                 <label className="text-xs text-text-muted mb-1 block">Weight</label>
                                 <select aria-label="Weight"
                                   value={Number((selectedTile.properties as BaseTextProperties).fontWeight || 400)}
                                   onChange={(e) => updateSelectedTileProperty('fontWeight', Number(e.target.value))}
                                   className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none appearance-none"
                                 >
                                   <option value="300">Light</option>
                                   <option value="400">Regular</option>
                                   <option value="600">Semi-Bold</option>
                                   <option value="700">Bold</option>
                                 </select>
                               </div>
                               <div>
                                 <label className="text-xs text-text-muted mb-1 block">Transform</label>
                                 <select aria-label="Transform"
                                   value={String((selectedTile.properties as BaseTextProperties).textTransform || 'none')}
                                   onChange={(e) => updateSelectedTileProperty('textTransform', e.target.value)}
                                   className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none appearance-none"
                                 >
                                   <option value="none">None</option>
                                   <option value="uppercase">UPPERCASE</option>
                                   <option value="lowercase">lowercase</option>
                                   <option value="capitalize">Capitalize</option>
                                 </select>
                               </div>
                               <div>
                                 <label className="text-xs text-text-muted mb-1 block">Decoration</label>
                                 <select aria-label="Decoration"
                                   value={String((selectedTile.properties as BaseTextProperties).textDecoration || 'none')}
                                   onChange={(e) => updateSelectedTileProperty('textDecoration', e.target.value)}
                                   className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none appearance-none"
                                 >
                                   <option value="none">None</option>
                                   <option value="underline">Underline</option>
                                   <option value="line-through">Strikethrough</option>
                                 </select>
                               </div>
                             </div>

                             <div className="pt-2 border-t border-surface-highlight mt-2">
                               <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 block">Background & Border</label>
                               <div className="space-y-2">
                                  <div>
                                    <label className="text-[10px] text-text-muted mb-1 block">Background Color</label>
                                    <div className="flex items-center gap-2 bg-background border border-surface-highlight rounded px-2 py-1 h-[32px]">
                                      <input 
                                        aria-label="Color" type="color"
                                        value={
                                          (selectedTile.properties as BaseTextProperties).backgroundColor && 
                                          (selectedTile.properties as BaseTextProperties).backgroundColor !== 'transparent'
                                            ? String((selectedTile.properties as BaseTextProperties).backgroundColor)
                                            : '#ffffff'
                                        }
                                        onChange={(e) => updateSelectedTileProperty('backgroundColor', e.target.value)}
                                        className="w-5 h-5 cursor-pointer rounded border-none bg-transparent p-0"
                                      />
                                      <span className="text-[10px] text-text font-mono truncate flex-1">
                                        {(selectedTile.properties as BaseTextProperties).backgroundColor === 'transparent' 
                                          ? 'Transparent' 
                                          : String((selectedTile.properties as BaseTextProperties).backgroundColor || 'Transparent')}
                                      </span>
                                      <button aria-label="Clear Background (Transparent)"
                                        onClick={() => updateSelectedTileProperty('backgroundColor', 'transparent')}
                                        className="ml-1 p-1 hover:bg-surface-highlight rounded text-text-muted hover:text-text transition-colors"
                                        title="Clear Background (Transparent)"
                                      >
                                        <div className="w-3 h-3 relative">
                                          <div className="absolute inset-0 border border-current rounded-sm"></div>
                                          <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-full h-[1px] bg-current rotate-45"></div>
                                          </div>
                                        </div>
                                      </button>
                                    </div>
                                  </div>
                                 <div className="grid grid-cols-2 gap-2">
                                   <div>
                                     <label className="text-[10px] text-text-muted mb-1 block">Border Color</label>
                                     <div className="flex items-center gap-2 bg-background border border-surface-highlight rounded px-2 py-1 h-[32px]">
                                       <input 
                                         aria-label="Color" type="color"
                                         value={
                                           (selectedTile.properties as BaseTextProperties).borderColor && 
                                           (selectedTile.properties as BaseTextProperties).borderColor !== 'transparent'
                                             ? String((selectedTile.properties as BaseTextProperties).borderColor)
                                             : '#ffffff'
                                         }
                                         onChange={(e) => updateSelectedTileProperty('borderColor', e.target.value)}
                                         className="w-5 h-5 cursor-pointer rounded border-none bg-transparent p-0"
                                       />
                                       <span className="text-[10px] text-text font-mono truncate flex-1">
                                         {(selectedTile.properties as BaseTextProperties).borderColor === 'transparent' 
                                           ? 'Transparent' 
                                           : String((selectedTile.properties as BaseTextProperties).borderColor || 'Transparent')}
                                       </span>
                                       <button aria-label="Clear Border (Transparent)"
                                         onClick={() => updateSelectedTileProperty('borderColor', 'transparent')}
                                         className="ml-1 p-1 hover:bg-surface-highlight rounded text-text-muted hover:text-text transition-colors"
                                         title="Clear Border (Transparent)"
                                       >
                                         <div className="w-3 h-3 relative">
                                           <div className="absolute inset-0 border border-current rounded-sm"></div>
                                           <div className="absolute inset-0 flex items-center justify-center">
                                             <div className="w-full h-[1px] bg-current rotate-45"></div>
                                           </div>
                                         </div>
                                       </button>
                                     </div>
                                   </div>
                                   <div>
                                     <label className="text-[10px] text-text-muted mb-1 block">Width (px)</label>
                                     <input aria-label="Width (px)"
                                       type="number" 
                                       value={Number((selectedTile.properties as BaseTextProperties).borderWidth || 0)}
                                       onChange={(e) => updateSelectedTileProperty('borderWidth', Number(e.target.value))}
                                       className="w-full bg-background border border-surface-highlight rounded px-2 py-1 text-xs text-text focus:border-primary focus:outline-none"
                                     />
                                   </div>
                                   <div>
                                     <label className="text-[10px] text-text-muted mb-1 block">Radius (px)</label>
                                     <input aria-label="Radius (px)"
                                       type="number" 
                                       value={Number((selectedTile.properties as BaseTextProperties).borderRadius || 0)}
                                       onChange={(e) => updateSelectedTileProperty('borderRadius', Number(e.target.value))}
                                       className="w-full bg-background border border-surface-highlight rounded px-2 py-1 text-xs text-text focus:border-primary focus:outline-none"
                                     />
                                   </div>
                                   <div>
                                     <label className="text-[10px] text-text-muted mb-1 block">Padding (px)</label>
                                     <input aria-label="Padding (px)"
                                       type="number" 
                                       value={Number((selectedTile.properties as BaseTextProperties).padding || 0)}
                                       onChange={(e) => updateSelectedTileProperty('padding', Number(e.target.value))}
                                       className="w-full bg-background border border-surface-highlight rounded px-2 py-1 text-xs text-text focus:border-primary focus:outline-none"
                                     />
                                   </div>
                                 </div>
                               </div>
                             </div>

                             <div className="pt-2 border-t border-surface-highlight mt-2">
                               <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 block">Text Shadow</label>
                               <div className="grid grid-cols-2 gap-3">
                                 <div>
                                   <label className="text-[10px] text-text-muted mb-1 block">Color</label>
                                   <input aria-label="Color"
                                      type="color"
                                     value={String(((selectedTile.properties as BaseTextProperties).textShadow as TextShadowProps | undefined)?.color || '#000000')}
                                     onChange={(e) => updateSelectedTileProperty('textShadow', { ...(((selectedTile.properties as BaseTextProperties).textShadow as TextShadowProps | undefined) || {}), color: e.target.value })}
                                     className="w-full h-8 cursor-pointer rounded border border-surface-highlight bg-transparent"
                                   />
                                 </div>
                                 <div>
                                   <label className="text-[10px] text-text-muted mb-1 block">Blur (px)</label>
                                   <input aria-label="Blur (px)"
                                     type="number" 
                                     value={Number(((selectedTile.properties as BaseTextProperties).textShadow as TextShadowProps | undefined)?.blur || 0)}
                                     onChange={(e) => updateSelectedTileProperty('textShadow', { ...(((selectedTile.properties as BaseTextProperties).textShadow as TextShadowProps | undefined) || {}), blur: Number(e.target.value) })}
                                     className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-xs text-text"
                                   />
                                 </div>
                                 <div>
                                   <label className="text-[10px] text-text-muted mb-1 block">X Offset</label>
                                   <input aria-label="X Offset"
                                     type="number" 
                                     value={Number(((selectedTile.properties as BaseTextProperties).textShadow as TextShadowProps | undefined)?.offsetX || 0)}
                                     onChange={(e) => updateSelectedTileProperty('textShadow', { ...(((selectedTile.properties as BaseTextProperties).textShadow as TextShadowProps | undefined) || {}), offsetX: Number(e.target.value) })}
                                     className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-xs text-text"
                                   />
                                 </div>
                                 <div>
                                   <label className="text-[10px] text-text-muted mb-1 block">Y Offset</label>
                                   <input aria-label="Y Offset"
                                     type="number" 
                                     value={Number(((selectedTile.properties as BaseTextProperties).textShadow as TextShadowProps | undefined)?.offsetY || 0)}
                                     onChange={(e) => updateSelectedTileProperty('textShadow', { ...(((selectedTile.properties as BaseTextProperties).textShadow as TextShadowProps | undefined) || {}), offsetY: Number(e.target.value) })}
                                     className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-xs text-text"
                                   />
                                 </div>
                               </div>
                             </div>
                          </div>

                          {/* Specific Text Tile Properties */}
                          {selectedTile.type === 'dynamic_text' && (
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Data Source</label>
                              <select aria-label="Data Source"
                                value={String((selectedTile.properties as DynamicTextProperties).dataSource || 'none')}
                                onChange={(e) => updateSelectedTileProperty('dataSource', e.target.value)}
                                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                              >
                                <option value="none">None</option>
                                <option value="time">Current Time</option>
                                <option value="weather">Weather</option>
                                <option value="menu">Menu Item</option>
                                <option value="google_sheets">Google Sheets</option>
                              </select>

                              <div className="grid grid-cols-2 gap-3 mt-2">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Refresh (sec)</label>
                                  <input aria-label="Refresh (sec)"
                                    type="number" 
                                    min="0"
                                    value={Number((selectedTile.properties as DynamicTextProperties).updateInterval || 60)}
                                    onChange={(e) => updateSelectedTileProperty('updateInterval', Number(e.target.value))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Fallback</label>
                                  <input aria-label="Fallback"
                                    type="text" 
                                    value={String((selectedTile.properties as DynamicTextProperties).fallbackText || '...')}
                                    onChange={(e) => updateSelectedTileProperty('fallbackText', e.target.value)}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                              </div>

                              {(selectedTile.properties as DynamicTextProperties).dataSource === 'google_sheets' && (
                                <div className="space-y-3 pt-2 border-t border-surface-highlight mt-2">
                                  <div>
                                    <label className="text-xs text-text-muted mb-1 block">Web App Script URL</label>
                                    <input aria-label="Web App Script URL"
                                      type="text" 
                                      value={String((selectedTile.properties as DynamicTextProperties).scriptUrl || '')}
                                      onChange={(e) => updateSelectedTileProperty('scriptUrl', e.target.value)}
                                      placeholder="https://script.google.com/macros/s/.../exec"
                                      className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-xs text-text focus:border-primary focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-text-muted mb-1 block">Workbook ID</label>
                                    <input aria-label="Workbook ID"
                                      type="text" 
                                      value={String((selectedTile.properties as DynamicTextProperties).workbookId || '')}
                                      onChange={(e) => updateSelectedTileProperty('workbookId', e.target.value)}
                                      placeholder="ID from Sheet URL"
                                      className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-xs text-text focus:border-primary focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-text-muted mb-1 block">Sheet Name</label>
                                    <input aria-label="Sheet Name"
                                      type="text" 
                                      value={String((selectedTile.properties as DynamicTextProperties).sheetName || 'Sheet1')}
                                      onChange={(e) => updateSelectedTileProperty('sheetName', e.target.value)}
                                      className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-xs text-text focus:border-primary focus:outline-none"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-xs text-text-muted mb-1 block">Column (A, B...)</label>
                                      <input aria-label="Column (A, B...)"
                                        type="text" 
                                        value={String((selectedTile.properties as DynamicTextProperties).column || 'A')}
                                        onChange={(e) => updateSelectedTileProperty('column', e.target.value.toUpperCase())}
                                        className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-xs text-text focus:border-primary focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-text-muted mb-1 block">Row (1, 2...)</label>
                                      <input aria-label="Row (1, 2...)"
                                        type="number" 
                                        min="1"
                                        value={Number((selectedTile.properties as DynamicTextProperties).row || 1)}
                                        onChange={(e) => updateSelectedTileProperty('row', Number(e.target.value))}
                                        className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-xs text-text focus:border-primary focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {selectedTile.type === 'scrolling_text' && (
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Scrolling Animation</label>
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Speed (px/s)</label>
                                  <input aria-label="Speed (px/s)"
                                    type="range" 
                                    min="10" 
                                    max="500" 
                                    value={(selectedTile.properties as ScrollingTextProperties).scrollSpeed || 100}
                                    onChange={(e) => updateSelectedTileProperty('scrollSpeed', Number(e.target.value))}
                                    className="w-full accent-primary h-1 bg-surface-highlight rounded-lg appearance-none cursor-pointer"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Direction</label>
                                  <select aria-label="Direction"
                                    value={(selectedTile.properties as ScrollingTextProperties).scrollDirection || 'left'}
                                    onChange={(e) => updateSelectedTileProperty('scrollDirection', e.target.value)}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none appearance-none"
                                  >
                                    <option value="left">Left</option>
                                    <option value="right">Right</option>
                                    <option value="up">Up</option>
                                    <option value="down">Down</option>
                                  </select>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={(selectedTile.properties as ScrollingTextProperties).loop !== false}
                                      onChange={(e) => updateSelectedTileProperty('loop', e.target.checked)}
                                      className="rounded border-surface-highlight bg-background text-primary focus:ring-0"
                                    />
                                    Loop
                                  </label>
                                  <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={(selectedTile.properties as ScrollingTextProperties).pauseOnHover !== false}
                                      onChange={(e) => updateSelectedTileProperty('pauseOnHover', e.target.checked)}
                                      className="rounded border-surface-highlight bg-background text-primary focus:ring-0"
                                    />
                                    Pause on Hover
                                  </label>
                                  <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={(selectedTile.properties as ScrollingTextProperties).bounce !== false}
                                      onChange={(e) => updateSelectedTileProperty('bounce', e.target.checked)}
                                      className="rounded border-surface-highlight bg-background text-primary focus:ring-0"
                                    />
                                    Bounce
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'marquee' && (
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Marquee Options</label>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Speed</label>
                                  <input aria-label="Speed"
                                    type="number" 
                                    value={Number((selectedTile.properties as MarqueeProperties).speed || 6)}
                                    onChange={(e) => updateSelectedTileProperty('speed', Number(e.target.value))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Direction</label>
                                  <select aria-label="Direction"
                                    value={String((selectedTile.properties as MarqueeProperties).direction || 'left')}
                                    onChange={(e) => updateSelectedTileProperty('direction', e.target.value)}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  >
                                    <option value="left">Left</option>
                                    <option value="right">Right</option>
                                    <option value="up">Up</option>
                                    <option value="down">Down</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'typewriter' && (
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Typewriter Options</label>
                              <div className="text-xs text-text-muted italic">
                                Typing effect is automatic. Customize text content above.
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'text_shadow' && (
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Shadow Layers</label>
                              <div className="space-y-4">
                                {((selectedTile.properties as TextShadowTileProperties).shadows || []).map((shadow: TextShadowProps, index: number) => (
                                  <div key={index} className="p-3 border border-surface-highlight rounded bg-surface-highlight/5 relative group">
                                    <button 
                                      onClick={() => {
                                        const newShadows = ((selectedTile.properties as TextShadowTileProperties).shadows || []).filter((_, i) => i !== index);
                                        updateSelectedTileProperty('shadows', newShadows);
                                      }}
                                      className="absolute top-2 right-2 p-1 hover:bg-red-500/20 text-text-muted hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                       <div>
                                         <label className="text-[10px] text-text-muted block">Color</label>
                                         <input aria-label="Color"  type="color" value={shadow.color || '#000000'}
                                            onChange={(e) => {
                                              const newShadows = [...((selectedTile.properties as TextShadowTileProperties).shadows || [])];
                                              newShadows[index] = { ...newShadows[index], color: e.target.value };
                                              updateSelectedTileProperty('shadows', newShadows);
                                            }}
                                            className="w-full h-6 rounded cursor-pointer"
                                         />
                                       </div>
                                       <div>
                                         <label className="text-[10px] text-text-muted block">Blur</label>
                                         <input aria-label="Blur" type="number" value={shadow.blur || 0}
                                            onChange={(e) => {
                                              const newShadows = [...((selectedTile.properties as TextShadowTileProperties).shadows || [])];
                                              newShadows[index] = { ...newShadows[index], blur: Number(e.target.value) };
                                              updateSelectedTileProperty('shadows', newShadows);
                                            }}
                                            className="w-full bg-background border border-surface-highlight rounded px-2 py-1 text-xs"
                                         />
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                       <div>
                                         <label className="text-[10px] text-text-muted block">X Offset</label>
                                         <input aria-label="X Offset" type="number" value={shadow.offsetX || 0}
                                            onChange={(e) => {
                                              const newShadows = [...((selectedTile.properties as TextShadowTileProperties).shadows || [])];
                                              newShadows[index] = { ...newShadows[index], offsetX: Number(e.target.value) };
                                              updateSelectedTileProperty('shadows', newShadows);
                                            }}
                                            className="w-full bg-background border border-surface-highlight rounded px-2 py-1 text-xs"
                                         />
                                       </div>
                                       <div>
                                         <label className="text-[10px] text-text-muted block">Y Offset</label>
                                         <input aria-label="Y Offset" type="number" value={shadow.offsetY || 0}
                                            onChange={(e) => {
                                              const newShadows = [...((selectedTile.properties as TextShadowTileProperties).shadows || [])];
                                              newShadows[index] = { ...newShadows[index], offsetY: Number(e.target.value) };
                                              updateSelectedTileProperty('shadows', newShadows);
                                            }}
                                            className="w-full bg-background border border-surface-highlight rounded px-2 py-1 text-xs"
                                         />
                                       </div>
                                    </div>
                                  </div>
                                ))}
                                <button 
                                  onClick={() => {
                                    const newShadows = [...((selectedTile.properties as TextShadowTileProperties).shadows || []), { color: '#000000', blur: 4, offsetX: 2, offsetY: 2 }];
                                    updateSelectedTileProperty('shadows', newShadows);
                                  }}
                                  className="w-full py-1 text-xs text-primary border border-primary/30 rounded hover:bg-primary/10 transition-colors"
                                >
                                  + Add Shadow Layer
                                </button>
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'word_art' && (
                             <div className="space-y-3">
                               <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Effect Style</label>
                               <select aria-label="Effect Style"
                                 value={String((selectedTile.properties as WordArtProperties).effect || 'glow')}
                                 onChange={(e) => updateSelectedTileProperty('effect', e.target.value)}
                                 className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                               >
                                 <option value="glow">Glow</option>
                                 <option value="outline">Outline</option>
                                 <option value="3d">3D</option>
                               </select>
                               {(selectedTile.properties as WordArtProperties).effect === 'glow' && (
                                 <div>
                                   <label className="text-xs text-text-muted mb-1 block">Glow Color</label>
                                   <input aria-label="Glow Color"
                                      type="color"
                                     value={String((selectedTile.properties as WordArtProperties).glowColor || '#00ffff')}
                                     onChange={(e) => updateSelectedTileProperty('glowColor', e.target.value)}
                                     className="w-full h-8 cursor-pointer rounded border border-surface-highlight bg-transparent"
                                   />
                                 </div>
                               )}
                               {(selectedTile.properties as WordArtProperties).effect === 'outline' && (
                                 <div>
                                   <label className="text-xs text-text-muted mb-1 block">Outline Color</label>
                                   <input aria-label="Outline Color"
                                      type="color"
                                     value={String((selectedTile.properties as WordArtProperties).outlineColor || '#000000')}
                                     onChange={(e) => updateSelectedTileProperty('outlineColor', e.target.value)}
                                     className="w-full h-8 cursor-pointer rounded border border-surface-highlight bg-transparent"
                                   />
                                 </div>
                               )}
                             </div>
                          )}
                          
                          {selectedTile.type === 'gradient_text' && (
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Gradient</label>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Colors</label>
                                <div className="space-y-2">
                                  {((selectedTile.properties as GradientTextProperties).gradientColors || ['#ffffff', '#000000']).map((color, index) => (
                                    <div key={index} className="flex gap-2">
                                      <div className="flex items-center gap-2 bg-background border border-surface-highlight rounded px-2 py-1 flex-1">
                                        <input 
                                          aria-label="Color" type="color"
                                          value={color}
                                          onChange={(e) => {
                                            const newColors = [...((selectedTile.properties as GradientTextProperties).gradientColors || ['#ffffff', '#000000'])];
                                            newColors[index] = e.target.value;
                                            updateSelectedTileProperty('gradientColors', newColors);
                                          }}
                                          className="w-6 h-6 cursor-pointer rounded border-none bg-transparent p-0"
                                        />
                                        <input 
                                          type="text" 
                                          value={color}
                                          onChange={(e) => {
                                             const newColors = [...((selectedTile.properties as GradientTextProperties).gradientColors || ['#ffffff', '#000000'])];
                                             newColors[index] = e.target.value;
                                             updateSelectedTileProperty('gradientColors', newColors);
                                          }}
                                          className="flex-1 bg-transparent border-none text-xs text-text focus:outline-none"
                                        />
                                      </div>
                                      <button 
                                        onClick={() => {
                                          const newColors = ((selectedTile.properties as GradientTextProperties).gradientColors || ['#ffffff', '#000000']).filter((_, i) => i !== index);
                                          updateSelectedTileProperty('gradientColors', newColors);
                                        }}
                                        className="p-2 hover:bg-red-500/20 text-text-muted hover:text-red-500 rounded transition-colors"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  ))}
                                  <button 
                                    onClick={() => {
                                      const newColors = [...((selectedTile.properties as GradientTextProperties).gradientColors || ['#ffffff', '#000000']), '#ffffff'];
                                      updateSelectedTileProperty('gradientColors', newColors);
                                    }}
                                    className="w-full py-1 text-xs text-primary border border-primary/30 rounded hover:bg-primary/10 transition-colors"
                                  >
                                    + Add Color
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Angle</label>
                                <input aria-label="Angle"
                                   type="range" 
                                   min="0" 
                                   max="360"
                                   value={Number((selectedTile.properties as GradientTextProperties).gradientAngle || 45)}
                                   onChange={(e) => updateSelectedTileProperty('gradientAngle', Number(e.target.value))}
                                   className="w-full accent-primary h-1 bg-surface-highlight rounded-lg appearance-none cursor-pointer"
                                />
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'animated_text' && (
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Animation</label>
                              <select aria-label="Animation"
                                value={String((selectedTile.properties as AnimatedTextProperties).animationType || 'bounce')}
                                onChange={(e) => updateSelectedTileProperty('animationType', e.target.value)}
                                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                              >
                                <option value="bounce">Bounce</option>
                                <option value="pulse">Pulse</option>
                                <option value="spin">Spin</option>
                                <option value="ping">Ping</option>
                              </select>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Duration (sec)</label>
                                <input aria-label="Duration (sec)"
                                   type="number" 
                                   step="0.1"
                                   min="0.1"
                                   value={Number((selectedTile.properties as AnimatedTextProperties).animationDuration || 1)}
                                   onChange={(e) => updateSelectedTileProperty('animationDuration', Number(e.target.value))}
                                   className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Media Tile Properties */}
                      {isMediaTile(selectedTile.type) && (
                        <>
                          {selectedTile.type !== 'webcam' && (
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Source</label>
                              
                              {/* URL Input for all media types */}
                              <div className="space-y-2">
                                <label className="text-xs text-text-muted block">
                                  {selectedTile.type === 'youtube' || selectedTile.type === 'vimeo' ? 'Video ID or URL' : 'File URL'}
                                </label>
                                <input 
                                  type="text" 
                                  value={String(
                                    (selectedTile.properties as ImageTileProperties).url || (selectedTile.properties as VideoTileProperties).videoId || ''
                                  )}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (selectedTile.type === 'youtube' || selectedTile.type === 'vimeo') {
                                      // Simple extraction if full URL provided
                                      let id = val;
                                      if (val.includes('youtube.com/watch?v=')) id = val.split('v=')[1].split('&')[0];
                                      if (val.includes('youtu.be/')) id = val.split('youtu.be/')[1];
                                      if (val.includes('vimeo.com/')) id = val.split('vimeo.com/')[1];
                                      updateSelectedTileProperty('videoId', id);
                                    } else {
                                      updateSelectedTileProperty('url', val);
                                    }
                                  }}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  placeholder={selectedTile.type === 'youtube' ? 'Video ID (e.g. dQw4w9WgXcQ)' : 'https://...'}
                                />
                              </div>

                              {/* Upload Button for file-based media */}
                              {['image', 'video', 'gif', 'audio', 'lottie', 'background_video'].includes(selectedTile.type) && (
                                <div className="mt-2">
                                  <label className="flex items-center justify-center gap-2 w-full bg-surface-highlight hover:bg-surface-highlight/80 text-text text-sm py-2 rounded cursor-pointer transition-colors border border-surface-highlight">
                                    {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={16} />}
                                    {uploading ? 'Uploading...' : 'Upload File'}
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept={
                                        selectedTile.type === 'image' || selectedTile.type === 'gif' ? 'image/*' :
                                        selectedTile.type === 'audio' ? 'audio/*' :
                                        selectedTile.type === 'lottie' ? '.json' : 'video/*'
                                      }
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                          handleImageUpload(e.target.files[0]); // Reusing image upload for now, rename later
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                          )}

                          {selectedTile.type === 'webcam' && (
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Webcam Settings</label>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  checked={!!(selectedTile.properties as WebcamTileProperties).mirror}
                                  onChange={(e) => updateSelectedTileProperty('mirror', e.target.checked)}
                                  className="rounded border-surface-highlight bg-background text-primary focus:ring-0"
                                />
                                <label className="text-sm text-text">Mirror Video</label>
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Device ID (Optional)</label>
                                <input aria-label="Device ID (Optional)"
                                  type="text" 
                                  value={String((selectedTile.properties as WebcamTileProperties).deviceId || '')}
                                  onChange={(e) => updateSelectedTileProperty('deviceId', e.target.value)}
                                  placeholder="default"
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                                <p className="text-[10px] text-text-muted mt-1">Leave blank to use system default camera.</p>
                              </div>
                            </div>
                          )}

                          {/* Image Specifics */}
                          {['image', 'gif'].includes(selectedTile.type) && (
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Display</label>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Fit Mode</label>
                                  <select aria-label="Fit Mode"
                                    value={String((selectedTile.properties as ImageTileProperties).fitMode || 'cover')}
                                    onChange={(e) => updateSelectedTileProperty('fitMode', e.target.value)}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none appearance-none"
                                  >
                                    <option value="cover">Cover</option>
                                    <option value="contain">Contain</option>
                                    <option value="fill">Fill</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Radius</label>
                                  <input aria-label="Radius"
                                    type="number" 
                                    value={Number((selectedTile.properties as ImageTileProperties).borderRadius || 0)}
                                    onChange={(e) => updateSelectedTileProperty('borderRadius', Number(e.target.value))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                              </div>
                              
                              <div className="pt-2">
                                <label className="text-xs text-text-muted mb-1 block">Filters</label>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] w-12 text-text-muted">Bright</span>
                                    <input 
                                      type="range" min="0" max="200" 
                                      value={Number(((selectedTile.properties as ImageTileProperties).filters as Record<string, number> || {}).brightness || 100)}
                                      onChange={(e) => {
                                        const filters = ((selectedTile.properties as ImageTileProperties).filters as Record<string, number>) || {};
                                        updateSelectedTileProperty('filters', { ...filters, brightness: Number(e.target.value) });
                                      }}
                                      className="flex-1 accent-primary h-1 bg-surface-highlight rounded-lg appearance-none cursor-pointer"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] w-12 text-text-muted">Blur</span>
                                    <input 
                                      type="range" min="0" max="20" 
                                      value={Number(((selectedTile.properties as ImageTileProperties).filters as Record<string, number> || {}).blur || 0)}
                                      onChange={(e) => {
                                        const filters = ((selectedTile.properties as ImageTileProperties).filters as Record<string, number>) || {};
                                        updateSelectedTileProperty('filters', { ...filters, blur: Number(e.target.value) });
                                      }}
                                      className="flex-1 accent-primary h-1 bg-surface-highlight rounded-lg appearance-none cursor-pointer"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Video/Audio Specifics */}
                          {['video', 'audio', 'youtube', 'vimeo', 'background_video'].includes(selectedTile.type) && (
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Playback</label>
                              <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!!(selectedTile.properties as VideoTileProperties).autoplay}
                                    onChange={(e) => updateSelectedTileProperty('autoplay', e.target.checked)}
                                    className="rounded border-surface-highlight bg-background text-primary focus:ring-0"
                                  />
                                  Autoplay
                                </label>
                                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!!(selectedTile.properties as VideoTileProperties).loop}
                                    onChange={(e) => updateSelectedTileProperty('loop', e.target.checked)}
                                    className="rounded border-surface-highlight bg-background text-primary focus:ring-0"
                                  />
                                  Loop
                                </label>
                                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!!(selectedTile.properties as VideoTileProperties).muted}
                                    onChange={(e) => updateSelectedTileProperty('muted', e.target.checked)}
                                    className="rounded border-surface-highlight bg-background text-primary focus:ring-0"
                                  />
                                  Muted
                                </label>
                                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!!(selectedTile.properties as VideoTileProperties).controls}
                                    onChange={(e) => updateSelectedTileProperty('controls', e.target.checked)}
                                    className="rounded border-surface-highlight bg-background text-primary focus:ring-0"
                                  />
                                  Controls
                                </label>
                                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!!(selectedTile.properties as VideoTileProperties).bounce}
                                    onChange={(e) => updateSelectedTileProperty('bounce', e.target.checked)}
                                    className="rounded border-surface-highlight bg-background text-primary focus:ring-0"
                                  />
                                  Bounce
                                </label>
                                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!!(selectedTile.properties as VideoTileProperties).reverse}
                                    onChange={(e) => updateSelectedTileProperty('reverse', e.target.checked)}
                                    className="rounded border-surface-highlight bg-background text-primary focus:ring-0"
                                  />
                                  Reverse
                                </label>
                              </div>
                            </div>
                          )}

                          {/* Slideshow Specifics */}
                          {selectedTile.type === 'slideshow' && (
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Slideshow Settings</label>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Interval (ms)</label>
                                <input aria-label="Interval (ms)"
                                  type="number" 
                                  min="1000"
                                  step="500"
                                  value={Number((selectedTile.properties as SlideshowTileProperties).interval || 3000)}
                                  onChange={(e) => updateSelectedTileProperty('interval', Number(e.target.value))}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                              
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Images</label>
                                <div className="space-y-2">
                                  {((selectedTile.properties as SlideshowTileProperties).images || []).map((img, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                      <div className="w-10 h-10 bg-black/20 rounded overflow-hidden border border-surface-highlight shrink-0">
                                        {img.url ? (
                                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-text-muted"><ImageIcon size={14} /></div>
                                        )}
                                      </div>
                                      <input 
                                        type="text" 
                                        value={img.url} 
                                        onChange={(e) => {
                                          const newImages = [...((selectedTile.properties as SlideshowTileProperties).images || [])];
                                          newImages[index] = { ...newImages[index], url: e.target.value };
                                          updateSelectedTileProperty('images', newImages);
                                        }}
                                        className="flex-1 bg-background border border-surface-highlight rounded px-2 py-1 text-xs text-text focus:border-primary focus:outline-none"
                                        placeholder="https://..."
                                      />
                                      <button 
                                        onClick={() => {
                                          const newImages = ((selectedTile.properties as SlideshowTileProperties).images || []).filter((_, i) => i !== index);
                                          updateSelectedTileProperty('images', newImages);
                                        }}
                                        className="p-1.5 hover:bg-red-500/20 text-text-muted hover:text-red-500 rounded transition-colors"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  ))}
                                  
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => {
                                        const newImages = [...((selectedTile.properties as SlideshowTileProperties).images || []), { url: '' }];
                                        updateSelectedTileProperty('images', newImages);
                                      }}
                                      className="flex-1 py-1 text-xs text-primary border border-primary/30 rounded hover:bg-primary/10 transition-colors"
                                    >
                                      + Add URL
                                    </button>
                                    <label className="flex-1 flex items-center justify-center gap-2 py-1 text-xs text-primary border border-primary/30 rounded hover:bg-primary/10 transition-colors cursor-pointer">
                                      <Upload size={12} />
                                      Upload
                                      <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        multiple
                                        onChange={async (e) => {
                                          if (e.target.files && e.target.files.length > 0) {
                                            const newImages = [...((selectedTile.properties as SlideshowTileProperties).images || [])];
                                            setUploading(true);
                                            try {
                                              for (let i = 0; i < e.target.files.length; i++) {
                                                const file = e.target.files[i];
                                                const path = isTemplateMode 
                                                  ? `templates/slides/${crypto.randomUUID()}/${file.name}`
                                                  : STORAGE_PATHS.SLIDE_ASSETS(slide!.id);
                                                const url = await StorageService.uploadFile(file, path);
                                                newImages.push({ url });
                                              }
                                              updateSelectedTileProperty('images', newImages);
                                            } catch (err) {
                                              console.error(err);
                                              alert('Failed to upload one or more images');
                                            } finally {
                                              setUploading(false);
                                            }
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Data Tile Properties */}
                      {isDataTile(selectedTile.type) && (
                        <>
                          <div className="space-y-3">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Data Configuration</label>
                            
                            {/* Color Scheme */}
                            <div>
                              <label className="text-xs text-text-muted mb-1 block">Primary Color</label>
                              <div className="flex items-center gap-2 bg-background border border-surface-highlight rounded px-2 py-1 h-[38px]">
                                <input 
                                  aria-label="Color" type="color"
                                  value={String((selectedTile.properties as ChartProperties).color || '#8884d8')}
                                  onChange={(e) => updateSelectedTileProperty('color', e.target.value)}
                                  className="w-6 h-6 cursor-pointer rounded border-none bg-transparent p-0"
                                />
                                <span className="text-xs text-text font-mono truncate">{String((selectedTile.properties as ChartProperties).color || '#8884d8')}</span>
                              </div>
                            </div>

                            {/* Data Source Configuration */}
                            {['bar_chart', 'line_chart', 'pie_chart', 'sparklines', 'heatmap', 'table', 'timeline'].includes(selectedTile.type) && (
                              <div className="mt-4 space-y-3 border-t border-surface-highlight pt-4">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Data Source</label>
                                
                                <select aria-label="Data Source"
                                  value={String((selectedTile.properties as DataTileSourceProperties).dataSourceType || 'manual')}
                                  onChange={(e) => updateSelectedTileProperty('dataSourceType', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                >
                                  <option value="manual">Manual (CSV)</option>
                                  <option value="json">JSON</option>
                                  <option value="google_sheets">Google Sheets</option>
                                </select>

                                {(selectedTile.properties as DataTileSourceProperties).dataSourceType === 'manual' && (
                                  <div>
                                    <label className="text-xs text-text-muted mb-1 block">
                                      CSV Data (Label,Value)
                                    </label>
                                    <textarea aria-label="CSV Data (Label,Value)"
                                      value={String((selectedTile.properties as DataTileSourceProperties).manualData || '')}
                                      onChange={(e) => updateSelectedTileProperty('manualData', e.target.value)}
                                      className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-xs text-text font-mono focus:border-primary focus:outline-none"
                                      rows={5}
                                      placeholder="Jan,400&#10;Feb,300&#10;Mar,600"
                                    />
                                    <p className="text-[10px] text-text-muted mt-1">Enter data as comma-separated values. First column is label/x-axis, second is value/y-axis.</p>
                                  </div>
                                )}

                                {(selectedTile.properties as DataTileSourceProperties).dataSourceType === 'json' && (
                                  <div>
                                    <label className="text-xs text-text-muted mb-1 block">
                                      JSON Data
                                    </label>
                                    <textarea aria-label="JSON Data"
                                      value={String((selectedTile.properties as DataTileSourceProperties).jsonData || '')}
                                      onChange={(e) => updateSelectedTileProperty('jsonData', e.target.value)}
                                      className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-xs text-text font-mono focus:border-primary focus:outline-none"
                                      rows={5}
                                      placeholder={'[{"name":"Jan","value":400},{"name":"Feb","value":300}]'}
                                    />
                                    <p className="text-[10px] text-text-muted mt-1">Enter a valid JSON array of objects.</p>
                                  </div>
                                )}

                                {(selectedTile.properties as DataTileSourceProperties).dataSourceType === 'google_sheets' && (
                                  <div className="space-y-2">
                                    <div>
                                      <label className="text-xs text-text-muted mb-1 block">Script URL</label>
                                      <input aria-label="Script URL"
                                        type="text" 
                                        value={String((selectedTile.properties as DataTileSourceProperties).googleSheetConfig?.scriptUrl || '')}
                                        onChange={(e) => {
                                          const config = (selectedTile.properties as DataTileSourceProperties).googleSheetConfig || {};
                                          updateSelectedTileProperty('googleSheetConfig', { ...config, scriptUrl: e.target.value });
                                        }}
                                        className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                        placeholder="https://script.google.com/..."
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-text-muted mb-1 block">Sheet ID</label>
                                      <input aria-label="Sheet ID"
                                        type="text" 
                                        value={String((selectedTile.properties as DataTileSourceProperties).googleSheetConfig?.workbookId || '')}
                                        onChange={(e) => {
                                          const config = (selectedTile.properties as DataTileSourceProperties).googleSheetConfig || {};
                                          updateSelectedTileProperty('googleSheetConfig', { ...config, workbookId: e.target.value });
                                        }}
                                        className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                        placeholder="1BxiMvs0XRA5nSL..."
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-xs text-text-muted mb-1 block">Sheet Name</label>
                                        <input aria-label="Sheet Name"
                                          type="text" 
                                          value={String((selectedTile.properties as DataTileSourceProperties).googleSheetConfig?.sheetName || '')}
                                          onChange={(e) => {
                                            const config = (selectedTile.properties as DataTileSourceProperties).googleSheetConfig || {};
                                            updateSelectedTileProperty('googleSheetConfig', { ...config, sheetName: e.target.value });
                                          }}
                                          className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                          placeholder="Sheet1"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-text-muted mb-1 block">Range</label>
                                        <input aria-label="Range"
                                          type="text" 
                                          value={String((selectedTile.properties as DataTileSourceProperties).googleSheetConfig?.range || '')}
                                          onChange={(e) => {
                                            const config = (selectedTile.properties as DataTileSourceProperties).googleSheetConfig || {};
                                            updateSelectedTileProperty('googleSheetConfig', { ...config, range: e.target.value });
                                          }}
                                          className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                          placeholder="A1:B10"
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs text-text-muted mb-1 block">Update Interval (sec)</label>
                                      <input aria-label="Update Interval (sec)"
                                        type="number" 
                                        min="10"
                                        value={Number((selectedTile.properties as DataTileSourceProperties).googleSheetConfig?.updateInterval || 60)}
                                        onChange={(e) => {
                                          const config = (selectedTile.properties as DataTileSourceProperties).googleSheetConfig || {};
                                          updateSelectedTileProperty('googleSheetConfig', { ...config, updateInterval: Number(e.target.value) });
                                        }}
                                        className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {selectedTile.type === 'pie_chart' && (
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Inner Radius (Donut)</label>
                                <input aria-label="Inner Radius (Donut)"
                                  type="number" 
                                  min="0"
                                  max="100"
                                  value={Number(
                                    (selectedTile.properties as PieChartProperties).innerRadius || 0
                                  )}
                                  onChange={(e) => updateSelectedTileProperty('innerRadius', Number(e.target.value))}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                            )}

                            {selectedTile.type === 'gauge' && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Min</label>
                                  <input aria-label="Min"
                                    type="number" 
                                    value={Number(
                                      (selectedTile.properties as GaugeProperties).min || 0
                                    )}
                                    onChange={(e) => updateSelectedTileProperty('min', Number(e.target.value))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Max</label>
                                  <input aria-label="Max"
                                    type="number" 
                                    value={Number(
                                      (selectedTile.properties as GaugeProperties).max || 100
                                    )}
                                    onChange={(e) => updateSelectedTileProperty('max', Number(e.target.value))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-xs text-text-muted mb-1 block">Value</label>
                                  <input aria-label="Value"
                                    type="number" 
                                    value={Number(
                                      (selectedTile.properties as GaugeProperties).value || 75
                                    )}
                                    onChange={(e) => updateSelectedTileProperty('value', Number(e.target.value))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedTile.type === 'kpi_card' && (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Title</label>
                                  <input aria-label="Title"
                                    type="text" 
                                    value={String((selectedTile.properties as KPICardProperties).title || 'KPI Title')}
                                    onChange={(e) => updateSelectedTileProperty('title', e.target.value)}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs text-text-muted mb-1 block">Value</label>
                                    <input aria-label="Value"
                                      type="text" 
                                      value={String((selectedTile.properties as KPICardProperties).value || '0')}
                                      onChange={(e) => updateSelectedTileProperty('value', e.target.value)}
                                      className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-text-muted mb-1 block">Unit</label>
                                    <input aria-label="Unit"
                                      type="text" 
                                      value={String((selectedTile.properties as KPICardProperties).unit || '')}
                                      onChange={(e) => updateSelectedTileProperty('unit', e.target.value)}
                                      className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Change (%)</label>
                                  <input aria-label="Change (%)"
                                    type="number" 
                                    value={Number((selectedTile.properties as KPICardProperties).change || 0)}
                                    onChange={(e) => updateSelectedTileProperty('change', Number(e.target.value))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedTile.type === 'progress_bar' && (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Label</label>
                                  <input aria-label="Label"
                                    type="text" 
                                    value={String((selectedTile.properties as ProgressBarProperties).label || 'Progress')}
                                    onChange={(e) => updateSelectedTileProperty('label', e.target.value)}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Value (0-100)</label>
                                  <input aria-label="Value (0-100)"
                                    type="number" 
                                    min="0" 
                                    max="100"
                                    value={Number((selectedTile.properties as ProgressBarProperties).value || 50)}
                                    onChange={(e) => updateSelectedTileProperty('value', Number(e.target.value))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedTile.type === 'heatmap' && (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Low Color</label>
                                  <div className="flex items-center gap-2 bg-background border border-surface-highlight rounded px-2 py-1">
                                    <input 
                                      aria-label="Color" type="color"
                                      value={String((selectedTile.properties as HeatmapProperties).lowColor || '#ffffff')}
                                      onChange={(e) => updateSelectedTileProperty('lowColor', e.target.value)}
                                      className="w-6 h-6 cursor-pointer rounded border-none bg-transparent p-0"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">High Color</label>
                                  <div className="flex items-center gap-2 bg-background border border-surface-highlight rounded px-2 py-1">
                                    <input 
                                      aria-label="Color" type="color"
                                      value={String((selectedTile.properties as HeatmapProperties).highColor || '#EA580C')}
                                      onChange={(e) => updateSelectedTileProperty('highColor', e.target.value)}
                                      className="w-6 h-6 cursor-pointer rounded border-none bg-transparent p-0"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {selectedTile.type === 'sparklines' && (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Line Color</label>
                                  <div className="flex items-center gap-2 bg-background border border-surface-highlight rounded px-2 py-1">
                                    <input 
                                      aria-label="Color" type="color"
                                      value={String((selectedTile.properties as ChartProperties).color || '#EA580C')}
                                      onChange={(e) => updateSelectedTileProperty('color', e.target.value)}
                                      className="w-6 h-6 cursor-pointer rounded border-none bg-transparent p-0"
                                    />
                                  </div>
                                </div>
                                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={(selectedTile.properties as SparklineProperties).showArea !== false}
                                    onChange={(e) => updateSelectedTileProperty('showArea', e.target.checked)}
                                    className="rounded border-surface-highlight bg-background text-primary focus:ring-0"
                                  />
                                  Show Fill Area
                                </label>
                              </div>
                            )}

                            {selectedTile.type === 'table' && (
                              <div className="space-y-3">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Table Settings</label>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Headers (comma separated)</label>
                                  <input aria-label="Headers (comma separated)"
                                    type="text" 
                                    value={Array.isArray((selectedTile.properties as TableTileProperties).headers) ? ((selectedTile.properties as TableTileProperties).headers || []).join(', ') : 'H1, H2'}
                                    onChange={(e) => updateSelectedTileProperty('headers', e.target.value.split(',').map(s => s.trim()))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div className="text-xs text-text-muted mt-2">
                                  Connect to a Data Source to manage row data.
                                </div>
                              </div>
                            )}

                            {selectedTile.type === 'timeline' && (
                              <div className="space-y-3">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Timeline Settings</label>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Title</label>
                                  <input aria-label="Title"
                                    type="text" 
                                    value={String((selectedTile.properties as TimelineProperties).title || 'Timeline')}
                                    onChange={(e) => updateSelectedTileProperty('title', e.target.value)}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div className="text-xs text-text-muted mt-2">
                                  Events are currently using demo data.
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      {/* Interactive Tile Properties */}
                      {isInteractiveTile(selectedTile.type) && (
                        <div className="space-y-3">
                          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Interaction Settings</label>

                          {selectedTile.type === 'button' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Button Text</label>
                                <input aria-label="Button Text"
                                  type="text" 
                                  value={String((selectedTile.properties as InteractiveTileProperties).text || 'Click Me')}
                                  onChange={(e) => updateSelectedTileProperty('text', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Bg Color</label>
                                  <div className="flex items-center gap-2 bg-background border border-surface-highlight rounded px-2 py-1">
                                    <input 
                                      aria-label="Color" type="color"
                                      value={String((selectedTile.properties as InteractiveTileProperties).backgroundColor || '#00C49F')}
                                      onChange={(e) => updateSelectedTileProperty('backgroundColor', e.target.value)}
                                      className="w-6 h-6 cursor-pointer rounded border-none bg-transparent p-0"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Text Color</label>
                                  <div className="flex items-center gap-2 bg-background border border-surface-highlight rounded px-2 py-1">
                                    <input 
                                      aria-label="Color" type="color"
                                      value={String((selectedTile.properties as InteractiveTileProperties).textColor || '#ffffff')}
                                      onChange={(e) => updateSelectedTileProperty('textColor', e.target.value)}
                                      className="w-6 h-6 cursor-pointer rounded border-none bg-transparent p-0"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Border Radius</label>
                                <input aria-label="Border Radius"
                                  type="number" 
                                  value={Number((selectedTile.properties as InteractiveTileProperties).borderRadius || 4)}
                                  onChange={(e) => updateSelectedTileProperty('borderRadius', Number(e.target.value))}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'qr_code' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Source</label>
                                <select aria-label="Source"
                                  value={String((selectedTile.properties as InteractiveTileProperties).qrSource || 'custom')}
                                  onChange={(e) => updateSelectedTileProperty('qrSource', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                >
                                  <option value="custom">Custom URL</option>
                                  <option value="calendar_event">Next Calendar Event</option>
                                </select>
                              </div>
                              
                              {(selectedTile.properties as InteractiveTileProperties).qrSource === 'calendar_event' ? (
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Calendar Feed URL</label>
                                  <input aria-label="Calendar Feed URL"
                                    type="text" 
                                    value={String((selectedTile.properties as InteractiveTileProperties).calendarUrl || '')}
                                    onChange={(e) => updateSelectedTileProperty('calendarUrl', e.target.value)}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                    placeholder="https://.../basic.ics"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Content / URL</label>
                                  <input aria-label="Content / URL"
                                    type="text" 
                                    value={String((selectedTile.properties as InteractiveTileProperties).content || '')}
                                    onChange={(e) => updateSelectedTileProperty('content', e.target.value)}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                    placeholder="https://example.com"
                                  />
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Background</label>
                                  <div className="flex items-center gap-2 bg-background border border-surface-highlight rounded px-2 py-1">
                                    <input 
                                      aria-label="Color" type="color"
                                      value={String((selectedTile.properties as InteractiveTileProperties).backgroundColor || '#ffffff')}
                                      onChange={(e) => updateSelectedTileProperty('backgroundColor', e.target.value)}
                                      className="w-6 h-6 cursor-pointer rounded border-none bg-transparent p-0"
                                    />
                                    <span className="text-xs text-text-muted font-mono">{String((selectedTile.properties as InteractiveTileProperties).backgroundColor || '#ffffff')}</span>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Foreground</label>
                                  <div className="flex items-center gap-2 bg-background border border-surface-highlight rounded px-2 py-1">
                                    <input 
                                      aria-label="Color" type="color"
                                      value={String((selectedTile.properties as InteractiveTileProperties).qrForegroundColor || '#000000')}
                                      onChange={(e) => updateSelectedTileProperty('qrForegroundColor', e.target.value)}
                                      className="w-6 h-6 cursor-pointer rounded border-none bg-transparent p-0"
                                    />
                                    <span className="text-xs text-text-muted font-mono">{String((selectedTile.properties as InteractiveTileProperties).qrForegroundColor || '#000000')}</span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Error Correction Level</label>
                                <select aria-label="Error Correction Level"
                                  value={String((selectedTile.properties as InteractiveTileProperties).qrErrorCorrection || 'M')}
                                  onChange={(e) => updateSelectedTileProperty('qrErrorCorrection', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                >
                                  <option value="L">Low (7%)</option>
                                  <option value="M">Medium (15%)</option>
                                  <option value="Q">Quartile (25%)</option>
                                  <option value="H">High (30%)</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id="trackScan"
                                  checked={(selectedTile.properties as InteractiveTileProperties).trackScan !== false}
                                  onChange={(e) => updateSelectedTileProperty('trackScan', e.target.checked)}
                                  className="rounded border-surface-highlight bg-background text-primary focus:ring-primary"
                                />
                                <label htmlFor="trackScan" className="text-sm text-text cursor-pointer">Track Scans & Analytics</label>
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'countdown' && (
                            <div>
                              <label className="text-xs text-text-muted mb-1 block">Target Date</label>
                              <input aria-label="Target Date"
                                type="datetime-local" 
                                value={String((selectedTile.properties as InteractiveTileProperties).targetDate || '')}
                                onChange={(e) => updateSelectedTileProperty('targetDate', e.target.value)}
                                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                              />
                            </div>
                          )}

                          {selectedTile.type === 'form' && (
                            <div>
                              <label className="text-xs text-text-muted mb-1 block">Form Title</label>
                              <input aria-label="Form Title"
                                type="text" 
                                value={String((selectedTile.properties as InteractiveTileProperties).title || 'Contact Us')}
                                onChange={(e) => updateSelectedTileProperty('title', e.target.value)}
                                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                              />
                            </div>
                          )}

                          {selectedTile.type === 'poll' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Question</label>
                                <input aria-label="Question"
                                  type="text" 
                                  value={String((selectedTile.properties as InteractiveTileProperties).question || 'Poll Question?')}
                                  onChange={(e) => updateSelectedTileProperty('question', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Options (comma separated)</label>
                                <textarea aria-label="Options (comma separated)"
                                  value={Array.isArray((selectedTile.properties as InteractiveTileProperties).options) ? ((selectedTile.properties as InteractiveTileProperties).options || []).join(', ') : 'Option A, Option B'}
                                  onChange={(e) => updateSelectedTileProperty('options', e.target.value.split(',').map(s => s.trim()))}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  rows={2}
                                />
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'social_feed' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Account Handle</label>
                                <input aria-label="Account Handle"
                                  type="text" 
                                  value={String((selectedTile.properties as InteractiveTileProperties).account || '')}
                                  onChange={(e) => updateSelectedTileProperty('account', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  placeholder="twitter_handle"
                                />
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'weather' && (
                            <div>
                              <label className="text-xs text-text-muted mb-1 block">Location</label>
                              <input aria-label="Location"
                                type="text" 
                                value={String((selectedTile.properties as InteractiveTileProperties).location || '')}
                                onChange={(e) => updateSelectedTileProperty('location', e.target.value)}
                                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                placeholder="City, State"
                              />
                            </div>
                          )}

                          {selectedTile.type === 'menu_selector' && (
                            <div>
                              <label className="text-xs text-text-muted mb-1 block">Categories (comma separated)</label>
                              <input aria-label="Categories (comma separated)"
                                type="text" 
                                value={Array.isArray((selectedTile.properties as InteractiveTileProperties).categories) ? ((selectedTile.properties as InteractiveTileProperties).categories || []).join(', ') : 'Starters, Mains, Desserts'}
                                onChange={(e) => updateSelectedTileProperty('categories', e.target.value.split(',').map(s => s.trim()))}
                                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                              />
                            </div>
                          )}

                          {selectedTile.type === 'promotion_banner' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Title</label>
                                <input aria-label="Title"
                                  type="text" 
                                  value={String((selectedTile.properties as InteractiveTileProperties).title || 'Special Offer')}
                                  onChange={(e) => updateSelectedTileProperty('title', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Description</label>
                                <textarea aria-label="Description"
                                  value={String((selectedTile.properties as InteractiveTileProperties).description || '')}
                                  onChange={(e) => updateSelectedTileProperty('description', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Button Text</label>
                                <input aria-label="Button Text"
                                  type="text" 
                                  value={String(((selectedTile.properties as InteractiveTileProperties).actionButton)?.text || 'Get Offer')}
                                  onChange={(e) => {
                                    const currentAction = ((selectedTile.properties as InteractiveTileProperties).actionButton) || { text: '' };
                                    updateSelectedTileProperty('actionButton', { ...currentAction, text: e.target.value });
                                  }}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'loyalty_card' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Member Name (Preview)</label>
                                <input aria-label="Member Name (Preview)"
                                  type="text" 
                                  value={String((selectedTile.properties as InteractiveTileProperties).memberName || 'John Doe')}
                                  onChange={(e) => updateSelectedTileProperty('memberName', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Points</label>
                                  <input aria-label="Points"
                                    type="number" 
                                    value={Number((selectedTile.properties as InteractiveTileProperties).points || 1250)}
                                    onChange={(e) => updateSelectedTileProperty('points', Number(e.target.value))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Progress (0-1)</label>
                                  <input aria-label="Progress (0-1)"
                                    type="number" 
                                    min="0" 
                                    max="1" 
                                    step="0.1"
                                    value={Number((selectedTile.properties as InteractiveTileProperties).progress || 0.6)}
                                    onChange={(e) => updateSelectedTileProperty('progress', Number(e.target.value))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Layout Tile Properties */}
                      {isLayoutTile(selectedTile.type) && (
                        <div className="space-y-3">
                          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Layout Settings</label>

                          {selectedTile.type === 'container' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Background Image</label>
                                {typeof (selectedTile.properties as LayoutTileProperties).backgroundImageUrl === 'string' && (selectedTile.properties as LayoutTileProperties).backgroundImageUrl && (
                                  <div className="relative aspect-video bg-black/20 rounded border border-surface-highlight overflow-hidden mb-2 group">
                                    <img src={(selectedTile.properties as LayoutTileProperties).backgroundImageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button 
                                      onClick={() => updateSelectedTileProperty('backgroundImageUrl', undefined)}
                                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <input 
                                    type="text" 
                                    value={String((selectedTile.properties as LayoutTileProperties).backgroundImageUrl || '')}
                                    onChange={(e) => updateSelectedTileProperty('backgroundImageUrl', e.target.value)}
                                    className="flex-1 bg-background border border-surface-highlight rounded px-3 py-2 text-xs text-text focus:border-primary focus:outline-none"
                                    placeholder="https://..."
                                  />
                                  <label className="p-2 bg-surface-highlight hover:bg-surface-highlight/80 rounded cursor-pointer border border-surface-highlight">
                                    <Upload size={14} />
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*"
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                          handleImageUpload(e.target.files[0], 'backgroundImageUrl');
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Bg Color</label>
                                  <div className="flex items-center gap-2 bg-background border border-surface-highlight rounded px-2 py-1">
                                    <input 
                                      aria-label="Color" type="color"
                                      value={String((selectedTile.properties as LayoutTileProperties).backgroundColor || '#ffffff')}
                                      onChange={(e) => updateSelectedTileProperty('backgroundColor', e.target.value)}
                                      className="w-6 h-6 cursor-pointer rounded border-none bg-transparent p-0"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Border Color</label>
                                  <div className="flex items-center gap-2 bg-background border border-surface-highlight rounded px-2 py-1">
                                    <input 
                                      aria-label="Color" type="color"
                                      value={String((selectedTile.properties as LayoutTileProperties).borderColor || '#374151')}
                                      onChange={(e) => updateSelectedTileProperty('borderColor', e.target.value)}
                                      className="w-6 h-6 cursor-pointer rounded border-none bg-transparent p-0"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Border Width</label>
                                  <input aria-label="Border Width"
                                    type="number" 
                                    value={Number((selectedTile.properties as LayoutTileProperties).borderWidth || 1)}
                                    onChange={(e) => updateSelectedTileProperty('borderWidth', Number(e.target.value))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Radius</label>
                                  <input aria-label="Radius"
                                    type="number" 
                                    value={Number((selectedTile.properties as LayoutTileProperties).borderRadius || 0)}
                                    onChange={(e) => updateSelectedTileProperty('borderRadius', Number(e.target.value))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Padding</label>
                                <input aria-label="Padding"
                                  type="number" 
                                  value={Number((selectedTile.properties as LayoutTileProperties).padding || 0)}
                                  onChange={(e) => updateSelectedTileProperty('padding', Number(e.target.value))}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'divider' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Orientation</label>
                                <select aria-label="Orientation"
                                  value={String((selectedTile.properties as LayoutTileProperties).orientation || 'horizontal')}
                                  onChange={(e) => updateSelectedTileProperty('orientation', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                >
                                  <option value="horizontal">Horizontal</option>
                                  <option value="vertical">Vertical</option>
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Thickness</label>
                                  <input aria-label="Thickness"
                                    type="number" 
                                    value={Number((selectedTile.properties as LayoutTileProperties).thickness || 2)}
                                    onChange={(e) => updateSelectedTileProperty('thickness', Number(e.target.value))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Color</label>
                                  <input aria-label="Color"
                                     type="color"
                                    value={String((selectedTile.properties as LayoutTileProperties).color || '#374151')}
                                    onChange={(e) => updateSelectedTileProperty('color', e.target.value)}
                                    className="w-full h-8 cursor-pointer rounded border border-surface-highlight bg-transparent"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'grid' && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Rows</label>
                                  <input aria-label="Rows"
                                    type="number" 
                                    min="1"
                                    max="10"
                                    value={Number((selectedTile.properties as LayoutTileProperties).rows || 2)}
                                    onChange={(e) => updateSelectedTileProperty('rows', Number(e.target.value))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Cols</label>
                                  <input aria-label="Cols"
                                    type="number" 
                                    min="1"
                                    max="10"
                                    value={Number((selectedTile.properties as LayoutTileProperties).columns || 2)}
                                    onChange={(e) => updateSelectedTileProperty('columns', Number(e.target.value))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'flex' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Direction</label>
                                <select aria-label="Direction"
                                  value={String((selectedTile.properties as LayoutTileProperties).direction || 'row')}
                                  onChange={(e) => updateSelectedTileProperty('direction', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                >
                                  <option value="row">Row</option>
                                  <option value="column">Column</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Justify</label>
                                <select aria-label="Justify"
                                  value={String((selectedTile.properties as LayoutTileProperties).justifyContent || 'center')}
                                  onChange={(e) => updateSelectedTileProperty('justifyContent', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                >
                                  <option value="start">Start</option>
                                  <option value="center">Center</option>
                                  <option value="end">End</option>
                                  <option value="space-between">Between</option>
                                  <option value="space-around">Around</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Align Items</label>
                                <select aria-label="Align Items"
                                  value={String((selectedTile.properties as LayoutTileProperties).alignItems || 'start')}
                                  onChange={(e) => updateSelectedTileProperty('alignItems', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                >
                                  <option value="start">Start</option>
                                  <option value="center">Center</option>
                                  <option value="end">End</option>
                                  <option value="stretch">Stretch</option>
                                  <option value="baseline">Baseline</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'tabs' && (
                            <div className="space-y-3">
                              <label className="text-xs text-text-muted mb-1 block">Tabs (comma separated)</label>
                              <input aria-label="Tabs (comma separated)"
                                type="text" 
                                value={Array.isArray((selectedTile.properties as LayoutTileProperties).tabs) ? ((selectedTile.properties as LayoutTileProperties).tabs || []).join(', ') : 'Tab 1, Tab 2'}
                                onChange={(e) => updateSelectedTileProperty('tabs', e.target.value.split(',').map(s => s.trim()))}
                                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                              />
                            </div>
                          )}

                          {selectedTile.type === 'accordion' && (
                            <div className="space-y-3">
                              <label className="text-xs text-text-muted mb-1 block">Items (comma separated)</label>
                              <input aria-label="Items (comma separated)"
                                type="text" 
                                value={Array.isArray((selectedTile.properties as LayoutTileProperties).items) ? ((selectedTile.properties as LayoutTileProperties).items || []).join(', ') : 'Item 1, Item 2'}
                                onChange={(e) => updateSelectedTileProperty('items', e.target.value.split(',').map(s => s.trim()))}
                                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                              />
                            </div>
                          )}

                          {selectedTile.type === 'carousel' && (
                            <div className="space-y-3">
                              <label className="text-xs text-text-muted mb-1 block">Auto-Play Speed (ms)</label>
                              <input aria-label="Auto-Play Speed (ms)"
                                type="number" 
                                step="500"
                                min="1000"
                                value={Number((selectedTile.properties as LayoutTileProperties).autoPlaySpeed || 3000)}
                                onChange={(e) => updateSelectedTileProperty('autoPlaySpeed', Number(e.target.value))}
                                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                              />
                            </div>
                          )}

                          {selectedTile.type === 'frame' && (
                            <div className="space-y-3">
                              <label className="text-xs text-text-muted mb-1 block">Frame Style</label>
                              <select aria-label="Frame Style"
                                value={String((selectedTile.properties as LayoutTileProperties).frameStyle || 'simple')}
                                onChange={(e) => updateSelectedTileProperty('frameStyle', e.target.value)}
                                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                              >
                                <option value="simple">Simple</option>
                                <option value="ornate">Ornate</option>
                                <option value="modern">Modern</option>
                                <option value="shadow">Drop Shadow</option>
                              </select>
                            </div>
                          )}

                          {selectedTile.type === 'sticky_note' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Note Text</label>
                                <textarea aria-label="Note Text"
                                  value={String((selectedTile.properties as LayoutTileProperties).text || '')}
                                  onChange={(e) => updateSelectedTileProperty('text', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  rows={3}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Color</label>
                                <input aria-label="Color"
                                   type="color"
                                  value={String((selectedTile.properties as LayoutTileProperties).color || '#fef3c7')}
                                  onChange={(e) => updateSelectedTileProperty('color', e.target.value)}
                                  className="w-full h-8 cursor-pointer rounded border border-surface-highlight bg-transparent"
                                />
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'shape' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Shape Type</label>
                                <select aria-label="Shape Type"
                                  value={String((selectedTile.properties as LayoutTileProperties).shape || 'circle')}
                                  onChange={(e) => updateSelectedTileProperty('shape', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                >
                                  <option value="circle">Circle</option>
                                  <option value="square">Square</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Fill Color</label>
                                <input aria-label="Fill Color"
                                   type="color"
                                  value={String((selectedTile.properties as LayoutTileProperties).fillColor || '#EA580C')}
                                  onChange={(e) => updateSelectedTileProperty('fillColor', e.target.value)}
                                  className="w-full h-8 cursor-pointer rounded border border-surface-highlight bg-transparent"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Special Tile Properties */}
                      {isSpecialTile(selectedTile.type) && (
                        <div className="space-y-3">
                          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Integration Settings</label>

                          {selectedTile.type === 'clock' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Format</label>
                                <select aria-label="Format"
                                  value={String((selectedTile.properties as SpecialTileProperties).format || '24h')}
                                  onChange={(e) => updateSelectedTileProperty('format', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                >
                                  <option value="24h">24 Hour</option>
                                  <option value="12h">12 Hour</option>
                                </select>
                              </div>
                              <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={(selectedTile.properties as SpecialTileProperties).showSeconds !== false}
                                  onChange={(e) => updateSelectedTileProperty('showSeconds', e.target.checked)}
                                  className="rounded border-surface-highlight bg-background text-primary focus:ring-0"
                                />
                                Show Seconds
                              </label>
                            </div>
                          )}

                          {selectedTile.type === 'calendar' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Calendar Feed URL</label>
                                <input aria-label="Calendar Feed URL"
                                  type="text" 
                                  value={String((selectedTile.properties as SpecialTileProperties).calendarUrl || '')}
                                  onChange={(e) => updateSelectedTileProperty('calendarUrl', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  placeholder="https://.../basic.ics"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Initial View</label>
                                <select aria-label="Initial View"
                                  value={String((selectedTile.properties as SpecialTileProperties).view || 'month')}
                                  onChange={(e) => updateSelectedTileProperty('view', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                >
                                  <option value="month">Month</option>
                                  <option value="week">Week</option>
                                  <option value="day">Day</option>
                                  <option value="agenda">Agenda</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Background Folder</label>
                                <input aria-label="Background Folder"
                                  type="text" 
                                  value={String((selectedTile.properties as SpecialTileProperties).backgroundFolderName || '')}
                                  onChange={(e) => updateSelectedTileProperty('backgroundFolderName', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  placeholder="e.g. seasonal_events"
                                />
                                <p className="text-[10px] text-text-muted mt-1">Images in this storage folder will rotate as the background.</p>
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'rss_feed' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Feed URL</label>
                                <input aria-label="Feed URL"
                                  type="text" 
                                  value={String((selectedTile.properties as SpecialTileProperties).url || '')}
                                  onChange={(e) => updateSelectedTileProperty('url', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  placeholder="https://.../feed.xml"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Max Items</label>
                                <input aria-label="Max Items"
                                  type="number" 
                                  min="1"
                                  max="10"
                                  value={Number((selectedTile.properties as SpecialTileProperties).maxItems || 3)}
                                  onChange={(e) => updateSelectedTileProperty('maxItems', Number(e.target.value))}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                            </div>
                          )}

                          {(selectedTile.type === 'social_proof' || selectedTile.type === 'testimonial') && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Author</label>
                                <input aria-label="Author"
                                  type="text" 
                                  value={String((selectedTile.properties as SpecialTileProperties).author || '')}
                                  onChange={(e) => updateSelectedTileProperty('author', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Quote / Text</label>
                                <textarea aria-label="Quote / Text"
                                  value={String((selectedTile.properties as SpecialTileProperties).quote || '')}
                                  onChange={(e) => updateSelectedTileProperty('quote', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  rows={3}
                                />
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'stock_ticker' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Symbols (comma separated)</label>
                                <input aria-label="Symbols (comma separated)"
                                  type="text" 
                                  value={Array.isArray((selectedTile.properties as SpecialTileProperties).symbols) ? ((selectedTile.properties as SpecialTileProperties).symbols || []).join(', ') : 'AAPL, GOOGL, MSFT'}
                                  onChange={(e) => updateSelectedTileProperty('symbols', e.target.value.split(',').map(s => s.trim().toUpperCase()))}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                              <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={(selectedTile.properties as SpecialTileProperties).showChange !== false}
                                  onChange={(e) => updateSelectedTileProperty('showChange', e.target.checked)}
                                  className="rounded border-surface-highlight bg-background text-primary focus:ring-0"
                                />
                                Show Percentage Change
                              </label>
                            </div>
                          )}

                          {selectedTile.type === 'menu_item' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Item Name</label>
                                <input aria-label="Item Name"
                                  type="text" 
                                  value={String((selectedTile.properties as SpecialTileProperties).itemName || '')}
                                  onChange={(e) => updateSelectedTileProperty('itemName', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Price ($)</label>
                                  <input aria-label="Price ($)"
                                    type="text" 
                                    value={String((selectedTile.properties as SpecialTileProperties).price || '')}
                                    onChange={(e) => updateSelectedTileProperty('price', e.target.value)}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Image</label>
                                  <label className="flex items-center justify-center gap-2 w-full bg-surface-highlight hover:bg-surface-highlight/80 text-text text-sm py-2 rounded cursor-pointer transition-colors border border-surface-highlight">
                                    <Upload size={14} />
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*"
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                          handleImageUpload(e.target.files[0], 'imageUrl');
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Description</label>
                                <textarea aria-label="Description"
                                  value={String((selectedTile.properties as SpecialTileProperties).description || '')}
                                  onChange={(e) => updateSelectedTileProperty('description', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  rows={2}
                                />
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'special_offer' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Main Title</label>
                                <input aria-label="Main Title"
                                  type="text" 
                                  value={String((selectedTile.properties as SpecialTileProperties).title || '')}
                                  onChange={(e) => updateSelectedTileProperty('title', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Sub-Title</label>
                                  <input aria-label="Sub-Title"
                                    type="text" 
                                    value={String((selectedTile.properties as SpecialTileProperties).subTitle || '')}
                                    onChange={(e) => updateSelectedTileProperty('subTitle', e.target.value)}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Discount (e.g. 50% OFF)</label>
                                  <input aria-label="Discount (e.g. 50% OFF)"
                                    type="text" 
                                    value={String((selectedTile.properties as SpecialTileProperties).discount || '')}
                                    onChange={(e) => updateSelectedTileProperty('discount', e.target.value)}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'event_countdown' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Event Name</label>
                                <input aria-label="Event Name"
                                  type="text" 
                                  value={String((selectedTile.properties as SpecialTileProperties).eventName || '')}
                                  onChange={(e) => updateSelectedTileProperty('eventName', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Target Date & Time</label>
                                <input aria-label="Target Date & Time"
                                  type="datetime-local" 
                                  value={String((selectedTile.properties as SpecialTileProperties).targetDate || '')}
                                  onChange={(e) => updateSelectedTileProperty('targetDate', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                />
                              </div>
                            </div>
                          )}

                          {selectedTile.type === 'map' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Address / Location</label>
                                <input aria-label="Address / Location"
                                  type="text" 
                                  value={String((selectedTile.properties as SpecialTileProperties).address || '')}
                                  onChange={(e) => updateSelectedTileProperty('address', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  placeholder="Times Square, NY"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Zoom (1-20)</label>
                                  <input aria-label="Zoom (1-20)"
                                    type="number" 
                                    min="1"
                                    max="20"
                                    value={Number((selectedTile.properties as SpecialTileProperties).zoom || 14)}
                                    onChange={(e) => updateSelectedTileProperty('zoom', Number(e.target.value))}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-text-muted mb-1 block">Map Type</label>
                                  <select aria-label="Map Type"
                                    value={String((selectedTile.properties as SpecialTileProperties).mapType || 'roadmap')}
                                    onChange={(e) => updateSelectedTileProperty('mapType', e.target.value)}
                                    className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  >
                                    <option value="roadmap">Roadmap</option>
                                    <option value="satellite">Satellite</option>
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-text-muted mb-1 block">Location Label</label>
                                <input aria-label="Location Label"
                                  type="text" 
                                  value={String((selectedTile.properties as SpecialTileProperties).locationName || '')}
                                  onChange={(e) => updateSelectedTileProperty('locationName', e.target.value)}
                                  className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                  placeholder="Our Store"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                       {/* Slide Name */}
                       <div className="space-y-3">
                          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Slide Name</label>
                          <input aria-label="Slide Name"
                            type="text" 
                            value={slide.name}
                            onChange={(e) => setSlide({ ...slide, name: e.target.value })}
                            className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                          />
                       </div>

                       {/* Slide Size */}
                       <div className="space-y-3">
                          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Slide Size</label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-text-muted block mb-1">Width</label>
                              <input aria-label="Width"
                                type="number" 
                                min="1"
                                value={slide.dimensions.width}
                                onChange={(e) => {
                                  const updatedSlide = { ...slide, dimensions: { ...slide.dimensions, width: Number(e.target.value) } };
                                  setSlide(updatedSlide);
                                }}
                                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-text-muted block mb-1">Height</label>
                              <input aria-label="Height"
                                type="number" 
                                min="1"
                                value={slide.dimensions.height}
                                onChange={(e) => {
                                  const updatedSlide = { ...slide, dimensions: { ...slide.dimensions, height: Number(e.target.value) } };
                                  setSlide(updatedSlide);
                                }}
                                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                              />
                            </div>
                          </div>
                       </div>

                       {/* Orientation */}
                       <div className="space-y-3">
                          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Orientation</label>
                          <select aria-label="Orientation"
                            value={slide.orientation}
                            onChange={(e) => {
                              const updatedSlide = { ...slide, orientation: e.target.value as 'landscape' | 'portrait' };
                              setSlide(updatedSlide);
                            }}
                            className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                          >
                            <option value="landscape">Landscape</option>
                            <option value="portrait">Portrait</option>
                          </select>
                       </div>

                       <div className="space-y-3">
                          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Background Color</label>
                          <div className="flex items-center gap-3 bg-background border border-surface-highlight rounded px-3 py-2">
                            <input 
                              aria-label="Color" type="color"
                              value={slide.backgroundColor}
                              onChange={(e) => {
                                const updatedSlide = { ...slide, backgroundColor: e.target.value };
                                setSlide(updatedSlide);
                              }}
                              className="w-8 h-8 cursor-pointer rounded border-none bg-transparent p-0"
                            />
                            <span className="text-sm text-text font-mono">{slide.backgroundColor.toUpperCase()}</span>
                          </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-xs text-text-muted block">Background Image</label>
                          
                          {slide.backgroundImageUrl && (
                            <div className="relative aspect-video bg-black/20 rounded border border-surface-highlight overflow-hidden mb-2 group">
                              <img src={slide.backgroundImageUrl} alt="Background" className="w-full h-full object-cover" />
                              <button aria-label="Remove Background"
                                onClick={() => {
                                  setUploadedBackgroundUrl('');
                                  setBackgroundUrlInput('');
                                  const updatedSlide = { ...slide, backgroundImageUrl: '' };
                                  setSlide(updatedSlide);
                                }}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove Background"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}

                          <input
                            type="url"
                            placeholder="Enter image URL (takes priority over upload)"
                            value={backgroundUrlInput}
                            onChange={(e) => {
                              const url = e.target.value;
                              setBackgroundUrlInput(url);
                              const finalUrl = url || uploadedBackgroundUrl;
                              const updatedSlide = { ...slide, backgroundImageUrl: finalUrl || '' };
                              setSlide(updatedSlide);
                            }}
                            className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none mb-2"
                          />
                          <label className="flex items-center justify-center gap-2 w-full bg-surface-highlight hover:bg-surface-highlight/80 text-text text-sm py-2 rounded cursor-pointer transition-colors border border-surface-highlight">
                            {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ImageIcon size={16} />}
                            {uploading ? 'Uploading...' : (uploadedBackgroundUrl ? 'Change Image' : 'Upload Image')}
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleBackgroundUpload(e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                       </div>
                     </div>
                  )}
                </>
              ) : activeTab === 'atmosphere' ? (
                <>
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-text mb-4 flex items-center gap-2">
                      <Wind size={16} className="text-primary" />
                      Atmosphere Configuration
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Add procedural particle effects to your slide. These render in real-time on the player.
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Effect</label>
                      <select aria-label="Effect"
                        value={slide.particleConfig?.effectType || 'none'}
                        onChange={(e) => updateAtmosphere({ effectType: e.target.value as ParticleConfig['effectType'] })}
                        className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                      >
                        <option value="none">None</option>
                        <option value="smoke">Smoke</option>
                        <option value="snow">Snow</option>
                        <option value="rain">Rain</option>
                        <option value="hearts">Hearts</option>
                        <option value="stars">Stars</option>
                        <option value="leaves">Leaves</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Density</label>
                        <span className="text-xs text-primary">{slide.particleConfig?.density || 50}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="200" 
                        value={slide.particleConfig?.density || 50}
                        onChange={(e) => updateAtmosphere({ density: Number(e.target.value) })}
                        className="w-full accent-primary h-1 bg-surface-highlight rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Speed</label>
                        <span className="text-xs text-primary">{slide.particleConfig?.speed || 1}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="5" 
                        step="0.1"
                        value={slide.particleConfig?.speed || 1}
                        onChange={(e) => updateAtmosphere({ speed: Number(e.target.value) })}
                        className="w-full accent-primary h-1 bg-surface-highlight rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {slide.particleConfig?.effectType && slide.particleConfig.effectType !== 'none' && slide.particleConfig.effectType !== 'smoke' && (
                      <>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Particle Size</label>
                            <span className="text-xs text-primary">{slide.particleConfig?.particleSize ?? 10}px</span>
                          </div>
                          <input 
                            type="range" 
                            min="2" 
                            max="50" 
                            step="1"
                            value={slide.particleConfig?.particleSize ?? 10}
                            onChange={(e) => updateAtmosphere({ particleSize: Number(e.target.value) })}
                            className="w-full accent-primary h-1 bg-surface-highlight rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Particle Color</label>
                          <div className="flex items-center gap-3">
                            <input
                              aria-label="Color" type="color"
                              value={`#${(slide.particleConfig?.color?.[0] ?? 255).toString(16).padStart(2, '0')}${(slide.particleConfig?.color?.[1] ?? 255).toString(16).padStart(2, '0')}${(slide.particleConfig?.color?.[2] ?? 255).toString(16).padStart(2, '0')}`}
                              onChange={(e) => {
                                const hex = e.target.value;
                                const r = parseInt(hex.slice(1, 3), 16);
                                const g = parseInt(hex.slice(3, 5), 16);
                                const b = parseInt(hex.slice(5, 7), 16);
                                const currentAlpha = slide.particleConfig?.color?.[3] ?? 1;
                                updateAtmosphere({ color: [r, g, b, currentAlpha] });
                              }}
                              className="w-10 h-10 rounded border border-surface-highlight cursor-pointer bg-transparent"
                            />
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-text-muted">Opacity</span>
                                <span className="text-xs text-primary">{Math.round((slide.particleConfig?.color?.[3] ?? 1) * 100)}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.05"
                                value={slide.particleConfig?.color?.[3] ?? 1}
                                onChange={(e) => {
                                  const [r, g, b] = slide.particleConfig?.color || [255, 255, 255, 1];
                                  updateAtmosphere({ color: [r, g, b, Number(e.target.value)] });
                                }}
                                className="w-full accent-primary h-1 bg-surface-highlight rounded-lg appearance-none cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Rotation Angle</label>
                            <span className="text-xs text-primary">{slide.particleConfig?.particleAngle ?? 0}°</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="360" 
                            step="5"
                            value={slide.particleConfig?.particleAngle ?? 0}
                            onChange={(e) => updateAtmosphere({ particleAngle: Number(e.target.value) })}
                            className="w-full accent-primary h-1 bg-surface-highlight rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-3">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Blend Mode</label>
                      <select aria-label="Blend Mode"
                        value={slide.particleConfig?.blendMode || 'screen'}
                        onChange={(e) => updateAtmosphere({ blendMode: e.target.value as ParticleConfig['blendMode'] })}
                        className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none appearance-none"
                      >
                        <option value="screen">Screen (Lighten)</option>
                        <option value="overlay">Overlay (Contrast)</option>
                        <option value="normal">Normal (Opaque)</option>
                      </select>
                    </div>

                    <div className="mt-8 bg-surface-highlight/10 p-4 rounded-lg border border-surface-highlight/50 text-xs text-text-muted flex gap-3">
                      <div className="mt-0.5"><Layers size={14} /></div>
                      <div>
                        The Atmosphere layer sits above the background but below content tiles by default.
                      </div>
                    </div>
                  </div>
                </>
              ) : activeTab === 'layers' ? (
                <>
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-text mb-2 flex items-center gap-2">
                      <Layers size={16} className="text-primary" />
                      Layers
                    </h3>
                    <p className="text-xs text-text-muted">
                      Manage the stacking order and visibility of elements. Click to select.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {/* Background Layer */}
                    <button
                      onClick={() => setSelectedTileId(null)}
                      className={`w-full p-3 rounded-lg border transition-all ${
                        !selectedTileId
                          ? 'bg-primary/10 border-primary text-text'
                          : 'bg-surface border-surface-highlight text-text-muted hover:bg-surface-highlight hover:border-primary/50 hover:text-text'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded border border-surface-highlight flex items-center justify-center bg-background overflow-hidden">
                          {slide.backgroundImageUrl ? (
                            <img src={slide.backgroundImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div 
                              className="w-full h-full" 
                              style={{ backgroundColor: slide.backgroundColor }}
                            />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm">Background</div>
                          <div className="text-xs opacity-70">
                            {slide.backgroundImageUrl ? 'Image' : slide.backgroundColor}
                          </div>
                        </div>
                        {!selectedTileId && (
                          <div className="text-primary">
                            <Eye size={16} />
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Atmosphere Layer (if exists) */}
                    {slide.particleConfig && slide.particleConfig.effectType !== 'none' && (
                      <div className="w-full p-3 rounded-lg border bg-surface/50 border-surface-highlight">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded border border-surface-highlight flex items-center justify-center bg-background">
                            <Wind size={16} className="text-primary" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-sm text-text-muted">Atmosphere</div>
                            <div className="text-xs text-text-muted opacity-70">
                              {slide.particleConfig.effectType}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tile Layers (sorted by z-index, highest first) */}
                    {slide.elements
                      .slice()
                      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
                      .map((tile, index, sortedArray) => {
                        const isTopLayer = index === 0;
                        const isBottomLayer = index === sortedArray.length - 1;
                        
                        return (
                          <div
                            key={tile.id}
                            className={`w-full p-3 rounded-lg border transition-all ${
                              selectedTileId === tile.id
                                ? 'bg-primary/10 border-primary text-text'
                                : 'bg-surface border-surface-highlight text-text-muted hover:bg-surface-highlight hover:border-primary/50 hover:text-text'
                            } ${!tile.visible ? 'opacity-60' : ''}`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Tile Icon */}
                              <button aria-label={`Select ${tile.name || tile.type} layer`}
                                onClick={() => setSelectedTileId(tile.id)}
                                className="w-10 h-10 rounded border border-surface-highlight flex items-center justify-center bg-background hover:border-primary/50 transition-colors"
                                title="Select layer"
                              >
                                {tile.type === 'text' && <Type size={16} />}
                                {tile.type === 'image' && <ImageIcon size={16} />}
                                {tile.type === 'video' && <Video size={16} />}
                                {tile.type.includes('chart') && <BarChart size={16} />}
                                {tile.type === 'qr_code' && <QrCode size={16} />}
                                {tile.type === 'countdown' && <Timer size={16} />}
                                {!['text', 'image', 'video', 'qr_code', 'countdown'].includes(tile.type) && !tile.type.includes('chart') && <Layout size={16} />}
                              </button>

                              {/* Tile Info */}
                              <button
                                onClick={() => setSelectedTileId(tile.id)}
                                className="flex-1 text-left"
                              >
                                <div className="font-medium text-sm">{tile.name || tile.type}</div>
                                <div className="text-xs opacity-70">
                                  z-index: {tile.zIndex || 0}
                                </div>
                              </button>

                              {/* Layer Controls */}
                              <div className="flex items-center gap-1">
                                {/* Z-Index Controls */}
                                <div className="flex flex-col">
                                  <button aria-label={`Move ${tile.name || tile.type} layer up`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveLayerUp(tile.id);
                                    }}
                                    disabled={isTopLayer}
                                    className={`p-0.5 rounded transition-colors ${
                                      isTopLayer
                                        ? 'opacity-20 cursor-not-allowed'
                                        : 'hover:bg-surface-highlight hover:text-primary'
                                    }`}
                                    title="Move layer up"
                                  >
                                    <ChevronUp size={14} />
                                  </button>
                                  <button aria-label={`Move ${tile.name || tile.type} layer down`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveLayerDown(tile.id);
                                    }}
                                    disabled={isBottomLayer}
                                    className={`p-0.5 rounded transition-colors ${
                                      isBottomLayer
                                        ? 'opacity-20 cursor-not-allowed'
                                        : 'hover:bg-surface-highlight hover:text-primary'
                                    }`}
                                    title="Move layer down"
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                </div>

                                {/* Visibility Toggle */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTileVisibility(tile.id);
                                  }}
                                  className={`p-1.5 rounded transition-colors ${
                                    tile.visible
                                      ? 'hover:bg-surface-highlight hover:text-primary'
                                      : 'opacity-50 hover:bg-surface-highlight hover:opacity-100'
                                  }`}
                                  aria-label={`${tile.visible ? 'Hide' : 'Show'} ${tile.name || tile.type} layer`} aria-pressed={tile.visible} title={tile.visible ? 'Hide layer' : 'Show layer'}
                                >
                                  {tile.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>

                                {/* Lock Toggle */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTileLock(tile.id);
                                  }}
                                  className={`p-1.5 rounded transition-colors ${
                                    tile.locked
                                      ? 'text-red-500 hover:bg-red-500/10'
                                      : 'hover:bg-surface-highlight hover:text-primary'
                                  }`}
                                  aria-label={`${tile.locked ? 'Unlock' : 'Lock'} ${tile.name || tile.type} layer`} aria-pressed={tile.locked} title={tile.locked ? 'Unlock layer' : 'Lock layer'}
                                >
                                  {tile.locked ? <Lock size={14} /> : <Unlock size={14} />}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {slide.elements.length === 0 && (
                    <div className="mt-8 text-center text-text-muted text-sm py-8">
                      <Layers size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No tiles on this slide yet</p>
                      <p className="text-xs mt-1">Add tiles from the sidebar</p>
                    </div>
                  )}

                  <div className="mt-6 bg-surface-highlight/10 p-4 rounded-lg border border-surface-highlight/50 text-xs text-text-muted">
                    <div className="font-medium mb-2 text-text">Layer Controls:</div>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Use <ChevronUp size={10} className="inline" />/<ChevronDown size={10} className="inline" /> arrows to reorder layers</li>
                      <li>Click <Eye size={10} className="inline" /> to toggle visibility</li>
                      <li>Click <Lock size={10} className="inline" /> to lock/unlock layers</li>
                      <li>Press <kbd className="px-1 py-0.5 bg-surface rounded text-[10px]">Esc</kbd> to select background</li>
                    </ul>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};
