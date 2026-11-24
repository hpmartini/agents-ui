import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  ChevronRight,
  ChevronUp,
  FolderGit2,
  Loader2,
  Expand,
  MessagesSquare,
  Shrink,
  PanelLeft,
  Plus,
  Quote,
  RotateCcw,
  X,
} from 'lucide-react';
import { useTransport } from '../../../host';
import { useLabels } from '../../../labels';
import type { ChatThreadList, ChatThreadTask } from '../../../transport';
import {
  agentMessage,
  type ChatCommand,
  type ChatItem,
  type ChatSubmitKey,
} from '../../../utils/chatEvents';
import { splitImages } from '../../../utils/chatComposer';
import { attachableFiles } from '../../../utils/composer';
import {
  answerText,
  hhmm,
  itemTime,
  stripTag,
  unreadCount,
  type ChatThread,
} from '../../../utils/chatThreads';
import { isMac } from '../../../utils/platform';
import { ImageAttachments, imageDropHandlers } from '../../ImageAttachments';
import type { ChatQuote } from './ChatMessages';
import { ChatComposer } from './ChatComposer';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-blue-400';
const smallBtn = `inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] text-gray-400 hover:bg-gray-800 hover:text-white ${focusRing}`;
// Threads made elsewhere (Instruct on a status card) and report changes show up within this
const POLL_MS = 15_000;

export type ThreadsStatus = 'loading' | 'ready' | 'error';

