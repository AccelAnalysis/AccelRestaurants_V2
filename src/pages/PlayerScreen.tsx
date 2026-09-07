import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { ScreenService } from '../services/screenService';
import { SlideService } from '../services/slideService';
import { OrganizationService } from '../services/organizationService';
import { MenuService } from '../services/menuService';
import { LocationService } from '../services/locationService';
import { campaignService, type TriggerEvent } from '../services/campaignService';
import { isMenuActive } from '../utils/dayparting';
import { normalizePlaylist } from '../utils/playlist';
import { AtmosphereCanvas } from '../components/atoms/AtmosphereCanvas';
import { TileContent } from '../components/atoms/TileContent';
import { GlobalMediaPlane } from '../components/atoms/GlobalMediaPlane';
import { QrCode, Clock } from 'lucide-react';
import type { AppScreen, Slide, Organization, Location, Menu, InteractiveTileProperties, PlaylistEntry, ScreenAdjustments } from '../types/schema';
import { DEPLOYMENT_DURATION_LIMIT_MS } from '../lib/plans';
import { useConfigStore } from '../store/useConfigStore';


// Helper component for rendering a single slide
const SlideRenderer = ({ slide, isActive, screenId, orgId, adjustments }: { slide: Slide; isActive: boolean; screenId?: string; orgId?: string; adjustments?: ScreenAdjustments }) => {
  const scale = adjustments?.scale ?? 1.0;
  const offsetX = adjustments?.offsetX ?? 0;
  const offsetY = adjustments?.offsetY ?? 0;
  const hasAdjustments = scale !== 1.0 || offsetX !== 0 || offsetY !== 0;

  return (
    <>
      {/* Background Layer */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ 
          backgroundColor: slide.backgroundColor,
          backgroundImage: slide.backgroundImageUrl ? `url(${slide.backgroundImageUrl})` : 'none'
        }}
      />

      {/* Atmosphere Layer - Only mount if active to save WebGL contexts */}
      {isActive && slide.particleConfig && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <AtmosphereCanvas config={slide.particleConfig} />
        </div>
      )}

      {/* Content Layer */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <div
          style={hasAdjustments ? {
            transform: `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`,
            transformOrigin: 'center center',
            width: '100%',
            height: '100%',
            position: 'relative'
          } : undefined}
        >
          {slide.elements.map(tile => (
            <div
              key={tile.id}
              style={{
                position: 'absolute',
                left: tile.position.x,
                top: tile.position.y,
                width: tile.size.width,
                height: tile.size.height,
                zIndex: tile.zIndex
              }}
            >
              <TileContent tile={tile} screenId={screenId} orgId={orgId} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export const PlayerScreen = () => {
  const { screenId } = useParams();
  const { planConfigs, fetchConfigs } = useConfigStore();
  const [screen, setScreen] = useState<AppScreen | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [allSlides, setAllSlides] = useState<Slide[]>([]);
  const [playlistEntries, setPlaylistEntries] = useState<PlaylistEntry[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentTransitionType, setCurrentTransitionType] = useState<'fade' | 'slide' | 'none'>('fade');
  // Track which slides should be mounted (current + outgoing during transition)
  const [renderedIndices, setRenderedIndices] = useState<number[]>([0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTrigger, setActiveTrigger] = useState<TriggerEvent | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showPromoOverlay, setShowPromoOverlay] = useState(false);
  
  const rotationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const promoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastProcessedScreenRef = useRef<string>('');

  // Initialize Configs
  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // Workaround: Screen Wake Lock API
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let wakeLock: any = null;
    
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock failed:', err);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (wakeLock) wakeLock.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Workaround: Continuous Media Playback
  useEffect(() => {
    const video = document.getElementById('keep-awake-video') as HTMLVideoElement;
    if (video) {
      // Try to play immediately
      video.play().catch(() => {
         // If failed, retry periodically until successful
         const playAttempt = setInterval(async () => {
            if (video.paused) {
              try {
                await video.play();
                clearInterval(playAttempt);
              } catch {
                // Keep trying
              }
            } else {
              clearInterval(playAttempt);
            }
          }, 2000);
          
          return () => clearInterval(playAttempt);
      });
    }
  }, []);

  // Periodic Promo Overlay for Free Tier
  useEffect(() => {
    if (!organization || organization.plan !== 'Free') return;

    // Show promo every 3 minutes for 10 seconds
    const PROMO_INTERVAL = 3 * 60 * 1000;
    const PROMO_DURATION = 10 * 1000;

    promoTimerRef.current = setInterval(() => {
        setShowPromoOverlay(true);
        setTimeout(() => setShowPromoOverlay(false), PROMO_DURATION);
    }, PROMO_INTERVAL);

    return () => {
        if (promoTimerRef.current) clearInterval(promoTimerRef.current);
    };
  }, [organization]);

  // Heartbeat Loop
  useEffect(() => {
    if (!screenId) return;

    // Send initial heartbeat
    campaignService.sendHeartbeat(screenId);

    // Send heartbeat every 60 seconds
    const interval = setInterval(() => {
      campaignService.sendHeartbeat(screenId);
    }, 60000);

    return () => clearInterval(interval);
  }, [screenId]);

  // Subscribe to Screen Data
  useEffect(() => {
    if (!screenId) return;

    const unsubscribe = ScreenService.subscribeToScreen(screenId, async (updatedScreen) => {
      if (updatedScreen) {
        // Exclude lastHeartbeatAt from comparison to avoid re-renders on heartbeat updates
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { lastHeartbeatAt, ...relevantData } = updatedScreen;
        const dataString = JSON.stringify(relevantData);

        if (lastProcessedScreenRef.current === dataString) {
          return;
        }

        lastProcessedScreenRef.current = dataString;
        setScreen(updatedScreen);
        
        // Fetch organization and location
        try {
          const [org, loc] = await Promise.all([
            OrganizationService.getPublicOrganization(updatedScreen.orgId),
            updatedScreen.locationId ? LocationService.getLocation(updatedScreen.orgId, updatedScreen.locationId) : Promise.resolve(null)
          ]);
          setOrganization(org);
          setLocation(loc);
        } catch {
          // Silent fail for fetches
        }
      } else {
        setError('Screen not found');
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (rotationTimerRef.current) clearTimeout(rotationTimerRef.current);
    };
  }, [screenId]);

  // Fetch Required Menus based on Slides
  useEffect(() => {
    const fetchMenus = async () => {
      if (!allSlides.length) {
        setMenus([]);
        return;
      }

      const menuIds = new Set<string>();
      
      allSlides.forEach(slide => {
        slide.elements.forEach(tile => {
          if (tile.type === 'menu_selector') {
            const menuId = (tile.properties as InteractiveTileProperties).menuId;
            if (menuId) {
              menuIds.add(menuId);
            }
          }
        });
      });

      if (menuIds.size === 0) {
        setMenus([]);
        return;
      }

      try {
        const menuPromises = Array.from(menuIds).map(id => MenuService.getMenu(id));
        const fetchedMenus = await Promise.all(menuPromises);
        const validMenus = fetchedMenus.filter((m): m is Menu => m !== null);
        setMenus(validMenus);
      } catch (err) {
        console.error('Failed to load menus:', err);
      }
    };

    fetchMenus();
  }, [allSlides]);

  // Update current time every minute for dayparting checks
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);


  // Filter slides based on active menus (Dayparting Logic)
  // Also maintain matching playlist entries
  const { activeSlides, activePlaylistEntries } = useMemo(() => {
    if (!menus.length) {
      return { activeSlides: allSlides, activePlaylistEntries: playlistEntries };
    }

    const filtered: { slide: Slide; entry: PlaylistEntry }[] = [];
    
    allSlides.forEach((slide, index) => {
      const menuTiles = slide.elements.filter(e => e.type === 'menu_selector');
      if (menuTiles.length === 0) {
        filtered.push({ slide, entry: playlistEntries[index] });
        return;
      }

      // Check if ALL linked menus are active
      const isActive = menuTiles.every(tile => {
        const menuId = (tile.properties as InteractiveTileProperties).menuId;
        if (!menuId) return true; // No specific menu linked
        
        const menu = menus.find(m => m.id === menuId);
        if (!menu) return true; // Menu not found, assume active or handle error? Default active to show content.
        
        // Check location availability
        const isLocationValid = () => {
             // If no restrictions are set, it's available everywhere (backward compatibility)
             if ((!menu.locationIds || menu.locationIds.length === 0) && 
                 (!menu.locationGroupIds || menu.locationGroupIds.length === 0)) {
               return true;
             }
             
             // Check specific location match
             if (location && menu.locationIds?.includes(location.id)) {
               return true;
             }

             // Check group match
             if (location?.groupId && menu.locationGroupIds?.includes(location.groupId)) {
               return true;
             }
             
             return false;
        };

        if (!isLocationValid()) return false;

        // Check schedule (Use location timezone if available, else org timezone)
        return isMenuActive(menu.schedule, location?.timezone || organization?.timezone, currentTime);
      });
      
      if (isActive) {
        filtered.push({ slide, entry: playlistEntries[index] });
      }
    });
    
    return {
      activeSlides: filtered.map(f => f.slide),
      activePlaylistEntries: filtered.map(f => f.entry)
    };
  }, [allSlides, playlistEntries, menus, currentTime, organization?.timezone, location]);

  // Check Deployment Duration Limit
  useEffect(() => {
    if (!organization) return;

    const planConfig = planConfigs[organization.plan];
    
    // Only initialize timer if limit is enabled AND it hasn't started yet
    if (planConfig?.deploymentDurationLimit && !durationTimerRef.current) {
      setTimeout(() => setTimeRemaining(DEPLOYMENT_DURATION_LIMIT_MS), 0);
      
      durationTimerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 0) {
            if (durationTimerRef.current) clearInterval(durationTimerRef.current);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }

    return () => {
      // Clean up timer on unmount
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, [organization, planConfigs]);

  // Fetch Slides when Playlist Changes
  useEffect(() => {
    const fetchSlides = async () => {
      if (!screen?.livePlaylist?.length) {
        setAllSlides([]);
        setPlaylistEntries([]);
        return;
      }

      try {
        const entries = normalizePlaylist(screen.livePlaylist);
        const slidePromises = entries.map(entry => SlideService.getSlide(entry.slideId));
        const fetchedSlides = await Promise.all(slidePromises);
        
        // Keep entries and slides in sync (filter out nulls together)
        const validPairs: { slide: Slide; entry: PlaylistEntry }[] = [];
        fetchedSlides.forEach((s, i) => {
          if (s) validPairs.push({ slide: s, entry: entries[i] });
        });
        
        setAllSlides(validPairs.map(p => p.slide));
        setPlaylistEntries(validPairs.map(p => p.entry));
      } catch {
        // Silent fail for slides fetch
      }
    };

    fetchSlides();
  }, [screen?.livePlaylist]);

  // Track current index and playlist entries in refs for timeout callbacks without dependency cycles
  const indexRef = useRef(currentSlideIndex);
  useEffect(() => {
    indexRef.current = currentSlideIndex;
  }, [currentSlideIndex]);

  const playlistEntriesRef = useRef(activePlaylistEntries);
  useEffect(() => {
    playlistEntriesRef.current = activePlaylistEntries;
  }, [activePlaylistEntries]);

  // Ensure initial preloading when activeSlides changes and validate index
  useEffect(() => {
    if (activeSlides.length === 0) return;

    // If current index is out of bounds (e.g. playlist shrank), reset
    if (currentSlideIndex >= activeSlides.length) {
      setCurrentSlideIndex(0);
      setRenderedIndices(activeSlides.length > 1 ? [0, 1] : [0]);
    } else {
      // Ensure next slide is preloaded
      setRenderedIndices(prev => {
        const next = (currentSlideIndex + 1) % activeSlides.length;
        if (!prev.includes(next)) {
          return [...prev, next];
        }
        return prev;
      });
    }
    // We only want to run this when the playlist structure changes, 
    // not on every rotation (which handles its own preloading)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlides]);

  const isTimeLimitReached = timeRemaining === 0;

  // Listen for navigation events from Button Tiles
  useEffect(() => {
    const handleNavigation = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { slideId, index } = customEvent.detail;
      
      let targetIndex = -1;
      
      if (typeof index === 'number') {
        targetIndex = index;
      } else if (slideId) {
        targetIndex = activeSlides.findIndex(s => s.id === slideId);
      }

      if (targetIndex !== -1 && targetIndex !== currentSlideIndex) {
        // Reset timer to prevent immediate auto-rotation
        if (rotationTimerRef.current) {
          clearTimeout(rotationTimerRef.current);
          rotationTimerRef.current = null;
        }
        
        // Manual transition
        setRenderedIndices([currentSlideIndex, targetIndex]);
        setCurrentSlideIndex(targetIndex);
        
        // Cleanup old slide after transition
        setTimeout(() => {
          setRenderedIndices([targetIndex, (targetIndex + 1) % activeSlides.length]);
        }, 1000);
      }
    };

    window.addEventListener('player-navigate', handleNavigation);
    return () => window.removeEventListener('player-navigate', handleNavigation);
  }, [activeSlides, currentSlideIndex]);

  // Listen for trigger events from Button Tiles
  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { triggerName } = customEvent.detail;
      
      // Simulate a campaign trigger event locally
      const mockEvent: TriggerEvent = {
        triggerId: `local-${Date.now()}`,
        type: 'button_click',
        campaignId: 'local-interaction',
        payload: {
          message: triggerName || 'Button Triggered!',
          discountCode: 'TOUCH10' // Default code for touch interactions
        }
      };
      
      setActiveTrigger(mockEvent);
      
      // Auto-dismiss after 10s (matches session trigger behavior)
      setTimeout(() => setActiveTrigger(null), 10000);
    };

    window.addEventListener('player-trigger', handleTrigger);
    return () => window.removeEventListener('player-trigger', handleTrigger);
  }, []);

  // Handle Rotation & Transition State (setTimeout chain for per-slide durations)
  useEffect(() => {
    if (!activeSlides.length || !screen) return;
    if (isTimeLimitReached) return;

    const globalMs = screen.rotationSettings?.rotationMs || 10000;
    const globalTransition = screen.rotationSettings?.transition || 'fade';

    const scheduleNext = () => {
      const currentIdx = indexRef.current;
      const entries = playlistEntriesRef.current;
      
      // Get duration for current slide (per-slide override or global)
      const currentEntry = entries[currentIdx];
      const slideDuration = currentEntry?.duration || globalMs;

      rotationTimerRef.current = setTimeout(() => {
        const prevIndex = indexRef.current;
        const nextIndex = (prevIndex + 1) % activeSlides.length;
        const nextNextIndex = (nextIndex + 1) % activeSlides.length;
        
        // Determine transition type for the incoming slide (per-slide override or global)
        const nextEntry = playlistEntriesRef.current[nextIndex];
        const transitionType = nextEntry?.transition || globalTransition;
        setCurrentTransitionType(transitionType);
        
        // Transition Start: Ensure both prev and next are mounted
        setRenderedIndices([prevIndex, nextIndex]);
        
        // Trigger transition (CSS handles animation based on currentTransitionType)
        setCurrentSlideIndex(nextIndex);
        
        // Transition End: Cleanup prev, keep next, preload nextNext
        const transitionDuration = transitionType === 'none' ? 50 : 1000;
        setTimeout(() => {
          setRenderedIndices([nextIndex, nextNextIndex]);
        }, transitionDuration);

        // Schedule next rotation
        scheduleNext();
      }, slideDuration);
    };

    scheduleNext();

    return () => {
      if (rotationTimerRef.current) clearTimeout(rotationTimerRef.current);
    };
  }, [activeSlides.length, screen, isTimeLimitReached]); // Stable dependencies

  // Calculate container style for rotation
  const containerStyle: React.CSSProperties = useMemo(() => {
    const r = screen?.rotation || 0;
    
    // Default (0 degrees)
    if (r === 0) {
      return { width: '100vw', height: '100vh' };
    }
    
    // 180 degrees
    if (r === 180) {
      return { 
        width: '100vw', 
        height: '100vh',
        transform: 'rotate(180deg)',
        transformOrigin: 'center center'
      };
    }
    
    // 90 or 270 degrees - Swap dimensions and center
    return {
      width: '100vh',
      height: '100vw',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: `translate(-50%, -50%) rotate(${r}deg)`,
      overflow: 'hidden'
    };
  }, [screen?.rotation]);

  const [pairingCode, setPairingCode] = useState<string | null>(null);

  // Subscribe to Real-time Commands (Firestore)
  useEffect(() => {
    if (!screenId) return;

    const initSession = async () => {
      try {
        const session = await campaignService.createScreenSession(screenId);
        campaignService.connect(session, (event) => {
          setActiveTrigger(event);
          campaignService.markCommandProcessed(session.screenSessionId, event.triggerId);
          setTimeout(() => setActiveTrigger(null), 10000);
        });
      } catch (e) {
        console.error('Failed to init session', e);
      }
    };

    initSession();

    return () => campaignService.disconnect();
  }, [screenId]);

  // Pairing Flow: Request Code if unpaired
  useEffect(() => {
    if (!screenId || !screen) return;
    
    // Check if paired (has orgId)
    if (screen.orgId) return;

    // Check if we already have a valid code
    if (pairingCode) return;

    const getCode = async () => {
      try {
        const requestPairingCode = httpsCallable(functions, 'requestPairingCode');
        const result = await requestPairingCode({ screenId });
        const data = result.data as { code: string };
        setPairingCode(data.code);
      } catch (err) {
        console.error('Failed to get pairing code', err);
        // Retry in 30s
        setTimeout(getCode, 30000);
      }
    };

    getCode();
  }, [screenId, screen, pairingCode]);

  // Unpaired State View
  if (screen && !screen.orgId) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-1000">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-12 shadow-2xl">
          <h1 className="text-3xl font-bold mb-2">Pair this Screen</h1>
          <p className="text-zinc-400 mb-8">Scan the QR code or enter the PIN below to connect this screen to your account.</p>
          
          {pairingCode ? (
            <div className="space-y-8">
              <div className="bg-white p-4 rounded-2xl inline-block shadow-xl">
                <QrCode size={200} className="text-black" />
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-zinc-500 uppercase tracking-widest font-bold">Pairing PIN</div>
                <div className="text-6xl font-mono font-bold tracking-wider text-primary">{pairingCode}</div>
              </div>

              <div className="text-sm text-zinc-500">
                Go to <strong>app.accelrestaurants.com/pair</strong>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
              <p className="text-zinc-500">Generating pairing code...</p>
            </div>
          )}
        </div>
        <div className="mt-8 text-zinc-600 font-mono text-xs">
          Screen ID: {screenId}
        </div>
      </div>
    );
  }

  if (loading) {
    // ... existing loading view
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse">Loading Screen...</div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="min-h-screen bg-black text-red-500 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!screen || !activeSlides.length || !screen.isActive) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">{screen?.name || 'Player'}</h1>
        <p className="text-gray-400">
          {!screen?.isActive 
            ? 'This screen is currently disabled.' 
            : allSlides.length > 0 
              ? 'No content scheduled for this time.' 
              : 'Waiting for content...'}
        </p>
        <div className="text-xs text-gray-600 font-mono mt-4">ID: {screenId}</div>
      </div>
    );
  }

  return (
    <div 
      className="relative overflow-hidden bg-black"
      style={containerStyle}
    >
      <GlobalMediaPlane screen={screen} location={location} />
      {activeSlides.map((slide, index) => {
        // Only render if in renderedIndices (current or transitioning)
        if (!renderedIndices.includes(index)) return null;

        const isCurrent = index === currentSlideIndex;

        // Build transition styles based on currentTransitionType
        const getSlideStyle = (): React.CSSProperties => {
          if (currentTransitionType === 'none') {
            return {
              opacity: isCurrent ? 1 : 0,
              zIndex: isCurrent ? 10 : 0,
            };
          }
          if (currentTransitionType === 'slide') {
            return {
              transform: isCurrent ? 'translateX(0%)' : 'translateX(-100%)',
              transition: 'transform 1s ease-in-out',
              zIndex: isCurrent ? 10 : 5,
              opacity: 1,
            };
          }
          // Default: fade
          return {
            opacity: isCurrent ? 1 : 0,
            transition: 'opacity 1s ease-in-out',
            zIndex: isCurrent ? 10 : 0,
          };
        };
        
        return (
          <div 
            key={`${slide.id}-${index}`}
            className="absolute inset-0"
            style={getSlideStyle()}
          >
            <SlideRenderer
              slide={slide}
              isActive={true}
              screenId={screenId}
              orgId={screen?.orgId}
              adjustments={playlistEntries[index]?.screenAdjustments ?? screen?.screenAdjustments}
            />
          </div>
        );
      })}

      {/* Campaign Overlay (Trigger Fired) */}
      {activeTrigger && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-primary/20 backdrop-blur-sm animate-in zoom-in fade-in duration-500">
          <div className="bg-surface border-4 border-primary rounded-3xl p-12 shadow-[0_0_50px_rgba(234,88,12,0.5)] text-center max-w-2xl">
            <h2 className="text-5xl font-black text-text mb-4 uppercase tracking-tighter">Special Offer!</h2>
            <p className="text-2xl text-text-muted mb-8">{String(activeTrigger.payload.message || 'You just unlocked a discount!')}</p>
            <div className="bg-primary text-white text-6xl font-mono py-6 rounded-2xl shadow-inner">
              {String(activeTrigger.payload.discountCode || 'SAVE20')}
            </div>
            <p className="mt-8 text-text-muted animate-pulse italic">Present this code at checkout</p>
          </div>
        </div>
      )}

      {/* Deployment Time Limit Overlay */}
      {timeRemaining === 0 && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="text-center max-w-md p-8 bg-surface border border-surface-highlight rounded-2xl shadow-2xl">
            <Clock size={48} className="mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold text-white mb-2">Free Preview Ended</h2>
            <p className="text-text-muted mb-6">
              Your free plan allows for 5 minutes of playback per session. Upgrade to remove this limit.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
            >
              Restart Preview
            </button>
          </div>
        </div>
      )}

      {/* Free Tier Watermark */}
      {organization?.plan === 'Free' && (
        <div className="absolute bottom-4 left-4 z-[60] bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 pointer-events-none">
          <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Powered by AccelRestaurants</span>
        </div>
      )}

      {/* Free Tier Promo Takeover */}
      {showPromoOverlay && (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-500">
           <div className="text-center max-w-lg p-8">
             <h2 className="text-4xl font-bold text-white mb-4">Want screens like this?</h2>
             <div className="bg-white p-4 rounded-xl inline-block mb-6 shadow-2xl">
                <QrCode size={180} className="text-black" />
             </div>
             <p className="text-xl text-white/80 font-medium">Scan to start for free</p>
             <p className="text-sm text-white/40 mt-8">Returning to content in a moment...</p>
           </div>
        </div>
      )}

      
      {/* System Status Indicators */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        {timeRemaining !== null && timeRemaining > 0 && (
           <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-highlight/50 text-text-muted">
             <Clock size={12} />
             {Math.floor(timeRemaining / 60000)}:{(Math.floor(timeRemaining / 1000) % 60).toString().padStart(2, '0')}
           </div>
        )}
      </div>
      
      {/* Debug Info */}
      <div className="absolute bottom-2 right-2 z-50 text-[10px] text-white/20 font-mono pointer-events-none">
        {currentSlideIndex + 1} / {activeSlides.length} • {screen.name}
      </div>

      {/* Workaround: Silent Video for Fire TV Sleep Prevention */}
      <video 
        id="keep-awake-video"
        src="/videos/silent_black.mp4"
        autoPlay 
        loop 
        muted 
        playsInline
        style={{ 
          position: 'absolute', 
          width: '1px', 
          height: '1px', 
          top: '-9999px', 
          left: '-9999px', 
          opacity: 0.001,
          pointerEvents: 'none' 
        }} 
      />
    </div>
  );
};
