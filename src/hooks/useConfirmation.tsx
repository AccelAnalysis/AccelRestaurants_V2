import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibleDialog } from '../components/atoms/AccessibleDialog';
type Request = { message: string; input: boolean; resolve: (value: string | null) => void };
/** Accessible replacement for native confirm/prompt. Cancel never starts a mutation. */
export function useConfirmation() {
  const [request, setRequest] = useState<Request | null>(null);
  const [text, setText] = useState('');
  const pending = useRef<Request | null>(null);
  const finish = useCallback((value: string | null) => {
    pending.current?.resolve(value); pending.current = null; setRequest(null); setText('');
  }, []);
  useEffect(() => () => { pending.current?.resolve(null); }, []);
  const ask = useCallback((message: string, input: boolean) => new Promise<string | null>(resolve => {
    pending.current?.resolve(null);
    const next = { message, input, resolve };
    pending.current = next; setText(''); setRequest(next);
  }), []);
  const confirmAction = useCallback(async (message: string) => (await ask(message, false)) !== null, [ask]);
  const requestText = useCallback((message: string) => ask(message, true), [ask]);
  const confirmation = request && <AccessibleDialog title={request.input ? 'Feedback for the designer' : 'Confirm action'} description={request.message} onClose={() => finish(null)} closeLabel="Cancel">
    <form onSubmit={event => { event.preventDefault(); finish(request.input ? text.trim() : 'confirmed'); }}>
      {request.input && <label className="block">Feedback<textarea autoFocus required value={text} onChange={event => setText(event.target.value)} className="block w-full bg-background border border-surface-highlight rounded p-3 mt-2" rows={4} /></label>}
      <div className="flex flex-wrap justify-end gap-3 mt-4">
        <button type="button" className="ui-button ui-button-secondary" onClick={() => finish(null)}>Keep unchanged</button>
        <button type="submit" className="ui-button ui-button-primary" disabled={request.input && !text.trim()}>{request.input ? 'Send feedback' : 'Confirm'}</button>
      </div>
    </form>
  </AccessibleDialog>;
  return { confirmAction, requestText, confirmation };
}