/** Threads of the pane's session from the host; `orchestrator` null: no threads for it */
export function useChatThreads(session: string | null | undefined) {
  const api = useTransport().threads;
  const [list, setList] = useState<ChatThreadList | null>(null);
  const [status, setStatus] = useState<ThreadsStatus>('loading');
  // no orchestrator: nothing to poll for
  const noThreads = useRef(false);
  const load = useCallback(
    (quiet = false) => {
      if (!api || !session || noThreads.current) return;
      if (!quiet) setStatus('loading');
      api
        .fetchThreads(session)
        .then((l) => {
          noThreads.current = !l.orchestrator;
          setList(l);
          setStatus('ready');
        })
        // the last list stays known: the panel shows the error and recovers on the next poll
        .catch(() => setStatus('error'));
    },
    [api, session]
  );
  useEffect(() => {
    noThreads.current = false;
    setList(null);
    if (!api || !session) return;
    load();
    const t = window.setInterval(() => load(true), POLL_MS);
    return () => window.clearInterval(t);
  }, [api, session, load]);
  const put = useCallback(
    (thread: ChatThread) =>
      setList((l) =>
        l
          ? {
              ...l,
              threads: l.threads.some((t) => t.id === thread.id)
                ? l.threads.map((t) => (t.id === thread.id ? thread : t))
                : [...l.threads, thread],
            }
          : l
      ),
    []
  );
  const create = useCallback(
    async (body: Parameters<NonNullable<typeof api>['createThread']>[1]) => {
      if (!api || !session) throw new Error('no threads');
      const thread = await api.createThread(session, body);
      put(thread);
      return thread;
    },
    [api, session, put]
  );
  const update = useCallback(
    async (id: string, patch: { closed?: boolean; readAt?: number }) => {
      if (!api || !session) return;
      put(await api.updateThread(session, id, patch));
    },
    [api, session, put]
  );
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
export function firstWords(text: string, words = 6): string {
  const line = text
    .replace(/^#+\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  const cut = line.split(' ').slice(0, words).join(' ');
  return cut.length < line.length ? `${cut}…` : cut;
}

/** What a thread list row shows of an item */
function itemPreview(item: ChatItem, tag: string): string {
  if (item.kind === 'answer') return stripTag(answerText(item), tag);
  if (item.kind !== 'user') return '';
  const sent = agentMessage(item.text);
  return splitImages(stripTag(sent ? sent.body : item.text, tag)).text;
}

const lastTime = (thread: ChatThread, items: ChatItem[]) => {
  for (let i = items.length - 1; i >= 0; i--) {
    const ts = itemTime(items[i]);
    if (ts !== undefined) return ts;
  }
  return thread.createdAt;
};

const threadName = (t: ChatThread) => `${t.name.project} · ${t.name.task}`;

/** The quote a reply will carry, above a composer */
export const QuoteChip: React.FC<{ quote: ChatQuote; onRemove: () => void }> = ({
  quote,
  onRemove,
}) => {
  const t = useLabels().terminal;
  return (
    <div
      data-quote-chip
      className="mb-1.5 flex max-w-full min-w-0 items-start gap-1.5 rounded-md border border-blue-400/30 bg-blue-500/10 py-1 pl-2 pr-1 text-xs text-blue-100"
    >
      <Quote size={12} aria-hidden className="mt-0.5 shrink-0 text-blue-300" />
      <span className="min-w-0 flex-1">
        <span className="block text-blue-300">
          {quote.ts === undefined ? t.reply : t.replyTo(hhmm(quote.ts))}
        </span>
        <span className="line-clamp-2 whitespace-pre-wrap text-blue-100/85">{quote.text}</span>
      </span>
      <button
        type="button"
        aria-label={t.removeQuote}
        title={t.removeQuote}
        onClick={onRemove}
        className={`shrink-0 rounded p-0.5 text-blue-300 hover:bg-blue-500/20 hover:text-white ${focusRing}`}
      >
        <X size={12} aria-hidden />
      </button>
    </div>
  );
};

/** In the main chat where a thread starts: "3 replies in thread Shop · Checkout" */
export const ThreadMarkerRow: React.FC<{
  thread: ChatThread;
  items: ChatItem[];
  onOpen: () => void;
}> = ({ thread, items, onOpen }) => {
  const t = useLabels().terminal;
  const unread = unreadCount(items, thread.readAt);
  return (
    <button
      type="button"
      onClick={onOpen}
      data-thread-marker={thread.id}
      className={`-mt-1 mb-3 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-gray-800/70 ${focusRing}`}
    >
      <MessagesSquare size={13} aria-hidden className="shrink-0 text-blue-300" />
      <span className="shrink-0 whitespace-nowrap font-medium text-blue-300">
        {t.threadReplies(items.length)}
      </span>
      <span className="min-w-0 truncate text-gray-400">
        {t.inThread} <span className="text-gray-200">{threadName(thread)}</span>
      </span>
      {unread > 0 && (
        <span className="shrink-0 rounded-full bg-blue-500 px-1.5 text-[10px] font-semibold leading-4 text-white tabular-nums">
          {t.unreadNew(unread)}
        </span>
      )}
      <span className="ml-auto shrink-0 tabular-nums text-gray-500">
        {hhmm(lastTime(thread, items))}
      </span>
    </button>
  );
};

/** Below this height the panel shows list or open thread, not both */
const SHORT_PANEL = 520;
/**
 * The thread input beside its log: dragged at most 40 % of the chat pane's height, and in a short
 * (stacked) pane 40 % of the thread view, so header, log and Attach stay inside the panel
 */
const threadInputMax = (el: HTMLTextAreaElement) =>
  Math.min(
    (el.closest('[data-chat-pane]')?.clientHeight ?? window.innerHeight) * 0.4,
    (el.closest('section')?.clientHeight ?? window.innerHeight) * 0.4
  );
export const THREAD_COMPOSER_HEIGHT_KEY = 'devOrbitChatThreadComposerHeight';

/**
 * Composer of the open thread: the main chat's composer (send key from the settings, height grip,
 * `@` files) plus quote, images and files. `/` commands are left out: the tag line in front
 * would turn them into plain text.
 */
export const ThreadComposer: React.FC<{
  chatId: string | null;
  submitKey: ChatSubmitKey;
  /** The thread's sent messages, oldest first (Arrow up walks them) */
  history: string[];
  agents: { name: string; description: string }[];
  quote: ChatQuote | null;
  onClearQuote: () => void;
  onSend: (text: string, files: File[]) => Promise<boolean>;
  disabled?: boolean;
  /** Focus the input when this changes (thread opened, quote added, panel maximised) */
  focusKey?: unknown;
}> = ({ chatId, submitKey, history, agents, quote, onClearQuote, onSend, disabled, focusKey }) => {
  const t = useLabels().terminal;
  const uploads = useTransport().uploads;
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, [focusKey, quote]);
  const empty = !text.trim() && files.length === 0;
  const send = async () => {
    if (empty || sending || disabled) return;
    setSending(true);
    try {
      if (await onSend(text.trim(), files)) {
        setText('');
        setFiles([]);
      }
    } finally {
      setSending(false);
      input.current?.focus();
    }
  };
  return (
    <div
      className="shrink-0 border-t border-gray-800 p-2"
      onKeyDown={(e) => {
        // after the composer: an Esc that closed its picker is taken already
        if (e.key === 'Escape' && !e.defaultPrevented && quote) {
          e.preventDefault();
          onClearQuote();
        }
      }}
      {...(uploads &&
        imageDropHandlers(
          (picked) => setFiles((prev) => [...prev, ...picked]),
          (list) => attachableFiles(list, uploads.attachmentExtensions)
        ))}
    >
      {quote && <QuoteChip quote={quote} onRemove={onClearQuote} />}
      <div className="flex items-end gap-1.5">
        <ChatComposer
          chatId={chatId}
          value={text}
          onChange={setText}
          onSubmit={() => void send()}
          onStop={noop}
          busy={false}
          disabled={!!disabled}
          submitKey={submitKey}
          history={history}
          commands={NO_COMMANDS}
          agents={agents}
          inputRef={input}
          label={t.replyInThread}
          placeholders={{ enter: t.threadPlaceholderEnter, modEnter: t.threadPlaceholderModEnter }}
          heightKey={THREAD_COMPOSER_HEIGHT_KEY}
          pinMax={threadInputMax}
        />
        <button
          type="button"
          aria-label={t.sendMessage}
          title={t.sendMessage}
          onClick={() => void send()}
          disabled={empty || sending || disabled}
          className={`mb-0.5 rounded-md bg-blue-600 p-1.5 text-white hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 ${focusRing}`}
        >
          {sending ? (
            <Loader2 size={15} aria-hidden className="animate-spin motion-reduce:animate-none" />
          ) : (
            <ArrowUp size={15} aria-hidden />
          )}
        </button>
      </div>
      {uploads && (
        <ImageAttachments
          images={files}
          onChange={setFiles}
          disabled={sending || disabled}
          files={uploads.attachmentExtensions}
        />
      )}
    </div>
  );
};

const noop = () => {};
const NO_COMMANDS: ChatCommand[] = [];

const NewThreadMenu: React.FC<{
  tasks: ChatThreadTask[];
  onTask: (task: { project: string; task: string }) => void;
  onFree: () => void;
  onDismiss: () => void;
}> = ({ tasks, onTask, onFree, onDismiss }) => {
  const t = useLabels().terminal;
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const away = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node)) onDismiss();
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [onDismiss]);
  const projects = [...new Set(tasks.map((x) => x.project))];
  const item = `block w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-blue-500/20 focus:bg-blue-500/20 focus:outline-none`;
  return (
    <div
      ref={menu}
      role="menu"
      aria-label={t.newThread}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          // taken: the maximised panel must not restore on the same key
          e.preventDefault();
          return onDismiss();
        }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
        const i = items.indexOf(document.activeElement as HTMLElement);
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
      }}
      className="absolute right-2 top-8 z-30 max-h-[70%] w-72 max-w-[calc(100%-1rem)] overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl shadow-black/40"
    >
      <div className="px-3 pb-1 pt-1.5 text-[11px] text-gray-500">
        {tasks.length ? t.bindToTask : t.noReportTasks}
      </div>
      {projects.map((id) => {
        const of = tasks.filter((x) => x.project === id);
        return (
          <div key={id}>
            <div className="flex items-center gap-1.5 px-3 pt-1.5 text-[11px] font-medium text-gray-400">
              <FolderGit2 size={11} aria-hidden className="shrink-0" />
              <span className="shrink-0 whitespace-nowrap">{of[0].projectName}</span>
              {of[0].repo && (
                <span className="truncate font-normal text-gray-500">{of[0].repo}</span>
              )}
            </div>
            {of.map((task) => (
              <button
                key={task.task}
                role="menuitem"
                type="button"
                tabIndex={-1}
                onClick={() => onTask({ project: task.project, task: task.task })}
                className={item}
              >
                {task.title}
                {task.state && (
                  <span className="block truncate text-[11px] text-gray-500">{task.state}</span>
                )}
              </button>
            ))}
          </div>
        );
      })}
      <div className="mt-1 border-t border-gray-800 pt-1">
        <button role="menuitem" type="button" tabIndex={-1} onClick={onFree} className={item}>
          {t.threadWithoutTask}
          <span className="block text-[11px] text-gray-500">{t.threadWithoutTaskHint}</span>
        </button>
      </div>
    </div>
  );
};

