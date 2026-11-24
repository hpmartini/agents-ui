// Thread composer = the main composer (send key, height, `@` files); maximised threads panel
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithAgents, testTransport } from './agents';
import { threadTag, type ChatThread } from '../utils/chatThreads';
import {
  THREAD_COMPOSER_HEIGHT_KEY,
  THREADS_SIDEBAR_KEY,
  ThreadComposer,
  ThreadsPanel,
} from '../components/AgentsView/Chat/ChatThreads';
import { CHAT_COMPOSER_HEIGHT_KEY } from '../components/AgentsView/Chat/ChatComposer';
import { groupAnswers } from '../utils/chatEvents';
import type { ChatSubmitKey } from '../utils/chatEvents';

afterEach(() => localStorage.clear());

const composer = (
  submitKey: ChatSubmitKey,
  onSend = vi.fn(async () => true),
  transport = testTransport()
) => {
  renderWithAgents(
    <ThreadComposer
      chatId="c1"
      submitKey={submitKey}
      history={[]}
      agents={[]}
      quote={null}
      onClearQuote={vi.fn()}
      onSend={onSend}
    />,
    { transport }
  );
  return { onSend, input: screen.getByRole('textbox', { name: 'Reply in thread' }) };
};

describe('thread composer is the main composer', () => {
  it('mod+enter setting: Enter does not send, Cmd+Enter and Ctrl+Enter do', async () => {
    const { onSend, input } = composer('mod+enter');
    fireEvent.change(input, { target: { value: 'first line' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    expect((input as HTMLTextAreaElement).placeholder).toContain('Cmd/Ctrl+Enter sends');
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('first line', []));
    fireEvent.change(input, { target: { value: 'again' } });
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(2));
  });

  it('enter setting: Enter sends, Shift+Enter does not', async () => {
    const { onSend, input } = composer('enter');
    fireEvent.change(input, { target: { value: 'hi' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('hi', []));
  });

  it('has the height grip; its height is stored apart from the main input', () => {
    composer('mod+enter');
    const grip = screen.getByRole('separator', { name: /Resize input/ });
    fireEvent.keyDown(grip, { key: 'ArrowUp' });
    expect(Number(localStorage.getItem(THREAD_COMPOSER_HEIGHT_KEY))).toBeGreaterThan(0);
    expect(localStorage.getItem(CHAT_COMPOSER_HEIGHT_KEY)).toBeNull();
  });

  it('`@` lists the files of the chat', async () => {
    const fetchChatFiles = vi.fn(async () => ['src/app.ts']);
    const transport = testTransport({
      chat: {
        openTranscriptView: vi.fn(),
        subscribeToChat: vi.fn(() => () => {}),
        fetchChatHistory: vi.fn(),
        fetchChatFiles,
      },
    });
    const { input } = composer('mod+enter', undefined, transport);
    fireEvent.change(input, { target: { value: '@ap', selectionStart: 3 } });
    expect(await screen.findByRole('option', { name: /src\/app\.ts/ })).toBeTruthy();
    expect(fetchChatFiles).toHaveBeenCalledWith('c1', 'ap');
  });
});

const at = new Date(2026, 10, 24, 9, 32).getTime();
const thread = (id: string, extra: Partial<ChatThread> = {}): ChatThread => ({
  id,
  name: { project: 'Shop', task: `Task ${id}` },
  tag: threadTag({ project: 'Shop', task: `Task ${id}` }),
  binding: null,
  parentKey: null,
  createdAt: at,
  readAt: at - 1,
  agents: [],
  closed: false,
  repo: null,
  summary: null,
  ...extra,
});

const panel = (props: Partial<React.ComponentProps<typeof ThreadsPanel>> = {}) => {
  const t1 = thread('t1');
  const items = groupAnswers([
    { kind: 'user', key: 'u1', ts: at, text: `${t1.tag}\nHow far?` },
    {
      kind: 'assistant',
      key: 'a1',
      ts: at + 1,
      streaming: false,
      blocks: [{ type: 'text', text: 'Done.' }],
    },
  ]);
  const onMaximize = vi.fn();
  const onHide = vi.fn();
  const onOpen = vi.fn();
  const view = renderWithAgents(
    <ThreadsPanel
      status="ready"
      threads={[t1, thread('t2')]}
      tasks={[]}
      byThread={new Map([['t1', items]])}
      openId="t1"
      onOpen={onOpen}
      onRetry={vi.fn()}
      onNewTask={vi.fn()}
      onNewFree={vi.fn()}
      onClose={vi.fn()}
      renderThread={() => <textarea aria-label="thread input" />}
      maximized={false}
      onMaximize={onMaximize}
      onHide={onHide}
      {...props}
    />
  );
  return { ...view, onMaximize, onHide, onOpen };
};

describe('maximised threads panel', () => {
  it('the header button maximises and restores; its title names the shortcut', () => {
    const { onMaximize, rerender } = panel();
    const max = screen.getByRole('button', { name: 'Maximize threads' });
    expect(max.getAttribute('title')).toMatch(/Shift\+M|⇧M/);
    fireEvent.click(max);
    expect(onMaximize).toHaveBeenCalledWith(true);
    rerender(
      <ThreadsPanel
        status="ready"
        threads={[thread('t1')]}
        tasks={[]}
        byThread={new Map()}
        openId="t1"
        onOpen={vi.fn()}
        onRetry={vi.fn()}
        onNewTask={vi.fn()}
        onNewFree={vi.fn()}
        onClose={vi.fn()}
        renderThread={() => null}
        maximized
        onMaximize={onMaximize}
        onHide={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Restore threads' }));
    expect(onMaximize).toHaveBeenLastCalledWith(false);
  });

  it('Esc restores; an Esc that closed the new-thread menu does not', () => {
    const { onMaximize } = panel({ maximized: true });
    fireEvent.click(screen.getByRole('button', { name: 'New thread' }));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onMaximize).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'thread input' }), { key: 'Escape' });
    expect(onMaximize).toHaveBeenCalledWith(false);
  });

  it('count and unread stay in the header, maximised or not', () => {
    panel();
    const header = screen.getByTestId('threads-header');
    expect(header.textContent).toContain('2');
    expect(header.textContent).toContain('1 new');
  });

  it('sidebar: only when maximised, toggles the list to the left and is remembered', () => {
    const { unmount } = panel();
    expect(screen.queryByRole('button', { name: 'Thread list on the left' })).toBeNull();
    unmount();
    const second = panel({ maximized: true });
    const side = screen.getByRole('button', { name: 'Thread list on the left' });
    expect(side.getAttribute('aria-pressed')).toBe('false');
    act(() => side.click());
    expect(side.getAttribute('aria-pressed')).toBe('true');
    expect(
      document.querySelector('[data-threads-layout]')?.getAttribute('data-threads-layout')
    ).toBe('sidebar');
    expect(localStorage.getItem(THREADS_SIDEBAR_KEY)).toBe('1');
    second.unmount();
    panel({ maximized: true });
    expect(
      screen.getByRole('button', { name: 'Thread list on the left' }).getAttribute('aria-pressed')
    ).toBe('true');
  });

  it('the header hides the panel; the thread header goes back to the list, named apart', () => {
    const { onHide, onOpen } = panel();
    fireEvent.click(screen.getByRole('button', { name: 'Hide threads panel' }));
    expect(onHide).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the list (thread stays open)' }));
    expect(onOpen).toHaveBeenCalledWith(null);
    expect(screen.getByRole('button', { name: 'Close thread' })).toBeTruthy();
  });
});
