// #220 / cluster mode: the picker target is global, but the UI view of a pane follows the pane's
// own instance. Switching the target (Cluster rail opening a peer agent) must not take the UI view
// or its toggle away from the panes of the other instance.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AgentsView } from '../components/AgentsView/AgentsView';
import { STORAGE_KEY as WORKSPACE_KEY, VIEWS_STORAGE_KEY } from '../hooks/useAgentWorkspace';
import { summarizeSessions } from '../utils/agentSessions';
import { DEFAULT_AGENT_VIEW_SETTINGS, type AgentSession } from '../types';
import type { AgentsTransport, PtySocket } from '../transport';
import { renderWithAgents } from './agents';
import { nav, orkumoHost, orkumoTransport } from './agentsView';

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80;
    rows = 24;
    options = {};
    loadAddon() {}
    registerLinkProvider() {}
    open() {}
    onData() {}
    onResize() {}
    reset() {}
    focus() {}
    write() {}
    dispose() {}
  },
}));
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit() {}
  },
}));
vi.mock('@xterm/addon-web-links', () => ({ WebLinksAddon: class {} }));
vi.mock('@xterm/addon-image', () => ({ ImageAddon: class {} }));
vi.mock('../utils/terminalLinkStyle', () => ({ styleTerminalLinks: () => ({ dispose() {} }) }));
vi.mock('../utils/terminalKeys', () => ({ attachTerminalKeys: () => {} }));

const session = (id: string, over: Partial<AgentSession> = {}): AgentSession => ({
  id,
  sessionId: null,
  kind: 'background',
  cwd: '/w/app',
  startedAt: 1,
  name: `agent-${id}`,
  state: null,
  pinned: false,
  order: null,
  links: [],
  displayState: 'idle',
  ...over,
});

// local: s1 (UI view), s3 (terminal); peer: s2 (UI view). The picker points at the peer.
const SESSIONS = [
  session('s1', { sessionId: 'uuid-1' }),
  session('s2', { sessionId: 'uuid-2' }),
  session('s3', { sessionId: 'uuid-3' }),
  session('s4', { sessionId: 'uuid-4' }),
];
const PEER = '/modules/mesh/peer/b';
const TARGET_OF: Record<string, string> = { s1: '', s2: PEER, s3: '', s4: PEER };

vi.mock('../hooks/useAgentSessions', () => ({
  useAgentSessions: () => ({
    sessions: SESSIONS,
    daemon: null,
    userSettings: null,
    cliInstalled: true,
    capabilities: null,
    settings: DEFAULT_AGENT_VIEW_SETTINGS,
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

const tab = (id: string, pane: string) => ({
  id,
  root: { id: `${id}-a`, pane },
  panes: [pane],
  layout: 'single',
  activeSessionId: pane,
});

const socket = () => ({ readyState: 0, send() {}, close() {} }) as unknown as PtySocket;

const render = (
  openTranscriptView: NonNullable<AgentsTransport['chat']>['openTranscriptView'],
  selectedId?: string
) => {
  const base = orkumoTransport();
  const transport: AgentsTransport = {
    ...base,
    pty: { ...base.pty, attach: socket },
    chat: { ...base.chat!, openTranscriptView },
    targets: {
      useAgentTarget: () => PEER,
      getAgentTarget: () => PEER,
      targetOf: (id) => TARGET_OF[id] ?? PEER,
      pinTarget: () => {},
    },
  };
  localStorage.setItem(
    WORKSPACE_KEY,
    JSON.stringify({
      tabs: [tab('t1', 's1'), tab('t2', 's2'), tab('t3', 's3')],
      activeTabId: 't2',
    })
  );
  localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify({ s1: 'chat', s2: 'chat' }));
  renderWithAgents(
    <AgentsView
      active
      apps={[]}
      onExit={() => {}}
      nav={nav}
      onOpenView={() => {}}
      selectedId={selectedId}
    />,
    { transport, host: orkumoHost() }
  );
};
const pane = (id: string) => document.querySelector(`[data-agent-pane="${id}"]`) as HTMLElement;
// the UI view is a second element of the pane, over its (still mounted) terminal
const chatPane = (id: string) =>
  [...document.querySelectorAll<HTMLElement>(`[data-agent-pane="${id}"]`)].at(-1)!;

beforeEach(() => {
  localStorage.clear();
  window.HTMLElement.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('UI view of panes on another instance than the picker (#220, cluster mode)', () => {
  it('local and peer panes keep their UI view; a local terminal pane keeps its UI view toggle', () => {
    const open = vi.fn(() => new Promise<never>(() => {}));
    render(open);
    // each UI view opens its transcript on the pane's own instance (the transport routes by pane id)
    expect(open).toHaveBeenCalledWith('s1', expect.objectContaining({ sessionId: 'uuid-1' }));
    expect(open).toHaveBeenCalledWith('s2', expect.objectContaining({ sessionId: 'uuid-2' }));
    expect(
      within(pane('s3')).getByRole('button', { name: 'UI view', hidden: true })
    ).toBeInTheDocument();
  });

  it('a UI view that cannot open says why in its own pane and retries there', async () => {
    let failed = false;
    const open = vi.fn((id: string) =>
      id === 's2' && !failed
        ? ((failed = true), Promise.reject(new Error('Bad Gateway')))
        : new Promise<never>(() => {})
    );
    render(open);
    const alert = await within(chatPane('s2')).findByRole('alert', { hidden: true });
    expect(alert).toHaveTextContent('Bad Gateway');
    expect(within(chatPane('s1')).queryByRole('alert', { hidden: true })).toBeNull();
    const calls = open.mock.calls.filter(([id]) => id === 's2').length;
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again', hidden: true }));
    await waitFor(() =>
      expect(open.mock.calls.filter(([id]) => id === 's2').length).toBe(calls + 1)
    );
  });

  it('an agent the host opens (selectedId, e.g. the Cluster rail) starts in the preferred UI view', async () => {
    const open = vi.fn(() => new Promise<never>(() => {}));
    render(open, 's4');
    await waitFor(() =>
      expect(open).toHaveBeenCalledWith('s4', expect.objectContaining({ sessionId: 'uuid-4' }))
    );
  });
});
