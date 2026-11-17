import React, { useEffect, useRef } from 'react';
import { useLabels } from './labels';

/** Small modal yes/no inside the panel (no window.confirm: it blocks and cannot be themed) */
export const ConfirmDialog: React.FC<{
  title: string;
  body: string;
  confirm: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, body, confirm, onConfirm, onCancel }) => {
  const t = useLabels();
  const cancelRef = useRef<HTMLButtonElement>(null);
  // the safe choice has focus, so Enter does not stop by accident
  useEffect(() => cancelRef.current?.focus(), []);
  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[15vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="agents-ui-confirm-title"
        aria-describedby="agents-ui-confirm-body"
        className="w-full max-w-sm rounded-lg border border-ag-border bg-ag-surface shadow-2xl"
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      >
        <div className="p-4">
          <h2 id="agents-ui-confirm-title" className="text-sm font-semibold text-ag-text">
            {title}
          </h2>
          <p id="agents-ui-confirm-body" className="mt-1.5 text-xs text-ag-muted">
            {body}
          </p>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-ag-border">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-sm text-ag-muted hover:text-ag-text hover:bg-ag-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-ag-accent"
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 rounded text-sm bg-ag-danger text-ag-on-accent hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ag-danger"
          >
            {confirm}
          </button>
        </div>
      </div>
    </div>
  );
};
