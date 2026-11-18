import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useRef, useState } from 'react';
import { tabSessionLabel } from '../../utils/sessionCopies';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { X, Columns2, Rows2, LayoutGrid, Bot, Maximize2, SquareTerminal, ChevronDown, Eye, EyeOff, } from 'lucide-react';
import { usePopover } from './PullRequestsPanel';
import { registerPaneBrowser } from '../../utils/links';
import { stateGlyph, resumableSessionId, sessionHarness, UI_VIEW_HARNESSES, } from '../../utils/agentSessions';
import { useHost, useTransport } from '../../host';
import { useLabels } from '../../labels';
import { LOCAL_TARGETS } from '../../transport';
import { AGENT_TAB_MIME, browserUrl, dropZone, prunedRoot, shellCwd, insertPosition, stepIndices, hiddenTabIds, tabTitle, } from '../../utils/agentWorkspace';
import { AgentTerminal } from './AgentTerminal';
import { ChatPane } from './Chat/ChatPane';
const LAYOUTS = [
    { id: 'columns', icon: _jsx(Columns2, { size: 14 }) },
    { id: 'rows', icon: _jsx(Rows2, { size: 14 }) },
    { id: 'grid', icon: _jsx(LayoutGrid, { size: 14 }) },
];
const ZONE_HIGHLIGHT = {
    left: 'inset-y-0 left-0 w-1/2',
    right: 'inset-y-0 right-0 w-1/2',
    top: 'inset-x-0 top-0 h-1/2',
    bottom: 'inset-x-0 bottom-0 h-1/2',
};
/** Panes narrower than this are unreadable terminals: stack them instead */
const MIN_PANE_PX = 400;
/** Stand-in session for a browser pane, so tab strip, titles and drag treat it like any pane */
function browserSession(id) {
    const url = browserUrl(id);
    if (url === null)
        return null;
    let host = url;
    try {
        host = new URL(url).host;
    }
    catch {
        // keep the raw url as the name
    }
    return {
        id,
        sessionId: null,
        kind: 'background',
        cwd: url,
        startedAt: 0,
        name: host,
        state: null,
        pinned: false,
        order: null,
        links: [],
        displayState: 'idle',
    };
}
/** Stand-in session for a shell pane (#207): a plain shell in `cwd`, named after the folder */
function shellSession(id) {
    const cwd = shellCwd(id);
    if (cwd === null)
        return null;
    return {
        id,
        sessionId: null,
        kind: 'interactive',
        cwd,
        startedAt: 0,
        name: cwd.split('/').filter(Boolean).pop() ?? cwd,
        state: null,
        pinned: false,
        order: null,
        links: [],
        displayState: 'idle',
    };
}
/** Built-in browser next to the agent terminals: the host's (`renderBrowser`; Orkumo: the Coding view's preview) */
export const BrowserPane = ({ url, active, onFocus, onClose, onMaximize, headerProps }) => {
    const { renderBrowser } = useHost();
    const t = useLabels().terminal;
    if (!renderBrowser)
        return null;
    return (_jsx("div", { className: `h-full flex flex-col min-h-0 rounded border ${active ? 'border-blue-500/60' : 'border-gray-800'} bg-gray-900`, onMouseDownCapture: onFocus, children: _jsx("div", { className: "flex-1 min-h-0", children: renderBrowser({
                url,
                onClose,
                closeLabel: t.closeBrowser,
                dragHandleProps: headerProps,
                actions: onMaximize && (_jsx("button", { onClick: onMaximize, className: "p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 shrink-0", title: t.ownTab, "aria-label": t.moveBrowserToOwnTab, children: _jsx(Maximize2, { size: 14 }) })),
            }) }) }));
};
const isAgentDrag = (e) => e.dataTransfer.types.includes(AGENT_TAB_MIME);
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset';
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
        }, children: zone && (_jsx("div", { className: `absolute ${ZONE_HIGHLIGHT[zone]} bg-blue-500/25 border border-blue-400/60 pointer-events-none` })) }));
};
/**
 * Attached agent sessions. Tabs and panes are decoupled: a tab holds one or more
 * panes (a split), and splitting moves a session into another tab instead of
 * creating a tab. Drag a tab or pane header onto a pane edge to split; drag a pane
 * header onto the empty tab strip to give it its own tab again.
 */
