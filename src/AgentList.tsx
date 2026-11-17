import React, { useRef } from 'react';
import { Plus, Square } from 'lucide-react';
import type { Agent } from './transport';
import { isRunning, stateGlyph } from './state';

export interface AgentListProps {
  agents: Agent[];
  /** Agents with a pane in some tab */
  openIds: ReadonlySet<string>;
  /** Agent of the active pane */
  activeId: string | null;
  loaded: boolean;
  title: string;
  onOpen: (id: string) => void;
  onStop: (id: string) => void;
  onNew: () => void;
}

const lastSegment = (path: string) => path.split('/').filter(Boolean).pop() ?? path;

/** Agent rows (state, name, activity, folder); Arrow keys move, Enter opens */
export const AgentList: React.FC<AgentListProps> = ({
  agents,
  openIds,
  activeId,
  loaded,
  title,
  onOpen,
  onStop,
  onNew,
}) => {
  const listRef = useRef<HTMLUListElement>(null);
  const move = (from: HTMLElement, delta: 1 | -1) => {
    const rows = [...(listRef.current?.querySelectorAll<HTMLElement>('[data-agent-row]') ?? [])];
    rows[rows.indexOf(from) + delta]?.focus();
  };

  return (
    <div className="h-full flex flex-col min-h-0 bg-ag-surface">
      <div className="flex items-center gap-2 h-9 px-3 border-b border-ag-border shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wide text-ag-muted flex-1 truncate">
          {title}
        </span>
        <span className="text-xs text-ag-faint tabular-nums">{agents.length}</span>
        <button
          onClick={onNew}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-ag-accent text-ag-on-accent hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ag-accent"
          title="Start a new agent"
        >
          <Plus size={12} aria-hidden="true" /> New
        </button>
      </div>
      {!loaded ? (
        <div className="p-4 text-xs text-ag-muted" role="status">
          Loading agents…
        </div>
      ) : agents.length === 0 ? (
        <div className="p-4 text-xs text-ag-muted">
          No agents yet.{' '}
          <button onClick={onNew} className="underline text-ag-accent">
            Start one
          </button>
          .
        </div>
      ) : (
        <ul ref={listRef} className="flex-1 overflow-y-auto py-1" aria-label={title}>
          {agents.map((agent) => {
            const glyph = stateGlyph(agent.displayState);
            const open = openIds.has(agent.id);
            const active = agent.id === activeId;
            return (
              <li key={agent.id} className="group relative">
                <button
                  data-agent-row
                  onClick={() => onOpen(agent.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                      e.preventDefault();
                      move(e.currentTarget, e.key === 'ArrowDown' ? 1 : -1);
                    }
                  }}
                  aria-current={active || undefined}
                  className={`w-full flex items-start gap-2 pl-3 pr-9 py-2 text-left border-l-2 transition-colors focus-visible:outline-none focus-visible:bg-ag-raised ${
                    active
                      ? 'border-ag-accent bg-ag-raised'
                      : 'border-transparent hover:bg-ag-raised/60'
                  }`}
                  title={`${agent.name} · ${agent.cwd}`}
                >
                  <span
                    className={`${glyph.className} leading-5 shrink-0 ${glyph.animate ? 'animate-pulse motion-reduce:animate-none' : ''}`}
                    aria-label={glyph.label}
                    role="img"
                  >
                    {glyph.glyph}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm text-ag-text truncate">{agent.name}</span>
                      {open && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-ag-accent shrink-0"
                          title="Open in a tab"
                        />
                      )}
                    </span>
                    {agent.detail && (
                      <span className="block text-xs text-ag-muted truncate">{agent.detail}</span>
                    )}
                    <span className="block text-[11px] text-ag-faint font-mono truncate">
                      {lastSegment(agent.cwd)}
                    </span>
                  </span>
                </button>
                {isRunning(agent.displayState) && (
                  <button
                    onClick={() => onStop(agent.id)}
                    className="absolute right-2 top-2 p-1.5 rounded text-ag-faint opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-ag-danger hover:bg-ag-border"
                    title="Stop agent"
                    aria-label={`Stop ${agent.name}`}
                  >
                    <Square size={11} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
