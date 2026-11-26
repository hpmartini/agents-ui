import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, screen, within, waitFor } from '@testing-library/react';
import { AgentsView } from '../components/AgentsView/AgentsView';
import { summarizeSessions } from '../utils/agentSessions';
import { openPlan } from '../utils/sessionCopies';
import { DEFAULT_AGENT_VIEW_SETTINGS, type AgentSession } from '../types';
import { renderWithAgents } from './agents';
import { nav, orkumoHost, orkumoTransport } from './agentsView';

// A Claude app (remote control) session the server matched to an Orkumo pane (`paneId`) is a pane
// row: it opens and stops like a terminal row and can be marked as orchestrator; without a pane
// it stays what it was (claude.ai page, nothing to attach, stop or mark here)

const base = { pinned: false, order: null, links: [], state: null, startedAt: 1 };
const app = (id: string, over: Partial<AgentSession> = {}): AgentSession => ({
  ...base,
  id,
  sessionId: '22222222-2222-4222-8222-222222222222',
  kind: 'app',
  cwd: '/home/dev/.claude',
  name: id === 'interactive-22' ? 'Remote orchestrator' : 'Phone session',
  pid: 22,
  displayState: 'idle',
  app: { url: 'https://claude.ai/code/session_01abcdefgh', origin: 'ios', statusCategory: null },
  ...over,
});

describe('openPlan for an app row', () => {
  it('without a pane it opens its claude.ai page', () => {
    expect(openPlan(app('interactive-9'), [], new Set())).toEqual({
      type: 'app',
      url: 'https://claude.ai/code/session_01abcdefgh',
    });
  });

  it('in a pane of ours it focuses the open pane, or reattaches a closed one', () => {
    const row = app('interactive-22', { paneId: 'orch-abc' });
    expect(openPlan(row, [], new Set(['orch-abc']))).toEqual({ type: 'focus', paneId: 'orch-abc' });
    expect(openPlan(row, [], new Set())).toEqual({ type: 'reattach', paneId: 'orch-abc' });
  });
});

const SESSIONS = [
  app('interactive-22', { paneId: 'orch-abc' }),
  app('interactive-33', {
    name: 'Phone session',
    pid: 33,
    sessionId: '33333333-3333-4333-8333-333333333333',
  }),
];

vi.mock('../hooks/useAgentSessions', () => ({
  useAgentSessions: () => ({
    sessions: SESSIONS,
    daemon: null,
    userSettings: null,
    cliInstalled: true,
    capabilities: null,
    settings: { ...DEFAULT_AGENT_VIEW_SETTINGS, orchestrators: [] },
    updateSettings: () => {},
    loading: false,
    error: null,
    errorStatus: null,
    received: true,
    connected: true,
    counts: summarizeSessions(SESSIONS),
    lastCompleted: null,
    refresh: () => {},
  }),
}));

beforeEach(() => {
  localStorage.clear();
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLElement.prototype.scrollTo = () => {};
});
afterEach(() => cleanup());

const menuOf = async (name: string) => {
  fireEvent.contextMenu(await screen.findByText(name));
  return screen.getByRole('menu');
};
const item = (menu: HTMLElement, name: string | RegExp) =>
  within(menu).getByRole('menuitem', { name }) as HTMLButtonElement;

describe('rail row menu of an app row', () => {
  const renderView = () => {
    const transport = orkumoTransport();
    renderWithAgents(
      <AgentsView active apps={[]} onExit={() => {}} nav={nav} onOpenView={() => {}} />,
      { transport, host: orkumoHost() }
    );
    return transport;
  };

  it('in a pane: Stop and the orchestrator mark are enabled, Stop ends the pane', async () => {
    const transport = renderView();
    const menu = await menuOf('Remote orchestrator');
    expect(item(menu, 'Mark as orchestrator')).not.toBeDisabled();
    expect(item(menu, 'Stop')).not.toBeDisabled();
    fireEvent.click(item(menu, 'Stop'));
    await waitFor(() => expect(transport.messaging!.stopPane).toHaveBeenCalledWith('orch-abc'));
  });

  it('outside every pane: mark and Stop stay disabled', async () => {
    renderView();
    const menu = await menuOf('Phone session');
    expect(item(menu, 'Mark as orchestrator')).toBeDisabled();
    expect(item(menu, 'Stop')).toBeDisabled();
  });
});
