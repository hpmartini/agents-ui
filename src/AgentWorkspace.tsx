import React, { useEffect, useRef, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { X, Columns2, Rows2, LayoutGrid, Bot } from 'lucide-react';
import type { Agent } from './transport';
import { stateGlyph } from './state';
import {
  AGENT_TAB_MIME,
  dropZone,
  prunedRoot,
  insertPosition,
  stepIndices,
  tabTitle,
  type DropZone,
  type InsertPosition,
  type PaneLayout,
  type SplitNode,
  type Workspace,
  type WorkspaceTab,
} from './workspace';
import { AgentTerminal } from './AgentTerminal';

export interface AgentWorkspaceProps {
  agents: Agent[];
  workspace: Workspace;
  onActivateTab: (tabId: string) => void;
  onFocusPane: (agentId: string) => void;
  onClosePane: (agentId: string) => void;
  onCloseTab: (tabId: string) => void;
  onMoveTab: (tabId: string, targetId: string, position: InsertPosition) => void;
  onSplit: (agentId: string, targetId: string, zone: DropZone) => void;
  onDetach: (agentId: string) => void;
  onSetLayout: (tabId: string, layout: PaneLayout) => void;
  /** Shown while no tab is open */
  emptyState?: React.ReactNode;
}

/** What is being dragged: a whole tab (moves its active agent on split) or one pane */
interface DragState {
  kind: 'tab' | 'pane';
  /** tab id for tabs, agent id for panes */
  id: string;
  agentId: string;
}

interface ResolvedTab {
  tab: WorkspaceTab;
  agents: Agent[];
  /** The tab's split tree without panes whose agent is not listed */
  root: SplitNode;
}

const LAYOUTS: { id: PaneLayout; icon: React.ReactNode; label: string }[] = [
  { id: 'columns', icon: <Columns2 size={14} />, label: 'Panes side by side' },
  { id: 'rows', icon: <Rows2 size={14} />, label: 'Panes stacked' },
  { id: 'grid', icon: <LayoutGrid size={14} />, label: 'Panes in a grid' },
];

const ZONE_HIGHLIGHT: Record<DropZone, string> = {
  left: 'inset-y-0 left-0 w-1/2',
  right: 'inset-y-0 right-0 w-1/2',
  top: 'inset-x-0 top-0 h-1/2',
  bottom: 'inset-x-0 bottom-0 h-1/2',
};

/** Panes narrower than this are unreadable terminals: stack them instead */
const MIN_PANE_PX = 400;

const isAgentDrag = (e: React.DragEvent) => e.dataTransfer.types.includes(AGENT_TAB_MIME);

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ag-accent focus-visible:ring-inset';

/** Covers a pane while something is dragged; the pointer's nearest edge picks the split side */
const SplitOverlay: React.FC<{ onDropZone: (zone: DropZone) => void }> = ({ onDropZone }) => {
  const [zone, setZone] = useState<DropZone | null>(null);
  const zoneAt = (e: React.DragEvent) =>
    dropZone(e.currentTarget.getBoundingClientRect(), e.clientX, e.clientY);
  return (
    <div
      className="absolute inset-0 z-20"
      onDragOver={(e) => {
        if (!isAgentDrag(e)) return;
        e.preventDefault();
        setZone(zoneAt(e));
      }}
      onDragLeave={() => setZone(null)}
      onDrop={(e) => {
        if (!isAgentDrag(e)) return;
        e.preventDefault();
        setZone(null);
        onDropZone(zoneAt(e));
      }}
    >
      {zone && (
        <div
          className={`absolute ${ZONE_HIGHLIGHT[zone]} bg-ag-accent/25 border border-ag-accent/60 pointer-events-none`}
        />
      )}
    </div>
  );
};

/**
 * Attached agents (from Orkumo). Tabs and panes are decoupled: a tab holds one or more panes (a
 * split), and splitting moves an agent into another tab instead of creating a tab. Drag a tab or
 * pane header onto a pane edge to split; drag a pane header onto the empty tab strip to give it
 * its own tab again.
 */
export const AgentWorkspace: React.FC<AgentWorkspaceProps> = ({
  agents,
  workspace,
  onActivateTab,
  onFocusPane,
  onClosePane,
  onCloseTab,
  onMoveTab,
  onSplit,
  onDetach,
  onSetLayout,
  emptyState,
}) => {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: InsertPosition } | null>(
    null
  );
  const [endHot, setEndHot] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const stripRef = useRef<HTMLDivElement>(null);
  const refocusId = useRef<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyWidth, setBodyWidth] = useState(Infinity);

  // Tabs whose agents have not loaded yet stay in the stored workspace but are not shown
  const byId = new Map(agents.map((a) => [a.id, a]));
  const tabs: ResolvedTab[] = workspace.tabs
    .map((tab) => {
      const resolved = tab.panes.map((id) => byId.get(id)).filter((a): a is Agent => !!a);
      const root = prunedRoot(tab.root, (id) => byId.has(id));
      return root && { tab, agents: resolved, root };
    })
    .filter((t): t is ResolvedTab => !!t);
  const order = tabs.map((t) => t.tab.id);
  const activeTabId = order.includes(workspace.activeTabId ?? '')
    ? workspace.activeTabId
    : (order[0] ?? null);

  const noTabs = tabs.length === 0;
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setBodyWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, [noTabs]);

  const findTab = (id: string) =>
    stripRef.current?.querySelector<HTMLElement>(`[data-tab-id="${window.CSS.escape(id)}"]`);

  // Keep the active tab visible in an overflowing strip
  useEffect(() => {
    if (activeTabId) findTab(activeTabId)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTabId, order.length]);

  // A keyboard move re-parents the DOM node, which drops focus
  useEffect(() => {
    if (refocusId.current) findTab(refocusId.current)?.focus();
    refocusId.current = null;
  }, [order.join('|')]);

  const finishDrag = () => {
    setDrag(null);
    setDropTarget(null);
    setEndHot(false);
  };

  // dragend never fires when the dragged node unmounts mid-drag; a stuck drag leaves the
  // full-size SplitOverlay over every pane.
  useEffect(() => {
    if (!drag) return;
    const stop = () => finishDrag();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && stop();
    window.addEventListener('dragend', stop);
    window.addEventListener('drop', stop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('dragend', stop);
      window.removeEventListener('drop', stop);
      window.removeEventListener('keydown', onKey);
    };
  }, [drag]);
  useEffect(() => {
    if (drag && !byId.has(drag.agentId)) finishDrag();
  }, [drag, agents]);

  const dragProps = (state: DragState) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(AGENT_TAB_MIME, state.id);
      e.dataTransfer.effectAllowed = 'move';
      setDrag(state);
    },
    onDragEnd: finishDrag,
  });

  /** Button variant: merge a single-pane tab into its neighbour tab as a split */
  const splitOut = (tabId: string, zone: 'right' | 'bottom') => {
    const index = order.indexOf(tabId);
    const source = tabs[index];
    const anchor = tabs[index + 1] ?? tabs[index - 1];
    if (source && anchor) onSplit(source.tab.activeSessionId, anchor.tab.activeSessionId, zone);
  };

  if (tabs.length === 0) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <div className="h-full flex flex-col items-center justify-center text-ag-muted gap-3 p-8 text-center">
        <Bot size={40} className="text-ag-faint" />
        <div className="text-sm">No agent open. Pick one in the list to open it in a tab.</div>
        <div className="text-xs text-ag-faint">
          Drag one tab onto another pane to work with several agents side by side.
        </div>
      </div>
    );
  }

  const renderPane = ({ tab, agents: panes }: ResolvedTab, agent: Agent, visible: boolean) => {
    const multi = panes.length > 1;
    const dragHeader = multi
      ? {
          ...dragProps({ kind: 'pane', id: agent.id, agentId: agent.id }),
          className: drag?.id === agent.id ? 'opacity-50' : '',
          title: 'Drag onto a pane edge to rearrange, or onto the tab strip for its own tab',
        }
      : undefined;
    return (
      <div className="relative h-full min-h-0">
        <AgentTerminal
          agent={agent}
          visible={visible}
          active={agent.id === tab.activeSessionId}
          onFocus={() => onFocusPane(agent.id)}
          onClose={() => onClosePane(agent.id)}
          onMaximize={multi ? () => onDetach(agent.id) : undefined}
          solo={!multi}
          headerProps={dragHeader}
        />
        {drag && drag.agentId !== agent.id && visible && (
          <SplitOverlay
            onDropZone={(zone) => (onSplit(drag.agentId, agent.id, zone), finishDrag())}
          />
        )}
      </div>
    );
  };

  /** One level of the split tree; `width` is the share of the body this node gets (estimate) */
  const renderNode = (
    resolved: ResolvedTab,
    node: SplitNode,
    visible: boolean,
    width: number
  ): React.ReactNode => {
    if ('pane' in node) {
      const agent = resolved.agents.find((a) => a.id === node.pane);
      return agent ? renderPane(resolved, agent, visible) : null;
    }
    // The stored tree stays; only the rendering stacks panes that would be too narrow
    const stacked = node.dir === 'column' || width / node.children.length < MIN_PANE_PX;
    return (
      <Group orientation={stacked ? 'vertical' : 'horizontal'} className="h-full w-full">
        {node.children.map((child, index) => (
          <React.Fragment key={child.id}>
            {index > 0 && (
              <Separator
                className={`${stacked ? 'h-1 cursor-row-resize' : 'w-1 cursor-col-resize'} bg-ag-border hover:bg-ag-accent/50 transition-colors`}
              />
            )}
            <Panel
              id={`agent-pane-${resolved.tab.id}-${child.id}`}
              minSize={10}
              className="min-h-0 min-w-0"
            >
              {renderNode(resolved, child, visible, stacked ? width : width / node.children.length)}
            </Panel>
          </React.Fragment>
        ))}
      </Group>
    );
  };

  const renderPanes = (resolved: ResolvedTab, visible: boolean) =>
    'pane' in resolved.root ? (
      renderNode(resolved, resolved.root, visible, bodyWidth)
    ) : (
      <div className="h-full p-1">{renderNode(resolved, resolved.root, visible, bodyWidth)}</div>
    );

  const dropOnTab = (targetId: string, position: InsertPosition) => {
    if (drag?.kind === 'tab') onMoveTab(drag.id, targetId, position);
    finishDrag();
  };

  const activeTab = tabs.find((t) => t.tab.id === activeTabId);

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Tab strip */}
      <div className="flex items-center bg-ag-surface border-b border-ag-border shrink-0 h-9">
        <div
          ref={stripRef}
          role="tablist"
          aria-label="Open agents"
          className="flex-1 flex items-center overflow-x-auto ag-no-scrollbar h-full"
        >
          {tabs.map(({ tab, agents: panes }) => {
            const isActive = tab.id === activeTabId;
            const lead = panes.find((a) => a.id === tab.activeSessionId) ?? panes[0];
            const needsInput = panes.some((a) => a.displayState === 'needs-input');
            const glyph = stateGlyph(needsInput ? 'needs-input' : lead.displayState);
            const title = tabTitle(panes.map((a) => a.name));
            const indicator = dropTarget?.id === tab.id ? dropTarget.position : null;
            return (
              <div
                key={tab.id}
                {...dragProps({ kind: 'tab', id: tab.id, agentId: tab.activeSessionId })}
                onDragOver={(e) => {
                  if (!isAgentDrag(e) || drag?.kind !== 'tab') return;
                  e.preventDefault();
                  setDropTarget({
                    id: tab.id,
                    position: insertPosition(e.currentTarget.getBoundingClientRect(), e.clientX),
                  });
                }}
                onDragLeave={() => setDropTarget((t) => (t?.id === tab.id ? null : t))}
                onDrop={(e) => {
                  if (drag?.kind !== 'tab') return;
                  e.preventDefault();
                  dropOnTab(tab.id, indicator ?? 'before');
                }}
                onMouseDown={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    onCloseTab(tab.id);
                  }
                }}
                className={`group relative flex items-center pl-2.5 pr-1 h-full min-w-[120px] max-w-[220px] border-r border-ag-border shrink-0 text-xs transition-colors ${
                  isActive
                    ? 'bg-ag-raised text-ag-text'
                    : 'text-ag-muted hover:bg-ag-raised/60 hover:text-ag-text'
                } ${drag?.kind === 'tab' && drag.id === tab.id ? 'opacity-40' : ''}`}
                title={panes.map((a) => `${a.name} · ${a.cwd}`).join('\n')}
              >
                {isActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-ag-accent" />}
                {indicator && (
                  <div
                    className={`absolute inset-y-1 w-0.5 rounded bg-ag-accent pointer-events-none ${
                      indicator === 'before' ? 'left-0' : 'right-0'
                    }`}
                  />
                )}
                <button
                  type="button"
                  role="tab"
                  id={`agent-tab-${tab.id}`}
                  data-tab-id={tab.id}
                  aria-selected={isActive}
                  aria-controls={`agent-tabpanel-${tab.id}`}
                  aria-keyshortcuts="Alt+Shift+ArrowLeft Alt+Shift+ArrowRight"
                  aria-label={`${title}, ${glyph.label}${panes.length > 1 ? `, ${panes.length} panes` : ''}${needsInput ? ', needs input' : ''}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => onActivateTab(tab.id)}
                  onKeyDown={(e) => {
                    if (e.altKey && e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                      e.preventDefault();
                      const delta = e.key === 'ArrowLeft' ? -1 : 1;
                      const step = stepIndices(order, tab.id, delta);
                      if (step) {
                        refocusId.current = tab.id;
                        onMoveTab(tab.id, order[step.to], delta < 0 ? 'before' : 'after');
                        setAnnouncement(`${title} moved to position ${step.to + 1} of ${order.length}`);
                      }
                      return;
                    }
                    const at = order.indexOf(tab.id);
                    const next =
                      e.key === 'ArrowLeft'
                        ? at - 1
                        : e.key === 'ArrowRight'
                          ? at + 1
                          : e.key === 'Home'
                            ? 0
                            : e.key === 'End'
                              ? order.length - 1
                              : -1;
                    if (next >= 0 && next < order.length && !e.altKey) {
                      e.preventDefault();
                      onActivateTab(order[next]);
                      findTab(order[next])?.focus();
                    }
                  }}
                  className={`flex items-center gap-1.5 flex-1 min-w-0 h-full text-left ${focusRing}`}
                >
                  <span
                    className={`${glyph.className} ${glyph.animate ? 'animate-pulse motion-reduce:animate-none' : ''}`}
                    aria-hidden="true"
                  >
                    {glyph.glyph}
                  </span>
                  <span className="truncate flex-1">{title}</span>
                  {panes.length > 1 && (
                    <span
                      className="px-1 rounded bg-ag-border text-[10px] leading-4 text-ag-text shrink-0"
                      aria-hidden="true"
                    >
                      {panes.length}
                    </span>
                  )}
                  {needsInput && (
                    <span className="w-2 h-2 rounded-full bg-ag-warn shrink-0" aria-hidden="true" />
                  )}
                </button>
                <span
                  className={`flex items-center shrink-0 ${
                    isActive ? '' : 'opacity-0'
                  } group-hover:opacity-100 group-focus-within:opacity-100`}
                >
                  {isActive && panes.length === 1 && tabs.length > 1 && (
                    <span className="hidden group-hover:flex group-focus-within:flex items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          splitOut(tab.id, 'right');
                        }}
                        className={`p-1.5 rounded text-ag-muted hover:text-ag-text hover:bg-ag-border ${focusRing}`}
                        title="Split right (into the neighbouring tab)"
                        aria-label={`Split ${title} right`}
                      >
                        <Columns2 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          splitOut(tab.id, 'bottom');
                        }}
                        className={`p-1.5 rounded text-ag-muted hover:text-ag-text hover:bg-ag-border ${focusRing}`}
                        title="Split down (into the neighbouring tab)"
                        aria-label={`Split ${title} down`}
                      >
                        <Rows2 size={12} />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className={`p-1.5 rounded hover:bg-ag-border text-ag-muted hover:text-ag-text ${focusRing}`}
                    aria-label={`Close ${title}`}
                    title="Close"
                  >
                    <X size={12} />
                  </button>
                </span>
              </div>
            );
          })}
          {/* Empty strip: a tab dropped here moves to the end, a pane gets its own tab */}
          <div
            className={`flex-1 min-w-8 h-full ${endHot ? 'bg-ag-accent/20' : ''}`}
            onDragOver={(e) => {
              if (!isAgentDrag(e) || !drag) return;
              e.preventDefault();
              if (drag.kind === 'tab') setDropTarget({ id: order[order.length - 1], position: 'after' });
              else setEndHot(true);
            }}
            onDragLeave={() => {
              setDropTarget(null);
              setEndHot(false);
            }}
            onDrop={(e) => {
              if (!drag) return;
              e.preventDefault();
              if (drag.kind === 'pane') onDetach(drag.agentId);
              dropOnTab(order[order.length - 1], 'after');
            }}
          />
        </div>
        {activeTab && activeTab.agents.length > 1 && (
          <div className="flex items-center gap-0.5 px-1 shrink-0" role="group" aria-label="Pane layout">
            {LAYOUTS.map((item) => (
              <button
                key={item.id}
                onClick={() => onSetLayout(activeTab.tab.id, item.id)}
                className={`p-1.5 rounded transition-colors ${focusRing} ${
                  activeTab.tab.layout === item.id
                    ? 'bg-ag-border text-ag-text'
                    : 'text-ag-muted hover:text-ag-text hover:bg-ag-raised'
                }`}
                title={item.label}
                aria-label={item.label}
                aria-pressed={activeTab.tab.layout === item.id}
              >
                {item.icon}
              </button>
            ))}
          </div>
        )}
        <div className="sr-only" aria-live="polite">
          {announcement}
        </div>
      </div>

      {/* Tab contents: every tab stays mounted so terminals keep their channels */}
      <div ref={bodyRef} className="relative flex-1 min-h-0">
        {tabs.map((resolved) => {
          const { tab } = resolved;
          const visible = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              role="tabpanel"
              id={`agent-tabpanel-${tab.id}`}
              aria-labelledby={`agent-tab-${tab.id}`}
              className={`absolute inset-0 flex-col min-h-0 ${visible ? 'flex' : 'hidden'}`}
            >
              <div className="flex-1 min-h-0">{renderPanes(resolved, visible)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
