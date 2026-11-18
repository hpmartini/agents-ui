import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { GitBranch } from 'lucide-react';
import { useTransport } from '../../../host';
import { cacheCountdown, formatTokens } from '../../../utils/agentCache';
import { CacheBadge } from '../CacheBadge';
import { LimitBar } from '../../UsageView/LimitBar';
import { WEEK_TICKS, weekPace } from '../../../utils/usage';
import { pollWhileVisible } from '../../../utils/visiblePoll';
const POLL_MS = 15_000;
/**
 * TUI-like status line: branch with untracked (?) / changed (±) counts, prompt cache and
 * context, 5h / 7d plan limits. Refreshes while visible and after each finished turn.
 */
export const ChatStatusLine = ({ chatId, turns, visible, picker }) => {
    const [status, setStatus] = useState(null);
    const chat = useTransport().chat;
    useEffect(() => {
        if (!visible || !chat)
            return;
        let cancelled = false;
        const load = () => chat
            .fetchChatStatus(chatId)
            .then((s) => !cancelled && setStatus(s))
            .catch(() => {
            // keep the last status; the chat itself reports a gone session
        });
        const stop = pollWhileVisible(load, POLL_MS);
        return () => {
            cancelled = true;
            stop();
        };
    }, [chat, chatId, turns, visible]);
    if (!status)
        return null;
    const { git, cache, context, limits } = status;
    const cold = cache && cacheCountdown(cache, Date.now()).expired;
    const fill = context ? Math.min(100, (context.tokens / context.window) * 100) : 0;
    return (_jsxs("div", { className: "mt-2 grid grid-cols-2 sm:grid-cols-[auto_minmax(9rem,1fr)_minmax(6rem,0.6fr)_minmax(9rem,1fr)] items-end gap-x-4 gap-y-2 text-xs text-gray-300", children: [_jsxs("div", { className: "flex flex-col items-start gap-1.5 self-center min-w-0", children: [git?.branch && (_jsxs("span", { className: "flex items-center gap-1.5 font-mono", title: `${git.untracked} untracked, ${git.changed} uncommitted changes${git.ahead || git.behind ? `, ${git.ahead} ahead, ${git.behind} behind` : ''}`, children: [_jsx(GitBranch, { size: 13, "aria-hidden": true, className: "text-gray-400" }), _jsx("span", { className: "text-gray-100 font-medium", children: git.branch }), git.untracked > 0 && _jsxs("span", { className: "text-amber-300", children: ["?", git.untracked] }), git.changed > 0 && _jsxs("span", { className: "text-sky-300", children: ["\u00B1", git.changed] }), git.ahead > 0 && _jsxs("span", { className: "text-emerald-300", children: ["\u2191", git.ahead] }), git.behind > 0 && _jsxs("span", { className: "text-red-300", children: ["\u2193", git.behind] }), !git.untracked && !git.changed && _jsx("span", { className: "text-emerald-400", children: "\u2713" })] })), picker] }), context ? (_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-baseline justify-between gap-2", children: [_jsx("span", { className: "text-gray-400", children: "Context" }), _jsxs("span", { className: "tabular-nums text-gray-100", children: [formatTokens(context.tokens), " / ", formatTokens(context.window), " \u00B7 ", Math.round(fill), " %"] })] }), _jsx("div", { role: "meter", "aria-label": "Context window fill", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(fill), className: "mt-1 h-2 rounded-full bg-gray-800 overflow-hidden", children: _jsx("div", { className: `h-full rounded-full ${fill > 80 ? 'bg-red-500' : fill > 60 ? 'bg-yellow-500' : 'bg-sky-500'} transition-[width] duration-300 motion-reduce:transition-none`, style: { width: `${fill}%` } }) }), cache && (_jsx("div", { className: "mt-1 text-[11px] text-gray-500", children: cold ? (_jsx("span", { title: "Prompt cache expired: the next turn writes it again", children: "cache cold" })) : (_jsx(CacheBadge, { cache: cache, context: false })) }))] })) : (_jsx("span", {})), limits ? (_jsxs(_Fragment, { children: [limits.fiveHour ? (_jsx(LimitBar, { label: "5h", window: limits.fiveHour, unknownText: "\u2013" })) : (_jsx("span", {})), _jsx(LimitBar, { label: "7 Tage", window: limits.weekly, unknownText: "\u2013", ticks: WEEK_TICKS, marker: weekPace(), markerLabel: "Heute" })] })) : null] }));
};
