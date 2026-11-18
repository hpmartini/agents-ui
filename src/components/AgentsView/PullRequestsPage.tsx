import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useHost } from '../../host';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, GitPullRequest, RotateCcw } from 'lucide-react';
import type { AgentPullRequest } from '../../types';
import { BrowserPane } from './AgentWorkspace';
import { PullRequestList, type PullRequestListProps } from './PullRequestsPanel';
import { getEmbedsAnySite, getLinkTarget, openLink } from '../../utils/links';
import {
  FILTER_RESET,
  hasFilters,
  parsePullQuery,
  patchPullParams,
  pullOptions,
  queryPulls,
  type PullQuery,
} from '../../utils/pullRequestQuery';
import { useLabels } from '../../labels';

/** Filters, grouping and sorting live in the URL of /pulls (#191), not in these props */
export type PullRequestsPageProps = Omit<
  PullRequestListProps,
  'onOpenPr' | 'openUrl' | 'onDone' | 'repoFilter' | 'groups'
>;

/** The host route's URL query, in the shape of react-router's `useSearchParams()` */
export interface PullRequestsQueryProps {
  searchParams: URLSearchParams;
  setSearchParams: (
    next: (prev: URLSearchParams) => URLSearchParams,
    options?: { replace?: boolean }
  ) => void;
}

/** PR data and handlers, provided by AgentsView around the main area of the other routes */
export const PullRequestsDataContext = createContext<PullRequestsPageProps | null>(null);

/** The host's /pulls route: reads the PR data AgentsView already holds (no second data path) */
export const ConnectedPullRequestsPage: React.FC<PullRequestsQueryProps> = (query) => {
  const data = useContext(PullRequestsDataContext);
  return data ? <PullRequestsPage {...data} {...query} /> : null;
};

const noop = () => {};

export const SELECT_CLS =
  'bg-gray-850 border border-gray-700 rounded px-2 py-1 text-gray-200 text-xs max-w-[12rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor';
export const ICON_BTN =
  'flex items-center gap-1 px-1.5 py-1 rounded text-xs text-gray-300 hover:text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor';

type Options = Record<string, string>;
export const asOptions = (values: string[]): Options =>
  Object.fromEntries(values.map((v) => [v, v]));

