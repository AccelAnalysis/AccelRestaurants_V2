import { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { InteractiveTileProperties, TileInstance } from '../../types/schema';
import type { MeasurementRuntime } from '../../hooks/usePlayerMeasurement';
import type { PlacementHint } from '../../services/measurementService';
import { recordPlayback } from '../../lib/measurementQueue';

function visibleEnough(node: HTMLElement) {
  if (document.visibilityState !== 'visible') return false;
  const rect = node.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const intersection = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0)) * Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
  if (intersection / (rect.width * rect.height) < 0.95) return false;
  for (let current: HTMLElement | null = node; current; current = current.parentElement) {
    const style = getComputedStyle(current);
    if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) < 0.95) return false;
  }
  return true;
}

/** Proof of rendering, not human impressions or proof the physical television is powered on. */
export function MeasuredQR({ tile, placement, active, measurement }: { tile: TileInstance; placement?: PlacementHint; active: boolean; measurement?: MeasurementRuntime }) {
  const element = useRef<HTMLDivElement>(null);
  const props = tile.properties as InteractiveTileProperties;
  const sessionId = measurement?.session?.sessionId; const uid = measurement?.uid;
  const enabled = measurement?.enabled; const serverNow = measurement?.serverNow;
  useEffect(() => {
    if (!active || !enabled || !sessionId || !uid || !placement || !serverNow) return;
    let previous = performance.now(); let consecutive = 0; let qualified = false;
    const timer = window.setInterval(() => {
      const now = performance.now(); const elapsed = Math.floor(now - previous); previous = now;
      if (!element.current || !visibleEnough(element.current) || elapsed > 1500 || elapsed <= 0) { consecutive = 0; qualified = false; return; }
      consecutive += elapsed;
      const play = !qualified && consecutive >= 1000 ? 1 : 0;
      if (play) qualified = true;
      void recordPlayback(uid, sessionId, placement.placementId, serverNow(), elapsed, play);
    }, 250);
    return () => clearInterval(timer);
  }, [active, enabled, sessionId, uid, placement, serverNow]);

  // Never substitute an unrelated URL for a configured survey when attribution is unavailable.
  const value = placement?.redirectUrl || (!props.measurementCampaignId ? String(props.content || '') : '');
  if (!value) return <div className="w-full h-full flex items-center justify-center text-center text-sm p-3" role="status">Guest engagement is temporarily unavailable.</div>;
  return (
    <div ref={element} className="w-full h-full flex flex-col items-center justify-center" data-measurement-placement={placement?.placementId || undefined} data-measurement-mode={measurement?.session?.mode}>
      <QRCodeSVG value={value} size={160} level={props.qrErrorCorrection || 'M'} marginSize={4} bgColor={props.backgroundColor || '#ffffff'} fgColor={props.qrForegroundColor || '#000000'} style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%' }} title="Scan to engage with this restaurant" />
    </div>
  );
}
