import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useRef, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { X, Columns2, Rows2, LayoutGrid, Bot } from 'lucide-react';
import { stateGlyph } from './state';
import { AGENT_TAB_MIME, dropZone, prunedRoot, insertPosition, stepIndices, tabTitle, } from './workspace';
import { AgentTerminal } from './AgentTerminal';
const LAYOUTS = [
    { id: 'columns', icon: _jsx(Columns2, { size: 14 }), label: 'Panes side by side' },
    { id: 'rows', icon: _jsx(Rows2, { size: 14 }), label: 'Panes stacked' },
    { id: 'grid', icon: _jsx(LayoutGrid, { size: 14 }), label: 'Panes in a grid' },
];
const ZONE_HIGHLIGHT = {
    left: 'inset-y-0 left-0 w-1/2',
    right: 'inset-y-0 right-0 w-1/2',
    top: 'inset-x-0 top-0 h-1/2',
    bottom: 'inset-x-0 bottom-0 h-1/2',
};
/** Panes narrower than this are unreadable terminals: stack them instead */
const MIN_PANE_PX = 400;
const isAgentDrag = (e) => e.dataTransfer.types.includes(AGENT_TAB_MIME);
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ag-accent focus-visible:ring-inset';
/** Covers a pane while something is dragged; the pointer's nearest edge picks the split side */
const SplitOverlay = ({ onDropZone }) => {
    const [zone, setZone] = useState(null);
    const zoneAt = (e) => dropZone(e.currentTarget.getBoundingClientRect(), e.clientX, e.clientY);
    return (_jsx("div", { className: "absolute inset-0 z-20", onDragOver: (e) => {
            if (!isAgentDrag(e))
                return;
            e.preventDefault();
            setZone(zoneAt(e));
        }, onDragLeave: () => setZone(null), onDrop: (e) => {
            if (!isAgentDrag(e))
                return;
            e.preventDefault();
            setZone(null);
            onDropZone(zoneAt(e));
        }, children: zone && (_jsx("div", { className: `absolute ${ZONE_HIGHLIGHT[zone]} bg-ag-accent/25 border border-ag-accent/60 pointer-events-none` })) }));
};
/**
 * Attached agents (from Orkumo). Tabs and panes are decoupled: a tab holds one or more panes (a
 * split), and splitting moves an agent into another tab instead of creating a tab. Drag a tab or
 * pane header onto a pane edge to split; drag a pane header onto the empty tab strip to give it
 * its own tab again.
 */
