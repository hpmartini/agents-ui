import React, { useRef } from 'react';
import { useLabels } from '../../labels';
import { useDialogA11y } from '../CommandPalette/useDialogA11y';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400';

/**
 * Small yes/no dialog over the view (no window.confirm: it blocks and cannot be themed). The safe
 * choice has focus, so Enter does not confirm by accident.
 */
export const ConfirmDialog: React.FC<{
  title: string;
  body: string;
  confirm: string;
  /** Colour of the confirm button: red for something that cannot be undone (default), blue otherwise */
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, body, confirm, tone = 'danger', onConfirm, onCancel }) => {
  const t = useLabels().shell;
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const trapTab = useDialogA11y(true, dialogRef, () => cancelRef.current);
  return (
    <div
      className="fixed inset-0 z-[90] bg-gray-950/70 flex items-start justify-center px-4 pt-[15vh]"
      onMouseDown={onCancel}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="agents-confirm-title"
        aria-describedby="agents-confirm-body"
        tabIndex={-1}
        onKeyDown={(e) => {
          trapTab(e);
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-4 text-sm"
      >
        <h2 id="agents-confirm-title" className="font-semibold text-gray-50 mb-2">
          {title}
        </h2>
        <p id="agents-confirm-body" className="text-gray-300 break-words">
          {body}
        </p>
        <div className="flex justify-end gap-2 mt-4 text-xs">
          <button
            type="button"
            ref={cancelRef}
            onClick={onCancel}
            className={`px-3 py-1.5 rounded-md text-gray-200 hover:bg-gray-700 ${FOCUS}`}
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-3 py-1.5 rounded-md font-medium text-white ${
              tone === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
            } ${FOCUS}`}
          >
            {confirm}
          </button>
        </div>
      </div>
    </div>
  );
};
