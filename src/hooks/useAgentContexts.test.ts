import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import type { AgentContext, AgentSession } from '../types';
import { contextTriggerKey, useAgentContexts } from './useAgentContexts';
import { AgentsProvider } from '../host';
import { testHost, testTransport } from '../test/agents';

const fetchMock = vi.fn<(options?: { fresh?: boolean }) => Promise<Record<string, AgentContext>>>();
const transport = testTransport({ contexts: { fetchAgentContexts: fetchMock } });
const host = testHost();
const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(AgentsProvider, { transport, host, children });
const flush = () => act(async () => {});

const session = (patch: Partial<AgentSession>): AgentSession =>
  ({
    id: 'a',
    state: 'working',
    status: 'busy',
    displayState: 'working',
    links: [],
    detail: 'Reading x',
    ...patch,
  }) as AgentSession;

let hidden = false;
beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('contextTriggerKey', () => {
  it('changes with state, turn status and PR links, not with detail or order', () => {
    const a = session({});
    const b = session({ id: 'b', state: 'done', displayState: 'completed' });
    const key = contextTriggerKey([a, b]);
    expect(contextTriggerKey([b, a])).toBe(key);
    expect(contextTriggerKey([{ ...a, detail: 'Editing y' }, b])).toBe(key);
    expect(contextTriggerKey([{ ...a, status: 'idle' }, b])).not.toBe(key);
    expect(contextTriggerKey([{ ...a, state: 'blocked' }, b])).not.toBe(key);
    expect(
      contextTriggerKey([{ ...a, links: [{}] as unknown as AgentSession['links'] }, b])
    ).not.toBe(key);
  });
});

describe('useAgentContexts', () => {
  it('loads on mount, refetches fresh on a session change, throttled to one per 10 s', async () => {
    const { rerender, unmount } = renderHook(({ sessions }) => useAgentContexts(true, sessions), {
      initialProps: { sessions: [session({})] },
      wrapper,
    });
    await flush();
    // mount: the cached contexts at once, then a fresh one for the sessions just listed
    expect(fetchMock.mock.calls).toEqual([[{ fresh: false }], [{ fresh: true }]]);

    fetchMock.mockClear();
    rerender({ sessions: [session({ detail: 'Editing y' })] });
    await flush();
    expect(fetchMock).not.toHaveBeenCalled(); // detail is no trigger

    rerender({ sessions: [session({ status: 'idle' })] });
    rerender({ sessions: [session({ status: 'idle', state: 'done' })] });
    await flush();
    expect(fetchMock).not.toHaveBeenCalled(); // within 10 s of the last fresh load
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(fetchMock.mock.calls).toEqual([[{ fresh: true }]]);
    unmount();
  });

  it('no timer per session: only a slow reconcile while visible, none while hidden', async () => {
    const { unmount } = renderHook(() => useAgentContexts(true, []), { wrapper });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTime(119_000));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTime(1_000));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    act(() => {
      hidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(async () => vi.advanceTimersByTime(600_000));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    act(() => {
      hidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    unmount();
  });

  it('inactive: no requests', async () => {
    renderHook(() => useAgentContexts(false, [session({})]), { wrapper });
    await act(async () => vi.advanceTimersByTime(300_000));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a transport without contexts: empty, nothing fetched', async () => {
    const bare = testTransport();
    const { result } = renderHook(() => useAgentContexts(true, [session({})]), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(AgentsProvider, { transport: bare, host, children }),
    });
    await flush();
    expect(result.current).toEqual({});
  });
});
