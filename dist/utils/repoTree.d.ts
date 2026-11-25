/**
 * Repository tree of the /pulls view: All repositories → folder → repo. A folder is the parent
 * directory of the repo's local checkout (`AgentContext.repo.root`), named relative to the
 * common parent of all checkouts, so no absolute path reaches the URL or the screen. A repo
 * without a known checkout is listed under its owner (`@owner`).
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
    /** Value of the `folder` param: relative folder path, or `@owner` */
    key: string;
    label: string;
    count: number;
    repos: RepoTreeRepo[];
}
export interface RepoTreeData {
    folders: RepoTreeFolder[];
    total: number;
}
/**
 * Folder key per lower-case slug. `roots`: lower-case slug → main checkout path.
 */
export declare function folderKeys(slugs: string[], roots: Record<string, string>): Map<string, string>;
/**
 * Every repo of `rows` in its folder; the counts come from `counted` (the rows that pass the
 * other filters), so a repo without matching PRs shows 0 instead of vanishing.
 */
export declare function buildRepoTree(rows: PullRequestRow[], counted: PullRequestRow[], roots: Record<string, string>): RepoTreeData;