export const AgentWorkspace = ({ agents, workspace, onActivateTab, onFocusPane, onClosePane, onCloseTab, onMoveTab, onSplit, onDetach, onSetLayout, emptyState, }) => {
    const [drag, setDrag] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
    const [endHot, setEndHot] = useState(false);
    const [announcement, setAnnouncement] = useState('');
    const stripRef = useRef(null);
    const refocusId = useRef(null);
    const bodyRef = useRef(null);
    const [bodyWidth, setBodyWidth] = useState(Infinity);
    // Tabs whose agents have not loaded yet stay in the stored workspace but are not shown
    const byId = new Map(agents.map((a) => [a.id, a]));
    const tabs = workspace.tabs
        .map((tab) => {
        const resolved = tab.panes.map((id) => byId.get(id)).filter((a) => !!a);
        const root = prunedRoot(tab.root, (id) => byId.has(id));
        return root && { tab, agents: resolved, root };
    })
        .filter((t) => !!t);
    const order = tabs.map((t) => t.tab.id);
    const activeTabId = order.includes(workspace.activeTabId ?? '')
        ? workspace.activeTabId
        : (order[0] ?? null);
    const noTabs = tabs.length === 0;
    useEffect(() => {
        const el = bodyRef.current;
        if (!el)
            return;
        const observer = new ResizeObserver(() => setBodyWidth(el.clientWidth));
        observer.observe(el);
        return () => observer.disconnect();
    }, [noTabs]);
    const findTab = (id) => stripRef.current?.querySelector(`[data-tab-id="${window.CSS.escape(id)}"]`);
    // Keep the active tab visible in an overflowing strip
    useEffect(() => {
        if (activeTabId)
            findTab(activeTabId)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [activeTabId, order.length]);
    // A keyboard move re-parents the DOM node, which drops focus
    useEffect(() => {
        if (refocusId.current)
            findTab(refocusId.current)?.focus();
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
        if (!drag)
            return;
        const stop = () => finishDrag();
        const onKey = (e) => e.key === 'Escape' && stop();
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
        if (drag && !byId.has(drag.agentId))
            finishDrag();
    }, [drag, agents]);
    const dragProps = (state) => ({
        draggable: true,
        onDragStart: (e) => {
            e.dataTransfer.setData(AGENT_TAB_MIME, state.id);
            e.dataTransfer.effectAllowed = 'move';
            setDrag(state);
        },
        onDragEnd: finishDrag,
    });
    /** Button variant: merge a single-pane tab into its neighbour tab as a split */
    const splitOut = (tabId, zone) => {
        const index = order.indexOf(tabId);
        const source = tabs[index];
        const anchor = tabs[index + 1] ?? tabs[index - 1];
        if (source && anchor)
            onSplit(source.tab.activeSessionId, anchor.tab.activeSessionId, zone);
    };
    if (tabs.length === 0) {
        if (emptyState)
            return _jsx(_Fragment, { children: emptyState });
        return (_jsxs("div", { className: "h-full flex flex-col items-center justify-center text-ag-muted gap-3 p-8 text-center", children: [_jsx(Bot, { size: 40, className: "text-ag-faint" }), _jsx("div", { className: "text-sm", children: "No agent open. Pick one in the list to open it in a tab." }), _jsx("div", { className: "text-xs text-ag-faint", children: "Drag one tab onto another pane to work with several agents side by side." })] }));
    }
    const renderPane = ({ tab, agents: panes }, agent, visible) => {
        const multi = panes.length > 1;
        const dragHeader = multi
            ? {
                ...dragProps({ kind: 'pane', id: agent.id, agentId: agent.id }),
                className: drag?.id === agent.id ? 'opacity-50' : '',
                title: 'Drag onto a pane edge to rearrange, or onto the tab strip for its own tab',
            }
            : undefined;
        return (_jsxs("div", { className: "relative h-full min-h-0", children: [_jsx(AgentTerminal, { agent: agent, visible: visible, active: agent.id === tab.activeSessionId, onFocus: () => onFocusPane(agent.id), onClose: () => onClosePane(agent.id), onMaximize: multi ? () => onDetach(agent.id) : undefined, solo: !multi, headerProps: dragHeader }), drag && drag.agentId !== agent.id && visible && (_jsx(SplitOverlay, { onDropZone: (zone) => (onSplit(drag.agentId, agent.id, zone), finishDrag()) }))] }));
    };
    /** One level of the split tree; `width` is the share of the body this node gets (estimate) */
    const renderNode = (resolved, node, visible, width) => {
        if ('pane' in node) {
            const agent = resolved.agents.find((a) => a.id === node.pane);
            return agent ? renderPane(resolved, agent, visible) : null;
        }
        // The stored tree stays; only the rendering stacks panes that would be too narrow
        const stacked = node.dir === 'column' || width / node.children.length < MIN_PANE_PX;
        return (_jsx(Group, { orientation: stacked ? 'vertical' : 'horizontal', className: "h-full w-full", children: node.children.map((child, index) => (_jsxs(React.Fragment, { children: [index > 0 && (_jsx(Separator, { className: `${stacked ? 'h-1 cursor-row-resize' : 'w-1 cursor-col-resize'} bg-ag-border hover:bg-ag-accent/50 transition-colors` })), _jsx(Panel, { id: `agent-pane-${resolved.tab.id}-${child.id}`, minSize: 10, className: "min-h-0 min-w-0", children: renderNode(resolved, child, visible, stacked ? width : width / node.children.length) })] }, child.id))) }));
    };
    const renderPanes = (resolved, visible) => 'pane' in resolved.root ? (renderNode(resolved, resolved.root, visible, bodyWidth)) : (_jsx("div", { className: "h-full p-1", children: renderNode(resolved, resolved.root, visible, bodyWidth) }));
    const dropOnTab = (targetId, position) => {
        if (drag?.kind === 'tab')
            onMoveTab(drag.id, targetId, position);
        finishDrag();
    };
    const activeTab = tabs.find((t) => t.tab.id === activeTabId);
    return (_jsxs("div", { className: "h-full flex flex-col min-h-0", children: [_jsxs("div", { className: "flex items-center bg-ag-surface border-b border-ag-border shrink-0 h-9", children: [_jsxs("div", { ref: stripRef, role: "tablist", "aria-label": "Open agents", className: "flex-1 flex items-center overflow-x-auto ag-no-scrollbar h-full", children: [tabs.map(({ tab, agents: panes }) => {
                                const isActive = tab.id === activeTabId;
                                const lead = panes.find((a) => a.id === tab.activeSessionId) ?? panes[0];
                                const needsInput = panes.some((a) => a.displayState === 'needs-input');
                                const glyph = stateGlyph(needsInput ? 'needs-input' : lead.displayState);
                                const title = tabTitle(panes.map((a) => a.name));
                                const indicator = dropTarget?.id === tab.id ? dropTarget.position : null;
                                return (_jsxs("div", { ...dragProps({ kind: 'tab', id: tab.id, agentId: tab.activeSessionId }), onDragOver: (e) => {
                                        if (!isAgentDrag(e) || drag?.kind !== 'tab')
                                            return;
                                        e.preventDefault();
                                        setDropTarget({
                                            id: tab.id,
                                            position: insertPosition(e.currentTarget.getBoundingClientRect(), e.clientX),
                                        });
                                    }, onDragLeave: () => setDropTarget((t) => (t?.id === tab.id ? null : t)), onDrop: (e) => {
                                        if (drag?.kind !== 'tab')
                                            return;
                                        e.preventDefault();
                                        dropOnTab(tab.id, indicator ?? 'before');
                                    }, onMouseDown: (e) => {
                                        if (e.button === 1) {
                                            e.preventDefault();
                                            onCloseTab(tab.id);
                                        }
                                    }, className: `group relative flex items-center pl-2.5 pr-1 h-full min-w-[120px] max-w-[220px] border-r border-ag-border shrink-0 text-xs transition-colors ${isActive
                                        ? 'bg-ag-raised text-ag-text'
                                        : 'text-ag-muted hover:bg-ag-raised/60 hover:text-ag-text'} ${drag?.kind === 'tab' && drag.id === tab.id ? 'opacity-40' : ''}`, title: panes.map((a) => `${a.name} · ${a.cwd}`).join('\n'), children: [isActive && _jsx("div", { className: "absolute top-0 left-0 right-0 h-0.5 bg-ag-accent" }), indicator && (_jsx("div", { className: `absolute inset-y-1 w-0.5 rounded bg-ag-accent pointer-events-none ${indicator === 'before' ? 'left-0' : 'right-0'}` })), _jsxs("button", { type: "button", role: "tab", id: `agent-tab-${tab.id}`, "data-tab-id": tab.id, "aria-selected": isActive, "aria-controls": `agent-tabpanel-${tab.id}`, "aria-keyshortcuts": "Alt+Shift+ArrowLeft Alt+Shift+ArrowRight", "aria-label": `${title}, ${glyph.label}${panes.length > 1 ? `, ${panes.length} panes` : ''}${needsInput ? ', needs input' : ''}`, tabIndex: isActive ? 0 : -1, onClick: () => onActivateTab(tab.id), onKeyDown: (e) => {
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
                                                const next = e.key === 'ArrowLeft'
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
                                            }, className: `flex items-center gap-1.5 flex-1 min-w-0 h-full text-left ${focusRing}`, children: [_jsx("span", { className: `${glyph.className} ${glyph.animate ? 'animate-pulse motion-reduce:animate-none' : ''}`, "aria-hidden": "true", children: glyph.glyph }), _jsx("span", { className: "truncate flex-1", children: title }), panes.length > 1 && (_jsx("span", { className: "px-1 rounded bg-ag-border text-[10px] leading-4 text-ag-text shrink-0", "aria-hidden": "true", children: panes.length })), needsInput && (_jsx("span", { className: "w-2 h-2 rounded-full bg-ag-warn shrink-0", "aria-hidden": "true" }))] }), _jsxs("span", { className: `flex items-center shrink-0 ${isActive ? '' : 'opacity-0'} group-hover:opacity-100 group-focus-within:opacity-100`, children: [isActive && panes.length === 1 && tabs.length > 1 && (_jsxs("span", { className: "hidden group-hover:flex group-focus-within:flex items-center", children: [_jsx("button", { onClick: (e) => {
                                                                e.stopPropagation();
                                                                splitOut(tab.id, 'right');
                                                            }, className: `p-1.5 rounded text-ag-muted hover:text-ag-text hover:bg-ag-border ${focusRing}`, title: "Split right (into the neighbouring tab)", "aria-label": `Split ${title} right`, children: _jsx(Columns2, { size: 12 }) }), _jsx("button", { onClick: (e) => {
                                                                e.stopPropagation();
                                                                splitOut(tab.id, 'bottom');
                                                            }, className: `p-1.5 rounded text-ag-muted hover:text-ag-text hover:bg-ag-border ${focusRing}`, title: "Split down (into the neighbouring tab)", "aria-label": `Split ${title} down`, children: _jsx(Rows2, { size: 12 }) })] })), _jsx("button", { onClick: (e) => {
                                                        e.stopPropagation();
                                                        onCloseTab(tab.id);
                                                    }, className: `p-1.5 rounded hover:bg-ag-border text-ag-muted hover:text-ag-text ${focusRing}`, "aria-label": `Close ${title}`, title: "Close", children: _jsx(X, { size: 12 }) })] })] }, tab.id));
                            }), _jsx("div", { className: `flex-1 min-w-8 h-full ${endHot ? 'bg-ag-accent/20' : ''}`, onDragOver: (e) => {
                                    if (!isAgentDrag(e) || !drag)
                                        return;
                                    e.preventDefault();
                                    if (drag.kind === 'tab')
                                        setDropTarget({ id: order[order.length - 1], position: 'after' });
                                    else
                                        setEndHot(true);
                                }, onDragLeave: () => {
                                    setDropTarget(null);
                                    setEndHot(false);
                                }, onDrop: (e) => {
                                    if (!drag)
                                        return;
                                    e.preventDefault();
                                    if (drag.kind === 'pane')
                                        onDetach(drag.agentId);
                                    dropOnTab(order[order.length - 1], 'after');
                                } })] }), activeTab && activeTab.agents.length > 1 && (_jsx("div", { className: "flex items-center gap-0.5 px-1 shrink-0", role: "group", "aria-label": "Pane layout", children: LAYOUTS.map((item) => (_jsx("button", { onClick: () => onSetLayout(activeTab.tab.id, item.id), className: `p-1.5 rounded transition-colors ${focusRing} ${activeTab.tab.layout === item.id
                                ? 'bg-ag-border text-ag-text'
                                : 'text-ag-muted hover:text-ag-text hover:bg-ag-raised'}`, title: item.label, "aria-label": item.label, "aria-pressed": activeTab.tab.layout === item.id, children: item.icon }, item.id))) })), _jsx("div", { className: "sr-only", "aria-live": "polite", children: announcement })] }), _jsx("div", { ref: bodyRef, className: "relative flex-1 min-h-0", children: tabs.map((resolved) => {
                    const { tab } = resolved;
                    const visible = tab.id === activeTabId;
                    return (_jsx("div", { role: "tabpanel", id: `agent-tabpanel-${tab.id}`, "aria-labelledby": `agent-tab-${tab.id}`, className: `absolute inset-0 flex-col min-h-0 ${visible ? 'flex' : 'hidden'}`, children: _jsx("div", { className: "flex-1 min-h-0", children: renderPanes(resolved, visible) }) }, tab.id));
                }) })] }));
};
