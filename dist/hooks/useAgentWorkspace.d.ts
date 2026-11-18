import { setTabLayout, splitInto, type Workspace } from '../utils/agentWorkspace';
export declare const STORAGE_KEY = "devOrbitAgentWorkspace.v2";
/** Pre-tabs/panes shape `{openIds, activeId}`; read once as a migration source */
export declare const LEGACY_STORAGE_KEY = "devOrbitAgentWorkspace";
export declare const VIEWS_STORAGE_KEY = "devOrbitPaneViews";
/** How an agent pane shows its one process: the terminal itself, or the UI view of its transcript */
export type PaneView = 'terminal' | 'chat';
/**
 * Attached agent sessions as tabs of panes, persisted in localStorage.
 * All actions are stable callbacks over the pure reducers in utils/agentWorkspace.
 */
export declare function useAgentWorkspace(contextId?: string): {
    attach: (id: string) => void;
    focusPane: (id: string) => void;
    activateTab: (tabId: string) => void;
    closePane: (id: string) => void;
    closeTab: (tabId: string) => void;
    split: (id: string, targetId: string, zone: Parameters<typeof splitInto>[3]) => void;
    openBrowser: (fromId: string, url: string) => void;
    openShell: (cwd: string) => void;
    detach: (id: string) => void;
    moveTab: (tabId: string, targetId: string, position: "before" | "after") => void;
    setLayout: (tabId: string, layout: Parameters<typeof setTabLayout>[2]) => void;
    /** Only call once the session list has loaded, so a reload keeps tabs while loading */
    prune: (existing: ReadonlySet<string>) => void;
    /** Switches what pane `id` shows; the process behind it is never touched */
    setView: (id: string, view: PaneView) => void;
    workspace: Workspace;
    parked: Record<string, Workspace>;
    openIds: Set<string>;
    views: Record<string, PaneView>;
};
