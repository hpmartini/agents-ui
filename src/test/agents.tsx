/**
 * Test helpers: a transport whose required groups are `vi.fn()` stubs (merge the optional groups a
 * test needs), a host with stub toasts, and a render wrapper that provides both.
 */
import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { AgentsProvider, type AgentsHost } from '../host';
import type { AgentsTransport } from '../transport';
import { DEFAULT_AGENT_VIEW_SETTINGS, type AgentViewSettings, type AgentsResponse } from '../types';

export function testTransport(overrides: Partial<AgentsTransport> = {}): AgentsTransport {
  const settings: AgentViewSettings = { ...DEFAULT_AGENT_VIEW_SETTINGS };
  return {
    agents: {
      fetchAgents: vi.fn(
        async (): Promise<AgentsResponse> => ({
          sessions: [],
          daemon: null,
          userSettings: null,
          cli: { installed: true, path: '/usr/bin/claude' },
        })
      ),
      subscribeToAgents: vi.fn(() => () => {}),
      dispatchAgent: vi.fn(async () => ({ id: 'new', name: 'new', alreadyRunning: false, output: '' })),
      stopAgent: vi.fn(async () => ({ output: '' })),
    },
    settings: {
      fetchAgentViewSettings: vi.fn(async () => settings),
      updateAgentViewSettings: vi.fn(async (partial) => Object.assign(settings, partial)),
    },
    pty: {
      attach: vi.fn(() => {
        throw new Error('no PTY in tests');
      }),
    },
    ...overrides,
  };
}

export function testHost(overrides: Partial<AgentsHost> = {}): AgentsHost {
  return {
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), dismiss: vi.fn() },
    ...overrides,
  };
}

export function renderWithAgents(
  ui: React.ReactElement,
  {
    transport = testTransport(),
    host = testHost(),
    ...options
  }: { transport?: AgentsTransport; host?: AgentsHost } & Omit<RenderOptions, 'wrapper'> = {}
) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AgentsProvider transport={transport} host={host}>
      {children}
    </AgentsProvider>
  );
  return { transport, host, ...render(ui, { wrapper, ...options }) };
}
