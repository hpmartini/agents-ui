import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  ChevronRight,
  History,
  ListTree,
  Maximize2,
  MessageSquare,
  MessagesSquare,
  PanelRight,
  RefreshCw,
  Send,
  Square,
  SquareTerminal,
  X,
} from 'lucide-react';
import type { AgentSession } from '../../../types';
import {
  groupAnswers,
  initialChatState,
  initialPrompts,
  pendingPrompts,
  prependHistory,
  agentMessage,
  reduceChat,
  type ChatAnswer,
  type ChatItem,
  type ChatState,
  type ChatSubmitKey,
} from '../../../utils/chatEvents';
import { attachableFiles, promptWithAttachments } from '../../../utils/composer';
import { useTransport } from '../../../host';
import { useLabels } from '../../../labels';
import type { ChatHistoryPage } from '../../../transport';
import { ImageAttachments, imageDropHandlers } from '../../ImageAttachments';
import { ChatFileContext } from './ChatMarkdown';
import {
  ChatArtifactsButton,
  ChatArtifactsModal,
  artifactRefreshKey,
  useChatArtifacts,
} from './ChatArtifacts';
import { ChatComposer } from './ChatComposer';
import {
  ChatIdContext,
  ChatItemView,
  ChatRepliesContext,
  UserMessage,
  type ChatQuote,
  type ChatReplies,
} from './ChatMessages';
import {
  DRAFT_THREAD,
  QuoteChip,
  ThreadComposer,
  ThreadMarkerRow,
  ThreadsPanel,
  isThreadsMaxKey,
  firstWords,
  useChatThreads,
} from './ChatThreads';
import {
  answerText,
  hhmm,
  itemTime,
  parseQuote,
  quoteHeader,
  stripTag,
  routeThreads,
  unreadCount,
} from '../../../utils/chatThreads';
import { clampWidth, ResizeHandle, useStoredWidth } from '../../../ResizeHandle';
import { ChatActivity } from './ChatActivity';
import { ChatStatusLine } from './ChatStatusLine';
import { QuestionCard } from './QuestionCard';
import { ModelEffortPicker } from '../ModelEffortPicker';
import { switchCommands } from '../../../utils/modelMatrix';
import { splitImages } from '../../../utils/chatComposer';
import { extractNumberedChoices, screenPrompt } from '../../../utils/agentInput';
import { dialogKeys, parseAgentDialog, type DialogAnswer } from '../../../utils/agentDialog';
import { harnessLabel, sessionHarness } from '../../../utils/agentSessions';
import {
  paneActiveTab,
  paneScreen,
  paneSuggestion,
  takePaneSuggestion,
  pressKeys,
  reattachPane,
  typeIntoPane,
  usePaneConnected,
} from '../AgentTerminal';

/** Sessions whose view shows only the user's prompts (answers hidden) */
const PROMPTS_ONLY_KEY = 'devOrbitChatPromptsOnly';

