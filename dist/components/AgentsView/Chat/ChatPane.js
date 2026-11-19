import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, } from 'react';
import { ChevronRight, History, ListTree, Maximize2, MessageSquare, MessagesSquare, RefreshCw, Send, Square, SquareTerminal, X, } from 'lucide-react';
import { groupAnswers, initialChatState, initialPrompts, pendingPrompts, prependHistory, agentMessage, reduceChat, } from '../../../utils/chatEvents';
import { attachableFiles, promptWithAttachments } from '../../../utils/composer';
import { useTransport } from '../../../host';
import { useLabels } from '../../../labels';
import { ImageAttachments, imageDropHandlers } from '../../ImageAttachments';
import { ChatIdContext, ChatItemView, UserMessage } from './ChatMessages';
import { ChatFileContext } from './ChatMarkdown';
import { ChatArtifactsButton, ChatArtifactsModal, artifactRefreshKey, useChatArtifacts, } from './ChatArtifacts';
import { ChatComposer } from './ChatComposer';
import { ChatActivity } from './ChatActivity';
import { ChatStatusLine } from './ChatStatusLine';
import { QuestionCard } from './QuestionCard';
import { ModelEffortPicker } from '../ModelEffortPicker';
import { switchCommands } from '../../../utils/modelMatrix';
import { splitImages } from '../../../utils/chatComposer';
import { extractNumberedChoices, screenPrompt } from '../../../utils/agentInput';
import { dialogKeys, parseAgentDialog } from '../../../utils/agentDialog';
import { harnessLabel, sessionHarness } from '../../../utils/agentSessions';
import { paneActiveTab, paneScreen, paneSuggestion, takePaneSuggestion, pressKeys, reattachPane, typeIntoPane, usePaneConnected, } from '../AgentTerminal';
/** Sessions whose view shows only the user's prompts (answers hidden) */
const PROMPTS_ONLY_KEY = 'devOrbitChatPromptsOnly';
function readPromptsOnly() {
    try {
        const list = JSON.parse(localStorage.getItem(PROMPTS_ONLY_KEY) ?? '[]');
        return Array.isArray(list) ? list.filter((v) => typeof v === 'string') : [];
    }
    catch {
        return [];
    }
}
/** Answers hidden or shown for session `sessionId`, remembered per session */
function usePromptsOnly(sessionId) {
    const [list, setList] = useState(readPromptsOnly);
    const on = !!sessionId && list.includes(sessionId);
    const toggle = useCallback(() => {
        if (!sessionId)
            return;
        const current = readPromptsOnly(); // another pane may have changed it
        const next = current.includes(sessionId)
            ? current.filter((id) => id !== sessionId)
            : [...current, sessionId].slice(-200);
        setList(next);
        try {
            localStorage.setItem(PROMPTS_ONLY_KEY, JSON.stringify(next));
        }
        catch {
            // stays for this page only
        }
    }, [sessionId]);
    return [on, toggle];
}
/** How often the screen of an agent that asks something is read for its question */
const PROMPT_POLL_MS = 1000;
/** Screen lines read for a question: a two-question dialog with descriptions takes ~30 */
const PROMPT_LINES = 40;
/** A sent answer keeps its card locked this long when the screen does not move on (keys lost) */
const SENT_LOCK_MS = 5000;
/** Claude Code's ghost-text suggestion in pane `paneId`'s input line, read while `active` */
function usePaneSuggestion(paneId, active) {
    const [suggestion, setSuggestion] = useState(null);
    useEffect(() => {
        if (!active)
            return;
        const read = () => {
            const next = paneSuggestion(paneId);
            setSuggestion((prev) => prev?.text === next?.text && prev?.truncated === next?.truncated ? prev : next);
        };
        read();
        const timer = setInterval(read, PROMPT_POLL_MS);
        return () => {
            clearInterval(timer);
            setSuggestion(null);
        };
    }, [paneId, active]);
    return active ? suggestion : null;
}
/**
 * Screen tail of pane `paneId` while its agent waits on a question or permission (not in its
 * transcript), with the question tab its dialog highlights
 */
