import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { AgentsProvider } from '../host';
import { useAgentSessions } from '../hooks/useAgentSessions';
import { DEFAULT_AGENT_VIEW_SETTINGS, type AgentViewSettings } from '../types';
import type { AgentsHandlers } from '../transport';
import { testHost, testTransport } from './agents';

describe('the server changed the view settings on its own', () => {
  it('an open view refetches them: the moved orchestrator mark shows without a reload', async () => {
    let stored: AgentViewSettings = { ...DEFAULT_AGENT_VIEW_SETTINGS, orchestrators: ['old'] };
    let handlers: AgentsHandlers | undefined;
    const fetchAgentViewSettings = vi.fn(async () => stored);
    const transport = testTransport({
      settings: { fetchAgentViewSettings, updateAgentViewSettings: vi.fn(async () => stored) },
      agents: {
        ...testTransport().agents,
        subscribeToAgents: vi.fn((h: AgentsHandlers) => {
          handlers = h;
          return () => {};
        }),
      },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AgentsProvider transport={transport} host={testHost()}>
        {children}
      </AgentsProvider>
    );
    const { result } = renderHook(() => useAgentSessions(), { wrapper });
    await waitFor(() => expect(result.current.settings.orchestrators).toEqual(['old']));

    // the follower moved the mark to the pane's new session
    stored = { ...stored, orchestrators: ['new'], orchestratorRoles: { new: 'ceo' } };
    act(() => handlers?.onSettingsChanged?.());
    await waitFor(() => expect(result.current.settings.orchestrators).toEqual(['new']));
    expect(result.current.settings.orchestratorRoles).toEqual({ new: 'ceo' });
  });
});

describe('keeping the settings copy true', () => {
  /** A transport whose settings reads and writes the test answers by hand */
  function world(initial: Partial<AgentViewSettings> = {}) {
    let handlers: AgentsHandlers | undefined;
    const reads: Array<(s: AgentViewSettings) => void> = [];
    const writes: Partial<AgentViewSettings>[] = [];
    const base: AgentViewSettings = { ...DEFAULT_AGENT_VIEW_SETTINGS, revision: 'r1', ...initial };
    const transport = testTransport({
      settings: {
        fetchAgentViewSettings: vi.fn(
          () =>
            new Promise<AgentViewSettings>((resolve) => {
              reads.push(resolve);
            })
        ),
        updateAgentViewSettings: vi.fn(async (partial) => {
          writes.push(partial);
          return { ...base, ...partial, revision: 'r-after-put' } as AgentViewSettings;
        }),
      },
      agents: {
        ...testTransport().agents,
        subscribeToAgents: vi.fn((h: AgentsHandlers) => {
          handlers = h;
          return () => {};
        }),
      },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AgentsProvider transport={transport} host={testHost()}>
        {children}
      </AgentsProvider>
    );
    const hook = renderHook(() => useAgentSessions(), { wrapper });
    return {
      hook,
      reads,
      writes,
      transport,
      handlers: () => handlers!,
      answer: (i: number, s: Partial<AgentViewSettings>) =>
        act(async () => reads[i]({ ...base, ...s })),
    };
  }

  it('an update sends the revision it was read at, built from the latest settings after an await', async () => {
    const w = world();
    await w.answer(0, { orchestrators: ['old'], revision: 'r1' });
    await waitFor(() => expect(w.hook.result.current.settings.revision).toBe('r1'));
    // the server marks a new pane; the page reads it (r2) while the "start" request is still open
    act(() => w.handlers().onSettingsChanged?.());
    await w.answer(1, { orchestrators: ['old', 'orch-p'], revision: 'r2' });
    await waitFor(() => expect(w.hook.result.current.settings.revision).toBe('r2'));
    // then the page marks the new session: from its own copy of a moment ago it would drop orch-p
    await act(async () => {
      await w.hook.result.current.updateSettings((latest) => ({
        orchestrators: [...latest.orchestrators, 'uuid-new'],
      }));
    });
    expect(w.writes).toEqual([{ orchestrators: ['old', 'orch-p', 'uuid-new'], revision: 'r2' }]);
    expect(w.hook.result.current.settings.revision).toBe('r-after-put');
  });

  it('a burst of events is one read plus one more; only the newest answer counts', async () => {
    const w = world();
    await w.answer(0, { orchestrators: ['a'] });
    for (let i = 0; i < 5; i++) act(() => w.handlers().onSettingsChanged?.());
    expect(w.reads).toHaveLength(2); // the first of the burst is on its way, the rest coalesced
    await w.answer(1, { orchestrators: ['b'], revision: 'r2' });
    await waitFor(() => expect(w.reads).toHaveLength(3)); // the one more read
    await w.answer(2, { orchestrators: ['c'], revision: 'r3' });
    await waitFor(() => expect(w.hook.result.current.settings.orchestrators).toEqual(['c']));
  });

  it('an answer that an update overtook is dropped and read again', async () => {
    const w = world();
    await w.answer(0, { orchestrators: ['a'] });
    act(() => w.handlers().onSettingsChanged?.());
    expect(w.reads).toHaveLength(2);
    // an update runs and finishes while that read is on its way: its answer predates the update
    await act(async () => {
      await w.hook.result.current.updateSettings({ chatShowSteps: true });
    });
    await w.answer(1, { orchestrators: ['stale'], chatShowSteps: false, revision: 'r-old' });
    expect(w.hook.result.current.settings.orchestrators).not.toEqual(['stale']);
    expect(w.hook.result.current.settings.chatShowSteps).toBe(true);
    await waitFor(() => expect(w.reads).toHaveLength(3));
  });

  it('reads the settings again when the stream reconnects, not on the first connect', async () => {
    const w = world();
    await w.answer(0, {});
    act(() => w.handlers().onConnectionChange?.(true));
    expect(w.reads).toHaveLength(1);
    act(() => w.handlers().onConnectionChange?.(false));
    act(() => w.handlers().onConnectionChange?.(true));
    expect(w.reads).toHaveLength(2);
  });
});
