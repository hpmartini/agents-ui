// AC-11: a log follows new content only from its end; scrolled up, the reader's place stays put
// (new messages, streaming, composer height, older pages, thread polls) and "New messages" jumps back
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithAgents, testTransport } from './agents';
import { ChatPane } from '../components/AgentsView/Chat/ChatPane';
import { threadTag, type ChatThread } from '../utils/chatThreads';
import type { AgentSession } from '../types';
import type { ChatHandlers, ChatHistoryPage, ChatThreadList } from '../transport';

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80;
    rows = 24;
    options = {};
    loadAddon() {}
    registerLinkProvider() {}
    open() {}
    onData() {}
    onResize() {}
    reset() {}
    focus() {}
    write() {}
    dispose() {}
  },
}));
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit() {}
  },
}));
vi.mock('@xterm/addon-web-links', () => ({ WebLinksAddon: class {} }));
vi.mock('@xterm/addon-image', () => ({ ImageAddon: class {} }));
vi.mock('../utils/terminalLinkStyle', () => ({ styleTerminalLinks: () => ({ dispose() {} }) }));
vi.mock('../utils/terminalKeys', () => ({ attachTerminalKeys: () => {} }));

// ---- a tiny layout engine: jsdom has none. Rows stack top-down, height grows with their text.
const rowHeight = (el: Element) => 40 + (el.textContent?.length ?? 0);
const scrollers = new Set<HTMLElement>();
const rowsOf = (list: HTMLElement) => [
  ...(list.children.length === 1 ? list.firstElementChild!.children : list.children),
];
const contentHeight = (list: HTMLElement) => rowsOf(list).reduce((n, r) => n + rowHeight(r), 0);
const originalRect = Element.prototype.getBoundingClientRect;
function layout(list: HTMLElement, view = 300) {
  let top = 0;
  let client = view;
  const max = () => Math.max(0, contentHeight(list) - client);
  Object.defineProperty(list, 'scrollHeight', {
    configurable: true,
    get: () => contentHeight(list),
  });
  Object.defineProperty(list, 'clientHeight', { configurable: true, get: () => client });
  Object.defineProperty(list, 'scrollTop', {
    configurable: true,
    get: () => Math.min(top, max()),
    set: (v: number) => (top = Math.max(0, Math.min(v, max()))),
  });
  scrollers.add(list);
  return { resize: (h: number) => (client = h) };
}