function usePanePrompt(paneId, prompting) {
    const [text, setText] = useState({ screen: '', tab: null });
    useEffect(() => {
        if (!prompting)
            return;
        const read = () => setText((was) => {
            const screen = paneScreen(paneId, PROMPT_LINES);
            const tab = paneActiveTab(paneId);
            return was.screen === screen && was.tab === tab ? was : { screen, tab };
        });
        read();
        const timer = setInterval(read, PROMPT_POLL_MS);
        return () => {
            clearInterval(timer);
            setText({ screen: '', tab: null });
        };
    }, [paneId, prompting]);
    return prompting ? text : null;
}
const reducer = (state, action) => action.type === 'reset'
    ? initialChatState
    : action.type === 'older'
        ? prependHistory(state, action.page)
        : reduceChat(state, action.event);
/** Distance from the top (px) at which the next older page loads */
const LOAD_OLDER_PX = 400;
const iconBtn = 'p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-40 shrink-0';
// A focus or active-pane change re-labels the top bar (keys, model) and can reflow the panes
// between mousedown and mouseup, swallowing the click; header buttons act without either
const keepFocus = (e) => {
    e.preventDefault();
    e.stopPropagation();
};
/**
 * UI view of an agent pane (#189): renders the agent's transcript and types into the pane's
 * terminal. The terminal process is the agent; this view never starts or stops a process.
 */
