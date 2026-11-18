import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Check, CircleDot, GitPullRequest, ListFilter, Search, X, } from 'lucide-react';
import { QUICK_FILTERS, SORT_OPTIONS, } from '../../utils/agentSessions';
import { useLabels } from '../../labels';
import { usePopover } from './PullRequestsPanel';
import { SEARCH_SHORTCUT, isMac } from '../../utils/platform';
/**
 * Inline status strip for the header: state counts double as filter toggles.
 */
export const AgentSummaryBar = ({ counts, openPrs, runningServers, daemon, justCompleted, active, onToggle, onOpenPrs, onOpenServers, panel, }) => {
    const t = useLabels().shell;
    const toggle = (key, count, label, tone) => (_jsxs("button", { onClick: () => onToggle(key), "aria-pressed": active.has(key), title: t.filterToggleTitle(active.has(key), label), className: `px-1.5 py-0.5 rounded tabular-nums hover:bg-gray-800 ${active.has(key) ? 'bg-gray-800 ring-1 ring-inset ring-gray-600' : ''} ${count > 0 ? tone : 'text-gray-500'}`, children: [count, " ", label] }));
    return (_jsxs("div", { className: "flex items-center gap-0.5 text-xs text-gray-400 min-w-0 flex-wrap whitespace-nowrap", children: [_jsx("span", { className: `w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${daemon?.running ? 'bg-emerald-500' : 'bg-gray-600'}`, title: `${t.supervisor(!!daemon?.running)}${daemon?.raw ? `\n${daemon.raw}` : ''}`, role: "img", "aria-label": t.supervisor(!!daemon?.running) }), daemon?.versionMismatch && (_jsx(AlertTriangle, { size: 11, className: "text-yellow-400 mr-1", "aria-label": t.supervisorMismatch })), counts.awaitingInput > 0 ? (_jsxs("button", { onClick: () => onToggle('needs-input'), "aria-pressed": active.has('needs-input'), title: t.awaitingInputFilterTitle, className: `px-1.5 py-0.5 rounded font-semibold tabular-nums bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25 ${active.has('needs-input') ? 'ring-1 ring-inset ring-yellow-500/60' : ''}`, children: [counts.awaitingInput, " ", t.awaitingInput] })) : (toggle('needs-input', 0, t.awaitingInput, '')), toggle('working', counts.working, t.workingCount, 'text-orange-300'), toggle('completed', counts.completed, t.completedCount, 'text-emerald-300'), toggle('cache-expiring', counts.cacheExpiring, t.cacheExpiringCount, 'text-amber-300'), (counts.failed > 0 || active.has('failed')) &&
                toggle('failed', counts.failed, t.failedCount, 'text-red-300'), onOpenPrs && onOpenServers && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-gray-500 px-1", "aria-hidden": "true", children: "|" }), _jsx("button", { onClick: onOpenPrs, disabled: openPrs === null, "data-popover-trigger": true, "aria-haspopup": "dialog", "aria-expanded": panel === 'prs', title: t.openPrsTitle, className: "px-1.5 py-0.5 rounded tabular-nums hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-transparent", children: t.openPrsCount(openPrs) }), _jsx("button", { onClick: onOpenServers, disabled: runningServers === null, "data-popover-trigger": true, "aria-haspopup": "dialog", "aria-expanded": panel === 'servers', title: t.serversTitle, className: "px-1.5 py-0.5 rounded tabular-nums hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-transparent", children: t.serversRunning(runningServers) })] })), justCompleted > 0 && (_jsx("span", { className: "text-emerald-400 px-1.5", children: t.justDone(justCompleted) }))] }));
};
/** Whether the quick-filter chips are expanded (collapsed by default) */
export const CHIPS_OPEN_KEY = 'devOrbitAgentFilterChipsOpen';
/**
 * One search for the rail: the text narrows the agent list and the PR / issue list below it;
 * a highlighted PR or issue narrows the agent list to the agents linked to it.
 */
const SearchPanel = ({ query, onQuery, entries, selected, onToggle, onClose }) => {
    const t = useLabels().shell;
    const ref = usePopover(onClose);
    const inputRef = useRef(null);
    // After usePopover's effect, which focuses the panel itself
    useEffect(() => inputRef.current?.focus(), []);
    const q = query.trim().toLowerCase();
    const shown = q
        ? entries.filter((e) => `${e.label} ${e.title}`.toLowerCase().includes(q))
        : entries;
    return (_jsxs("div", { ref: ref, tabIndex: -1, role: "dialog", "aria-label": t.searchPanel, className: "absolute left-0 right-0 top-full mt-1 z-30 bg-gray-800 border border-gray-700 rounded-lg shadow-xl outline-none", children: [_jsx("div", { className: "p-2 border-b border-gray-700", children: _jsxs("label", { className: "flex items-center gap-1.5 bg-gray-900 px-2 py-1 rounded text-gray-500 focus-within:ring-1 focus-within:ring-blue-500", children: [_jsx(Search, { size: 12, "aria-hidden": true, className: "shrink-0" }), _jsx("input", { ref: inputRef, type: "search", value: query, onChange: (e) => onQuery(e.target.value), onKeyDown: (e) => {
                                if (e.key !== 'Enter')
                                    return;
                                // Focus returns to the trigger: without this the same Enter would click it open again
                                e.preventDefault();
                                onClose();
                            }, placeholder: t.searchPanel, "aria-label": t.searchAgents, className: "w-full min-w-0 bg-transparent text-xs text-gray-200 placeholder-gray-500 outline-none" })] }) }), _jsx("div", { className: "px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500", children: t.linksHeading }), _jsxs("ul", { className: "max-h-72 overflow-y-auto pb-1", "aria-label": t.linksList, children: [shown.length === 0 && (_jsx("li", { className: "px-3 py-2 text-xs text-gray-500", children: entries.length === 0 ? t.noLinks : t.noMatch })), shown.map((entry) => {
                        const on = selected.has(entry.key);
                        const Icon = entry.kind === 'pr' ? GitPullRequest : CircleDot;
                        return (_jsx("li", { children: _jsxs("button", { role: "checkbox", "aria-checked": on, onClick: () => onToggle(entry.key), title: entry.title, className: `w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs transition-colors ${on
                                    ? 'bg-blue-500/20 text-blue-100 hover:bg-blue-500/30'
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`, children: [_jsx(Icon, { size: 12, className: `shrink-0 ${entry.kind === 'pr' ? 'text-yellow-400' : 'text-emerald-400'}`, "aria-hidden": "true" }), _jsx("span", { className: "shrink-0 font-mono tabular-nums", children: entry.label }), _jsx("span", { className: "truncate min-w-0", children: entry.title })] }) }, entry.key));
                    })] })] }));
};
/**
 * One row above the list: grouping (`leading`), sort, filter chips toggle, search, `trailing`
 * and the count.
 */
export const AgentFilterBar = ({ sort, onSort, active, onToggle, chipCounts, shown, total, filtered, onClear, linkEntries, linkSelected, onToggleLink, query, onQuery, leading, trailing, }) => {
    const t = useLabels().shell;
    const [open, setOpen] = useState(false);
    const [chipsOpen, setChipsOpenState] = useState(() => {
        try {
            return localStorage.getItem(CHIPS_OPEN_KEY) === '1';
        }
        catch {
            return false;
        }
    });
    const setChipsOpen = (open) => {
        setChipsOpenState(open);
        try {
            localStorage.setItem(CHIPS_OPEN_KEY, open ? '1' : '0');
        }
        catch {
            // stays in memory only
        }
    };
    const [searchOpen, setSearchOpen] = useState(false);
    const rootRef = useRef(null);
    const barRef = useRef(null);
    const current = SORT_OPTIONS.find((o) => o.key === sort.key) || SORT_OPTIONS[0];
    // Cmd/Ctrl+K toggles the search; in a terminal off macOS Ctrl+K is readline's kill-line, so
    // there it takes Ctrl+Shift+K (as the palette does with P)
    useEffect(() => {
        const onKey = (e) => {
            const mod = isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
            const inTerminal = !isMac && !!e.target?.closest?.('.xterm');
            if (!mod || e.altKey || e.key.toLowerCase() !== 'k' || e.shiftKey !== inTerminal)
                return;
            // Rail hidden (small screen on another route) or a modal on top: not ours
            const bar = barRef.current;
            if (!bar || bar.checkVisibility?.() === false)
                return;
            if (document.querySelector('[aria-modal="true"]'))
                return;
            e.preventDefault();
            e.stopPropagation();
            setSearchOpen((v) => !v);
        };
        document.addEventListener('keydown', onKey, true);
        return () => document.removeEventListener('keydown', onKey, true);
    }, []);
    useEffect(() => {
        if (!open)
            return;
        const onDown = (e) => {
            if (!rootRef.current?.contains(e.target))
                setOpen(false);
        };
        const onKey = (e) => {
            if (e.key === 'Escape')
                setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);
    const searching = query.trim() !== '' || linkSelected.size > 0;
    return (_jsxs("div", { ref: barRef, className: "px-3 py-2 border-b border-gray-800 space-y-1.5 shrink-0", children: [_jsxs("div", { className: "relative flex items-center gap-1 text-xs", children: [leading, _jsxs("div", { className: "relative min-w-0", ref: rootRef, children: [_jsxs("button", { onClick: () => setOpen((v) => !v), "aria-haspopup": "menu", "aria-expanded": open, "aria-label": t.sortAgentsBy(t.sortOptions[current.key]), title: t.sortAgents, className: "w-full flex items-center gap-1 px-1.5 py-1 rounded text-gray-300 hover:bg-gray-800 border border-gray-800", children: [_jsx(ArrowUpDown, { size: 12, className: "shrink-0" }), _jsx("span", { className: "truncate", children: t.sortOptions[current.key] })] }), open && (_jsx("div", { role: "menu", className: "absolute left-0 top-full mt-1 z-30 min-w-[180px] bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1", children: SORT_OPTIONS.map((option) => (_jsxs("button", { role: "menuitemradio", "aria-checked": option.key === sort.key, onClick: () => {
                                        onSort({ key: option.key, dir: option.dir });
                                        setOpen(false);
                                    }, className: "w-full flex items-center gap-2 text-left px-3 py-1.5 text-gray-200 hover:bg-gray-700 hover:text-white", children: [_jsx("span", { className: "w-3", children: option.key === sort.key && _jsx(Check, { size: 12 }) }), t.sortOptions[option.key]] }, option.key))) }))] }), _jsx("button", { onClick: () => onSort({ ...sort, dir: sort.dir === 'asc' ? 'desc' : 'asc' }), disabled: !current.directional, title: current.directional ? t.sortDirection(sort.dir === 'asc') : t.fixedDirection, "aria-label": t.reverseSort, className: "shrink-0 p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed", children: sort.dir === 'asc' ? _jsx(ArrowUp, { size: 13 }) : _jsx(ArrowDown, { size: 13 }) }), _jsxs("button", { onClick: () => setChipsOpen(!chipsOpen), "aria-expanded": chipsOpen, "aria-controls": "agent-filter-chips", title: chipsOpen ? t.hideFilters : t.showFilters, "aria-label": chipsOpen ? t.hideFilters : t.showFilters, className: `shrink-0 flex items-center gap-1 px-1.5 py-1 rounded hover:bg-gray-800 ${active.size > 0 ? 'text-blue-300' : 'text-gray-400 hover:text-white'}`, children: [_jsx(ListFilter, { size: 13 }), active.size > 0 && _jsx("span", { className: "tabular-nums", children: active.size })] }), _jsxs("div", { className: "min-w-0", children: [_jsxs("button", { onClick: () => setSearchOpen((v) => !v), "data-popover-trigger": true, "aria-haspopup": "dialog", "aria-expanded": searchOpen, title: t.searchTitle(SEARCH_SHORTCUT), "aria-label": t.searchTitle(SEARCH_SHORTCUT), className: `max-w-full flex items-center gap-1 px-1.5 py-1 rounded hover:bg-gray-800 ${searching ? 'text-blue-300' : 'text-gray-400 hover:text-white'} ${searchOpen ? 'bg-gray-800' : ''}`, children: [_jsx(Search, { size: 13, className: "shrink-0" }), query.trim() && _jsx("span", { className: "truncate", children: query.trim() }), linkSelected.size > 0 && (_jsxs("span", { className: "shrink-0 flex items-center gap-0.5 tabular-nums", children: [_jsx(GitPullRequest, { size: 11, "aria-hidden": true }), linkSelected.size] }))] }), searchOpen && (_jsx(SearchPanel, { query: query, onQuery: onQuery, entries: linkEntries, selected: linkSelected, onToggle: onToggleLink, onClose: () => setSearchOpen(false) }))] }), trailing, _jsx("span", { className: "flex-1" }), _jsx("span", { className: "shrink-0 text-gray-500 tabular-nums whitespace-nowrap", "aria-live": "polite", children: filtered ? t.shownOf(shown, total) : t.agentCount(total) }), filtered && (_jsx("button", { onClick: onClear, className: "shrink-0 p-1 rounded text-blue-300 hover:text-white hover:bg-gray-800", title: t.clearFilters, "aria-label": t.clearFilters, children: _jsx(X, { size: 12 }) }))] }), chipsOpen && (_jsx("div", { id: "agent-filter-chips", className: "flex flex-wrap gap-1", role: "group", "aria-label": t.filterAgents, children: QUICK_FILTERS.map((chip) => {
                    const on = active.has(chip.key);
                    const count = chipCounts[chip.key];
                    return (_jsxs("button", { onClick: () => onToggle(chip.key), "aria-pressed": on, title: t.quickFilters[chip.key].title, className: `px-2 py-0.5 rounded-full text-[11px] border tabular-nums ${on
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-200'
                            : count === 0
                                ? 'border-gray-800 text-gray-500 hover:bg-gray-800'
                                : 'border-gray-700 text-gray-300 hover:bg-gray-800'}`, children: [t.quickFilters[chip.key].label, ' ', _jsx("span", { className: on ? 'text-blue-300' : 'text-gray-500', children: count })] }, chip.key));
                }) }))] }));
};
