// Host buttons in every agent pane header (`host.renderPaneActions`): tab panes, split panes, UI view
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AgentsView } from '../components/AgentsView/AgentsView';
import { STORAGE_KEY as WORKSPACE_KEY, VIEWS_STORAGE_KEY } from '../hooks/useAgentWorkspace';
import { summarizeSessions } from '../utils/agentSessions';
import { DEFAULT_AGENT_VIEW_SETTINGS, type AgentSession } from '../types';
import type { AgentsHost } from '../host';
import type { AgentsTransport, ChatThreadList, PtySocket } from '../transport';
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

// s1 is marked by its transcript uuid, as the rail stores interactive sessions
const SESSIONS = [session('s1', { sessionId: 'uuid-1' }), session('s2'), session('s3')];

vi.mock('../hooks/useAgentSessions', () => ({
  useAgentSessions: () => ({
    sessions: SESSIONS,
    daemon: null,
    userSettings: null,
    cliInstalled: true,
    capabilities: null,
    settings: {
      ...DEFAULT_AGENT_VIEW_SETTINGS,
      orchestrators: ['uuid-1'],
      orchestratorRoles: { 'uuid-1': 'planner' },
    },
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

const tab = (id: string, panes: string[]) => ({
  id,
  root:
    panes.length === 1
      ? { id: `${id}-a`, pane: panes[0] }
      : { id: `${id}-r`, dir: 'row', children: panes.map((p) => ({ id: `${id}-${p}`, pane: p })) },
  panes,
  layout: panes.length === 1 ? 'single' : 'columns',
  activeSessionId: panes[0],
});

// a socket that never opens: the header is what is under test
const socket = () => ({ readyState: 0, send() {}, close() {} }) as unknown as PtySocket;

const render = (host: AgentsHost, overrides: Partial<AgentsTransport> = {}) => {
  const base = orkumoTransport(overrides);
  const transport = { ...base, pty: { ...base.pty, attach: socket } };
  localStorage.setItem(
    WORKSPACE_KEY,
    JSON.stringify({ tabs: [tab('t1', ['s1', 's2']), tab('t2', ['s3'])], activeTabId: 't1' })
  );
  localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify({ s2: 'chat' }));
  renderWithAgents(
    <AgentsView active apps={[]} onExit={() => {}} nav={nav} onOpenView={() => {}} />,
    { transport, host }
  );
};
const pane = (id: string) => document.querySelector(`[data-agent-pane="${id}"]`) as HTMLElement;

beforeEach(() => {
  localStorage.clear();
  window.HTMLElement.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('host.renderPaneActions', () => {
  it('renders the host buttons in the single pane of a tab and in both panes of a split', () => {
    const renderPaneActions = vi.fn(
      (p: Parameters<NonNullable<AgentsHost['renderPaneActions']>>[0]) => (
        <button type="button" data-host-action={p.paneId}>
          {p.orchestrator ? `Status ${p.role}` : 'Status'}
        </button>
      )
    );
    render(orkumoHost({ renderPaneActions }));

    // split tab: s1 as terminal, s2 in the UI view; single-pane tab: s3
    expect(pane('s1').querySelector('[data-host-action="s1"]')).toHaveTextContent('Status planner');
    expect(document.querySelector('[data-host-action="s2"]')).toBeInTheDocument();
    expect(pane('s3').querySelector('[data-host-action="s3"]')).toHaveTextContent('Status');

    expect(renderPaneActions).toHaveBeenCalledWith(
      expect.objectContaining({
        paneId: 's1',
        orchestrator: true,
        role: 'planner',
        session: expect.objectContaining({ id: 's1', sessionId: 'uuid-1' }),
      })
    );
    expect(renderPaneActions).toHaveBeenCalledWith(
      expect.objectContaining({ paneId: 's3', orchestrator: false, role: null })
    );
  });

  it('adds nothing to the pane headers without the hook', () => {
    const headers = () => ['s1', 's3'].map((id) => pane(id).firstElementChild!.outerHTML);
    render(orkumoHost());
    expect(document.querySelector('[data-host-action]')).toBeNull();
    const without = headers();
    cleanup();
    render(orkumoHost({ renderPaneActions: () => null }));
    expect(headers()).toEqual(without);
    expect(screen.getAllByRole('button', { name: 'Close agent-s1' }).length).toBeGreaterThan(0);
  });
});

describe('host.renderPaneView', () => {
  it('shows the host view in place of the pane body, header and terminal kept, per pane', () => {
    const renderPaneView = vi.fn((p: Parameters<NonNullable<AgentsHost['renderPaneView']>>[0]) =>
      p.paneId === 's3' ? null : <div data-host-view={p.paneId}>{`view ${p.role}`}</div>
    );
    render(
      orkumoHost({
        renderPaneActions: (p) => <button type="button" data-host-action={p.paneId} />,
        renderPaneView,
      })
    );

    // s1 (terminal) and s2 (UI view) of the split each show their own view
    expect(pane('s1').querySelector('[data-host-view="s1"]')).toHaveTextContent('view planner');
    expect(document.querySelector('[data-host-view="s2"]')).toBeInTheDocument();
    // the header with the host button stays; the terminal body stays mounted under the view
    expect(pane('s1').querySelector('[data-host-action="s1"]')).toBeInTheDocument();
    expect(pane('s1').querySelector('[data-pane-view]')).toBeInTheDocument();
    // null: the pane as before
    expect(pane('s3').querySelector('[data-pane-view]')).toBeNull();
    expect(renderPaneView).toHaveBeenCalledWith(
      expect.objectContaining({ paneId: 's1', orchestrator: true, role: 'planner' })
    );
  });

  it('changes nothing without the hook', () => {
    render(orkumoHost());
    expect(document.querySelector('[data-pane-view]')).toBeNull();
  });
});

// H-6: s2 (UI view) is an orchestrator chat with one thread bound to a report task
describe('status inside the maximised threads panel', () => {
  const list: ChatThreadList = {
    orchestrator: 's2',
    threads: [
      {
        id: 'th1',
        tag: '[Thread: Shop · Checkout]',
        name: { project: 'Shop', task: 'Checkout' },
        binding: { project: 'shop', task: 'checkout' },
        createdAt: 1,
        readAt: 1,
        agents: [],
        closed: false,
      },
    ],
    tasks: [
      {
        project: 'shop',
        projectName: 'Shop',
        task: 'checkout',
        title: 'Checkout flow',
        state: 'running',
        repo: null,
      },
    ],
  };
  const threads = {
    threads: {
      fetchThreads: vi.fn(async () => list),
      createThread: vi.fn(),
      updateThread: vi.fn(),
    },
  };
  type PaneArg = Parameters<NonNullable<AgentsHost['renderPaneView']>>[0];
  const maximise = async () => {
    const button = await screen.findByRole('button', { name: 'Maximize threads' });
    act(() => fireEvent.click(button));
    return document.querySelector('[data-threads-panel]') as HTMLElement;
  };

  it('the header-toggled host view shows in the maximised panel, not behind it', async () => {
    // as Orkumo after "Show in Status": the pane's view is on
    const renderPaneView = (p: PaneArg) =>
      p.paneId === 's2' && !p.statusTask ? <div data-host-view="all">status</div> : null;
    render(orkumoHost({ renderPaneView }), threads);
    await maximise();
    const views = document.querySelectorAll('[data-host-view="all"]');
    expect(views).toHaveLength(1);
    expect(document.querySelector('[data-threads-panel]')).toContainElement(
      views[0] as HTMLElement
    );
    expect(views[0].closest('[data-chat-pane] .hidden')).toBeNull();
    expect(document.querySelector('[data-threads-maximized]')).not.toBeNull();
  });

  it('drawer: "Show in Status" covers the open drawer instead of sitting under it', async () => {
    // a narrow pane: the threads panel is a drawer (overlay, z-30) over the chat
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(500);
    try {
      const renderPaneView = (p: PaneArg) =>
        p.paneId === 's2' && !p.statusTask ? <div data-host-view="all">status</div> : null;
      render(orkumoHost({ renderPaneView }), threads);
      await waitFor(() =>
        expect(document.querySelector('[data-threads-mode="overlay"]')).toBeInTheDocument()
      );
      const z = (el: Element | null) => Number(/\bz-(\d+)/.exec(el?.className ?? '')?.[1] ?? 0);
      const view = document.querySelector('[data-host-view="all"]')!.closest('[data-pane-view]');
      expect(z(view)).toBeGreaterThan(z(document.querySelector('[data-threads-mode="overlay"]')));
      expect(z(view)).toBeGreaterThan(z(document.querySelector('[data-threads-scrim]')));
    } finally {
      width.mockRestore();
    }
  });

  it('a status entry opens its details from the host in the panel; Esc goes back', async () => {
    const renderPaneView = vi.fn((p: PaneArg) =>
      p.statusTask ? (
        <div data-status-detail={`${p.statusTask.project}/${p.statusTask.task}`}>
          <button type="button" onClick={p.onClose}>
            host back
          </button>
        </div>
      ) : null
    );
    render(orkumoHost({ renderPaneView }), threads);
    const panel = await maximise();
    const rows = await within(panel).findByRole('list', { name: 'Status' });
    act(() => fireEvent.click(within(rows).getByRole('button', { name: /Checkout flow/ })));
    const detail = panel.querySelector('[data-status-detail="shop/checkout"]') as HTMLElement;
    expect(detail).toBeInTheDocument();
    expect(renderPaneView).toHaveBeenCalledWith(
      expect.objectContaining({
        paneId: 's2',
        orchestrator: false,
        statusTask: { project: 'shop', task: 'checkout' },
      })
    );
    // the host's own close (its Esc) brings the thread back, still maximised
    act(() => fireEvent.click(within(detail).getByRole('button', { name: 'host back' })));
    expect(panel.querySelector('[data-status-detail]')).toBeNull();
    expect(document.querySelector('[data-threads-maximized]')).not.toBeNull();
  });

  it('"Show in Status" in a thread maximises the panel and opens its task there', async () => {
    const renderPaneView = (p: PaneArg) =>
      p.statusTask ? <div data-status-detail={p.statusTask.task} /> : null;
    render(orkumoHost({ renderPaneView }), threads);
    // open the thread from the (not maximised) panel
    await waitFor(() =>
      expect(document.querySelector('[data-thread-row="th1"]')).toBeInTheDocument()
    );
    act(() => fireEvent.click(document.querySelector('[data-thread-row="th1"]') as HTMLElement));
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Show in Status' })));
    expect(document.querySelector('[data-threads-maximized]')).not.toBeNull();
    expect(document.querySelector('[data-status-detail="checkout"]')).toBeInTheDocument();
  });
});
