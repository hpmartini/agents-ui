/** dataTransfer type marking a dragged agent tab / pane (what is dragged lives in component state) */
export declare const AGENT_TAB_MIME = "application/x-devorbit-agent-tab";
export type DropZone = 'left' | 'right' | 'top' | 'bottom';
export type InsertPosition = 'before' | 'after';
interface RectLike {
    left: number;
    top: number;
    width: number;
    height: number;
}
/** Which half of a tab the pointer is over (horizontal strip) */
export declare function insertPosition(rect: RectLike, x: number): InsertPosition;
/** Edge zone of a pane closest to the pointer (diagonals resolve by the nearer edge) */
export declare function dropZone(rect: RectLike, x: number, y: number): DropZone;
/** Split orientation for a zone: left/right side by side, top/bottom stacked */
export declare function layoutForZone(zone: DropZone): 'columns' | 'rows';
/**
 * Index move that puts `id` directly before/after `targetId`, in the
 * `(from, to)` form of splice-out then splice-in. Null when nothing changes.
 */
export declare function reorderIndices(order: string[], id: string, targetId: string, position: InsertPosition): {
    from: number;
    to: number;
} | null;
/** Move by one slot (keyboard); null at the ends */
export declare function stepIndices(order: string[], id: string, delta: -1 | 1): {
    from: number;
    to: number;
} | null;
/** Zone -> position relative to the anchor pane (left/top come first) */
export declare function positionForZone(zone: DropZone): InsertPosition;
export type PaneLayout = 'single' | 'columns' | 'rows' | 'grid';
/** What a tab's tree amounts to; `custom` is any nesting the layout buttons do not produce */
export type TabLayout = PaneLayout | 'custom';
/**
 * Split tree (#212): a leaf is a pane, a node lays its children out side by side (`row`) or
 * stacked (`column`). `id` names the slot, unique within the tab and stable while the tree is
 * rearranged, so the rendering keeps panels (and their sizes) that a change does not touch.
 */
export type SplitNode = {
    id: string;
    pane: string;
} | {
    id: string;
    dir: 'row' | 'column';
    children: SplitNode[];
};
export interface WorkspaceTab {
    id: string;
    root: SplitNode;
    /** Leaves of `root` in reading order (derived, also what older versions read back) */
    panes: string[];
    /** Derived from `root` */
    layout: TabLayout;
    activeSessionId: string;
}
export interface Workspace {
    tabs: WorkspaceTab[];
    activeTabId: string | null;
}
export declare const EMPTY_WORKSPACE: Workspace;
export declare const leaves: (node: SplitNode) => string[];
/**
 * `root` without the panes `keep` rejects. A node left with one child collapses into it: the
 * child takes over the node's slot, so the sibling fills the freed space and nothing else moves.
 */
export declare function prunedRoot(root: SplitNode, keep: (pane: string) => boolean): SplitNode | null;
/** Remove a session from its tab; an emptied tab vanishes and the active tab / pane are re-picked */
declare function removeSession(ws: Workspace, sessionId: string): Workspace;
/** Focus a session: activates its tab and pane. Unknown sessions change nothing. */
export declare function focusSession(ws: Workspace, sessionId: string): Workspace;
/** Attach: focus the existing pane, or open a new single-pane tab */
export declare function openSession(ws: Workspace, sessionId: string): Workspace;
export declare function activateTab(ws: Workspace, tabId: string): Workspace;
/** Close one pane (the session keeps running, it is just no longer attached here) */
export declare const closeSession: typeof removeSession;
export declare function closeTab(ws: Workspace, tabId: string): Workspace;
/**
 * Split the pane `targetId` and put `sessionId` on the zone's side of it. Only the target gives
 * up space (half of it); every other pane keeps its place. The session leaves its old tab.
 * No-op for self / unknown target.
 */
export declare function splitInto(ws: Workspace, sessionId: string, targetId: string, zone: DropZone): Workspace;
/** Pull a pane out into its own tab right after its old one. Single-pane tabs are just focused. */
export declare function detachSession(ws: Workspace, sessionId: string): Workspace;
/** Put a tab directly before/after another tab */
export declare function moveTab(ws: Workspace, tabId: string, targetId: string, position: InsertPosition): Workspace;
/** Rearrange all panes of a tab flat (layout buttons); ignored for tabs with fewer than two panes */
export declare function setTabLayout(ws: Workspace, tabId: string, layout: PaneLayout): Workspace;
/** Drop sessions that no longer exist (call only once the session list has loaded) */
export declare function pruneMissing(ws: Workspace, existing: ReadonlySet<string>): Workspace;
/** Url of a browser pane id (`browser:<n>:<url>`), null for session panes */
export declare function browserUrl(paneId: string): string | null;
/**
 * Show `url` in the browser pane of `fromId`'s tab: reuse that tab's browser pane,
 * else split one in right of `fromId`. Only http(s); unknown panes change nothing.
 */
export declare function openBrowser(ws: Workspace, fromId: string, url: string): Workspace;
/** Working directory of a shell pane id (`shell:<n>:<cwd>`), null for other panes */
export declare function shellCwd(paneId: string): string | null;
/** Open a new shell in `cwd` as its own, active tab; several shells per directory are fine */
export declare function openShell(ws: Workspace, cwd: string): Workspace;
/** Tab title: the name for one pane, "A + B" for two, "N agents" (or `noun`) beyond */
export declare function tabTitle(names: string[], noun?: string): string;
/**
 * Normalise anything read from storage: the current shape (tabs with a split tree), the flat
 * shape before #212 (`panes` + `layout`), the legacy `{openIds, activeId}` shape (one tab per
 * id), or garbage (empty workspace). A duplicate session keeps its first pane; malformed tabs
 * and tree parts are dropped.
 */
export declare function migrateWorkspace(raw: unknown): Workspace;
export {};
