import type { ReactNode } from 'react';

interface InlineFeedbackProps {
  message?: string | null;
  tone?: 'error' | 'success' | 'info';
  children?: ReactNode;
  id?: string;
}

/** Persistent feedback, adjacent to the affected task, not a timed toast. */
export const InlineFeedback = ({ message, tone = 'info', children, id }: InlineFeedbackProps) => (
  <div id={id} role={tone === 'error' ? 'alert' : 'status'} aria-atomic="true"
    className={message ? `ui-feedback ui-feedback-${tone}` : 'sr-only'}>
    {message && <><span className="font-semibold">{tone === 'error' ? 'Unable to complete: ' : tone === 'success' ? 'Done: ' : ''}</span>{message}{children}</>}
  </div>
);