const ThreadListRow: React.FC<{
  thread: ChatThread;
  items: ChatItem[];
  open: boolean;
  onOpen: () => void;
}> = ({ thread, items, open, onOpen }) => {
  const t = useLabels().terminal;
  const unread = unreadCount(items, thread.readAt);
  const first = items.map((i) => itemPreview(i, thread.tag)).find(Boolean);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-current={open || undefined}
        data-thread-row={thread.id}
        className={`block w-full border-l-2 px-3 py-2 text-left ${focusRing} ${
          open ? 'border-blue-400 bg-blue-500/10' : 'border-transparent hover:bg-gray-800/60'
        }`}
      >
        <span className="flex items-center gap-1.5 text-sm">
          <span
            className={`min-w-0 truncate ${unread ? 'font-semibold text-white' : 'text-gray-200'}`}
          >
            {threadName(thread)}
          </span>
          {unread > 0 && (
            <span
              className="shrink-0 rounded-full bg-blue-500 px-1.5 text-[10px] font-semibold leading-4 text-white tabular-nums"
              title={t.unreadCount(unread)}
            >
              {t.unreadNew(unread)}
            </span>
          )}
          <span className="ml-auto shrink-0 text-[11px] tabular-nums text-gray-500">
            {hhmm(lastTime(thread, items))}
          </span>
        </span>
        {(thread.repo || !thread.binding) && (
          <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-gray-500">
            <FolderGit2 size={10} aria-hidden className="shrink-0" />
            <span className="truncate">{thread.repo ?? t.notBound}</span>
          </span>
        )}
        {thread.summary && (
          <span className="mt-0.5 block truncate text-xs text-gray-400">{thread.summary}</span>
        )}
        {first && <span className="mt-0.5 block truncate text-xs text-gray-500">{first}</span>}
      </button>
    </li>
  );
};

