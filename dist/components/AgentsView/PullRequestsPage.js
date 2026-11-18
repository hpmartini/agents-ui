import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useHost } from '../../host';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, GitPullRequest, RotateCcw } from 'lucide-react';
import { BrowserPane } from './AgentWorkspace';
import { PullRequestList } from './PullRequestsPanel';
import { getEmbedsAnySite, getLinkTarget, openLink } from '../../utils/links';
import { CI_LABELS, FILTER_RESET, GROUP_LABELS, MERGE_LABELS, REVIEW_LABELS, SORT_LABELS, hasFilters, parsePullQuery, patchPullParams, pullOptions, queryPulls, } from '../../utils/pullRequestQuery';
/** PR data and handlers, provided by AgentsView around the main area of the other routes */
export const PullRequestsDataContext = createContext(null);
/** The host's /pulls route: reads the PR data AgentsView already holds (no second data path) */
export const ConnectedPullRequestsPage = (query) => {
    const data = useContext(PullRequestsDataContext);
    return data ? _jsx(PullRequestsPage, { ...data, ...query }) : null;
};
const noop = () => { };
export const SELECT_CLS = 'bg-gray-850 border border-gray-700 rounded px-2 py-1 text-gray-200 text-xs max-w-[12rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor';
export const ICON_BTN = 'flex items-center gap-1 px-1.5 py-1 rounded text-xs text-gray-300 hover:text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor';
export const asOptions = (values) => Object.fromEntries(values.map((v) => [v, v]));
const YES_NO = { yes: 'Yes', no: 'No' };
/** One select filter; the empty option means "any" (also used by the Issues mode) */
export const Filter = ({ label, value, options, onChange }) => (_jsxs("select", { "aria-label": label, value: value ?? '', onChange: (e) => onChange(e.target.value || null), className: `${SELECT_CLS} ${value ? 'border-blue-500/70 text-white' : ''}`, children: [_jsxs("option", { value: "", children: [label, ": any"] }), Object.entries(options).map(([key, text]) => (_jsx("option", { value: key, children: text }, key))), value && !Object.hasOwn(options, value) && _jsx("option", { value: value, children: value })] }));
/** Select over a fixed set of keys; the setter receives the key typed like the query field */
function keyed(update, key) {
    return (value) => update({ [key]: value });
}
/**
 * Full view of the open PRs (route /pulls) with filters, clusters and sorting in the URL.
 * A PR opens in one split pane to the right; the next PR replaces it.
 * Without Electron GitHub refuses to be framed, so PRs open in a tab.
 */
