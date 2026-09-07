import { useReducedMotion } from '../../hooks/useMediaQuery';
import { useEffect, useRef } from 'react';
import type { ParticleConfig } from '../../types/schema';
import { WebGLEngine } from '../../lib/webgl/WebGLEngine';

interface AtmosphereCanvasProps {
  config: ParticleConfig;
  className?: string;
}

export const AtmosphereCanvas = ({ config, className = '' }: AtmosphereCanvasProps) => {
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WebGLEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current || reducedMotion) return;

    try {
      // Initialize engine
      engineRef.current = new WebGLEngine(canvasRef.current, config);
      engineRef.current.start();

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        engineRef.current?.resize();
      });
      resizeObserver.observe(canvasRef.current);

      return () => {
        engineRef.current?.dispose();
        engineRef.current = null;
        resizeObserver.disconnect();
      };
    } catch (err) {
      console.error('Failed to initialize WebGL atmosphere:', err);
      // Silent fail if WebGL initialization fails
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  // Sync config updates
  useEffect(() => {
    engineRef.current?.updateConfig(config);
  }, [config]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    engineRef.current.handlePointerDown();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Calculate movement delta if needed, or engine can track interactions
    // For simplicity, we pass current position and let engine/logic handle delta if we tracked last pos, 
    // BUT WebGLEngine's handlePointerMove signature asks for (x, y, dx, dy).
    // React's PointerEvent has movementX/Y but they can be unreliable across browsers/if pointer locked?
    // Let's rely on movementX/Y for now or tracking ref.
    
    // Better to use movementX/Y provided by the event if available and reliable enough for simple splats
    engineRef.current.handlePointerMove(
      e.clientX - rect.left, 
      e.clientY - rect.top, 
      e.movementX, 
      e.movementY
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    engineRef.current.handlePointerUp();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <canvas 
      aria-hidden="true"
      ref={canvasRef} 
      className={`block w-full h-full pointer-events-auto ${className}`} // Changed to pointer-events-auto to capture input
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
};
