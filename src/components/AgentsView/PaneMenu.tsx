import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useLabels } from '../../labels';

export interface PaneMenuItem {
  label: string;
  title?: string;
  icon: React.ReactNode;
  run: () => void;
  disabled?: boolean;
}

const itemFocus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400';

/**
 * The ⋯ menu of an agent pane header: actions that are rarely needed, or that a narrow pane has
 * no room for as buttons. Closes on Escape, on a click elsewhere and when focus leaves it.
 * Arrow keys move between the entries.
 */
export const PaneMenu: React.FC<{
  items: PaneMenuItem[];
  /** Look of the ⋯ button, so it sits in the header like its siblings */
  buttonClassName: string;
  /** The header's buttons keep focus and pane state from changing between mousedown and click */
  onButtonMouseDown?: React.MouseEventHandler<HTMLButtonElement>;
  iconSize?: number;
}> = ({ items, buttonClassName, onButtonMouseDown, iconSize = 14 }) => {
  const t = useLabels().terminal;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // keyboard and pointer open alike: the first entry takes focus, so Arrow and Escape work at once
  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    // every entry disabled: the menu itself takes focus, so Escape still reaches it
    (
      root?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)') ??
      root?.querySelector<HTMLElement>('[role="menu"]')
    )?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away, true);
    return () => document.removeEventListener('mousedown', away, true);
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };
  const move = (e: React.KeyboardEvent, step: 1 | -1) => {
    const entries = [
      ...(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []),
    ];
    if (entries.length === 0) return;
    e.preventDefault();
    const at = entries.indexOf(document.activeElement as HTMLElement);
    entries[(at + step + entries.length) % entries.length].focus();
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseDown={onButtonMouseDown}
        onBlur={(e) => {
          if (!rootRef.current?.contains(e.relatedTarget)) setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={buttonClassName}
        title={t.paneActions}
        aria-label={t.paneActions}
      >
        <MoreHorizontal size={iconSize} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={t.paneActions}
          tabIndex={-1}
          // above the threads drawer (z-30) and a host view (z-40) of the UI view
          className="absolute right-0 top-full mt-1 z-50 min-w-40 outline-none py-1 rounded-md border border-gray-700 bg-gray-900 shadow-lg"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              close(true);
            } else if (e.key === 'ArrowDown') move(e, 1);
            else if (e.key === 'ArrowUp') move(e, -1);
          }}
          onBlur={(e) => {
            if (!rootRef.current?.contains(e.relatedTarget)) setOpen(false);
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              title={item.title}
              onClick={() => {
                // focus goes back to ⋯ first: a dialog that item opens returns it there on close
                close(true);
                item.run();
              }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent ${itemFocus}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
