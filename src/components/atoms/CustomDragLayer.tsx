import { useDragLayer } from 'react-dnd';
import type { TileInstance } from '../../types/schema';
import { TileContent } from '../atoms/TileContent';

const layerStyles: React.CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 9999,
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
};

function getItemStyles(
  initialOffset: { x: number; y: number } | null,
  currentOffset: { x: number; y: number } | null,
  sourceClientOffset?: { x: number; y: number } | null,
  centered?: boolean,
  width?: number,
  height?: number,
  scale: number = 1
) {
  if (!initialOffset || !currentOffset) {
    return {
      display: 'none',
    };
  }

  let { x, y } = sourceClientOffset || currentOffset;

  if (centered && width && height && !sourceClientOffset) {
    x -= (width * scale) / 2;
    y -= (height * scale) / 2;
  }

  const transform = `translate(${x}px, ${y}px)`;

  return {
    transform,
    WebkitTransform: transform,
  };
}

interface CustomDragLayerProps {
  tiles: TileInstance[];
  scale: number;
}

export const CustomDragLayer = ({ tiles, scale }: CustomDragLayerProps) => {
  const { itemType, isDragging, item, initialOffset, currentOffset, sourceClientOffset, differenceFromInitialOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    initialOffset: monitor.getInitialClientOffset(),
    currentOffset: monitor.getClientOffset(),
    sourceClientOffset: monitor.getSourceClientOffset(),
    differenceFromInitialOffset: monitor.getDifferenceFromInitialOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !currentOffset) {
    return null;
  }

  if (itemType === 'CANVAS_TILE') {
    const tile = tiles.find((t) => t.id === item.id);
    if (!tile) return null;

    let x, y;
    const canvasEl = document.getElementById('editor-canvas');
    if (canvasEl && differenceFromInitialOffset) {
        const rect = canvasEl.getBoundingClientRect();
        x = rect.left + tile.position.x * scale + differenceFromInitialOffset.x;
        y = rect.top + tile.position.y * scale + differenceFromInitialOffset.y;
    } else if (sourceClientOffset) {
        x = sourceClientOffset.x;
        y = sourceClientOffset.y;
    } else {
        return null;
    }

    const transform = `translate(${x}px, ${y}px)`;

    return (
      <div style={layerStyles}>
        <div style={{ transform, WebkitTransform: transform, pointerEvents: 'none' }}> 
          <div
            style={{
              width: tile.size.width * scale,
              height: tile.size.height * scale,
              opacity: 0.8,
              transform: `rotate(${tile.rotation}deg)`,
              transformOrigin: 'center center',
              pointerEvents: 'none',
            }}
          >
             <div style={{ 
               width: tile.size.width, 
               height: tile.size.height, 
               transform: `scale(${scale})`, 
               transformOrigin: 'top left',
               pointerEvents: 'none',
             }} className="border-2 border-primary rounded-lg shadow-2xl overflow-hidden">
                <TileContent tile={tile} isEditor={true} />
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle Sidebar Tiles (New Items)
  if (itemType === 'tile') {
    // We don't have a tile instance yet, just the type. 
    // We can render a generic preview or a mock tile based on type.
    const mockTile: TileInstance = {
        id: 'preview',
        type: item.type,
        position: { x: 0, y: 0 },
        size: { width: 200, height: 150 }, // Default size
        opacity: 1,
        rotation: 0,
        zIndex: 1,
        visible: true,
        locked: false,
        properties: {}, // Default props
    };

    return (
        <div style={layerStyles}>
            <div style={getItemStyles(initialOffset, currentOffset, null, true, 200, 150, scale)}>
                <div style={{
                    width: 200 * scale,
                    height: 150 * scale,
                    opacity: 0.8,
                }}>
                    <div style={{ 
                        width: 200, 
                        height: 150, 
                        transform: `scale(${scale})`, 
                        transformOrigin: 'top left',
                    }} className="border-2 border-primary rounded-lg shadow-2xl overflow-hidden flex items-center justify-center">
                        <TileContent tile={mockTile} isEditor={true} />
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return null;
};
