// shortcut: throwaway clickable prototype for the reply button and threads (approval only), replaced by the real components in src/ once approved
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  ArrowUp,
  Bot,
  ChevronDown,
  FolderGit2,
  Loader2,
  MessagesSquare,
  Paperclip,
  Plus,
  Quote,
  Reply,
  Sparkles,
  X,
} from 'lucide-react';
import { AgentsProvider } from '../src/host';
import { createMockTransport } from '../src/transports/mock';
import { ChatMarkdown } from '../src/components/AgentsView/Chat/ChatMarkdown';
import './threads.css';
import './demo.css';

type Role = 'user' | 'answer' | 'worker';
interface Msg {
  id: string;
  role: Role;
  time: string;
  text: string;
  threadId?: string;
  worker?: string;
  images?: string[];
}
interface Thread {
  id: string;
  project: string;
  task: string;
  where: string;
  summary: string;
  bound: boolean;
  /** Main-chat answer the thread was opened from */
  parentId?: string;
  closed?: boolean;
  readUpTo: number;
}
interface State {
  msgs: Msg[];
  threads: Thread[];
}

// Neutral sample data, shaped like `orkumo report` (projects → tasks with title/note/refs)
const REPORT = [
  {
    project: 'Shop',
    repo: 'example-org/shop',
    tasks: [
      { id: 'checkout', title: 'One-page checkout', note: 'Worker builds the form; address check tests red', agent: 'worker-7' },
      { id: 'coupons', title: 'Limit coupon codes', note: 'Waits for a decision on the limit' },
    ],
  },
  {
    project: 'Weather app',
    repo: 'example-org/weather · apps/mobile',
    tasks: [{ id: 'offline', title: 'Offline forecast', note: 'PR ready for review' }],
  },
];

const tag = (t: Pick<Thread, 'project' | 'task'>) => `[Thread: ${t.project} · ${t.task}]`;
const clock = () => new Date().toTimeString().slice(0, 5);
const firstLines = (s: string, n = 2) => s.split('\n').filter(Boolean).slice(0, n).join(' ');

const SEED_T1 = { project: 'Shop', task: 'One-page checkout' };
const SEED_T2 = { project: 'Weather app', task: 'Offline forecast' };

const SEED: State = {
  threads: [
    {
      id: 't1',
      project: 'Shop',
      task: 'One-page checkout',
      where: 'example-org/shop',
      summary: 'Worker builds the form; address check tests red',
      bound: true,
      readUpTo: 2,
    },
    {
      id: 't2',
      project: 'Weather app',
      task: 'Offline forecast',
      where: 'example-org/weather · apps/mobile',
      summary: 'PR ready for review',
      bound: true,
      readUpTo: 1,
    },
  ],
  msgs: [
    { id: 'm1', role: 'user', time: '09:02', text: 'Morning. Where do we stand across projects?' },
    {
      id: 'm2',
      role: 'answer',
      time: '09:03',
      text: 'Two projects are active.\n\n- **Shop:** one-page checkout in progress, the address check fails two tests.\n- **Weather app:** offline forecast has a PR ready.\n\nOne decision is open: how often a customer may use a coupon code.',
    },
    { id: 'm3', role: 'user', time: '09:10', threadId: 't1', text: `${tag(SEED_T1)}\nWhy does the address check fail?` },
    { id: 'm4', role: 'answer', time: '09:11', threadId: 't1', text: `${tag(SEED_T1)}\nPostcodes with a leading zero are parsed as numbers. The worker is fixing the parser.` },
    { id: 'm5', role: 'worker', time: '09:24', threadId: 't1', worker: 'worker-7', text: 'Parser fixed, 48/48 tests green. Opening the PR now.' },
    { id: 'm6', role: 'user', time: '09:20', threadId: 't2', text: `${tag(SEED_T2)}\nAnything left before review?` },
    { id: 'm7', role: 'answer', time: '09:21', threadId: 't2', text: `${tag(SEED_T2)}\nOnly the screenshots in the PR body. Requested them from the worker.` },
    {
      id: 'm8',
      role: 'answer',
      time: '09:32',
      text: 'For the coupon limit I recommend **once per customer**:\n\nno migration, and the remaining 10 % of campaigns can use their own codes. Alternatively a per-code limit costs one admin field and a migration.',
    },
  ],
};

