// Thread composer = the main composer (send key, height, `@` files); maximised threads panel
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
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
      onRename={vi.fn()}
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
        onRename={vi.fn()}
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

  it('sidebar: only when maximised, on by default; switching it off is remembered', () => {
    const layout = () =>
      document.querySelector('[data-threads-layout]')?.getAttribute('data-threads-layout');
    const { unmount } = panel();
    expect(screen.queryByRole('button', { name: 'Thread list on the left' })).toBeNull();
    expect(layout()).toBe('top');
    unmount();
    const second = panel({ maximized: true });
    const side = screen.getByRole('button', { name: 'Thread list on the left' });
    expect(side.getAttribute('aria-pressed')).toBe('true');
    expect(layout()).toBe('sidebar');
    act(() => side.click());
    expect(side.getAttribute('aria-pressed')).toBe('false');
    expect(layout()).toBe('top');
    expect(localStorage.getItem(THREADS_SIDEBAR_KEY)).toBe('0');
    second.unmount();
    const third = panel({ maximized: true });
    expect(
      screen.getByRole('button', { name: 'Thread list on the left' }).getAttribute('aria-pressed')
    ).toBe('false');
    act(() => screen.getByRole('button', { name: 'Thread list on the left' }).click());
    third.unmount();
    panel({ maximized: true });
    expect(layout()).toBe('sidebar');
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

describe('rename a thread', () => {
  const field = () => screen.getByRole('textbox', { name: /^Thread name/ }) as HTMLInputElement;
  const listTitle = (id: string) =>
    document.querySelector(`[data-thread-row="${id}"]`)!.querySelector('span > span')!;

  it('double-click on a list title: Enter saves the new name, the row does not toggle', () => {
    const onRename = vi.fn();
    const { onOpen } = panel({ onRename });
    const row = document.querySelector<HTMLElement>('[data-thread-row="t2"]')!;
    fireEvent.click(row, { detail: 1 });
    fireEvent.click(row, { detail: 2 });
    expect(onOpen).toHaveBeenCalledTimes(1);
    fireEvent.doubleClick(listTitle('t2'));
    expect(field().value).toBe('Shop · Task t2');
    fireEvent.change(field(), { target: { value: 'Payment page' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onRename).toHaveBeenCalledWith('t2', { project: 'Shop', task: 'Payment page' });
    expect(screen.queryByRole('textbox', { name: /^Thread name/ })).toBeNull();
  });

  it("double-click on the open thread's list title keeps it open", () => {
    const { onOpen } = panel();
    const row = document.querySelector<HTMLElement>('[data-thread-row="t1"]')!;
    fireEvent.click(row, { detail: 1 });
    fireEvent.click(row, { detail: 2 });
    fireEvent.doubleClick(listTitle('t1'));
    expect(onOpen).toHaveBeenLastCalledWith('t1');
    expect(field().value).toBe('Shop · Task t1');
  });

  it('"Project · Task" sets both parts; leaving the field saves', () => {
    const onRename = vi.fn();
    panel({ onRename });
    fireEvent.doubleClick(listTitle('t1'));
    fireEvent.change(field(), { target: { value: '  Infra  ·  Deploy ' } });
    fireEvent.blur(field());
    expect(onRename).toHaveBeenCalledWith('t1', { project: 'Infra', task: 'Deploy' });
  });

  it('Esc cancels with the old name back and keeps the maximised panel; empty or same name saves nothing', () => {
    const onRename = vi.fn();
    const { onMaximize } = panel({ onRename, maximized: true });
    fireEvent.doubleClick(listTitle('t1'));
    fireEvent.change(field(), { target: { value: 'Something else' } });
    fireEvent.keyDown(field(), { key: 'Escape' });
    expect(onMaximize).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: /^Thread name/ })).toBeNull();
    expect(listTitle('t1').textContent).toBe('Shop · Task t1');
    fireEvent.doubleClick(listTitle('t1'));
    fireEvent.change(field(), { target: { value: '   ' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    fireEvent.doubleClick(listTitle('t1'));
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onRename).not.toHaveBeenCalled();
  });

  it('"Rename" in the menu of the open thread header and of a list row', () => {
    const onRename = vi.fn();
    panel({ onRename });
    const menus = screen.getAllByRole('button', { name: 'Thread actions' });
    // two list rows and the open thread's header
    expect(menus).toHaveLength(3);
    fireEvent.click(menus[2]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
    expect(field().value).toBe('Shop · Task t1');
    fireEvent.change(field(), { target: { value: 'Shop · Renamed' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onRename).toHaveBeenLastCalledWith('t1', { project: 'Shop', task: 'Renamed' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Thread actions' })[1]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
    expect(field().value).toBe('Shop · Task t2');
  });

  it('double-click on the open thread header title opens the field there', () => {
    panel();
    const header = screen.getByRole('region', { name: /Shop · Task t1/ });
    fireEvent.doubleClick(within(header).getByText('Shop · Task t1'));
    expect(header.contains(field())).toBe(true);
  });
});

describe('thread draft', () => {
  const mount = (draftKey: string) =>
    renderWithAgents(
      <ThreadComposer
        chatId="draft-chat"
        draftKey={draftKey}
        submitKey="mod+enter"
        history={[]}
        agents={[]}
        quote={null}
        onClearQuote={vi.fn()}
        onSend={vi.fn(async () => true)}
      />
    );
  const input = () =>
    screen.getByRole('textbox', { name: 'Reply in thread' }) as HTMLTextAreaElement;

  it('survives hiding the panel (composer unmounted) and stays with its thread', () => {
    const first = mount('t1');
    fireEvent.change(input(), { target: { value: 'unsent reply' } });
    first.unmount();
    const again = mount('t1');
    expect(input().value).toBe('unsent reply');
    again.unmount();
    mount('t2');
    expect(input().value).toBe('');
  });

  it('a send that finishes after switching threads clears only the sent thread', async () => {
    let finish: (ok: boolean) => void = () => {};
    const onSend = vi.fn(() => new Promise<boolean>((resolve) => (finish = resolve)));
    const view = (draftKey: string) => (
      <ThreadComposer
        chatId="send-chat"
        draftKey={draftKey}
        submitKey="mod+enter"
        history={[]}
        agents={[]}
        quote={null}
        onClearQuote={vi.fn()}
        onSend={onSend}
      />
    );
    const { rerender } = renderWithAgents(view('a'));
    fireEvent.change(input(), { target: { value: 'to a' } });
    fireEvent.keyDown(input(), { key: 'Enter', metaKey: true });
    rerender(view('b'));
    fireEvent.change(input(), { target: { value: 'typing in b' } });
    await act(async () => finish(true));
    expect(input().value).toBe('typing in b');
    rerender(view('a'));
    expect(input().value).toBe('');
  });
});
