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

function setup({ older = false, status = false }: { older?: boolean; status?: boolean } = {}) {
  let handlers: ChatHandlers | null = null;
  let resolvePage: (p: ChatHistoryPage) => void = () => {};
  const list: ChatThreadList = {
    orchestrator: 'orch',
    threads: [T1],
    tasks: status
      ? [{ project: 'shop', projectName: 'Shop', task: 'co', title: 'Checkout', repo: null }]
      : [],
  };
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
  const ui = (active: boolean) => (
    <div style={{ height: 600 }}>
      <ChatPane
        pane={pane}
        agent={pane}
        sessionId="s1"
        active={active}
        focused={false}
        submitKey="enter"
        showSteps={false}
        onToggleSteps={vi.fn()}
        onFocus={vi.fn()}
        onClose={vi.fn()}
        onShowTerminal={vi.fn()}
        renderStatus={status ? () => <div data-testid="host-status">details</div> : undefined}
      />
    </div>
  );
  const view = renderWithAgents(ui(true), { transport });
  const push = (...events: unknown[]) =>
    act(() => {
      for (const e of events) handlers!.onEvent(e);
    });
  return {
    view,
    transport,
    push,
    setActive: (active: boolean) => view.rerender(ui(active)),
    /** The server view opened again (reconnect): the whole history replays after a reset */
    reopen: () => act(() => handlers!.onOpen()),
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

  // live: the thread input refits (height auto, then measured) and the browser clamps the log's
  // scrollTop for that moment; content arriving before the scroll event must not read as a scroll up
  it('at the end: a layout clamp, then new content before the scroll event, keeps following', async () => {
    const s = setup();
    await s.ready();
    const { list } = await openThreadLog(s);
    list.scrollTop -= 24;
    s.push(...turn(20, at + 20_000, T1.tag));
    await settle();
    fireEvent.scroll(list);
    await settle();
    expect(atBottom(list)).toBe(true);
    const section = screen.getByRole('region', { name: /^Thread Shop · Checkout/ });
    expect(within(section).queryByRole('button', { name: /New messages/ })).toBeNull();
  });

  it('at the end: a scroll event without the reader (clamp + growth in one frame) keeps following', async () => {
    const s = setup();
    await s.ready();
    const { list } = await openThreadLog(s);
    list.scrollTop -= 120;
    fireEvent.scroll(list);
    s.push(...turn(20, at + 20_000, T1.tag));
    await settle();
    expect(atBottom(list)).toBe(true);
  });

  it('scrolled up by a scrollbar drag (no wheel): new content keeps the place', async () => {
    const s = setup();
    await s.ready();
    const { list } = await openThreadLog(s);
    fireEvent.pointerDown(list);
    list.scrollTop = 300;
    fireEvent.scroll(list);
    fireEvent.pointerUp(window);
    const first = firstVisible(list);
    const before = first.top();
    s.push(...turn(20, at + 20_000, T1.tag));
    await settle();
    expect(atBottom(list)).toBe(false);
    expect(Math.abs(first.top() - before)).toBeLessThanOrEqual(2);
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

  it('back from the Status view (a new thread log element) the log opens at its end', async () => {
    const s = setup({ status: true });
    await s.ready();
    await openThreadLog(s);
    fireEvent.click(screen.getByRole('button', { name: 'Maximize threads' }));
    fireEvent.click(await screen.findByRole('button', { name: /Checkout\s*Shop/ }));
    await screen.findByTestId('host-status');
    // every log mounted from here on gets the layout of a 300 px view
    const tops = new WeakMap<Element, number>();
    const isLog = (el: Element) => el.classList.contains('overflow-y-auto');
    const max = (el: HTMLElement) => Math.max(0, contentHeight(el) - 300);
    const spies = [
      vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (
        this: HTMLElement
      ) {
        return isLog(this) ? contentHeight(this) : 0;
      }),
      vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
        this: HTMLElement
      ) {
        return isLog(this) ? 300 : 0;
      }),
      vi.spyOn(Element.prototype, 'scrollTop', 'get').mockImplementation(function (
        this: HTMLElement
      ) {
        return Math.min(tops.get(this) ?? 0, max(this));
      }),
      vi.spyOn(Element.prototype, 'scrollTop', 'set').mockImplementation(function (
        this: HTMLElement,
        v: number
      ) {
        tops.set(this, Math.max(0, Math.min(v, max(this))));
      }),
    ];
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Back to the thread (Esc)' }));
      const section = await screen.findByRole('region', { name: /^Thread Shop · Checkout/ });
      const list = section.querySelector<HTMLElement>('.overflow-y-auto')!;
      await settle();
      expect(max(list)).toBeGreaterThan(0);
      expect(list.scrollTop).toBe(max(list));
    } finally {
      spies.forEach((x) => x.mockRestore());
    }
  });
});

