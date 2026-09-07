import { useEffect, useRef, useState } from 'react';
import type { Slide } from '../../types/schema';
import { TileContent } from '../atoms/TileContent';
import { AtmosphereCanvas } from '../atoms/AtmosphereCanvas';
export const RestaurantSlidePreview = ({ slide, motion = false }: { slide: Slide; motion?: boolean }) => {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0]?.contentRect.width || 0));
    observer.observe(container.current); return () => observer.disconnect();
  }, []);
  const scale = width / slide.dimensions.width;
  return <div ref={container} data-testid="restaurant-preview" role="img" aria-label={`Preview of ${slide.name}. ${slide.orientation}.`}
    className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: `${slide.dimensions.width} / ${slide.dimensions.height}`, backgroundColor: slide.backgroundColor }}>
    {width > 0 && <div data-testid="restaurant-native-slide" style={{ position: 'absolute', width: slide.dimensions.width, height: slide.dimensions.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
      {motion && slide.particleConfig && <div className="absolute inset-0 pointer-events-none"><AtmosphereCanvas config={slide.particleConfig} /></div>}
      {slide.elements.filter(tile => tile.visible !== false).map(tile => <div key={tile.id} data-testid="restaurant-tile" style={{ position: 'absolute', left: tile.position.x, top: tile.position.y, width: tile.size.width, height: tile.size.height, zIndex: tile.zIndex, opacity: tile.opacity }}>
        <TileContent tile={tile} isEditor />
      </div>)}
    </div>}
  </div>;
};
