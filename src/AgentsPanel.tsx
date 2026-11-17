import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { Agent, AgentsTransport, StartAgentRequest, TransportError } from './transport';
import { TransportContext } from './state';
import * as ws from './workspace';
import { AgentList } from './AgentList';
import { AgentWorkspace } from './AgentWorkspace';
import { StartAgentDialog } from './StartAgentDialog';
import { ChatInput } from './ChatInput';
import { ConfirmDialog } from './ConfirmDialog';
import { refreshTerminalTheme } from './AgentTerminal';
import { LabelsContext, locales, type Labels, type Locale } from './labels';

export interface AgentsPanelProps {
  transport: AgentsTransport;
  /** Folder the start dialog proposes */
  defaultCwd: string;
  /** localStorage key of the open tabs and splits; null keeps them in memory only */
  storageKey?: string | null;
  /** List heading (default: the locale's "Agents") */
  title?: string;
  /** Below this own width the panel shows list or panes, not both (it reacts to its container) */
  narrowBelowPx?: number;
  className?: string;
  /** Built-in texts: 'en' (default) or 'de' */
  locale?: Locale;
  /** Overrides single texts of the locale */
  labels?: Partial<Labels>;
  /**
   * Opens this agent (in its tab, or a new one) whenever the value changes and the agent is
   * listed; pass it once as an initial selection or keep it in sync with onSelectedIdChange.
   */
  selectedId?: string | null;
  /** The agent of the active pane changed (null: nothing open) */
  onSelectedIdChange?: (id: string | null) => void;
  /** false protects an agent: no stop button, and stop requests are ignored (default: all stoppable) */
  canStop?: (agent: Agent) => boolean;
  /** Ask before stopping (default true) */
  confirmStop?: boolean;
  /** Terminal font-family chain; default a Nerd Font chain with plain monospace fallbacks */
  terminalFont?: string;
}

function readStored(key: string | null): ws.Workspace {
  if (!key) return ws.EMPTY_WORKSPACE;
  try {
    return ws.migrateWorkspace(JSON.parse(localStorage.getItem(key) ?? 'null'));
  } catch {
    return ws.EMPTY_WORKSPACE;
  }
}