describe('the 40 px zone and coming back (F6, F7)', () => {
  const sleep = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));

  it('F7: a small wheel up while content arrives before its scroll event keeps following', async () => {
    const s = setup();
    await s.ready();
    const { list } = await openMainLog(s);
    fireEvent.wheel(list, { deltaY: -10 });
    list.scrollTop -= 10;
    s.push(...turn(20, at + 20_000, null));
    await settle();
    fireEvent.scroll(list);
    await sleep(400);
    await settle();
    expect(atBottom(list)).toBe(true);
    expect(screen.queryByRole('button', { name: /New messages/ })).toBeNull();
  });

  it('F7: a wheel beyond 40 px with content before its scroll event is never pulled back', async () => {
    const s = setup();
    await s.ready();
    const { list } = await openMainLog(s);
    fireEvent.wheel(list, { deltaY: -100 });
    list.scrollTop -= 100;
    const first = firstVisible(list);
    const before = first.top();
    s.push(...turn(20, at + 20_000, null));
    await settle();
    fireEvent.scroll(list);
    await sleep(400);
    s.push(...turn(21, at + 21_000, null));
    await settle();
    expect(atBottom(list)).toBe(false);
    expect(Math.abs(first.top() - before)).toBeLessThanOrEqual(2);
  });

  it('F6: back on the tab, a scrolled-up log keeps its place (the hidden log read top 0)', async () => {
    const s = setup();
    await s.ready();
    const { list, resize } = await openMainLog(s);
    wheelTo(list, 300);
    const first = firstVisible(list);
    const before = first.top();
    // another tab: the log is hidden (no height) and the browser drops its scroll offset
    s.setActive(false);
    resize(0);
    await settle();
    list.scrollTop = 0;
    fireEvent.scroll(list);
    s.push(...turn(20, at + 20_000, null));
    await settle();
    resize(300);
    s.setActive(true);
    await settle();
    expect(Math.abs(first.top() - before)).toBeLessThanOrEqual(2);
    expect(screen.getByRole('button', { name: /New messages/ })).toBeTruthy();
  });

  it('F6: back on the tab, a log at its end follows what came meanwhile', async () => {
    const s = setup();
    await s.ready();
    const { list, resize } = await openMainLog(s);
    s.setActive(false);
    resize(0);
    await settle();
    s.push(...turn(20, at + 20_000, null));
    await settle();
    resize(300);
    s.setActive(true);
    await settle();
    expect(atBottom(list)).toBe(true);
  });

  it('F6: a reconnect (reset, whole history again) keeps a scrolled-up place', async () => {
    const s = setup();
    await s.ready();
    const { list } = await openMainLog(s);
    wheelTo(list, 300);
    const key = firstVisible(list).row.getAttribute('data-chat-key');
    const before = firstVisible(list).top();
    s.reopen();
    await settle();
    for (let n = 0; n < 12; n++) s.push(...turn(n, at + n * 1000, null));
    await settle();
    const row = list.querySelector(`[data-chat-key="${key}"]`)!;
    expect(row).not.toBeNull();
    expect(Math.abs(row.getBoundingClientRect().top - before)).toBeLessThanOrEqual(2);
  });

  it('N3: a reconnect keeps a scrolled-up place in the thread log too', async () => {
    const s = setup();
    await s.ready();
    const { list } = await openThreadLog(s);
    wheelTo(list, 300);
    const key = firstVisible(list).row.getAttribute('data-chat-key');
    const before = firstVisible(list).top();
    s.reopen();
    // the emptied log: the browser clamps its offset and says so
    fireEvent.scroll(list);
    await settle();
    for (let n = 0; n < 12; n++) s.push(...turn(n, at + n * 1000, T1.tag));
    await settle();
    const row = list.querySelector(`[data-chat-key="${key}"]`);
    expect(row).not.toBeNull();
    expect(Math.abs(row!.getBoundingClientRect().top - before)).toBeLessThanOrEqual(2);
    expect(atBottom(list)).toBe(false);
  });

  it("N3: the browser's reset scroll right after the reader's wheel does not turn on follow", async () => {
    const s = setup();
    await s.ready();
    const { list } = await openMainLog(s);
    // the reader's wheel moments ago (within its 1.5 s), then the reconnect
    wheelTo(list, 300);
    const key = firstVisible(list).row.getAttribute('data-chat-key');
    const before = firstVisible(list).top();
    s.reopen();
    fireEvent.scroll(list);
    await settle();
    for (let n = 0; n < 12; n++) s.push(...turn(n, at + n * 1000, null));
    await settle();
    const row = list.querySelector(`[data-chat-key="${key}"]`);
    expect(row).not.toBeNull();
    expect(Math.abs(row!.getBoundingClientRect().top - before)).toBeLessThanOrEqual(2);
    expect(atBottom(list)).toBe(false);
  });
});
