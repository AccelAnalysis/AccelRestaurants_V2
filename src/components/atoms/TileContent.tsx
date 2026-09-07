import { InlineFeedback } from './InlineFeedback';
import { 
  Image as ImageIcon, 
  Video, 
  BarChart as BarChartIcon,
  Sparkles,
  Type,
  Activity,
  MousePointer2,
  Layout,
  HelpCircle,
  Clock,
  Calendar,
  Rss,
  MessageSquare,
  MapPin,
  Volume2
} from 'lucide-react';
import type { 
  TileInstance, 
  TileType, 
  DynamicTextProperties, 
  SlideshowTileProperties, 
  InteractiveTileProperties, 
  SpecialTileProperties, 
  TextTileProperties, 
  ScrollingTextProperties, 
  RichTextProperties, 
  MarqueeProperties, 
  TypewriterProperties, 
  WordArtProperties, 
  GradientTextProperties, 
  AnimatedTextProperties, 
  TextShadowTileProperties, 
  ImageTileProperties, 
  VideoTileProperties, 
  AudioTileProperties,
  MediaSchedule,
  ChartProperties, 
  TableTileProperties, 
  KPICardProperties, 
  ProgressBarProperties, 
  HeatmapProperties, 
  TimelineProperties, 
  BaseTextProperties, 
  PieChartProperties, 
  GaugeProperties,
  DataTileSourceProperties,
  SparklineProperties,
  LayoutTileProperties
} from '../../types/schema';
import { useState, useEffect, useRef, useId, type CSSProperties, type ReactNode } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';

import { WeatherService } from '../../services/weatherService';
import { RssService, type RssFeed } from '../../services/rssService';
import { PollService, type PollData } from '../../services/pollService';
import { StockService, type StockQuote } from '../../services/stockService';
import { SocialService, type SocialPost } from '../../services/socialService';
import { FormService } from '../../services/formService';
import { CalendarService, type CalendarEvent } from '../../services/calendarService';
import { StorageService } from '../../services/storageService';
import { useTileInteractions } from '../../hooks/useTileInteractions';
import { audioExperienceCoordinator, isScheduleActive } from '../../lib/audioExperience';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const googleSheetsValueCache = new Map<string, { value: string; updatedAt: number }>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const googleSheetsRangeCache = new Map<string, { values: any[][]; updatedAt: number }>();

type ChartData = Array<{ name: string; value: number; [key: string]: string | number }>;
type TableData = (string | number)[][];
type HeatmapData = number[][];
type TimelineData = Array<{ time: string; title: string }>;
type TileData = ChartData | TableData | HeatmapData | TimelineData | null;

const getGoogleSheetsCacheKey = (properties: DynamicTextProperties): string => {
  return [
    'google_sheets',
    String(properties.scriptUrl || ''),
    String(properties.workbookId || ''),
    String(properties.sheetName || 'Sheet1'),
    String(properties.column || 'A'),
    String(properties.row || 1),
  ].join('|');
};

const getGoogleSheetsRangeCacheKey = (config: NonNullable<DataTileSourceProperties['googleSheetConfig']>): string => {
  return [
    'google_sheets_range',
    String(config.scriptUrl || ''),
    String(config.workbookId || ''),
    String(config.sheetName || 'Sheet1'),
    String(config.range || 'A1:B10'),
  ].join('|');
};

// Helper to parse CSV based on tile expectation
const parseCSVData = (csv: string, type: 'chart' | 'table' | 'heatmap' | 'timeline'): TileData => {
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length === 0) return null;

  if (type === 'chart') {
    return lines.map(line => {
      const [label, val] = line.split(',');
      return { name: label || '', value: Number(val) || 0 };
    });
  }
  if (type === 'table') {
    return lines.map(line => line.split(','));
  }
  if (type === 'heatmap') {
    return lines.map(line => line.split(',').map(v => Number(v) || 0));
  }
  if (type === 'timeline') {
    return lines.map(line => {
      const parts = line.split(',');
      return { time: parts[0] || '', title: parts.slice(1).join(',') || '' };
    });
  }
  return null;
};

// Helper to transform Sheet values (2D array) to component data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformSheetData = (values: any[][], type: 'chart' | 'table' | 'heatmap' | 'timeline'): TileData => {
  if (!Array.isArray(values) || values.length === 0) return null;

  if (type === 'chart') {
    return values.map(row => ({ name: String(row[0] || ''), value: Number(row[1]) || 0 }));
  }
  if (type === 'table') {
    return values;
  }
  if (type === 'heatmap') {
    return values.map(row => row.map(v => Number(v) || 0));
  }
  if (type === 'timeline') {
    return values.map(row => ({ time: String(row[0] || ''), title: String(row[1] || '') }));
  }
  return values;
};

