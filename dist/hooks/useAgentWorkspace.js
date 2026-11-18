import { useEffect, useMemo, useState } from 'react';
import { EMPTY_WORKSPACE, activateTab, closeSession, closeTab, detachSession, focusSession, migrateWorkspace, moveTab, openBrowser, openSession, openShell, pruneMissing, setTabLayout, splitInto, } from '../utils/agentWorkspace';
export const STORAGE_KEY = 'devOrbitAgentWorkspace.v2';
/** Pre-tabs/panes shape `{openIds, activeId}`; read once as a migration source */
export const LEGACY_STORAGE_KEY = 'devOrbitAgentWorkspace';
export const VIEWS_STORAGE_KEY = 'devOrbitPaneViews';
function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
        return raw ? migrateWorkspace(JSON.parse(raw)) : EMPTY_WORKSPACE;
    }
    catch {
        return EMPTY_WORKSPACE;
    }
}
function loadViews() {
    try {
        const raw = JSON.parse(localStorage.getItem(VIEWS_STORAGE_KEY) ?? '{}');
        return Object.fromEntries(Object.entries(raw ?? {}).filter((entry) => entry[1] === 'chat'));
    }
    catch {
        return {};
    }
}
/**
 * Attached agent sessions as tabs of panes, persisted in localStorage.
 * All actions are stable callbacks over the pure reducers in utils/agentWorkspace.
 */
export function useAgentWorkspace(contextId) {
    const [state, setState] = useState(() => ({
        contextId,
        workspace: load(),
        /** Workspaces of contexts left this session: their terminals stay mounted, hidden */
        parked: {},
    }));
    // A project context switch swaps the stored workspace (useProjectContexts): pick it up in
    // the same render, so the left context's panes move to `parked` without an unmount
    if (state.contextId !== contextId) {
        const parked = { ...state.parked };
        if (state.contextId)
            parked[state.contextId] = state.workspace;
        if (contextId)
            delete parked[contextId];
        setState({ contextId, workspace: load(), parked });
    }
    const { workspace, parked } = state;
    /** Panes shown in the UI view; every other pane shows its terminal */
    const [views, setViews] = useState(loadViews);
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
        }
        catch {
            // storage unavailable: the workspace just does not survive a reload
        }
    }, [workspace]);
    const actions = useMemo(() => {
        const apply = (fn) => setState((s) => ({ ...s, workspace: fn(s.workspace) }));
        return {
            attach: (id) => apply((ws) => openSession(ws, id)),
            focusPane: (id) => apply((ws) => focusSession(ws, id)),
            activateTab: (tabId) => apply((ws) => activateTab(ws, tabId)),
            closePane: (id) => apply((ws) => closeSession(ws, id)),
            closeTab: (tabId) => apply((ws) => closeTab(ws, tabId)),
            split: (id, targetId, zone) => apply((ws) => splitInto(ws, id, targetId, zone)),
            openBrowser: (fromId, url) => apply((ws) => openBrowser(ws, fromId, url)),
            openShell: (cwd) => apply((ws) => openShell(ws, cwd)),
            detach: (id) => apply((ws) => detachSession(ws, id)),
            moveTab: (tabId, targetId, position) => apply((ws) => moveTab(ws, tabId, targetId, position)),
            setLayout: (tabId, layout) => apply((ws) => setTabLayout(ws, tabId, layout)),
            /** Only call once the session list has loaded, so a reload keeps tabs while loading */
            prune: (existing) => apply((ws) => pruneMissing(ws, existing)),
            /** Switches what pane `id` shows; the process behind it is never touched */
            setView: (id, view) => setViews((prev) => {
                if ((prev[id] ?? 'terminal') === view)
                    return prev;
                const next = { ...prev };
                if (view === 'chat')
                    next[id] = view;
                else
                    delete next[id];
                return next;
            }),
        };
    }, []);
    const openIds = useMemo(() => new Set(workspace.tabs.flatMap((t) => t.panes)), [workspace.tabs]);
    // A closed pane forgets its view; panes of parked workspaces keep theirs
    useEffect(() => {
        const open = new Set([
            ...openIds,
            ...Object.values(parked).flatMap((ws) => ws.tabs.flatMap((t) => t.panes)),
        ]);
        setViews((prev) => {
            const kept = Object.entries(prev).filter(([id]) => open.has(id));
            return kept.length === Object.keys(prev).length ? prev : Object.fromEntries(kept);
        });
    }, [openIds, parked]);
    useEffect(() => {
        try {
            localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(views));
        }
        catch {
            // storage unavailable: panes come back in the terminal view
        }
    }, [views]);
    return { workspace, parked, openIds, views, ...actions };
}
