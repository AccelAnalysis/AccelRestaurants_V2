import { useId } from 'react';
import type { TileInstance } from '../../types/schema';
import { constrainGeometry, moveTileWithKey } from '../../utils/editorGeometry';

export const TilePlacementControls = ({ tile, canvas, onUpdate }: {
  tile: TileInstance; canvas: { width: number; height: number }; onUpdate: (updates: Partial<TileInstance>) => void;
}) => {
  const id = useId();
  const move = (key: string) => { const result = moveTileWithKey(tile, key, 10, canvas); if (result) onUpdate(result); };
  return <fieldset disabled={tile.locked} className="space-y-3">
    <legend className="text-sm font-semibold text-text">Position and size</legend>
    <p className="text-xs text-text-secondary">{tile.locked ? 'Unlock this tile in Layers to move or resize it.' : 'Use these fields instead of dragging. Values are in canvas pixels.'}</p>
    <div className="grid grid-cols-2 gap-3">
      {(['x', 'y', 'width', 'height'] as const).map(field => <div key={field}>
        <label htmlFor={`${id}-${field}`} className="block text-sm text-text-secondary mb-1">{{ x: 'Horizontal position', y: 'Vertical position', width: 'Width', height: 'Height' }[field]}</label>
        <input id={`${id}-${field}`} type="number" step={1} min={field === 'x' || field === 'y' ? -10 : 20}
          value={field === 'x' || field === 'y' ? tile.position[field] : tile.size[field]}
          onChange={event => {
            if (event.target.value === '') return;
            const value = event.target.valueAsNumber;
            if (!Number.isFinite(value)) return;
            const updates = field === 'x' || field === 'y' ? { position: { ...tile.position, [field]: value } } : { size: { ...tile.size, [field]: value } };
            onUpdate(constrainGeometry(tile, updates, canvas));
          }} className="w-full min-w-0 bg-background border border-surface-highlight rounded px-3 py-2 text-text" />
      </div>)}
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Move tile by 10 pixels">
      {([['ArrowLeft', 'left', '←'], ['ArrowUp', 'up', '↑'], ['ArrowDown', 'down', '↓'], ['ArrowRight', 'right', '→']] as const).map(([key, label, icon]) => <button type="button" key={key} aria-label={`Move tile ${label} 10 pixels`} className="ui-button ui-button-secondary" onClick={() => move(key)}>{icon}</button>)}
    </div>
  </fieldset>;
};
