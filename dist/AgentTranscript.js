import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTransport } from './state';
import { useLabels } from './labels';
/** How close to the bottom (px) still counts as "following" the conversation */
const FOLLOW_SLACK = 48;
/**
 * The agent's conversation as a readable log: plain text only (no markup is interpreted), new
 * entries scroll into view while the reader sits at the bottom.
 */
export const AgentTranscript = ({ agentId }) => {
    const transport = useTransport();
    const t = useLabels();
    const [entries, setEntries] = useState(null);
    const [error, setError] = useState(null);
    const scroller = useRef(null);
    const following = useRef(true);
    useEffect(() => {
        setEntries(null);
        setError(null);
        following.current = true;
        return transport.transcript?.(agentId, (list) => {
            setEntries(list);
            setError(null);
        }, setError);
    }, [transport, agentId]);
    useLayoutEffect(() => {
        const el = scroller.current;
        if (el && following.current)
            el.scrollTop = el.scrollHeight;
    }, [entries]);
    const roleName = { user: t.you, assistant: t.agentRole, tool: t.toolRole };
    return (_jsxs("div", { ref: scroller, onScroll: (e) => {
            const el = e.currentTarget;
            following.current = el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_SLACK;
        }, className: "absolute inset-0 overflow-y-auto bg-ag-bg px-3 py-2 text-sm", children: [error && (_jsx("p", { role: "alert", className: "mb-2 rounded border border-ag-danger/50 px-2 py-1.5 text-xs text-ag-danger", children: t.transcriptFailed(error.message) })), entries === null && !error && (_jsx("p", { role: "status", className: "text-xs text-ag-muted", children: t.transcriptLoading })), entries?.length === 0 && _jsx("p", { className: "text-xs text-ag-muted", children: t.transcriptEmpty }), entries && entries.length > 0 && (_jsx("ol", { role: "log", "aria-live": "polite", className: "flex flex-col gap-2 m-0 p-0 list-none", children: entries.map((e) => e.role === 'tool' ? (_jsxs("li", { className: "font-mono text-xs text-ag-faint truncate", title: e.text, children: [_jsxs("span", { className: "sr-only", children: [roleName.tool, ": "] }), "\u21B3 ", e.text] }, e.id)) : (_jsxs("li", { className: `rounded-md border px-2.5 py-1.5 ${e.role === 'user'
                        ? 'self-end max-w-[85%] border-ag-accent/40 bg-ag-surface'
                        : 'self-start max-w-full border-ag-border'}`, children: [_jsx("div", { className: "text-[11px] text-ag-muted mb-0.5", children: roleName[e.role] }), _jsx("div", { className: "whitespace-pre-wrap break-words text-ag-text", children: e.text })] }, e.id))) }))] }));
};
