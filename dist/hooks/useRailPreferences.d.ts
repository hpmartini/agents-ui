import type { AgentGrouping } from '../types';
import type { SessionGroup } from '../utils/agentSessions';
/** Key of the synthetic group holding favorite agents (always first, not reorderable) */
export declare const FAVORITES_GROUP_KEY = "favorites";
export declare const STORAGE_KEY = "devOrbitAgentRail.v1";
export declare const toggleCollapsed: (list: string[], key: string) => string[];
export declare const toggleFavoriteGroup: (list: string[], key: string) => string[];
export declare const toggleFavoriteSession: (list: string[], key: string) => string[];
export declare const toggleExpandedSession: (list: string[], key: string) => string[];
export declare const toggleFixedProject: (list: string[], key: string) => string[];
/** Drops ids not in `known`; returns the same array when nothing is dropped */
export declare const keepKnown: (list: string[], known: Set<string>) => string[];
/**
 * Adjacent group in `keys` (display order) within the same favorite/other block, as favorites
 * always sort first; undefined at a block edge or for an unknown key.
 */
export declare function groupNeighbour(keys: string[], favoriteKeys: string[], key: string, dir: -1 | 1): string | undefined;
/** Collapses the given groups, keeping groups that are collapsed but currently not listed */
export declare const collapseAll: (collapsed: string[], keys: string[]) => string[];
/** Expands the given groups, or every group when no keys are given */
export declare const expandAll: (collapsed: string[], keys?: string[]) => string[];
/** Opens (`open`) or closes the details of the given agent rows */
export declare const setExpanded: (expanded: string[], ids: string[], open: boolean) => string[];
/**
 * Orders groups: favorites first, then by the manual order. Groups missing from the order
 * (new ones) stay at the end of their block in their original order.
 */
export declare function applyGroupOrder<T extends {
    key: string;
}>(groups: T[], order: string[], favoriteKeys?: string[]): T[];
/**
 * Moves `key` to the position of `targetKey` among the visible groups (drag-and-drop drop
 * target, or the neighbour for "Move up/down"). Returns the new manual order; keys that are
 * not visible keep their entry after the visible ones.
 */
export declare function moveGroup(order: string[], visibleKeys: string[], key: string, targetKey: string): string[];
/**
 * Applies the manual agent order per group (#299). Sessions missing from a group's stored order
 * (new agents) come first in their incoming order; stored ids that are gone are ignored.
 */
export declare function applySessionOrder(groups: SessionGroup[], orders: Record<string, string[]>): SessionGroup[];
/**
 * New stored order after moving `id` to the slot of `targetId` among the displayed `visibleIds`.
 * Entries of sessions folded away (`hiddenIds`) are kept after them; every other stored id is
 * gone and dropped. Returns `stored` itself when nothing moves.
 */
export declare function moveSession(stored: string[], visibleIds: string[], hiddenIds: string[], id: string, targetId: string): string[];
/** Key of the group (visible or folded away) that holds the session */
export declare const findGroupKeyOf: (groups: SessionGroup[], sessionId: string) => string | null;
/** True when the session sits behind a group's "… N more" row, i.e. has no rail row yet */
export declare const isFoldedAway: (groups: SessionGroup[], sessionId: string) => boolean;
/**
 * Pulls favorite sessions out of their groups into a leading Favorites group (a session never
 * shows up twice, so selection and row keys stay unique).
 */
export declare function withFavoriteSessions(groups: SessionGroup[], favoriteIds: string[]): SessionGroup[];
/**
 * Per-grouping rail preferences (collapsed groups, manual group order) plus global favorite
 * groups and favorite sessions, persisted in localStorage.
 */
export declare function useRailPreferences(groupBy: AgentGrouping, contextId?: string): {
    collapsed: Set<string>;
    favoriteGroups: Set<string>;
    favoriteSessions: Set<string>;
    expandedSessions: Set<string>;
    toggleCollapsed: (key: string) => void;
    collapseAll: (keys: string[]) => void;
    expandAll: (keys?: string[]) => void;
    /** Expands the group (favorites and original) that holds the session */
    revealSession: (groups: SessionGroup[], sessionId: string) => void;
    moveGroup: (key: string, targetKey: string, visibleKeys: string[]) => void;
    toggleFavoriteGroup: (key: string) => void;
    toggleFavoriteSession: (id: string) => void;
    fixedProjects: string[];
    toggleFixedProject: (dir: string) => void;
    toggleExpandedSession: (id: string) => void;
    setSessionsExpanded: (ids: string[], open: boolean) => void;
    /** Forgets open details of sessions that no longer exist; call only with a complete session list */
    pruneExpandedSessions: (knownIds: string[]) => void;
    /** Manual agent order of a group (#299) */
    moveSession: (groupKey: string, id: string, targetId: string, visibleIds: string[], hiddenIds?: string[]) => void;
    /**
     * Favorite sessions section + manual order + favorite groups first, for the current mode;
     * `manualAgents` additionally applies the manual agent order inside each group.
     */
    arrange: (groups: SessionGroup[], manualAgents?: boolean) => SessionGroup[];
};
