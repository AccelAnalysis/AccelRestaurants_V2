import type { TileInstance } from '../types/schema';

type Dimensions = { width: number; height: number };
export function constrainGeometry(tile: TileInstance, updates: Partial<TileInstance>, canvas: Dimensions) {
  const finite = (value: number, fallback: number) => Number.isFinite(value) ? Math.round(value) : fallback;
  const size = { ...tile.size, ...updates.size };
  const position = { ...tile.position, ...updates.position };
  const width = Math.max(20, Math.min(canvas.width + 20, finite(size.width, tile.size.width)));
  const height = Math.max(20, Math.min(canvas.height + 20, finite(size.height, tile.size.height)));
  return {
    size: { width, height },
    position: {
      x: Math.max(-10, Math.min(canvas.width - width + 10, finite(position.x, tile.position.x))),
      y: Math.max(-10, Math.min(canvas.height - height + 10, finite(position.y, tile.position.y))),
    },
  };
}
export function moveTileWithKey(tile: TileInstance, key: string, step: number, canvas: Dimensions) {
  if (tile.locked) return null;
  const direction: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (!direction[key]) return null;
  const [x, y] = direction[key];
  return constrainGeometry(tile, { position: { x: tile.position.x + x * step, y: tile.position.y + y * step } }, canvas);
}
export function getDefaultTileProperties(type: TileInstance['type']): Record<string, unknown> {
  switch (type) {
    case 'text': return { content: 'New Text' };
    case 'image': case 'video': return { url: '' };
    case 'clock': return { format: '12h', showSeconds: true };
    case 'weather': return { location: 'New York', units: 'imperial' };
    case 'container': return { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#374151' };
    case 'shape': return { shape: 'circle', fillColor: '#EA580C' };
    default: return {};
  }
}
