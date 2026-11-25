import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useHost } from '../../host';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, ChevronRight, GitPullRequest, RotateCcw, } from 'lucide-react';
import { BrowserPane } from './AgentWorkspace';
import { PullRequestList } from './PullRequestsPanel';
import { getEmbedsAnySite, getLinkTarget, openLink } from '../../utils/links';
import { FILTER_RESET, hasFilters, parsePullQuery, patchPullParams, filterPulls, pullOptions, queryPulls, } from '../../utils/pullRequestQuery';
import { useLabels } from '../../labels';
import { Choice, choiceMode } from '../Choice';
import { RepoTree } from './RepoTree';
import { buildRepoTree, folderKeys } from '../../utils/repoTree';
/** PR data and handlers, provided by AgentsView around the main area of the other routes */
export const PullRequestsDataContext = createContext(null);
/** The host's /pulls route: reads the PR data AgentsView already holds (no second data path) */
export const ConnectedPullRequestsPage = (query) => {
    const data = useContext(PullRequestsDataContext);
    return data ? _jsx(PullRequestsPage, { ...data, ...query }) : null;
};
const noop = () => { };
/** Below this width of the list column the tree folds into a section above the list */
const TREE_MIN_WIDTH = 560;
const SELECTION_KEY = 'agentsUi.pullsTreeSelection';
function readSelection() {
    try {
        const v = JSON.parse(localStorage.getItem(SELECTION_KEY) || 'null');
        const str = (x) => (typeof x === 'string' && x ? x : null);
        const s = v && typeof v === 'object' ? { repo: str(v.repo), folder: str(v.folder) } : null;
        return s && (s.repo || s.folder) ? s : null;
    }
    catch {
        return null;
    }
}
function writeSelection(s) {
    try {
        if (s && (s.repo || s.folder))
            localStorage.setItem(SELECTION_KEY, JSON.stringify(s));
        else
            localStorage.removeItem(SELECTION_KEY);
    }
    catch {
        // unavailable: the URL still holds the selection
    }
}
/** True while the element is narrower than TREE_MIN_WIDTH (no ResizeObserver: wide) */
function useNarrow(ref) {
    const [narrow, setNarrow] = useState(false);
    useEffect(() => {
        const el = ref.current?.parentElement;
        if (!el || typeof ResizeObserver === 'undefined')
            return;
        const ro = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < TREE_MIN_WIDTH));
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref]);
    return narrow;
}
export const SELECT_CLS = 'bg-gray-850 border border-gray-700 rounded px-2 py-1 text-gray-200 text-xs max-w-[12rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor';
export const ICON_BTN = 'flex items-center gap-1 px-1.5 py-1 rounded text-xs text-gray-300 hover:text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor';
export const asOptions = (values) => Object.fromEntries(values.map((v) => [v, v]));
/**
 * One filter over `options` (key → text) plus "any" (null), as a `Choice`: pills with a visible
 * label for up to two values, else a menu (searchable from 7 values). Also used by Orkumo's
 * Issues and History pages.
 */