const KEY = 'agents-ui-thread-prototype';
const load = (): State => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* corrupt storage: start from the seed */
  }
  return structuredClone(SEED);
};

type PanelState = 'ready' | 'loading' | 'empty' | 'error';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-blue-400';
const iconBtn = `inline-flex whitespace-nowrap items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-gray-400 hover:text-white hover:bg-gray-800 ${focusRing}`;

const stripTag = (text: string, t?: Thread) =>
  t && text.startsWith(tag(t)) ? text.slice(tag(t).length).replace(/^\n/, '') : text;

/* ---------- messages ---------- */

const QuoteBox: React.FC<{ quote: { time: string; text: string } }> = ({ quote }) => (
  <div className="mb-1.5 flex gap-1.5 rounded border border-blue-400/25 bg-blue-500/10 px-2 py-1 text-xs text-blue-100/90">
    <Quote size={11} aria-hidden className="mt-0.5 shrink-0 text-blue-300" />
    <span>
      <span className="text-blue-300">Reply to {quote.time}: </span>
      <span className="line-clamp-2">{quote.text}</span>
    </span>
  </div>
);

// the header the transcript carries for a reply: `Re your reply from 09:32: "…"` + blank line
const QUOTE_HEAD = /^Re your reply from (\d\d:\d\d): "([\s\S]*?)"\n\n/;

const UserBubble: React.FC<{ m: Msg; thread?: Thread }> = ({ m, thread }) => {
  const body = stripTag(m.text, thread);
  const head = QUOTE_HEAD.exec(body);
  return (
  <div className="my-3 flex flex-col items-end">
    <div className="max-w-[85%] rounded-lg border border-blue-800/60 bg-blue-900/50 px-3 py-2 text-sm text-gray-100 whitespace-pre-wrap break-words">
      {head && <QuoteBox quote={{ time: head[1], text: head[2] }} />}
      {head ? body.slice(head[0].length) : body}
      {m.images && m.images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {m.images.map((src) => (
            <img key={src} src={src} alt="Attached image" className="h-20 max-w-[10rem] rounded border border-blue-800/60 object-cover" />
          ))}
        </div>
      )}
    </div>
    <span className="mt-1 text-[10px] tabular-nums text-gray-500">{m.time}</span>
  </div>
  );
};

const WorkerBubble: React.FC<{ m: Msg }> = ({ m }) => (
  <div className="my-3 flex flex-col items-start">
    <div className="max-w-[85%] rounded-lg border border-violet-800/60 bg-violet-950/40 px-3 py-2 text-sm text-gray-100">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-violet-300">
        <Bot size={12} aria-hidden />
        <span>Message from</span>
        <span className="font-medium text-violet-200">{m.worker}</span>
        <span className="ml-auto tabular-nums text-violet-300/70">{m.time}</span>
      </div>
      <div className="whitespace-pre-wrap break-words">{m.text}</div>
    </div>
  </div>
);

const AnswerCard: React.FC<{
  m: Msg;
  thread?: Thread;
  onReply?: (quote: { time: string; text: string }) => void;
  onOpenThread?: () => void;
}> = ({ m, thread, onReply, onOpenThread }) => {
  const ref = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState('');
  const body = stripTag(m.text, thread);
  // a selection inside this card is what Reply quotes; anything else quotes the first lines
  const readSelection = () => {
    const sel = window.getSelection();
    const text = sel && !sel.isCollapsed && ref.current?.contains(sel.anchorNode) ? sel.toString().trim() : '';
    setSelected(text);
  };
  return (
    <article
      ref={ref}
      onMouseUp={readSelection}
      onKeyUp={readSelection}
      className="group my-3 rounded-lg border border-gray-800 bg-gray-900/40"
      aria-label="Answer from omp"
    >
      <header className="flex h-7 items-center gap-1.5 border-b border-gray-800/80 px-3 text-[11px] text-gray-500">
        <Sparkles size={12} aria-hidden className="text-blue-300" />
        <span className="font-medium text-gray-300">omp</span>
        <span className="font-mono">opus-5.5</span>
        <span className="flex-1" />
        {(onReply || onOpenThread) && (
          <span className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
            {onReply && (
              <button
                type="button"
                className={iconBtn}
                // keep the selection: the click must not clear what Reply quotes
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onReply({ time: m.time, text: selected || firstLines(body) });
                  setSelected('');
                }}
              >
                <Reply size={12} aria-hidden />
                {selected ? 'Reply to selection' : 'Reply'}
              </button>
            )}
            {onOpenThread && (
              <button type="button" className={iconBtn} onClick={onOpenThread}>
                <MessagesSquare size={12} aria-hidden />
                Open thread
              </button>
            )}
          </span>
        )}
        <span className="tabular-nums">{m.time}</span>
      </header>
      <div className="px-3 py-2.5">
        <ChatMarkdown text={body} />
      </div>
    </article>
  );
};

