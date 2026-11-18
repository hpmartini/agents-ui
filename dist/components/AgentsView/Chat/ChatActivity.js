import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Bot, CheckSquare, ChevronRight, Circle, CircleDot, ListChecks, Loader2, SquareTerminal, X, } from 'lucide-react';
import { toolSummary } from '../../../utils/chatEvents';
import { chatPlan, chatShells, chatSubagents, turnSteps } from '../../../utils/chatActivity';
import { useTransport } from '../../../host';
import { pollWhileVisible } from '../../../utils/visiblePoll';
import { AssistantBlock } from './ChatMessages';
const chip = 'flex max-w-full items-start gap-1 px-2 py-0.5 rounded-xl border text-[11px] focus-visible:outline-2 focus-visible:outline-blue-400 transition-colors';
// Chips wrap instead of truncating: what a background shell or sub-agent does must be readable
const chipText = 'min-w-0 text-left [overflow-wrap:anywhere]';
/** One-line label of the latest step: "Bash npm test", "Thinking" */
function stepLabel(block) {
    if (!block)
        return 'Starting…';
    if (block.type === 'thinking')
        return 'Thinking…';
    if (block.type === 'tool')
        return `${block.name} ${toolSummary(block.input)}`.trim();
    return '';
}
/** Scroll box that keeps to the bottom while new content arrives */
const FollowBox = ({ children, dep, className = '', }) => {
    const ref = useRef(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (el)
            el.scrollTop = el.scrollHeight;
    }, [dep]);
    return (_jsx("div", { ref: ref, className: `overflow-y-auto ${className}`, children: children }));
};
const ShellView = ({ chatId, shellId }) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const chat = useTransport().chat;
    useEffect(() => {
        if (!chat)
            return;
        let cancelled = false;
        const load = () => chat
            .fetchChatShell(chatId, shellId)
            .then((d) => {
            if (!cancelled) {
                setData(d);
                setError(null);
            }
        })
            .catch((e) => !cancelled && setError(e.message));
        const stop = pollWhileVisible(load, 2000);
        return () => {
            cancelled = true;
            stop();
        };
    }, [chat, chatId, shellId]);
    if (error)
        return _jsx("div", { className: "text-xs text-red-300", children: error });
    if (!data)
        return _jsx("div", { className: "text-xs text-gray-500", children: "Loading\u2026" });
    return (_jsxs(_Fragment, { children: [_jsx(FollowBox, { dep: data.output, className: "max-h-64 rounded bg-black/60 p-2", children: _jsx("pre", { className: "text-xs font-mono text-gray-200 whitespace-pre-wrap break-all", children: data.output || '(no output yet)' }) }), _jsxs("div", { className: "mt-1 text-[10px] text-gray-500", children: ["updated ", new Date(data.updatedAt).toLocaleTimeString()] })] }));
};
/** Above the input: plan with checkmarks, shells and sub-agents to look into, the running turn */
export const ChatActivity = ({ chatId, messages, sub, busy, endedTasks, }) => {
    const plan = useMemo(() => chatPlan(messages), [messages]);
    const shells = useMemo(() => chatShells(messages, endedTasks), [messages, endedTasks]);
    const agents = useMemo(() => chatSubagents(messages), [messages]);
    const steps = useMemo(() => turnSteps(messages), [messages]);
    const [planOpen, setPlanOpen] = useState(true);
    const [workOpen, setWorkOpen] = useState(false);
    const [detail, setDetail] = useState(null);
    const done = plan.filter((t) => t.status === 'completed').length;
    const runningAgents = agents.filter((a) => !a.done).length;
    if (!plan.length && !shells.length && !agents.length && !busy)
        return null;
    return (_jsxs("div", { className: "mb-2 space-y-1.5", children: [plan.length > 0 && (_jsxs("div", { className: "rounded-md border border-gray-800 bg-gray-900/70", children: [_jsxs("button", { type: "button", onClick: () => setPlanOpen((o) => !o), "aria-expanded": planOpen, className: "flex w-full items-center gap-1.5 px-2 py-1 text-xs text-gray-300 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400", children: [_jsx(ChevronRight, { size: 13, "aria-hidden": true, className: `transition-transform motion-reduce:transition-none ${planOpen ? 'rotate-90' : ''}` }), _jsx(ListChecks, { size: 13, "aria-hidden": true, className: "text-emerald-400" }), "Plan", _jsxs("span", { className: "text-gray-500 tabular-nums", children: [done, "/", plan.length] })] }), planOpen && (_jsx("ul", { className: "max-h-40 overflow-y-auto px-2 pb-1.5 space-y-0.5", "aria-label": "Plan", children: plan.map((t) => (_jsxs("li", { className: "flex items-start gap-1.5 text-xs", children: [t.status === 'completed' ? (_jsx(CheckSquare, { size: 13, "aria-label": "done", className: "mt-px shrink-0 text-emerald-400" })) : t.status === 'in_progress' ? (_jsx(CircleDot, { size: 13, "aria-label": "in progress", className: "mt-px shrink-0 text-blue-300" })) : (_jsx(Circle, { size: 13, "aria-label": "open", className: "mt-px shrink-0 text-gray-500" })), _jsx("span", { className: t.status === 'completed'
                                        ? 'text-gray-500 line-through'
                                        : t.status === 'in_progress'
                                            ? 'text-gray-100 font-medium'
                                            : 'text-gray-300', children: t.subject })] }, t.id))) }))] })), (shells.length > 0 || agents.length > 0) && (_jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [shells.map((s) => (_jsxs("button", { type: "button", onClick: () => setDetail(detail?.id === s.id
                            ? null
                            : { kind: 'shell', id: s.id, title: s.description || s.command }), "aria-pressed": detail?.id === s.id, title: `Background shell: ${s.command}`, className: `${chip} ${detail?.id === s.id ? 'border-blue-400 text-white bg-blue-500/15' : 'border-gray-700 text-gray-300 hover:border-gray-500'}`, children: [_jsx(SquareTerminal, { size: 11, "aria-hidden": true, className: "mt-0.5 shrink-0" }), _jsx("span", { className: chipText, children: s.description || s.command })] }, s.id))), agents.map((a) => (_jsxs("button", { type: "button", onClick: () => setDetail(detail?.id === a.toolId
                            ? null
                            : { kind: 'agent', id: a.toolId, title: `${a.type}: ${a.description}` }), "aria-pressed": detail?.id === a.toolId, title: `Sub-agent ${a.type}: ${a.description}`, className: `${chip} ${detail?.id === a.toolId ? 'border-blue-400 text-white bg-blue-500/15' : 'border-gray-700 text-gray-300 hover:border-gray-500'}`, children: [a.done ? (_jsx(Bot, { size: 11, "aria-hidden": true, className: `mt-0.5 shrink-0 ${a.isError ? 'text-red-400' : 'text-emerald-400'}` })) : (_jsx(Loader2, { size: 11, "aria-hidden": true, className: "mt-0.5 shrink-0 animate-spin motion-reduce:animate-none text-blue-300" })), _jsxs("span", { className: chipText, children: [a.type, " \u00B7 ", a.description] })] }, a.toolId))), runningAgents > 0 && (_jsxs("span", { className: "text-[11px] text-gray-500", children: [runningAgents, " running"] }))] })), detail && (_jsxs("div", { className: "rounded-md border border-gray-700 bg-gray-900/90 p-2", children: [_jsxs("div", { className: "mb-1 flex items-center gap-1.5 text-xs text-gray-300", children: [detail.kind === 'shell' ? (_jsx(SquareTerminal, { size: 12, "aria-hidden": true })) : (_jsx(Bot, { size: 12, "aria-hidden": true })), _jsx("span", { className: "min-w-0 [overflow-wrap:anywhere]", children: detail.title }), _jsx("button", { type: "button", onClick: () => setDetail(null), className: "ml-auto p-0.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-blue-400", "aria-label": "Close", children: _jsx(X, { size: 12 }) })] }), detail.kind === 'shell' ? (_jsx(ShellView, { chatId: chatId, shellId: detail.id })) : (_jsx(FollowBox, { dep: sub[detail.id]?.length, className: "max-h-72", children: (sub[detail.id] ?? []).length === 0 ? (_jsx("div", { className: "text-xs text-gray-500", children: "No sub-agent output yet" })) : (sub[detail.id].map((b, i) => _jsx(AssistantBlock, { block: b }, i))) }))] })), busy && (_jsxs("div", { className: "rounded-md border border-blue-900/60 bg-gray-900/70", children: [_jsxs("button", { type: "button", onClick: () => setWorkOpen((o) => !o), "aria-expanded": workOpen, className: "flex w-full items-center gap-1.5 px-2 py-1 text-xs text-gray-300 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400", children: [_jsx(ChevronRight, { size: 13, "aria-hidden": true, className: `shrink-0 transition-transform motion-reduce:transition-none ${workOpen ? 'rotate-90' : ''}` }), _jsx(Loader2, { size: 12, "aria-hidden": true, className: "shrink-0 animate-spin motion-reduce:animate-none text-blue-300" }), _jsx("span", { className: "truncate min-w-0 font-mono text-gray-400", children: stepLabel(steps[steps.length - 1]) }), _jsxs("span", { className: "ml-auto shrink-0 text-gray-500 tabular-nums", children: [steps.length, " steps"] })] }), workOpen && (_jsx(FollowBox, { dep: steps, className: "max-h-64 px-2 pb-1", children: steps.map((b, i) => (_jsx(AssistantBlock, { block: b }, i))) }))] }))] }));
};
