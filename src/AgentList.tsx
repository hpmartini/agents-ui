import React, { useRef } from 'react';
import { AlertTriangle, Plus, RefreshCw, Square } from 'lucide-react';
import type { Agent, TransportError } from './transport';
import { useLabels } from './labels';
import { isRunning, stateGlyph } from './state';

export interface AgentListProps {
  agents: Agent[];
  /** Agents with a pane in some tab */
  openIds: ReadonlySet<string>;
  /** Agent of the active pane */
  activeId: string | null;
  loaded: boolean;
  /** The list failed to load (subscribe's onError); cleared by the next list */
  error?: TransportError | null;
  onRetry?: () => void;
  title: string;
  onOpen: (id: string) => void;
  onStop: (id: string) => void;
  /** Hides the stop button where it returns false (protected sessions) */
  canStop?: (agent: Agent) => boolean;
  onNew: () => void;
}

const lastSegment = (path: string) => path.split('/').filter(Boolean).pop() ?? path;

/** Agent rows (state, name, activity, folder); Arrow keys move, Enter opens */
export const AgentList: React.FC<AgentListProps> = ({
  agents,
  openIds,
  activeId,
  loaded,
  error = null,
  onRetry,
  title,
  onOpen,
  onStop,
  canStop,
  onNew,
}) => {
  const t = useLabels();
  const errorText = error
    ? error.status === 401 || error.status === 403
      ? t.forbidden
      : error.status !== undefined && error.status >= 500
        ? t.unavailable
        : t.loadFailed
    : '';
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
          title={t.newAgentTitle}
        >
          <Plus size={12} aria-hidden="true" /> {t.newAgent}
        </button>
      </div>
      {error && (
        <div
          role="alert"
          className={`flex gap-2 text-xs ${loaded ? 'px-3 py-2 border-b border-ag-border bg-ag-danger/10' : 'p-4'}`}
        >
          <AlertTriangle size={14} className="text-ag-danger shrink-0 mt-px" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="text-ag-text">{errorText}</div>
            {error.message && (
              <div className="text-ag-faint font-mono break-words mt-0.5">{error.message}</div>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 flex items-center gap-1 px-2 py-1 rounded border border-ag-border text-ag-text hover:bg-ag-raised"
              >
                <RefreshCw size={11} aria-hidden="true" /> {t.retry}
              </button>
            )}
          </div>
        </div>
      )}
      {!loaded ? (
        error ? null : (
          <div className="p-4 text-xs text-ag-muted" role="status">
            {t.loading}
          </div>
        )
      ) : agents.length === 0 ? (
        <div className="p-4 text-xs text-ag-muted">
          {t.noAgents}{' '}
          <button onClick={onNew} className="underline text-ag-accent">
            {t.startOne}
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
                    aria-label={t.states[agent.displayState]}
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
                          title={t.openInTab}
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
                {isRunning(agent.displayState) && (canStop?.(agent) ?? true) && (
                  <button
                    onClick={() => onStop(agent.id)}
                    className="absolute right-2 top-2 p-1.5 rounded text-ag-faint opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-ag-danger hover:bg-ag-border"
                    title={t.stopTitle}
                    aria-label={t.stopAgent(agent.name)}
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
