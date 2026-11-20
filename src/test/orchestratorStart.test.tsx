import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useState } from 'react';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AgentsView, type AgentsPrefill } from '../components/AgentsView/AgentsView';
import { STORAGE_KEY as RAIL_KEY } from '../hooks/useRailPreferences';
import { STORAGE_KEY as WORKSPACE_KEY } from '../hooks/useAgentWorkspace';
import { summarizeSessions } from '../utils/agentSessions';
import {
  DEFAULT_AGENT_VIEW_SETTINGS,
  type AgentDispatchRequest,
  type AgentSession,
} from '../types';
import { renderWithAgents } from './agents';
import { nav, orkumoHost, orkumoTransport } from './agentsView';

// New agent with the Orchestrator option: Remote Control on (Claude app), workers stay without

const CHATS = '/data/chats';
const HOME = '/home/dev';
// stable values across renders, as the real hook keeps them
const hoisted = vi.hoisted(() => ({
  model: null as string | null,
  sessions: [] as AgentSession[],
  settings: null as object | null,
  updateSettings: vi.fn(),
}));

vi.mock('../hooks/useAgentSessions', () => ({
  useAgentSessions: () => {
    hoisted.settings ??= {
      ...DEFAULT_AGENT_VIEW_SETTINGS,
      dispatch: {
        ...DEFAULT_AGENT_VIEW_SETTINGS.dispatch,
        harness: 'claude',
        model: hoisted.model,
      },
    };
    return {
      sessions: hoisted.sessions,
      daemon: null,
      userSettings: null,
      cliInstalled: true,
      capabilities: null,
      settings: hoisted.settings,
      updateSettings: hoisted.updateSettings,
      loading: false,
      error: null,
      errorStatus: null,
      received: true,
      connected: true,
      counts: summarizeSessions(hoisted.sessions),
      lastCompleted: null,
      refresh: () => {},
    };
  },
}));
// the pane shows what it would start: command, args and folder
vi.mock('../components/AgentsView/AgentTerminal', async (orig) => ({
  ...(await orig<object>()),
  AgentTerminal: ({ session }: { session: AgentSession }) => (
    <div
      data-agent-pane={session.id}
      data-command={session.ptyCommand ?? 'claude'}
      data-args={JSON.stringify(session.ptyArgs ?? [])}
      data-cwd={session.cwd}
    />
  ),
}));

let dispatched: AgentDispatchRequest[] = [];

const pending = () => new Promise<never>(() => {});
const transport = () => {
  const base = orkumoTransport();
  return orkumoTransport({
    agents: {
      ...base.agents,
      dispatchAgent: vi.fn(async (body: AgentDispatchRequest) => {
        dispatched.push(body);
        return { id: 'job-1', name: body.name ?? 'w', alreadyRunning: false, output: '' };
      }),
    },
    // the discovery data, where the chats folder comes from
    discovery: {
      fetchAgentRepos: vi.fn(async () => ({
        cwd: '/p',
        repos: [],
        home: '/home/dev',
        chats: CHATS,
      })),
      fetchSubagents: vi.fn(async () => []),
      fetchAgentCommands: vi.fn(async () => []),
      fetchHarnesses: vi.fn(pending),
      fetchHarnessModels: vi.fn(async () =>
        ['fable', 'opus', 'sonnet'].map((id) => ({
          id,
          label: id,
          group: 'Claude',
          efforts: ['low', 'high', 'max'],
        }))
      ),
    },
  });
};

const Shell: React.FC<{ initial: AgentsPrefill }> = ({ initial }) => {
  const [prefill, setPrefill] = useState<AgentsPrefill | null>(initial);
  return (
    <AgentsView
      active
      apps={[]}
      onExit={() => {}}
      nav={nav}
      onOpenView={() => {}}
      prefill={prefill}
      onPrefillConsumed={() => setPrefill(null)}
    />
  );
};
/** "New agent" in `cwd`: the task composer there, switched to the Agent tab */
const openNewAgent = async (cwd: string) => {
  renderWithAgents(<Shell initial={{ dispatch: '', mode: 'task' }} />, {
    transport: transport(),
    host: orkumoHost(),
  });
  const composer = await screen.findByRole('dialog');
  fireEvent.click(within(composer).getByRole('tab', { name: /agent/i }));
  const agent = await screen.findByRole('dialog', { name: 'New agent' });
  // New agent starts in ~; another folder comes from the directory picker
  await within(agent).findByRole('button', { name: HOME });
  if (cwd !== HOME) {
    fireEvent.click(within(agent).getByRole('button', { name: HOME }));
    const field = await screen.findByPlaceholderText('/absolute/path');
    fireEvent.change(field, { target: { value: cwd } });
    fireEvent.keyDown(field, { key: 'Enter' });
    await within(agent).findByRole('button', { name: cwd });
  }
  return agent;
};

beforeEach(() => {
  localStorage.removeItem(RAIL_KEY);
  localStorage.removeItem(WORKSPACE_KEY);
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLElement.prototype.scrollTo = () => {};
  hoisted.settings = null;
  hoisted.updateSettings = vi.fn();
  dispatched = [];
});
afterEach(() => {
  cleanup();
});

describe('New agent: Orchestrator option (Remote Control)', () => {
  it('a worker starts without the orchestrator profile', async () => {
    const composer = await openNewAgent('/p/app');
    expect(within(composer).getByRole('checkbox', { name: /Orchestrator/ })).not.toBeChecked();
    fireEvent.click(within(composer).getByRole('button', { name: /Start agent/ }));
    await waitFor(() => expect(dispatched).toHaveLength(1));
    expect(dispatched[0].profile).toBeUndefined();
    expect(hoisted.updateSettings).not.toHaveBeenCalled();
  });

  it('an orchestrator starts with the profile, a -orchestrator name, and is marked', async () => {
    const composer = await openNewAgent('/p/app');
    fireEvent.click(within(composer).getByRole('checkbox', { name: /Orchestrator/ }));
    fireEvent.click(within(composer).getByRole('button', { name: /Start agent/ }));
    await waitFor(() => expect(dispatched).toHaveLength(1));
    expect(dispatched[0]).toMatchObject({
      cwd: '/p/app',
      profile: 'orchestrator',
      name: 'app-orchestrator',
    });
    await waitFor(() =>
      expect(hoisted.updateSettings).toHaveBeenCalledWith({ orchestrators: ['job-1'] })
    );
  });

  it('in ~ the interactive pane starts with --remote-control and is marked by its session id', async () => {
    const composer = await openNewAgent(HOME);
    fireEvent.click(within(composer).getByRole('checkbox', { name: /Orchestrator/ }));
    fireEvent.click(within(composer).getByRole('button', { name: /Start agent/ }));
    const pane = await waitFor(() => {
      const el = document.querySelector('[data-agent-pane]');
      if (!el) throw new Error('no pane');
      return el;
    });
    const args = JSON.parse(pane.getAttribute('data-args') ?? '[]') as string[];
    expect(args).toEqual([
      '--session-id',
      expect.any(String),
      '--remote-control',
      'home-orchestrator',
    ]);
    expect(dispatched).toHaveLength(0);
    expect(hoisted.updateSettings).toHaveBeenCalledWith({ orchestrators: [args[1]] });
  });
});
