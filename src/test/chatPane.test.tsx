// Chat pane with threads: attachments stay in their composer, the footer spans the pane, rename goes
// to the host
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithAgents, testTransport } from './agents';
import { ChatPane } from '../components/AgentsView/Chat/ChatPane';
import { useChatThreads } from '../components/AgentsView/Chat/ChatThreads';
import { threadTag, type ChatThread } from '../utils/chatThreads';
import type { ChatHandlers, ChatThreadList } from '../transport';
import type { AgentSession } from '../types';

beforeAll(() => {
  URL.createObjectURL ??= () => 'blob:test';
  URL.revokeObjectURL ??= () => {};
});
afterEach(() => localStorage.clear());

const PANE: AgentSession = {
  id: 'p1',
  sessionId: 's1',
  kind: 'background',
  cwd: '/repo',
  startedAt: 1,
  name: 'orchestrator',
  state: null,
  pinned: false,
  order: null,
  links: [],
  displayState: 'idle',
};

const THREAD: ChatThread = {
  id: 't1',
  name: { project: 'Shop', task: 'Checkout' },
  tag: threadTag({ project: 'Shop', task: 'Checkout' }),
  createdAt: 1,
  readAt: 1,
  agents: [],
  closed: false,
  binding: null,
};

let n = 0;
const shot = () => new File(['png'], `shot-${++n}.png`, { type: 'image/png' });

/** One answer of the orchestrator in the main chat */
const ANSWER = {
  type: 'assistant',
  message: { id: 'msg_1', content: [{ type: 'text', text: '**Stand:** shop is ready' }] },
};

async function mount(
  opts: { list?: Partial<ChatThreadList>; undoTidy?: (s: string) => Promise<ChatThreadList> } = {}
) {
  const updateThread = vi.fn(async () => THREAD);
  const createThread = vi.fn(async () => ({ ...THREAD, id: 't2' }));
  const list: ChatThreadList = { orchestrator: 'o1', threads: [THREAD], tasks: [], ...opts.list };
  const fetchThreads = vi.fn(async () => list);
  renderWithAgents(
    <ChatPane
      pane={PANE}
      agent={PANE}
      sessionId="s1"
      active
      focused
      submitKey="mod+enter"
      showSteps={false}
      onToggleSteps={vi.fn()}
      onFocus={vi.fn()}
      onClose={vi.fn()}
      onShowTerminal={vi.fn()}
    />,
    {
      transport: testTransport({
        threads: {
          fetchThreads,
          createThread,
          updateThread,
          ...(opts.undoTidy ? { undoTidy: opts.undoTidy } : {}),
        },
        chat: {
          openTranscriptView: vi.fn(async () => ({
            id: 'c1',
            harness: 'claude' as const,
            cwd: '/repo',
            name: 'orchestrator',
            sessionId: 's1',
            model: null,
            running: true,
            startedAt: 1,
          })),
          subscribeToChat: vi.fn((_id: string, h: ChatHandlers) => {
            h.onEvent(ANSWER);
            h.onEvent({ type: 'result', subtype: 'success', duration_ms: 1 });
            return () => {};
          }),
          fetchChatHistory: vi.fn(),
        },
        uploads: {
          uploadAttachment: vi.fn(),
          agentImageUrl: () => null,
          attachmentExtensions: ['pdf'],
        },
      }),
    }
  );
  const row = await waitFor(() => {
    const el = document.querySelector<HTMLElement>('[data-thread-row="t1"]');
    if (!el) throw new Error('no thread row yet');
    return el;
  });
  act(() => row.click());
  const threadInput = screen.getByRole('textbox', { name: 'Reply in thread' });
  const aside = threadInput.closest('aside');
  if (!aside) throw new Error('thread composer outside the panel');
  const mainInput = screen.getAllByRole('textbox').find((el) => !aside.contains(el));
  if (!mainInput) throw new Error('no main input');
  return { aside, threadInput, mainInput, updateThread, createThread, fetchThreads };
}

/** Where the attachment named `name` shows: 'thread', 'main', both, or none */
const placesOf = (aside: HTMLElement, name: string) =>
  screen
    .queryAllByRole('img', { name })
    .map((img) => (aside.contains(img) ? 'thread' : 'main'))
    .sort();

const clipboard = (file: File) => ({ clipboardData: { files: [file], types: ['Files'] } });
const dropped = (file: File) => ({ dataTransfer: { files: [file], types: ['Files'] } });
const attachInput = (scope: HTMLElement, inThread: boolean) =>
  [...document.querySelectorAll<HTMLInputElement>('[data-testid="attachment-input"]')].find(
    (el) => scope.contains(el) === inThread
  )!;

describe('attachments stay in their composer', () => {
  it('paste (Cmd+V) in the thread composer: only the thread gets it', async () => {
    const { aside, threadInput } = await mount();
    const file = shot();
    fireEvent.paste(threadInput, clipboard(file));
    expect(placesOf(aside, file.name)).toEqual(['thread']);
  });

  it('drop on the thread composer: only the thread gets it', async () => {
    const { aside, threadInput } = await mount();
    const file = shot();
    fireEvent.drop(threadInput, dropped(file));
    expect(placesOf(aside, file.name)).toEqual(['thread']);
  });

  it('drop elsewhere on the threads panel never lands in the main composer', async () => {
    const { aside } = await mount();
    const file = shot();
    const header = aside.querySelector<HTMLElement>('[data-testid="threads-header"]')!;
    // false: taken, so the window does not open the file instead
    expect(fireEvent.drop(header, dropped(file))).toBe(false);
    expect(placesOf(aside, file.name)).not.toContain('main');
  });

  it('Attach in the thread composer: only the thread gets it', async () => {
    const { aside } = await mount();
    const file = shot();
    fireEvent.change(attachInput(aside, true), { target: { files: [file] } });
    expect(placesOf(aside, file.name)).toEqual(['thread']);
  });

  it('paste, drop and Attach in the main composer: only the main composer gets them', async () => {
    const { aside, mainInput } = await mount();
    const pasted = shot();
    fireEvent.paste(mainInput, clipboard(pasted));
    expect(placesOf(aside, pasted.name)).toEqual(['main']);
    const drop = shot();
    fireEvent.drop(mainInput, dropped(drop));
    expect(placesOf(aside, drop.name)).toEqual(['main']);
    const picked = shot();
    fireEvent.change(attachInput(aside, false), { target: { files: [picked] } });
    expect(placesOf(aside, picked.name)).toEqual(['main']);
  });
});

