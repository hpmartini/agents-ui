import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { X, History, RefreshCw } from 'lucide-react';
import { useTransport } from '../../host';
import { formatAge, shortenPath } from '../../utils/agentSessions';
/**
 * `/resume` picker: past sessions newest first, Enter resumes as a background session.
 * Needs the transport's `history` group; without it the picker never opens.
 */
export const ResumePicker = ({ open, initialQuery, cwd, onClose, onResume, }) => {
    const [query, setQuery] = useState(initialQuery);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [index, setIndex] = useState(0);
    const [scoped, setScoped] = useState(!!cwd);
    const history = useTransport().history;
    useEffect(() => {
        if (!open)
            return;
        setQuery(initialQuery);
        setIndex(0);
    }, [open, initialQuery]);
    useEffect(() => {
        if (!open || !history)
            return;
        let cancelled = false;
        setLoading(true);
        const timer = setTimeout(() => {
            history
                .fetchPastSessions({ cwd: scoped ? cwd : null, q: query })
                .then((data) => {
                if (!cancelled) {
                    setSessions(data);
                    setIndex(0);
                }
            })
                .catch(() => {
                if (!cancelled)
                    setSessions([]);
            })
                .finally(() => {
                if (!cancelled)
                    setLoading(false);
            });
        }, 150);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [open, query, cwd, scoped, history]);
    if (!open || !history)
        return null;
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIndex((i) => Math.min(sessions.length - 1, i + 1));
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setIndex((i) => Math.max(0, i - 1));
        }
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (sessions[index])
                onResume(sessions[index]);
        }
        else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-[95] bg-black/60 flex items-start justify-center pt-24", onClick: onClose, role: "dialog", "aria-modal": "true", children: _jsxs("div", { className: "w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden", onClick: (e) => e.stopPropagation(), onKeyDown: handleKeyDown, children: [_jsxs("div", { className: "flex items-center gap-2 px-4 py-3 border-b border-gray-800", children: [_jsx(History, { size: 16, className: "text-blue-300" }), _jsx("input", { autoFocus: true, value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search past sessions (name, prompt, id)", className: "flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 outline-none", "aria-label": "Search past sessions" }), _jsxs("label", { className: "flex items-center gap-1 text-xs text-gray-500 cursor-pointer", title: "Only sessions from the current directory", children: [_jsx("input", { type: "checkbox", checked: scoped, disabled: !cwd, onChange: (e) => setScoped(e.target.checked) }), "this directory"] }), loading && _jsx(RefreshCw, { size: 12, className: "animate-spin text-gray-500" }), _jsx("button", { onClick: onClose, className: "p-1 rounded text-gray-500 hover:text-white hover:bg-gray-800", "aria-label": "Close", children: _jsx(X, { size: 14 }) })] }), _jsxs("div", { className: "max-h-[50vh] overflow-y-auto", children: [sessions.length === 0 && !loading && (_jsx("div", { className: "px-4 py-6 text-sm text-gray-500 text-center", children: "No past sessions found." })), sessions.map((session, i) => (_jsxs("button", { onClick: () => onResume(session), onMouseEnter: () => setIndex(i), className: `w-full text-left px-4 py-2 flex items-center gap-3 ${i === index ? 'bg-gray-800 ring-1 ring-inset ring-blue-300' : 'hover:bg-gray-800/60'}`, children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-sm text-gray-100 truncate", children: session.name }), _jsxs("div", { className: "text-[11px] text-gray-500 font-mono truncate", children: [session.id ? `${session.id} · ` : '', session.sessionId.slice(0, 8), " \u00B7", ' ', session.cwd ? shortenPath(session.cwd, 36) : session.projectSlug, session.state ? ` · ${session.state}` : ''] })] }), _jsxs("span", { className: "text-xs text-gray-500 font-mono", children: [formatAge(Date.now() - session.lastActivity), " ago"] })] }, session.sessionId)))] }), _jsx("div", { className: "px-4 py-2 border-t border-gray-800 text-[11px] text-gray-500", children: "\u2191\u2193 select \u00B7 enter resume as background session \u00B7 esc close" })] }) }));
};