export const Filter = ({ label, value, options, onChange }) => {
    const t = useLabels().shell;
    const entries = Object.entries(options);
    // A value from the URL that no item has (any more) stays visible and clearable
    if (value && !Object.hasOwn(options, value))
        entries.push([value, value]);
    const pills = choiceMode(entries.length + 1) === 'pills';
    const choice = (_jsx(Choice, { label: label, value: value ?? '', onChange: (v) => onChange(v || null), options: [
            { value: '', label: pills ? t.anyOption : t.filterAny(label) },
            ...entries.map(([key, text]) => ({ value: key, label: text })),
        ], className: pills ? '' : `max-w-[12rem] ${value ? 'border-blue-500/70 text-white' : ''}` }));
    return pills ? (_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-xs text-gray-400", "aria-hidden": true, children: label }), choice] })) : (choice);
};
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
    const t = useLabels().shell;
    const [openUrl, setOpenUrl] = useState(null);
    // A built-in browser that frames any site (Orkumo's Electron BrowserView)
    const canEmbed = getEmbedsAnySite() && !!useHost().renderBrowser;
    const viewRef = useRef(null);
    const searchRef = useRef(null);
    const query = useMemo(() => parsePullQuery(params), [params]);
    // Local checkout per repo: the tree groups repos by their folder
    const roots = useMemo(() => {
        const map = {};
        for (const ctx of Object.values(props.contexts))
            if (ctx?.repo?.slug && ctx.repo.root)
                map[ctx.repo.slug.toLowerCase()] = ctx.repo.root;
        return map;
    }, [props.contexts]);
    const folders = useMemo(() => folderKeys(props.rows.map((r) => r.pr.repoSlug), roots), [props.rows, roots]);
    // Tree counts follow every filter except the tree's own
    const tree = useMemo(() => buildRepoTree(props.rows, filterPulls(props.rows, { ...query, repo: null, folder: null }), roots), [props.rows, query, roots]);
    // A folder key the tree does not know (older key format, folder gone) means all repositories
    const known = !query.folder || tree.folders.some((f) => f.key === query.folder);
    const view = useMemo(() => (known ? query : { ...query, folder: null }), [query, known]);
    const { shown, groups } = useMemo(() => queryPulls(props.rows, view, t.pulls, folders), [props.rows, view, t.pulls, folders]);
    const selection = view.repo
        ? { kind: 'repo', slug: view.repo }
        : view.folder
            ? { kind: 'folder', key: view.folder }
            : { kind: 'all' };
    const listRef = useRef(null);
    const narrow = useNarrow(listRef);
    const [treeOpen, setTreeOpen] = useState(false);
    const options = useMemo(() => pullOptions(props.rows), [props.rows]);
    const filtered = hasFilters(view);
    // Typing replaces the history entry; every other change is one Back step
    const update = (patch, replace = false) => setParams((prev) => patchPullParams(prev, patch), { replace });
    // Arriving from the popover: its trigger is hidden here, so focus lands on the view
    useEffect(() => viewRef.current?.focus(), []);
    // The tree's selection lives in the URL; a visit without one restores the last one
    useEffect(() => {
        if (query.repo || query.folder)
            return;
        const stored = readSelection();
        if (stored)
            update(stored, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
    }, []);
    // Every later selection, also one from a link or Back, is the one the next visit restores
    const arrived = useRef(false);
    useEffect(() => {
        if (!arrived.current) {
            arrived.current = true;
            // an empty arrival is about to be restored above, not cleared
            if (!query.repo && !query.folder)
                return;
        }
        // an unknown folder may still be loading its checkouts: keep what is stored
        if (known)
            writeSelection({ repo: query.repo, folder: query.folder });
    }, [query.repo, query.folder, known]);
    const selectRepos = (s) => update({
        repo: s.kind === 'repo' ? s.slug : null,
        folder: s.kind === 'folder' ? s.key : null,
    });
    const selectionLabel = selection.kind === 'repo'
        ? selection.slug
        : selection.kind === 'folder'
            ? (tree.folders.find((f) => f.key === selection.key)?.label ?? selection.key)
            : t.allRepositories;
    const repoTree = (_jsx(RepoTree, { tree: tree, selection: selection, onSelect: selectRepos, loading: Object.keys(props.contexts).length === 0 }));
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
    return (_jsx("div", { ref: viewRef, tabIndex: -1, "aria-label": t.openPullRequests, className: "absolute inset-0 flex flex-col min-h-0 bg-gray-900 outline-none", "data-pulls-view": true, children: _jsxs(Group, { orientation: "horizontal", className: "h-full w-full", children: [_jsx(Panel, { id: "pulls-list", minSize: "20%", defaultSize: "40%", className: "min-h-0 min-w-0", children: _jsxs("div", { className: "h-full flex flex-col min-h-0", children: [_jsxs("div", { className: "px-3 py-2 border-b border-gray-800 shrink-0 space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx(GitPullRequest, { size: 14, className: "text-gray-400", "aria-hidden": true }), _jsx("span", { className: "font-medium", children: t.openPullRequests }), _jsx("span", { className: "text-gray-500 tabular-nums text-xs", "data-testid": "pulls-count", children: filtered ? t.shownOf(shown.length, props.rows.length) : props.rows.length }), _jsx("div", { className: "flex-1" }), filtered && (_jsxs("button", { onClick: () => {
                                                    update(FILTER_RESET);
                                                    // the button unmounts once no filter is left; keep focus in the toolbar
                                                    searchRef.current?.focus();
                                                }, className: ICON_BTN, children: [_jsx(RotateCcw, { size: 11, "aria-hidden": true }), " ", t.resetFilters] }))] }), _jsxs("div", { role: "toolbar", "aria-label": t.pullsToolbar, className: "flex flex-wrap items-center gap-1.5", children: [_jsx("input", { ref: searchRef, type: "search", "aria-label": t.searchPulls, placeholder: t.searchPullsPlaceholder, value: query.q, onChange: (e) => update({ q: e.target.value }, true), className: `${SELECT_CLS} w-56 placeholder:text-gray-500` }), _jsx(Filter, { label: t.pullFilters.ci, value: query.ci, options: t.pulls.ci, onChange: keyed(update, 'ci') }), _jsx(Filter, { label: t.pullFilters.merge, value: query.merge, options: t.pulls.merge, onChange: keyed(update, 'merge') }), _jsx(Filter, { label: t.pullFilters.review, value: query.review, options: t.pulls.review, onChange: keyed(update, 'review') }), _jsx(Filter, { label: t.pullFilters.draft, value: query.draft, options: t.pulls.yesNo, onChange: keyed(update, 'draft') }), _jsx(Filter, { label: t.pullFilters.author, value: query.author, options: asOptions(options.authors), onChange: keyed(update, 'author') }), _jsx(Filter, { label: t.pullFilters.base, value: query.base, options: asOptions(options.bases), onChange: keyed(update, 'base') }), _jsx(Filter, { label: t.pullFilters.agent, value: query.agent, options: t.pulls.yesNo, onChange: keyed(update, 'agent') }), _jsx("span", { className: "w-px h-4 bg-gray-700 mx-1", "aria-hidden": true }), _jsx(Choice, { label: t.groupBy, value: query.group, onChange: (v) => update({ group: v }), options: Object.entries(t.pulls.group).map(([key, text]) => ({
                                                    value: key,
                                                    label: key === 'none' ? text : t.groupOption(text),
                                                })), className: "max-w-[12rem]" }), _jsx(Choice, { label: t.sortBy, value: query.sort, onChange: (v) => update({ sort: v }), options: Object.entries(t.pulls.sort).map(([key, text]) => ({ value: key, label: t.sortOption(text) })), className: "max-w-[12rem]" }), _jsx("button", { onClick: () => update({ dir: query.dir === 'asc' ? 'desc' : 'asc' }), "aria-label": query.dir === 'asc' ? t.sortAscending : t.sortDescending, title: query.dir === 'asc' ? t.ascending : t.descending, className: ICON_BTN, children: query.dir === 'asc' ? (_jsx(ArrowUpNarrowWide, { size: 13, "aria-hidden": true })) : (_jsx(ArrowDownWideNarrow, { size: 13, "aria-hidden": true })) })] })] }), narrow && (_jsxs("div", { className: "shrink-0 border-b border-gray-800", children: [_jsxs("button", { type: "button", "aria-expanded": treeOpen, onClick: () => setTreeOpen((o) => !o), className: `w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cursor`, children: [treeOpen ? (_jsx(ChevronDown, { size: 12, "aria-hidden": true })) : (_jsx(ChevronRight, { size: 12, "aria-hidden": true })), _jsx("span", { className: "text-gray-400", children: t.repoTree }), _jsx("span", { className: "min-w-0 truncate text-gray-100", children: selectionLabel })] }), treeOpen && (_jsx("div", { className: "max-h-[40vh] overflow-y-auto px-1 pb-1", children: repoTree }))] })), _jsxs("div", { ref: listRef, className: "flex-1 flex min-h-0", children: [!narrow && (_jsx("div", { className: "w-56 shrink-0 border-r border-gray-800 overflow-y-auto px-1", children: repoTree })), _jsx("div", { className: "flex-1 min-w-0 overflow-y-auto min-h-0", children: _jsx(PullRequestList, { ...props, repoFilter: query.repo, groups: groups, onOpenPr: openPr, openUrl: openUrl }) })] })] }) }), openUrl && (_jsxs(_Fragment, { children: [_jsx(Separator, { className: "w-1 cursor-col-resize bg-gray-800 hover:bg-blue-500/50 transition-colors" }), _jsx(Panel, { id: "pulls-pr", minSize: "20%", className: "min-h-0 min-w-0 p-1", children: _jsx(BrowserPane, { url: openUrl, active: true, onFocus: noop, onClose: () => setOpenUrl(null) }) })] }))] }) }));
};
