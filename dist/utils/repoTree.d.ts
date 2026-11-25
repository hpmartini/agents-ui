/**
 * Repository tree of the /pulls view: All repositories → folders by path → repo, following the
 * local checkouts (`AgentContext.repo.root`). Paths are shown relative to the home dir
 * (`/Users/<name>`, `/home/<name>` become `~`, the user name never shows) and start at the
 * common root of all checkouts; a checkout directly in that root sits at the tree's root.
 * A folder with one subfolder and no repos merges with it (`REPOS/apps`, like VS Code's
 * compact folders). A folder's key (URL `folder`, stored selection) is its own name plus a hash
 * of its absolute path: stable whichever other repos have PRs, and no path reaches the URL.
 * A compacted folder takes the key of its deepest folder. A repo without a known checkout is
 * listed under its owner (`@owner`).
 */
import type { PullRequestRow } from './agentSessions';
/** What the tree has selected; maps to the `folder` / `repo` params of the PR query */
export type RepoSelection = {
    kind: 'all';
} | {
    kind: 'folder';
    key: string;
} | {
    kind: 'repo';
    slug: string;
};
export interface RepoTreeRepo {
    slug: string;
    /** Repo part of the slug */
    name: string;
    count: number;
}
export interface RepoTreeFolder {
    /** Value of the `folder` param: `<name>-<hash of the absolute path>`, or `@owner` */
    key: string;
    label: string;
    /** Home-relative path (`~/REPOS/apps`); none for owners */
    title?: string;
    /** Open PRs in the whole subtree */
    count: number;
    folders: RepoTreeFolder[];
    repos: RepoTreeRepo[];
}
export interface RepoTreeData {
    /** Path folders, then owners */
    folders: RepoTreeFolder[];
    /** Checkouts directly in the common root */
    repos: RepoTreeRepo[];
    total: number;
}
/**
 * Keys of every folder that holds a repo's checkout, deepest first, per lower-case slug;
 * `[@owner]` without a checkout. `roots`: lower-case slug → main checkout path.
 */
export declare function folderKeys(slugs: string[], roots: Record<string, string>): Map<string, string[]>;
/** Folder `key` anywhere in the tree */
export declare function findFolder(tree: RepoTreeData, key: string): RepoTreeFolder | undefined;
/**
 * Every repo of `rows` in its folder; the counts come from `counted` (the rows that pass the
 * other filters), so a repo without matching PRs shows 0 instead of vanishing.
 */
export declare function buildRepoTree(rows: PullRequestRow[], counted: PullRequestRow[], roots: Record<string, string>): RepoTreeData;
