import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { TransportContext } from './state';
import * as ws from './workspace';
import { AgentList } from './AgentList';
import { AgentWorkspace } from './AgentWorkspace';
import { StartAgentDialog } from './StartAgentDialog';
import { ChatInput } from './ChatInput';
import { ConfirmDialog } from './ConfirmDialog';
import { refreshTerminalTheme } from './AgentTerminal';
import { LabelsContext, locales } from './labels';
function readStored(key) {
    if (!key)
        return ws.EMPTY_WORKSPACE;
    try {
        return ws.migrateWorkspace(JSON.parse(localStorage.getItem(key) ?? 'null'));
    }
    catch {
        return ws.EMPTY_WORKSPACE;
    }
}
/** Width of an element, live (container, not viewport: the panel may sit in a side bar) */
function useWidth(ref) {
    const [width, setWidth] = useState(Infinity);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const observer = new ResizeObserver(() => setWidth(el.clientWidth));
        observer.observe(el);
        return () => observer.disconnect();
    }, [ref]);
    return width;
}
/** The whole agents view: list, tabs with split panes of terminals, chat input, start dialog */
export const AgentsPanel = ({ transport, defaultCwd, storageKey = 'agents-ui:workspace', title, narrowBelowPx = 720, className = '', locale = 'en', labels, selectedId, onSelectedIdChange, canStop, confirmStop = true, terminalFont, }) => {
    const t = useMemo(() => ({ ...locales[locale], ...labels }), [locale, labels]);
    const [agents, setAgents] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [workspace, setWorkspace] = useState(() => readStored(storageKey));
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState(null);
    const [listError, setListError] = useState(null);
    const [retries, setRetries] = useState(0);
    const [confirming, setConfirming] = useState(null);
    const [mobileView, setMobileView] = useState('list');
    const rootRef = useRef(null);
    const narrow = useWidth(rootRef) < narrowBelowPx;
    useEffect(() => transport.subscribe((list) => {
        setAgents(list);
        setLoaded(true);
        setListError(null);
    }, (err) => setListError(err)), [transport, retries]);
    // Panes of agents that are gone close once the list is known
    useEffect(() => {
        if (loaded)
            setWorkspace((w) => ws.pruneMissing(w, new Set(agents.map((a) => a.id))));
    }, [agents, loaded]);
    useEffect(() => {
        if (!storageKey)
            return;
        try {
            localStorage.setItem(storageKey, JSON.stringify(workspace));
        }
        catch {
            // storage full or blocked: the layout just is not remembered
        }
    }, [workspace, storageKey]);
    const apply = useCallback((fn) => (...args) => setWorkspace((w) => fn(w, ...args)), []);
    const open = (id) => {
        setWorkspace((w) => ws.openSession(w, id));
        setMobileView('panes');
    };
    const stoppable = (agent) => canStop?.(agent) ?? true;
    const doStop = (id) => {
        setError(null);
        transport.stop(id).catch((err) => setError(t.stopFailed(String(err?.message ?? err))));
    };
    const stop = (id) => {
        const agent = agents.find((a) => a.id === id);
        if (!agent || !stoppable(agent))
            return;
        if (confirmStop)
            setConfirming(agent);
        else
            doStop(id);
    };
    const start = async (request) => {
        const { id } = await transport.start(request);
        setStarting(false);
        open(id);
    };
    const activeTab = workspace.tabs.find((t) => t.id === workspace.activeTabId);
    const activeId = activeTab?.activeSessionId ?? null;
    const activeAgent = agents.find((a) => a.id === activeId) ?? null;
    const openIds = useMemo(() => new Set(workspace.tabs.flatMap((t) => t.panes)), [workspace.tabs]);
    // selectedId: open the agent once per new value, as soon as it is listed
    const appliedSelection = useRef(undefined);
    useEffect(() => {
        if (!selectedId) {
            appliedSelection.current = selectedId;
            return;
        }
        if (selectedId === appliedSelection.current || !agents.some((a) => a.id === selectedId))
            return;
        appliedSelection.current = selectedId;
        if (selectedId !== activeId)
            open(selectedId);
        // open is stable in effect (state setters only)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId, agents]);
    const reportSelection = useRef(onSelectedIdChange);
    reportSelection.current = onSelectedIdChange;
    const lastReported = useRef(undefined);
    useEffect(() => {
        if (lastReported.current === undefined && activeId === null) {
            lastReported.current = null;
            return;
        }
        if (activeId === lastReported.current)
            return;
        lastReported.current = activeId;
        reportSelection.current?.(activeId);
    }, [activeId]);
    // the font sits on our own root, which the theme watcher does not observe
    useEffect(() => {
        if (terminalFont)
            refreshTerminalTheme();
    }, [terminalFont]);
    const showList = !narrow || mobileView === 'list';
    const showPanes = !narrow || mobileView === 'panes';
    return (_jsx(LabelsContext.Provider, { value: t, children: _jsx(TransportContext.Provider, { value: transport, children: _jsxs("div", { ref: rootRef, style: terminalFont ? { '--agents-mono': terminalFont } : undefined, className: `agents-ui relative flex h-full min-h-0 w-full overflow-hidden bg-ag-bg text-ag-text ${className}`, children: [showList && (_jsx("aside", { className: `${narrow ? 'w-full' : 'w-[300px] border-r border-ag-border'} shrink-0 min-h-0`, children: _jsx(AgentList, { agents: agents, openIds: openIds, activeId: activeId, loaded: loaded, error: listError, onRetry: () => setRetries((n) => n + 1), title: title ?? t.title, onOpen: open, onStop: stop, canStop: canStop, onNew: () => setStarting(true) }) })), _jsxs("section", { className: `${showPanes ? 'flex' : 'hidden'} flex-1 min-w-0 min-h-0 flex-col`, "aria-label": t.openAgents, children: [narrow && (_jsxs("button", { onClick: () => setMobileView('list'), className: "flex items-center gap-1 px-3 h-9 text-sm text-ag-accent border-b border-ag-border shrink-0 text-left", children: [_jsx(ChevronLeft, { size: 14, "aria-hidden": "true" }), " ", t.allAgents] })), _jsx("div", { className: "flex-1 min-h-0", children: _jsx(AgentWorkspace, { agents: agents, workspace: workspace, onActivateTab: apply(ws.activateTab), onFocusPane: apply(ws.focusSession), onClosePane: apply(ws.closeSession), onCloseTab: apply(ws.closeTab), onMoveTab: apply(ws.moveTab), onSplit: apply(ws.splitInto), onDetach: apply(ws.detachSession), onSetLayout: apply(ws.setTabLayout) }) }), _jsx(ChatInput, { target: activeAgent })] }), error && (_jsx("div", { role: "alert", className: "absolute bottom-16 left-1/2 -translate-x-1/2 z-40 max-w-[90%] rounded-md border border-ag-danger/50 bg-ag-surface px-3 py-2 text-xs text-ag-danger shadow-lg", onClick: () => setError(null), children: error })), confirming && (_jsx(ConfirmDialog, { title: t.confirmStopTitle, body: t.confirmStopBody(confirming.name), confirm: t.confirmStop, onCancel: () => setConfirming(null), onConfirm: () => {
                            doStop(confirming.id);
                            setConfirming(null);
                        } })), starting && (_jsx(StartAgentDialog, { defaultCwd: defaultCwd, onStart: start, onClose: () => setStarting(false) }))] }) }) }));
};