const ThreadRow: React.FC<{ thread: Thread; count: number; unread: number; last: string; onOpen: () => void }> = ({
  thread,
  count,
  unread,
  last,
  onOpen,
}) => (
  <button
    type="button"
    onClick={onOpen}
    className={`-mt-1 mb-3 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-gray-800/70 ${focusRing}`}
  >
    <MessagesSquare size={13} aria-hidden className="shrink-0 text-blue-300" />
    <span className="shrink-0 whitespace-nowrap font-medium text-blue-300">
      {count} {count === 1 ? 'reply' : 'replies'}
    </span>
    <span className="min-w-0 truncate text-gray-400">
      in thread <span className="text-gray-200">{thread.project} · {thread.task}</span>
    </span>
    {unread > 0 && (
      <span className="shrink-0 rounded-full bg-blue-500 px-1.5 text-[10px] font-semibold leading-4 text-white tabular-nums">
        {unread} new
      </span>
    )}
    <span className="ml-auto shrink-0 tabular-nums text-gray-500">{last}</span>
  </button>
);

/* ---------- composer ---------- */

const Composer: React.FC<{
  placeholder: string;
  quote: { time: string; text: string } | null;
  onClearQuote: () => void;
  onSend: (text: string, images: string[]) => void;
  autoFocusKey?: unknown;
}> = ({ placeholder, quote, onClearQuote, onSend, autoFocusKey }) => {
  const [value, setValue] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const input = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (quote || autoFocusKey) input.current?.focus();
  }, [quote, autoFocusKey]);
  const send = () => {
    if (!value.trim() && !images.length) return;
    onSend(value.trim(), images);
    setValue('');
    setImages([]);
  };
  return (
    <div className="border-t border-gray-800 p-2.5">
      {(quote || images.length > 0) && (
        <div className="mb-2 flex flex-wrap items-start gap-1.5">
          {quote && (
            <div className="flex max-w-full min-w-0 items-start gap-1.5 rounded-md border border-blue-400/30 bg-blue-500/10 py-1 pl-2 pr-1 text-xs text-blue-100" data-quote-chip>
              <Quote size={12} aria-hidden className="mt-0.5 shrink-0 text-blue-300" />
              <span className="min-w-0">
                <span className="text-blue-300">Reply to {quote.time}</span>
                <span className="line-clamp-2 text-blue-100/85">{quote.text}</span>
              </span>
              <button type="button" aria-label="Remove quote" onClick={onClearQuote} className={`shrink-0 rounded p-0.5 text-blue-300 hover:bg-blue-500/20 hover:text-white ${focusRing}`}>
                <X size={12} aria-hidden />
              </button>
            </div>
          )}
          {images.map((src) => (
            <div key={src} className="relative">
              <img src={src} alt="Attachment" className="h-12 w-12 rounded border border-gray-700 object-cover" />
              <button
                type="button"
                aria-label="Remove attachment"
                onClick={() => setImages((l) => l.filter((s) => s !== src))}
                className="absolute -right-1 -top-1 rounded-full border border-gray-700 bg-gray-900 p-0.5 text-gray-300 hover:text-white"
              >
                <X size={10} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-1.5">
        <button type="button" aria-label="Attach image or file" onClick={() => file.current?.click()} className={`mb-1 rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white ${focusRing}`}>
          <Paperclip size={15} aria-hidden />
        </button>
        <input
          ref={file}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const picked = [...(e.target.files ?? [])].map((f) => URL.createObjectURL(f));
            setImages((l) => [...l, ...picked]);
            e.target.value = '';
          }}
        />
        <textarea
          ref={input}
          rows={1}
          value={value}
          placeholder={placeholder}
          aria-label="Message"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
            if (e.key === 'Escape' && quote) onClearQuote();
          }}
          className="block min-h-[40px] w-full resize-none rounded-md border border-gray-700 bg-gray-900 px-2.5 py-2 text-sm leading-6 text-gray-100 placeholder:text-gray-500 focus:border-blue-400 focus:outline-none"
        />
        <button
          type="button"
          aria-label="Send"
          onClick={send}
          disabled={!value.trim() && !images.length}
          className={`mb-1 rounded-md bg-blue-600 p-1.5 text-white hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 ${focusRing}`}
        >
          <ArrowUp size={15} aria-hidden />
        </button>
      </div>
    </div>
  );
};

