import React from 'react';
import type { AgentPrLink } from '../../types';
import { type PullRequestListProps } from './PullRequestsPanel';
/**
 * The pull request(s) behind one PR pill as a modal over the current view, like IssueModal for
 * issue pills. The overview of all open PRs stays behind the "open PRs" chip of the summary bar.
 * In the desktop app the PR page loads in the built-in browser; a plain browser cannot frame GitHub.
 * The PR overview link shows with `onOpenOverview` (repo context from the transport).
 */
export declare const PullRequestModal: React.FC<Pick<PullRequestListProps, 'rows' | 'contexts' | 'onSelectAgent' | 'onOpenCode'> & {
    /** PR links of the clicked session */
    links: AgentPrLink[];
    onOpenOverview?: () => void;
    onClose: () => void;
}>;
