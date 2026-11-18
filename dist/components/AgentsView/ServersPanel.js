import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Server, Square, X } from 'lucide-react';
import { useTransport } from '../../host';
import { useLabels } from '../../labels';
import { panelsEn } from '../../labels/panels';
import { MAX_STALE_FAILURES, useServerStats, } from '../../hooks/useServerStats';
import { usePopover } from './PullRequestsPanel';
const formatCpu = (s) => (s ? `${s.cpu.toFixed(1)}%` : '–');
const formatMem = (s) => s ? (s.memMb >= 1024 ? `${(s.memMb / 1024).toFixed(1)} GB` : `${s.memMb} MB`) : '–';
/** What a row shows for its load: the values (if any), whether they are stale, and why. */
export function serverLoad(state, pid, t = panelsEn) {
    if (!pid)
        return { stale: false, note: t.serversNoPid };
    if (state.failures >= MAX_STALE_FAILURES)
        return { stale: false, note: t.serversLoadUnavailable };
    const stats = state.stats[pid];
    const stale = state.failures > 0 && !!stats;
    if (stale) {
        const at = new Date(state.updatedAt ?? 0).toLocaleTimeString();
        return { stats, stale, note: t.serversStale(at) };
    }
    if (!stats && state.checked.has(pid))
        return { stale: false, note: t.serversExited };
    return { stats, stale: false };
}
export const ServersPanel = ({ rows, onSelectAgent, onClose }) => {
    const ref = usePopover(onClose);
    const t = useLabels().panels;
    const [copied, setCopied] = useState(null);
    const [orphans, setOrphans] = useState([]);
    const [confirmPid, setConfirmPid] = useState(null);
    const [stopError, setStopError] = useState(null);
    // Orphans, stop and load need the transport's `servers` group; without it only the rows show
    const serversApi = useTransport().servers;
    const loadOrphans = () => {
        if (!serversApi)
            return;
        serversApi
            .fetchOrphanServers()
            .then(setOrphans)
            .catch(() => { });
    };
    useEffect(() => {
        loadOrphans();
    }, []);
    // The panel is only mounted while open, so polling stops when it closes
    const stats = useServerStats([
        ...rows.flatMap(({ server }) => (server.pid ? [server.pid] : [])),
        ...orphans.map((o) => o.pid),
    ], true);
    const stop = (pid) => {
        if (!serversApi)
            return;
        setStopError(null);
        serversApi
            .stopOrphanServer(pid)
            .then(() => setOrphans((list) => list.filter((o) => o.pid !== pid)))
            .catch((error) => {
            setStopError(error.message);
            loadOrphans();
        })
            .finally(() => setConfirmPid(null));
    };
    const copy = (port) => {
        navigator.clipboard
            ?.writeText(`http://localhost:${port}`)
            .then(() => {
            setCopied(port);
            setTimeout(() => setCopied((p) => (p === port ? null : p)), 1500);
        })
            .catch(() => { });
    };
    return (_jsxs("div", { ref: ref, tabIndex: -1, role: "dialog", "aria-label": t.serversTitle, className: "absolute right-4 top-full mt-1 z-40 w-[min(640px,calc(100vw-2rem))] max-h-[70vh] flex flex-col bg-gray-900 border border-gray-700 rounded-lg shadow-2xl outline-none", children: [_jsxs("div", { className: "flex items-center gap-2 px-3 py-2 border-b border-gray-800 shrink-0 text-sm", children: [_jsx(Server, { size: 14, className: "text-gray-400" }), _jsx("span", { className: "font-medium", children: t.serversTitle }), _jsx("span", { className: "text-gray-500 tabular-nums text-xs", children: rows.length }), _jsx("div", { className: "flex-1" }), _jsx("button", { onClick: onClose, "aria-label": t.close, className: "p-2 rounded text-gray-400 hover:text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor", children: _jsx(X, { size: 14 }) })] }), _jsxs("div", { className: "overflow-y-auto min-h-0", children: [rows.length === 0 ? (_jsx("p", { className: "px-3 py-4 text-xs text-gray-500", children: t.serversEmpty })) : (_jsx("ul", { className: "divide-y divide-gray-800", children: rows.map(({ server, agentId, agentName }) => {
                            const load = serverLoad(stats, server.pid, t);
                            const loadTitle = (base) => (load.note ? `${base} – ${load.note}` : base);
                            const loadClass = load.stale ? 'text-gray-500' : 'text-gray-300';
                            return (_jsxs("li", { className: "flex items-center gap-3 px-3 py-1.5 text-xs", children: [_jsxs("span", { className: "font-mono text-emerald-400 w-14 shrink-0", children: [":", server.port] }), _jsx("span", { className: "font-mono text-gray-300 truncate min-w-0 flex-1", title: server.pid ? `pid ${server.pid}` : undefined, children: server.command || server.name }), serversApi && (_jsxs(_Fragment, { children: [_jsx("span", { className: `w-12 shrink-0 text-right tabular-nums ${loadClass}`, title: loadTitle(t.serversCpu), children: formatCpu(load.stats) }), _jsx("span", { className: `w-16 shrink-0 text-right tabular-nums ${loadClass}`, title: loadTitle(t.serversMemory), children: formatMem(load.stats) })] })), _jsx("button", { onClick: () => {
                                            onSelectAgent(agentId);
                                            onClose();
                                        }, className: "truncate max-w-[10rem] text-blue-300 hover:text-white hover:underline", title: t.serversSelectAgent, children: agentName }), _jsx("a", { href: `http://localhost:${server.port}`, target: "_blank", rel: "noopener noreferrer", className: "p-2 rounded text-gray-400 hover:text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor", "aria-label": t.serversOpenPort(server.port), title: t.open, children: _jsx(ExternalLink, { size: 12 }) }), _jsx("button", { onClick: () => copy(server.port), className: "p-2 rounded text-gray-400 hover:text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor", "aria-label": t.serversCopyPort(server.port), title: t.serversCopyUrl, children: copied === server.port ? _jsx(Check, { size: 12 }) : _jsx(Copy, { size: 12 }) })] }, `${agentId}:${server.port}`));
                        }) })), orphans.length > 0 && (_jsxs("section", { "aria-label": t.serversOrphaned, className: "border-t border-gray-700", children: [_jsxs("h3", { className: "px-3 pt-2 pb-1 text-xs font-medium text-amber-300", children: [t.serversOrphanedHeading, ' ', _jsx("span", { className: "text-gray-500 tabular-nums", children: orphans.length }), _jsx("span", { className: "ml-2 font-normal text-gray-500", children: t.serversOrphanedHint })] }), stopError && _jsx("p", { className: "px-3 pb-1 text-xs text-red-400", children: stopError }), _jsx("ul", { className: "divide-y divide-gray-800", children: orphans.map((orphan) => {
                                    const load = serverLoad(stats, orphan.pid, t);
                                    return (_jsxs("li", { className: "flex items-center gap-3 px-3 py-1.5 text-xs", children: [_jsxs("span", { className: "font-mono text-amber-400 w-14 shrink-0", children: [":", orphan.port] }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block font-mono text-gray-300 truncate", title: `pid ${orphan.pid}`, children: orphan.command }), _jsx("span", { className: "block font-mono text-gray-500 truncate", title: orphan.cwd, children: orphan.cwd })] }), _jsx("span", { className: "w-12 shrink-0 text-right tabular-nums text-gray-300", children: formatCpu(load.stats) }), _jsx("span", { className: "w-16 shrink-0 text-right tabular-nums text-gray-300", children: formatMem(load.stats) }), confirmPid === orphan.pid ? (_jsxs("span", { className: "flex items-center gap-1 shrink-0", children: [_jsx("button", { onClick: () => stop(orphan.pid), className: "px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor", children: t.serversStopPid(orphan.pid) }), _jsx("button", { onClick: () => setConfirmPid(null), className: "px-2 py-1 rounded text-gray-300 hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor", children: t.cancel })] })) : (_jsx("button", { onClick: () => setConfirmPid(orphan.pid), className: "p-2 rounded text-gray-400 hover:text-red-300 hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor", "aria-label": t.serversStopOrphan(orphan.port), title: t.serversStopTitle, children: _jsx(Square, { size: 12 }) }))] }, orphan.pid + ':' + orphan.port));
                                }) })] }))] })] }));
};