export const AgentWorkspace = ({ sessions, workspace, onActivateTab, onFocusPane, onClosePane, onCloseTab, onMoveTab, onSplit, onDetach, onSetLayout, onPeek, onOpenLink: onOpenLinkProp, focusZone, renderPaneMeta, chatSubmitKey = 'mod+enter', chatShowSteps = false, onToggleChatSteps, views = {}, onSetView, renderCustomPane, emptyState, paneNoun, hidden = false, }) => {
    const [drag, setDrag] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
    const [endHot, setEndHot] = useState(false);
    const [announcement, setAnnouncement] = useState('');
    const stripRef = useRef(null);
    const refocusId = useRef(null);
    const bodyRef = useRef(null);
    const [bodyWidth, setBodyWidth] = useState(Infinity);
    const transport = useTransport();
    const targets = transport.targets ?? LOCAL_TARGETS;
    // Without a built-in browser there are no browser panes: links go to the system browser
    const { renderBrowser } = useHost();
    const labels = useLabels();
    const t = labels.terminal;
    const onOpenLink = renderBrowser ? onOpenLinkProp : undefined;
    // Tabs whose sessions have not loaded yet stay in the stored workspace but are not shown
    const byId = new Map(sessions.map((s) => [s.id, s]));
    // (a browser pane alone is a tab of its own, #212; next to an agent it waits for the agent)
    const tabs = workspace.tabs
        .map((tab) => {
        const resolved = tab.panes
            .map((id) => byId.get(id) ?? (renderBrowser ? browserSession(id) : null) ?? shellSession(id))
            .filter((s) => !!s);
        const shown = resolved.length === tab.panes.length || resolved.some((s) => browserUrl(s.id) === null);
        const root = shown ? prunedRoot(tab.root, (id) => resolved.some((s) => s.id === id)) : null;
        return root && { tab, sessions: resolved, root };
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
    // Links in a UI view (plain anchors) open a split next to their pane, like terminal links
    const paneIds = useRef([]);
    paneIds.current = workspace.tabs.flatMap((t) => t.panes);
    useEffect(() => {
        if (!onOpenLink)
            return;
        return registerPaneBrowser((paneId, url) => {
            if (!paneIds.current.includes(paneId))
                return false;
            onOpenLink(paneId, url);
            return true;
        });
    }, [onOpenLink]);
    // Overflowing strip: the wheel scrolls it sideways, a list on the right reaches every tab
    const [hiddenTabs, setHiddenTabs] = useState([]);
    const [overflow, setOverflow] = useState(false);
    const [tabListOpen, setTabListOpen] = useState(false);
    useEffect(() => {
        const strip = stripRef.current;
        if (!strip)
            return;
        const measure = () => {
            setOverflow(strip.scrollWidth > strip.clientWidth + 1);
            const tabsEls = [...strip.querySelectorAll('[data-tab-id]')];
            const next = hiddenTabIds(strip.getBoundingClientRect(), tabsEls.map((el) => {
                const r = el.getBoundingClientRect();
                return { id: el.dataset.tabId ?? '', left: r.left, right: r.right };
            }));
            setHiddenTabs((prev) => (prev.join('|') === next.join('|') ? prev : next));
        };
        // React's onWheel is passive: preventDefault needs a native listener
        const onWheel = (e) => {
            if (strip.scrollWidth <= strip.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY))
                return;
            e.preventDefault();
            strip.scrollLeft += e.deltaY;
        };
        measure();
        strip.addEventListener('scroll', measure, { passive: true });
        strip.addEventListener('wheel', onWheel, { passive: false });
        const observer = new ResizeObserver(measure);
        observer.observe(strip);
        return () => {
            strip.removeEventListener('scroll', measure);
            strip.removeEventListener('wheel', onWheel);
            observer.disconnect();
        };
    }, [order.join('|'), noTabs]);
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
    // dragend never fires when the dragged node unmounts mid-drag (session pruned); a stuck
    // drag leaves the full-size SplitOverlay over every pane.
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
        if (drag &&
            !byId.has(drag.sessionId) &&
            browserUrl(drag.sessionId) === null &&
            shellCwd(drag.sessionId) === null)
            finishDrag();
    }, [drag, sessions]);
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
        return (_jsxs("div", { className: "h-full flex flex-col items-center justify-center text-gray-500 gap-3 p-8 text-center", children: [_jsx(Bot, { size: 40, className: "text-gray-700" }), _jsx("div", { className: "text-sm", children: t.noAgentAttached(_jsx("kbd", { className: "kbd", children: "Enter" }), _jsx("kbd", { className: "kbd", children: "\u2192" })) }), _jsx("div", { className: "text-xs text-gray-500", children: t.dragTabsHint })] }));
    }
    const renderPane = ({ tab, sessions: panes }, session, visible) => {
        const multi = panes.length > 1;
        const url = browserUrl(session.id);
        // A harness pane started here (#195): the server row that claimed it knows its state and session
        const row = sessions.find((s) => s.paneId === session.id);
        const viewSessionId = resumableSessionId(session, targets) ?? (row ? resumableSessionId(row, targets) : null);
        const viewable = !!transport.chat &&
            url === null &&
            shellCwd(session.id) === null &&
            UI_VIEW_HARNESSES[sessionHarness(session)] &&
            !session.ptyArgs?.includes('--cloud') &&
            // #220: the transcript lives on the instance the pane runs on
            targets.targetOf(session.id) === targets.getAgentTarget();
        const chatView = viewable && views[session.id] === 'chat';
        const active = session.id === tab.activeSessionId;
        const focused = visible && focusZone === 'terminal' && active;
        const dragHeader = multi
            ? {
                ...dragProps({ kind: 'pane', id: session.id, sessionId: session.id }),
                className: drag?.id === session.id ? 'opacity-50' : '',
            }
            : undefined;
        const custom = renderCustomPane?.(session, {
            active,
            visible,
            onFocus: () => onFocusPane(session.id),
            onClose: () => onClosePane(session.id),
            onMaximize: multi ? () => onDetach(session.id) : undefined,
            headerProps: dragHeader,
        });
        return (_jsxs("div", { className: "relative h-full min-h-0", children: [custom ? (custom) : url !== null ? (_jsx(BrowserPane, { url: url, active: active, onFocus: () => onFocusPane(session.id), onClose: () => onClosePane(session.id), onMaximize: multi ? () => onDetach(session.id) : undefined, headerProps: dragHeader })) : (
                // The terminal stays mounted under the UI view: its PTY is the agent
                _jsx("div", { className: `h-full ${chatView ? 'invisible' : ''}`, "aria-hidden": chatView, children: _jsx(AgentTerminal, { session: session, visible: visible && !chatView, active: active && !chatView, focused: focused && !chatView, onFocus: () => onFocusPane(session.id), onClose: () => onClosePane(session.id), onPeek: onPeek && (() => onPeek(session.id)), onMaximize: multi ? () => onDetach(session.id) : undefined, solo: !multi, meta: renderPaneMeta?.(session), onOpenLink: onOpenLink && ((link) => onOpenLink(session.id, link)), onShowChat: viewable && onSetView ? () => onSetView(session.id, 'chat') : undefined, headerProps: dragHeader && {
                            ...dragHeader,
                            title: t.dragPaneTitle,
                        } }) })), chatView && !custom && (_jsx("div", { className: "absolute inset-0", children: _jsx(ChatPane, { pane: session, agent: row ?? session, sessionId: viewSessionId, active: active, focused: focused, submitKey: chatSubmitKey, showSteps: chatShowSteps, onToggleSteps: () => onToggleChatSteps?.(), onFocus: () => onFocusPane(session.id), onClose: () => onClosePane(session.id), onMaximize: multi ? () => onDetach(session.id) : undefined, onShowTerminal: () => onSetView?.(session.id, 'terminal'), headerProps: dragHeader }) })), drag && drag.sessionId !== session.id && visible && (_jsx(SplitOverlay, { onDropZone: (zone) => (onSplit(drag.sessionId, session.id, zone), finishDrag()) }))] }));
    };
    /** One level of the split tree; `width` is the share of the body this node gets (estimate) */
    const renderNode = (resolved, node, visible, width) => {
        if ('pane' in node) {
            const session = resolved.sessions.find((s) => s.id === node.pane);
            return session ? renderPane(resolved, session, visible) : null;
        }
        // The stored tree stays; only the rendering stacks panes that would be too narrow
        const stacked = node.dir === 'column' || width / node.children.length < MIN_PANE_PX;
        return (_jsx(Group, { orientation: stacked ? 'vertical' : 'horizontal', className: "h-full w-full", children: node.children.map((child, index) => (_jsxs(React.Fragment, { children: [index > 0 && (_jsx(Separator, { className: `${stacked ? 'h-1 cursor-row-resize' : 'w-1 cursor-col-resize'} bg-gray-800 hover:bg-blue-500/50 transition-colors` })), _jsx(Panel, { id: `agent-pane-${resolved.tab.id}-${child.id}`, minSize: 10, className: "min-h-0 min-w-0", children: renderNode(resolved, child, visible, stacked ? width : width / node.children.length) })] }, child.id))) }));
    };
    const renderPanes = (resolved, visible) => 'pane' in resolved.root ? (renderNode(resolved, resolved.root, visible, bodyWidth)) : (_jsx("div", { className: "h-full p-1", children: renderNode(resolved, resolved.root, visible, bodyWidth) }));
    const dropOnTab = (targetId, position) => {
        if (drag?.kind === 'tab')
            onMoveTab(drag.id, targetId, position);
        finishDrag();
    };
    return (_jsxs("div", { className: "h-full flex flex-col min-h-0", children: [_jsxs("div", { className: "flex items-center bg-gray-900 border-b border-gray-800 shrink-0 h-9", children: [_jsxs("div", { ref: stripRef, role: "tablist", "aria-label": t.attachedAgents, className: "flex-1 flex items-center overflow-x-auto scrollbar-hide h-full", children: [tabs.map(({ tab, sessions: panes }) => {
                                const isActive = tab.id === activeTabId;
                                const lead = panes.find((s) => s.id === tab.activeSessionId) ?? panes[0];
                                const needsInput = panes.some((s) => s.displayState === 'needs-input');
                                const glyph = stateGlyph(needsInput ? 'needs-input' : lead.displayState, labels.shell.displayStates);
                                const title = tabTitle(panes.map((s) => s.name), paneNoun);
                                const indicator = dropTarget?.id === tab.id ? dropTarget.position : null;
                                return (_jsxs("div", { ...dragProps({ kind: 'tab', id: tab.id, sessionId: tab.activeSessionId }), onDragOver: (e) => {
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
                                    }, className: `group relative flex items-center pl-2.5 pr-1 h-full min-w-[120px] max-w-[220px] border-r border-gray-800 shrink-0 text-xs transition-colors ${isActive
                                        ? 'bg-gray-800 text-white'
                                        : 'text-gray-400 hover:bg-gray-850 hover:text-gray-200'} ${drag?.kind === 'tab' && drag.id === tab.id ? 'opacity-40' : ''}`, title: panes.map((s) => t.tabPaneTitle(s.name, s.cwd, s.sessionId)).join('\n'), children: [isActive && _jsx("div", { className: "absolute top-0 left-0 right-0 h-0.5 bg-blue-500" }), indicator && (_jsx("div", { className: `absolute inset-y-1 w-0.5 rounded bg-blue-400 pointer-events-none ${indicator === 'before' ? 'left-0' : 'right-0'}` })), _jsxs("button", { type: "button", role: "tab", id: `agent-tab-${tab.id}`, "data-tab-id": tab.id, "aria-selected": isActive, "aria-controls": `agent-tabpanel-${tab.id}`, "aria-keyshortcuts": "Alt+Shift+ArrowLeft Alt+Shift+ArrowRight", "aria-label": t.tabAria(title, glyph.label, panes.length, needsInput), tabIndex: isActive ? 0 : -1, onClick: () => onActivateTab(tab.id), onKeyDown: (e) => {
                                                if (e.altKey &&
                                                    e.shiftKey &&
                                                    (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                                                    e.preventDefault();
                                                    const delta = e.key === 'ArrowLeft' ? -1 : 1;
                                                    const step = stepIndices(order, tab.id, delta);
                                                    if (step) {
                                                        refocusId.current = tab.id;
                                                        onMoveTab(tab.id, order[step.to], delta < 0 ? 'before' : 'after');
                                                        setAnnouncement(t.tabMoved(title, step.to + 1, order.length));
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
                                            }, className: `flex items-center gap-1.5 flex-1 min-w-0 h-full text-left ${focusRing}`, children: [shellCwd(lead.id) !== null ? (_jsx(SquareTerminal, { size: 12, className: "text-gray-400 shrink-0", "aria-hidden": "true" })) : (_jsx("span", { className: `${glyph.className} ${glyph.animate ? 'animate-pulse motion-reduce:animate-none' : ''}`, "aria-hidden": "true", children: glyph.glyph })), _jsx("span", { className: "truncate flex-1", children: title }), browserUrl(lead.id) === null && tabSessionLabel(lead, targets) && (_jsx("span", { className: "shrink-0 font-mono text-[10px] text-gray-500", "data-testid": "tab-session-id", children: tabSessionLabel(lead, targets) })), panes.length > 1 && (_jsx("span", { className: "px-1 rounded bg-gray-700 text-[10px] leading-4 text-gray-300 shrink-0", "aria-hidden": "true", children: panes.length })), needsInput && (_jsx("span", { className: "w-2 h-2 rounded-full bg-yellow-400 shrink-0", "aria-hidden": "true" }))] }), _jsxs("span", { className: `flex items-center shrink-0 ${isActive ? '' : 'opacity-0'} group-hover:opacity-100 group-focus-within:opacity-100`, children: [isActive && panes.length === 1 && tabs.length > 1 && (_jsxs("span", { className: "hidden group-hover:flex group-focus-within:flex items-center", children: [_jsx("button", { onClick: (e) => {
                                                                e.stopPropagation();
                                                                splitOut(tab.id, 'right');
                                                            }, className: `p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 ${focusRing}`, title: t.splitRightTitle, "aria-label": t.splitRight(title), children: _jsx(Columns2, { size: 12 }) }), _jsx("button", { onClick: (e) => {
                                                                e.stopPropagation();
                                                                splitOut(tab.id, 'bottom');
                                                            }, className: `p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 ${focusRing}`, title: t.splitDownTitle, "aria-label": t.splitDown(title), children: _jsx(Rows2, { size: 12 }) })] })), _jsx("button", { onClick: (e) => {
                                                        e.stopPropagation();
                                                        onCloseTab(tab.id);
                                                    }, className: `p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white ${focusRing}`, "aria-label": t.closeNamed(title), title: t.close, children: _jsx(X, { size: 12 }) })] })] }, tab.id));
                            }), _jsx("div", { className: `flex-1 min-w-8 h-full ${endHot ? 'bg-blue-500/20' : ''}`, onDragOver: (e) => {
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
                                        onDetach(drag.sessionId);
                                    dropOnTab(order[order.length - 1], 'after');
                                } })] }), overflow && (_jsxs("div", { className: "relative shrink-0 h-full border-l border-gray-800", children: [_jsxs("button", { type: "button", "data-popover-trigger": true, "aria-expanded": tabListOpen, "aria-haspopup": "menu", onClick: () => setTabListOpen((o) => !o), className: `flex items-center gap-1 h-full px-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white ${focusRing}`, title: t.allTabs, "aria-label": t.allTabsHidden(hiddenTabs.length), children: [hiddenTabs.length > 0 && (_jsxs("span", { className: "tabular-nums text-[11px] text-gray-400", children: ["+", hiddenTabs.length] })), _jsx(ChevronDown, { size: 13, "aria-hidden": true })] }), tabListOpen && (_jsx(TabList, { items: tabs.map(({ tab, sessions: panes }) => ({
                                    id: tab.id,
                                    title: tabTitle(panes.map((s) => s.name), paneNoun),
                                    active: tab.id === activeTabId,
                                    hidden: hiddenTabs.includes(tab.id),
                                })), onPick: (id) => {
                                    setTabListOpen(false);
                                    onActivateTab(id);
                                    findTab(id)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                                }, onClose: () => setTabListOpen(false) }))] })), (() => {
                        const activeTab = tabs.find((t) => t.tab.id === activeTabId);
                        if (!activeTab || activeTab.sessions.length < 2)
                            return null;
                        return (_jsx("div", { className: "flex items-center gap-0.5 px-1 shrink-0", role: "group", "aria-label": t.paneLayout, children: LAYOUTS.map((item) => (_jsx("button", { onClick: () => onSetLayout(activeTab.tab.id, item.id), className: `p-1.5 rounded transition-colors ${focusRing} ${activeTab.tab.layout === item.id
                                    ? 'bg-gray-700 text-white'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`, title: t.layout(item.id), "aria-label": t.layout(item.id), "aria-pressed": activeTab.tab.layout === item.id, children: item.icon }, item.id))) }));
                    })(), _jsx("div", { className: "sr-only", "aria-live": "polite", children: announcement })] }), _jsx("div", { ref: bodyRef, className: "relative flex-1 min-h-0", children: tabs.map((resolved) => {
                    const { tab } = resolved;
                    const visible = !hidden && tab.id === activeTabId;
                    return (_jsx("div", { role: "tabpanel", id: `agent-tabpanel-${tab.id}`, "aria-labelledby": `agent-tab-${tab.id}`, className: `absolute inset-0 flex-col min-h-0 ${visible ? 'flex' : 'hidden'}`, children: _jsx("div", { className: "flex-1 min-h-0", children: renderPanes(resolved, visible) }) }, tab.id));
                }) })] }));
};
/** Every tab of the strip, marked visible or hidden (scrolled out); a pick activates it */
const TabList = ({ items, onPick, onClose }) => {
    const ref = usePopover(onClose, true);
    const t = useLabels().terminal;
    return (_jsx("div", { ref: ref, tabIndex: -1, role: "menu", "aria-label": t.allTabs, className: "absolute right-0 top-full z-50 mt-1 w-72 max-h-[60vh] overflow-y-auto rounded-lg border border-gray-600 bg-gray-900 py-1 shadow-2xl outline-none", children: items.map((item) => (_jsxs("button", { type: "button", role: "menuitem", onClick: () => onPick(item.id), className: `flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-800 focus-visible:bg-gray-800 focus-visible:outline-none ${item.active ? 'text-white' : item.hidden ? 'text-gray-400' : 'text-gray-200'}`, children: [item.hidden ? (_jsx(EyeOff, { size: 12, "aria-hidden": true, className: "shrink-0 text-gray-500" })) : (_jsx(Eye, { size: 12, "aria-hidden": true, className: "shrink-0 text-emerald-400" })), _jsx("span", { className: "min-w-0 flex-1 truncate", title: item.title, children: item.title }), _jsx("span", { className: "shrink-0 text-[10px] text-gray-500", children: item.active ? t.tabActive : item.hidden ? t.tabHidden : t.tabVisible })] }, item.id))) }));
};