/* ---------- thread panel ---------- */

const NewThreadMenu: React.FC<{ onPick: (p: { project: string; task: string; where: string; summary: string; bound: boolean }) => void; onClose: () => void }> = ({
  onPick,
  onClose,
}) => (
  <div role="menu" aria-label="New thread" className="absolute right-2 top-9 z-30 w-72 overflow-hidden rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl shadow-black/40">
    <div className="px-3 pb-1 pt-1.5 text-[11px] text-gray-500">Bind to a task from the status report</div>
    {REPORT.map((p) => (
      <div key={p.project}>
        <div className="flex items-center gap-1.5 px-3 pt-1.5 text-[11px] font-medium text-gray-400">
          <FolderGit2 size={11} aria-hidden className="shrink-0" /> <span className="shrink-0 whitespace-nowrap">{p.project}</span>
          <span className="truncate font-normal text-gray-500">{p.repo}</span>
        </div>
        {p.tasks.map((t) => (
          <button
            key={t.id}
            role="menuitem"
            type="button"
            onClick={() => onPick({ project: p.project, task: t.title, where: p.repo, summary: t.note, bound: true })}
            className={`block w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-blue-500/20 ${focusRing}`}
          >
            {t.title}
            <span className="block truncate text-[11px] text-gray-500">{t.note}</span>
          </button>
        ))}
      </div>
    ))}
    <div className="mt-1 border-t border-gray-800 pt-1">
      <button
        role="menuitem"
        type="button"
        onClick={() => onPick({ project: 'Unbound', task: 'New thread', where: 'Not bound to a status task', summary: '', bound: false })}
        className={`block w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-blue-500/20 ${focusRing}`}
      >
        Thread without a task
        <span className="block text-[11px] text-gray-500">Named after its first message</span>
      </button>
    </div>
    <button type="button" aria-label="Close menu" onClick={onClose} className="absolute right-1.5 top-1.5 rounded p-0.5 text-gray-500 hover:text-white">
      <X size={12} aria-hidden />
    </button>
  </div>
);

/* ---------- app ---------- */

