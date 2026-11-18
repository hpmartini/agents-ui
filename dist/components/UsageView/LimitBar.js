import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatResetIn, limitStatus } from '../../utils/usage';
const BAR_TONE = {
    unknown: 'bg-gray-600',
    ok: 'bg-emerald-500',
    warn: 'bg-yellow-500',
    critical: 'bg-red-500',
};
const TEXT_TONE = {
    unknown: 'text-gray-500',
    ok: 'text-gray-200',
    warn: 'text-yellow-300',
    critical: 'text-red-300',
};
/** One plan-limit window: % used + reset countdown. Never shows a number it does not have. */
export const LimitBar = ({ label, window, unknownText = 'Limit unbekannt', compact = false, ticks, marker, markerLabel, now = Date.now(), }) => {
    const status = limitStatus(window);
    const pct = status === 'unknown' ? null : Math.min(100, Math.max(0, window.usedPercent));
    const height = compact ? 'h-1' : 'h-2';
    return (_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: `flex items-baseline justify-between gap-2 ${compact ? 'text-[11px]' : 'text-xs'}`, children: [_jsx("span", { className: "text-gray-400", children: label }), _jsx("span", { className: `tabular-nums ${TEXT_TONE[status]}`, children: pct == null ? unknownText : `${Math.round(pct)} %` })] }), pct == null ? (_jsx("div", { className: `mt-1 ${height} rounded-full bg-gray-800 border border-dashed border-gray-700`, "aria-hidden": "true" })) : (_jsxs("div", { role: "progressbar", "aria-label": `${label} genutzt`, "aria-valuenow": Math.round(pct), "aria-valuemin": 0, "aria-valuemax": 100, className: `relative mt-1 ${height} rounded-full bg-gray-800 overflow-hidden`, children: [_jsx("div", { className: `h-full rounded-full ${BAR_TONE[status]}`, style: { width: `${pct}%` } }), ticks?.map((t) => (_jsx("span", { "aria-hidden": "true", className: "absolute inset-y-0 w-0.5 -ml-px bg-gray-950", style: { left: `${t}%` } }, t))), marker != null && (_jsx("span", { "aria-hidden": "true", title: markerLabel, className: "absolute inset-y-0 w-0.5 -ml-px bg-white", style: { left: `${marker}%` } }))] })), !compact && window && (_jsxs("div", { className: "mt-1 text-[11px] text-gray-500 tabular-nums", children: ["Reset ", formatResetIn(window.resetsAt, now)] }))] }));
};