describe('footer and rename in the pane', () => {
  it('the footer is the last row of the whole pane, below the main chat and the threads panel', async () => {
    const { aside } = await mount();
    const footer = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('[data-chat-footer]');
      if (!el) throw new Error('no footer yet');
      return el;
    });
    const pane = document.querySelector('[data-chat-pane]')!;
    expect(footer.parentElement).toBe(pane);
    const row = [...pane.children].find((el) => el.contains(aside))!;
    expect(row.contains(screen.getByRole('log'))).toBe(true);
    expect(row.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('a rename sends only the new name to the host', async () => {
    const { aside, updateThread } = await mount();
    fireEvent.doubleClick(within(aside).getAllByText('Shop · Checkout')[0]);
    const field = screen.getByRole('textbox', { name: /^Thread name/ });
    fireEvent.change(field, { target: { value: 'Shop · Payment page' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    await waitFor(() =>
      expect(updateThread).toHaveBeenCalledWith('p1', 't1', {
        name: { project: 'Shop', task: 'Payment page' },
      })
    );
  });
});

describe('automatic names, tidy-up overrides and undo', () => {
  it('a thread opened on an answer sends the answer, never a name made of time or words', async () => {
    const { createThread } = await mount();
    const main = screen.getByRole('log');
    fireEvent.click(within(main).getByRole('button', { name: 'Open thread' }));
    await waitFor(() =>
      expect(createThread).toHaveBeenCalledWith('p1', {
        parentKey: 'msg_1',
        answerText: '**Stand:** shop is ready',
      })
    );
  });

  it('an unbound thread shows no "Not bound" line', async () => {
    const { aside } = await mount();
    expect(aside.textContent).not.toContain('Not bound');
  });

  it('an answer moved by the orchestrator shows in its thread, not in the main chat', async () => {
    const { aside } = await mount({
      list: { overrides: { entries: { msg_1: 't1' }, merged: {} } },
    });
    await waitFor(() => expect(aside.textContent).toContain('shop is ready'));
    expect(screen.getByRole('log').textContent).not.toContain('shop is ready');
  });

  it('Undo tidy-up calls the host and shows the list it returns', async () => {
    const undoTidy = vi.fn(async () => ({ orchestrator: 'o1', threads: [THREAD], tasks: [] }));
    await mount({ list: { canUndo: true }, undoTidy });
    fireEvent.click(await screen.findByRole('button', { name: 'Undo tidy-up' }));
    await waitFor(() => expect(undoTidy).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Undo tidy-up' })).toBeNull());
  });

  it('no Undo tidy-up when the host has no undo', async () => {
    await mount({ list: { canUndo: true } });
    expect(screen.queryByRole('button', { name: 'Undo tidy-up' })).toBeNull();
  });

  // `orkumo thread open` must show within 3 s of the CLI call, the CLI itself takes ~0.5 s
  it('an active pane polls the threads every 2 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { fetchThreads } = await mount();
      const before = fetchThreads.mock.calls.length;
      await act(async () => {
        vi.advanceTimersByTime(2_100);
      });
      expect(fetchThreads.mock.calls.length).toBeGreaterThan(before);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('live threads poll', () => {
  it('an unchanged poll keeps the same list (no regroup, no scroll jump)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const seen: unknown[] = [];
      const fetchThreads = vi.fn(async () => ({
        orchestrator: 'o1',
        threads: [THREAD],
        tasks: [],
      }));
      const Probe = () => {
        const list = useChatThreads('p1', true).threads;
        if (seen.at(-1) !== list) seen.push(list);
        return null;
      };
      renderWithAgents(<Probe />, {
        transport: testTransport({
          threads: { fetchThreads, createThread: vi.fn(), updateThread: vi.fn() },
        }),
      });
      await waitFor(() => expect(fetchThreads).toHaveBeenCalledTimes(1));
      const loaded = seen.length;
      await act(async () => {
        vi.advanceTimersByTime(6_100);
      });
      expect(fetchThreads.mock.calls.length).toBeGreaterThanOrEqual(3);
      expect(seen.length).toBe(loaded);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('threads list after an orchestrator change', () => {
  it('a poll saying the session is no orchestrator any more takes the panel away', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let orchestrator: string | null = 'o1';
      const fetchThreads = vi.fn(async () => ({ orchestrator, threads: [THREAD], tasks: [] }));
      let enabled: boolean[] = [];
      const Probe = () => {
        enabled = [...enabled, useChatThreads('p1', true).enabled];
        return null;
      };
      renderWithAgents(<Probe />, {
        transport: testTransport({
          threads: { fetchThreads, createThread: vi.fn(), updateThread: vi.fn() },
        }),
      });
      await waitFor(() => expect(enabled.at(-1)).toBe(true));
      orchestrator = null;
      await act(async () => {
        vi.advanceTimersByTime(3_100);
      });
      await waitFor(() => expect(enabled.at(-1)).toBe(false));
    } finally {
      vi.useRealTimers();
    }
  });
});