export const ChatPane = ({ pane, agent, sessionId, active, focused, submitKey, showSteps, onToggleSteps, onFocus, onClose, onMaximize, onShowTerminal, headerProps, meta, }) => {
    const [state, dispatch] = useReducer(reducer, initialChatState);
    const { chat, uploads } = useTransport();
    const t = useLabels().terminal;
    const [chatId, setChatId] = useState(null);
    // Bumped when the server forgot the view (restart, orphan timeout): opens it again
    const [generation, setGeneration] = useState(0);
    const [text, setText] = useState('');
    const [images, setImages] = useState([]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const listRef = useRef(null);
    const contentRef = useRef(null);
    const stickToBottom = useRef(true);
    const lastScrollTop = useRef(0);
    const inputRef = useRef(null);
    const connected = usePaneConnected(pane.id);
    const harness = sessionHarness(pane);
    const harnessName = harnessLabel(harness);
    // The server view outlives this component (split remounts, view switches): with nobody
    // watching it stops itself after the orphan timeout, so a remount never races a stop
    useEffect(() => {
        if (!sessionId || !chat)
            return;
        let cancelled = false;
        chat
            .openTranscriptView(pane.id, { harness, sessionId, cwd: pane.cwd, name: pane.name })
            .then((view) => !cancelled && setChatId(view.id))
            .catch((e) => !cancelled && setError(e.message));
        return () => {
            cancelled = true;
            setChatId(null);
        };
        // the name only labels the view
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chat, pane.id, pane.cwd, harness, sessionId, generation]);
    useEffect(() => {
        if (!chatId || !chat)
            return;
        return chat.subscribeToChat(chatId, {
            onOpen: () => {
                stickToBottom.current = true;
                dispatch({ type: 'reset' });
            },
            onEvent: (event) => dispatch({ type: 'event', event }),
            onGone: () => setGeneration((g) => g + 1),
        });
    }, [chat, chatId]);
    // Follow the stream unless the user scrolled up to read. Message heights settle late
    // (content-visibility, markdown, images), so every size change re-pins to the bottom.
    const pinBottom = useCallback(() => {
        const el = listRef.current;
        if (el && stickToBottom.current) {
            el.scrollTop = el.scrollHeight;
            lastScrollTop.current = el.scrollTop;
        }
    }, []);
    // Older turns load page by page near the top; the view keeps its place while they go in front
    const [loadingOlder, setLoadingOlder] = useState(false);
    const loadingRef = useRef(false);
    // The message at the top of the view and its offset: put back there once the page is in
    const restoreScroll = useRef(null);
    const loadOlder = useCallback(() => {
        const older = state.older;
        const el = listRef.current;
        if (!chat || !chatId || !older?.more || loadingRef.current || !el)
            return;
        loadingRef.current = true;
        setLoadingOlder(true);
        chat
            .fetchChatHistory(chatId, older.before)
            .then((page) => {
            const top = el.getBoundingClientRect().top;
            const first = [...el.querySelectorAll('[data-chat-key]')].find((m) => m.getBoundingClientRect().bottom > top);
            if (first?.dataset.chatKey)
                restoreScroll.current = {
                    key: first.dataset.chatKey,
                    offset: first.getBoundingClientRect().top - top,
                };
            dispatch({ type: 'older', page });
        })
            .catch((e) => setError(e.message))
            .finally(() => {
            loadingRef.current = false;
            setLoadingOlder(false);
        });
    }, [chat, chatId, state.older]);
    useLayoutEffect(() => {
        const el = listRef.current;
        const saved = restoreScroll.current;
        if (!el || !saved)
            return;
        restoreScroll.current = null;
        const anchor = el.querySelector(`[data-chat-key="${globalThis.CSS.escape(saved.key)}"]`);
        if (!anchor)
            return;
        // by the element, not the height: estimated heights (content-visibility) settle later
        el.scrollTop +=
            anchor.getBoundingClientRect().top - el.getBoundingClientRect().top - saved.offset;
        lastScrollTop.current = el.scrollTop;
    }, [state.messages]);
    // A short tail that does not fill the view cannot be scrolled: load on until it does
    useEffect(() => {
        const el = listRef.current;
        if (el && el.scrollHeight <= el.clientHeight + LOAD_OLDER_PX)
            loadOlder();
    }, [state.older, loadOlder]);
    useLayoutEffect(pinBottom, [state.messages, showSteps, pinBottom]);
    useEffect(() => {
        const content = contentRef.current;
        const list = listRef.current;
        if (!content || !list)
            return;
        const observer = new ResizeObserver(pinBottom);
        observer.observe(content);
        // The list shrinks too when the status line or work panel below it appears late
        observer.observe(list);
        return () => observer.disconnect();
    }, [pinBottom]);
    // Back on a hidden tab: jump to the newest messages
    useEffect(() => {
        if (active) {
            stickToBottom.current = true;
            pinBottom();
        }
    }, [active, pinBottom]);
    const history = useMemo(() => state.messages
        .filter((m) => m.kind === 'user')
        .filter((m) => !agentMessage(m.text))
        .map((m) => splitImages(m.text).text)
        .filter(Boolean), [state.messages]);
    const turns = useMemo(() => state.messages.filter((m) => m.kind === 'result').length, [state.messages]);
    // One card per answer; regrouped per event, cards memoize on their messages
    const items = useMemo(() => groupAnswers(state.messages), [state.messages]);
    const [promptsOnly, togglePromptsOnly] = usePromptsOnly(sessionId);
    // Latest recap (Claude's away summary) stays pinned above the input instead of in the log
    const recap = useMemo(() => {
        for (let i = state.messages.length - 1; i >= 0; i--) {
            const m = state.messages[i];
            if (m.kind === 'recap')
                return m;
        }
        return null;
    }, [state.messages]);
    const shown = useMemo(() => promptsOnly
        ? items.filter((item) => item.kind === 'user' && !agentMessage(item.text))
        : items.filter((item) => item !== recap), [items, promptsOnly, recap]);
    const pending = useMemo(() => pendingPrompts(state), [state]);
    const starts = useMemo(() => initialPrompts(state.messages), [state.messages]);
    const [startsOpen, setStartsOpen] = useState(false);
    // Jump to a prompt; letting go of the bottom keeps late layout from pulling the list back down
    const jumpTo = (key) => {
        const target = listRef.current?.querySelector(`[data-chat-key="${key}"]`);
        if (!target)
            return;
        stickToBottom.current = false;
        target.scrollIntoView({ block: 'start' });
        // content-visibility renders the skipped messages above late: settle, then aim again
        requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
        target.animate?.([{ backgroundColor: 'rgba(59,130,246,0.25)' }, { backgroundColor: 'transparent' }], { duration: 1200 });
    };
    const artifactKey = useMemo(() => artifactRefreshKey(state.messages, turns), [state.messages, turns]);
    const artifacts = useChatArtifacts(chatId, artifactKey);
    const [artifactsOpen, setArtifactsOpen] = useState(false);
    // Busy and questions come from the agent's state: a prompt is on its screen, not in its transcript.
    // The server derives `displayState` for every kind; a prompt to answer here needs `status: waiting`.
    const prompting = agent?.displayState === 'waiting' ||
        (agent?.displayState === 'needs-input' && agent?.status === 'waiting');
    const busy = agent?.displayState === 'working';
    // Back to idle: an echoed prompt still unlogged was withdrawn in the TUI (a few s for the poll)
    useEffect(() => {
        if (busy)
            return;
        const t = window.setTimeout(() => dispatch({ type: 'event', event: { type: 'devorbit_sent_clear' } }), 3000);
        return () => window.clearTimeout(t);
    }, [busy]);
    // The agent's state only says it may wait; the box needs a dialog on its screen
    const panePrompt = usePanePrompt(pane.id, prompting);
    const screen = panePrompt?.screen ?? null;
    const suggestion = usePaneSuggestion(pane.id, harness === 'claude' && connected && !busy && !prompting);
    const prompt = screen ? screenPrompt(screen) : null;
    // A dialog the parser knows becomes a card; any other prompt stays the screen excerpt below
    const dialog = useMemo(() => (prompt ? parseAgentDialog(screen ?? '', panePrompt?.tab) : null), [prompt, screen, panePrompt?.tab]);
    const dialogId = dialog ? JSON.stringify(dialog) : null;
    const [sentFor, setSentFor] = useState(null);
    useEffect(() => {
        if (!sentFor)
            return;
        const t = window.setTimeout(() => setSentFor(null), SENT_LOCK_MS);
        return () => window.clearTimeout(t);
    }, [sentFor]);
    const choices = prompt && !dialog ? extractNumberedChoices(prompt) : [];
    const notConnected = t.notConnected;
    // Model × effort of the running session: typed as its own commands, one after the other (a
    // second paste before the first Enter would land in the same line)
    const switchModel = (model, effort) => {
        if (harness !== 'claude' && harness !== 'omp')
            return;
        const [first, ...rest] = switchCommands(harness, model, effort);
        if (!first)
            return;
        if (!typeIntoPane(pane.id, first))
            return setError(notConnected);
        rest.forEach((cmd, i) => window.setTimeout(() => typeIntoPane(pane.id, cmd), 600 * (i + 1)));
    };
    const answerPrompt = (answer) => {
        setError(pressKeys(pane.id, answer) ? null : notConnected);
    };
    // Keys go to what is on the screen now: the card may be a poll old, and a click on "Yes"
    // must not approve a different command
    const answerDialog = (answer) => {
        const now = parseAgentDialog(paneScreen(pane.id, PROMPT_LINES), paneActiveTab(pane.id));
        if (!now || JSON.stringify(now) !== dialogId)
            return setError(t.questionChanged);
        if (!pressKeys(pane.id, dialogKeys(now, answer)))
            return setError(notConnected);
        setError(null);
        // moving between tabs answers nothing: the card stays usable on the step it lands on
        if (answer.type !== 'tab' && answer.type !== 'step')
            setSentFor(dialogId);
    };
    const submit = async () => {
        if (sending || !connected || (!text.trim() && images.length === 0))
            return;
        setSending(true);
        setError(null);
        try {
            const stored = uploads
                ? await Promise.all(images.map((file) => uploads.uploadAttachment(file)))
                : [];
            const prompt = promptWithAttachments(text, stored);
            if (!typeIntoPane(pane.id, prompt)) {
                setError(notConnected);
                return;
            }
            // Claude logs a typed prompt at once (or as queued); others only once the agent takes it.
            // Commands never show up as a user turn.
            if (harness !== 'claude' && !prompt.trimStart().startsWith('/'))
                dispatch({ type: 'event', event: { type: 'devorbit_sent', text: prompt } });
            setText('');
            setImages([]);
            stickToBottom.current = true;
        }
        catch (e) {
            setError(e instanceof Error ? e.message : t.sendingFailed);
        }
        finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };
    // Esc, like the key in the TUI
    const stopTurn = () => {
        setError(pressKeys(pane.id, '\x1b') ? null : notConnected);
    };
    const status = !connected
        ? t.statusDisconnected
        : prompting
            ? t.statusNeedsInput
            : busy
                ? t.statusWorking
                : t.statusReady;
    const view = (_jsxs("div", { className: `flex flex-col h-full min-h-0 bg-gray-950 border rounded-lg overflow-hidden ${focused
            ? 'border-blue-300 ring-2 ring-blue-300/70'
            : active
                ? 'border-blue-400/40'
                : 'border-gray-800'}`, onMouseDown: onFocus, "data-agent-pane": pane.id, "data-chat-pane": true, "data-pane-active": active, ...(uploads &&
            imageDropHandlers((files) => setImages((prev) => [...prev, ...files]), (list) => attachableFiles(list, uploads.attachmentExtensions))), children: [_jsxs("div", { ...headerProps, className: `flex flex-nowrap items-center gap-x-1.5 h-8 px-2 border-b text-xs shrink-0 bg-gray-900 border-gray-800 ${headerProps?.draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${headerProps?.className ?? ''}`, children: [_jsx(MessageSquare, { size: 13, "aria-hidden": true, className: "text-blue-300 shrink-0" }), _jsx("span", { className: "font-medium text-gray-200 truncate min-w-0", children: pane.name }), harness !== 'claude' && (_jsx("span", { className: "shrink-0 px-1 rounded border border-gray-700 text-[10px] text-gray-400", children: harnessName })), _jsx("span", { className: "text-gray-500 font-mono truncate min-w-0 hidden lg:inline", children: pane.cwd }), state.model && (_jsx("span", { className: "text-gray-500 truncate min-w-0 hidden sm:inline", children: state.model })), _jsx("span", { className: `shrink-0 ${prompting || !connected ? 'text-amber-300' : busy ? 'text-blue-300' : 'text-gray-500'}`, children: status }), !connected && (_jsxs("button", { type: "button", onClick: () => {
                            setError(null);
                            if (!reattachPane(pane.id))
                                setError(t.noTerminalToReattach);
                        }, className: "shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-amber-100 bg-amber-500/15 border border-amber-400/40 hover:bg-amber-500/25 focus-visible:outline-2 focus-visible:outline-blue-400", title: t.reattachTitle, children: [_jsx(RefreshCw, { size: 11, "aria-hidden": true }), t.reattach] })), meta && (_jsx("div", { className: "flex items-center gap-x-2 min-w-0 overflow-hidden text-[11px] text-gray-400", children: meta })), _jsx("span", { className: "flex-1" }), _jsx("button", { type: "button", onClick: onToggleSteps, onMouseDown: keepFocus, className: `${iconBtn} ${showSteps ? 'text-blue-300' : ''}`, title: showSteps ? t.hideStepsTitle : t.showStepsTitle, "aria-label": t.showSteps, "aria-pressed": showSteps, children: _jsx(ListTree, { size: 13 }) }), _jsx("button", { type: "button", onClick: togglePromptsOnly, onMouseDown: keepFocus, disabled: !sessionId, className: `${iconBtn} ${promptsOnly ? 'text-blue-300' : ''}`, title: promptsOnly ? t.showAnswersTitle : t.promptsOnlyTitle, "aria-label": t.promptsOnly, "aria-pressed": promptsOnly, children: _jsx(MessagesSquare, { size: 13 }) }), busy && connected && (_jsx("button", { type: "button", onClick: stopTurn, onMouseDown: keepFocus, className: iconBtn, title: t.stopTurnTitle, "aria-label": t.stopTurn, children: _jsx(Square, { size: 13 }) })), _jsx("button", { type: "button", onClick: onShowTerminal, onMouseDown: keepFocus, className: iconBtn, title: t.terminalViewTitle, "aria-label": t.terminalView, children: _jsx(SquareTerminal, { size: 14 }) }), onMaximize && (_jsx("button", { type: "button", onClick: onMaximize, onMouseDown: keepFocus, className: iconBtn, title: t.ownTab, "aria-label": t.moveToItsOwnTab, children: _jsx(Maximize2, { size: 13 }) })), _jsx("button", { type: "button", onClick: onClose, onMouseDown: keepFocus, className: iconBtn, title: t.closeAgentTitle, "aria-label": t.closeNamed(pane.name), children: _jsx(X, { size: 14 }) })] }), starts.length > 0 && (_jsxs("div", { className: "shrink-0 border-b border-gray-800 bg-gray-900/60 text-xs", children: [_jsxs("button", { type: "button", onClick: () => setStartsOpen((o) => !o), className: "flex w-full items-center gap-1 px-3 py-1 text-gray-400 hover:text-gray-200", "aria-expanded": startsOpen, "data-chat-starts": true, children: [_jsx(ChevronRight, { size: 12, "aria-hidden": true, className: `transition-transform ${startsOpen ? 'rotate-90' : ''}` }), t.startPrompts(starts.length), _jsx("span", { className: "text-gray-600", children: t.startPromptsHint })] }), startsOpen && (_jsx("ol", { className: "max-h-40 overflow-y-auto pb-1", children: starts.map((m, i) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => jumpTo(m.key), className: "block w-full truncate px-3 py-0.5 pl-7 text-left text-gray-300 hover:bg-gray-800 hover:text-white", title: m.text, children: [_jsxs("span", { className: "mr-1.5 text-gray-600", children: [i + 1, "."] }), splitImages(m.text).text || m.text] }) }, m.key))) }))] })), _jsx("div", { ref: listRef, role: "log", "aria-label": t.chatLog(pane.name), className: "flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-2", onScroll: (e) => {
                    const el = e.currentTarget;
                    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
                    // Only a scroll up by the user lets go; layout shifts never do
                    if (nearBottom)
                        stickToBottom.current = true;
                    else if (el.scrollTop < lastScrollTop.current - 2)
                        stickToBottom.current = false;
                    lastScrollTop.current = el.scrollTop;
                    if (el.scrollTop < LOAD_OLDER_PX)
                        loadOlder();
                }, children: _jsxs("div", { ref: contentRef, children: [state.older?.more && (_jsx("div", { className: "flex justify-center py-2", role: "status", children: loadingOlder ? (_jsx("span", { className: "text-xs text-gray-500", children: t.loadingEarlier })) : (_jsx("button", { type: "button", onClick: loadOlder, className: "text-xs text-gray-400 hover:text-gray-200 underline-offset-2 hover:underline", children: t.loadEarlier })) })), state.messages.length === 0 && (_jsx("div", { className: "h-full flex items-center justify-center text-sm text-gray-500", children: sessionId ? t.emptyChat(harnessName, !!uploads) : t.waitingForSession(harnessName) })), _jsxs(ChatFileContext.Provider, { value: pane.cwd, children: [shown.map((item, i) => (
                                // content-visibility keeps long chats (hundreds of messages) cheap to scroll
                                _jsx("div", { "data-chat-key": item.key, className: "[content-visibility:auto] [contain-intrinsic-size:auto_60px]", children: _jsx(ChatItemView, { item: item, showSteps: showSteps, live: busy && item.kind === 'answer' && i === shown.length - 1, harness: harnessName, model: state.model }) }, item.key))), pending.map((p, i) => (_jsx(UserMessage, { text: p, queued: true }, `q${i}`))), busy && !promptsOnly && pending.length === 0 && items.at(-1)?.kind === 'user' && (_jsx(ChatItemView, { item: null, showSteps: showSteps, live: true, harness: harnessName, model: state.model }))] })] }) }), _jsxs("div", { className: "shrink-0 border-t border-gray-800 p-2", children: [recap && (_jsxs("section", { "aria-label": t.recap, "data-chat-recap": true, className: "mb-2 flex gap-2 rounded-md border border-gray-700/70 bg-gray-900/70 px-3 py-2 text-sm text-gray-300", children: [_jsx(History, { size: 14, "aria-hidden": true, className: "mt-0.5 shrink-0 text-gray-500" }), _jsxs("p", { className: "max-h-24 min-w-0 overflow-y-auto whitespace-pre-wrap", children: [_jsx("span", { className: "text-gray-500", children: t.recapPrefix }), recap.text] })] })), dialog && (_jsx(QuestionCard, { dialog: dialog, sent: sentFor === dialogId, disabled: !connected, onAnswer: answerDialog })), prompt !== null && !dialog && (_jsxs("div", { role: "status", className: "mb-2 rounded-md border border-amber-400/40 bg-amber-500/10 p-2", children: [_jsx("div", { className: "text-xs font-medium text-amber-200", children: t.agentAskingPrompt }), _jsx("pre", { className: "mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-gray-200 font-mono", children: prompt }), choices.length > 0 && (_jsx("div", { className: "mt-2 flex flex-wrap gap-1.5", children: choices.map((c) => (_jsxs("button", { type: "button", disabled: !connected, onClick: () => answerPrompt(String(c.number)), className: "rounded border border-amber-400/40 bg-gray-900 px-2 py-1 text-xs text-gray-100 hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50", children: [c.number, ". ", c.label] }, c.number))) }))] })), chatId && (_jsx(ChatActivity, { chatId: chatId, messages: state.messages, sub: state.sub, busy: busy, endedTasks: state.endedTasks })), error && (_jsx("div", { role: "alert", className: "mb-1 text-xs text-red-300", children: error })), _jsxs("div", { className: "flex items-end gap-2", children: [_jsx(ChatComposer, { chatId: chatId, value: text, onChange: setText, onSubmit: submit, onStop: stopTurn, busy: busy, disabled: !connected, submitKey: submitKey, history: history, commands: state.commands, agents: state.agents, suggestion: suggestion?.text, suggestionCut: suggestion?.truncated, takeSuggestion: () => takePaneSuggestion(pane.id), inputRef: inputRef }), _jsxs("button", { type: "button", onClick: submit, disabled: sending || !connected, className: "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50", "aria-label": t.sendMessage, children: [_jsx(Send, { size: 13, "aria-hidden": true }), _jsx("span", { className: "hidden sm:inline", children: t.send })] })] }), uploads && (_jsx(ImageAttachments, { images: images, onChange: setImages, disabled: sending || !connected, files: uploads.attachmentExtensions })), chatId && (_jsxs("div", { className: "flex items-end gap-3", children: [_jsx("div", { className: "flex-1 min-w-0", children: _jsx(ChatStatusLine, { chatId: chatId, turns: turns, visible: active, picker: (harness === 'claude' || harness === 'omp') && (_jsx(ModelEffortPicker, { harness: harness, model: "", effort: "", keepLabel: t.keepCurrent, currentModel: state.model, currentEffort: state.effort, placement: "up", disabled: busy || !connected, onPick: switchModel, title: busy
                                            ? t.switchModelBusy
                                            : t.switchModel(harness === 'omp' ? '/switch, /effort' : '/model, /effort') })) }) }), _jsx("div", { className: "mt-2", children: _jsx(ChatArtifactsButton, { artifacts: artifacts, onOpen: () => setArtifactsOpen(true) }) })] })), chatId && artifactsOpen && (_jsx(ChatArtifactsModal, { chatId: chatId, cwd: pane.cwd, title: pane.name, artifacts: artifacts, onClose: () => setArtifactsOpen(false) }))] })] }));
    // tool results load their images from this chat
    return _jsx(ChatIdContext.Provider, { value: chatId, children: view });
};
