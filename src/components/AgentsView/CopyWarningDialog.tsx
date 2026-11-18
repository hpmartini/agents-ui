import React, { useRef } from 'react';
import type { AgentSession } from '../../types';
import { useDialogA11y } from '../CommandPalette/useDialogA11y';
import { useLabels } from '../../labels';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400';

/** Asks before a resume that puts a second writer on a transcript another process holds (#236) */
export const CopyWarningDialog: React.FC<{
  holder: AgentSession;
  /** The caller stops the holder before it resumes; otherwise both keep running */
  handover: boolean;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ holder, handover, onConfirm, onClose }) => {
  const dialogRef = useRef<HTMLFormElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const trapTab = useDialogA11y(true, dialogRef, () => cancelRef.current);
  const t = useLabels().panels;
  const what =
    holder.kind === 'background'
      ? t.copyHolderBackground(holder.id)
      : holder.pid
        ? t.copyHolderPid(holder.pid)
        : t.copyHolderTerminal;
  // a handover mid-turn cuts that turn off
  const interrupts = handover && holder.displayState === 'working';
  return (
    <div
      className="fixed inset-0 z-[90] bg-gray-950/70 flex items-start justify-center px-4 pt-[15vh]"
      onMouseDown={onClose}
    >
      <form
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="copy-warning-title"
        aria-describedby="copy-warning-text"
        tabIndex={-1}
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
        onKeyDown={(e) => {
          trapTab(e);
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] bg-gray-800 border border-amber-500/50 rounded-xl shadow-2xl p-4 text-sm"
      >
        <h2 id="copy-warning-title" className="font-semibold text-amber-200 mb-2">
          {handover ? t.copyHandoverTitle : t.copyTitle}
        </h2>
        <p id="copy-warning-text" className="text-gray-300 break-words">
          {t.copyRunsAs(holder.name, what)} {handover ? t.copyHandoverText : t.copyText} {t.copyIn}{' '}
          <span className="font-mono text-xs">{holder.cwd}</span>
          {handover ? t.copyHandoverEnd : t.copyEnd}
          {interrupts && t.copyInterrupts}
        </p>
        <div className="flex justify-end gap-2 mt-4 text-xs">
          <button
            type="button"
            ref={cancelRef}
            onClick={onClose}
            className={`px-3 py-1.5 rounded-md text-gray-200 hover:bg-gray-700 ${FOCUS}`}
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            className={`px-3 py-1.5 rounded-md font-medium text-gray-950 bg-amber-400 hover:bg-amber-300 ${FOCUS}`}
          >
            {handover ? t.copyTakeOver : t.copyCreate}
          </button>
        </div>
      </form>
    </div>
  );
};
