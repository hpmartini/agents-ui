// H-6: the maximised threads panel lists the orchestrator's status tasks and shows an entry's
// details (the host's Status view) in its main area, without leaving maximisation
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithAgents } from './agents';
import { threadTag, type ChatThread } from '../utils/chatThreads';
import { ThreadsPanel } from '../components/AgentsView/Chat/ChatThreads';
import type { ChatThreadTask } from '../transport';

afterEach(() => localStorage.clear());

const thread = (id: string, extra: Partial<ChatThread> = {}): ChatThread => ({
  id,
  name: { project: 'Shop', task: `Task ${id}` },
  tag: threadTag({ project: 'Shop', task: `Task ${id}` }),
  binding: null,
  parentKey: null,
  createdAt: 1,
  readAt: 1,
  agents: [],
  closed: false,
  repo: null,
  summary: null,
  ...extra,
});

const TASKS: ChatThreadTask[] = [
  {
    project: 'shop',
    projectName: 'Shop',
    task: 'checkout',
    title: 'Checkout flow',
    state: 'running',
    repo: 'me/shop',
  },
  {
    project: 'site',
    projectName: 'Website',
    task: 'hero',
    title: 'New hero',
    state: 'waiting',
    repo: null,
  },
];

const panel = (props: Partial<React.ComponentProps<typeof ThreadsPanel>> = {}) => {
  const onShowStatus = vi.fn();
  const onCloseStatus = vi.fn();
  const onMaximize = vi.fn();
  const view = renderWithAgents(
    <ThreadsPanel
      status="ready"
      threads={[thread('t1', { binding: { project: 'shop', task: 'checkout' } })]}
      tasks={TASKS}
      byThread={new Map()}
      openId="t1"
      onOpen={vi.fn()}
      onRetry={vi.fn()}
      onNewTask={vi.fn()}
      onNewFree={vi.fn()}
      onClose={vi.fn()}
      renderThread={() => <textarea aria-label="thread input" />}
      maximized
      onMaximize={onMaximize}
      onHide={vi.fn()}
      onShowStatus={onShowStatus}
      onCloseStatus={onCloseStatus}
      {...props}
    />
  );
  return { ...view, onShowStatus, onCloseStatus, onMaximize };
};

describe('status list in the maximised threads panel', () => {
  it('lists title, project and state of every report task, only when maximised', () => {
    const { unmount } = panel({ maximized: false });
    expect(screen.queryByRole('list', { name: 'Status' })).toBeNull();
    unmount();
    panel();
    const list = screen.getByRole('list', { name: 'Status' });
    const rows = within(list).getAllByRole('button');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Checkout flow');
    expect(rows[0]).toHaveTextContent('Shop');
    expect(rows[0]).toHaveTextContent('running');
    expect(rows[1]).toHaveTextContent('New hero');
    expect(rows[1]).toHaveTextContent('Website');
    expect(rows[1]).toHaveTextContent('waiting for you');
  });

  it('shows below the thread list, also when there is no thread yet', () => {
    panel({ threads: [], openId: null });
    expect(screen.getByRole('list', { name: 'Status' })).toBeInTheDocument();
  });

  it('needs a host that shows status details', () => {
    panel({ onShowStatus: undefined });
    expect(screen.queryByRole('list', { name: 'Status' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show in Status' })).toBeNull();
  });

  it('a click asks for the entry details; the shown entry is marked', () => {
    const { onShowStatus, onMaximize } = panel({
      statusTask: { project: 'site', task: 'hero' },
      statusView: <div data-testid="host-status">details</div>,
    });
    const rows = within(screen.getByRole('list', { name: 'Status' })).getAllByRole('button');
    fireEvent.click(rows[0]);
    expect(onShowStatus).toHaveBeenCalledWith({ project: 'shop', task: 'checkout' });
    expect(rows[1]).toHaveAttribute('aria-current', 'true');
    expect(onMaximize).not.toHaveBeenCalled();
  });

  it('the details take the main area in place of the open thread, the lists stay', () => {
    panel({
      statusTask: { project: 'site', task: 'hero' },
      statusView: <div data-testid="host-status">details</div>,
    });
    const region = screen.getByRole('region', { name: 'Status · New hero' });
    expect(within(region).getByTestId('host-status')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'thread input' })).toBeNull();
    expect(screen.getByRole('list', { name: 'Status' })).toBeInTheDocument();
    expect(document.querySelector('[data-threads-maximized]')).not.toBeNull();
  });

  it('"Show in Status" in a bound thread asks for its task; an unbound thread has none', () => {
    const { onShowStatus, unmount } = panel();
    fireEvent.click(screen.getByRole('button', { name: 'Show in Status' }));
    expect(onShowStatus).toHaveBeenCalledWith({ project: 'shop', task: 'checkout' });
    unmount();
    panel({ threads: [thread('t1')] });
    expect(screen.queryByRole('button', { name: 'Show in Status' })).toBeNull();
  });

  it('Esc and Back return to the thread; maximisation stays', () => {
    const { onCloseStatus, onMaximize } = panel({
      statusTask: { project: 'site', task: 'hero' },
      statusView: <button type="button">inside</button>,
    });
    fireEvent.keyDown(screen.getByRole('button', { name: 'inside' }), { key: 'Escape' });
    expect(onCloseStatus).toHaveBeenCalledTimes(1);
    expect(onMaximize).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the thread (Esc)' }));
    expect(onCloseStatus).toHaveBeenCalledTimes(2);
  });

  it('an Esc the host view took itself does not restore the panel either', () => {
    const { onCloseStatus, onMaximize } = panel({
      statusView: (
        <div
          role="presentation"
          onKeyDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button type="button">inside</button>
        </div>
      ),
    });
    fireEvent.keyDown(screen.getByRole('button', { name: 'inside' }), { key: 'Escape' });
    expect(onCloseStatus).not.toHaveBeenCalled();
    expect(onMaximize).not.toHaveBeenCalled();
  });

  it('a short pane with the sidebar off shows only the details, Back brings the lists', () => {
    // jsdom has no layout: the short state comes from the panel's height
    const height = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300);
    const observers: ResizeObserverCallback[] = [];
    const Original = global.ResizeObserver;
    global.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        observers.push(cb);
      }
      observe() {
        observers.forEach((cb) => cb([], this as unknown as ResizeObserver));
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    try {
      panel({
        statusTask: { project: 'site', task: 'hero' },
        statusView: <div data-testid="host-status">details</div>,
      });
      expect(screen.getByTestId('host-status')).toBeInTheDocument();
      expect(screen.queryByRole('list', { name: 'Status' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Back to the thread (Esc)' })).toBeInTheDocument();
    } finally {
      height.mockRestore();
      global.ResizeObserver = Original;
    }
  });
});