export interface ThreadsPanelProps {
  status: ThreadsStatus;
  threads: ChatThread[];
  tasks: ChatThreadTask[];
  byThread: Map<string, ChatItem[]>;
  /** Open thread id; `DRAFT_THREAD` for a thread without task before its first message */
  openId: string | null;
  onOpen: (id: string | null) => void;
  onRetry: () => void;
  onNewTask: (task: { project: string; task: string }) => void;
  onNewFree: () => void;
  onClose: (id: string, closed: boolean) => void;
  /** Messages and composer of the open thread (null: the draft) */
  renderThread: (thread: ChatThread | null) => React.ReactNode;
  /** Over the whole pane, the main chat hidden */
  maximized: boolean;
  onMaximize: (maximized: boolean) => void;
  /** Hide the whole panel (the pane header's threads button shows it again) */
  onHide: () => void;
}

export const THREADS_SIDEBAR_KEY = 'agents-ui:threads-sidebar';
/** Mod+Shift+M: maximise or restore the threads panel of the active pane */
export const isThreadsMaxKey = (e: {
  code: string;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}) => e.code === 'KeyM' && e.shiftKey && !e.altKey && (isMac ? e.metaKey : e.ctrlKey);
export const THREADS_MAX_SHORTCUT = isMac ? '⌘⇧M' : 'Ctrl+Shift+M';

export const DRAFT_THREAD = 'draft';

