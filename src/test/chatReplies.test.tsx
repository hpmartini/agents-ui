// Reply quotes on answers, the threads panel and its resize handle
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithAgents } from './agents';
import { groupAnswers, type ChatAnswer, type ChatMessage } from '../utils/chatEvents';
import { quoteHeader, threadTag, type ChatThread } from '../utils/chatThreads';
import {
  ChatItemView,
  ChatRepliesContext,
  type ChatReplies,
} from '../components/AgentsView/Chat/ChatMessages';
import { ThreadsPanel } from '../components/AgentsView/Chat/ChatThreads';
import { ResizeHandle, useStoredWidth } from '../ResizeHandle';

const at = new Date(2026, 10, 24, 9, 32).getTime();
const answerOf = (text: string, ts = at): ChatAnswer =>
  groupAnswers([
    { kind: 'assistant', key: 'a1', streaming: false, ts, blocks: [{ type: 'text', text }] },
  ] satisfies ChatMessage[])[0] as ChatAnswer;

const renderAnswer = (answer: ChatAnswer, replies: ChatReplies) =>
  renderWithAgents(
    <ChatRepliesContext.Provider value={replies}>
      <ChatItemView item={answer} showSteps={false} harness="omp" model={null} />
    </ChatRepliesContext.Provider>
  );

