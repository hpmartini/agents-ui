import React from 'react';
import type { AgentContext, AgentPullRequest, AgentSession } from '../../types';
import { type PullRequestRow } from '../../utils/agentSessions';
import { type PullGroup } from '../../utils/pullRequestQuery';
/**
 * Popover behaviour shared by the summary-bar panels: focus moves in, Esc and
 * outside clicks close, focus returns to the trigger unless the user moved it elsewhere
 * (e.g. attached an agent). Non-modal on purpose: Tab may leave the panel.
 */
export declare function usePopover(onClose: () => void, exclusive?: boolean): React.RefObject<HTMLDivElement | null>;
export declare const filterPullRows: (rows: PullRequestRow[], repoFilter: string | null) => PullRequestRow[];
export interface PullRequestListProps {
    rows: PullRequestRow[];
    sessions: AgentSession[];
    contexts: Record<string, AgentContext | undefined>;
    /** Only show this repo ("owner/repo") */
    repoFilter: string | null;
    onSelectAgent: (id: string) => void;
    /** Opens the Code mode in the PR branch's worktree (or the repo); without it no Code button */
    onOpenCode?: (row: PullRequestRow) => void;
    /** Set: the PR title opens in the app and only the icon links out */
    onOpenPr?: (pr: AgentPullRequest) => void;
    /** URL of the PR open next to the list, highlighted */
    openUrl?: string | null;
    /** Called after an action that leaves the list (agent, code) */
    onDone?: () => void;
    /** Set (full view): render these clusters instead of `rows`, already filtered and sorted */
    groups?: PullGroup[];
}
/** PR rows shared by the summary-bar popover and the full /pulls view */
export declare const PullRequestList: React.FC<PullRequestListProps>;
/** Title row with count and repo filter; children are the trailing buttons */
export declare const PullRequestsHeader: React.FC<{
    count: number;
    repoFilter: string | null;
    onClearRepo: () => void;
    children?: React.ReactNode;
}>;
interface PullRequestsPanelProps extends Omit<PullRequestListProps, 'onOpenPr' | 'openUrl' | 'onDone'> {
    onClearRepo: () => void;
    /** Opens the list as its own view in the content panel; without it no maximize button */
    onMaximize?: () => void;
    onClose: () => void;
}
export declare const PullRequestsPanel: React.FC<PullRequestsPanelProps>;
export {};