/** Right panel of an orchestrator chat: its threads, below them the open one */
export const ThreadsPanel: React.FC<ThreadsPanelProps> = ({
  status,
  threads,
  tasks,
  byThread,
  openId,
  onOpen,
  onRetry,
  onNewTask,
  onNewFree,
  onClose,
  renderThread,
  maximized,
  onMaximize,
  onHide,
}) => {
  const t = useLabels().terminal;
  const [menu, setMenu] = useState(false);
  const [sidebarPref, setSidebarPref] = useState(() => {
    try {
      return localStorage.getItem(THREADS_SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggleSidebar = () => {
    const next = !sidebarPref;
    setSidebarPref(next);
    try {
      localStorage.setItem(THREADS_SIDEBAR_KEY, next ? '1' : '0');
    } catch {
      // not remembered
    }
  };
  const sidebar = maximized && sidebarPref;
  const [closedOpen, setClosedOpen] = useState(false);
  const active = threads.filter((x) => !x.closed);
  const closed = threads.filter((x) => x.closed);
  const open = threads.find((x) => x.id === openId) ?? null;
  const draft = openId === DRAFT_THREAD;
  const dismissMenu = useCallback(() => setMenu(false), []);
  // A short panel (stacked split) has no room for list and thread: the open thread takes it,
  // "Back to the list" in its header brings the list back
  const rootRef = useRef<HTMLDivElement>(null);
  const [short, setShort] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setShort(el.clientHeight < SHORT_PANEL));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const unread = active.reduce((n, x) => n + unreadCount(byThread.get(x.id) ?? [], x.readAt), 0);

  return (
    <div
      ref={rootRef}
      className="relative flex h-full min-h-0 flex-col bg-gray-950"
      data-threads-panel
      data-threads-short={short || undefined}
      data-threads-maximized={maximized || undefined}
      onKeyDown={(e) => {
        // last in line: picker, quote and menu take their Esc first
        if (e.key === 'Escape' && maximized && !e.defaultPrevented) {
          e.preventDefault();
          onMaximize(false);
        }
      }}
    >
      <div
        data-testid="threads-header"
        className="flex h-8 shrink-0 items-center gap-1.5 border-b border-gray-800 px-2 text-xs"
      >
        <MessagesSquare size={13} aria-hidden className="shrink-0 text-blue-300" />
        <span className="font-medium text-gray-200">{t.threads}</span>
        {active.length > 0 && <span className="tabular-nums text-gray-500">{active.length}</span>}
        {unread > 0 && (
          <span
            className="shrink-0 rounded-full bg-blue-500 px-1.5 text-[10px] font-semibold leading-4 text-white tabular-nums"
            title={t.unreadCount(unread)}
          >
            {t.unreadNew(unread)}
          </span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-haspopup="menu"
          aria-expanded={menu}
          disabled={status !== 'ready'}
          className={`${smallBtn} disabled:opacity-50`}
        >
          <Plus size={12} aria-hidden />
          {t.newThread}
        </button>
        {maximized && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-pressed={sidebarPref}
            aria-label={t.threadsSidebar}
            title={t.threadsSidebar}
            className={`${smallBtn} px-1 ${sidebarPref ? 'text-blue-300' : ''}`}
          >
            <PanelLeft size={12} aria-hidden />
          </button>
        )}
        <button
          type="button"
          onClick={() => onMaximize(!maximized)}
          aria-pressed={maximized}
          aria-label={maximized ? t.restoreThreads : t.maximizeThreads}
          title={
            maximized
              ? t.restoreThreadsTitle(THREADS_MAX_SHORTCUT)
              : t.maximizeThreadsTitle(THREADS_MAX_SHORTCUT)
          }
          className={`${smallBtn} px-1 ${maximized ? 'text-blue-300' : ''}`}
        >
          {maximized ? <Shrink size={12} aria-hidden /> : <Expand size={12} aria-hidden />}
        </button>
        <button
          type="button"
          onClick={onHide}
          aria-label={t.hideThreadsPanel}
          title={t.hideThreadsPanel}
          className={`${smallBtn} px-1`}
        >
          <X size={12} aria-hidden />
        </button>
      </div>
      {menu && (
        <NewThreadMenu
          tasks={tasks}
          onDismiss={dismissMenu}
          onTask={(task) => {
            setMenu(false);
            onNewTask(task);
          }}
          onFree={() => {
            setMenu(false);
            onNewFree();
          }}
        />
      )}

      {status === 'loading' && (
        <div role="status" className="flex items-center gap-2 px-3 py-4 text-xs text-gray-500">
          <Loader2 size={13} aria-hidden className="animate-spin motion-reduce:animate-none" />
          {t.loadingThreads}
        </div>
      )}
      {status === 'error' && (
        <div
          role="alert"
          className="m-2 rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-xs"
        >
          <div className="font-medium text-red-200">{t.threadsFailed}</div>
          <div className="mt-0.5 text-red-200/70">{t.threadsFailedHint}</div>
          <button
            type="button"
            onClick={onRetry}
            className={`${smallBtn} mt-1.5 -ml-1.5 text-red-200`}
          >
            <RotateCcw size={11} aria-hidden />
            {t.tryAgain}
          </button>
        </div>
      )}
      {status === 'ready' && threads.length === 0 && !draft && (
        <div className="px-3 py-4 text-xs text-gray-500">
          <div className="font-medium text-gray-300">{t.noThreads}</div>
          <p className="mt-1">{t.noThreadsHint}</p>
        </div>
      )}
      <div
        data-threads-layout={sidebar ? 'sidebar' : 'top'}
        className={`flex min-h-0 flex-1 ${sidebar ? 'flex-row' : 'flex-col'}`}
      >
        {status === 'ready' && threads.length > 0 && !(short && (open || draft) && !sidebar) && (
          <div
            className={`shrink-0 overflow-y-auto border-gray-800 ${
              sidebar
                ? 'w-72 max-w-[40%] border-r'
                : `border-b ${openId ? 'max-h-[42%]' : 'flex-1'}`
            }`}
          >
            <ul className="py-1">
              {active.map((x) => (
                <ThreadListRow
                  key={x.id}
                  thread={x}
                  items={byThread.get(x.id) ?? []}
                  open={x.id === openId}
                  onOpen={() => onOpen(x.id === openId ? null : x.id)}
                />
              ))}
            </ul>
            {closed.length > 0 && (
              <div className="border-t border-gray-800/70 py-1 text-xs">
                <button
                  type="button"
                  onClick={() => setClosedOpen((o) => !o)}
                  aria-expanded={closedOpen}
                  className={`flex w-full items-center gap-1 px-3 py-1 text-gray-500 hover:text-gray-300 ${focusRing}`}
                >
                  <ChevronRight
                    size={12}
                    aria-hidden
                    className={`transition-transform motion-reduce:transition-none ${closedOpen ? 'rotate-90' : ''}`}
                  />
                  {t.closedThreads(closed.length)}
                </button>
                {closedOpen && (
                  <ul>
                    {closed.map((x) => (
                      <li key={x.id} className="flex items-center gap-2 px-3 py-1 pl-7">
                        <button
                          type="button"
                          onClick={() => onOpen(x.id)}
                          className={`min-w-0 flex-1 truncate text-left text-gray-400 hover:text-gray-200 ${focusRing}`}
                        >
                          {threadName(x)}
                        </button>
                        <button
                          type="button"
                          onClick={() => onClose(x.id, false)}
                          className={smallBtn}
                        >
                          {t.reopenThread}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {(open || draft) && (
          <section
            aria-label={t.threadLog(open ? threadName(open) : t.newThread)}
            className="flex min-h-0 min-w-0 flex-1 flex-col"
          >
            <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-gray-800 px-2 text-xs">
              <span className="min-w-0 truncate font-medium text-gray-200">
                {open ? threadName(open) : t.newThread}
              </span>
              <span className="flex-1" />
              {open && !open.closed && (
                <button type="button" onClick={() => onClose(open.id, true)} className={smallBtn}>
                  {t.closeThread}
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpen(null)}
                aria-label={t.collapseThread}
                title={t.collapseThread}
                className={`${smallBtn} px-1`}
              >
                <ChevronUp size={12} aria-hidden />
              </button>
            </div>
            {renderThread(open)}
          </section>
        )}
        {status === 'ready' && threads.length > 0 && !openId && (
          <p className="px-3 py-2 text-[11px] text-gray-600">{t.pickThread}</p>
        )}
      </div>
    </div>
  );
};