/** One select filter; the empty option means "any" (also used by the Issues mode) */
export const Filter: React.FC<{
  label: string;
  value: string | null;
  options: Options;
  onChange: (value: string | null) => void;
}> = ({ label, value, options, onChange }) => {
  const t = useLabels().shell;
  return (
    <select
      aria-label={label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={`${SELECT_CLS} ${value ? 'border-blue-500/70 text-white' : ''}`}
    >
      <option value="">{t.filterAny(label)}</option>
      {Object.entries(options).map(([key, text]) => (
        <option key={key} value={key}>
          {text}
        </option>
      ))}
      {/* A value from the URL that no PR has (any more) stays visible and clearable */}
      {value && !Object.hasOwn(options, value) && <option value={value}>{value}</option>}
    </select>
  );
};

/** Select over a fixed set of keys; the setter receives the key typed like the query field */
function keyed<K extends keyof PullQuery>(
  update: (patch: Partial<PullQuery>) => void,
  key: K
): (value: string | null) => void {
  return (value) => update({ [key]: value } as Partial<PullQuery>);
}

/**
 * Full view of the open PRs (route /pulls) with filters, clusters and sorting in the URL.
 * A PR opens in one split pane to the right; the next PR replaces it.
 * Without Electron GitHub refuses to be framed, so PRs open in a tab.
 */
export const PullRequestsPage: React.FC<PullRequestsPageProps & PullRequestsQueryProps> = ({
  searchParams: params,
  setSearchParams: setParams,
  ...props
}) => {
  const t = useLabels().shell;
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  // A built-in browser that frames any site (Orkumo's Electron BrowserView)
  const canEmbed = getEmbedsAnySite() && !!useHost().renderBrowser;
  const viewRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const query = useMemo(() => parsePullQuery(params), [params]);
  const { shown, groups } = useMemo(
    () => queryPulls(props.rows, query, t.pulls),
    [props.rows, query, t.pulls]
  );
  const options = useMemo(() => pullOptions(props.rows), [props.rows]);
  const filtered = hasFilters(query);
  // Typing replaces the history entry; every other change is one Back step
  const update = (patch: Partial<PullQuery>, replace = false) =>
    setParams((prev) => patchPullParams(prev, patch), { replace });

  // Arriving from the popover: its trigger is hidden here, so focus lands on the view
  useEffect(() => viewRef.current?.focus(), []);

  const openPr = (pr: AgentPullRequest) => {
    if (!pr.url.startsWith('https://')) return;
    // Only GitHub pages load in the embedded browser; narrow windows (md breakpoint) and other hosts open externally
    if (
      canEmbed &&
      getLinkTarget() !== 'system' &&
      pr.url.startsWith('https://github.com/') &&
      window.innerWidth >= 768
    ) {
      setOpenUrl(pr.url);
    } else openLink(pr.url);
  };

  return (
    <div
      ref={viewRef}
      tabIndex={-1}
      aria-label={t.openPullRequests}
      className="absolute inset-0 flex flex-col min-h-0 bg-gray-900 outline-none"
      data-pulls-view
    >
      {/* The list panel stays mounted when the pane opens or closes, so scroll and focus survive */}
      <Group orientation="horizontal" className="h-full w-full">
        {/* v4: plain numbers are pixels, so sizes are given in percent */}
        <Panel id="pulls-list" minSize="20%" defaultSize="40%" className="min-h-0 min-w-0">
          <div className="h-full flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-gray-800 shrink-0 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <GitPullRequest size={14} className="text-gray-400" aria-hidden />
                <span className="font-medium">{t.openPullRequests}</span>
                <span className="text-gray-500 tabular-nums text-xs" data-testid="pulls-count">
                  {filtered ? t.shownOf(shown.length, props.rows.length) : props.rows.length}
                </span>
                <div className="flex-1" />
                {filtered && (
                  <button
                    onClick={() => {
                      update(FILTER_RESET);
                      // the button unmounts once no filter is left; keep focus in the toolbar
                      searchRef.current?.focus();
                    }}
                    className={ICON_BTN}
                  >
                    <RotateCcw size={11} aria-hidden /> {t.resetFilters}
                  </button>
                )}
              </div>
              <div
                role="toolbar"
                aria-label={t.pullsToolbar}
                className="flex flex-wrap items-center gap-1.5"
              >
                <input
                  ref={searchRef}
                  type="search"
                  aria-label={t.searchPulls}
                  placeholder={t.searchPullsPlaceholder}
                  value={query.q}
                  onChange={(e) => update({ q: e.target.value }, true)}
                  className={`${SELECT_CLS} w-56 placeholder:text-gray-500`}
                />
                <Filter
                  label={t.pullFilters.repo}
                  value={query.repo}
                  options={asOptions(options.repos)}
                  onChange={keyed(update, 'repo')}
                />
                <Filter
                  label={t.pullFilters.ci}
                  value={query.ci}
                  options={t.pulls.ci}
                  onChange={keyed(update, 'ci')}
                />
                <Filter
                  label={t.pullFilters.merge}
                  value={query.merge}
                  options={t.pulls.merge}
                  onChange={keyed(update, 'merge')}
                />
                <Filter
                  label={t.pullFilters.review}
                  value={query.review}
                  options={t.pulls.review}
                  onChange={keyed(update, 'review')}
                />
                <Filter
                  label={t.pullFilters.draft}
                  value={query.draft}
                  options={t.pulls.yesNo}
                  onChange={keyed(update, 'draft')}
                />
                <Filter
                  label={t.pullFilters.author}
                  value={query.author}
                  options={asOptions(options.authors)}
                  onChange={keyed(update, 'author')}
                />
                <Filter
                  label={t.pullFilters.base}
                  value={query.base}
                  options={asOptions(options.bases)}
                  onChange={keyed(update, 'base')}
                />
                <Filter
                  label={t.pullFilters.agent}
                  value={query.agent}
                  options={t.pulls.yesNo}
                  onChange={keyed(update, 'agent')}
                />
                <span className="w-px h-4 bg-gray-700 mx-1" aria-hidden />
                <select
                  aria-label={t.groupBy}
                  value={query.group}
                  onChange={(e) => keyed(update, 'group')(e.target.value)}
                  className={SELECT_CLS}
                >
                  {Object.entries(t.pulls.group).map(([key, text]) => (
                    <option key={key} value={key}>
                      {key === 'none' ? text : t.groupOption(text)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t.sortBy}
                  value={query.sort}
                  onChange={(e) => keyed(update, 'sort')(e.target.value)}
                  className={SELECT_CLS}
                >
                  {Object.entries(t.pulls.sort).map(([key, text]) => (
                    <option key={key} value={key}>
                      {t.sortOption(text)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => update({ dir: query.dir === 'asc' ? 'desc' : 'asc' })}
                  aria-label={query.dir === 'asc' ? t.sortAscending : t.sortDescending}
                  title={query.dir === 'asc' ? t.ascending : t.descending}
                  className={ICON_BTN}
                >
                  {query.dir === 'asc' ? (
                    <ArrowUpNarrowWide size={13} aria-hidden />
                  ) : (
                    <ArrowDownWideNarrow size={13} aria-hidden />
                  )}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <PullRequestList
                {...props}
                repoFilter={query.repo}
                groups={groups}
                onOpenPr={openPr}
                openUrl={openUrl}
              />
            </div>
          </div>
        </Panel>
        {openUrl && (
          <>
            <Separator className="w-1 cursor-col-resize bg-gray-800 hover:bg-blue-500/50 transition-colors" />
            <Panel id="pulls-pr" minSize="20%" className="min-h-0 min-w-0 p-1">
              <BrowserPane url={openUrl} active onFocus={noop} onClose={() => setOpenUrl(null)} />
            </Panel>
          </>
        )}
      </Group>
    </div>
  );
};
