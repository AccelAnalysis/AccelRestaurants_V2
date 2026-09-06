import { useCallback, useState } from 'react';
export type ActionFeedback = { message: string; variant: 'error' | 'success' | 'info' } | null;
/** Persistent feedback: never silently dismiss an error or erase the person's input. */
export function useFeedback() {
  const [feedback, setFeedback] = useState<ActionFeedback>(null);
  const notify = useCallback((message: string, variant: NonNullable<ActionFeedback>['variant'] = 'info') => setFeedback({ message, variant }), []);
  const clearFeedback = useCallback(() => setFeedback(null), []);
  return { feedback, notify, clearFeedback };
}
