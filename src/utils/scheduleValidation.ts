import type { MenuSchedule } from '../types/schema';

export interface ValidationError {
  scheduleId: string;
  message: string;
}

export const validateSchedules = (schedules: MenuSchedule[]): ValidationError[] => {
  const errors: ValidationError[] = [];
  const activeSchedules = schedules.filter(s => s.active);

  // Group by day of week to check overlaps per day
  const dayMap = new Map<number, MenuSchedule[]>();

  activeSchedules.forEach(schedule => {
    schedule.daysOfWeek.forEach(day => {
      if (!dayMap.has(day)) {
        dayMap.set(day, []);
      }
      dayMap.get(day)!.push(schedule);
    });
  });

  // Check overlaps for each day
  dayMap.forEach((dailySchedules, day) => {
    // Sort by start time
    dailySchedules.sort((a, b) => a.startTime.localeCompare(b.startTime));

    for (let i = 0; i < dailySchedules.length - 1; i++) {
      const current = dailySchedules[i];
      const next = dailySchedules[i + 1];

      // Check if current overlaps with next
      // Since they are sorted by startTime, we just need to check if next starts before current ends
      if (next.startTime < current.endTime) {
        // Overlap detected
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
        const msg = `Overlaps with "${current.name}" on ${dayName}`;
        
        // Avoid duplicate errors for the same pair
        if (!errors.some(e => e.scheduleId === next.id && e.message === msg)) {
           errors.push({ scheduleId: next.id, message: msg });
        }
        // Also mark the current one if not already marked
        if (!errors.some(e => e.scheduleId === current.id)) {
           errors.push({ scheduleId: current.id, message: `Overlaps with "${next.name}" on ${dayName}` });
        }
      }
    }
  });

  // Additional Validation: Start time before End time
  activeSchedules.forEach(schedule => {
    if (schedule.startTime >= schedule.endTime) {
       // Allow overnight? "22:00" to "02:00". 
       // If strict dayparting (within a day), this is invalid.
       // If we support overnight, the overlap logic becomes complex (splitting intervals).
       // For MVP/Readiness, let's assume strictly within-day (00:00 to 23:59) or validation error.
       // Most restaurant menus (Breakfast/Lunch) don't cross midnight often, or they treat it as late night.
       // Let's flagging it as "End time must be after Start time" for now to keep simple.
       errors.push({ scheduleId: schedule.id, message: 'End time must be after Start time' });
    }
  });

  return errors;
};
