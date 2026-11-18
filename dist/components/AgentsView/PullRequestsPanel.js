import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { CheckCircle2, CircleDashed, Code2, ExternalLink, GitPullRequest, Maximize2, X, XCircle, } from 'lucide-react';
import { formatAge } from '../../utils/agentSessions';
import { mergeKey } from '../../utils/pullRequestQuery';
import { useLabels } from '../../labels';
/**
 * Popover behaviour shared by the summary-bar panels: focus moves in, Esc and
 * outside clicks close, focus returns to the trigger unless the user moved it elsewhere
 * (e.g. attached an agent). Non-modal on purpose: Tab may leave the panel.
 */
export function usePopover(onClose, exclusive = false) {
    const ref = useRef(null);
    useEffect(() => {
        // activeElement is body in Safari/Firefox after a click, so find the trigger by its state
        const trigger = document.querySelector('[data-popover-trigger][aria-expanded="true"]');
        ref.current?.focus();
        const onKey = (e) => {
            if (e.key !== 'Escape')
                return;
            e.stopImmediatePropagation();
            onClose();
        };
        const onDown = (e) => {
            const target = e.target;
            // Triggers toggle the panel themselves. exclusive (#254): only the trigger next to this
            // panel counts, so opening a sibling picker closes this one.
            const hit = target.closest('[data-popover-trigger]');
            const own = exclusive ? !!hit && !!ref.current?.parentElement?.contains(hit) : !!hit;
            if (ref.current?.contains(target) || own)
                return;
            onClose();
        };
        document.addEventListener('keydown', onKey, true);
        // capture: dialogs stop mousedown from bubbling to document (#254)
        document.addEventListener('mousedown', onDown, true);
        // Enter/Space on a sibling trigger sends a click without a mousedown
        if (exclusive)
            document.addEventListener('click', onDown, true);
        return () => {
            document.removeEventListener('keydown', onKey, true);
            document.removeEventListener('mousedown', onDown, true);
            document.removeEventListener('click', onDown, true);
            const focus = document.activeElement;
            if (!focus || focus === document.body || ref.current?.contains(focus))
                trigger?.focus?.();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return ref;
}
const CI = {
    success: { icon: _jsx(CheckCircle2, { size: 12 }), tone: 'text-emerald-400' },
    failure: { icon: _jsx(XCircle, { size: 12 }), tone: 'text-red-300' },
    pending: { icon: _jsx(CircleDashed, { size: 12 }), tone: 'text-yellow-400' },
    none: { icon: _jsx(CircleDashed, { size: 12 }), tone: 'text-gray-500' },
};
const MERGE_TONE = {
    ready: 'text-emerald-400',
    blocked: 'text-yellow-400',
    checking: 'text-gray-400',
    conflicts: 'text-red-300',
};
/** GitHub's review decisions -> the review keys of the labels */
const REVIEW = {
    APPROVED: 'approved',
    CHANGES_REQUESTED: 'changes',
    REVIEW_REQUIRED: 'required',
};
export const filterPullRows = (rows, repoFilter) => repoFilter ? rows.filter((r) => r.pr.repoSlug === repoFilter) : rows;
/** PR rows shared by the summary-bar popover and the full /pulls view */
export const PullRequestList = ({ rows, sessions, contexts, repoFilter, onSelectAgent, onOpenCode, onOpenPr, openUrl, onDone, groups, }) => {
    const t = useLabels().shell;
    const loading = Object.keys(contexts).length === 0;
    const shown = groups ? groups.flatMap((g) => g.rows) : filterPullRows(rows, repoFilter);
    // pulls === null means gh could not answer for that repo; never show it as 0
    const unavailable = [
        ...new Set(sessions
            .map((s) => contexts[s.id])
            .filter((c) => !!c?.repo?.slug && c.pulls === null)
            .map((c) => c.repo.slug)),
    ].filter((name) => !repoFilter || name.toLowerCase() === repoFilter.toLowerCase());
    const renderRow = (row, groupKey) => {
        const { pr, agents } = row;
        const ci = CI[pr.ci];
        const mergeState = mergeKey(pr);
        const review = REVIEW[pr.reviewDecision];
        const isOpen = !!openUrl && openUrl === pr.url;
        return (_jsxs("li", { className: `px-3 py-2 text-xs space-y-1 ${isOpen ? 'bg-gray-800/60' : ''}`, children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx("span", { className: "text-gray-500 shrink-0", children: pr.repoSlug }), onOpenPr ? (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => onOpenPr(pr), "aria-current": isOpen || undefined, className: "flex items-center gap-1 min-w-0 text-left text-gray-100 hover:text-blue-300 hover:underline", title: t.openNextToList, children: [_jsxs("span", { className: "font-mono shrink-0", children: ["#", pr.number] }), _jsx("span", { className: "truncate", children: pr.title })] }), _jsx("a", { href: pr.url, target: "_blank", rel: "noopener noreferrer", className: "shrink-0 text-gray-400 hover:text-blue-300", title: t.openInBrowser, "aria-label": t.openPrInBrowser(`#${pr.number}`), children: _jsx(ExternalLink, { size: 10 }) })] })) : (_jsxs("a", { href: pr.url, target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-1 min-w-0 text-gray-100 hover:text-blue-300 hover:underline", children: [_jsxs("span", { className: "font-mono shrink-0", children: ["#", pr.number] }), _jsx("span", { className: "truncate", children: pr.title }), _jsx(ExternalLink, { size: 10, className: "shrink-0" })] })), pr.isDraft && (_jsx("span", { className: "px-1 rounded border border-gray-600 text-gray-400 shrink-0", children: t.draft }))] }), _jsxs("div", { className: "flex flex-wrap items-center gap-x-3 gap-y-0.5 text-gray-400", children: [_jsxs("span", { className: `flex items-center gap-1 ${ci.tone}`, children: [ci.icon, t.pulls.ci[pr.ci], pr.ci !== 'none' && (_jsx("span", { className: "tabular-nums text-gray-500", children: t.ciCounts(pr.ciPassed, pr.ciFailed, pr.ciPending) }))] }), _jsx("span", { className: MERGE_TONE[mergeState], children: t.pulls.merge[mergeState] }), pr.reviewDecision && _jsx("span", { children: review ? t.pulls.review[review] : undefined }), pr.author && _jsx("span", { children: t.byAuthor(pr.author) }), _jsx("span", { className: "tabular-nums", title: pr.updatedAt, children: t.updatedAgo(formatAge(Date.now() - Date.parse(pr.updatedAt), t.ageUnits)) }), _jsx("span", { className: "font-mono text-gray-500 truncate max-w-[16rem]", children: t.branchTo(pr.headRef, pr.baseRef) }), agents.map((agent) => (_jsx("button", { onClick: () => {
                                onSelectAgent(agent.id);
                                onDone?.();
                            }, className: "px-1.5 rounded text-blue-300 hover:text-white hover:bg-gray-800", title: t.selectAgent, children: agent.name }, agent.id))), onOpenCode && (_jsxs("button", { onClick: () => {
                                onOpenCode(row);
                                onDone?.();
                            }, className: "flex items-center gap-1 px-1.5 rounded text-gray-300 hover:text-white hover:bg-gray-800", title: t.openCodeTitle, children: [_jsx(Code2, { size: 11 }), " ", t.code] }))] })] }, `${groupKey}:${pr.repoSlug}#${pr.number}`));
    };
    const list = (items, groupKey = '') => (_jsx("ul", { className: "divide-y divide-gray-800", children: items.map((row) => renderRow(row, groupKey)) }));
    const clustered = !!groups && !(groups.length === 1 && groups[0].key === 'all');
    return (_jsxs(_Fragment, { children: [loading ? (_jsx("p", { className: "px-3 py-4 text-xs text-gray-500", children: t.loadingPulls })) : shown.length === 0 ? (_jsx("p", { className: "px-3 py-4 text-xs text-gray-500", children: groups && rows.length > 0 ? t.noPullsMatch : t.noOpenPulls(repoFilter) })) : groups && clustered ? (groups.map((g) => (_jsxs("section", { "aria-label": `${g.label} (${g.rows.length})`, children: [_jsxs("h3", { className: "sticky top-0 z-[1] flex items-center gap-2 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-400 bg-gray-850 border-y border-gray-800", children: [g.label, _jsx("span", { className: "tabular-nums text-gray-500", children: g.rows.length })] }), list(g.rows, g.key)] }, g.key || '-')))) : (list(shown)), unavailable.length > 0 && (_jsxs("p", { className: "px-3 py-2 text-[11px] text-yellow-400/90 border-t border-gray-800", children: [t.pullsUnavailable, " ", unavailable.join(', ')] }))] }));
};
/** Title row with count and repo filter; children are the trailing buttons */
export const PullRequestsHeader = ({ count, repoFilter, onClearRepo, children }) => {
    const t = useLabels().shell;
    return (_jsxs("div", { className: "flex items-center gap-2 px-3 py-2 border-b border-gray-800 shrink-0 text-sm", children: [_jsx(GitPullRequest, { size: 14, className: "text-gray-400" }), _jsx("span", { className: "font-medium", children: t.openPullRequests }), _jsx("span", { className: "text-gray-500 tabular-nums text-xs", children: count }), repoFilter && (_jsxs("button", { onClick: onClearRepo, className: "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-blue-300 hover:text-white hover:bg-gray-800", title: t.showAllRepos, children: [repoFilter, " ", _jsx(X, { size: 10 })] })), _jsx("div", { className: "flex-1" }), children] }));
};
export const PullRequestsPanel = ({ onClearRepo, onMaximize, onClose, ...list }) => {
    const t = useLabels().shell;
    const ref = usePopover(onClose);
    return (_jsxs("div", { ref: ref, tabIndex: -1, role: "dialog", "aria-label": t.openPullRequests, className: "absolute right-4 top-full mt-1 z-40 w-[min(900px,calc(100vw-2rem))] max-h-[70vh] flex flex-col bg-gray-900 border border-gray-700 rounded-lg shadow-2xl outline-none", children: [_jsxs(PullRequestsHeader, { count: filterPullRows(list.rows, list.repoFilter).length, repoFilter: list.repoFilter, onClearRepo: onClearRepo, children: [onMaximize && (_jsx("button", { onClick: () => {
                            onMaximize();
                            onClose();
                        }, "aria-label": t.maximizePulls, title: t.openFullView, className: "p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800", children: _jsx(Maximize2, { size: 14 }) })), _jsx("button", { onClick: onClose, "aria-label": t.close, className: "p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800", children: _jsx(X, { size: 14 }) })] }), _jsx("div", { className: "overflow-y-auto min-h-0", children: _jsx(PullRequestList, { ...list, onDone: onClose }) })] }));
};
