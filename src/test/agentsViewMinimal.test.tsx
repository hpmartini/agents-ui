import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AgentsView } from '../components/AgentsView/AgentsView';
import { STORAGE_KEY as RAIL_KEY } from '../hooks/useRailPreferences';
import { STORAGE_KEY as WORKSPACE_KEY } from '../hooks/useAgentWorkspace';
import type { AgentSession, AgentsResponse } from '../types';
import type { AgentsTransport, TransportError } from '../transport';
import { renderWithAgents, testHost, testTransport } from './agents';

// A host with only the required transport groups and toasts (MAPLE): the view works and hides
// everything it has no capability for; plus the MAPLE props (stop guard, list errors, selection)

vi.mock('../components/AgentsView/AgentTerminal', async (orig) => ({
  ...(await orig<object>()),
  AgentTerminal: ({ session }: { session: AgentSession }) => (
    <div data-agent-pane={session.id}>{session.name}</div>
  ),
}));

const SESSION: AgentSession = {
  id: 's1',
  sessionId: null,
  kind: 'background',
  cwd: '/vault',
  startedAt: 1,
  name: 'vault-worker',
  state: 'working',
  pinned: false,
  order: null,
  links: [],
  displayState: 'working',
};

const listed = (sessions: AgentSession[]): AgentsResponse => ({
  sessions,
  daemon: null,
  userSettings: null,
  cli: { installed: true, path: '/usr/bin/claude' },
});

const minimal = (agents: Partial<AgentsTransport['agents']> = {}) => {
  const base = testTransport();
  return testTransport({
    agents: {
      ...base.agents,
      fetchAgents: vi.fn(async () => listed([SESSION])),
      ...agents,
    },
  });
};

const failure = (message: string, status: number): TransportError =>
  Object.assign(new Error(message), { status });

beforeEach(() => {
  localStorage.removeItem(RAIL_KEY);
  localStorage.removeItem(WORKSPACE_KEY);
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLElement.prototype.scrollTo = () => {};
});
afterEach(() => cleanup());

const rowMenu = async () => {
  fireEvent.contextMenu(await screen.findByText('vault-worker'));
  return screen.getByRole('menu');
};

