// Threads belong to one orchestrator chat: panes with different sessions never share them
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import { renderWithAgents, testTransport } from './agents';
import { useChatThreads } from '../components/AgentsView/Chat/ChatThreads';
import type { ChatThreadList } from '../transport';

const list = (session: string): ChatThreadList => ({
  orchestrator: session,
  tasks: [],
  threads: [
    {
      id: `t-${session}`,
      tag: `[Thread: ${session} · one]`,
      name: { project: session, task: 'one' },
      createdAt: 1,
      readAt: 1,
      agents: [],
      closed: false,
    },
  ],
});

const Pane: React.FC<{ session: string; testId: string }> = ({ session, testId }) => {
  const { threads } = useChatThreads(session);
  return <div data-testid={testId}>{threads.map((t) => t.id).join(',')}</div>;
};

const threadsApi = (fetchThreads: (session: string) => Promise<ChatThreadList>) => ({
  fetchThreads: vi.fn(fetchThreads),
  createThread: vi.fn(),
  updateThread: vi.fn(),
});

describe('thread state per session', () => {
  it('two panes side by side (split) each list only their own threads', async () => {
    const transport = testTransport({ threads: threadsApi(async (s) => list(s)) });
    renderWithAgents(
      <>
        <Pane session="orch-a" testId="a" />
        <Pane session="orch-b" testId="b" />
      </>,
      { transport }
    );
    await waitFor(() => expect(screen.getByTestId('a').textContent).toBe('t-orch-a'));
    expect(screen.getByTestId('b').textContent).toBe('t-orch-b');
  });

  it('a pane switched to another session drops a late answer for the old one (tab switch)', async () => {
    let resolveA: (l: ChatThreadList) => void = () => {};
    const transport = testTransport({
      threads: threadsApi((s) =>
        s === 'orch-a'
          ? new Promise<ChatThreadList>((r) => (resolveA = r))
          : Promise.resolve(list(s))
      ),
    });
    const { rerender } = renderWithAgents(<Pane session="orch-a" testId="p" />, { transport });
    rerender(<Pane session="orch-b" testId="p" />);
    await waitFor(() => expect(screen.getByTestId('p').textContent).toBe('t-orch-b'));
    await act(async () => resolveA(list('orch-a')));
    expect(screen.getByTestId('p').textContent).toBe('t-orch-b');
  });

  it('a remount (reload) of the same session loads its threads again', async () => {
    const transport = testTransport({ threads: threadsApi(async (s) => list(s)) });
    const { unmount } = renderWithAgents(<Pane session="orch-a" testId="p" />, { transport });
    await waitFor(() => expect(screen.getByTestId('p').textContent).toBe('t-orch-a'));
    unmount();
    renderWithAgents(<Pane session="orch-a" testId="p" />, { transport });
    await waitFor(() => expect(screen.getByTestId('p').textContent).toBe('t-orch-a'));
    expect(transport.threads?.fetchThreads).toHaveBeenLastCalledWith('orch-a');
  });
});
