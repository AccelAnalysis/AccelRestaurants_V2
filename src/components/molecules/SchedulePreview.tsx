import { useState, useMemo } from 'react';
import type { MenuSchedule } from '../../types/schema';
import { isScheduleActive } from '../../utils/dayparting';
import { Calendar, CheckCircle2, XCircle } from 'lucide-react';

interface SchedulePreviewProps {
  schedules: MenuSchedule[];
  timezone?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SchedulePreview = ({ schedules, timezone }: SchedulePreviewProps) => {
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 16));

  const isActiveAtTestDate = useMemo(() => {
    const date = new Date(testDate);
    // Use the utility to check if ANY schedule is active
    return schedules.some(s => isScheduleActive(s, date, timezone));
  }, [schedules, testDate, timezone]);

  // Generate visual grid data
  // We'll create a 24h x 7d grid? Or maybe just simple bars for each day.
  // Let's do Day Bars. 0-24h.
  const dayBars = useMemo(() => {
    return DAYS.map((dayName, dayIndex) => {
      // Find all schedules active on this day
      const daySchedules = schedules.filter(s => s.active && s.daysOfWeek.includes(dayIndex));
      
      // Calculate segments
      // This is simplified; assumes start/end times are within 00:00-23:59 for now
      // If we handled overnight wrapping, it would be complex.
      // We'll map "09:00" to % left.
      const segments = daySchedules.map(s => {
        const [startH, startM] = s.startTime.split(':').map(Number);
        const [endH, endM] = s.endTime.split(':').map(Number);
        
        const startMin = startH * 60 + startM;
        let endMin = endH * 60 + endM;
        
        // Handle wrapping visual (simplified: clip at midnight for the bar)
        if (endMin < startMin) endMin = 24 * 60; 

        const left = (startMin / (24 * 60)) * 100;
        const width = ((endMin - startMin) / (24 * 60)) * 100;
        
        return { left, width, name: s.name };
      });

      return { dayName, segments };
    });
  }, [schedules]);

  return (
    <div className="bg-surface-highlight/10 border border-surface-highlight rounded-lg p-6 mt-6">
      <h4 className="font-bold text-text mb-4 flex items-center gap-2">
        <Calendar size={16} /> Schedule Preview
      </h4>
      
      {/* Test Time Input */}
      <div className="flex items-end gap-4 mb-8 p-4 bg-surface rounded-lg border border-surface-highlight">
        <div>
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">Test Date & Time</label>
          <input 
            type="datetime-local" 
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className="bg-background border border-surface-highlight rounded px-3 py-2 text-text focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex-1 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Status:</span>
            {isActiveAtTestDate ? (
              <span className="flex items-center gap-1 text-success font-bold bg-success/10 px-2 py-1 rounded text-sm">
                <CheckCircle2 size={16} /> Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-text-muted font-bold bg-surface-highlight px-2 py-1 rounded text-sm">
                <XCircle size={16} /> Inactive
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Visual Weekly Grid */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] text-text-muted px-8 mb-1">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>12 AM</span>
        </div>
        {dayBars.map((day, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-8 text-[10px] font-bold text-text-muted text-right">{day.dayName}</div>
            <div className="flex-1 h-6 bg-surface-highlight/30 rounded-md relative overflow-hidden">
              {day.segments.map((seg, j) => (
                <div 
                  key={j}
                  className="absolute top-0 bottom-0 bg-primary/60 border-l border-r border-primary/20 hover:bg-primary transition-colors"
                  style={{ left: `${seg.left}%`, width: `${seg.width}%` }}
                  title={`${seg.name} (${Math.round(seg.width * 14.4)} mins)`}
                />
              ))}
              {/* Hour markers */}
              {Array.from({ length: 4 }).map((_, k) => (
                <div key={k} className="absolute top-0 bottom-0 border-l border-text-muted/10" style={{ left: `${(k + 1) * 25}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-text-muted mt-4 text-center">
        * Visualization assumes 24-hour cycle. Overnight schedules clipped at midnight for display.
      </p>
    </div>
  );
};
