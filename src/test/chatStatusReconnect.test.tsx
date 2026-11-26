// Item 8 (threads v3 review 2): after a server restart the status line must not poll the old
// chat id (404): it waits while the stream is down and follows the view opened again
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderWithAgents, testTransport } from './agents';
import { ChatPane } from '../components/AgentsView/Chat/ChatPane';
import type { ChatHandlers, ChatStatus } from '../transport';
import type { AgentSession } from '../types';

afterEach(() => vi.useRealTimers());

const PANE: AgentSession = {
  id: 'p1',
  sessionId: 's1',
  kind: 'background',
  cwd: '/repo',
  startedAt: 1,
  name: 'agent',
  state: null,
  pinned: false,
  order: null,
  links: [],
  displayState: 'idle',
};
const STATUS: ChatStatus = { git: null, cache: null, context: null, limits: null };

describe('status line across a server restart (item 8)', () => {
  it('pauses while the stream is down and polls only the reopened view', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    let handlers: ChatHandlers | null = null;
    let views = 0;
    const fetchChatStatus = vi.fn(async (_id: string) => STATUS);
    const openTranscriptView = vi.fn(async () => ({
      id: `c${++views}`,
      harness: 'claude' as const,
      cwd: '/repo',
      name: 'agent',
      sessionId: 's1',
      model: null,
      running: true,
      startedAt: 1,
    }));
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
          chat: {
            openTranscriptView,
            fetchChatStatus,
            subscribeToChat: vi.fn((_id: string, h: ChatHandlers) => {
              handlers = h;
              h.onOpen();
              return () => {};
            }),
            fetchChatHistory: vi.fn(),
          },
        }),
      }
    );
    await waitFor(() => expect(fetchChatStatus).toHaveBeenCalledWith('c1'));
    // the server goes away: the stream says so
    act(() => handlers!.onClose?.());
    const before = fetchChatStatus.mock.calls.length;
    act(() => vi.advanceTimersByTime(45_000));
    expect(fetchChatStatus.mock.calls.length).toBe(before);
    // back: the old view is gone, the pane opens a new one; only that one is polled
    act(() => handlers!.onGone());
    await waitFor(() => expect(fetchChatStatus).toHaveBeenCalledWith('c2'));
    act(() => vi.advanceTimersByTime(45_000));
    const after = fetchChatStatus.mock.calls.slice(before).map(([id]) => id);
    expect(after.length).toBeGreaterThan(1);
    expect(after.every((id) => id === 'c2')).toBe(true);
  });
});
