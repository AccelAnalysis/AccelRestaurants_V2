import { useEffect, useCallback, useMemo } from 'react';
import type { TileInteraction, TileInstance } from '../types/schema';

export const useTileInteractions = (tile: TileInstance, isEditor: boolean) => {
  // Memoize interactions to avoid unnecessary re-runs of useEffect
  const interactionsJson = JSON.stringify(tile.properties.interactions);
  const interactions = useMemo(() => {
    return tile.properties.interactions || [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionsJson]);

  const handleAction = useCallback((interaction: TileInteraction, eventPayload?: Record<string, unknown>) => {
    if (isEditor) return;

    const { action, targetId, payload, eventName } = interaction;

    console.log(`[TileInteraction] Triggered ${action} from ${tile.id}`, interaction);

    switch (action) {
      case 'navigate':
        if (targetId) {
          window.dispatchEvent(new CustomEvent('player-navigate', { 
            detail: { slideId: targetId } 
          }));
        }
        break;
      
      case 'link':
        if (payload?.url) {
          window.open(String(payload.url), '_blank');
        }
        break;

      case 'emit_event':
        if (eventName) {
          window.dispatchEvent(new CustomEvent(eventName, { 
            detail: { ...payload, ...eventPayload, sourceTileId: tile.id } 
          }));
        }
        break;

      case 'update_property':
        // If targetId is missing, assume self. 
        // This requires a global store or event listener on the target tile to handle updates.
        // We'll emit a system event for this.
        window.dispatchEvent(new CustomEvent('system-update-tile', {
          detail: { 
            tileId: targetId || tile.id, 
            properties: payload 
          }
        }));
        break;
        
      case 'run_script':
        // Advanced: Execute trusted script (sandbox needed in real implementation)
        console.warn('Script execution not yet implemented');
        break;
    }
  }, [tile.id, isEditor]);

  // Handle 'load' and 'interval' triggers
  useEffect(() => {
    if (isEditor) return;

    const cleanupFns: (() => void)[] = [];

    interactions.forEach(interaction => {
      if (interaction.trigger === 'load') {
        handleAction(interaction);
      } else if (interaction.trigger === 'interval' && interaction.payload?.intervalMs) {
        const ms = Number(interaction.payload.intervalMs) || 10000;
        const interval = setInterval(() => handleAction(interaction), ms);
        cleanupFns.push(() => clearInterval(interval));
      } else if (interaction.trigger === 'event' && interaction.eventName) {
        const eventName = interaction.eventName; // Capture for closure
        const handler = (e: Event) => {
            const customEvent = e as CustomEvent;
            handleAction(interaction, customEvent.detail);
        };
        window.addEventListener(eventName, handler);
        cleanupFns.push(() => window.removeEventListener(eventName, handler));
      }
    });

    return () => cleanupFns.forEach(fn => fn());
  }, [interactions, handleAction, isEditor]);

  // Return handlers for UI events
  const getHandlers = () => {
    if (isEditor) return {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers: Record<string, (e: any) => void> = {};

    const clickInteractions = interactions.filter(i => i.trigger === 'click');
    if (clickInteractions.length > 0) {
      handlers.onClick = () => {
        // e.stopPropagation(); // Maybe?
        clickInteractions.forEach(i => handleAction(i));
      };
    }

    const hoverInteractions = interactions.filter(i => i.trigger === 'hover');
    if (hoverInteractions.length > 0) {
      handlers.onMouseEnter = () => hoverInteractions.forEach(i => handleAction(i));
    }

    return handlers;
  };

  return { getHandlers };
};