// Hook for Data Tiles
const useDataTile = (properties: DataTileSourceProperties, type: 'chart' | 'table' | 'heatmap' | 'timeline') => {
  const [data, setData] = useState<TileData>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const sourceType = properties.dataSourceType || 'manual';

      if (sourceType === 'manual') {
        if (properties.manualData) {
          const parsed = parseCSVData(properties.manualData, type);
          setData(parsed);
        } else {
          setData(null);
        }
        return;
      }

      if (sourceType === 'json') {
        if (properties.jsonData) {
          try {
            const parsed = JSON.parse(properties.jsonData);
            setData(parsed);
            setError(null);
          } catch (e) {
            console.error("JSON Parse Error", e);
            setError("Invalid JSON");
          }
        } else {
          setData(null);
        }
        return;
      }

      if (sourceType === 'google_sheets' && properties.googleSheetConfig?.scriptUrl && properties.googleSheetConfig?.workbookId) {
        const config = properties.googleSheetConfig;
        const cacheKey = getGoogleSheetsRangeCacheKey(config);
        
        // Check cache first
        const cached = googleSheetsRangeCache.get(cacheKey);
        if (cached && (Date.now() - cached.updatedAt < (config.updateInterval || 60) * 1000)) {
          setData(transformSheetData(cached.values, type));
          return;
        }

        setLoading(true);
        try {
          const url = new URL(config.scriptUrl || '');
          url.searchParams.append('id', config.workbookId || '');
          url.searchParams.append('sheet', config.sheetName || 'Sheet1');
          if (config.range) url.searchParams.append('range', config.range);

          const res = await fetch(url.toString());
          const json = await res.json();

          if (json.values) {
            googleSheetsRangeCache.set(cacheKey, { values: json.values, updatedAt: Date.now() });
            setData(transformSheetData(json.values, type));
            setError(null);
          } else if (json.error) {
            setError(json.error);
          }
        } catch (err) {
          console.error(err);
          setError("Failed to fetch");
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();

    // Set up interval for Sheets
    if (properties.dataSourceType === 'google_sheets' && properties.googleSheetConfig?.updateInterval) {
      const interval = setInterval(loadData, properties.googleSheetConfig.updateInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [properties, type]);

  return { data, loading, error };
};

const getTileIcon = (type: TileType): ReactNode => {
  switch (type) {
    // Text Tiles
    case 'text':
    case 'dynamic_text':
    case 'scrolling_text':
    case 'rich_text':
    case 'marquee':
    case 'typewriter':
    case 'word_art':
    case 'gradient_text':
    case 'animated_text':
    case 'text_shadow':
      return <Type size={24} />;
    
    // Media Tiles
    case 'image':
    case 'gif':
    case 'slideshow':
      return <ImageIcon size={24} />;
    case 'video':
    case 'background_video':
    case 'youtube':
    case 'vimeo':
    case 'webcam':
      return <Video size={24} />;
    case 'lottie':
    case 'audio':
      return <Activity size={24} />;

    // Data Tiles
    case 'bar_chart':
    case 'line_chart':
    case 'pie_chart':
    case 'gauge':
    case 'heatmap':
    case 'sparklines':
    case 'table':
    case 'timeline':
      return <BarChartIcon size={24} />;
    case 'kpi_card':
    case 'progress_bar':
      return <Activity size={24} />;

    // Interactive Tiles
    case 'button':
    case 'qr_code':
    case 'countdown':
    case 'form':
    case 'poll':
    case 'social_feed':
    case 'weather':
    case 'menu_selector':
    case 'promotion_banner':
    case 'loyalty_card':
      return <MousePointer2 size={24} />;

    // Layout Tiles
    case 'container':
    case 'divider':
    case 'grid':
    case 'flex':
    case 'tabs':
    case 'accordion':
    case 'carousel':
    case 'sticky_note':
    case 'shape':
    case 'frame':
      return <Layout size={24} />;

    // Special Tiles
    case 'clock':
      return <Clock size={24} />;
    case 'calendar':
      return <Calendar size={24} />;
    case 'rss_feed':
      return <Rss size={24} />;
    case 'social_proof':
    case 'testimonial':
      return <MessageSquare size={24} />;
    case 'stock_ticker':
    case 'menu_item':
    case 'special_offer':
    case 'event_countdown':
    case 'map':
      return <MapPin size={24} />;

    default:
      return <HelpCircle size={24} />;
  }
};

interface TileContentProps {
  tile: TileInstance;
  isEditor?: boolean;
  screenId?: string;
  orgId?: string;
}

// Sub-components for tiles with state/effects to follow React Hook rules
const DynamicTextTile = ({ properties, commonTextStyle, isEditor }: { properties: DynamicTextProperties, commonTextStyle: CSSProperties, isEditor: boolean }) => {
  const cacheKey = properties.dataSource === 'google_sheets' ? getGoogleSheetsCacheKey(properties) : '';
  const scriptUrl = properties.scriptUrl;
  const workbookId = properties.workbookId;
  const sheetName = properties.sheetName;
  const column = properties.column;
  const row = properties.row;
  const updateInterval = properties.updateInterval;
  const [dynamicValue, setDynamicValue] = useState<string>(() => {
    if (properties.dataSource !== 'google_sheets') return '';
    const cached = googleSheetsValueCache.get(cacheKey);
    return cached?.value ?? '';
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (properties.dataSource === 'google_sheets' && scriptUrl && workbookId) {
      const controller = new AbortController();

      const fetchData = async () => {
        setRefreshing(true);
        try {
          const url = new URL(scriptUrl);
          url.searchParams.append('id', workbookId);
          url.searchParams.append('sheet', sheetName || 'Sheet1');
          url.searchParams.append('col', column || 'A');
          url.searchParams.append('row', String(row || 1));

          const response = await fetch(url.toString(), { signal: controller.signal });
          const data = await response.json();
          if (data.value) {
            const nextValue = String(data.value);
            googleSheetsValueCache.set(cacheKey, { value: nextValue, updatedAt: Date.now() });
            setDynamicValue(nextValue);
          } else if (data.error) {
            if (!googleSheetsValueCache.get(cacheKey)?.value) {
              setDynamicValue(`Error: ${data.error}`);
            }
          }
        } catch {
          if (!googleSheetsValueCache.get(cacheKey)?.value) {
            setDynamicValue('Error fetching data');
          }
        } finally {
          setRefreshing(false);
        }
      };

      const cached = googleSheetsValueCache.get(cacheKey);
      if (cached?.value) {
        setDynamicValue(cached.value);
      }

      fetchData();

      const intervalSeconds = typeof updateInterval === 'number' ? updateInterval : 60;
      if (intervalSeconds > 0) {
        const interval = setInterval(fetchData, intervalSeconds * 1000);
        return () => {
          controller.abort();
          clearInterval(interval);
        };
      }

      return () => {
        controller.abort();
      };
    } else if (properties.dataSource === 'time') {
      const updateTime = () => {
        const now = new Date();
        setDynamicValue(now.toLocaleTimeString());
      };
      updateTime();
      const interval = setInterval(updateTime, 1000);
      return () => clearInterval(interval);
    }
  }, [properties.dataSource, cacheKey, scriptUrl, workbookId, sheetName, column, row, updateInterval]);

  const renderedText = (properties.textTemplate || '{{value}}').replace(
    '{{value}}',
    dynamicValue || (properties.fallbackText || '...')
  );

  return (
    <div style={{ ...commonTextStyle, whiteSpace: 'pre-wrap' }}>
      {renderedText}
      {isEditor && (
        <div className="text-[10px] opacity-50 mt-1 border border-white/20 px-1 rounded inline-block w-fit">
          Source: {String(properties.dataSource || 'None')}
          {refreshing && <span className="ml-2 animate-pulse">●</span>}
        </div>
      )}
    </div>
  );
};

const SlideshowTile = ({ properties }: { properties: SlideshowTileProperties }) => {
  const images = properties.images || [];
  const [idx, setIdx] = useState(0);
  
  useEffect(() => {
    if (images.length <= 1) return;
    const tid = setInterval(() => setIdx(p => (p + 1) % images.length), properties.interval || 3000);
    return () => clearInterval(tid);
  }, [images.length, properties.interval]);

  if (!images.length) return <div className="w-full h-full flex items-center justify-center bg-black/20 text-text-muted"><ImageIcon size={24} /></div>;
  return <div className="w-full h-full overflow-hidden"><img src={images[idx]?.url} alt="" className="w-full h-full object-cover transition-opacity duration-500" /></div>;
};

const CountdownTile = ({ properties }: { properties: InteractiveTileProperties }) => {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  
  useEffect(() => {
    const timer = setInterval(() => {
      const target = new Date(String(properties.targetDate || new Date(Date.now() + 3600000))).getTime();
      const diff = Math.max(0, target - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000)
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [properties.targetDate]);

  return (
    <div className="w-full h-full flex items-center justify-center gap-2 bg-black/20 rounded-lg border border-white/10 backdrop-blur-sm">
      {[timeLeft.h, timeLeft.m, timeLeft.s].map((v, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="text-2xl font-black text-white font-mono bg-surface px-2 py-1 rounded shadow-lg border border-surface-highlight">
            {String(v).padStart(2, '0')}
          </div>
          <div className="text-[8px] font-bold text-text-muted mt-1 uppercase tracking-tighter">
            {['hrs', 'min', 'sec'][i]}
          </div>
        </div>
      ))}
    </div>
  );
};

const ClockTile = ({ properties }: { properties: SpecialTileProperties }) => {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  const is12h = properties.format === '12h';
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-text bg-surface/30 rounded-2xl border border-surface-highlight shadow-inner">
      <div className="text-4xl font-black font-mono tracking-tighter text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
        {t.toLocaleTimeString([], { 
          hour12: is12h, 
          hour: '2-digit', 
          minute: '2-digit', 
          second: properties.showSeconds !== false ? '2-digit' : undefined 
        })}
      </div>
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-2 opacity-80">
        {t.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>
    </div>
  );
};

const EventCountdownTile = ({ properties }: { properties: SpecialTileProperties }) => {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  
  useEffect(() => {
    const timer = setInterval(() => {
      const target = new Date(String(properties.targetDate || new Date(Date.now() + 86400000))).getTime();
      const now = new Date().getTime();
      const diff = target - now;
      
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      
      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((diff % (1000 * 60)) / 1000)
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [properties.targetDate]);

  return (
    <div className="w-full h-full bg-surface-highlight/5 flex flex-col items-center justify-center p-3 rounded-xl border-2 border-primary/30 relative">
      <div className="absolute top-2 left-3 flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <div className="text-[8px] font-bold text-red-500 uppercase tracking-tighter">Live</div>
      </div>
      <div className="text-[10px] font-bold text-text-muted mb-2 uppercase tracking-widest">{String(properties.eventName || 'Next Event')}</div>
      <div className="flex gap-2 items-end">
        <div className="flex flex-col items-center">
          <div className="bg-surface border border-surface-highlight rounded px-2 py-1 text-2xl font-black text-primary min-w-[40px] text-center shadow-lg">{timeLeft.d}</div>
          <div className="text-[8px] text-text-muted font-bold mt-1">DAYS</div>
        </div>
        <div className="text-xl font-bold pb-5 text-text-muted">:</div>
        <div className="flex flex-col items-center">
          <div className="bg-surface border border-surface-highlight rounded px-2 py-1 text-2xl font-black text-text min-w-[40px] text-center shadow-lg">{String(timeLeft.h).padStart(2, '0')}</div>
          <div className="text-[8px] text-text-muted font-bold mt-1">HOURS</div>
        </div>
        <div className="text-xl font-bold pb-5 text-text-muted">:</div>
        <div className="flex flex-col items-center">
          <div className="bg-surface border border-surface-highlight rounded px-2 py-1 text-2xl font-black text-text min-w-[40px] text-center shadow-lg">{String(timeLeft.m).padStart(2, '0')}</div>
          <div className="text-[8px] text-text-muted font-bold mt-1">MINS</div>
        </div>
      </div>
    </div>
  );
};

import { QRCodeSVG } from 'qrcode.react';

const QRCodeTile = ({ properties, tileId, screenId, orgId }: { properties: InteractiveTileProperties, tileId?: string, screenId?: string, orgId?: string }) => {
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const content = String(properties.content || 'https://accel.com');
  const bgColor = String(properties.backgroundColor || '#ffffff');
  const fgColor = String(properties.qrForegroundColor || '#000000');
  const level = properties.qrErrorCorrection || 'M';
  
  // Handle Calendar Event Source
  useEffect(() => {
    if (properties.qrSource === 'calendar_event' && properties.calendarUrl) {
      let mounted = true;
      const fetchNextEvent = async () => {
        const events = await CalendarService.getEvents(properties.calendarUrl!);
        if (!mounted) return;
        
        const now = new Date();
        const nextEvent = events.find(e => e.start > now);
        
        if (nextEvent) {
          // Format dates for Google Calendar: YYYYMMDDTHHMMSSZ
          const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
          const start = formatDate(nextEvent.start);
          const end = formatDate(nextEvent.end);
          
          const link = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(nextEvent.title)}&dates=${start}/${end}&details=${encodeURIComponent(nextEvent.description || '')}&location=${encodeURIComponent(nextEvent.location || '')}&sf=true&output=xml`;
          setGeneratedContent(link);
        } else {
          setGeneratedContent(properties.calendarUrl || null); // Fallback to feed URL?
        }
      };
      
      fetchNextEvent();
      const interval = setInterval(fetchNextEvent, 15 * 60 * 1000); // 15 min refresh
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    } else {
      const tid = window.setTimeout(() => setGeneratedContent(null), 0);
      return () => window.clearTimeout(tid);
    }
  }, [properties.qrSource, properties.calendarUrl]);

  // Construct URL
  let qrValue = generatedContent || content;
  if (properties.trackScan && tileId && !generatedContent) { // Don't track generated dynamic links yet unless we wrap them
    const baseUrl = window.location.origin;
    const encodedUrl = encodeURIComponent(qrValue);
    qrValue = `${baseUrl}/r?url=${encodedUrl}&tid=${tileId}${screenId ? `&sid=${screenId}` : ''}${orgId ? `&oid=${orgId}` : ''}`;
  }

  return (
    <div className="w-full h-full p-2 flex flex-col items-center justify-center rounded-lg shadow-inner" style={{ backgroundColor: bgColor }}>
      <div className="w-full aspect-square flex items-center justify-center p-1">
        <QRCodeSVG 
          value={qrValue}
          size={undefined} // Let it fill parent via style/className if possible, or we need responsive size.
          // qrcode.react doesn't support 100% width easily without viewBox/style.
          // QRCodeSVG style={{ width: '100%', height: '100%' }} works.
          style={{ width: '100%', height: '100%' }}
          bgColor="transparent"
          fgColor={fgColor}
          level={level}
          includeMargin={false}
        />
      </div>
      <div className="text-[8px] text-black font-bold truncate w-full text-center opacity-60 px-1 mt-1">
        {properties.qrSource === 'calendar_event' ? 'Add to Calendar' : content}
      </div>
    </div>
  );
};

const PollTile = ({ properties, tileId, isEditor }: { properties: InteractiveTileProperties, tileId?: string, isEditor?: boolean }) => {
  const question = String(properties.question || 'Favorite Feature?');
  const options = properties.options || ['Animation', 'Interactivity', 'Ease of Use'];
  const [data, setData] = useState<PollData | null>(null);
  const [voted, setVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optionsJson = JSON.stringify(options);

  useEffect(() => {
    if (!tileId || isEditor) return;
    
    // Parse options from JSON to avoid dependency on mutable array
    const parsedOptions = JSON.parse(optionsJson) as string[];

    // Initialize if needed (idempotent)
    void PollService.initializePoll(tileId, question, parsedOptions).catch(() => setError('Poll unavailable. Please try again later.'));

    // Subscribe
    const unsubscribe = PollService.subscribeToPoll(tileId, (newData) => {
      setData(newData);
    });

    return () => unsubscribe();
  }, [tileId, question, optionsJson, isEditor]);

  const handleVote = async (index: number) => {
    if (isEditor || voted || voting || !tileId) return;
    setVoting(true); setError(null);
    try { await PollService.vote(tileId, index); setVoted(true); }
    catch { setError('Your vote could not be saved. Please try again.'); }
    finally { setVoting(false); }
  };

  // Calculate percentages
  const total = data?.totalVotes || 0;
  const getPercent = (index: number) => {
    if (!data || total === 0) return 0;
    const count = data.votes[index] || 0;
    return Math.round((count / total) * 100);
  };

  return (
    <div className="w-full h-full p-4 space-y-3 bg-surface rounded-lg border border-surface-highlight shadow-xl overflow-hidden flex flex-col justify-center">
      <div className="font-bold text-xs text-text mb-1">{question}</div>
      <div className="space-y-2">
        {options.map((o: string, i: number) => (
          <button 
            key={i} 
            onClick={() => handleVote(i)}
            disabled={voted || voting || isEditor || !tileId}
            className={`w-full group relative overflow-hidden bg-background border rounded p-2 text-[10px] text-left transition-colors ${voted ? 'border-surface-highlight cursor-default' : 'border-surface-highlight hover:border-primary cursor-pointer'}`}
          >
            <div className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-1000" style={{ width: `${getPercent(i)}%` }} />
            <div className="relative flex justify-between items-center text-text">
              <span className="font-medium">{o}</span>
              {data && <span className="text-[8px] font-black text-primary opacity-60">{getPercent(i)}%</span>}
            </div>
          </button>
        ))}
      </div>
      <InlineFeedback message={error} tone="error" />
      <InlineFeedback message={voting ? 'Saving vote…' : voted ? 'Your vote was saved.' : null} />
      {total > 0 && <div className="text-[8px] text-text-muted text-center italic">{total} votes</div>}
    </div>
  );
};

const WeatherTile = ({ properties }: { properties: InteractiveTileProperties }) => {
  const [weather, setWeather] = useState<{ temp: number; condition: string; high: number; low: number; locationName: string } | null>(null);
  const location = String(properties.location || 'New York, NY');

  useEffect(() => {
    let mounted = true;
    const fetchWeather = async () => {
      const data = await WeatherService.getWeather(location);
      if (mounted && data) {
        setWeather(data);
      }
    };
    
    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000); // 15 min refresh
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [location]);

  const displayLocation = weather?.locationName || location;
  const temp = weather ? weather.temp : '--';
  const condition = weather ? weather.condition : 'Loading...';
  const high = weather ? weather.high : '-';
  const low = weather ? weather.low : '-';

  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-white/10 p-4 flex flex-col items-center justify-center text-text shadow-2xl relative overflow-hidden">
      <div className="absolute top-2 right-3 opacity-20"><Sparkles size={32} className="text-white" /></div>
      <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1 text-center truncate w-full px-2">{displayLocation}</div>
      <div className="text-5xl font-black text-white drop-shadow-2xl flex items-start">
        {temp}<span className="text-2xl mt-1 opacity-50">°F</span>
      </div>
      <div className="text-[10px] font-bold text-text-muted mt-2 uppercase tracking-widest opacity-80">{condition}</div>
      <div className="flex gap-4 mt-4 opacity-60">
        <div className="flex flex-col items-center"><div className="text-[8px] font-bold">H: {high}°</div></div>
        <div className="flex flex-col items-center"><div className="text-[8px] font-bold">L: {low}°</div></div>
      </div>
    </div>
  );
};

const RssFeedTile = ({ properties }: { properties: SpecialTileProperties }) => {
  const [feed, setFeed] = useState<RssFeed | null>(null);
  const url = String(properties.url || '');
  const maxItems = Number(properties.maxItems || 3);

  useEffect(() => {
    let mounted = true;
    const fetchFeed = async () => {
        if (!url) return;
        const data = await RssService.getFeed(url);
        if (mounted && data) {
            setFeed(data);
        }
    };
    
    fetchFeed();
    const interval = setInterval(fetchFeed, 15 * 60 * 1000); // 15 min refresh
    return () => {
        mounted = false;
        clearInterval(interval);
    };
  }, [url]);

  const items = feed?.items.slice(0, maxItems) || [];
  
  if (!url) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-surface border border-surface-highlight rounded-lg text-text-muted text-xs">
            Enter RSS Feed URL
        </div>
      );
  }

  return (
      <div className="w-full h-full bg-surface overflow-hidden flex flex-col rounded-lg border border-surface-highlight shadow-2xl">
        <div className="bg-gradient-to-r from-orange-600 to-orange-400 p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rss size={14} className="text-white" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest truncate">{feed?.title || 'Live News'}</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-white/30 animate-pulse" />
        </div>
        <div className="p-3 space-y-3 flex-1 bg-background/50 overflow-hidden relative">
          {items.length === 0 ? (
              <div className="text-[10px] text-text-muted text-center mt-4">Loading feed...</div>
          ) : (
              items.map((item, i) => (
                <div key={i} className="border-b border-surface-highlight pb-2 last:border-0 group">
                  <div className="text-[10px] font-bold text-text group-hover:text-primary transition-colors line-clamp-1">{item.title}</div>
                  <div className="text-[8px] text-text-muted mt-0.5 line-clamp-2 opacity-60">{item.contentSnippet}</div>
                </div>
              ))
          )}
        </div>
      </div>
  );
};

const StockTickerTile = ({ properties }: { properties: SpecialTileProperties }) => {
  const symbols = properties.symbols || ['AAPL', 'GOOGL', 'MSFT'];
  const showChange = properties.showChange !== false;
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const symbolsJson = JSON.stringify(symbols);

  useEffect(() => {
    let mounted = true;
    // Parse symbols from JSON to avoid dependency on mutable array
    const parsedSymbols = JSON.parse(symbolsJson) as string[];
    
    const fetchStocks = async () => {
      const data = await StockService.getQuotes(parsedSymbols);
      if (mounted) {
        setQuotes(data);
      }
    };
    
    fetchStocks();
    const interval = setInterval(fetchStocks, 60000); // 1 min refresh
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [symbolsJson]);

  // Use quotes if available, otherwise fallback to symbols with placeholders to avoid layout jump
  const displayItems = quotes.length > 0 ? quotes : symbols.map(s => ({ symbol: s, price: 0, change: 0, percentChange: 0 }));

  return (
    <div className="w-full h-full bg-black text-green-500 flex items-center px-4 font-mono text-sm overflow-hidden whitespace-nowrap">
      <div className="flex gap-6 animate-marquee-stock">
        {displayItems.map((item: StockQuote | { symbol: string; price: number; change: number; percentChange: number }, i: number) => {
           const isQuote = typeof item.price === 'number';
           const price = isQuote ? item.price : 0;
           const change = isQuote ? item.percentChange : 0;
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           const symbol = isQuote ? item.symbol : (item as any).symbol || item;
           
           return (
            <span key={i} className="flex gap-2">
              <span className="text-white font-bold">{symbol}</span>
              <span>${price.toFixed(2)}</span>
              {showChange && (
                <span className={change >= 0 ? "text-green-400" : "text-red-400"}>
                  {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                </span>
              )}
            </span>
           );
        })}
      </div>
      <style>{`
        @keyframes marquee-stock {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee-stock {
          animation: marquee-stock 20s linear infinite;
          display: flex;
          min-width: 100%;
        }
      `}</style>
    </div>
  );
};

const SocialFeedTile = ({ properties }: { properties: InteractiveTileProperties }) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const platform = String(properties.platform || 'Instagram');
  const account = String(properties.account || '');

  useEffect(() => {
    let mounted = true;
    const fetchFeed = async () => {
      if (!account) return;
      const data = await SocialService.getFeed(platform, account);
      if (mounted) {
        setPosts(data);
      }
    };

    fetchFeed();
    const interval = setInterval(fetchFeed, 15 * 60 * 1000); // 15 min refresh
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [platform, account]);

  if (!account) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-surface border border-surface-highlight rounded-lg text-text-muted text-xs">
            Enter Account Handle
        </div>
      );
  }

  return (
      <div className="w-full h-full bg-surface border border-surface-highlight rounded-xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-2 border-b border-surface-highlight bg-black/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">@</div>
            <span className="text-[10px] font-black uppercase tracking-widest">{platform}</span>
          </div>
          <div className="flex items-center gap-1">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
             <div className="text-[8px] font-bold text-text-muted">LIVE</div>
          </div>
        </div>
        <div className="flex-1 p-2 grid grid-cols-2 gap-1 overflow-y-auto scrollbar-hide content-start">
          {posts.length === 0 ? (
             <div className="col-span-2 text-[10px] text-text-muted text-center py-4">
                {account ? 'Loading posts...' : 'Enter handle to view feed'}
             </div>
          ) : (
             posts.map((post) => (
               <div key={post.id} className="aspect-square bg-black rounded-md overflow-hidden relative group">
                 {post.mediaType === 'VIDEO' ? (
                    <video src={post.mediaUrl} className="w-full h-full object-cover" muted loop playsInline />
                 ) : (
                    <img src={post.thumbnailUrl || post.mediaUrl} alt={post.caption} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                 )}
                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-1">
                    <p className="text-[8px] text-white line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">{post.caption}</p>
                 </div>
               </div>
             ))
          )}
        </div>
      </div>
  );
};

const FormTile = ({ properties, tileId, isEditor }: { properties: InteractiveTileProperties, tileId?: string, isEditor?: boolean }) => {
  const instanceId = useId();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fields = properties.fields || [
    { id: 'name', type: 'text', label: 'Name', placeholder: 'Enter Name…', required: true },
    { id: 'email', type: 'email', label: 'Email', placeholder: 'Enter Email…', required: true }
  ];
  const title = String(properties.title || 'Contact Us');
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isEditor || submitting) return;
    if (!tileId) { setError('This form is not connected yet.'); return; }
    const missing = fields.filter(f => f.required && !formData[f.id]?.trim());
    if (missing.length) { setError(`Please complete: ${missing.map(f => f.label).join(', ')}`); return; }
    setSubmitting(true); setError(null);
    try {
      const result = await FormService.submitForm(tileId, formData, properties.title);
      if (!result.success) throw new Error(result.message || 'Could not send your response. Try again.');
      setSuccess(true); setFormData({});
    } catch { setError('Could not send your response. Your entries are still here. Try again.'); }
    finally { setSubmitting(false); }
  };
  return <form aria-label={title} onSubmit={handleSubmit} aria-busy={submitting} className="w-full h-full p-4 space-y-3 bg-surface rounded-lg border border-surface-highlight flex flex-col overflow-y-auto">
    <h3 className="font-bold text-base text-text">{title}</h3>
    {success ? <div><InlineFeedback message="Response sent successfully." tone="success" /><button type="button" className="ui-button ui-button-secondary" onClick={() => setSuccess(false)}>Send another response</button></div> : <>
      {fields.map((field, index) => {
        const id = `${instanceId}-${index}`;
        const common = { id, required: field.required, disabled: submitting, value: formData[field.id] || '', className: 'w-full min-h-11 bg-background border border-surface-highlight rounded px-3 py-2 text-base text-text', onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setFormData(prev => ({ ...prev, [field.id]: e.target.value })) };
        return <div key={`${field.id}-${index}`}><label htmlFor={id} className="block text-sm mb-1 text-text">{field.label}{field.required ? ' (required)' : ''}</label>
          {field.type === 'textarea' ? <textarea {...common} rows={3} placeholder={field.placeholder} /> : field.type === 'select' ? <select {...common}><option value="">{field.placeholder || `Select ${field.label}`}</option>{field.options?.map(option => <option key={option}>{option}</option>)}</select> : <input {...common} type={field.type} placeholder={field.placeholder} />}
        </div>;
      })}
      <InlineFeedback message={error} tone="error" />
      <button type="submit" disabled={submitting || isEditor} className="ui-button ui-button-primary">{submitting ? 'Sending…' : properties.actionButton?.text || 'Submit Request'}</button>
      {isEditor && <p className="text-sm text-text-secondary">Form preview. Responses can only be sent from the player.</p>}
    </>}
  </form>;
};

const BarChartTile = ({ properties }: { properties: ChartProperties }) => {
  const { data, loading, error } = useDataTile(properties, 'chart');
  const chartData = (data as ChartData) || properties.data || [];
  
  if (loading) return <div className="w-full h-full flex items-center justify-center text-xs text-text-muted animate-pulse">Loading Data...</div>;
  if (error) return <div className="w-full h-full flex items-center justify-center text-xs text-red-500">{error}</div>;
  if (!chartData || chartData.length === 0) return <div className="w-full h-full flex items-center justify-center text-xs text-text-muted opacity-50">No Data</div>;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 50 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis dataKey="name" hide />
          <YAxis hide />
          <RechartsTooltip 
            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', fontSize: '12px' }}
            itemStyle={{ color: '#f3f4f6' }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Bar dataKey="value" fill={properties.color || '#EA580C'} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const LineChartTile = ({ properties }: { properties: ChartProperties }) => {
  const { data, loading, error } = useDataTile(properties, 'chart');
  const chartData = (data as ChartData) || properties.data || [];

  if (loading) return <div className="w-full h-full flex items-center justify-center text-xs text-text-muted animate-pulse">Loading Data...</div>;
  if (error) return <div className="w-full h-full flex items-center justify-center text-xs text-red-500">{error}</div>;
  if (!chartData || chartData.length === 0) return <div className="w-full h-full flex items-center justify-center text-xs text-text-muted opacity-50">No Data</div>;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 50 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis dataKey="name" hide />
          <YAxis hide />
          <RechartsTooltip 
            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', fontSize: '12px' }}
            itemStyle={{ color: '#f3f4f6' }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Line type="monotone" dataKey="value" stroke={properties.color || '#EA580C'} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const PieChartTile = ({ properties }: { properties: PieChartProperties }) => {
  const { data, loading, error } = useDataTile(properties, 'chart');
  const chartData = (data as ChartData) || properties.data || [];

  if (loading) return <div className="w-full h-full flex items-center justify-center text-xs text-text-muted animate-pulse">Loading Data...</div>;
  if (error) return <div className="w-full h-full flex items-center justify-center text-xs text-red-500">{error}</div>;
  if (!chartData || chartData.length === 0) return <div className="w-full h-full flex items-center justify-center text-xs text-text-muted opacity-50">No Data</div>;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 50 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie 
            data={chartData} 
            innerRadius={Number(properties.innerRadius || 0)} 
            outerRadius="80%" 
            dataKey="value" 
            fill="#8884d8"
            paddingAngle={2}
          >
            {chartData.map((_: unknown, i: number) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <RechartsTooltip 
            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', fontSize: '12px' }}
            itemStyle={{ color: '#f3f4f6' }}
            labelStyle={{ color: '#9ca3af' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const SparklineTile = ({ properties }: { properties: SparklineProperties }) => {
  const { data, loading, error } = useDataTile(properties, 'chart');
  const rawData = (data as ChartData) || (properties.data as unknown as number[])?.map((v, i) => ({ name: String(i), value: v })) || [];
  
  // Normalize data for Sparkline which might receive simple number array or object array
  const finalData = Array.isArray(rawData) && typeof rawData[0] === 'number' 
    ? (rawData as unknown as number[]).map((v, i) => ({ name: String(i), value: v }))
    : rawData as ChartData;

  if (loading) return <div className="w-full h-full flex items-center justify-center text-xs text-text-muted animate-pulse">Loading...</div>;
  if (error) return <div className="w-full h-full flex items-center justify-center text-xs text-red-500">Error</div>;
  if (!finalData || finalData.length === 0) return <div className="w-full h-full flex items-center justify-center text-xs text-text-muted opacity-50">No Data</div>;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 50 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={finalData}>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={String(properties.color || "#EA580C")} 
            fill={String(properties.color || "#EA580C")} 
            fillOpacity={properties.showArea !== false ? 0.3 : 0} 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const HeatmapTile = ({ properties }: { properties: HeatmapProperties }) => {
  const { data, loading, error } = useDataTile(properties, 'heatmap');
  const heatmapData = (data as HeatmapData) || properties.data || [];
  const lowColor = String(properties.lowColor || '#ffffff');
  const highColor = String(properties.highColor || '#EA580C');

  if (loading) return <div className="w-full h-full flex items-center justify-center text-xs text-text-muted animate-pulse">Loading...</div>;
  if (error) return <div className="w-full h-full flex items-center justify-center text-xs text-red-500">Error</div>;
  if (!heatmapData || heatmapData.length === 0) return <div className="w-full h-full flex items-center justify-center text-xs text-text-muted opacity-50">No Data</div>;

  return (
    <div className="w-full h-full grid gap-1 p-1 bg-black/10 rounded-lg" style={{ gridTemplateColumns: `repeat(${heatmapData[0]?.length || 1}, 1fr)` }}>
      {heatmapData.flat().map((v: number, i: number) => (
        <div 
            key={i} 
            className="w-full h-full rounded-sm shadow-sm transition-all hover:scale-110 cursor-pointer" 
            style={{ 
                backgroundColor: v > 50 ? highColor : lowColor, 
                opacity: Math.max(0.2, v / 100) 
            }}
            title={String(v)}
        />
      ))}
    </div>
  );
};

const ButtonTile = ({ tile, isEditor }: { tile: TileInstance, isEditor?: boolean }) => {
  const { getHandlers } = useTileInteractions(tile, !!isEditor);
  const handlers = getHandlers();
  
  // Legacy support for actionType/actionValue if interactions are missing
  const handleLegacyClick = () => {
    if (isEditor) return;
    const { actionType, actionValue } = tile.properties as InteractiveTileProperties;
    
    if (actionType === 'link' && actionValue) {
      window.open(actionValue, '_blank');
    } else if (actionType === 'navigate' && actionValue) {
      window.dispatchEvent(new CustomEvent('player-navigate', { 
        detail: { slideId: actionValue } 
      }));
    } else if (actionType === 'trigger' && actionValue) {
      window.dispatchEvent(new CustomEvent('player-trigger', {
        detail: { triggerName: actionValue }
      }));
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (handlers.onClick) handlers.onClick(e);
    handleLegacyClick();
    e.stopPropagation();
  };

  const p = tile.properties as InteractiveTileProperties;
  const bgColor = String(p.backgroundColor || '#00C49F');
  const textColor = String(p.textColor || '#fff');
  const radius = Number(p.borderRadius ?? 4);
  const text = String(p.text || 'Button');

  return (
    <div className={`w-full h-full flex items-center justify-center ${isEditor ? '' : 'pointer-events-auto'}`}>
      <button 
        onClick={handleClick}
        onMouseEnter={handlers.onMouseEnter}
        onMouseLeave={handlers.onMouseLeave}
        className="transition-transform active:scale-95 shadow-md hover:shadow-lg w-full h-full"
        style={{ 
          backgroundColor: bgColor, 
          color: textColor, 
          borderRadius: `${radius}px`, 
          border: 'none',
          cursor: isEditor ? 'default' : 'pointer',
          pointerEvents: isEditor ? 'none' : undefined
        }}
      >
        {text}
      </button>
    </div>
  );
};

const TableTile = ({ properties }: { properties: TableTileProperties }) => {
  const { data, loading, error } = useDataTile(properties, 'table');
  const tableData = (data as TableData) || properties.data || [];
  const headers = properties.headers || [];

  if (loading) return <div className="w-full h-full flex items-center justify-center text-xs text-text-muted animate-pulse">Loading...</div>;
  if (error) return <div className="w-full h-full flex items-center justify-center text-xs text-red-500">Error</div>;
  if (!tableData || tableData.length === 0) return <div className="w-full h-full flex items-center justify-center text-xs text-text-muted opacity-50">No Data</div>;

  return (
    <div className="w-full h-full overflow-hidden bg-surface rounded-lg border border-surface-highlight shadow-xl flex flex-col">
      <div className="overflow-auto custom-scrollbar w-full h-full">
        <table className="w-full text-[10px] border-collapse">
          {headers.length > 0 && (
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="bg-black/20">
                {headers.map((h, i) => (
                  <th key={i} className="p-2 text-left font-black text-primary uppercase tracking-widest border-b border-surface-highlight">{h}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="text-text">
            {tableData.map((row: (string | number)[], i: number) => (
              <tr key={i} className="border-b border-surface-highlight/50 last:border-0 hover:bg-white/5 transition-colors">
                {row.map((cell: (string | number), j: number) => (
                  <td key={j} className="p-2 font-medium">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TimelineTile = ({ properties }: { properties: TimelineProperties }) => {
  const { data, loading, error } = useDataTile(properties, 'timeline');
  const events = (data as TimelineData) || properties.events || [];

  if (loading) return <div className="w-full h-full flex items-center justify-center text-xs text-text-muted animate-pulse">Loading...</div>;
  if (error) return <div className="w-full h-full flex items-center justify-center text-xs text-red-500">Error</div>;
  if (!events || events.length === 0) return <div className="w-full h-full flex items-center justify-center text-xs text-text-muted opacity-50">No Data</div>;

  return (
    <div className="w-full h-full p-4 space-y-4 overflow-y-auto custom-scrollbar bg-surface rounded-lg border border-surface-highlight shadow-xl">
      {properties.title && (
          <div className="font-black text-xs text-primary uppercase tracking-[0.2em] mb-4 border-b border-surface-highlight pb-2">{properties.title}</div>
      )}
      {events.map((e: { time: string; title: string }, i: number) => (
        <div key={i} className="flex gap-4 relative group">
          {i !== events.length - 1 && <div className="absolute left-[31px] top-6 bottom-[-16px] w-0.5 bg-primary/20" />}
          <div className="text-[9px] font-black text-text-muted w-16 pt-1 text-right tabular-nums">{e.time}</div>
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-primary border-4 border-surface z-10 relative group-hover:scale-125 transition-transform shadow-[0_0_10px_rgba(234,88,12,0.5)]" />
          </div>
          <div className="flex-1 pb-4">
            <div className="text-[10px] font-bold text-text group-hover:text-primary transition-colors leading-tight">{e.title}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const VideoTile = ({ properties, isEditor }: { properties: VideoTileProperties; isEditor: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceId = useId();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const directionRef = useRef<'forward' | 'backward'>('forward');
  const isPlayingRef = useRef<boolean>(!!properties.autoplay);
  const [scheduleTick, setScheduleTick] = useState(0);

  const mediaSchedule: MediaSchedule = {
    enabled: !!properties.scheduleEnabled,
    startTime: properties.scheduleStart || '00:00',
    endTime: properties.scheduleEnd || '23:59',
    daysOfWeek: properties.scheduleDays || [0,1,2,3,4,5,6],
  };
  const scheduleActive = isScheduleActive(mediaSchedule, new Date());
  void scheduleTick;

  useEffect(() => {
    const timer = setInterval(() => setScheduleTick(value => value + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const wantsPlayback = !isEditor && !!properties.autoplay && scheduleActive;
    return audioExperienceCoordinator.registerSource({
      id: `video:${sourceId}`,
      kind: 'video',
      priority: properties.priority ?? 50,
      volume: properties.volume ?? 100,
      duckBackground: properties.duckBackground ?? true,
      wantsPlayback: wantsPlayback && !properties.muted,
      applyGain: gain => { video.volume = Math.max(0, Math.min(1, gain)); },
      applyAllowed: allowed => { video.muted = isEditor || !!properties.muted || !allowed; },
    });
  }, [sourceId, isEditor, properties.autoplay, properties.muted, properties.priority, properties.volume, properties.duckBackground, scheduleActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    isPlayingRef.current = !isEditor && !!properties.autoplay && scheduleActive;
    directionRef.current = properties.reverse ? 'backward' : 'forward';
    const startAt = Math.max(0, properties.startTime ?? 0);
    const seekToStart = () => { if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = Math.min(startAt, Math.max(0, video.duration - 0.05)); else video.currentTime = startAt; };
    const onPlay = () => { isPlayingRef.current = true; };
    const onPause = () => { isPlayingRef.current = false; };
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    const handlePlayback = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      seekToStart();
      if (!properties.bounce && !properties.reverse) {
        video.playbackRate = 1;
        if (!isEditor && properties.autoplay && scheduleActive) video.play().catch(() => undefined);
        else video.pause();
        return;
      }
      video.pause();
      const step = 0.05;
      intervalRef.current = setInterval(() => {
        if (!isPlayingRef.current || !scheduleActive) return;
        let nextTime = video.currentTime;
        if (directionRef.current === 'forward') {
          nextTime += step;
          if (nextTime >= video.duration) {
            if (properties.bounce) { nextTime = video.duration; directionRef.current = 'backward'; }
            else if (properties.loop && !properties.oneShot) nextTime = startAt;
            else { nextTime = video.duration; isPlayingRef.current = false; }
          }
        } else {
          nextTime -= step;
          if (nextTime <= startAt) {
            if (properties.bounce) { nextTime = startAt; directionRef.current = 'forward'; }
            else if (properties.loop && !properties.oneShot) nextTime = video.duration;
            else { nextTime = startAt; isPlayingRef.current = false; }
          }
        }
        video.currentTime = Math.max(0, nextTime);
      }, 50);
    };
    video.addEventListener('loadedmetadata', handlePlayback);
    if (video.readyState >= 1) handlePlayback();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      video.removeEventListener('loadedmetadata', handlePlayback);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [properties.url, properties.bounce, properties.reverse, properties.autoplay, properties.loop, properties.oneShot, properties.startTime, isEditor, scheduleActive]);

  return <div className="w-full h-full bg-black overflow-hidden">{properties.url ? <video ref={videoRef} src={String(properties.url)} className="w-full h-full object-cover" muted={true} controls={!!properties.controls && !isEditor} loop={!!properties.loop && !properties.oneShot && !properties.bounce && !properties.reverse} autoPlay={false} playsInline /> : <div className="w-full h-full flex items-center justify-center text-text-muted"><Video size={24} /></div>}</div>;
};

const AudioIndicatorTile = ({ properties, isEditor }: { properties: AudioTileProperties; isEditor: boolean }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceId = useId();
  const [scheduleTick, setScheduleTick] = useState(0);
  const [status, setStatus] = useState<'idle' | 'playing' | 'blocked'>('idle');
  const schedule: MediaSchedule = { enabled: !!properties.scheduleEnabled, startTime: properties.scheduleStart || '00:00', endTime: properties.scheduleEnd || '23:59', daysOfWeek: properties.scheduleDays || [0,1,2,3,4,5,6] };
  const scheduleActive = isScheduleActive(schedule, new Date());
  void scheduleTick;

  useEffect(() => { const timer = setInterval(() => setScheduleTick(value => value + 1), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const wantsPlayback = !isEditor && !!properties.autoplay && scheduleActive;
    return audioExperienceCoordinator.registerSource({
      id: `audio:${sourceId}`,
      kind: 'audio',
      priority: properties.priority ?? 60,
      volume: properties.volume ?? 100,
      duckBackground: properties.duckBackground ?? true,
      wantsPlayback,
      applyGain: gain => { audio.volume = Math.max(0, Math.min(1, gain)); },
      applyAllowed: allowed => { audio.muted = !allowed; },
    });
  }, [sourceId, isEditor, properties.autoplay, properties.priority, properties.volume, properties.duckBackground, scheduleActive]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = !!properties.loop && !properties.oneShot;
    const seek = () => { const start = Math.max(0, properties.startTime ?? 0); if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Math.min(start, Math.max(0, audio.duration - 0.05)); else audio.currentTime = start; };
    if (audio.readyState >= 1) seek(); else audio.addEventListener('loadedmetadata', seek, { once: true });
    if (!isEditor && properties.autoplay && scheduleActive) audio.play().then(() => setStatus('playing')).catch(() => setStatus('blocked'));
    else { audio.pause(); }
  }, [properties.url, properties.startTime, properties.loop, properties.oneShot, properties.autoplay, isEditor, scheduleActive]);

  return <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-surface gap-2"><audio ref={audioRef} src={String(properties.url || '')} controls={!!properties.controls} onPlay={() => setStatus('playing')} onPause={() => setStatus('idle')} onEnded={() => setStatus('idle')} className={properties.controls ? 'w-full' : 'hidden'} /><div className={properties.showIndicator === false ? 'hidden' : 'flex flex-col items-center gap-1 text-center'}><Volume2 size={28} className="text-primary" /><strong className="text-xs text-text">{properties.trackName || 'Audio'}</strong><span className="text-[10px] text-text-muted">{isEditor ? 'Slide-bound audio' : status === 'blocked' ? 'Audio blocked — interact with player to enable' : status === 'playing' ? 'Playing' : scheduleActive ? 'Ready' : 'Outside schedule'}</span></div></div>;
};

const CalendarTile = ({ properties }: { properties: SpecialTileProperties }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bgImage, setBgImage] = useState<string>('');
  const url = properties.calendarUrl || properties.url;
  const view = properties.view || 'month';
  const bgFolder = properties.backgroundFolderName;

  useEffect(() => {
    let mounted = true;
    const fetchEvents = async () => {
      if (!url) return;
      const data = await CalendarService.getEvents(url);
      if (mounted) {
        setEvents(data);
      }
    };
    fetchEvents();
    // Refresh every 15 minutes
    const interval = setInterval(fetchEvents, 15 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [url]);

  // Background Rotation Logic
  useEffect(() => {
    if (!bgFolder) {
      const tid = window.setTimeout(() => setBgImage(''), 0);
      return () => window.clearTimeout(tid);
    }

    let mounted = true;
    let cleanup: (() => void) | undefined;

    const initBackgrounds = async () => {
      try {
        const files = await StorageService.listFiles(bgFolder);
        const images = files.filter(f => f.contentType?.startsWith('image/'));
        
        if (images.length === 0) return;

        let idx = 0;
        // Set initial
        if (mounted) setBgImage(images[0].url);

        if (images.length > 1) {
          const intervalId = setInterval(() => {
            idx = (idx + 1) % images.length;
            if (mounted) setBgImage(images[idx].url);
          }, 10000); // 10 seconds rotation
          cleanup = () => clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Failed to load calendar backgrounds", err);
      }
    };

    initBackgrounds();

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, [bgFolder]);

  // Update current date periodically to keep "today" accurate
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getEventsForDay = (date: Date) => {
    return events.filter(e => {
      const start = new Date(e.start);
      return start.getDate() === date.getDate() && 
             start.getMonth() === date.getMonth() && 
             start.getFullYear() === date.getFullYear();
    });
  };

  const monthName = currentDate.toLocaleDateString([], { month: 'long' });
  const year = currentDate.getFullYear();

  const renderMonthView = () => {
    // Logic to fill empty days at start of month
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    
    const blanks = Array.from({ length: startingDayOfWeek });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="grid grid-cols-7 gap-1 flex-1 content-start overflow-y-auto custom-scrollbar">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={`h-${i}`} className="text-[8px] font-black text-center text-text-muted opacity-50">{d}</div>
        ))}
        {blanks.map((_, i) => <div key={`b-${i}`} />)}
        {days.map(d => {
           const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
           const dayEvents = getEventsForDay(date);
           const isToday = d === currentDate.getDate();
           
           return (
            <div key={`d-${d}`} className={`relative aspect-square text-[10px] flex flex-col items-center justify-center rounded-sm transition-colors ${isToday ? 'bg-primary text-white font-bold shadow-sm' : 'hover:bg-white/5 bg-surface-highlight/10'}`}>
              <span>{d}</span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((_, i) => (
                    <div key={i} className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-primary'}`} />
                  ))}
                </div>
              )}
            </div>
           );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    // Get start of week (Sunday)
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });

    return (
      <div className="grid grid-cols-7 gap-1 h-full">
         {weekDays.map((d, i) => {
           const isToday = d.getDate() === currentDate.getDate() && d.getMonth() === currentDate.getMonth();
           const dayEvents = getEventsForDay(d);
           
           return (
             <div key={i} className={`flex flex-col h-full rounded border ${isToday ? 'border-primary bg-primary/5' : 'border-surface-highlight bg-surface/50'}`}>
               <div className={`text-[8px] font-bold text-center p-1 uppercase border-b ${isToday ? 'bg-primary text-white' : 'bg-surface-highlight/30 text-text-muted'}`}>
                 {d.toLocaleDateString([], { weekday: 'short' }).slice(0, 1)} {d.getDate()}
               </div>
               <div className="flex-1 p-1 overflow-y-auto custom-scrollbar space-y-1">
                 {dayEvents.map(e => (
                   <div key={e.id} className="text-[6px] bg-white/10 p-1 rounded border-l-2 border-primary truncate" title={`${e.title} (${e.start.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})})`}>
                     {e.start.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} {e.title}
                   </div>
                 ))}
                 {dayEvents.length === 0 && <div className="text-[6px] text-text-muted text-center mt-2">-</div>}
               </div>
             </div>
           );
         })}
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = getEventsForDay(currentDate);

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-surface/30">
        {hours.map(h => (
          <div key={h} className="min-h-[40px] border-b border-surface-highlight flex relative">
            <div className="w-10 text-[8px] text-text-muted p-1 text-right border-r border-surface-highlight sticky left-0 bg-surface/90 backdrop-blur-sm z-10">
              {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`}
            </div>
            <div className="flex-1 relative p-0.5">
               {dayEvents.filter(e => e.start.getHours() === h).map(e => (
                 <div key={e.id} className="bg-primary/20 border-l-2 border-primary rounded p-1 mb-1 last:mb-0">
                   <div className="text-[8px] font-bold text-text truncate">{e.title}</div>
                   <div className="text-[6px] text-text-muted">{e.start.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})} - {e.end.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</div>
                 </div>
               ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAgendaView = () => {
    const upcomingEvents = events
      .filter(e => e.start >= new Date())
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 5); // Show next 5 events

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 relative z-10">
        {upcomingEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-text-muted">No upcoming events</div>
        ) : (
          upcomingEvents.map(e => (
            <div key={e.id} className="flex gap-3 p-3 rounded bg-surface/90 border border-surface-highlight hover:border-primary transition-colors shadow-sm backdrop-blur-sm">
              <div className="flex flex-col items-center justify-center min-w-[50px] border-r border-surface-highlight pr-3">
                <div className="text-[10px] font-bold text-red-500 uppercase">{e.start.toLocaleDateString([], { month: 'short' })}</div>
                <div className="text-xl font-black text-text">{e.start.getDate()}</div>
                <div className="text-[8px] text-text-muted">{e.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col justify-center">
                <div className="text-sm font-bold truncate text-text">{e.title}</div>
                {e.location && <div className="text-[10px] text-text-muted flex items-center gap-1 truncate mt-0.5"><MapPin size={10} /> {e.location}</div>}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full p-3 bg-surface text-text flex flex-col rounded-lg border border-surface-highlight overflow-hidden shadow-xl relative">
      {/* Background Image Layer */}
      {bgImage && (
        <div className="absolute inset-0 z-0">
          <img src={bgImage} alt="" className="w-full h-full object-cover opacity-30 transition-opacity duration-1000" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/80 to-surface/50" />
        </div>
      )}

      <div className="flex justify-between items-center mb-3 border-b border-surface-highlight pb-2 relative z-10">
        <div className="font-black text-sm uppercase tracking-tighter text-primary">
          {view === 'day' ? currentDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : 
           view === 'agenda' ? 'Upcoming Events' : `${monthName} ${year}`}
        </div>
        <div className="flex gap-1">
          {['month', 'week', 'day', 'agenda'].map(v => (
             <div key={v} className={`w-1.5 h-1.5 rounded-full ${view === v ? 'bg-primary animate-pulse' : 'bg-surface-highlight'}`} />
          ))}
        </div>
      </div>
      
      <div className="relative z-10 flex-1 overflow-hidden flex flex-col">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
        {view === 'agenda' && renderAgendaView()}
      </div>
      
      {!url && <div className="absolute inset-x-0 bottom-0 bg-black/80 text-[8px] text-white text-center py-1 z-20">No Calendar URL Configured</div>}
    </div>
  );
};

const TileContentInner = ({ tile, isEditor = false, screenId, orgId }: TileContentProps) => {
  const properties = tile.properties || {};
  const styleProps = properties as Partial<BaseTextProperties>;
  
  const commonTextStyle: CSSProperties = {
    fontSize: typeof styleProps.fontSize === 'number' ? `${styleProps.fontSize}px` : '24px',
    fontWeight: styleProps.fontWeight || 400,
    color: styleProps.fontColor || '#ffffff',
    textAlign: styleProps.textAlign || 'left',
    lineHeight: styleProps.lineHeight || 1.2,
    letterSpacing: typeof styleProps.letterSpacing === 'number' ? `${styleProps.letterSpacing}px` : 'normal',
    fontFamily: styleProps.fontFamily || 'Inter, sans-serif',
    textTransform: (styleProps.textTransform as CSSProperties['textTransform']) || 'none',
    textDecoration: (styleProps.textDecoration as CSSProperties['textDecoration']) || 'none',
    textShadow: styleProps.textShadow ? `${styleProps.textShadow.offsetX || 0}px ${styleProps.textShadow.offsetY || 0}px ${styleProps.textShadow.blur || 0}px ${styleProps.textShadow.color || 'transparent'}` : 'none',
    backgroundColor: styleProps.backgroundColor || 'transparent',
    border: styleProps.borderWidth ? `${styleProps.borderWidth}px solid ${styleProps.borderColor || '#ffffff'}` : 'none',
    borderRadius: styleProps.borderRadius ? `${styleProps.borderRadius}px` : '0',
    padding: styleProps.padding ? `${styleProps.padding}px` : '0',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  // 1-10: Text Tiles
  if (tile.type === 'text') {
    const p = properties as TextTileProperties;
    return <div style={{ ...commonTextStyle, whiteSpace: 'pre-wrap' }}>{String(p.content || 'Text Tile')}</div>;
  }
  if (tile.type === 'dynamic_text') {
    const p = properties as DynamicTextProperties;
    return <DynamicTextTile properties={p} commonTextStyle={commonTextStyle} isEditor={isEditor} />;
  }
  if (tile.type === 'scrolling_text') {
    const p = properties as ScrollingTextProperties;
    const speed = p.scrollSpeed || 50;
    const direction = p.scrollDirection || 'left';
    const loop = p.loop !== false ? 'infinite' : '1';
    const bounce = p.bounce ? 'alternate' : 'normal';
    const hoverPause = p.pauseOnHover ? 'hover:pause-scroll' : '';
    
    const isVertical = direction === 'up' || direction === 'down';
    
    return (
      <div style={{ ...commonTextStyle, justifyContent: 'center', alignItems: 'center' }}>
        <div className={`w-full overflow-hidden ${isVertical ? 'h-full flex flex-col justify-center' : 'whitespace-nowrap'} ${hoverPause}`}>
          <div style={{ 
            display: isVertical ? 'block' : 'inline-block', 
            animation: `scroll-${direction} ${100/speed}s linear ${bounce} ${loop}`, 
            paddingLeft: isVertical ? 0 : '100%',
            paddingTop: isVertical ? '100%' : 0
          }}>
            {String(p.content || 'Scrolling Text...')}
          </div>
        </div>
        <style>{`
          @keyframes scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
          @keyframes scroll-right { 0% { transform: translateX(-100%); } 100% { transform: translateX(0); } }
          @keyframes scroll-up { 0% { transform: translateY(100%); } 100% { transform: translateY(-100%); } }
          @keyframes scroll-down { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
          .pause-scroll:hover > div { animation-play-state: paused; }
        `}</style>
      </div>
    );
  }
  if (tile.type === 'rich_text') {
    const p = properties as RichTextProperties;
    return <div style={{ ...commonTextStyle, display: 'block' }} dangerouslySetInnerHTML={{ __html: String(p.htmlContent || '<b>Rich</b> <i>Text</i> Content') }} />;
  }
  if (tile.type === 'marquee') {
    const p = properties as MarqueeProperties;
    const direction = p.direction || 'left';
    const speed = p.speed || 6;
    const content = String(p.content || 'Marquee Text Display');
    
    return (
      <div style={{ ...commonTextStyle, justifyContent: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <div 
          className="inline-block"
          style={{ 
            animation: `marquee-${direction} ${20 / speed}s linear infinite`,
            paddingLeft: direction === 'left' || direction === 'right' ? '100%' : '0',
          }}
        >
          {content}
        </div>
        <style>{`
          @keyframes marquee-left {
            0% { transform: translateX(0); }
            100% { transform: translateX(-200%); }
          }
          @keyframes marquee-right {
            0% { transform: translateX(-200%); }
            100% { transform: translateX(0); }
          }
          @keyframes marquee-up {
            0% { transform: translateY(100%); }
            100% { transform: translateY(-100%); }
          }
          @keyframes marquee-down {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
        `}</style>
      </div>
    );
  }
  if (tile.type === 'typewriter') {
    const p = properties as TypewriterProperties;
    return <div style={commonTextStyle}><span className="border-r-2 border-white animate-pulse pr-1">{String(p.content || 'Typewriter effect...')}</span></div>;
  }
  if (tile.type === 'word_art') {
    const p = properties as WordArtProperties;
    const effect = p.effect || 'glow';
    let effectStyle: CSSProperties = {};
    if (effect === 'glow') effectStyle = { textShadow: `0 0 10px ${p.glowColor || '#00ffff'}` };
    else if (effect === 'outline') effectStyle = { WebkitTextStroke: `1px ${p.outlineColor || '#ffffff'}`, color: 'transparent' };
    else if (effect === '3d') effectStyle = { textShadow: '2px 2px 0px #444, 4px 4px 0px #222' };
    return <div style={{ ...commonTextStyle, ...effectStyle, whiteSpace: 'pre-wrap' }}>{String(p.content || 'Word Art')}</div>;
  }
  if (tile.type === 'gradient_text') {
    const p = properties as GradientTextProperties;
    const gradient = p.gradientColors || ['#ff0080', '#ff8c00'];
    const gradientString = gradient.length > 1 ? `linear-gradient(${p.gradientAngle || 45}deg, ${gradient.join(', ')})` : gradient[0];
    return <div style={{ ...commonTextStyle, background: gradientString, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>{String(p.content || 'Gradient Text')}</div>;
  }
  if (tile.type === 'animated_text') {
    const p = properties as AnimatedTextProperties;
    return <div style={commonTextStyle}><div className={`animate-${p.animationType || 'bounce'}`} style={{ animationDuration: `${p.animationDuration || 1000}ms` }}>{String(p.content || 'Animated Text')}</div></div>;
  }
  if (tile.type === 'text_shadow') {
    const p = properties as TextShadowTileProperties;
    const shadows = p.shadows || [{ color: '#000000', blur: 4, offsetX: 2, offsetY: 2 }];
    return <div style={{ ...commonTextStyle, textShadow: shadows.map(s => `${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.color}`).join(', ') }}>{String(p.content || 'Shadow Text')}</div>;
  }

  // 11-20: Media Tiles
  if (tile.type === 'image') {
    const p = properties as ImageTileProperties;
    const filters = p.filters || {};
    const filterStr = Object.entries(filters).map(([k, v]) => `${k}(${v}${k==='blur'?'px':'%'})`).join(' ');
    return (
      <div className="w-full h-full overflow-hidden" style={{ borderRadius: `${p.borderRadius || 0}px` }}>
        {p.url ? <img src={String(p.url)} alt="" className="w-full h-full" style={{ objectFit: (p.fitMode as CSSProperties['objectFit']) || 'cover', filter: filterStr }} /> : <div className="w-full h-full flex items-center justify-center bg-black/20 text-text-muted"><ImageIcon size={24} /></div>}
      </div>
    );
  }
  if (tile.type === 'video' || tile.type === 'background_video') {
    return <VideoTile properties={properties as VideoTileProperties} isEditor={isEditor} />;
  }
  if (tile.type === 'gif') {
    const p = properties as ImageTileProperties;
    return (
      <div className="w-full h-full overflow-hidden">
        {p.url ? <img src={String(p.url)} alt="" className="w-full h-full" style={{ objectFit: (p.fitMode as CSSProperties['objectFit']) || 'contain' }} /> : <div className="w-full h-full flex items-center justify-center bg-black/20 text-text-muted">GIF</div>}
      </div>
    );
  }
  if (tile.type === 'lottie') return <div className="w-full h-full flex items-center justify-center text-text-muted"><Sparkles size={32} className="animate-pulse" /></div>;
  if (tile.type === 'audio') {
    return <AudioIndicatorTile properties={properties as AudioTileProperties} isEditor={isEditor} />;
  }
  if (tile.type === 'slideshow') {
    const p = properties as SlideshowTileProperties;
    return <SlideshowTile properties={p} />;
  }
  if (tile.type === 'webcam') return <div className="w-full h-full bg-black flex items-center justify-center text-white/50"><Video size={32} /></div>;
  if (tile.type === 'youtube' || tile.type === 'vimeo') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    const vid = String(p.videoId || '');
    const url = tile.type === 'youtube' ? `https://www.youtube.com/embed/${vid}` : `https://player.vimeo.com/video/${vid}`;
    return (
      <div className="w-full h-full bg-black">
        {vid ? <iframe title="YouTube video" src={url} width="100%" height="100%" frameBorder="0" allowFullScreen className="pointer-events-none" /> : <div className="w-full h-full flex items-center justify-center text-text-muted"><Video size={24} /></div>}
      </div>
    );
  }

  // 21-30: Data Visualization Tiles
  if (tile.type === 'bar_chart') {
    return <BarChartTile properties={properties as ChartProperties} />;
  }
  if (tile.type === 'line_chart') {
    return <LineChartTile properties={properties as ChartProperties} />;
  }
  if (tile.type === 'pie_chart') {
    return <PieChartTile properties={properties as PieChartProperties} />;
  }
  if (tile.type === 'gauge') {
    const p = properties as GaugeProperties;
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
        <div className="text-4xl font-black text-white drop-shadow-lg">{String(p.value || 0)}</div>
        <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold mt-1">of {String(p.max || 100)}</div>
        <div className="w-24 h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${(Number(p.value || 0) / Number(p.max || 100)) * 100}%` }} />
        </div>
      </div>
    );
  }
  if (tile.type === 'table') {
    return <TableTile properties={properties as TableTileProperties} />;
  }
  if (tile.type === 'kpi_card') {
    const p = properties as KPICardProperties;
    return (
      <div className="w-full h-full p-4 flex flex-col justify-center bg-surface border border-surface-highlight rounded-xl shadow-2xl relative overflow-hidden" style={{ borderColor: String(p.color || '#EA580C') }}>
        <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8" />
        <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{String(p.title || 'KPI Title')}</div>
        <div className="flex items-baseline gap-1">
          <div className="text-3xl font-black text-white">{String(p.value || 0)}</div>
          <div className="text-xs font-bold text-text-muted">{String(p.unit || '')}</div>
        </div>
        {p.change && (
          <div className={`text-[10px] font-bold mt-2 ${Number(p.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {Number(p.change) >= 0 ? '↑' : '↓'} {Math.abs(Number(p.change))}% vs last month
          </div>
        )}
      </div>
    );
  }
  if (tile.type === 'progress_bar') {
    const p = properties as ProgressBarProperties;
    return (
      <div className="w-full h-full flex flex-col justify-center p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">{String(p.label || 'Task Progress')}</div>
          <div className="text-[10px] font-black text-primary">{p.value || 0}%</div>
        </div>
        <div className="w-full bg-white/10 rounded-full h-3 shadow-inner overflow-hidden border border-white/5">
          <div className="bg-primary h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(234,88,12,0.4)]" style={{ width: `${p.value || 0}%`, backgroundColor: String(p.color || '#EA580C') }} />
        </div>
      </div>
    );
  }
  if (tile.type === 'heatmap') {
    return <HeatmapTile properties={properties as HeatmapProperties} />;
  }
  if (tile.type === 'sparklines') {
    return <SparklineTile properties={properties as SparklineProperties} />;
  }
  if (tile.type === 'timeline') {
    return <TimelineTile properties={properties as TimelineProperties} />;
  }

  // 31-40: Interactive Tiles
  if (tile.type === 'button') {
    return <ButtonTile tile={tile} isEditor={isEditor} />;
  }
  if (tile.type === 'qr_code') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return <QRCodeTile properties={p} tileId={tile.id} screenId={screenId} orgId={orgId} />;
  }
  if (tile.type === 'countdown') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return <CountdownTile properties={p} />;
  }
  if (tile.type === 'form') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return <FormTile properties={p} tileId={tile.id} isEditor={isEditor} />;
  }
  if (tile.type === 'poll') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return <PollTile properties={p} tileId={tile.id} isEditor={isEditor} />;
  }
  if (tile.type === 'social_feed') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return <SocialFeedTile properties={p} />;
  }
  if (tile.type === 'weather') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return <WeatherTile properties={p} />;
  }
  if (tile.type === 'menu_selector') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    const categories = (p.categories) || ['Breakfast', 'Lunch', 'Dinner', 'Drinks'];
    return (
      <div className="w-full h-full p-3 bg-surface/50 rounded-xl border border-surface-highlight flex flex-col gap-3 shadow-inner">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {categories.map((c: string, i: number) => (
            <div key={i} className={`text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap border transition-all ${i === 0 ? 'bg-primary text-white border-primary shadow-lg' : 'bg-background text-text-muted border-surface-highlight hover:text-text'}`}>
              {c}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 flex-1 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-background rounded-lg border border-surface-highlight p-1 flex flex-col gap-1 group overflow-hidden">
              <div className="aspect-video bg-surface-highlight/20 rounded-md overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="h-1.5 w-2/3 bg-surface-highlight/30 rounded mt-1" />
              <div className="h-1 w-1/2 bg-surface-highlight/20 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (tile.type === 'promotion_banner') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    const title = String(p.title || 'Flash Sale');
    const desc = String(p.description || 'Get 20% off all orders today only.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const btnText = String(((p.actionButton as any) || {}).text || 'Claim Now');
    return (
      <div className="w-full h-full bg-gradient-to-br from-orange-600 to-red-600 p-4 flex flex-col justify-center text-white rounded-xl shadow-2xl relative overflow-hidden group">
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
        <div className="absolute top-2 right-3 font-black text-[8px] opacity-50 uppercase tracking-widest">Limited Offer</div>
        <div className="text-2xl font-black italic uppercase leading-tight mb-1 drop-shadow-lg">{title}</div>
        <div className="text-[10px] opacity-90 mb-4 line-clamp-2 leading-relaxed">{desc}</div>
        <button className="bg-white text-orange-600 text-[10px] font-black px-4 py-2 rounded-lg shadow-xl uppercase tracking-wider self-start transform group-hover:scale-105 transition-transform">
          {btnText}
        </button>
      </div>
    );
  }
  if (tile.type === 'loyalty_card') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    const name = String(p.memberName || 'Jonathan Holman');
    const points = Number(p.points || 1250);
    const progress = Number(p.progress || 0.6);
    return (
      <div className="w-full h-full p-4 bg-slate-900 rounded-2xl border border-white/10 flex flex-col justify-between shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-3xl" />
        <div className="flex justify-between items-start relative z-10">
          <div className="flex flex-col">
            <div className="text-[8px] font-bold text-primary uppercase tracking-[0.2em] mb-1">Elite Rewards</div>
            <div className="text-sm font-black text-white">{name}</div>
          </div>
          <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center border border-white/10"><Sparkles size={16} className="text-primary" /></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-end mb-2">
            <div className="flex flex-col">
              <div className="text-2xl font-black text-white leading-none">{points.toLocaleString()}</div>
              <div className="text-[8px] font-bold text-text-muted uppercase tracking-widest mt-1">Available Points</div>
            </div>
            <div className="text-[10px] font-black text-primary">Gold Level</div>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <div className="text-[7px] font-bold text-text-muted uppercase">Next Reward: 2,000 pts</div>
            <div className="text-[7px] font-black text-white">{Math.round(progress * 100)}%</div>
          </div>
        </div>
      </div>
    );
  }

  // 41-50: Layout Tiles
  if (tile.type === 'container') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return (
      <div className="w-full h-full" style={{ backgroundColor: String(p.backgroundColor || 'transparent'), backgroundImage: p.backgroundImageUrl ? `url(${String(p.backgroundImageUrl)})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', border: `${p.borderWidth || 1}px solid ${p.borderColor || '#374151'}`, borderRadius: `${p.borderRadius || 0}px`, padding: `${p.padding || 0}px` }}>
        {!p.backgroundImageUrl && !p.backgroundColor && <div className="w-full h-full border border-dashed border-white/10 flex items-center justify-center text-[10px] opacity-30 text-white">Container</div>}
      </div>
    );
  }
  if (tile.type === 'divider') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return <div className="w-full h-full flex items-center justify-center"><div style={{ width: p.orientation === 'vertical' ? String(p.thickness || 2)+'px' : '100%', height: p.orientation === 'vertical' ? '100%' : String(p.thickness || 2)+'px', backgroundColor: String(p.color || '#374151') }} /></div>;
  }
  if (tile.type === 'grid') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return <div className="w-full h-full grid gap-1 p-1" style={{ gridTemplateColumns: `repeat(${Number(p.columns || 2)}, 1fr)`, gridTemplateRows: `repeat(${Number(p.rows || 2)}, 1fr)` }}>{Array.from({ length: Number(p.rows || 2) * Number(p.columns || 2) }).map((_, i) => <div key={i} className="border border-dashed border-white/10" />)}</div>;
  }
  if (tile.type === 'flex') {
    const p = properties as LayoutTileProperties;
    return (
      <div 
        className="w-full h-full flex gap-1 p-1" 
        style={{ 
          flexDirection: p.orientation === 'vertical' ? 'column' : (p.direction as CSSProperties['flexDirection']) || 'row', 
          justifyContent: (p.justifyContent as CSSProperties['justifyContent']) || 'center', 
          alignItems: (p.alignItems as CSSProperties['alignItems']) || 'start' 
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-8 h-8 border border-dashed border-white/10" />
        ))}
      </div>
    );
  }
  if (tile.type === 'tabs') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    const tabs = (p.tabs) || ['Tab 1', 'Tab 2'];
    return (
      <div className="w-full h-full bg-surface border border-surface-highlight rounded overflow-hidden flex flex-col">
        <div className="flex border-b border-surface-highlight bg-black/20 overflow-x-auto whitespace-nowrap scrollbar-hide">
          {tabs.map((t: string, i: number) => (
            <div key={i} className={`px-3 py-1.5 text-[10px] border-r border-surface-highlight font-bold transition-colors ${i === 0 ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}>
              {t}
            </div>
          ))}
        </div>
        <div className="p-3 flex-1 text-[10px] text-text-muted italic flex items-center justify-center bg-surface/50">
          Tab content area...
        </div>
      </div>
    );
  }
  if (tile.type === 'accordion') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    const items = (p.items) || ['Item 1', 'Item 2'];
    return (
      <div className="w-full h-full p-1 space-y-1 overflow-y-auto custom-scrollbar">
        {items.map((item: string, i: number) => (
          <div key={i} className="rounded border border-surface-highlight overflow-hidden shadow-sm">
            <div className={`text-[10px] text-text px-3 py-2 flex justify-between items-center transition-colors ${i === 0 ? 'bg-primary/10 border-b border-surface-highlight' : 'bg-surface'}`}>
              <span className="font-bold">{item}</span>
              <span className="text-[8px] opacity-50">{i === 0 ? '▼' : '+'}</span>
            </div>
            {i === 0 && <div className="p-2 text-[9px] text-text-muted bg-black/5 leading-relaxed">Content for {item} goes here. Accordion items can be expanded to show more info.</div>}
          </div>
        ))}
      </div>
    );
  }
  if (tile.type === 'carousel') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    const speed = Number(p.autoPlaySpeed || 3000);
    return (
      <div className="w-full h-full bg-black/40 flex flex-col items-center justify-center relative overflow-hidden rounded-lg group">
        <div className="text-[10px] font-black text-white/30 uppercase tracking-widest animate-pulse mb-2">Content Carousel</div>
        <div className="flex gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
        </div>
        <div className="absolute inset-y-0 left-0 w-8 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">‹</div>
        <div className="absolute inset-y-0 right-0 w-8 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">›</div>
        <div className="absolute bottom-2 text-[8px] text-white/40 italic">Auto-play: {speed}ms</div>
      </div>
    );
  }
  if (tile.type === 'sticky_note') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return <div className="w-full h-full p-4 flex items-center justify-center text-center bg-yellow-100 text-black font-serif shadow-lg" style={{ transform: 'rotate(-2deg)', backgroundColor: String(p.color || '#fef3c7') }}>{String(p.text || 'Note')}</div>;
  }
  if (tile.type === 'shape') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    const s = String(p.shape || 'circle');
    const f = String(p.fillColor || '#EA580C');
    return <div className="w-full h-full flex items-center justify-center p-2">{s === 'circle' ? <div className="w-full aspect-square rounded-full shadow-lg border-2 border-white/10" style={{ backgroundColor: f }} /> : <div className="w-full h-full rounded-md shadow-lg border-2 border-white/10" style={{ backgroundColor: f }} />}</div>;
  }
  if (tile.type === 'frame') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    const style = String(p.frameStyle || 'simple');
    let borderClass = "border-4 border-white/20";
    if (style === 'ornate') borderClass = "border-[12px] border-double border-orange-900 shadow-2xl";
    if (style === 'modern') borderClass = "border-2 border-primary shadow-[0_0_20px_rgba(234,88,12,0.3)]";
    if (style === 'shadow') borderClass = "border-none shadow-[20px_20px_60px_rgba(0,0,0,0.5)]";
    
    return (
      <div className={`w-full h-full bg-white/5 flex items-center justify-center rounded transition-all duration-500 ${borderClass}`}>
        <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">{style} frame</div>
      </div>
    );
  }

  // 51-60: Special/Integration Tiles
  if (tile.type === 'clock') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return <ClockTile properties={p} />;
  }
  if (tile.type === 'calendar') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return <CalendarTile properties={p} />;
  }
  if (tile.type === 'rss_feed') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return <RssFeedTile properties={p} />;
  }
  if (tile.type === 'social_proof') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return (
      <div className="w-full h-full p-4 bg-white text-slate-900 rounded-xl flex flex-col items-center justify-center shadow-2xl border-4 border-primary/10 relative overflow-hidden">
        <div className="absolute -top-6 -left-6 w-12 h-12 bg-primary/5 rounded-full" />
        <div className="flex gap-0.5 mb-2">
          {[1,2,3,4,5].map(s => <span key={s} className="text-orange-400 text-xs">★</span>)}
        </div>
        <div className="text-xs italic font-medium text-center leading-relaxed">"{String(p.quote || 'Absolutely love the quality and service here! Will definitely be back.')}"</div>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">{String(p.author || 'JD')[0]}</div>
          <div className="text-[10px] font-black text-slate-700">-{String(p.author || 'Satisfied Guest')}</div>
        </div>
      </div>
    );
  }
  if (tile.type === 'testimonial') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return (
      <div className="w-full h-full p-5 bg-surface border-2 border-surface-highlight rounded-2xl flex flex-col items-center justify-center text-center shadow-xl relative group">
        <div className="absolute top-3 left-4 text-4xl text-primary/20 font-serif leading-none">"</div>
        <div className="text-text italic mb-3 text-sm leading-relaxed z-10">"{String(p.quote || 'This restaurant has become our weekly tradition. The atmosphere is unmatched!')}"</div>
        <div className="w-10 h-1 bg-primary/30 rounded-full mb-3" />
        <div className="text-xs font-black text-text uppercase tracking-widest">{String(p.author || 'Sarah Jenkins')}</div>
        <div className="text-[8px] text-text-muted mt-0.5 font-bold tracking-tighter opacity-50">REGULAR CUSTOMER</div>
      </div>
    );
  }
  if (tile.type === 'stock_ticker') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return <StockTickerTile properties={p} />;
  }
  if (tile.type === 'menu_item') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return (
      <div className="w-full h-full bg-surface flex gap-3 p-2 rounded border border-surface-highlight overflow-hidden">
        <div className="w-16 h-full bg-black/20 rounded shrink-0 flex items-center justify-center overflow-hidden">
          {p.imageUrl ? <img src={String(p.imageUrl)} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="opacity-20" />}
        </div>
        <div className="flex flex-col justify-center overflow-hidden flex-1">
          <div className="flex justify-between items-start gap-2">
            <div className="font-bold text-xs truncate text-text">{String(p.itemName || 'New Dish')}</div>
            <div className="text-primary font-bold text-xs shrink-0">${String(p.price || '0.00')}</div>
          </div>
          <div className="text-[10px] text-text-muted line-clamp-2 mt-0.5">{String(p.description || 'Add a delicious description here.')}</div>
        </div>
      </div>
    );
  }
  if (tile.type === 'special_offer') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return (
      <div className="w-full h-full bg-primary flex flex-col items-center justify-center p-4 text-white text-center rounded-lg shadow-inner relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-2xl" />
        <div className="text-[10px] uppercase font-black tracking-widest opacity-90 mb-1">{String(p.subTitle || 'Limited Time')}</div>
        <div className="text-3xl font-black italic transform -skew-x-6 drop-shadow-md">{String(p.discount || '50% OFF')}</div>
        <div className="text-xs font-bold mt-1 border-t border-white/20 pt-1 w-full max-w-[120px]">{String(p.title || 'Today Only')}</div>
      </div>
    );
  }
  if (tile.type === 'event_countdown') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return <EventCountdownTile properties={p} />;
  }
  if (tile.type === 'map') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = properties as any;
    return <MapTile properties={p} isEditor={isEditor} />;
  }

  return (
    <div className="flex flex-col items-center gap-2 text-text-muted pointer-events-none w-full h-full justify-center bg-black/10">
      {getTileIcon(tile.type as TileType)}
      <span className="text-xs capitalize">{(tile.type as string).replace('_', ' ')}</span>
    </div>
  );
};
const MapTile = ({ properties, isEditor }: { properties: SpecialTileProperties, isEditor?: boolean }) => {
  const address = encodeURIComponent(String(properties.address || 'Times Square, NY'));
  const zoom = Number(properties.zoom || 14);
  const mapType = String(properties.mapType || 'm'); // m = roadmap, k = satellite
  return (
    <div className="w-full h-full bg-black/20 rounded-lg overflow-hidden border border-surface-highlight shadow-2xl relative">
      <iframe title="Location map"
        width="100%" 
        height="100%" 
        frameBorder="0" 
        src={`https://maps.google.com/maps?q=${address}&t=${mapType === 'satellite' ? 'k' : ''}&z=${zoom}&ie=UTF8&iwloc=&output=embed`}
        className="grayscale-[0.2] contrast-[1.1]"
        style={{ pointerEvents: isEditor ? 'none' : undefined }}
      />
      <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md p-2 rounded border border-white/10 flex items-center gap-2">
        <MapPin size={12} className="text-primary" />
        <div className="text-[10px] font-bold text-white truncate">{String(properties.locationName || 'Location View')}</div>
      </div>
    </div>
  );
};

export const TileContent = ({ tile, isEditor = false, screenId, orgId }: TileContentProps) => {
  const { getHandlers } = useTileInteractions(tile, !!isEditor);
  const handlers = getHandlers();

  return (
    <div className={`w-full h-full relative ${isEditor ? 'pointer-events-none' : 'pointer-events-auto'}`} {...handlers}>
      <TileContentInner tile={tile} isEditor={isEditor} screenId={screenId} orgId={orgId} />
    </div>
  );
};


