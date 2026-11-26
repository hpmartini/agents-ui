import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { Brain, Clock, ChevronRight, History, Wrench, CheckCircle2, XCircle, Sparkles, Bot, MessagesSquare, Quote, Reply, } from 'lucide-react';
import { agentMessage, toolDiff, toolSummary, } from '../../../utils/chatEvents';
import { leadingCommand, splitImages } from '../../../utils/chatComposer';
import { hhmm, parseQuote, quoteExcerpt, stripTag } from '../../../utils/chatThreads';
import { useTransport } from '../../../host';
import { useLabels } from '../../../labels';
import { ViewActionsContext } from '../../../viewActions';
import { ChatMarkdown, CopyButton } from './ChatMarkdown';
const focusRing = 'focus-visible:outline-2 focus-visible:outline-blue-400';
const Collapsible = ({ summary, children, open, tone = 'border-gray-800' }) => (_jsxs("details", { open: open, className: `group my-1.5 rounded-md border ${tone} bg-gray-900/60`, children: [_jsxs("summary", { className: `flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none text-xs text-gray-300 hover:text-white list-none [&::-webkit-details-marker]:hidden ${focusRing}`, children: [_jsx(ChevronRight, { size: 13, "aria-hidden": true, className: "shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none" }), summary] }), _jsx("div", { className: "px-2 pb-2", children: children })] }));
const DiffView = ({ lines }) => (_jsx("pre", { className: "mt-1 max-h-80 overflow-auto rounded bg-gray-950 text-xs leading-snug font-mono", children: lines.map((l, i) => (_jsxs("div", { className: l.sign === '+'
            ? 'bg-emerald-900/40 text-emerald-200'
            : l.sign === '-'
                ? 'bg-red-900/40 text-red-200'
                : 'text-gray-300', children: [_jsx("span", { className: "select-none px-1.5 text-gray-500", children: l.sign }), l.text] }, i))) }));
