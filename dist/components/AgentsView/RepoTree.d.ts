import React from 'react';
import type { RepoSelection, RepoTreeData } from '../../utils/repoTree';
/** Collapsed folder keys (and ROOT when the root is collapsed); every other node is open */
export declare const REPO_TREE_COLLAPSED_KEY = "agentsUi.pullsTreeCollapsed";
/**
 * WAI-ARIA tree of the repos with open PRs (All repositories → nested folders → repo), each with its
 * count. One tab stop; ↑/↓ move, → opens or goes to the first child, ← closes or goes to the
 * parent, Home/End, Enter/Space select, a letter jumps to the next node starting with it.
 */
export declare const RepoTree: React.FC<{
    tree: RepoTreeData;
    selection: RepoSelection;
    onSelect: (selection: RepoSelection) => void;
    loading: boolean;
    className?: string;
}>;