describe('reply on an answer', () => {
  it('quotes the first lines with the answer time', () => {
    const reply = vi.fn();
    renderAnswer(answerOf('Line one\nLine two\nLine three\nLine four'), { reply });
    expect(screen.getByText('09:32')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    expect(reply).toHaveBeenCalledWith({ ts: at, text: 'Line one\nLine two\nLine three…' });
  });

  it('quotes only the selected text when there is a selection in the answer', () => {
    const reply = vi.fn();
    const { container } = renderAnswer(answerOf('Alpha beta gamma'), { reply });
    const textNode = screen.getByText('Alpha beta gamma').firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 6);
    range.setEnd(textNode, 10);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    fireEvent.mouseUp(container.querySelector('article') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Reply to selection' }));
    expect(reply).toHaveBeenCalledWith({ ts: at, text: 'beta' });
  });

  it('no actions without a provider; Open thread only where threads exist', () => {
    const { unmount } = renderWithAgents(
      <ChatItemView item={answerOf('x')} showSteps={false} harness="omp" model={null} />
    );
    expect(screen.queryByRole('button', { name: 'Reply' })).toBeNull();
    unmount();
    const openThread = vi.fn();
    renderAnswer(answerOf('x'), { reply: vi.fn(), openThread });
    fireEvent.click(screen.getByRole('button', { name: 'Open thread' }));
    expect(openThread).toHaveBeenCalledWith(expect.objectContaining({ kind: 'answer' }));
  });

  it('a sent reply shows its quote above the text', () => {
    renderWithAgents(
      <ChatItemView
        item={{ kind: 'user', key: 'u1', text: `${quoteHeader(at, 'Plan A')}Go ahead` }}
        showSteps={false}
        harness="omp"
        model={null}
      />
    );
    expect(screen.getByText('Reply to 09:32:', { exact: false })).toBeTruthy();
    expect(screen.getByText('Plan A')).toBeTruthy();
    expect(screen.getByText('Go ahead')).toBeTruthy();
  });

  it('inside a thread the tag line is hidden', () => {
    const tag = threadTag({ project: 'Shop', task: 'Checkout' });
    renderWithAgents(
      <ChatRepliesContext.Provider value={{ reply: vi.fn(), tag }}>
        <ChatItemView
          item={answerOf(`${tag}\nForm is done.`)}
          showSteps={false}
          harness="omp"
          model={null}
        />
      </ChatRepliesContext.Provider>
    );
    expect(screen.queryByText(tag, { exact: false })).toBeNull();
    expect(screen.getByText('Form is done.')).toBeTruthy();
  });
});

const thread = (id: string, extra: Partial<ChatThread> = {}): ChatThread => ({
  id,
  tag: threadTag({ project: 'Shop', task: `Task ${id}` }),
  name: { project: 'Shop', task: `Task ${id}` },
  createdAt: at,
  readAt: at,
  agents: [],
  closed: false,
  repo: 'example-org/shop',
  summary: 'Form is done · #42',
  ...extra,
});

const panel = (props: Partial<React.ComponentProps<typeof ThreadsPanel>> = {}) =>
  renderWithAgents(
    <ThreadsPanel
      status="ready"
      threads={[]}
      tasks={[]}
      byThread={new Map()}
      openId={null}
      onOpen={vi.fn()}
      onRetry={vi.fn()}
      onNewTask={vi.fn()}
      onNewFree={vi.fn()}
      onClose={vi.fn()}
      renderThread={() => null}
      maximized={false}
      onMaximize={vi.fn()}
      onHide={vi.fn()}
      {...props}
    />
  );

describe('threads panel', () => {
  it('loading, error with retry, empty', () => {
    const { unmount } = panel({ status: 'loading' });
    expect(screen.getByText('Loading threads…')).toBeTruthy();
    unmount();
    const onRetry = vi.fn();
    const { unmount: u2 } = panel({ status: 'error', onRetry });
    expect(screen.getByRole('alert').textContent).toContain('Threads could not be loaded');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    u2();
    panel();
    expect(screen.getByText('No threads yet')).toBeTruthy();
  });

  it('lists name, repo, summary, first message and unread; closed ones apart', () => {
    const t1 = thread('t1', { readAt: at });
    const msgs = groupAnswers([
      { kind: 'user', key: 'u1', ts: at - 1, text: `${t1.tag}\nHow far is the form?` },
      {
        kind: 'assistant',
        key: 'a1',
        ts: at + 60_000,
        streaming: false,
        blocks: [{ type: 'text', text: `${t1.tag}\nDone.` }],
      },
    ]);
    panel({ threads: [t1, thread('t2', { closed: true })], byThread: new Map([['t1', msgs]]) });
    const row = screen.getByRole('button', { name: /Shop · Task t1/ });
    expect(row.textContent).toContain('example-org/shop');
    expect(row.textContent).toContain('Form is done · #42');
    expect(row.textContent).toContain('How far is the form?');
    expect(row.textContent).toContain('1 new');
    expect(screen.getByText('Closed (1)')).toBeTruthy();
  });

  it('a bound thread whose report task has no repo is not shown as unbound', () => {
    panel({
      threads: [
        thread('t1', { repo: null, binding: { project: 'shop', task: 't1' } }),
        thread('t2', { repo: null, binding: null }),
      ],
    });
    expect(screen.getByRole('button', { name: /Task t1/ }).textContent).not.toContain('Not bound');
    expect(screen.getByRole('button', { name: /Task t2/ }).textContent).toContain('Not bound');
  });

  it('new thread: bind to a report task or start without one', () => {
    const onNewTask = vi.fn();
    panel({
      onNewTask,
      tasks: [
        {
          project: 'shop',
          projectName: 'Shop',
          task: 'co',
          title: 'Checkout',
          repo: 'example-org/shop',
        },
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: 'New thread' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Checkout/ }));
    expect(onNewTask).toHaveBeenCalledWith({ project: 'shop', task: 'co' });
  });
});

describe('resize handle', () => {
  it('double click resets to the default width', () => {
    const onReset = vi.fn();
    renderWithAgents(
      <ResizeHandle
        width={500}
        min={260}
        max={640}
        onChange={vi.fn()}
        onReset={onReset}
        edge="left"
        label="Resize"
      />
    );
    fireEvent.doubleClick(screen.getByRole('separator'));
    expect(onReset).toHaveBeenCalled();
  });

  it('left edge: arrow left widens, clamped to min and max; Home/End jump there', () => {
    const onChange = vi.fn();
    const handle = (width: number) =>
      renderWithAgents(
        <ResizeHandle width={width} min={260} max={640} onChange={onChange} edge="left" label="R" />
      );
    const { unmount } = handle(500);
    const sep = screen.getByRole('separator');
    fireEvent.keyDown(sep, { key: 'ArrowLeft' });
    fireEvent.keyDown(sep, { key: 'ArrowRight' });
    fireEvent.keyDown(sep, { key: 'Home' });
    fireEvent.keyDown(sep, { key: 'End' });
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([516, 484, 260, 640]);
    unmount();
    onChange.mockClear();
    handle(636);
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(640);
  });

  it('has its grab area and col-resize cursor without the package stylesheet (hosts that skip it)', () => {
    renderWithAgents(
      <ResizeHandle width={360} min={260} max={640} onChange={vi.fn()} edge="left" label="R" />
    );
    const sep = screen.getByRole('separator');
    expect(parseFloat(sep.style.width)).toBeGreaterThanOrEqual(7);
    expect(sep.style.cursor).toBe('col-resize');
    expect(sep.style.touchAction).toBe('none');
    // the visible line, accented on hover
    const line = sep.firstElementChild as HTMLElement;
    const idle = line.style.background;
    fireEvent.pointerEnter(sep);
    expect(line.style.background).not.toBe(idle);
  });

  it('pointer drag on the left edge: dragging left widens, clamped at max', () => {
    const onChange = vi.fn();
    renderWithAgents(
      <ResizeHandle width={360} min={260} max={640} onChange={onChange} edge="left" label="R" />
    );
    const sep = screen.getByRole('separator');
    fireEvent.pointerDown(sep, { clientX: 1000, button: 0, pointerId: 1 });
    fireEvent.pointerMove(sep, { clientX: 900, pointerId: 1 });
    fireEvent.pointerMove(sep, { clientX: 500, pointerId: 1 });
    fireEvent.pointerUp(sep, { clientX: 500, pointerId: 1 });
    fireEvent.pointerMove(sep, { clientX: 1200, pointerId: 1 });
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([460, 640]);
  });

  it('the stored width survives a remount and is clamped', () => {
    localStorage.setItem('test:w', '9999');
    const Box = () => {
      const [w] = useStoredWidth('test:w', 360, 260, 640);
      return <output>{w}</output>;
    };
    renderWithAgents(<Box />);
    expect(screen.getByRole('status').textContent).toBe('640');
  });
});