function Prototype() {
  const [state, setState] = useState<State>(load);
  const [openId, setOpenId] = useState<string | null>('t1');
  const [quote, setQuote] = useState<{ time: string; text: string } | null>(null);
  const [panel, setPanel] = useState<PanelState>('ready');
  const [menu, setMenu] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [split, setSplit] = useState(false);
  const mainEnd = useRef<HTMLDivElement>(null);
  const threadEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // object URLs die with the page: persist everything but image previews
    localStorage.setItem(KEY, JSON.stringify({ ...state, msgs: state.msgs.map(({ images, ...m }) => m) }));
  }, [state]);

  const byThread = useMemo(() => {
    const map = new Map<string, Msg[]>();
    for (const m of state.msgs) if (m.threadId) map.set(m.threadId, [...(map.get(m.threadId) ?? []), m]);
    return map;
  }, [state.msgs]);
  const threadOf = (id?: string) => state.threads.find((t) => t.id === id);
  const open = threadOf(openId ?? undefined);
  const unread = (t: Thread) => Math.max(0, (byThread.get(t.id)?.length ?? 0) - t.readUpTo);

  // opening a thread marks it read
  useEffect(() => {
    if (!open) return;
    const n = byThread.get(open.id)?.length ?? 0;
    if (open.readUpTo !== n) setState((s) => ({ ...s, threads: s.threads.map((t) => (t.id === open.id ? { ...t, readUpTo: n } : t)) }));
    threadEnd.current?.scrollIntoView({ block: 'end' });
  }, [open?.id, byThread]);

  const push = (msg: Omit<Msg, 'id' | 'time'>) =>
    setState((s) => ({ ...s, msgs: [...s.msgs, { ...msg, id: `m${Date.now()}${Math.random()}`, time: clock() }] }));

  const sendMain = (text: string, images: string[]) => {
    const q = quote;
    push({ role: 'user', text: q ? `Re your reply from ${q.time}: "${q.text}"\n\n${text}` : text, images });
    setQuote(null);
    setTimeout(() => push({ role: 'answer', text: q ? `Got it, on my ${q.time} answer: noted and passed on.` : 'Noted.' }), 900);
    setTimeout(() => mainEnd.current?.scrollIntoView({ block: 'end' }), 50);
  };

  const sendThread = (t: Thread, text: string, images: string[]) => {
    // an unbound thread takes its name from the first message
    if (!t.bound && !t.parentId && (byThread.get(t.id)?.length ?? 0) === 0) {
      const name = text.split(/\s+/).slice(0, 4).join(' ') || 'Image';
      t = { ...t, task: name, summary: text.slice(0, 80) };
      setState((s) => ({ ...s, threads: s.threads.map((x) => (x.id === t.id ? t : x)) }));
    }
    const tg = tag(t);
    push({ role: 'user', threadId: t.id, text: `${tg}\n${text}`, images });
    setTimeout(() => push({ role: 'answer', threadId: t.id, text: `${tg}\nOn it. I will report back in this thread.` }), 900);
  };

  const createThread = (p: { project: string; task: string; where: string; summary: string; bound: boolean }, parent?: Msg) => {
    const id = `t${Date.now()}`;
    const t: Thread = { id, ...p, parentId: parent?.id, readUpTo: 0 };
    if (parent) {
      t.project = `Answer ${parent.time}`;
      t.task = firstLines(parent.text, 1).replace(/[*_`]/g, '').split(/\s+/).slice(0, 4).join(' ');
      t.summary = firstLines(parent.text, 1).replace(/[*_`]/g, '').slice(0, 90);
      t.where = 'Not bound to a status task';
    }
    setState((s) => ({ ...s, threads: [t, ...s.threads] }));
    setOpenId(id);
    setMenu(false);
    setPanel('ready');
  };

  const closeThread = (id: string) => {
    setState((s) => ({ ...s, threads: s.threads.map((t) => (t.id === id ? { ...t, closed: true } : t)) }));
    if (openId === id) setOpenId(null);
  };

  const simulateWorker = () => {
    const t = state.threads.find((x) => x.project === 'Shop' && !x.closed);
    if (!t) return;
    push({ role: 'worker', worker: 'worker-7', threadId: t.id, text: 'PR #12 is open. CI running.' });
  };
  const simulateUntagged = () => push({ role: 'answer', text: 'Reminder: the coupon decision is still open. (No thread tag, so it stays in the main chat.)' });

  // main timeline: thread messages collapse into one row at the thread's first message (or under its parent answer)
  const shown = new Set<string>();
  const main: React.ReactNode[] = [];
  const rowFor = (t: Thread) => {
    const list = byThread.get(t.id) ?? [];
    return (
      <ThreadRow key={`row-${t.id}`} thread={t} count={list.length} unread={unread(t)} last={list.at(-1)?.time ?? ''} onOpen={() => { setOpenId(t.id); setPanel('ready'); }} />
    );
  };
  for (const m of state.msgs) {
    if (m.threadId) {
      const t = threadOf(m.threadId);
      if (t && !t.parentId && !shown.has(t.id)) {
        shown.add(t.id);
        main.push(rowFor(t));
      }
      continue;
    }
    main.push(
      m.role === 'answer' ? (
        <AnswerCard
          key={m.id}
          m={m}
          onReply={setQuote}
          onOpenThread={() => {
            const existing = state.threads.find((t) => t.parentId === m.id && !t.closed);
            if (existing) setOpenId(existing.id);
            else createThread({ project: '', task: '', where: '', summary: '', bound: false }, m);
          }}
        />
      ) : m.role === 'worker' ? (
        <WorkerBubble key={m.id} m={m} />
      ) : (
        <UserBubble key={m.id} m={m} />
      )
    );
    for (const t of state.threads) if (t.parentId === m.id) main.push(rowFor(t));
  }

  const active = state.threads.filter((t) => !t.closed);
  const closed = state.threads.filter((t) => t.closed);
  const openMsgs = open ? byThread.get(open.id) ?? [] : [];

  const pane = (
    <div className="flex min-h-0 min-w-0 flex-1">
      {/* main chat */}
      <section className="flex min-w-0 flex-1 flex-col" aria-label="Main chat">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-gray-800 px-3 text-xs">
          <Sparkles size={13} aria-hidden className="text-blue-300" />
          <span className="font-medium text-gray-200">Orchestrator · Release</span>
          <span className="text-gray-500">omp · UI view</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
          {main}
          <div ref={mainEnd} />
        </div>
        <Composer placeholder="Message the orchestrator" quote={quote} onClearQuote={() => setQuote(null)} onSend={sendMain} />
      </section>

      {/* thread panel */}
      <aside className="relative flex w-[min(380px,48%)] shrink-0 flex-col border-l border-gray-800 bg-gray-950/40" aria-label="Threads">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-gray-800 px-3 text-xs">
          <MessagesSquare size={13} aria-hidden className="text-blue-300" />
          <span className="font-medium text-gray-200">Threads</span>
          {panel === 'ready' && <span className="tabular-nums text-gray-500">{active.length}</span>}
          <span className="flex-1" />
          <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} className={`${iconBtn} border border-gray-700`}>
            <Plus size={12} aria-hidden /> New thread
          </button>
        </div>
        {menu && <NewThreadMenu onPick={(p) => createThread(p)} onClose={() => setMenu(false)} />}

        {panel === 'loading' && (
          <div className="flex flex-1 items-center justify-center gap-2 text-xs text-gray-400" role="status">
            <Loader2 size={14} aria-hidden className="animate-spin motion-reduce:animate-none" /> Loading threads…
          </div>
        )}
        {panel === 'error' && (
          <div className="m-3 flex gap-2 rounded-md border border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200" role="alert">
            <AlertTriangle size={14} aria-hidden className="mt-0.5 shrink-0 text-red-300" />
            <div>
              <p className="font-medium">Threads could not be loaded</p>
              <p className="mt-0.5 text-red-200/80">HTTP 503 from /api/orchestrator/threads. Messages still reach the orchestrator through the main chat.</p>
              <button type="button" onClick={() => setPanel('ready')} className={`mt-2 rounded border border-red-700/70 px-2 py-0.5 text-red-100 hover:bg-red-900/50 ${focusRing}`}>
                Try again
              </button>
            </div>
          </div>
        )}
        {(panel === 'empty' || (panel === 'ready' && active.length === 0 && !open)) && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-xs text-gray-400">
            <MessagesSquare size={20} aria-hidden className="text-gray-600" />
            <p className="text-gray-300">No threads yet</p>
            <p>Open a thread from an answer, from Instruct on a status card, or bind a new one to a task.</p>
          </div>
        )}

        {panel === 'ready' && (active.length > 0 || open) && (
          <>
            <ul className="max-h-[42%] shrink-0 overflow-y-auto border-b border-gray-800 py-1" aria-label="Active threads">
              {active.map((t) => {
                const list = byThread.get(t.id) ?? [];
                const first = list[0];
                const n = unread(t);
                const isOpen = t.id === openId;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(t.id)}
                      aria-current={isOpen || undefined}
                      className={`block w-full px-3 py-2 text-left ${isOpen ? 'bg-blue-500/15' : 'hover:bg-gray-800/60'} ${focusRing}`}
                    >
                      <span className="flex items-center gap-1.5 text-sm">
                        <span className={`truncate ${n ? 'font-semibold text-white' : 'font-medium text-gray-200'}`}>
                          {t.project} · {t.task}
                        </span>
                        <span className="flex-1" />
                        {n > 0 && (
                          <span className="shrink-0 rounded-full bg-blue-500 px-1.5 text-[10px] font-semibold leading-4 text-white tabular-nums" aria-label={`${n} unread`}>
                            {n}
                          </span>
                        )}
                        <span className="shrink-0 text-[11px] tabular-nums text-gray-500">{list.at(-1)?.time ?? ''}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-gray-500">
                        <FolderGit2 size={10} aria-hidden className="shrink-0" /> {t.where}
                      </span>
                      {t.summary && <span className="mt-0.5 block truncate text-xs text-gray-300">{t.summary}</span>}
                      {first && <span className="block truncate text-xs text-gray-500">“{stripTag(first.text, t)}”</span>}
                    </button>
                  </li>
                );
              })}
              {closed.length > 0 && (
                <li>
                  <button type="button" onClick={() => setShowClosed((v) => !v)} aria-expanded={showClosed} className={`flex w-full items-center gap-1 px-3 py-1.5 text-[11px] text-gray-500 hover:text-gray-300 ${focusRing}`}>
                    <ChevronDown size={11} aria-hidden className={showClosed ? '' : '-rotate-90'} /> Closed ({closed.length})
                  </button>
                  {showClosed &&
                    closed.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setState((s) => ({ ...s, threads: s.threads.map((x) => (x.id === t.id ? { ...x, closed: false } : x)) }))}
                        className={`block w-full truncate px-6 py-1 text-left text-xs text-gray-500 hover:text-gray-200 ${focusRing}`}
                        title="Reopen"
                      >
                        {t.project} · {t.task}
                      </button>
                    ))}
                </li>
              )}
            </ul>

            {open ? (
              <section className="flex min-h-0 flex-1 flex-col" aria-label={`Thread ${open.project} · ${open.task}`}>
                <div className="flex shrink-0 items-start gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-100">{open.project} · {open.task}</div>
                    <div className="truncate text-[11px] text-gray-500">{open.bound ? `Bound to status task · ${open.where}` : open.where}</div>
                  </div>
                  <button type="button" onClick={() => closeThread(open.id)} className={`${iconBtn} border border-gray-700`}>
                    Close thread
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3">
                  {open.parentId && (() => {
                    const parent = state.msgs.find((m) => m.id === open.parentId);
                    return parent ? <AnswerCard m={parent} /> : null;
                  })()}
                  {openMsgs.length === 0 && !open.parentId && (
                    <p className="py-6 text-center text-xs text-gray-500">Write the first message. It goes to the orchestrator tagged {tag(open)}.</p>
                  )}
                  {openMsgs.map((m) =>
                    m.role === 'answer' ? <AnswerCard key={m.id} m={m} thread={open} onReply={setQuote} /> : m.role === 'worker' ? <WorkerBubble key={m.id} m={m} /> : <UserBubble key={m.id} m={m} thread={open} />
                  )}
                  <div ref={threadEnd} />
                </div>
                <Composer placeholder="Reply in thread" quote={null} onClearQuote={() => {}} onSend={(text, images) => sendThread(open, text, images)} autoFocusKey={open.id} />
              </section>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-gray-500">Pick a thread to read it here.</div>
            )}
          </>
        )}
      </aside>
    </div>
  );

  return (
    <div className="demo">
      <header className="demo-bar">
        <strong>agents-ui</strong>
        <span>reply &amp; threads prototype</span>
        <span className="flex-1" />
        <button style={{ marginLeft: 0 }} onClick={simulateWorker}>Worker message (linked)</button>
        <button style={{ marginLeft: 0 }} onClick={simulateUntagged}>Answer without tag</button>
        <label>
          panel{' '}
          <select value={panel} onChange={(e) => setPanel(e.target.value as PanelState)}>
            <option value="ready">ready</option>
            <option value="loading">loading</option>
            <option value="empty">empty</option>
            <option value="error">error</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} /> split view
        </label>
        <button style={{ marginLeft: 0 }} onClick={() => { localStorage.removeItem(KEY); location.reload(); }}>Reset</button>
      </header>
      <main className="demo-main agents-ui">
        <div className="flex min-h-0 flex-1">
          {split && (
            <div className="flex w-1/2 shrink-0 items-center justify-center border-r border-gray-700 text-xs text-gray-500">Other pane (terminal)</div>
          )}
          {pane}
        </div>
      </main>
    </div>
  );
}

const transport = createMockTransport([], { latencyMs: 0 });
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AgentsProvider transport={transport} host={{ toast: { info() {}, success() {}, error() {}, dismiss() {} } }} locale="en">
      <Prototype />
    </AgentsProvider>
  </React.StrictMode>
);
