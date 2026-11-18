import React, { useState } from 'react';
import { Bot, ChevronDown, CircleDot, MessageSquare, Network, Plus } from 'lucide-react';
import { usePopover } from './PullRequestsPanel';
import { isMac } from '../../utils/platform';
import { useLabels } from '../../labels';

export type NewKind = 'task' | 'agent' | 'chat' | 'issue';
/** Dropdown entries: the dialog kinds plus "New orchestrator", which starts right away */
export type NewMenuKind = NewKind | 'orchestrator';

const ENTRIES: { kind: NewMenuKind; icon: typeof Plus }[] = [
  { kind: 'task', icon: Plus },
  { kind: 'agent', icon: Bot },
  { kind: 'chat', icon: MessageSquare },
  { kind: 'issue', icon: CircleDot },
  { kind: 'orchestrator', icon: Network },
];

/** An orchestrator role (`<workspace>/roles/<id>.md`) offered under "New orchestrator" */
export interface NewOrchestratorRole {
  id: string;
  title: string;
}

const NewMenu: React.FC<{
  onPick: (kind: NewMenuKind, role?: string) => void;
  onClose: () => void;
  roles: readonly NewOrchestratorRole[];
  hidden: readonly NewMenuKind[];
}> = ({ onPick, onClose, roles, hidden }) => {
  const t = useLabels().shell;
  const ref = usePopover(onClose);
  // With roles, "New orchestrator" is the general one and each role gets an entry below it
  const entries = ENTRIES.filter((e) => !hidden.includes(e.kind))
    .map((e) => ({ ...e, label: t.newMenu[e.kind], hint: t.newMenuHints[e.kind] }))
    .flatMap((e) =>
      e.kind === 'orchestrator' && roles.length > 0
        ? [
            { ...e, hint: t.roleGeneral },
            ...roles.map((r) => ({ ...e, role: r.id, label: r.id, hint: t.role, title: r.title })),
          ]
        : [e]
    );
  // ↑/↓ move between the entries, as in a native menu
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'ArrowDown' ? at + 1 : (at <= 0 ? items.length : at) - 1;
    items[next % items.length]?.focus();
  };
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="menu"
      aria-label={t.create}
      onKeyDown={onKeyDown}
      className="absolute left-0 top-full mt-1 z-40 min-w-[240px] bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 outline-none"
    >
      {entries.map((entry) => (
        <button
          key={'role' in entry ? `role:${entry.role}` : entry.kind}
          type="button"
          role="menuitem"
          title={'title' in entry ? entry.title : undefined}
          onClick={() => {
            onClose();
            onPick(entry.kind, 'role' in entry ? entry.role : undefined);
          }}
          className={`w-full flex items-center gap-2 text-left ${'role' in entry ? 'pl-7' : 'pl-3'} pr-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 hover:text-white focus-visible:bg-gray-700 focus-visible:outline-none`}
        >
          <entry.icon size={13} aria-hidden className="shrink-0 text-gray-400" />
          <span className="flex-1 whitespace-nowrap">{entry.label}</span>
          <span className="text-[11px] text-gray-500 whitespace-nowrap">{entry.hint}</span>
        </button>
      ))}
    </div>
  );
};

/** [New task | ⌄]: the main part starts a task, the chevron offers agent, chat, issue and orchestrator */
export const NewTaskButton: React.FC<{
  onNew: (kind: NewMenuKind, role?: string) => void;
  /** Orchestrator roles offered in the menu; onOpenMenu lets the caller reload them */
  roles?: readonly NewOrchestratorRole[];
  onOpenMenu?: () => void;
  /** Kinds the host cannot create (no issue tracker, no orchestrator, no UI view) */
  hidden?: readonly NewMenuKind[];
}> = ({ onNew, roles = [], onOpenMenu, hidden = [] }) => {
  const t = useLabels().shell;
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex shrink-0">
      <button
        type="button"
        onClick={() => onNew('task')}
        className="flex items-center gap-1 pl-2 pr-2.5 py-0.5 rounded-l text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
        title={t.newTaskTitle(isMac ? '⌘N' : 'Ctrl+N')}
      >
        <Plus size={13} aria-hidden /> {t.newMenu.task}
      </button>
      <button
        type="button"
        onClick={() => {
          if (!open) onOpenMenu?.();
          setOpen(!open);
        }}
        data-popover-trigger
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.newMoreLabel}
        title={t.newMoreTitle}
        className="flex items-center px-1 py-0.5 rounded-r border-l border-blue-800 text-white bg-blue-600 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
      >
        <ChevronDown size={13} aria-hidden />
      </button>
      {open && (
        <NewMenu onPick={onNew} onClose={() => setOpen(false)} roles={roles} hidden={hidden} />
      )}
    </div>
  );
};

const KINDS: NewKind[] = ['task', 'agent', 'chat', 'issue'];

/** Switch between the four "new" dialogs while one is open (#271); the caller carries the draft over */
export const NewKindTabs: React.FC<{
  kind: NewKind;
  onChange: (kind: NewKind) => void;
  disabled?: boolean;
  /** Kinds the host cannot create */
  hidden?: readonly NewMenuKind[];
}> = ({ kind, onChange, disabled, hidden = [] }) => {
  const t = useLabels().shell;
  return (
    <div role="tablist" aria-label={t.whatToCreate} className="flex rounded-md bg-gray-850 p-0.5">
      {KINDS.filter((k) => !hidden.includes(k)).map((k) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={k === kind}
          disabled={disabled}
          onClick={() => k !== kind && onChange(k)}
          className={`px-2.5 py-0.5 rounded text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50 ${
            k === kind
              ? 'bg-blue-600 text-white font-medium'
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
        >
          {t.newKinds[k]}
        </button>
      ))}
    </div>
  );
};
