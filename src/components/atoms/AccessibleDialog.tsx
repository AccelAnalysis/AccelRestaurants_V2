import * as Dialog from '@radix-ui/react-dialog';
import { useRef, type ReactNode } from 'react';

interface AccessibleDialogProps {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
  closeLabel?: string;
  wide?: boolean;
}

/** One dialog pattern: named, focus-contained, Escape-dismissable, and focus-restoring. */
export const AccessibleDialog = ({ title, description, onClose, children, busy = false,
  closeLabel = 'Close', wide = false }: AccessibleDialogProps) => {
  const returnFocus = useRef<HTMLElement | null>(
    typeof document === 'undefined' ? null : document.activeElement as HTMLElement
  );
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70" />
        <Dialog.Content className={`app-ui ui-dialog ${wide ? 'ui-dialog-wide' : ''}`}
          onCloseAutoFocus={(event) => {
            if (returnFocus.current?.isConnected) { event.preventDefault(); returnFocus.current.focus(); }
          }}
          onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}
          onPointerDownOutside={(event) => event.preventDefault()}
          aria-busy={busy}>
          <header className="flex items-start justify-between gap-4 border-b border-surface-highlight p-4 sm:p-6">
            <div className="min-w-0">
              <Dialog.Title className="text-xl font-semibold text-text break-words">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-text-secondary">{description}</Dialog.Description>
            </div>
            <Dialog.Close disabled={busy} className="ui-button ui-button-secondary shrink-0">{closeLabel}</Dialog.Close>
          </header>
          <div className="min-h-0 overflow-y-auto p-4 sm:p-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
