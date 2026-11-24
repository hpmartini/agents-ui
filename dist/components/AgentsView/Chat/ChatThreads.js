import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, ChevronRight, FolderGit2, Loader2, MessagesSquare, Plus, Quote, RotateCcw, X, } from 'lucide-react';
import { useTransport } from '../../../host';
import { useLabels } from '../../../labels';
import { agentMessage } from '../../../utils/chatEvents';
import { splitImages } from '../../../utils/chatComposer';
import { attachableFiles } from '../../../utils/composer';
import { answerText, hhmm, itemTime, stripTag, unreadCount, } from '../../../utils/chatThreads';
import { ImageAttachments, imageDropHandlers } from '../../ImageAttachments';
const focusRing = 'focus-visible:outline-2 focus-visible:outline-blue-400';
const smallBtn = `inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] text-gray-400 hover:bg-gray-800 hover:text-white ${focusRing}`;
// Threads made elsewhere (Instruct on a status card) and report changes show up within this
const POLL_MS = 15_000;
/** Threads of the pane's session from the host; `orchestrator` null: no threads for it */
export function useChatThreads(session) {
    const api = useTransport().threads;
    const [list, setList] = useState(null);
    const [status, setStatus] = useState('loading');
    // no orchestrator: nothing to poll for
    const noThreads = useRef(false);
    const load = useCallback((quiet = false) => {
        if (!api || !session || noThreads.current)
            return;
        if (!quiet)
            setStatus('loading');
        api
            .fetchThreads(session)
            .then((l) => {
            noThreads.current = !l.orchestrator;
            setList(l);
            setStatus('ready');
        })
            // the last list stays known: the panel shows the error and recovers on the next poll
            .catch(() => setStatus('error'));
    }, [api, session]);
    useEffect(() => {
        noThreads.current = false;
        setList(null);
        if (!api || !session)
            return;
        load();
        const t = window.setInterval(() => load(true), POLL_MS);
        return () => window.clearInterval(t);
    }, [api, session, load]);
    const put = useCallback((thread) => setList((l) => l
        ? {
            ...l,
            threads: l.threads.some((t) => t.id === thread.id)
                ? l.threads.map((t) => (t.id === thread.id ? thread : t))
                : [...l.threads, thread],
        }
        : l), []);
    const create = useCallback(async (body) => {
        if (!api || !session)
            throw new Error('no threads');
        const thread = await api.createThread(session, body);
        put(thread);
        return thread;
    }, [api, session, put]);
    const update = useCallback(async (id, patch) => {
        if (!api || !session)
            return;
        put(await api.updateThread(session, id, patch));
    }, [api, session, put]);
    // only a known orchestrator chat gets the panel: other panes never flash it while loading
    const enabled = !!list?.orchestrator;
    return {
        enabled,
        status,
        threads: list?.threads ?? [],
        tasks: list?.tasks ?? [],
        reload: load,
        create,
        update,
    };
}
/** First words of a text, for a thread named after an answer or its first message */
export function firstWords(text, words = 6) {
    const line = text
        .replace(/^#+\s*/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
    const cut = line.split(' ').slice(0, words).join(' ');
    return cut.length < line.length ? `${cut}…` : cut;
}
/** What a thread list row shows of an item */
function itemPreview(item, tag) {
    if (item.kind === 'answer')
        return stripTag(answerText(item), tag);
    if (item.kind !== 'user')
        return '';
    const sent = agentMessage(item.text);
    return splitImages(stripTag(sent ? sent.body : item.text, tag)).text;
}
const lastTime = (thread, items) => {
    for (let i = items.length - 1; i >= 0; i--) {
        const ts = itemTime(items[i]);
        if (ts !== undefined)
            return ts;
    }
    return thread.createdAt;
};
const threadName = (t) => `${t.name.project} · ${t.name.task}`;
/** The quote a reply will carry, above a composer */
export const QuoteChip = ({ quote, onRemove, }) => {
    const t = useLabels().terminal;
    return (_jsxs("div", { "data-quote-chip": true, className: "mb-1.5 flex max-w-full min-w-0 items-start gap-1.5 rounded-md border border-blue-400/30 bg-blue-500/10 py-1 pl-2 pr-1 text-xs text-blue-100", children: [_jsx(Quote, { size: 12, "aria-hidden": true, className: "mt-0.5 shrink-0 text-blue-300" }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block text-blue-300", children: quote.ts === undefined ? t.reply : t.replyTo(hhmm(quote.ts)) }), _jsx("span", { className: "line-clamp-2 whitespace-pre-wrap text-blue-100/85", children: quote.text })] }), _jsx("button", { type: "button", "aria-label": t.removeQuote, title: t.removeQuote, onClick: onRemove, className: `shrink-0 rounded p-0.5 text-blue-300 hover:bg-blue-500/20 hover:text-white ${focusRing}`, children: _jsx(X, { size: 12, "aria-hidden": true }) })] }));
};
/** In the main chat where a thread starts: "3 replies in thread Shop · Checkout" */
export const ThreadMarkerRow = ({ thread, items, onOpen }) => {
    const t = useLabels().terminal;
    const unread = unreadCount(items, thread.readAt);
    return (_jsxs("button", { type: "button", onClick: onOpen, "data-thread-marker": thread.id, className: `-mt-1 mb-3 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-gray-800/70 ${focusRing}`, children: [_jsx(MessagesSquare, { size: 13, "aria-hidden": true, className: "shrink-0 text-blue-300" }), _jsx("span", { className: "shrink-0 whitespace-nowrap font-medium text-blue-300", children: t.threadReplies(items.length) }), _jsxs("span", { className: "min-w-0 truncate text-gray-400", children: [t.inThread, " ", _jsx("span", { className: "text-gray-200", children: threadName(thread) })] }), unread > 0 && (_jsx("span", { className: "shrink-0 rounded-full bg-blue-500 px-1.5 text-[10px] font-semibold leading-4 text-white tabular-nums", children: t.unreadNew(unread) })), _jsx("span", { className: "ml-auto shrink-0 tabular-nums text-gray-500", children: hhmm(lastTime(thread, items)) })] }));
};
/** Composer of the open thread: text, quote, images and files */
export const ThreadComposer = ({ placeholder, quote, onClearQuote, onSend, disabled, focusKey }) => {
    const t = useLabels().terminal;
    const uploads = useTransport().uploads;
    const [text, setText] = useState('');
    const [files, setFiles] = useState([]);
    const [sending, setSending] = useState(false);
    const input = useRef(null);
    useEffect(() => {
        input.current?.focus();
    }, [focusKey, quote]);
    const empty = !text.trim() && files.length === 0;
    const send = async () => {
        if (empty || sending || disabled)
            return;
        setSending(true);
        try {
            if (await onSend(text.trim(), files)) {
                setText('');
                setFiles([]);
            }
        }
        finally {
            setSending(false);
            input.current?.focus();
        }
    };
    return (_jsxs("div", { className: "shrink-0 border-t border-gray-800 p-2", ...(uploads &&
            imageDropHandlers((picked) => setFiles((prev) => [...prev, ...picked]), (list) => attachableFiles(list, uploads.attachmentExtensions))), children: [quote && _jsx(QuoteChip, { quote: quote, onRemove: onClearQuote }), _jsxs("div", { className: "flex items-end gap-1.5", children: [_jsx("textarea", { ref: input, rows: 2, value: text, placeholder: placeholder, "aria-label": placeholder, disabled: disabled, onChange: (e) => setText(e.target.value), onKeyDown: (e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                void send();
                            }
                            else if (e.key === 'Escape' && quote) {
                                e.preventDefault();
                                onClearQuote();
                            }
                        }, className: "block min-h-[40px] w-full resize-none rounded-md border border-gray-700 bg-gray-900 px-2.5 py-2 text-sm leading-5 text-gray-100 placeholder:text-gray-500 focus:border-blue-400 focus:outline-none disabled:opacity-50" }), _jsx("button", { type: "button", "aria-label": t.sendMessage, title: t.sendMessage, onClick: () => void send(), disabled: empty || sending || disabled, className: `mb-0.5 rounded-md bg-blue-600 p-1.5 text-white hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 ${focusRing}`, children: sending ? (_jsx(Loader2, { size: 15, "aria-hidden": true, className: "animate-spin motion-reduce:animate-none" })) : (_jsx(ArrowUp, { size: 15, "aria-hidden": true })) })] }), uploads && (_jsx(ImageAttachments, { images: files, onChange: setFiles, disabled: sending || disabled, files: uploads.attachmentExtensions }))] }));
};
const NewThreadMenu = ({ tasks, onTask, onFree, onDismiss }) => {
    const t = useLabels().terminal;
    const menu = useRef(null);
    useEffect(() => {
        menu.current?.querySelector('[role="menuitem"]')?.focus();
        const away = (e) => {
            if (!menu.current?.contains(e.target))
                onDismiss();
        };
        document.addEventListener('mousedown', away);
        return () => document.removeEventListener('mousedown', away);
    }, [onDismiss]);
    const projects = [...new Set(tasks.map((x) => x.project))];
    const item = `block w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-blue-500/20 focus:bg-blue-500/20 focus:outline-none`;
    return (_jsxs("div", { ref: menu, role: "menu", "aria-label": t.newThread, onKeyDown: (e) => {
            if (e.key === 'Escape')
                return onDismiss();
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')
                return;
            e.preventDefault();
            const items = [...(menu.current?.querySelectorAll('[role="menuitem"]') ?? [])];
            const i = items.indexOf(document.activeElement);
            items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
        }, className: "absolute right-2 top-8 z-30 max-h-[70%] w-72 max-w-[calc(100%-1rem)] overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl shadow-black/40", children: [_jsx("div", { className: "px-3 pb-1 pt-1.5 text-[11px] text-gray-500", children: tasks.length ? t.bindToTask : t.noReportTasks }), projects.map((id) => {
                const of = tasks.filter((x) => x.project === id);
                return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-1.5 px-3 pt-1.5 text-[11px] font-medium text-gray-400", children: [_jsx(FolderGit2, { size: 11, "aria-hidden": true, className: "shrink-0" }), _jsx("span", { className: "shrink-0 whitespace-nowrap", children: of[0].projectName }), of[0].repo && (_jsx("span", { className: "truncate font-normal text-gray-500", children: of[0].repo }))] }), of.map((task) => (_jsxs("button", { role: "menuitem", type: "button", tabIndex: -1, onClick: () => onTask({ project: task.project, task: task.task }), className: item, children: [task.title, task.state && (_jsx("span", { className: "block truncate text-[11px] text-gray-500", children: task.state }))] }, task.task)))] }, id));
            }), _jsx("div", { className: "mt-1 border-t border-gray-800 pt-1", children: _jsxs("button", { role: "menuitem", type: "button", tabIndex: -1, onClick: onFree, className: item, children: [t.threadWithoutTask, _jsx("span", { className: "block text-[11px] text-gray-500", children: t.threadWithoutTaskHint })] }) })] }));
};
const ThreadListRow = ({ thread, items, open, onOpen }) => {
    const t = useLabels().terminal;
    const unread = unreadCount(items, thread.readAt);
    const first = items.map((i) => itemPreview(i, thread.tag)).find(Boolean);
    return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: onOpen, "aria-current": open || undefined, "data-thread-row": thread.id, className: `block w-full border-l-2 px-3 py-2 text-left ${focusRing} ${open ? 'border-blue-400 bg-blue-500/10' : 'border-transparent hover:bg-gray-800/60'}`, children: [_jsxs("span", { className: "flex items-center gap-1.5 text-sm", children: [_jsx("span", { className: `min-w-0 truncate ${unread ? 'font-semibold text-white' : 'text-gray-200'}`, children: threadName(thread) }), unread > 0 && (_jsx("span", { className: "shrink-0 rounded-full bg-blue-500 px-1.5 text-[10px] font-semibold leading-4 text-white tabular-nums", title: t.unreadCount(unread), children: t.unreadNew(unread) })), _jsx("span", { className: "ml-auto shrink-0 text-[11px] tabular-nums text-gray-500", children: hhmm(lastTime(thread, items)) })] }), _jsxs("span", { className: "mt-0.5 flex items-center gap-1 truncate text-[11px] text-gray-500", children: [_jsx(FolderGit2, { size: 10, "aria-hidden": true, className: "shrink-0" }), _jsx("span", { className: "truncate", children: thread.repo ?? t.notBound })] }), thread.summary && (_jsx("span", { className: "mt-0.5 block truncate text-xs text-gray-400", children: thread.summary })), first && _jsx("span", { className: "mt-0.5 block truncate text-xs text-gray-500", children: first })] }) }));
};
export const DRAFT_THREAD = 'draft';
/** Right panel of an orchestrator chat: its threads, below them the open one */
export const ThreadsPanel = ({ status, threads, tasks, byThread, openId, onOpen, onRetry, onNewTask, onNewFree, onClose, renderThread, }) => {
    const t = useLabels().terminal;
    const [menu, setMenu] = useState(false);
    const [closedOpen, setClosedOpen] = useState(false);
    const active = threads.filter((x) => !x.closed);
    const closed = threads.filter((x) => x.closed);
    const open = threads.find((x) => x.id === openId) ?? null;
    const draft = openId === DRAFT_THREAD;
    const dismissMenu = useCallback(() => setMenu(false), []);
    return (_jsxs("div", { className: "relative flex h-full min-h-0 flex-col bg-gray-950", "data-threads-panel": true, children: [_jsxs("div", { className: "flex h-8 shrink-0 items-center gap-1.5 border-b border-gray-800 px-2 text-xs", children: [_jsx(MessagesSquare, { size: 13, "aria-hidden": true, className: "shrink-0 text-blue-300" }), _jsx("span", { className: "font-medium text-gray-200", children: t.threads }), _jsx("span", { className: "flex-1" }), _jsxs("button", { type: "button", onClick: () => setMenu((m) => !m), "aria-haspopup": "menu", "aria-expanded": menu, disabled: status !== 'ready', className: `${smallBtn} disabled:opacity-50`, children: [_jsx(Plus, { size: 12, "aria-hidden": true }), t.newThread] })] }), menu && (_jsx(NewThreadMenu, { tasks: tasks, onDismiss: dismissMenu, onTask: (task) => {
                    setMenu(false);
                    onNewTask(task);
                }, onFree: () => {
                    setMenu(false);
                    onNewFree();
                } })), status === 'loading' && (_jsxs("div", { role: "status", className: "flex items-center gap-2 px-3 py-4 text-xs text-gray-500", children: [_jsx(Loader2, { size: 13, "aria-hidden": true, className: "animate-spin motion-reduce:animate-none" }), t.loadingThreads] })), status === 'error' && (_jsxs("div", { role: "alert", className: "m-2 rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-xs", children: [_jsx("div", { className: "font-medium text-red-200", children: t.threadsFailed }), _jsx("div", { className: "mt-0.5 text-red-200/70", children: t.threadsFailedHint }), _jsxs("button", { type: "button", onClick: onRetry, className: `${smallBtn} mt-1.5 -ml-1.5 text-red-200`, children: [_jsx(RotateCcw, { size: 11, "aria-hidden": true }), t.tryAgain] })] })), status === 'ready' && threads.length === 0 && !draft && (_jsxs("div", { className: "px-3 py-4 text-xs text-gray-500", children: [_jsx("div", { className: "font-medium text-gray-300", children: t.noThreads }), _jsx("p", { className: "mt-1", children: t.noThreadsHint })] })), status === 'ready' && threads.length > 0 && (_jsxs("div", { className: `shrink-0 overflow-y-auto border-b border-gray-800 ${openId ? 'max-h-[42%]' : 'flex-1'}`, children: [_jsx("ul", { className: "py-1", children: active.map((x) => (_jsx(ThreadListRow, { thread: x, items: byThread.get(x.id) ?? [], open: x.id === openId, onOpen: () => onOpen(x.id === openId ? null : x.id) }, x.id))) }), closed.length > 0 && (_jsxs("div", { className: "border-t border-gray-800/70 py-1 text-xs", children: [_jsxs("button", { type: "button", onClick: () => setClosedOpen((o) => !o), "aria-expanded": closedOpen, className: `flex w-full items-center gap-1 px-3 py-1 text-gray-500 hover:text-gray-300 ${focusRing}`, children: [_jsx(ChevronRight, { size: 12, "aria-hidden": true, className: `transition-transform motion-reduce:transition-none ${closedOpen ? 'rotate-90' : ''}` }), t.closedThreads(closed.length)] }), closedOpen && (_jsx("ul", { children: closed.map((x) => (_jsxs("li", { className: "flex items-center gap-2 px-3 py-1 pl-7", children: [_jsx("button", { type: "button", onClick: () => onOpen(x.id), className: `min-w-0 flex-1 truncate text-left text-gray-400 hover:text-gray-200 ${focusRing}`, children: threadName(x) }), _jsx("button", { type: "button", onClick: () => onClose(x.id, false), className: smallBtn, children: t.reopenThread })] }, x.id))) }))] }))] })), (open || draft) && (_jsxs("section", { "aria-label": t.threadLog(open ? threadName(open) : t.newThread), className: "flex min-h-0 flex-1 flex-col", children: [_jsxs("div", { className: "flex h-8 shrink-0 items-center gap-1.5 border-b border-gray-800 px-2 text-xs", children: [_jsx("span", { className: "min-w-0 truncate font-medium text-gray-200", children: open ? threadName(open) : t.newThread }), _jsx("span", { className: "flex-1" }), open && !open.closed && (_jsx("button", { type: "button", onClick: () => onClose(open.id, true), className: smallBtn, children: t.closeThread })), _jsx("button", { type: "button", onClick: () => onOpen(null), "aria-label": t.hideThreads, title: t.hideThreads, className: `${smallBtn} px-1`, children: _jsx(X, { size: 12, "aria-hidden": true }) })] }), renderThread(open)] })), status === 'ready' && threads.length > 0 && !openId && (_jsx("p", { className: "px-3 py-2 text-[11px] text-gray-600", children: t.pickThread }))] }));
};