function readPromptsOnly(): string[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(PROMPTS_ONLY_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Answers hidden or shown for session `sessionId`, remembered per session */
function usePromptsOnly(sessionId: string | null): [boolean, () => void] {
  const [list, setList] = useState(readPromptsOnly);
  const on = !!sessionId && list.includes(sessionId);
  const toggle = useCallback(() => {
    if (!sessionId) return;
    const current = readPromptsOnly(); // another pane may have changed it
    const next = current.includes(sessionId)
      ? current.filter((id) => id !== sessionId)
      : [...current, sessionId].slice(-200);
    setList(next);
    try {
      localStorage.setItem(PROMPTS_ONLY_KEY, JSON.stringify(next));
    } catch {
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

type PaneSuggestion = ReturnType<typeof paneSuggestion>;

/** Claude Code's ghost-text suggestion in pane `paneId`'s input line, read while `active` */
function usePaneSuggestion(paneId: string, active: boolean): PaneSuggestion {
  const [suggestion, setSuggestion] = useState<PaneSuggestion>(null);
  useEffect(() => {
    if (!active) return;
    const read = () => {
      const next = paneSuggestion(paneId);
      setSuggestion((prev) =>
        prev?.text === next?.text && prev?.truncated === next?.truncated ? prev : next
      );
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
function usePanePrompt(
  paneId: string,
  prompting: boolean
): { screen: string; tab: string | null } | null {
  const [text, setText] = useState({ screen: '', tab: null as string | null });
  useEffect(() => {
    if (!prompting) return;
    const read = () =>
      setText((was) => {
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

type Action =
  { type: 'reset' } | { type: 'event'; event: unknown } | { type: 'older'; page: ChatHistoryPage };
const reducer = (state: ChatState, action: Action): ChatState =>
  action.type === 'reset'
    ? initialChatState
    : action.type === 'older'
      ? prependHistory(state, action.page)
      : reduceChat(state, action.event);
/** Distance from the top (px) at which the next older page loads */
const LOAD_OLDER_PX = 400;
const NO_THREADS: never[] = [];
const NO_ITEMS: never[] = [];

// Threads panel: one width for all orchestrator chats (pane ids do not outlive a restart)
const THREADS_WIDTH_KEY = 'agents-ui:threads-width';
const THREADS_OPEN_KEY = 'agents-ui:threads-open';
const THREADS_WIDTH = 360;
const THREADS_MIN = 260;
const THREADS_MAX = 640;
/** Stored floor: a narrow split may go below THREADS_MIN (its own 40 % floor) */
const THREADS_FLOOR = 120;
const readFlag = (key: string, fallback: boolean) => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
};

const iconBtn =
  'p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-40 shrink-0';

// A focus or active-pane change re-labels the top bar (keys, model) and can reflow the panes
// between mousedown and mouseup, swallowing the click; header buttons act without either
const keepFocus = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

interface ChatPaneProps {
  /** Terminal pane whose agent this view shows; input is typed into its PTY */
  pane: AgentSession;
  /** Listed session behind the pane (state, prompts); the pane itself for a background job */
  agent?: AgentSession;
  /** Transcript the view reads; null until the server lists the pane's session */
  sessionId: string | null;
  active: boolean;
  focused: boolean;
  submitKey: ChatSubmitKey;
  /** Thinking and tool calls inline in the transcript (else only in the work panel) */
  showSteps: boolean;
  onToggleSteps: () => void;
  onFocus: () => void;
  /** Closes the pane, exactly like closing its terminal */
  onClose: () => void;
  onMaximize?: () => void;
  /** Back to the terminal view of the same process */
  onShowTerminal: () => void;
  headerProps?: React.HTMLAttributes<HTMLDivElement>;
  /** Host buttons before the pane's own actions (`host.renderPaneActions`) */
  hostActions?: React.ReactNode;
  /** Host view over the chat body (`host.renderPaneView`) */
  paneView?: React.ReactNode;
  /** Linked PRs, issues and running servers (same items as a terminal pane's header) */
  meta?: React.ReactNode;
}

/**
 * UI view of an agent pane (#189): renders the agent's transcript and types into the pane's
 * terminal. The terminal process is the agent; this view never starts or stops a process.
 */
export const ChatPane: React.FC<ChatPaneProps> = ({
  pane,
  agent,
  sessionId,
  active,
  focused,
  submitKey,
  showSteps,
  onToggleSteps,
  onFocus,
  onClose,
  onMaximize,
  onShowTerminal,
  headerProps,
  hostActions,
  paneView = null,
  meta,
}) => {
  const [state, dispatch] = useReducer(reducer, initialChatState);
  const { chat, uploads } = useTransport();
  const t = useLabels().terminal;
  const [chatId, setChatId] = useState<string | null>(null);
  // Bumped when the server forgot the view (restart, orphan timeout): opens it again
  const [generation, setGeneration] = useState(0);
  const [text, setText] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const lastScrollTop = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const connected = usePaneConnected(pane.id);
  const harness = sessionHarness(pane);
  const harnessName = harnessLabel(harness);
  // Threads of an orchestrator chat: a slice of this session, routed by tag (utils/chatThreads)
  const threads = useChatThreads(agent?.id);

  // The server view outlives this component (split remounts, view switches): with nobody
  // watching it stops itself after the orphan timeout, so a remount never races a stop
  useEffect(() => {
    if (!sessionId || !chat) return;
    let cancelled = false;
    chat
      .openTranscriptView(pane.id, { harness, sessionId, cwd: pane.cwd, name: pane.name })
      .then((view) => !cancelled && setChatId(view.id))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
      setChatId(null);
    };
    // the name only labels the view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat, pane.id, pane.cwd, harness, sessionId, generation]);

  useEffect(() => {
    if (!chatId || !chat) return;
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
  const restoreScroll = useRef<{ key: string; offset: number } | null>(null);
  const loadOlder = useCallback(() => {
    const older = state.older;
    const el = listRef.current;
    if (!chat || !chatId || !older?.more || loadingRef.current || !el) return;
    loadingRef.current = true;
    setLoadingOlder(true);
    chat
      .fetchChatHistory(chatId, older.before)
      .then((page) => {
        const top = el.getBoundingClientRect().top;
        const first = [...el.querySelectorAll<HTMLElement>('[data-chat-key]')].find(
          (m) => m.getBoundingClientRect().bottom > top
        );
        if (first?.dataset.chatKey)
          restoreScroll.current = {
            key: first.dataset.chatKey,
            offset: first.getBoundingClientRect().top - top,
          };
        dispatch({ type: 'older', page });
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => {
        loadingRef.current = false;
        setLoadingOlder(false);
      });
  }, [chat, chatId, state.older]);
  useLayoutEffect(() => {
    const el = listRef.current;
    const saved = restoreScroll.current;
    if (!el || !saved) return;
    restoreScroll.current = null;
    const anchor = el.querySelector<HTMLElement>(
      `[data-chat-key="${globalThis.CSS.escape(saved.key)}"]`
    );
    if (!anchor) return;
    // by the element, not the height: estimated heights (content-visibility) settle later
    el.scrollTop +=
      anchor.getBoundingClientRect().top - el.getBoundingClientRect().top - saved.offset;
    lastScrollTop.current = el.scrollTop;
  }, [state.messages]);
  // A short tail that does not fill the view cannot be scrolled: load on until it does
  useEffect(() => {
    const el = listRef.current;
    if (el && el.scrollHeight <= el.clientHeight + LOAD_OLDER_PX) loadOlder();
  }, [state.older, loadOlder]);
  useLayoutEffect(pinBottom, [state.messages, showSteps, pinBottom]);
  useEffect(() => {
    const content = contentRef.current;
    const list = listRef.current;
    if (!content || !list) return;
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

  const history = useMemo(
    () =>
      state.messages
        .filter((m): m is Extract<typeof m, { kind: 'user' }> => m.kind === 'user')
        .filter((m) => !agentMessage(m.text))
        .map((m) => splitImages(m.text).text)
        .filter(Boolean),
    [state.messages]
  );
  const turns = useMemo(
    () => state.messages.filter((m) => m.kind === 'result').length,
    [state.messages]
  );
  // One card per answer; regrouped per event, cards memoize on their messages
  const items = useMemo(() => groupAnswers(state.messages), [state.messages]);
  const [promptsOnly, togglePromptsOnly] = usePromptsOnly(sessionId);
  // Latest recap (Claude's away summary) stays pinned above the input instead of in the log
  const recap = useMemo(() => {
    for (let i = state.messages.length - 1; i >= 0; i--) {
      const m = state.messages[i];
      if (m.kind === 'recap') return m;
    }
    return null;
  }, [state.messages]);
  const threadList = threads.enabled ? threads.threads : NO_THREADS;
  const routed = useMemo(
    () =>
      routeThreads(
        items.filter((item) => item !== recap),
        threadList
      ),
    [items, recap, threadList]
  );
  const shown = useMemo(
    () =>
      promptsOnly
        ? routed.main.filter((item) => item.kind === 'user' && !agentMessage(item.text))
        : routed.main,
    [routed, promptsOnly]
  );
  const [quote, setQuote] = useState<ChatQuote | null>(null);
  const pending = useMemo(() => pendingPrompts(state), [state]);
  const starts = useMemo(() => initialPrompts(state.messages), [state.messages]);
  const [startsOpen, setStartsOpen] = useState(false);
  // Jump to a prompt; letting go of the bottom keeps late layout from pulling the list back down
  const jumpTo = (key: string) => {
    const target = listRef.current?.querySelector<HTMLElement>(`[data-chat-key="${key}"]`);
    if (!target) return;
    stickToBottom.current = false;
    target.scrollIntoView({ block: 'start' });
    // content-visibility renders the skipped messages above late: settle, then aim again
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    target.animate?.(
      [{ backgroundColor: 'rgba(59,130,246,0.25)' }, { backgroundColor: 'transparent' }],
      { duration: 1200 }
    );
  };
  const artifactKey = useMemo(
    () => artifactRefreshKey(state.messages, turns),
    [state.messages, turns]
  );
  const artifacts = useChatArtifacts(chatId, artifactKey);
  const [artifactsOpen, setArtifactsOpen] = useState(false);

  // Busy and questions come from the agent's state: a prompt is on its screen, not in its transcript.
  // The server derives `displayState` for every kind; a prompt to answer here needs `status: waiting`.
  const prompting =
    agent?.displayState === 'waiting' ||
    (agent?.displayState === 'needs-input' && agent?.status === 'waiting');
  const busy = agent?.displayState === 'working';
  // Back to idle: an echoed prompt still unlogged was withdrawn in the TUI (a few s for the poll)
  useEffect(() => {
    if (busy) return;
    const t = window.setTimeout(
      () => dispatch({ type: 'event', event: { type: 'devorbit_sent_clear' } }),
      3000
    );
    return () => window.clearTimeout(t);
  }, [busy]);
  // The agent's state only says it may wait; the box needs a dialog on its screen
  const panePrompt = usePanePrompt(pane.id, prompting);
  const screen = panePrompt?.screen ?? null;
  const suggestion = usePaneSuggestion(
    pane.id,
    harness === 'claude' && connected && !busy && !prompting
  );
  const prompt = screen ? screenPrompt(screen) : null;
  // A dialog the parser knows becomes a card; any other prompt stays the screen excerpt below
  const dialog = useMemo(
    () => (prompt ? parseAgentDialog(screen ?? '', panePrompt?.tab) : null),
    [prompt, screen, panePrompt?.tab]
  );
  const dialogId = dialog ? JSON.stringify(dialog) : null;
  const [sentFor, setSentFor] = useState<string | null>(null);
  useEffect(() => {
    if (!sentFor) return;
    const t = window.setTimeout(() => setSentFor(null), SENT_LOCK_MS);
    return () => window.clearTimeout(t);
  }, [sentFor]);
  const choices = prompt && !dialog ? extractNumberedChoices(prompt) : [];
  const notConnected = t.notConnected;

  // Model × effort of the running session: typed as its own commands, one after the other (a
  // second paste before the first Enter would land in the same line)
  const switchModel = (model: string, effort: string) => {
    if (harness !== 'claude' && harness !== 'omp') return;
    const [first, ...rest] = switchCommands(harness, model, effort);
    if (!first) return;
    if (!typeIntoPane(pane.id, first)) return setError(notConnected);
    rest.forEach((cmd, i) => window.setTimeout(() => typeIntoPane(pane.id, cmd), 600 * (i + 1)));
  };

  const answerPrompt = (answer: string) => {
    setError(pressKeys(pane.id, answer) ? null : notConnected);
  };

  // Keys go to what is on the screen now: the card may be a poll old, and a click on "Yes"
  // must not approve a different command
  const answerDialog = (answer: DialogAnswer) => {
    const now = parseAgentDialog(paneScreen(pane.id, PROMPT_LINES), paneActiveTab(pane.id));
    if (!now || JSON.stringify(now) !== dialogId) return setError(t.questionChanged);
    if (!pressKeys(pane.id, dialogKeys(now, answer))) return setError(notConnected);
    setError(null);
    // moving between tabs answers nothing: the card stays usable on the step it lands on
    if (answer.type !== 'tab' && answer.type !== 'step') setSentFor(dialogId);
  };

  // `head`: thread tag line and reply quote, in front of what the user typed
  const sendPrompt = async (head: string, body: string, files: File[]): Promise<boolean> => {
    setError(null);
    try {
      const stored = uploads
        ? await Promise.all(files.map((file) => uploads.uploadAttachment(file)))
        : [];
      const prompt = head + promptWithAttachments(body, stored);
      if (!typeIntoPane(pane.id, prompt)) {
        setError(notConnected);
        return false;
      }
      // Claude logs a typed prompt at once (or as queued); others only once the agent takes it.
      // Commands never show up as a user turn.
      if (harness !== 'claude' && !prompt.trimStart().startsWith('/'))
        dispatch({ type: 'event', event: { type: 'devorbit_sent', text: prompt } });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t.sendingFailed);
      return false;
    }
  };

  const submit = async () => {
    if (sending || !connected || (!text.trim() && images.length === 0)) return;
    setSending(true);
    try {
      if (await sendPrompt(quote ? quoteHeader(quote.ts, quote.text) : '', text, images)) {
        setText('');
        setImages([]);
        setQuote(null);
        stickToBottom.current = true;
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const [threadsOpen, setThreadsOpen] = useState(() => readFlag(THREADS_OPEN_KEY, true));
  // Per pane and page: a split maximises only its own threads
  const [threadsMaxed, setThreadsMaxed] = useState(false);
  const showThreadsPanel = (open: boolean) => {
    setThreadsOpen(open);
    if (!open) setThreadsMaxed(false);
    try {
      localStorage.setItem(THREADS_OPEN_KEY, open ? '1' : '0');
    } catch {
      // not remembered
    }
  };
  const [threadsWidth, setThreadsWidth] = useStoredWidth(
    THREADS_WIDTH_KEY,
    THREADS_WIDTH,
    THREADS_FLOOR,
    THREADS_MAX
  );
  // The panel takes at most 60 % of the pane (splits are narrow): the handle starts from the width
  // on screen, else a drag from a stored 420 behind a 281 cap shows no movement
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowWidth, setRowWidth] = useState(0);
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const observer = new ResizeObserver(() => setRowWidth(row.clientWidth));
    observer.observe(row);
    setRowWidth(row.clientWidth);
    return () => observer.disconnect();
  }, []);
  const threadsMax = rowWidth ? Math.min(THREADS_MAX, Math.floor(rowWidth * 0.6)) : THREADS_MAX;
  // Narrow panes (splits): 260-640 at most 60 % would leave no travel, so the floor drops to 40 %
  const threadsMin = rowWidth ? Math.min(THREADS_MIN, Math.floor(rowWidth * 0.4)) : THREADS_MIN;
  const threadsShown = clampWidth(threadsWidth, threadsMin, threadsMax);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [threadQuote, setThreadQuote] = useState<ChatQuote | null>(null);
  const showThreads = threads.enabled && threadsOpen;
  // A question of the agent needs the main chat: it shows again until answered
  const threadsFull = showThreads && threadsMaxed && !dialog && prompt === null;
  const maximizeThreads = (on: boolean) => {
    if (on) showThreadsPanel(true);
    setThreadsMaxed(on);
  };
  const openThreadIn = (id: string | null) => {
    setOpenThreadId(id);
    setThreadQuote(null);
    if (id) showThreadsPanel(true);
  };
  const openThread = threads.threads.find((x) => x.id === openThreadId) ?? null;
  const openFromAnswer = async (answer: ChatAnswer) => {
    const ts = answer.parts[0]?.ts ?? Date.now();
    try {
      const made = await threads.create({
        name: { project: `Answer ${hhmm(ts)}`, task: firstWords(answerText(answer)) || 'Thread' },
        parentKey: answer.key,
      });
      openThreadIn(made.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.threadsFailed);
    }
  };
  const sendInThread = async (body: string, files: File[]) => {
    let thread = openThread;
    if (!thread) {
      // a thread without a task is named after its first message
      try {
        thread = await threads.create({
          name: { project: `Thread ${hhmm(Date.now())}`, task: firstWords(body) || 'Thread' },
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : t.threadsFailed);
        return false;
      }
      setOpenThreadId(thread.id);
    }
    const quoted = threadQuote ? quoteHeader(threadQuote.ts, threadQuote.text) : '';
    const sent = await sendPrompt(`${thread.tag}\n${quoted}`, body, files);
    if (sent) setThreadQuote(null);
    return sent;
  };
  const unreadTotal = threadList.reduce(
    (n, x) => n + (x.closed ? 0 : unreadCount(routed.byThread.get(x.id) ?? NO_ITEMS, x.readAt)),
    0
  );
  const threadItems = openThread ? (routed.byThread.get(openThread.id) ?? NO_ITEMS) : NO_ITEMS;
  const threadHistory = useMemo(
    () =>
      threadItems
        .filter((i): i is Extract<ChatItem, { kind: 'user' }> => i.kind === 'user')
        .map((i) => {
          const text = openThread ? stripTag(i.text, openThread.tag) : i.text;
          return splitImages(parseQuote(text)?.body ?? text).text;
        })
        .filter(Boolean),
    [threadItems, openThread]
  );
  // The running turn: its answer (or the working card) shows where its last item went
  const lastItem = items.at(-1);
  const lastThread = lastItem
    ? ([...routed.byThread].find(([, xs]) => xs.at(-1) === lastItem)?.[0] ?? null)
    : null;
  const isLive = (item: ChatItem) => busy && item.kind === 'answer' && item === lastItem;
  const workingCard = busy && pending.length === 0 && lastItem?.kind === 'user';
  // Read what the open thread shows, while the pane is on screen
  const { update: updateThread } = threads;
  useEffect(() => {
    if (!openThread || !showThreads || !active) return;
    const latest = Math.max(0, ...threadItems.map((i) => itemTime(i) ?? 0));
    if (latest > openThread.readAt)
      void updateThread(openThread.id, { readAt: latest }).catch(() => {});
  }, [openThread, threadItems, showThreads, active, updateThread]);
  // The open thread's messages may lie before the loaded tail: load pages back to its start
  const earliest = useMemo(() => {
    for (const m of state.messages)
      if ((m.kind === 'user' || m.kind === 'assistant') && m.ts) return m.ts;
    return undefined;
  }, [state.messages]);
  const needsOlder =
    !!openThread &&
    !!state.older?.more &&
    earliest !== undefined &&
    earliest > openThread.createdAt;
  useEffect(() => {
    if (needsOlder) loadOlder();
  }, [needsOlder, loadOlder]);
  const replies = useMemo<ChatReplies>(
    () => ({ reply: setQuote, openThread: threads.enabled ? openFromAnswer : undefined }),
    // openFromAnswer reads only stable setters and the create call
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threads.enabled, threads.create]
  );
  const threadReplies = useMemo<ChatReplies>(
    () => ({ reply: setThreadQuote, tag: openThread?.tag ?? null }),
    [openThread?.tag]
  );
  const threadListRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = threadListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [threadItems, openThreadId]);
  useEffect(() => {
    if (quote) inputRef.current?.focus();
  }, [quote]);

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

  const view = (
    <div
      className={`flex flex-col h-full min-h-0 bg-gray-950 border rounded-lg overflow-hidden ${
        focused
          ? 'border-blue-300 ring-2 ring-blue-300/70'
          : active
            ? 'border-blue-400/40'
            : 'border-gray-800'
      }`}
      onMouseDown={onFocus}
      data-agent-pane={pane.id}
      data-chat-pane
      data-pane-active={active}
      onKeyDown={(e) => {
        if (threads.enabled && isThreadsMaxKey(e)) {
          e.preventDefault();
          maximizeThreads(!threadsFull);
        } else if (e.key === 'Escape' && threadsFull && !e.defaultPrevented) {
          e.preventDefault();
          setThreadsMaxed(false);
        }
      }}
      {...(uploads &&
        imageDropHandlers(
          (files) => setImages((prev) => [...prev, ...files]),
          (list) => attachableFiles(list, uploads.attachmentExtensions)
        ))}
    >
      <div
        {...headerProps}
        className={`flex flex-nowrap items-center gap-x-1.5 h-8 px-2 border-b text-xs shrink-0 bg-gray-900 border-gray-800 ${
          headerProps?.draggable ? 'cursor-grab active:cursor-grabbing' : ''
        } ${headerProps?.className ?? ''}`}
      >
        <MessageSquare size={13} aria-hidden className="text-blue-300 shrink-0" />
        <span className="font-medium text-gray-200 truncate min-w-0">{pane.name}</span>
        {harness !== 'claude' && (
          <span className="shrink-0 px-1 rounded border border-gray-700 text-[10px] text-gray-400">
            {harnessName}
          </span>
        )}
        <span className="text-gray-500 font-mono truncate min-w-0 hidden lg:inline">
          {pane.cwd}
        </span>
        {state.model && (
          <span className="text-gray-500 truncate min-w-0 hidden sm:inline">{state.model}</span>
        )}
        <span
          className={`shrink-0 ${prompting || !connected ? 'text-amber-300' : busy ? 'text-blue-300' : 'text-gray-500'}`}
        >
          {status}
        </span>
        {!connected && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              if (!reattachPane(pane.id)) setError(t.noTerminalToReattach);
            }}
            className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-amber-100 bg-amber-500/15 border border-amber-400/40 hover:bg-amber-500/25 focus-visible:outline-2 focus-visible:outline-blue-400"
            title={t.reattachTitle}
          >
            <RefreshCw size={11} aria-hidden />
            {t.reattach}
          </button>
        )}
        {meta && (
          <div className="flex items-center gap-x-2 min-w-0 overflow-hidden text-[11px] text-gray-400">
            {meta}
          </div>
        )}
        <span className="flex-1" />
        {hostActions}
        <button
          type="button"
          onClick={onToggleSteps}
          onMouseDown={keepFocus}
          className={`${iconBtn} ${showSteps ? 'text-blue-300' : ''}`}
          title={showSteps ? t.hideStepsTitle : t.showStepsTitle}
          aria-label={t.showSteps}
          aria-pressed={showSteps}
        >
          <ListTree size={13} />
        </button>
        <button
          type="button"
          onClick={togglePromptsOnly}
          onMouseDown={keepFocus}
          disabled={!sessionId}
          className={`${iconBtn} ${promptsOnly ? 'text-blue-300' : ''}`}
          title={promptsOnly ? t.showAnswersTitle : t.promptsOnlyTitle}
          aria-label={t.promptsOnly}
          aria-pressed={promptsOnly}
        >
          <MessagesSquare size={13} />
        </button>
        {threads.enabled && (
          <button
            type="button"
            onClick={() => showThreadsPanel(!threadsOpen)}
            onMouseDown={keepFocus}
            className={`${iconBtn} relative ${threadsOpen ? 'text-blue-300' : ''}`}
            title={threadsOpen ? t.hideThreads : t.showThreads}
            aria-label={t.threads}
            aria-pressed={threadsOpen}
          >
            <PanelRight size={13} />
            {unreadTotal > 0 && !threadsOpen && (
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-blue-400" />
            )}
          </button>
        )}
        {busy && connected && (
          <button
            type="button"
            onClick={stopTurn}
            onMouseDown={keepFocus}
            className={iconBtn}
            title={t.stopTurnTitle}
            aria-label={t.stopTurn}
          >
            <Square size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={onShowTerminal}
          onMouseDown={keepFocus}
          className={iconBtn}
          title={t.terminalViewTitle}
          aria-label={t.terminalView}
        >
          <SquareTerminal size={14} />
        </button>
        {onMaximize && (
          <button
            type="button"
            onClick={onMaximize}
            onMouseDown={keepFocus}
            className={iconBtn}
            title={t.ownTab}
            aria-label={t.moveToItsOwnTab}
          >
            <Maximize2 size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          onMouseDown={keepFocus}
          className={iconBtn}
          title={t.closeAgentTitle}
          aria-label={t.closeNamed(pane.name)}
        >
          <X size={14} />
        </button>
      </div>

      <div ref={rowRef} className="flex-1 min-h-0 flex">
        {/* hidden, not unmounted: draft, scroll position and the live stream stay */}
        <div
          className={`relative flex-1 min-w-0 min-h-0 flex flex-col ${threadsFull ? 'hidden' : ''}`}
        >
          {paneView !== null && paneView !== false && (
            <div data-pane-view className="absolute inset-0 z-20 flex flex-col bg-gray-950">
              {paneView}
            </div>
          )}
          {starts.length > 0 && (
            <div className="shrink-0 border-b border-gray-800 bg-gray-900/60 text-xs">
              <button
                type="button"
                onClick={() => setStartsOpen((o) => !o)}
                className="flex w-full items-center gap-1 px-3 py-1 text-gray-400 hover:text-gray-200"
                aria-expanded={startsOpen}
                data-chat-starts
              >
                <ChevronRight
                  size={12}
                  aria-hidden
                  className={`transition-transform ${startsOpen ? 'rotate-90' : ''}`}
                />
                {t.startPrompts(starts.length)}
                <span className="text-gray-600">{t.startPromptsHint}</span>
              </button>
              {startsOpen && (
                <ol className="max-h-40 overflow-y-auto pb-1">
                  {starts.map((m, i) => (
                    <li key={m.key}>
                      <button
                        type="button"
                        onClick={() => jumpTo(m.key)}
                        className="block w-full truncate px-3 py-0.5 pl-7 text-left text-gray-300 hover:bg-gray-800 hover:text-white"
                        title={m.text}
                      >
                        <span className="mr-1.5 text-gray-600">{i + 1}.</span>
                        {splitImages(m.text).text || m.text}
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          <div
            ref={listRef}
            role="log"
            aria-label={t.chatLog(pane.name)}
            className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-2"
            onScroll={(e) => {
              const el = e.currentTarget;
              const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
              // Only a scroll up by the user lets go; layout shifts never do
              if (nearBottom) stickToBottom.current = true;
              else if (el.scrollTop < lastScrollTop.current - 2) stickToBottom.current = false;
              lastScrollTop.current = el.scrollTop;
              if (el.scrollTop < LOAD_OLDER_PX) loadOlder();
            }}
          >
            <div ref={contentRef}>
              {state.older?.more && (
                <div className="flex justify-center py-2" role="status">
                  {loadingOlder ? (
                    <span className="text-xs text-gray-500">{t.loadingEarlier}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={loadOlder}
                      className="text-xs text-gray-400 hover:text-gray-200 underline-offset-2 hover:underline"
                    >
                      {t.loadEarlier}
                    </button>
                  )}
                </div>
              )}
              {state.messages.length === 0 && (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">
                  {sessionId
                    ? t.emptyChat(harnessName, !!uploads)
                    : t.waitingForSession(harnessName)}
                </div>
              )}
              <ChatFileContext.Provider value={pane.cwd}>
                <ChatRepliesContext.Provider value={replies}>
                  {shown.map((item) => {
                    if (item.kind === 'thread') {
                      const thread = threadList.find((x) => x.id === item.threadId);
                      return thread ? (
                        <ThreadMarkerRow
                          key={item.key}
                          thread={thread}
                          items={routed.byThread.get(thread.id) ?? NO_ITEMS}
                          onOpen={() => openThreadIn(thread.id)}
                        />
                      ) : null;
                    }
                    return (
                      // content-visibility keeps long chats (hundreds of messages) cheap to scroll
                      <div
                        key={item.key}
                        data-chat-key={item.key}
                        className="[content-visibility:auto] [contain-intrinsic-size:auto_60px]"
                      >
                        <ChatItemView
                          item={item}
                          showSteps={showSteps}
                          live={isLive(item)}
                          harness={harnessName}
                          model={state.model}
                        />
                      </div>
                    );
                  })}
                </ChatRepliesContext.Provider>
                {pending.map((p, i) => (
                  <UserMessage key={`q${i}`} text={p} queued />
                ))}
                {workingCard && !promptsOnly && !lastThread && (
                  <ChatItemView
                    item={null}
                    showSteps={showSteps}
                    live
                    harness={harnessName}
                    model={state.model}
                  />
                )}
              </ChatFileContext.Provider>
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-800 p-2">
            {recap && (
              <section
                aria-label={t.recap}
                data-chat-recap
                className="mb-2 flex gap-2 rounded-md border border-gray-700/70 bg-gray-900/70 px-3 py-2 text-sm text-gray-300"
              >
                <History size={14} aria-hidden className="mt-0.5 shrink-0 text-gray-500" />
                <p className="max-h-24 min-w-0 overflow-y-auto whitespace-pre-wrap">
                  <span className="text-gray-500">{t.recapPrefix}</span>
                  {recap.text}
                </p>
              </section>
            )}
            {dialog && (
              <QuestionCard
                dialog={dialog}
                sent={sentFor === dialogId}
                disabled={!connected}
                onAnswer={answerDialog}
              />
            )}
            {prompt !== null && !dialog && (
              <div
                role="status"
                className="mb-2 rounded-md border border-amber-400/40 bg-amber-500/10 p-2"
              >
                <div className="text-xs font-medium text-amber-200">{t.agentAskingPrompt}</div>
                <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-gray-200 font-mono">
                  {prompt}
                </pre>
                {choices.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {choices.map((c) => (
                      <button
                        key={c.number}
                        type="button"
                        disabled={!connected}
                        onClick={() => answerPrompt(String(c.number))}
                        className="rounded border border-amber-400/40 bg-gray-900 px-2 py-1 text-xs text-gray-100 hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50"
                      >
                        {c.number}. {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {chatId && (
              <ChatActivity
                chatId={chatId}
                messages={state.messages}
                sub={state.sub}
                busy={busy}
                endedTasks={state.endedTasks}
              />
            )}
            {error && (
              <div role="alert" className="mb-1 text-xs text-red-300">
                {error}
              </div>
            )}
            {quote && <QuoteChip quote={quote} onRemove={() => setQuote(null)} />}
            <div className="flex items-end gap-2">
              <ChatComposer
                chatId={chatId}
                value={text}
                onChange={setText}
                onSubmit={submit}
                onStop={stopTurn}
                busy={busy}
                disabled={!connected}
                submitKey={submitKey}
                history={history}
                commands={state.commands}
                agents={state.agents}
                suggestion={suggestion?.text}
                suggestionCut={suggestion?.truncated}
                takeSuggestion={() => takePaneSuggestion(pane.id)}
                inputRef={inputRef}
              />
              <button
                type="button"
                onClick={submit}
                disabled={sending || !connected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
                aria-label={t.sendMessage}
              >
                <Send size={13} aria-hidden />
                <span className="hidden sm:inline">{t.send}</span>
              </button>
            </div>
            {uploads && (
              <ImageAttachments
                images={images}
                onChange={setImages}
                disabled={sending || !connected}
                files={uploads.attachmentExtensions}
              />
            )}
            {chatId && (
              <div className="flex items-end gap-3">
                <div className="flex-1 min-w-0">
                  <ChatStatusLine
                    chatId={chatId}
                    turns={turns}
                    visible={active}
                    picker={
                      (harness === 'claude' || harness === 'omp') && (
                        <ModelEffortPicker
                          harness={harness}
                          model=""
                          effort=""
                          keepLabel={t.keepCurrent}
                          currentModel={state.model}
                          currentEffort={state.effort}
                          placement="up"
                          disabled={busy || !connected}
                          onPick={switchModel}
                          title={
                            busy
                              ? t.switchModelBusy
                              : t.switchModel(
                                  harness === 'omp' ? '/switch, /effort' : '/model, /effort'
                                )
                          }
                        />
                      )
                    }
                  />
                </div>
                <div className="mt-2">
                  <ChatArtifactsButton
                    artifacts={artifacts}
                    onOpen={() => setArtifactsOpen(true)}
                  />
                </div>
              </div>
            )}
            {chatId && artifactsOpen && (
              <ChatArtifactsModal
                chatId={chatId}
                cwd={pane.cwd}
                title={pane.name}
                artifacts={artifacts}
                onClose={() => setArtifactsOpen(false)}
              />
            )}
          </div>
        </div>
        {showThreads && (
          <>
            {!threadsFull && (
              <ResizeHandle
                width={threadsShown}
                min={threadsMin}
                max={threadsMax}
                onChange={setThreadsWidth}
                onReset={() => setThreadsWidth(THREADS_WIDTH)}
                edge="left"
                label={t.resizeThreads}
              />
            )}
            <aside
              aria-label={t.threads}
              style={threadsFull ? undefined : { width: threadsShown }}
              className={
                threadsFull
                  ? 'min-h-0 min-w-0 flex-1'
                  : 'min-h-0 max-w-[60%] shrink-0 border-l border-gray-800'
              }
            >
              <ThreadsPanel
                status={threads.status}
                threads={threadList}
                tasks={threads.tasks}
                byThread={routed.byThread}
                openId={openThreadId}
                onOpen={openThreadIn}
                onRetry={() => threads.reload()}
                onNewTask={(task) =>
                  threads
                    .create({ task })
                    .then((made) => openThreadIn(made.id))
                    .catch((e: Error) => setError(e.message))
                }
                onNewFree={() => openThreadIn(DRAFT_THREAD)}
                onClose={(id, closed) =>
                  threads.update(id, { closed }).catch((e: Error) => setError(e.message))
                }
                maximized={threadsFull}
                onMaximize={maximizeThreads}
                renderThread={(thread) => {
                  const parent = thread?.parentKey
                    ? items.find((i) => i.key === thread.parentKey)
                    : undefined;
                  return (
                    <>
                      <div ref={threadListRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-1">
                        {needsOlder && (
                          <div role="status" className="py-2 text-center text-xs text-gray-500">
                            {t.loadingThreadHistory}
                          </div>
                        )}
                        {parent && (
                          <div className="opacity-70" data-thread-parent>
                            <ChatItemView
                              item={parent}
                              showSteps={false}
                              harness={harnessName}
                              model={state.model}
                            />
                          </div>
                        )}
                        <ChatFileContext.Provider value={pane.cwd}>
                          <ChatRepliesContext.Provider value={threadReplies}>
                            {threadItems.map((item) => (
                              <ChatItemView
                                key={item.key}
                                item={item}
                                showSteps={showSteps}
                                live={isLive(item)}
                                harness={harnessName}
                                model={state.model}
                              />
                            ))}
                            {workingCard && thread && lastThread === thread.id && (
                              <ChatItemView
                                item={null}
                                showSteps={showSteps}
                                live
                                harness={harnessName}
                                model={state.model}
                              />
                            )}
                          </ChatRepliesContext.Provider>
                        </ChatFileContext.Provider>
                        {thread && threadItems.length === 0 && !parent && (
                          <p className="py-3 text-xs text-gray-500">
                            {t.firstThreadMessage(thread.tag)}
                          </p>
                        )}
                        {!thread && (
                          <p className="py-3 text-xs text-gray-500">{t.threadWithoutTaskHint}</p>
                        )}
                      </div>
                      <div className="shrink-0 px-2 pb-1 text-[11px] text-gray-500">
                        <span className="truncate">
                          {thread?.binding ? t.boundTo(thread.repo ?? null) : t.notBound}
                        </span>
                      </div>
                      {threadsFull && error && (
                        <div role="alert" className="px-2 pb-1 text-xs text-red-300">
                          {error}
                        </div>
                      )}
                      <ThreadComposer
                        chatId={chatId}
                        submitKey={submitKey}
                        history={threadHistory}
                        agents={state.agents}
                        quote={threadQuote}
                        onClearQuote={() => setThreadQuote(null)}
                        onSend={sendInThread}
                        disabled={!connected}
                        focusKey={`${openThreadId}:${threadsFull}`}
                      />
                    </>
                  );
                }}
              />
            </aside>
          </>
        )}
      </div>
    </div>
  );
  // tool results load their images from this chat
  return <ChatIdContext.Provider value={chatId}>{view}</ChatIdContext.Provider>;
};
