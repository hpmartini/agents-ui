/**
 * Filter, cluster and sort the open PRs of the /pulls view (#191). Pure; the state lives in
 * the URL search params, so every value read from there is checked against the known options.
 */
import { type ShellLabels } from '../labels/shell';
import type { AgentPullRequest } from '../types';
import type { PullRequestRow } from './agentSessions';
export type CiKey = AgentPullRequest['ci'];
export type MergeKey = 'ready' | 'blocked' | 'checking' | 'conflicts';
export type ReviewKey = 'approved' | 'changes' | 'required' | 'none';
export type YesNo = 'yes' | 'no';
export type GroupKey = 'none' | 'repo' | 'merge' | 'ci' | 'review' | 'author' | 'agent';
export type SortKey = 'updated' | 'ready' | 'number' | 'title' | 'repo';
export type SortDir = 'asc' | 'desc';
export interface PullQuery {
    /** Free text: title, number, head branch, author */
    q: string;
    repo: string | null;
    /** Folder node of the repo tree (`utils/repoTree`); excludes `repo` */
    folder: string | null;
    ci: CiKey | null;
    merge: MergeKey | null;
    review: ReviewKey | null;
    draft: YesNo | null;
    author: string | null;
    base: string | null;
    /** PR has (yes) or lacks (no) an agent on its head branch */
    agent: YesNo | null;
    group: GroupKey;
    sort: SortKey;
    dir: SortDir;
}
export declare const CI_LABELS: Record<CiKey, string>;
export declare const MERGE_LABELS: Record<MergeKey, string>;
export declare const REVIEW_LABELS: Record<ReviewKey, string>;
export declare const GROUP_LABELS: Record<GroupKey, string>;
export declare const SORT_LABELS: Record<SortKey, string>;
export declare const DEFAULT_QUERY: PullQuery;
export declare function mergeKey(pr: AgentPullRequest): MergeKey;
export declare function reviewKey(pr: AgentPullRequest): ReviewKey;
/** URL params -> query; unknown or invalid values fall back to the defaults */
export declare function parsePullQuery(params: URLSearchParams): PullQuery;
/** Writes `patch` into a copy of `params`; defaults are removed, other params are kept */
export declare function patchPullParams(params: URLSearchParams, patch: Partial<PullQuery>): URLSearchParams;
/** True when any filter (not grouping or sorting) is set */
export declare const hasFilters: (q: PullQuery) => boolean;
/** Drops all filters, keeps grouping and sorting */
export declare const FILTER_RESET: Partial<PullQuery>;
/** All filters combine with AND; `folders` (lower-case slug → keys of the folders holding it) serves `q.folder` */
export declare function filterPulls(rows: PullRequestRow[], q: PullQuery, folders?: Map<string, string[]>): PullRequestRow[];
export declare function sortPulls(rows: PullRequestRow[], sort: SortKey, dir: SortDir): PullRequestRow[];
export interface PullGroup {
    key: string;
    label: string;
    rows: PullRequestRow[];
}
type PullLabels = ShellLabels['pulls'];
/**
 * Clusters already sorted rows; a PR with several agents is listed under each of them. `labels`
 * name the clusters.
 */
export declare function groupPulls(rows: PullRequestRow[], group: GroupKey, labels?: PullLabels): PullGroup[];
/** Distinct values for the select filters, from all rows (not only the filtered ones) */
export declare function pullOptions(rows: PullRequestRow[]): {
    repos: string[];
    authors: string[];
    bases: string[];
};
/** filter -> sort -> group, as the view shows it */
export declare function queryPulls(rows: PullRequestRow[], q: PullQuery, labels?: PullLabels, folders?: Map<string, string[]>): {
    shown: PullRequestRow[];
    groups: PullGroup[];
};
export {};
