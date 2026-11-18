import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { cacheCountdown, formatCountdown, formatTokens } from '../../utils/agentCache';
/** Prompt-cache countdown, context fill and hits of one session; ticks every second while warm, hidden once expired */
export const CacheBadge = ({ cache, context = true }) => {
    const [now, setNow] = useState(Date.now());
    const { remainingMs, expired, warning } = cacheCountdown(cache, now);
    useEffect(() => {
        if (expired)
            return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [expired, cache]);
    if (expired)
        return null;
    const fill = Math.min(1, cache.cachedTokens / cache.contextWindow);
    const percent = Math.round(fill * 100);
    const title = [
        `Prompt cache expires in ${formatCountdown(remainingMs)} (TTL ${cache.ttlMs / 60_000} min)`,
        `Context: ${formatTokens(cache.cachedTokens)} / ${formatTokens(cache.contextWindow)} tokens (${percent}%)`,
        `Cache hits: ${cache.hits} of ${cache.turns} turns, ${Math.round(cache.hitRatio * 100)}% of input tokens read from cache`,
    ].join('\n');
    return (_jsxs("span", { className: `shrink-0 flex items-center gap-1 tabular-nums ${warning ? 'text-amber-300' : 'text-gray-400'}`, title: title, children: [_jsx(Timer, { size: 10, "aria-hidden": "true", className: "shrink-0" }), _jsx("span", { className: warning ? 'font-semibold' : '', children: formatCountdown(remainingMs) }), context && (_jsxs(_Fragment, { children: [_jsx("span", { className: "w-8 h-1 rounded-full bg-gray-700 overflow-hidden", role: "meter", "aria-label": "Context window fill", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": percent, children: _jsx("span", { className: `block h-full ${fill > 0.8 ? 'bg-red-400' : 'bg-sky-400'} transition-[width] duration-300 motion-reduce:transition-none`, style: { width: `${percent}%` } }) }), _jsxs("span", { children: [formatTokens(cache.cachedTokens), " \u00B7 ", percent, "%"] })] })), _jsx("span", { className: "text-gray-500", children: "\u00B7" }), _jsxs("span", { children: [cache.hits, " hits"] })] }));
};