export const ChatRepliesContext = React.createContext(null);
const actionBtn = `inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] text-gray-400 hover:bg-gray-800 hover:text-white ${focusRing}`;
/** The quote of a sent reply, above its text */
export const QuoteBox = ({ time, text }) => {
    const t = useLabels().terminal;
    return (_jsxs("div", { "data-quote": true, className: "mb-1.5 flex gap-1.5 rounded border border-blue-400/25 bg-blue-500/10 px-2 py-1 text-xs text-blue-100/90", children: [_jsx(Quote, { size: 11, "aria-hidden": true, className: "mt-0.5 shrink-0 text-blue-300" }), _jsxs("span", { className: "min-w-0", children: [_jsx("span", { className: "text-blue-300", children: time ? `${t.replyTo(time)}: ` : `${t.reply}: ` }), _jsx("span", { className: "line-clamp-2", children: text })] })] }));
};
/** Tags of every thread of the chat's session: only those are hidden in message text */
export const ChatTagsContext = React.createContext(new Set());
/** The chat a message list belongs to: its tool results' images load from there */
export const ChatIdContext = React.createContext(null);
/** A tool result's screenshots, loaded only once the step is open and in view */
const ResultImages = ({ refs }) => {
    const chatId = React.useContext(ChatIdContext);
    const chat = useTransport().chat;
    const t = useLabels().terminal;
    const imageUrl = chat?.chatImageUrl;
    if (!chatId || !imageUrl)
        return null;
    return (_jsx("div", { className: "mt-1.5 flex flex-wrap gap-1.5", children: refs.map((ref) => {
            const url = imageUrl(chatId, ref);
            return (_jsx("a", { href: url, target: "_blank", rel: "noreferrer", title: t.openImage, children: _jsx("img", { src: url, alt: t.toolResultImage, loading: "lazy", className: "h-32 w-48 rounded border border-gray-800 bg-gray-900 object-contain hover:opacity-90" }) }, ref));
        }) }));
};
const ToolBlock = ({ block }) => {
    const diff = toolDiff(block.name, block.input);
    const pending = block.result === undefined;
    const t = useLabels().terminal;
    return (_jsxs(Collapsible, { tone: block.isError ? 'border-red-800/70' : 'border-gray-800', summary: _jsxs(_Fragment, { children: [_jsx(Wrench, { size: 12, "aria-hidden": true, className: "shrink-0 text-gray-400" }), _jsx("span", { className: "font-medium text-gray-100", children: block.name }), _jsx("span", { className: "font-mono text-gray-400 truncate min-w-0", children: toolSummary(block.input) }), _jsx("span", { className: "ml-auto shrink-0 text-[11px] text-gray-500", children: pending
                        ? t.toolRunning
                        : block.isError
                            ? t.toolError
                            : diff
                                ? t.diffLines(diff.length)
                                : '' })] }), children: [diff ? (_jsx(DiffView, { lines: diff })) : (_jsx("pre", { className: "mt-1 max-h-48 overflow-auto rounded bg-gray-950 p-2 text-xs font-mono text-gray-300", children: JSON.stringify(block.input, null, 2) })), block.result !== undefined && (_jsx("pre", { className: `mt-1.5 max-h-64 overflow-auto rounded p-2 text-xs font-mono whitespace-pre-wrap ${block.isError ? 'bg-red-950/40 text-red-200' : 'bg-gray-950 text-gray-400'}`, children: block.result || t.noOutput })), block.images && _jsx(ResultImages, { refs: block.images })] }));
};
export const AssistantBlock = ({ block }) => {
    const t = useLabels().terminal;
    if (!block)
        return null;
    if (block.type === 'text')
        return block.text ? _jsx(ChatMarkdown, { text: block.text }) : null;
    if (block.type === 'thinking')
        return (_jsx(Collapsible, { summary: _jsxs(_Fragment, { children: [_jsx(Brain, { size: 12, "aria-hidden": true, className: "text-purple-300" }), " ", t.thinking] }), children: _jsx("div", { className: "text-xs text-gray-400 whitespace-pre-wrap", children: block.text || t.thinkingHidden }) }));
    return _jsx(ToolBlock, { block: block });
};
/** `queued`: typed while the agent works, not taken by its turn yet */
/** Message another agent sent with `orkumo send`: not the user's bubble, the sender links to it */
const AgentMessage = ({ id, name, body, }) => {
    const actions = React.useContext(ViewActionsContext);
    const t = useLabels().terminal;
    const label = name || id || t.unknownAgent;
    const text = stripTag(body, React.useContext(ChatTagsContext));
    return (_jsx("div", { className: "flex flex-col items-start my-3", "data-agent-message": true, children: _jsxs("div", { className: "max-w-[85%] rounded-lg border border-violet-800/60 bg-violet-950/40 px-3 py-2 text-sm text-gray-100", children: [_jsxs("div", { className: "mb-1 flex items-center gap-1.5 text-xs text-violet-300", children: [_jsx(Bot, { size: 12, "aria-hidden": true }), _jsx("span", { children: t.messageFrom }), id && actions ? (_jsx("button", { type: "button", onClick: () => actions.openAgent(id), title: t.openAgent(id), className: "font-medium text-violet-200 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-blue-400", children: label })) : (_jsx("span", { className: "font-medium text-violet-200", children: label }))] }), _jsx("div", { className: "whitespace-pre-wrap break-words", children: text })] }) }));
};
export const UserMessage = ({ text, queued }) => {
    const fromAgent = queued ? null : agentMessage(text);
    if (fromAgent)
        return _jsx(AgentMessage, { ...fromAgent });
    return _jsx(OwnMessage, { text: text, queued: queued });
};
const OwnMessage = ({ text, queued }) => {
    const { text: typed, images } = splitImages(stripTag(text, React.useContext(ChatTagsContext)));
    // a reply: its quote as a box, the user's text below
    const quote = parseQuote(typed);
    const body = quote ? quote.body : typed;
    // `/skill args`: the command as a chip, its text after it
    const command = leadingCommand(body);
    const uploads = useTransport().uploads;
    const chatId = React.useContext(ChatIdContext) ?? undefined;
    const t = useLabels().terminal;
    // from the chat's instance: in cluster mode the image is stored where the agent runs
    const previews = images.map((p) => ({ path: p, url: uploads?.agentImageUrl(p, chatId) ?? null }));
    return (_jsxs("div", { className: "flex flex-col items-end my-3", "data-queued": queued || undefined, children: [_jsxs("div", { className: `max-w-[85%] rounded-lg px-3 py-2 text-sm text-gray-100 whitespace-pre-wrap break-words border ${queued
                    ? 'bg-blue-900/25 border-dashed border-blue-700/70'
                    : 'bg-blue-900/50 border-blue-800/60'}`, children: [quote && _jsx(QuoteBox, { time: quote.time, text: quote.quote }), command ? (_jsxs(_Fragment, { children: [_jsx("span", { "data-command": true, className: "mr-1.5 inline-block rounded border border-blue-400/40 bg-blue-500/15 px-1.5 py-px font-mono text-xs text-blue-200", children: command.command }), command.rest] })) : (body), previews.length > 0 && (_jsx("div", { className: `flex flex-wrap gap-1.5 ${body ? 'mt-2' : ''}`, children: previews.map(({ path, url }) => url ? (_jsx("a", { href: url, target: "_blank", rel: "noreferrer", title: path, children: _jsx("img", { src: url, alt: t.attachedImage, loading: "lazy", className: "h-20 max-w-[10rem] rounded border border-blue-800/60 object-cover hover:opacity-90" }) }, path)) : (_jsx("span", { className: "text-xs text-blue-200/80 font-mono", children: t.imageRef(path) }, path))) }))] }), queued && (_jsxs("span", { className: "mt-1 flex items-center gap-1 text-[11px] text-blue-300/80", children: [_jsx(Clock, { size: 11, "aria-hidden": true }), " ", t.queuedNote] }))] }));
};
/** 12.3 s · 4 min 12 s · 1 h 5 min */
export function formatDuration(ms) {
    const s = ms / 1000;
    if (s < 60)
        return `${s.toFixed(1)} s`;
    const min = Math.floor(s / 60);
    if (min < 60)
        return `${min} min ${Math.round(s % 60)} s`;
    return `${Math.floor(min / 60)} h ${min % 60} min`;
}
function resultLabel(result, t) {
    if (result.ok)
        return t.resultDone;
    return result.subtype === 'error_during_execution'
        ? t.resultInterrupted
        : t.resultError(result.subtype);
}
const ResultMark = ({ result }) => {
    const t = useLabels().terminal;
    return (_jsxs(_Fragment, { children: [result.ok ? (_jsx(CheckCircle2, { size: 12, "aria-hidden": true, className: "text-emerald-500" })) : (_jsx(XCircle, { size: 12, "aria-hidden": true, className: "text-red-400" })), _jsx("span", { className: result.ok ? 'text-gray-400' : 'text-red-300', children: resultLabel(result, t) }), result.durationMs !== null && (_jsxs("span", { className: "tabular-nums", children: ["\u00B7 ", formatDuration(result.durationMs)] }))] }));
};
const Working = () => (_jsxs("span", { className: "flex items-center gap-1.5 text-blue-300", role: "status", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse motion-reduce:animate-none" }), useLabels().terminal.working] }));
/**
 * One turn's answer: the assistant messages between a prompt and its result in one card,
 * left-aligned (the prompt sits right). Text renders as markdown; thinking and tool calls stay
 * collapsible inside while steps are shown. `answer` null: the agent works on a prompt and has
 * not written yet.
 */
const AnswerCard = ({ answer, showSteps, live, harness, model }) => {
    const t = useLabels().terminal;
    const replies = React.useContext(ChatRepliesContext);
    const tags = React.useContext(ChatTagsContext);
    const card = React.useRef(null);
    const [selected, setSelected] = React.useState('');
    const parts = answer?.parts ?? [];
    // a tag line opening any text is never shown (any thread's, also after tool calls)
    const blocks = parts
        .flatMap((m) => m.blocks)
        .filter(Boolean)
        .map((b) => (b.type === 'text' ? { ...b, text: stripTag(b.text, tags) } : b));
    const visible = showSteps ? blocks : blocks.filter((b) => b.type === 'text');
    const hasBody = visible.some((b) => b.type !== 'text' || b.text);
    const steps = blocks.filter((b) => b.type === 'tool').length;
    const text = blocks
        .filter((b) => b.type === 'text' && !!b.text)
        .map((b) => b.text)
        .join('\n\n');
    const named = [...parts].reverse().find((m) => m.model)?.model;
    const shownModel = (named ?? model ?? '').replace(/^.*\//, '');
    const result = answer?.result ?? null;
    const working = live || parts.some((m) => m.streaming);
    const ts = parts[0]?.ts;
    const canReply = !!replies && !!answer && !!text && !working;
    // a selection inside this card is what Reply quotes; else its first lines
    const readSelection = () => {
        if (!canReply)
            return;
        const sel = window.getSelection();
        const inside = sel && !sel.isCollapsed && card.current?.contains(sel.anchorNode);
        setSelected(inside ? sel.toString().trim() : '');
    };
    return (_jsxs("article", { ref: card, onMouseUp: readSelection, onKeyUp: readSelection, className: "group my-3 rounded-lg border border-gray-800 bg-gray-900/40", "aria-label": t.answerFrom(harness), "aria-busy": working || undefined, children: [_jsxs("header", { className: `flex items-center gap-1.5 h-7 px-3 text-[11px] text-gray-500 min-w-0 ${hasBody ? 'border-b border-gray-800/80' : ''}`, children: [_jsx(Sparkles, { size: 12, "aria-hidden": true, className: "shrink-0 text-blue-300" }), _jsx("span", { className: "shrink-0 font-medium text-gray-300", children: harness }), shownModel && _jsx("span", { className: "truncate font-mono", children: shownModel }), _jsx("span", { className: "flex-1" }), canReply && (_jsxs("span", { className: "flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none", children: [_jsxs("button", { type: "button", className: actionBtn, 
                                // the click must not clear the selection it quotes
                                onMouseDown: (e) => e.preventDefault(), onClick: () => {
                                    replies.reply({ ts, text: selected ? quoteExcerpt(selected) : quoteExcerpt(text) });
                                    setSelected('');
                                }, children: [_jsx(Reply, { size: 12, "aria-hidden": true }), selected ? t.replyToSelection : t.reply] }), replies.openThread && (_jsxs("button", { type: "button", className: actionBtn, onClick: () => replies.openThread?.(answer), children: [_jsx(MessagesSquare, { size: 12, "aria-hidden": true }), t.openThread] }))] })), !showSteps && steps > 0 && (_jsx("span", { className: "shrink-0", title: t.answerStepsTitle, children: t.answerSteps(steps) })), ts !== undefined && _jsx("span", { className: "shrink-0 tabular-nums", children: hhmm(ts) })] }), hasBody && (_jsx("div", { className: "px-3 py-2.5", children: visible.map((b, i) => (_jsx(AssistantBlock, { block: b }, i))) })), (working || result || text) && (_jsxs("footer", { className: `flex items-center gap-1.5 h-7 px-3 text-[11px] text-gray-500 ${hasBody ? 'border-t border-gray-800/80' : ''}`, children: [working ? _jsx(Working, {}) : result ? _jsx(ResultMark, { result: result }) : null, _jsx("span", { className: "flex-1" }), text && !working && _jsx(CopyButton, { text: text, label: t.copyAnswer })] }))] }));
};
const sameAnswer = (a, b) => a === b ||
    (!!a &&
        !!b &&
        a.result === b.result &&
        a.parts.length === b.parts.length &&
        a.parts.every((m, i) => m === b.parts[i]));
/** Answers are regrouped on every event: memoized on their parts, not the group object */
const MemoAnswerCard = React.memo(AnswerCard, (prev, next) => prev.showSteps === next.showSteps &&
    prev.live === next.live &&
    prev.harness === next.harness &&
    prev.model === next.model &&
    sameAnswer(prev.answer, next.answer));
export const ChatItemView = ({ item, showSteps, live = false, harness, model }) => {
    if (!item || item.kind === 'answer')
        return (_jsx(MemoAnswerCard, { answer: item, showSteps: showSteps, live: live, harness: harness, model: model }));
    return _jsx(PlainItem, { item: item });
};
const PlainItem = React.memo(({ item }) => {
    const t = useLabels().terminal;
    switch (item.kind) {
        case 'user':
            return _jsx(UserMessage, { text: item.text, queued: item.queued });
        case 'recap':
            return (_jsxs("div", { className: "my-3 flex gap-2 rounded-md border border-gray-800 bg-gray-900/60 px-3 py-2 text-sm text-gray-300", children: [_jsx(History, { size: 14, "aria-hidden": true, className: "mt-0.5 shrink-0 text-gray-500" }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: t.recapInline }), item.text] })] }));
        case 'result':
            // A result without an answer before it (an interrupted turn that wrote nothing)
            return (_jsx("div", { className: "my-2 flex items-center gap-1.5 text-[11px] text-gray-500", children: _jsx(ResultMark, { result: item }) }));
        case 'divider':
            return (_jsxs("div", { role: "separator", "aria-label": t.contextDivider(item.reason, item.ts ? hhmm(item.ts) : null), className: "my-4 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-gray-400", children: [_jsx("span", { "aria-hidden": true, className: "h-px flex-1 bg-gray-700" }), _jsx("span", { children: t.contextDivider(item.reason, item.ts ? hhmm(item.ts) : null) }), _jsx("span", { "aria-hidden": true, className: "h-px flex-1 bg-gray-700" })] }));
        case 'notice':
            return (_jsx("div", { className: `my-2 text-xs ${item.tone === 'error' ? 'text-red-300' : 'text-gray-400'}`, children: item.text }));
    }
});
PlainItem.displayName = 'PlainItem';
