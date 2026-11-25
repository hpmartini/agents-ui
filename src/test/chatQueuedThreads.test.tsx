// AC-14: a prompt typed while the orchestrator works (Claude's queue log) shows where it goes —
// a thread message or a thread command in its thread, never in the main chat, tag hidden
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import { renderWithAgents, testTransport } from './agents';
import { ChatPane } from '../components/AgentsView/Chat/ChatPane';
import { threadTag, type ChatThread } from '../utils/chatThreads';
import type { ChatHandlers } from '../transport';
import type { AgentSession } from '../types';

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
  displayState: 'working',
};

const at = new Date(2026, 10, 24, 9, 32).getTime();
const TAG = threadTag({ project: 'Answer 09:32', task: 'Report is ready' });
const thread = (extra: Partial<ChatThread> = {}): ChatThread => ({
  id: 't1',
  name: { project: 'Answer 09:32', task: 'Report is ready' },
  tag: TAG,
  createdAt: at,
  readAt: at,
  agents: [],
  closed: false,
  binding: null,
  ...extra,
});

/** Busy orchestrator: one prompt and its running answer, then `events` */
async function mount(t: ChatThread, events: object[]) {
  let push: (e: object) => void = () => {};
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
          fetchThreads: vi.fn(async () => ({ orchestrator: 'o1', threads: [t], tasks: [] })),
          createThread: vi.fn(async () => t),
          updateThread: vi.fn(async () => t),
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
            push = h.onEvent;
            h.onEvent({
              type: 'devorbit_commands',
              commands: [{ name: 'status-report', description: 'Send the full status' }],
            });
            h.onEvent({ type: 'devorbit_user', text: 'Long task', ts: at - 60_000 });
            h.onEvent({
              type: 'assistant',
              message: { id: 'msg_1', content: [{ type: 'text', text: 'Working on it' }] },
            });
            for (const e of events) h.onEvent(e);
            return () => {};
          }),
          fetchChatHistory: vi.fn(),
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
  const aside = screen.getByRole('textbox', { name: 'Reply in thread' }).closest('aside');
  if (!aside) throw new Error('no thread panel');
  return { aside, push: (e: object) => act(() => push(e)) };
}

const queued = () => [...document.querySelectorAll<HTMLElement>('[data-queued]')];
const inMain = (aside: HTMLElement, text: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-queued], [data-chat-key]')].some(
    (el) => !aside.contains(el) && el.textContent?.includes(text)
  );

describe('queued prompts go where they belong (AC-14)', () => {
  it('a thread message typed while busy waits in its thread, without the tag', async () => {
    const { aside, push } = await mount(thread(), [
      { type: 'devorbit_queue', op: 'enqueue', text: `${TAG}\nAnd what did you learn?` },
    ]);
    const [bubble] = queued();
    expect(bubble).toBeTruthy();
    expect(aside.contains(bubble)).toBe(true);
    expect(bubble.textContent).toContain('And what did you learn?');
    expect(bubble.textContent).toContain('waits for the current turn');
    expect(document.body.textContent).not.toContain('[Thread:');
    expect(inMain(aside, 'And what did you learn?')).toBe(false);

    // delivered: the same place in the thread, no longer queued
    push({ type: 'devorbit_queue', op: 'remove', text: `${TAG}\nAnd what did you learn?` });
    push({ type: 'devorbit_user', text: `${TAG}\nAnd what did you learn?`, ts: at + 1000 });
    expect(queued()).toHaveLength(0);
    expect(aside.textContent).toContain('And what did you learn?');
    expect(inMain(aside, 'And what did you learn?')).toBe(false);
    expect(document.body.textContent).not.toContain('[Thread:');
  });

  it('a thread command typed while busy waits in its thread by its mark', async () => {
    // Claude Code logs a queued command's enqueue without its text
    const { aside, push } = await mount(thread({ commands: [{ at, command: '/status-report' }] }), [
      { type: 'devorbit_queue', op: 'enqueue', text: '' },
    ]);
    const [bubble] = queued();
    expect(bubble).toBeTruthy();
    expect(aside.contains(bubble)).toBe(true);
    expect(bubble.textContent).toContain('/status-report');
    expect(bubble.textContent).toContain('waits for the current turn');
    expect(inMain(aside, '/status-report')).toBe(false);

    // taken (its remove carries the text), then logged: in the thread by the same mark
    push({ type: 'devorbit_queue', op: 'remove', text: '/status-report' });
    push({ type: 'devorbit_user', text: '/status-report', ts: at + 1000 });
    expect(queued()).toHaveLength(0);
    expect(aside.querySelector('[data-command]')?.textContent).toBe('/status-report');
    expect(inMain(aside, '/status-report')).toBe(false);
  });

  it('a command placeholder without an open thread mark shows nowhere as a thread item', async () => {
    const { aside } = await mount(
      thread({ commands: [{ at: at - 120_000, command: '/status-report' }] }),
      [
        { type: 'devorbit_user', text: '/status-report', ts: at - 90_000 },
        { type: 'devorbit_queue', op: 'enqueue', text: '' },
      ]
    );
    expect(queued().filter((b) => aside.contains(b))).toHaveLength(0);
  });

  it('a main-chat message typed while busy stays in the main chat', async () => {
    const { aside } = await mount(thread(), [
      { type: 'devorbit_queue', op: 'enqueue', text: 'Main question' },
      { type: 'devorbit_queue', op: 'enqueue', text: '/status-report' },
    ]);
    const bubbles = queued();
    expect(bubbles).toHaveLength(2);
    for (const b of bubbles) expect(aside.contains(b)).toBe(false);
  });
});
