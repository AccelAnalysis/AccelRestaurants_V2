import { AccessibleDialog } from '../atoms/AccessibleDialog';
import { InlineFeedback } from '../atoms/InlineFeedback';
import { useState, useEffect } from 'react';
import { Save, Calendar } from 'lucide-react';
import type { AudioSchedule } from '../../types/schema';

interface AudioScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: Omit<AudioSchedule, 'id'>) => Promise<void>;
  scheduleToEdit?: AudioSchedule | null;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

export const AudioScheduleModal = ({ isOpen, onClose, onSave, scheduleToEdit }: AudioScheduleModalProps) => {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Weekdays by default
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (scheduleToEdit) {
      setStartTime(scheduleToEdit.startTime);
      setEndTime(scheduleToEdit.endTime || '');
      setDaysOfWeek(scheduleToEdit.daysOfWeek);
      setEnabled(scheduleToEdit.enabled);
    } else {
      // Reset to defaults
      setStartTime('09:00');
      setEndTime('');
      setDaysOfWeek([1, 2, 3, 4, 5]);
      setEnabled(true);
    }
  }, [scheduleToEdit, isOpen]);

  const handleToggleDay = (day: number) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter(d => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day].sort((a, b) => a - b));
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setError(null);
    if (daysOfWeek.length === 0) {
      setError('Please select at least one day.');
      return;
    }

    if (!startTime) {
      setError('Please enter a start time.');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        startTime,
        endTime: endTime || undefined,
        daysOfWeek,
        enabled
      });
      onClose();
    } catch (error) {
      console.error('Failed to save schedule:', error);
      setError('Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AccessibleDialog title={scheduleToEdit ? 'Edit audio schedule' : 'Add audio schedule'} description="Choose when audio should play." onClose={onClose} closeLabel="Cancel" busy={saving}>
      <InlineFeedback message={error} tone="error" />
        {/* Form */}
        <div className="space-y-6">
          {/* Time Range */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text mb-2 block">Start Time</label>
              <input aria-label="Start Time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-text mb-2 block">
                End Time <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <input
                aria-label="End time (optional)" type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="Leave empty for continuous playback"
                className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text focus:border-primary focus:outline-none"
              />
              <p className="text-xs text-text-muted mt-1">
                Leave empty to play until manually stopped
              </p>
            </div>
          </div>

          {/* Days of Week */}
          <div>
            <label className="text-sm font-medium text-text mb-3 flex items-center gap-2">
              <Calendar size={16} />
              Days of Week
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(({ value, label }) => (
                <button
                  key={value}
                  aria-pressed={daysOfWeek.includes(value)}
                  onClick={() => handleToggleDay(value)}
                  className={`py-2 px-1 rounded text-sm font-medium transition-colors ${
                    daysOfWeek.includes(value)
                      ? 'bg-primary text-white'
                      : 'bg-surface-highlight text-text-secondary hover:bg-surface-highlight/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-surface-highlight">
            <div>
              <p className="text-sm font-medium text-text">Enable Schedule</p>
              <p className="text-xs text-text-muted">Schedule will only run when enabled</p>
            </div>
            <button
              aria-label="Enable schedule" role="switch" aria-checked={enabled}
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-primary' : 'bg-surface-highlight'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Preview */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs font-medium text-primary mb-1">Schedule Preview</p>
            <p className="text-sm text-text">
              {enabled ? '✓' : '✗'} Play audio on{' '}
              <span className="font-medium">
                {daysOfWeek.length === 7
                  ? 'every day'
                  : daysOfWeek.length === 0
                  ? 'no days'
                  : daysOfWeek.map(d => DAYS_OF_WEEK[d].label).join(', ')}
              </span>
              {' '}at <span className="font-medium">{startTime}</span>
              {endTime && (
                <>
                  {' '}until <span className="font-medium">{endTime}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving || daysOfWeek.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
    </AccessibleDialog>
  );
};