export const PullRequestsPage = ({ searchParams: params, setSearchParams: setParams, ...props }) => {
    const [openUrl, setOpenUrl] = useState(null);
    // A built-in browser that frames any site (Orkumo's Electron BrowserView)
    const canEmbed = getEmbedsAnySite() && !!useHost().renderBrowser;
    const viewRef = useRef(null);
    const searchRef = useRef(null);
    const query = useMemo(() => parsePullQuery(params), [params]);
    const { shown, groups } = useMemo(() => queryPulls(props.rows, query), [props.rows, query]);
    const options = useMemo(() => pullOptions(props.rows), [props.rows]);
    const filtered = hasFilters(query);
    // Typing replaces the history entry; every other change is one Back step
    const update = (patch, replace = false) => setParams((prev) => patchPullParams(prev, patch), { replace });
    // Arriving from the popover: its trigger is hidden here, so focus lands on the view
    useEffect(() => viewRef.current?.focus(), []);
    const openPr = (pr) => {
        if (!pr.url.startsWith('https://'))
            return;
        // Only GitHub pages load in the embedded browser; narrow windows (md breakpoint) and other hosts open externally
        if (canEmbed &&
            getLinkTarget() !== 'system' &&
            pr.url.startsWith('https://github.com/') &&
            window.innerWidth >= 768) {
            setOpenUrl(pr.url);
        }
        else
            openLink(pr.url);
    };
    return (_jsx("div", { ref: viewRef, tabIndex: -1, "aria-label": "Open pull requests", className: "absolute inset-0 flex flex-col min-h-0 bg-gray-900 outline-none", "data-pulls-view": true, children: _jsxs(Group, { orientation: "horizontal", className: "h-full w-full", children: [_jsx(Panel, { id: "pulls-list", minSize: "20%", defaultSize: "40%", className: "min-h-0 min-w-0", children: _jsxs("div", { className: "h-full flex flex-col min-h-0", children: [_jsxs("div", { className: "px-3 py-2 border-b border-gray-800 shrink-0 space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx(GitPullRequest, { size: 14, className: "text-gray-400", "aria-hidden": true }), _jsx("span", { className: "font-medium", children: "Open pull requests" }), _jsx("span", { className: "text-gray-500 tabular-nums text-xs", "data-testid": "pulls-count", children: filtered ? `${shown.length} of ${props.rows.length}` : props.rows.length }), _jsx("div", { className: "flex-1" }), filtered && (_jsxs("button", { onClick: () => {
                                                    update(FILTER_RESET);
                                                    // the button unmounts once no filter is left; keep focus in the toolbar
                                                    searchRef.current?.focus();
                                                }, className: ICON_BTN, children: [_jsx(RotateCcw, { size: 11, "aria-hidden": true }), " Reset filters"] }))] }), _jsxs("div", { role: "toolbar", "aria-label": "Filter, group and sort pull requests", className: "flex flex-wrap items-center gap-1.5", children: [_jsx("input", { ref: searchRef, type: "search", "aria-label": "Search pull requests", placeholder: "Title, #number, branch, author", value: query.q, onChange: (e) => update({ q: e.target.value }, true), className: `${SELECT_CLS} w-56 placeholder:text-gray-500` }), _jsx(Filter, { label: "Repo", value: query.repo, options: asOptions(options.repos), onChange: keyed(update, 'repo') }), _jsx(Filter, { label: "CI", value: query.ci, options: CI_LABELS, onChange: keyed(update, 'ci') }), _jsx(Filter, { label: "Merge", value: query.merge, options: MERGE_LABELS, onChange: keyed(update, 'merge') }), _jsx(Filter, { label: "Review", value: query.review, options: REVIEW_LABELS, onChange: keyed(update, 'review') }), _jsx(Filter, { label: "Draft", value: query.draft, options: YES_NO, onChange: keyed(update, 'draft') }), _jsx(Filter, { label: "Author", value: query.author, options: asOptions(options.authors), onChange: keyed(update, 'author') }), _jsx(Filter, { label: "Base", value: query.base, options: asOptions(options.bases), onChange: keyed(update, 'base') }), _jsx(Filter, { label: "Has agent", value: query.agent, options: YES_NO, onChange: keyed(update, 'agent') }), _jsx("span", { className: "w-px h-4 bg-gray-700 mx-1", "aria-hidden": true }), _jsx("select", { "aria-label": "Group by", value: query.group, onChange: (e) => keyed(update, 'group')(e.target.value), className: SELECT_CLS, children: Object.entries(GROUP_LABELS).map(([key, text]) => (_jsx("option", { value: key, children: key === 'none' ? text : `Group: ${text}` }, key))) }), _jsx("select", { "aria-label": "Sort by", value: query.sort, onChange: (e) => keyed(update, 'sort')(e.target.value), className: SELECT_CLS, children: Object.entries(SORT_LABELS).map(([key, text]) => (_jsxs("option", { value: key, children: ["Sort: ", text] }, key))) }), _jsx("button", { onClick: () => update({ dir: query.dir === 'asc' ? 'desc' : 'asc' }), "aria-label": query.dir === 'asc' ? 'Sort ascending' : 'Sort descending', title: query.dir === 'asc' ? 'Ascending' : 'Descending', className: ICON_BTN, children: query.dir === 'asc' ? (_jsx(ArrowUpNarrowWide, { size: 13, "aria-hidden": true })) : (_jsx(ArrowDownWideNarrow, { size: 13, "aria-hidden": true })) })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto min-h-0", children: _jsx(PullRequestList, { ...props, repoFilter: query.repo, groups: groups, onOpenPr: openPr, openUrl: openUrl }) })] }) }), openUrl && (_jsxs(_Fragment, { children: [_jsx(Separator, { className: "w-1 cursor-col-resize bg-gray-800 hover:bg-blue-500/50 transition-colors" }), _jsx(Panel, { id: "pulls-pr", minSize: "20%", className: "min-h-0 min-w-0 p-1", children: _jsx(BrowserPane, { url: openUrl, active: true, onFocus: noop, onClose: () => setOpenUrl(null) }) })] }))] }) }));
};
