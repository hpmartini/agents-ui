import React from 'react';
import type { AgentDaemonStatus } from '../../types';
import { AgentQuickFilter, AgentSort, LinkFilterEntry } from '../../utils/agentSessions';
interface AgentSummaryBarProps {
    counts: {
        awaitingInput: number;
        working: number;
        completed: number;
        failed: number;
        cacheExpiring: number;
    };
    /** null while the context request is still loading */
    openPrs: number | null;
    runningServers: number | null;
    daemon: AgentDaemonStatus | null;
    /** Count of sessions that just finished (brief highlight) */
    justCompleted: number;
    active: ReadonlySet<AgentQuickFilter>;
    onToggle: (key: AgentQuickFilter) => void;
    /** Without it (no repo context from the transport) the PR and server chips are hidden */
    onOpenPrs?: () => void;
    onOpenServers?: () => void;
    /** Which popover is open (for aria-expanded) */
    panel: 'prs' | 'servers' | null;
}
/**
 * Inline status strip for the header: state counts double as filter toggles.
 */
export declare const AgentSummaryBar: React.FC<AgentSummaryBarProps>;
interface AgentFilterBarProps {
    sort: AgentSort;
    onSort: (sort: AgentSort) => void;
    active: ReadonlySet<AgentQuickFilter>;
    onToggle: (key: AgentQuickFilter) => void;
    /** Sessions matching each chip (over all sessions, ignoring other filters) */
    chipCounts: Record<AgentQuickFilter, number>;
    shown: number;
    total: number;
    /** Any filter (chips or text filter) is narrowing the list */
    filtered: boolean;
    onClear: () => void;
    /** Open PRs and linked issues of the agents in the current context */
    linkEntries: LinkFilterEntry[];
    /** Rail text search (#198), narrows the shown list */
    query: string;
    onQuery: (query: string) => void;
    linkSelected: ReadonlySet<string>;
    onToggleLink: (key: string) => void;
    /** Rendered first in the row (the grouping picker) */
    leading?: React.ReactNode;
    /** Rendered after the search (collapse / expand all) */
    trailing?: React.ReactNode;
}
/** Whether the quick-filter chips are expanded (collapsed by default) */
export declare const CHIPS_OPEN_KEY = "devOrbitAgentFilterChipsOpen";
/**
 * One row above the list: grouping (`leading`), sort, filter chips toggle, search, `trailing`
 * and the count.
 */
export declare const AgentFilterBar: React.FC<AgentFilterBarProps>;
export {};
