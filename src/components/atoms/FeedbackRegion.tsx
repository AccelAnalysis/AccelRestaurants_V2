import { InlineFeedback } from './InlineFeedback';
import type { ActionFeedback } from '../../hooks/useFeedback';
export const FeedbackRegion = ({ feedback, onRetry }: { feedback: ActionFeedback; onRetry?: () => void }) => feedback ? (
  <InlineFeedback tone={feedback.variant} message={feedback.message}>
    {feedback.variant === 'error' && onRetry && <button type="button" className="ui-button ui-button-secondary ml-3" onClick={onRetry}>Retry</button>}
  </InlineFeedback>
) : null;
