import { useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useMediaQuery';
import type { ParticleConfig } from '../../types/schema';
import { WebGLEngine } from '../../lib/webgl/WebGLEngine';
import { normalizeAtmosphere } from '../../../functions/src/cinematic/catalog';

interface AtmosphereCanvasProps { config: ParticleConfig; className?: string; allowMotion?: boolean }
export const AtmosphereCanvas = ({ config, className = '', allowMotion = true }: AtmosphereCanvasProps) => {
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const normalized = useMemo(() => normalizeAtmosphere(config), [config]);
  const enabled = allowMotion && !reducedMotion && normalized.effectType !== 'none' && normalized.density > 0 && normalized.color[3] > 0;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;
    let engine: WebGLEngine;
    try { engine = new WebGLEngine(canvas, normalized); }
    catch { canvas.dataset.atmosphereState = 'unavailable'; return; }
    let visible = true;
    const sync = () => {
      const running = visible && document.visibilityState !== 'hidden';
      if (running) engine.start(); else engine.stop();
      canvas.dataset.atmosphereMotion = running ? 'running' : 'paused';
    };
    const resize = new ResizeObserver(() => engine.resize());
    resize.observe(canvas);
    const intersection = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? true; sync();
    }) : null;
    intersection?.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => { document.removeEventListener('visibilitychange', sync); resize.disconnect(); intersection?.disconnect(); engine.dispose(); };
  }, [enabled, normalized]);
  if (!enabled) return null;
  return <canvas aria-hidden="true" ref={canvasRef} data-atmosphere-preset={normalized.presetId || 'custom'}
    className={`block w-full h-full ${className}`} style={{ pointerEvents: 'none', mixBlendMode: normalized.blendMode }} />;
};
