// Chat pane with threads: attachments stay in their composer, the footer spans the pane, rename goes
// to the host
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithAgents, testTransport } from './agents';
import { ChatPane } from '../components/AgentsView/Chat/ChatPane';
import { threadTag, type ChatThread } from '../utils/chatThreads';
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

async function mount() {
  const updateThread = vi.fn(async () => THREAD);
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
          fetchThreads: vi.fn(async () => ({ orchestrator: 'o1', threads: [THREAD], tasks: [] })),
          createThread: vi.fn(),
          updateThread,
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
          subscribeToChat: vi.fn(() => () => {}),
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
  return { aside, threadInput, mainInput, updateThread };
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