/** Width of an element, live (container, not viewport: the panel may sit in a side bar) */
function useWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(Infinity);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/** The whole agents view: list, tabs with split panes of terminals, chat input, start dialog */
export const AgentsPanel: React.FC<AgentsPanelProps> = ({
  transport,
  defaultCwd,
  storageKey = 'agents-ui:workspace',
  title,
  narrowBelowPx = 720,
  className = '',
  locale = 'en',
  labels,
  selectedId,
  onSelectedIdChange,
  canStop,
  confirmStop = true,
  terminalFont,
}) => {
  const t = useMemo(() => ({ ...locales[locale], ...labels }), [locale, labels]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [workspace, setWorkspace] = useState(() => readStored(storageKey));
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<TransportError | null>(null);
  const [retries, setRetries] = useState(0);
  const [confirming, setConfirming] = useState<Agent | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'panes'>('list');
  const rootRef = useRef<HTMLDivElement>(null);
  const narrow = useWidth(rootRef) < narrowBelowPx;

  useEffect(
    () =>
      transport.subscribe(
        (list) => {
          setAgents(list);
          setLoaded(true);
          setListError(null);
        },
        (err) => setListError(err)
      ),
    [transport, retries]
  );

  // Panes of agents that are gone close once the list is known
  useEffect(() => {
    if (loaded) setWorkspace((w) => ws.pruneMissing(w, new Set(agents.map((a) => a.id))));
  }, [agents, loaded]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(workspace));
    } catch {
      // storage full or blocked: the layout just is not remembered
    }
  }, [workspace, storageKey]);

  const apply = useCallback(
    <A extends unknown[]>(fn: (w: ws.Workspace, ...args: A) => ws.Workspace) =>
      (...args: A) =>
        setWorkspace((w) => fn(w, ...args)),
    []
  );

  const open = (id: string) => {
    setWorkspace((w) => ws.openSession(w, id));
    setMobileView('panes');
  };

  const stoppable = (agent: Agent) => canStop?.(agent) ?? true;
  const doStop = (id: string) => {
    setError(null);
    transport.stop(id).catch((err) => setError(t.stopFailed(String(err?.message ?? err))));
  };
  const stop = (id: string) => {
    const agent = agents.find((a) => a.id === id);
    if (!agent || !stoppable(agent)) return;
    if (confirmStop) setConfirming(agent);
    else doStop(id);
  };

  const start = async (request: StartAgentRequest) => {
    const { id } = await transport.start(request);
    setStarting(false);
    open(id);
  };

  const activeTab = workspace.tabs.find((t) => t.id === workspace.activeTabId);
  const activeId = activeTab?.activeSessionId ?? null;
  const activeAgent = agents.find((a) => a.id === activeId) ?? null;
  const openIds = useMemo(
    () => new Set(workspace.tabs.flatMap((t) => t.panes)),
    [workspace.tabs]
  );

  // selectedId: open the agent once per new value, as soon as it is listed. Until it is active,
  // nothing is reported, so a host syncing both does not get the stored layout's agent back
  const appliedSelection = useRef<string | null | undefined>(undefined);
  const awaiting = useRef<string | null>(null);
  if (selectedId && selectedId !== appliedSelection.current && selectedId !== awaiting.current)
    awaiting.current = selectedId;
  useEffect(() => {
    if (!selectedId) {
      appliedSelection.current = selectedId;
      return;
    }
    if (selectedId === appliedSelection.current || !agents.some((a) => a.id === selectedId)) return;
    appliedSelection.current = selectedId;
    if (selectedId !== activeId) open(selectedId);
    // open only sets state; activeId is read, not a trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, agents]);

  const reportSelection = useRef(onSelectedIdChange);
  reportSelection.current = onSelectedIdChange;
  const lastReported = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!loaded) return;
    const pending = awaiting.current;
    if (pending) {
      // an id that is not listed can never become active: stop waiting for it
      if (pending !== activeId && agents.some((a) => a.id === pending)) return;
      awaiting.current = null;
    }
    if (lastReported.current === undefined && activeId === null) {
      lastReported.current = null;
      return;
    }
    if (activeId === lastReported.current) return;
    lastReported.current = activeId;
    reportSelection.current?.(activeId);
  }, [activeId, loaded, agents]);

  // the font sits on our own root, which the theme watcher does not observe
  useEffect(() => {
    if (terminalFont) refreshTerminalTheme();
  }, [terminalFont]);

  const showList = !narrow || mobileView === 'list';
  const showPanes = !narrow || mobileView === 'panes';

  return (
    <LabelsContext.Provider value={t}>
    <TransportContext.Provider value={transport}>
      <div
        ref={rootRef}
        style={terminalFont ? ({ '--agents-mono': terminalFont } as React.CSSProperties) : undefined}
        className={`agents-ui relative flex h-full min-h-0 w-full overflow-hidden bg-ag-bg text-ag-text ${className}`}
      >
        {showList && (
          <aside
            className={`${narrow ? 'w-full' : 'w-[300px] border-r border-ag-border'} shrink-0 min-h-0`}
          >
            <AgentList
              agents={agents}
              openIds={openIds}
              activeId={activeId}
              loaded={loaded}
              error={listError}
              onRetry={() => setRetries((n) => n + 1)}
              title={title ?? t.title}
              onOpen={open}
              onStop={stop}
              canStop={canStop}
              onNew={() => setStarting(true)}
            />
          </aside>
        )}
        {/* stays mounted while the narrow list shows, so terminals keep their channels */}
        <section
          className={`${showPanes ? 'flex' : 'hidden'} flex-1 min-w-0 min-h-0 flex-col`}
          aria-label={t.openAgents}
        >
          {narrow && (
            <button
              onClick={() => setMobileView('list')}
              className="flex items-center gap-1 px-3 h-9 text-sm text-ag-accent border-b border-ag-border shrink-0 text-left"
            >
              <ChevronLeft size={14} aria-hidden="true" /> {t.allAgents}
            </button>
          )}
          <div className="flex-1 min-h-0">
            <AgentWorkspace
              agents={agents}
              workspace={workspace}
              onActivateTab={apply(ws.activateTab)}
              onFocusPane={apply(ws.focusSession)}
              onClosePane={apply(ws.closeSession)}
              onCloseTab={apply(ws.closeTab)}
              onMoveTab={apply(ws.moveTab)}
              onSplit={apply(ws.splitInto)}
              onDetach={apply(ws.detachSession)}
              onSetLayout={apply(ws.setTabLayout)}
            />
          </div>
          <ChatInput target={activeAgent} />
        </section>
        {error && (
          <div
            role="alert"
            className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 max-w-[90%] rounded-md border border-ag-danger/50 bg-ag-surface px-3 py-2 text-xs text-ag-danger shadow-lg"
            onClick={() => setError(null)}
          >
            {error}
          </div>
        )}
        {confirming && (
          <ConfirmDialog
            title={t.confirmStopTitle}
            body={t.confirmStopBody(confirming.name)}
            confirm={t.confirmStop}
            onCancel={() => setConfirming(null)}
            onConfirm={() => {
              doStop(confirming.id);
              setConfirming(null);
            }}
          />
        )}
        {starting && (
          <StartAgentDialog
            defaultCwd={defaultCwd}
            onStart={start}
            onClose={() => setStarting(false)}
          />
        )}
      </div>
    </TransportContext.Provider>
    </LabelsContext.Provider>
  );
};
