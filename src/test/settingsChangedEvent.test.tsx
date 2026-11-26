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
