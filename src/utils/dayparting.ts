import { type MenuSchedule } from '../types/schema';

export interface ValidationError {
  scheduleId: string;
  message: string;
}

/**
 * Validates a list of schedules for common errors.
 * @param schedules List of schedules to validate
 * @returns Array of validation errors
 */
export const validateSchedules = (schedules: MenuSchedule[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  schedules.forEach(schedule => {
    if (!schedule.active) return;

    if (!schedule.startTime || !schedule.endTime) {
      errors.push({ scheduleId: schedule.id, message: 'Start and end time are required' });
      return;
    }

    // Basic format check
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(schedule.startTime) || !timeRegex.test(schedule.endTime)) {
      errors.push({ scheduleId: schedule.id, message: 'Invalid time format' });
      return;
    }

    if (schedule.daysOfWeek.length === 0) {
      errors.push({ scheduleId: schedule.id, message: 'Select at least one day' });
    }
  });

  return errors;
};

/**
 * Checks if a specific schedule is active based on the current time and timezone.
 * @param schedule The schedule to check
 * @param now The current date object (default: new Date())
 * @param orgTimezone Default timezone if schedule doesn't specify one
 * @returns boolean
 */
export const isScheduleActive = (
  schedule: MenuSchedule, 
  now: Date = new Date(),
  orgTimezone?: string
): boolean => {
  if (!schedule.active) return false;

  const timezone = schedule.timezone || orgTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Get current day/time in the target timezone
  // We use Intl.DateTimeFormat to parse parts in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    weekday: 'short'
  });

  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  
  // Create a localized date object for day of week check
  // Note: 'weekday' part from formatToParts might be text ("Mon"), but we need index 0-6.
  // JS getDay() is 0=Sun, 6=Sat.
  // We can construct a Date object from the localized string, but that's tricky.
  // Better approach: Get offset and adjust. Or trust `Intl` for day.
  
  // Alternative: Use `toLocaleString` to get string and parse it, but that's localized.
  // Let's use a simpler mapping if we can.
  
  // Robust way without moment-timezone (which is heavy):
  // 1. Get UTC time.
  // 2. Adjust by timezone offset? No, timezone offset changes with DST.
  // 3. Use `toLocaleString` with `en-US` and specific options to get numeric day.
  
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short' // Sun, Mon, Tue...
  });
  const dayStr = dayFormatter.format(now);
  const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
  const currentDay = dayMap[dayStr];

  if (!schedule.daysOfWeek.includes(currentDay)) {
    return false;
  }

  // Check Time Range
  const currentTimeVal = hour * 60 + minute; // Minutes from midnight
  
  const [startH, startM] = schedule.startTime.split(':').map(Number);
  const startTimeVal = startH * 60 + startM;
  
  const [endH, endM] = schedule.endTime.split(':').map(Number);
  const endTimeVal = endH * 60 + endM;

  if (startTimeVal <= endTimeVal) {
    // Normal range (e.g. 09:00 to 17:00)
    return currentTimeVal >= startTimeVal && currentTimeVal < endTimeVal;
  } else {
    // Overnight range (e.g. 22:00 to 02:00)
    // Active if after start OR before end
    return currentTimeVal >= startTimeVal || currentTimeVal < endTimeVal;
  }
};

/**
 * Determines if a Menu is active based on its schedules.
 * If no schedules are defined, it defaults to active (unless logic dictates otherwise).
 * If schedules exist, at least one must be active.
 */
export const isMenuActive = (
  schedules: MenuSchedule[] | undefined, 
  orgTimezone?: string,
  now: Date = new Date()
): boolean => {
  if (!schedules || schedules.length === 0) {
    return true; // No schedules = Always Active
  }
  
  return schedules.some(s => isScheduleActive(s, now, orgTimezone));
};