describe('AgentsView with the required transport groups only', () => {
  it('renders rail, list and composer; hides what needs other groups or host fields', async () => {
    const { container } = renderWithAgents(<AgentsView className="maple" />, {
      transport: minimal(),
    });
    expect(await screen.findByText('vault-worker')).toBeInTheDocument();
    const root = container.querySelector('[data-agents-view]')!;
    expect(root).toHaveClass('agents-ui', 'maple');
    expect(screen.queryByRole('navigation', { name: 'Activity bar' })).toBeNull();
    expect(screen.queryByRole('button', { name: /open PRs?/ })).toBeNull();
    expect(screen.queryByTitle('Copy `claude agents --json --all`')).toBeNull();
    expect(screen.queryByLabelText('Open context dashboard')).toBeNull();

    const items = within(await rowMenu())
      .getAllByRole('menuitem')
      .map((b) => b.textContent?.trim());
    expect(items).toContain('Stop');
    for (const hidden of [
      'Peek / reply',
      'Open in Code',
      'Open terminal here',
      'Show on Board',
      'Rename',
      'Delete',
      'Mark as orchestrator',
    ])
      expect(items).not.toContain(hidden);
    fireEvent.keyDown(document.body, { key: 'Escape' });

    // New task menu: only what the transport can start (no `pty.spawn`: no agent, no chat)
    fireEvent.click(screen.getByRole('button', { name: /More: new agent/ }));
    const menu = screen.getByRole('menu', { name: 'Create' });
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((b) => b.textContent)
    ).toEqual(['New taskN']);
    fireEvent.click(within(menu).getByRole('menuitem', { name: /New task/ }));
    const composer = await screen.findByRole('dialog', { name: 'New task' });
    expect(within(composer).queryByRole('tab', { name: 'Issue' })).toBeNull();
    expect(within(composer).queryByRole('tab', { name: 'Chat' })).toBeNull();
    expect(within(composer).getByRole('tab', { name: 'Task' })).toBeInTheDocument();
  });

  it('without pty.spawn: no attach, agent, chat or other harness; dispatch runs in the background', async () => {
    const transport = minimal();
    expect(transport.pty.spawn).toBeUndefined();
    renderWithAgents(<AgentsView />, { transport });
    await screen.findByText('vault-worker');
    fireEvent.click(screen.getByRole('button', { name: /^New task/ }));
    const composer = await screen.findByRole('dialog', { name: 'New task' });
    expect(within(composer).queryByRole('tab', { name: 'Agent' })).toBeNull();
    expect(within(composer).queryByRole('tab', { name: 'Chat' })).toBeNull();
    expect(within(composer).queryByRole('button', { name: 'Dispatch and attach' })).toBeNull();
    expect(within(composer).queryByRole('combobox')).toBeNull();
    expect(within(composer).queryByRole('option', { name: /Codex|OpenCode|Oh My Pi/ })).toBeNull();
    fireEvent.change(within(composer).getByRole('textbox'), {
      target: { value: 'Refactor the vault importer into smaller modules' },
    });
    fireEvent.click(within(composer).getByRole('button', { name: /^Dispatch$/ }));
    await waitFor(() =>
      expect(transport.agents.dispatchAgent).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'Refactor the vault importer into smaller modules' })
      )
    );
  });

  it('canStop false: no Stop for that agent', async () => {
    renderWithAgents(<AgentsView canStop={(s) => s.id !== 's1'} />, { transport: minimal() });
    const items = within(await rowMenu())
      .getAllByRole('menuitem')
      .map((b) => b.textContent?.trim());
    expect(items).not.toContain('Stop');
  });

  it('confirmStop: Stop asks first, stops only on yes', async () => {
    const transport = minimal();
    renderWithAgents(<AgentsView confirmStop />, { transport });
    fireEvent.click(within(await rowMenu()).getByRole('menuitem', { name: 'Stop' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Stop agent?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(transport.agents.stopAgent).not.toHaveBeenCalled();

    fireEvent.click(within(await rowMenu()).getByRole('menuitem', { name: 'Stop' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog', { name: 'Stop agent?' })).getByRole('button', {
        name: 'Stop',
      })
    );
    expect(transport.agents.stopAgent).toHaveBeenCalledWith('s1');
  });

  it('without confirmStop, Stop stops at once (Orkumo)', async () => {
    const transport = minimal();
    renderWithAgents(<AgentsView />, { transport });
    fireEvent.click(within(await rowMenu()).getByRole('menuitem', { name: 'Stop' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(transport.agents.stopAgent).toHaveBeenCalledWith('s1');
  });

  it.each([
    [403, 'No access to the agents.'],
    [503, 'The agent service is not available right now.'],
    [400, 'Could not load the agents.'],
  ])('a list that fails before any arrived (%i) shows why, with a retry', async (status, text) => {
    const fetchAgents = vi.fn(async (): Promise<AgentsResponse> => {
      throw failure('agents: nope', status);
    });
    renderWithAgents(<AgentsView />, { transport: minimal({ fetchAgents }) });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(text);
    expect(alert).toHaveTextContent('agents: nope');
    fetchAgents.mockResolvedValueOnce(listed([SESSION]));
    fireEvent.click(within(alert).getByRole('button', { name: /Try again/ }));
    expect(await screen.findByText('vault-worker')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a stream error before any list carries its status', async () => {
    const subscribeToAgents: AgentsTransport['agents']['subscribeToAgents'] = ({ onError }) => {
      onError?.('stream: forbidden', 401);
      return () => {};
    };
    const fetchAgents = vi.fn(() => new Promise<AgentsResponse>(() => {}));
    renderWithAgents(<AgentsView />, {
      transport: minimal({ fetchAgents, subscribeToAgents }),
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('No access to the agents.');
  });

  it('selectedId opens that agent once it is listed and the active pane is reported', async () => {
    const onSelectedIdChange = vi.fn();
    renderWithAgents(<AgentsView selectedId="s1" onSelectedIdChange={onSelectedIdChange} />, {
      transport: minimal(),
      host: testHost(),
    });
    await waitFor(() => expect(document.querySelector('[data-agent-pane="s1"]')).not.toBeNull());
    await waitFor(() => expect(onSelectedIdChange).toHaveBeenLastCalledWith('s1'));
  });
});
