import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from 'react';
import { AlertTriangle, Plus, RefreshCw, Square } from 'lucide-react';
import { useLabels } from './labels';
import { isRunning, stateGlyph } from './state';
const lastSegment = (path) => path.split('/').filter(Boolean).pop() ?? path;
/** Agent rows (state, name, activity, folder); Arrow keys move, Enter opens */
export const AgentList = ({ agents, openIds, activeId, loaded, error = null, onRetry, title, onOpen, onStop, canStop, onNew, }) => {
    const t = useLabels();
    const errorText = error
        ? error.status === 401 || error.status === 403
            ? t.forbidden
            : error.status !== undefined && error.status >= 500
                ? t.unavailable
                : t.loadFailed
        : '';
    const listRef = useRef(null);
    const move = (from, delta) => {
        const rows = [...(listRef.current?.querySelectorAll('[data-agent-row]') ?? [])];
        rows[rows.indexOf(from) + delta]?.focus();
    };
    return (_jsxs("div", { className: "h-full flex flex-col min-h-0 bg-ag-surface", children: [_jsxs("div", { className: "flex items-center gap-2 h-9 px-3 border-b border-ag-border shrink-0", children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-wide text-ag-muted flex-1 truncate", children: title }), _jsx("span", { className: "text-xs text-ag-faint tabular-nums", children: agents.length }), _jsxs("button", { onClick: onNew, className: "flex items-center gap-1 px-2 py-1 rounded text-xs bg-ag-accent text-ag-on-accent hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ag-accent", title: t.newAgentTitle, children: [_jsx(Plus, { size: 12, "aria-hidden": "true" }), " ", t.newAgent] })] }), error && (_jsxs("div", { role: "alert", className: `flex gap-2 text-xs ${loaded ? 'px-3 py-2 border-b border-ag-border bg-ag-danger/10' : 'p-4'}`, children: [_jsx(AlertTriangle, { size: 14, className: "text-ag-danger shrink-0 mt-px", "aria-hidden": "true" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-ag-text", children: errorText }), error.message && (_jsx("div", { className: "text-ag-faint font-mono break-words mt-0.5", children: error.message })), onRetry && (_jsxs("button", { onClick: onRetry, className: "mt-2 flex items-center gap-1 px-2 py-1 rounded border border-ag-border text-ag-text hover:bg-ag-raised", children: [_jsx(RefreshCw, { size: 11, "aria-hidden": "true" }), " ", t.retry] }))] })] })), !loaded ? (error ? null : (_jsx("div", { className: "p-4 text-xs text-ag-muted", role: "status", children: t.loading }))) : agents.length === 0 ? (_jsxs("div", { className: "p-4 text-xs text-ag-muted", children: [t.noAgents, ' ', _jsx("button", { onClick: onNew, className: "underline text-ag-accent", children: t.startOne }), "."] })) : (_jsx("ul", { ref: listRef, className: "flex-1 overflow-y-auto py-1", "aria-label": title, children: agents.map((agent) => {
                    const glyph = stateGlyph(agent.displayState);
                    const open = openIds.has(agent.id);
                    const active = agent.id === activeId;
                    return (_jsxs("li", { className: "group relative", children: [_jsxs("button", { "data-agent-row": true, onClick: () => onOpen(agent.id), onKeyDown: (e) => {
                                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        move(e.currentTarget, e.key === 'ArrowDown' ? 1 : -1);
                                    }
                                }, "aria-current": active || undefined, className: `w-full flex items-start gap-2 pl-3 pr-9 py-2 text-left border-l-2 transition-colors focus-visible:outline-none focus-visible:bg-ag-raised ${active
                                    ? 'border-ag-accent bg-ag-raised'
                                    : 'border-transparent hover:bg-ag-raised/60'}`, title: `${agent.name} · ${agent.cwd}`, children: [_jsx("span", { className: `${glyph.className} leading-5 shrink-0 ${glyph.animate ? 'animate-pulse motion-reduce:animate-none' : ''}`, "aria-label": t.states[agent.displayState], role: "img", children: glyph.glyph }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-sm text-ag-text truncate", children: agent.name }), open && (_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-ag-accent shrink-0", title: t.openInTab }))] }), agent.detail && (_jsx("span", { className: "block text-xs text-ag-muted truncate", children: agent.detail })), _jsx("span", { className: "block text-[11px] text-ag-faint font-mono truncate", children: lastSegment(agent.cwd) })] })] }), isRunning(agent.displayState) && (canStop?.(agent) ?? true) && (_jsx("button", { onClick: () => onStop(agent.id), className: "absolute right-2 top-2 p-1.5 rounded text-ag-faint opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-ag-danger hover:bg-ag-border", title: t.stopTitle, "aria-label": t.stopAgent(agent.name), children: _jsx(Square, { size: 11 }) }))] }, agent.id));
                }) }))] }));
};
