import React, { useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useDialogA11y } from '../CommandPalette/useDialogA11y';
import { useLabels } from '../../labels';

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

export const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({ open, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const trapTab = useDialogA11y(open, dialogRef, () => dialogRef.current);
  const t = useLabels().panels;
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handler, { capture: true });
    return () => document.removeEventListener('keydown', handler, { capture: true });
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-gray-950/70 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      ref={dialogRef}
      tabIndex={-1}
      onKeyDown={trapTab}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-800 sticky top-0 bg-gray-900">
          <Keyboard size={16} className="text-blue-300" />
          <h3 id="shortcuts-title" className="text-sm font-semibold text-gray-100">
            {t.shortcutsTitle}
          </h3>
          <span className="text-xs text-gray-500">{t.shortcutsBrowserNote}</span>
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded text-gray-500 hover:text-white hover:bg-gray-800"
            aria-label={t.close}
          >
            <X size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 p-5">
          {t.shortcutSections.map((section) => (
            <div key={section.title}>
              <div className="text-xs font-semibold text-gray-300 mb-2">{section.title}</div>
              <table className="w-full text-sm">
                <tbody>
                  {section.rows.map(([keys, desc]) => (
                    <tr key={keys} className="border-t border-gray-800/60">
                      <td className="py-1 pr-3 font-mono text-xs text-blue-300 whitespace-nowrap align-top">
                        {keys}
                      </td>
                      <td className="py-1 text-gray-300">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