const observers = new Set<{ cb: ResizeObserverCallback; ro: ResizeObserver }>();
class RecordingResizeObserver {
  private entry: { cb: ResizeObserverCallback; ro: ResizeObserver };
  constructor(cb: ResizeObserverCallback) {
    this.entry = { cb, ro: this as unknown as ResizeObserver };
    observers.add(this.entry);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    observers.delete(this.entry);
  }
}
/** Layout settled: every ResizeObserver hears it (images loaded, streaming grew, input resized) */
const settle = () => act(() => observers.forEach((o) => o.cb([], o.ro)));

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', RecordingResizeObserver);
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (scrollers.has(this as HTMLElement)) {
      const list = this as HTMLElement;
      return new DOMRect(0, 0, 300, list.clientHeight);
    }
    for (const list of scrollers) {
      const rows = rowsOf(list);
      const i = rows.indexOf(this);
      if (i < 0) continue;
      const y = rows.slice(0, i).reduce((n, r) => n + rowHeight(r), 0) - list.scrollTop;
      return new DOMRect(0, y, 300, rowHeight(this));
    }
    return originalRect.call(this);
  };
});
afterEach(() => {
  scrollers.clear();
  observers.clear();
  Element.prototype.getBoundingClientRect = originalRect;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

/** First row whose bottom is below the log's top, and its top on screen */
const firstVisible = (list: HTMLElement) => {
  const row = rowsOf(list).find((r) => r.getBoundingClientRect().bottom > 0)!;
  return { row, top: () => row.getBoundingClientRect().top };
};
/** A wheel scroll by the user: the wheel event first, the scroll event once the position moved */
const wheelTo = (list: HTMLElement, to: number, { scrollEvent = true } = {}) => {
  fireEvent.wheel(list, { deltaY: to - list.scrollTop });
  list.scrollTop = to;
  if (scrollEvent) fireEvent.scroll(list);
};
const atBottom = (list: HTMLElement) =>
  Math.abs(list.scrollHeight - list.clientHeight - list.scrollTop) <= 1;

// ---- a chat pane with one orchestrator thread
const at = new Date(2026, 10, 25, 9, 0).getTime();
const T1: ChatThread = {
  id: 't1',
  name: { project: 'Shop', task: 'Checkout' },
  tag: threadTag({ project: 'Shop', task: 'Checkout' }),
  binding: null,
  parentKey: null,
  createdAt: at - 60_000,
  readAt: at - 60_000,
  agents: [],
  closed: false,
  repo: null,
  summary: null,
};
const pane: AgentSession = {
  id: 'p1',
  sessionId: 's1',
  kind: 'background',
  cwd: '/w/shop',
  startedAt: 1,
  name: 'orchestrator',
  state: null,
  pinned: false,
  order: null,
  links: [],
  displayState: 'idle',
};
const longText = (n: number) => `Answer ${n}: ${'lorem ipsum dolor sit amet '.repeat(4)}`;
const turn = (n: number, ts: number, tag: string | null) => [
  { type: 'devorbit_user', text: tag ? `${tag}\nQuestion ${n}` : `Question ${n}`, ts },
  {
    type: 'assistant',
    ts: ts + 1,
    message: { id: `m${n}-${ts}`, content: [{ type: 'text', text: longText(n) }] },
  },
  { type: 'result', ts: ts + 2 },
];

function setup({ older = false }: { older?: boolean } = {}) {
  let handlers: ChatHandlers | null = null;
  let resolvePage: (p: ChatHistoryPage) => void = () => {};
  const list: ChatThreadList = { orchestrator: 'orch', threads: [T1], tasks: [] };
  const transport = testTransport({
    chat: {
      openTranscriptView: vi.fn(async () => ({
        id: 'c1',
        harness: 'claude' as const,
        cwd: pane.cwd,
        name: pane.name,
        sessionId: 's1',
        model: null,
        running: true,
        startedAt: 1,
      })),
      subscribeToChat: vi.fn((_id: string, h: ChatHandlers) => {
        handlers = h;
        h.onOpen();
        return () => {};
      }),
      fetchChatHistory: vi.fn(() => new Promise<ChatHistoryPage>((r) => (resolvePage = r))),
    },
    threads: {
      fetchThreads: vi.fn(async () => ({ ...list, threads: [...list.threads] })),
      createThread: vi.fn(),
      updateThread: vi.fn(async (_s: string, _id: string, patch: Partial<ChatThread>) => ({
        ...T1,
        ...patch,
      })),
    },
  });
  const view = renderWithAgents(
    <div style={{ height: 600 }}>
      <ChatPane
        pane={pane}
        agent={pane}
        sessionId="s1"
        active
        focused={false}
        submitKey="enter"
        showSteps={false}
        onToggleSteps={vi.fn()}
        onFocus={vi.fn()}
        onClose={vi.fn()}
        onShowTerminal={vi.fn()}
      />
    </div>,
    { transport }
  );
  const push = (...events: unknown[]) =>
    act(() => {
      for (const e of events) handlers!.onEvent(e);
    });
  return {
    view,
    transport,
    push,
    ready: async () => {
      await waitFor(() => expect(handlers).not.toBeNull());
      if (older) push({ type: 'devorbit_page', before: 7, more: true });
    },
    resolvePage: (p: ChatHistoryPage) => act(async () => resolvePage(p)),
  };
}

async function openThreadLog(s: ReturnType<typeof setup>) {
  for (let n = 0; n < 12; n++) s.push(...turn(n, at + n * 1000, T1.tag));
  const panel = await waitFor(() => {
    const el = document.querySelector<HTMLElement>('[data-threads-panel]');
    expect(el).not.toBeNull();
    return el!;
  });
  const row = await within(panel).findByRole('button', { name: /Checkout/ });
  fireEvent.click(row);
  const section = await screen.findByRole('region', { name: /^Thread Shop · Checkout/ });
  const list = section.querySelector<HTMLElement>('.overflow-y-auto')!;
  const geo = layout(list);
  // the log opened at its end
  list.scrollTop = list.scrollHeight;
  fireEvent.scroll(list);
  await settle();
  return { list, ...geo };
}

async function openMainLog(s: ReturnType<typeof setup>) {
  for (let n = 0; n < 12; n++) s.push(...turn(n, at + n * 1000, null));
  const list = screen.getByRole('log');
  const geo = layout(list);
  list.scrollTop = list.scrollHeight;
  fireEvent.scroll(list);
  await settle();
  return { list, ...geo };
}

describe('thread log scroll (AC-11)', () => {
  it('scrolled up: a new message keeps the first visible message in place', async () => {
    const s = setup();
    await s.ready();
    const { list } = await openThreadLog(s);
    wheelTo(list, 300);
    const first = firstVisible(list);
    const before = first.top();
    s.push(...turn(20, at + 20_000, T1.tag));
    await settle();
    expect(Math.abs(first.top() - before)).toBeLessThanOrEqual(2);
    expect(atBottom(list)).toBe(false);
  });

  it('scrolled up: a streaming answer growing below keeps the place', async () => {
    const s = setup();
    await s.ready();
    const { list } = await openThreadLog(s);
    s.push(turn(20, at + 20_000, T1.tag)[0]);
    wheelTo(list, 300);
    const first = firstVisible(list);
    const before = first.top();
    for (let i = 0; i < 5; i++) {
      s.push({
        type: 'assistant',
        ts: at + 20_001,
        message: { id: 'live', content: [{ type: 'text', text: `chunk ${i} `.repeat(20) }] },
      });
      await settle();
    }
    expect(Math.abs(first.top() - before)).toBeLessThanOrEqual(2);
  });

  it('scrolled up: the thread poll (every few seconds) does not move the log', async () => {
    const timers = vi.spyOn(window, 'setInterval');
    const s = setup();
    await s.ready();
    const { list } = await openThreadLog(s);
    wheelTo(list, 300);
    const first = firstVisible(list);
    const before = first.top();
    const poll = timers.mock.calls.find(
      ([, ms]) => ms === 2_000 || ms === 15_000
    )![0] as () => void;
    await act(async () => poll());
    await waitFor(() => expect(s.transport.threads!.fetchThreads).toHaveBeenCalledTimes(2));
    await settle();
    expect(Math.abs(first.top() - before)).toBeLessThanOrEqual(2);
  });

  it('scrolled up: a taller composer (smaller log) keeps the place', async () => {
    const s = setup();
    await s.ready();
    const { list, resize } = await openThreadLog(s);
    wheelTo(list, 300);
    const first = firstVisible(list);
    const before = first.top();
    resize(220);
    await settle();
    expect(Math.abs(first.top() - before)).toBeLessThanOrEqual(2);
  });

  it('at the end: a taller composer keeps the log at its end (typing in a narrow pane)', async () => {
    const s = setup();
    await s.ready();
    const { list, resize } = await openThreadLog(s);
    resize(220);
    await settle();
    expect(atBottom(list)).toBe(true);
  });

  it('scrolled up: an older page going in front keeps the place', async () => {
    const s = setup({ older: true });
    await s.ready();
    const { list } = await openThreadLog(s);
    await waitFor(() => expect(s.transport.chat!.fetchChatHistory).toHaveBeenCalled());
    wheelTo(list, 120);
    const first = firstVisible(list);
    const before = first.top();
    await s.resolvePage({
      events: [...turn(90, at - 5000, T1.tag), ...turn(91, at - 4000, T1.tag)],
      before: 3,
      more: false,
    });
    await settle();
    expect(first.row.isConnected).toBe(true);
    expect(Math.abs(first.top() - before)).toBeLessThanOrEqual(2);
  });

  it('at the end: a new message is followed', async () => {
    const s = setup();
    await s.ready();
    const { list } = await openThreadLog(s);
    s.push(...turn(20, at + 20_000, T1.tag));
    await settle();
    expect(atBottom(list)).toBe(true);
  });

  it('"New messages" shows after new content while scrolled up and goes back to following', async () => {
    const s = setup();
    await s.ready();
    const { list } = await openThreadLog(s);
    wheelTo(list, 300);
    const section = screen.getByRole('region', { name: /^Thread Shop · Checkout/ });
    expect(within(section).queryByRole('button', { name: /New messages/ })).toBeNull();
    s.push(...turn(20, at + 20_000, T1.tag));
    await settle();
    fireEvent.click(within(section).getByRole('button', { name: /New messages/ }));
    expect(atBottom(list)).toBe(true);
    expect(within(section).queryByRole('button', { name: /New messages/ })).toBeNull();
    s.push(...turn(21, at + 21_000, T1.tag));
    await settle();
    expect(atBottom(list)).toBe(true);
  });
});

describe('main chat log scroll (AC-11)', () => {
  it('a wheel scroll up whose scroll event has not fired yet is not pulled back by new content', async () => {
    const s = setup();
    await s.ready();
    const { list } = await openMainLog(s);
    wheelTo(list, 300, { scrollEvent: false });
    const first = firstVisible(list);
    const before = first.top();
    s.push(...turn(20, at + 20_000, null));
    await settle();
    expect(Math.abs(first.top() - before)).toBeLessThanOrEqual(2);
  });

  it('scrolled up: streaming and a smaller log keep the place', async () => {
    const s = setup();
    await s.ready();
    const { list, resize } = await openMainLog(s);
    wheelTo(list, 300);
    const first = firstVisible(list);
    const before = first.top();
    s.push(turn(20, at + 20_000, null)[0]);
    for (let i = 0; i < 3; i++) {
      s.push({
        type: 'assistant',
        ts: at + 20_001,
        message: { id: 'live', content: [{ type: 'text', text: `chunk ${i} `.repeat(20) }] },
      });
      await settle();
    }
    resize(220);
    await settle();
    expect(Math.abs(first.top() - before)).toBeLessThanOrEqual(2);
  });

  it('at the end: new content is followed', async () => {
    const s = setup();
    await s.ready();
    const { list } = await openMainLog(s);
    s.push(...turn(20, at + 20_000, null));
    await settle();
    expect(atBottom(list)).toBe(true);
  });

  it('"New messages" jumps back to the end and follows again', async () => {
    const s = setup();
    await s.ready();
    const { list } = await openMainLog(s);
    wheelTo(list, 300);
    s.push(...turn(20, at + 20_000, null));
    await settle();
    fireEvent.click(screen.getByRole('button', { name: /New messages/ }));
    expect(atBottom(list)).toBe(true);
    s.push(...turn(21, at + 21_000, null));
    await settle();
    expect(atBottom(list)).toBe(true);
  });
});
