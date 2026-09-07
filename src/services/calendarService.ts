import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  allDay: boolean;
}

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const cache = new Map<string, { data: CalendarEvent[]; timestamp: number }>();

export const CalendarService = {
  getEvents: async (url: string): Promise<CalendarEvent[]> => {
    if (!url) return [];

    // Check cache
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const fetchCalendarFeed = httpsCallable(functions, 'fetchCalendarFeed');
      const result = await fetchCalendarFeed({ url });
      const { content } = result.data as { content: string };

      if (!content) return [];

      const events = parseICS(content);

      // Update cache
      cache.set(url, { data: events, timestamp: Date.now() });

      return events;
    } catch (error) {
      console.error('Calendar Service Error:', error);
      return [];
    }
  }
};

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function parseICS(icsContent: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lines = icsContent.split(/\r\n|\n|\r/);
  
  let currentEvent: Partial<CalendarEvent> | null = null;
  let inEvent = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      currentEvent = { id: generateUUID(), allDay: false };
      continue;
    }

    if (line.startsWith('END:VEVENT')) {
      inEvent = false;
      if (currentEvent && currentEvent.title && currentEvent.start) {
        if (!currentEvent.end) {
            // Default duration 1 hour if not specified
            currentEvent.end = new Date(currentEvent.start.getTime() + 60 * 60 * 1000); 
        }
        events.push(currentEvent as CalendarEvent);
      }
      currentEvent = null;
      continue;
    }

    if (!inEvent || !currentEvent) continue;

    // Handling folded lines (lines starting with space) is skipped for simplicity but usually needed for long descriptions
    // A robust parser would handle line folding.

    const [key, ...values] = line.split(':');
    const value = values.join(':');

    if (key.startsWith('SUMMARY')) {
      currentEvent.title = value;
    } else if (key.startsWith('DTSTART')) {
      const { date, allDay } = parseICSDate(value);
      currentEvent.start = date;
      if (allDay) currentEvent.allDay = true;
    } else if (key.startsWith('DTEND')) {
      const { date } = parseICSDate(value);
      currentEvent.end = date;
    } else if (key.startsWith('DESCRIPTION')) {
      currentEvent.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
    } else if (key.startsWith('LOCATION')) {
      currentEvent.location = value.replace(/\\,/g, ',');
    } else if (key.startsWith('UID')) {
      currentEvent.id = value;
    }
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function parseICSDate(dateStr: string): { date: Date, allDay: boolean } {
  // DTSTART;VALUE=DATE:20230101
  
  // 20230101T120000Z or 20230101
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));

  if (dateStr.length === 8) {
    return { date: new Date(year, month, day), allDay: true };
  }

  const hour = parseInt(dateStr.substring(9, 11));
  const minute = parseInt(dateStr.substring(11, 13));
  const second = parseInt(dateStr.substring(13, 15));
  
  // Simple UTC handling if Z present
  if (dateStr.endsWith('Z')) {
    return { date: new Date(Date.UTC(year, month, day, hour, minute, second)), allDay: false };
  }

  return { date: new Date(year, month, day, hour, minute, second), allDay: false };
}
