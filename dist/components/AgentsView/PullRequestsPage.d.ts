import React from 'react';
import { type PullRequestListProps } from './PullRequestsPanel';
/** Filters, grouping and sorting live in the URL of /pulls (#191), not in these props */
export type PullRequestsPageProps = Omit<PullRequestListProps, 'onOpenPr' | 'openUrl' | 'onDone' | 'repoFilter' | 'groups'>;
/** The host route's URL query, in the shape of react-router's `useSearchParams()` */
export interface PullRequestsQueryProps {
    searchParams: URLSearchParams;
    setSearchParams: (next: (prev: URLSearchParams) => URLSearchParams, options?: {
        replace?: boolean;
    }) => void;
}
/** PR data and handlers, provided by AgentsView around the main area of the other routes */
export declare const PullRequestsDataContext: React.Context<PullRequestsPageProps | null>;
/** The host's /pulls route: reads the PR data AgentsView already holds (no second data path) */
export declare const ConnectedPullRequestsPage: React.FC<PullRequestsQueryProps>;
export declare const SELECT_CLS = "bg-gray-850 border border-gray-700 rounded px-2 py-1 text-gray-200 text-xs max-w-[12rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor";
export declare const ICON_BTN = "flex items-center gap-1 px-1.5 py-1 rounded text-xs text-gray-300 hover:text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor";
type Options = Record<string, string>;
export declare const asOptions: (values: string[]) => Options;
/** One select filter; the empty option means "any" (also used by the Issues mode) */
export declare const Filter: React.FC<{
    label: string;
    value: string | null;
    options: Options;
    onChange: (value: string | null) => void;
}>;
/**
 * Full view of the open PRs (route /pulls) with filters, clusters and sorting in the URL.
 * A PR opens in one split pane to the right; the next PR replaces it.
 * Without Electron GitHub refuses to be framed, so PRs open in a tab.
 */
export declare const PullRequestsPage: React.FC<PullRequestsPageProps & PullRequestsQueryProps>;
export {};
