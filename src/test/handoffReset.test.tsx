// Handoff + Reset in every agent pane header (terminal and UI view): button above the context
// threshold, pane menu entry always, confirm dialog, job phases, error with retry
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AgentsView } from '../components/AgentsView/AgentsView';
import { AgentSettingsPanel } from '../components/AgentsView/AgentSettingsPanel';
import { STORAGE_KEY as WORKSPACE_KEY, VIEWS_STORAGE_KEY } from '../hooks/useAgentWorkspace';
import { summarizeSessions } from '../utils/agentSessions';
import { DEFAULT_AGENT_VIEW_SETTINGS, type AgentContext, type AgentSession } from '../types';
import type { AgentsTransport, HandoffResetJob, HandoffResetPhase, PtySocket } from '../transport';
import { createMockTransport } from '../transports/mock';
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

// s1: terminal, 182k tokens; s2: UI view, 182k; s3: terminal, 90k
const SESSIONS = [session('s1'), session('s2'), session('s3')];
let threshold = 150_000;

vi.mock('../hooks/useAgentSessions', () => ({
  useAgentSessions: () => ({
    sessions: SESSIONS,
    daemon: null,
    userSettings: null,
    cliInstalled: true,
    capabilities: null,
    settings: { ...DEFAULT_AGENT_VIEW_SETTINGS, handoffResetTokens: threshold },
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

const context = (contextTokens: number | null): AgentContext => ({
  repo: null,
  model: null,
  issues: null,
  pulls: null,
  servers: [],
  subagents: { running: 0, total: 0, names: [] },
  contextTokens,
});
const CONTEXTS = { s1: context(182_000), s2: context(182_000), s3: context(90_000) };

const job = (phase: HandoffResetPhase, over: Partial<HandoffResetJob> = {}): HandoffResetJob => ({
  paneId: 's1',
  harness: 'claude',
  cwd: '/w/app',
  phase,
  startedAt: Date.now() - 5000,
  updatedAt: Date.now(),
  ...over,
});

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

const socket = () => ({ readyState: 0, send() {}, close() {} }) as unknown as PtySocket;

type Messaging = NonNullable<AgentsTransport['messaging']>;
const handoff = (over: Partial<Messaging> = {}): Partial<Messaging> => ({
  startHandoffReset: vi.fn(async () => job('writing')),
  fetchHandoffReset: vi.fn(async () => null),
  cancelHandoffReset: vi.fn(async () => job('error', { error: 'Cancelled' })),
  ...over,
});

const render = (messaging: Partial<Messaging> = handoff()) => {
  const base = orkumoTransport();
  const transport: AgentsTransport = {
    ...base,
    pty: { ...base.pty, attach: socket },
    contexts: { fetchAgentContexts: vi.fn(async () => CONTEXTS) },
    messaging: { ...base.messaging!, ...messaging },
  };
  localStorage.setItem(
    WORKSPACE_KEY,
    JSON.stringify({ tabs: [tab('t1', ['s1', 's2']), tab('t2', ['s3'])], activeTabId: 't1' })
  );
  localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify({ s2: 'chat' }));
  const ui = <AgentsView active apps={[]} onExit={() => {}} nav={nav} onOpenView={() => {}} />;
  return { ...renderWithAgents(ui, { transport, host: orkumoHost() }), ui };
};
const terminal = (id: string) =>
  document.querySelector(`[data-agent-pane="${id}"]:not([data-chat-pane])`) as HTMLElement;
const chat = () => document.querySelector('[data-chat-pane]') as HTMLElement;
/** Both panes drawn and the contexts in */
const settle = async () => {
  await waitFor(() => expect(chat()).toBeInTheDocument());
  await act(async () => {});
};
const BUTTON = { name: /Handoff \+ Reset/ };
const openMenu = (pane: HTMLElement) =>
  fireEvent.click(within(pane).getByRole('button', { name: 'Pane actions' }));

beforeEach(() => {
  threshold = 150_000;
  localStorage.clear();
  window.HTMLElement.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
});

describe('Handoff + Reset button', () => {
  it('shows above the threshold in the terminal view and the UI view, with the context in its title', async () => {
    render();
    const button = await within(terminal('s1')).findByRole('button', BUTTON);
    expect(button).toHaveAttribute('title', expect.stringContaining('Context 182k tokens > 150k'));
    expect(within(chat()).getByRole('button', BUTTON)).toHaveAttribute(
      'title',
      expect.stringContaining('Context 182k tokens > 150k')
    );
  });

  it('stays away below the threshold, in both views', async () => {
    render();
    await settle();
    // s3 has 90k tokens: its tab is not shown yet, so look at it
    fireEvent.click(screen.getAllByRole('tab', { name: /agent-s3/ })[0]);
    await waitFor(() => expect(terminal('s3')).toBeInTheDocument());
    expect(within(terminal('s3')).queryByRole('button', BUTTON)).toBeNull();
    threshold = 200_000;
    cleanup();
    render();
    await waitFor(() => expect(chat()).toBeInTheDocument());
    await act(async () => {});
    expect(within(chat()).queryByRole('button', BUTTON)).toBeNull();
    expect(within(terminal('s1')).queryByRole('button', BUTTON)).toBeNull();
  });

  it('follows the setting: raising it hides the button, lowering it shows it again', async () => {
    const { rerender, ui } = render();
    await within(terminal('s1')).findByRole('button', BUTTON);
    threshold = 200_000;
    rerender(React.cloneElement(ui));
    await waitFor(() => expect(within(terminal('s1')).queryByRole('button', BUTTON)).toBeNull());
    expect(within(chat()).queryByRole('button', BUTTON)).toBeNull();
    threshold = 100_000;
    rerender(React.cloneElement(ui));
    expect(await within(terminal('s1')).findByRole('button', BUTTON)).toBeInTheDocument();
    expect(within(chat()).getByRole('button', BUTTON)).toBeInTheDocument();
  });

  it('is absent without the transport methods: no button, no menu in a wide pane', async () => {
    render({
      startHandoffReset: undefined,
      fetchHandoffReset: undefined,
      cancelHandoffReset: undefined,
    });
    await settle();
    await act(async () => {});
    expect(screen.queryByRole('button', BUTTON)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pane actions' })).toBeNull();
  });
});

describe('Handoff + Reset in the pane menu', () => {
  it('is in the terminal menu of a wide pane, below the threshold too', async () => {
    threshold = 500_000;
    render();
    await settle();
    openMenu(terminal('s1'));
    expect(within(terminal('s1')).getByRole('menuitem', BUTTON)).toBeEnabled();
    // a wide pane keeps its flat actions: the menu holds only the infrequent one
    expect(within(terminal('s1')).getAllByRole('menuitem')).toHaveLength(1);
  });

  it('is in the terminal menu of a narrow pane, next to the folded actions', async () => {
    threshold = 500_000;
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
    render();
    await settle();
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    openMenu(terminal('s1'));
    const items = within(terminal('s1')).getAllByRole('menuitem');
    expect(items.length).toBeGreaterThan(1);
    expect(within(terminal('s1')).getByRole('menuitem', BUTTON)).toBeInTheDocument();
    width.mockRestore();
  });

  it('is in the menu of the UI view, below the threshold too', async () => {
    threshold = 500_000;
    render();
    await settle();
    openMenu(chat());
    expect(within(chat()).getByRole('menuitem', BUTTON)).toBeEnabled();
    fireEvent.keyDown(within(chat()).getByRole('menu'), { key: 'Escape' });
    expect(within(chat()).queryByRole('menu')).toBeNull();
  });
});

describe('Handoff + Reset confirm and job', () => {
  it('asks first, then starts the job for the pane', async () => {
    const messaging = handoff();
    render(messaging);
    fireEvent.click(await within(terminal('s1')).findByRole('button', BUTTON));
    const dialog = await screen.findByRole('alertdialog');
    expect(startOf(messaging)).not.toHaveBeenCalled();
    expect(dialog).toHaveTextContent(/handoff/i);
    expect(dialog).toHaveTextContent('/clear');
    expect(dialog).toHaveTextContent('weiter');
    fireEvent.click(within(dialog).getByRole('button', BUTTON));
    await waitFor(() => expect(startOf(messaging)).toHaveBeenCalledWith('s1'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('Cancel in the dialog starts nothing', async () => {
    const messaging = handoff();
    render(messaging);
    fireEvent.click(await within(chat()).findByRole('button', BUTTON));
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' })
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(startOf(messaging)).not.toHaveBeenCalled();
  });

  it('the menu entry starts the same dialog and job from the UI view', async () => {
    const messaging = handoff({
      startHandoffReset: vi.fn(async () => job('writing', { paneId: 's2' })),
    });
    render(messaging);
    await within(chat()).findByRole('button', BUTTON);
    openMenu(chat());
    fireEvent.click(within(chat()).getByRole('menuitem', BUTTON));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', BUTTON));
    await waitFor(() => expect(startOf(messaging)).toHaveBeenCalledWith('s2'));
  });

  it.each([
    ['writing', 'Writing handoff…'],
    ['resetting', 'Resetting…'],
    ['continuing', 'Continuing…'],
  ] as const)('shows the %s phase on the button, with a way to cancel', async (phase, text) => {
    const messaging = handoff({ fetchHandoffReset: vi.fn(async () => job(phase)) });
    render(messaging);
    const button = await within(terminal('s1')).findByRole('button', { name: text });
    // active: not startable again
    expect(button).toBeDisabled();
    fireEvent.click(within(terminal('s1')).getByRole('button', { name: 'Cancel Handoff + Reset' }));
    await waitFor(() => expect(cancelOf(messaging)).toHaveBeenCalledWith('s1'));
  });

  it('shows done on the button even below the threshold, then goes away', async () => {
    const messaging = handoff({ fetchHandoffReset: vi.fn(async () => job('done')) });
    threshold = 500_000;
    render(messaging);
    expect(await within(terminal('s1')).findByRole('button', { name: 'Done' })).toBeInTheDocument();
    // an old finished job is not news
    cleanup();
    render(
      handoff({
        fetchHandoffReset: vi.fn(async () => job('done', { updatedAt: Date.now() - 60_000 })),
      })
    );
    await settle();
    await act(async () => {});
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
  });

  it('polls every 2 s while a job is active, and stops when it ended', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const phases: HandoffResetJob[] = [
      job('writing'),
      job('writing'),
      job('resetting'),
      job('done'),
    ];
    const fetchHandoffReset = vi.fn(async (_paneId: string) => phases.shift() ?? job('done'));
    render(handoff({ fetchHandoffReset }));
    await within(terminal('s1')).findByRole('button', { name: 'Writing handoff…' });
    const afterMount = fetchHandoffReset.mock.calls.filter(([id]) => id === 's1').length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    expect(fetchHandoffReset.mock.calls.filter(([id]) => id === 's1').length).toBe(afterMount + 1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });
    expect(await within(terminal('s1')).findByRole('button', { name: 'Done' })).toBeInTheDocument();
    const settled = fetchHandoffReset.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(fetchHandoffReset.mock.calls.length).toBe(settled);
  });

  it('an error shows the server message with Retry and Dismiss', async () => {
    const message = 'Timeout waiting for the handoff (20 min)';
    const failed = job('error', { error: message });
    const messaging = handoff({ fetchHandoffReset: vi.fn(async () => failed) });
    render(messaging);
    const alert = await within(terminal('s1')).findByRole('alert');
    expect(alert).toHaveTextContent(message);
    expect(within(terminal('s1')).getByRole('button', { name: /failed/i })).toHaveAttribute(
      'title',
      expect.stringContaining(message)
    );
    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(startOf(messaging)).toHaveBeenCalledWith('s1'));
    // Dismiss
    cleanup();
    localStorage.clear();
    render(messaging);
    const again = await within(terminal('s1')).findByRole('alert');
    fireEvent.click(within(again).getByRole('button', { name: 'Dismiss' }));
    expect(within(terminal('s1')).queryByRole('alert')).toBeNull();
    // and it stays dismissed after a reload
    cleanup();
    render(messaging);
    await settle();
    expect(within(terminal('s1')).queryByRole('alert')).toBeNull();
  });

  it('a refused start (unsupported harness) shows its message too', async () => {
    const messaging = handoff({
      startHandoffReset: vi.fn(async () => {
        throw new Error('Handoff + Reset is not supported for codex');
      }),
    });
    render(messaging);
    fireEvent.click(await within(terminal('s1')).findByRole('button', BUTTON));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', BUTTON));
    expect(await within(terminal('s1')).findByRole('alert')).toHaveTextContent(
      'Handoff + Reset is not supported for codex'
    );
  });

  it('a cancelled job is not shown as an error', async () => {
    render(handoff({ fetchHandoffReset: vi.fn(async () => job('error', { error: 'Cancelled' })) }));
    await within(terminal('s1')).findByRole('button', BUTTON);
    await act(async () => {});
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('is German in the German locale', async () => {
    const base = orkumoTransport();
    const transport: AgentsTransport = {
      ...base,
      pty: { ...base.pty, attach: socket },
      contexts: { fetchAgentContexts: vi.fn(async () => CONTEXTS) },
      messaging: { ...base.messaging!, ...handoff() },
    };
    localStorage.setItem(
      WORKSPACE_KEY,
      JSON.stringify({ tabs: [tab('t1', ['s1'])], activeTabId: 't1' })
    );
    renderWithAgents(
      <AgentsView active apps={[]} onExit={() => {}} nav={nav} onOpenView={() => {}} />,
      { transport, host: orkumoHost(), locale: 'de' }
    );
    expect(
      await within(terminal('s1')).findByRole('button', { name: /Handoff \+ Reset/ })
    ).toHaveAttribute('title', expect.stringContaining('Kontext 182k Tokens > 150k'));
  });
});

const startOf = (m: Partial<Messaging>) => m.startHandoffReset as Mock;
const cancelOf = (m: Partial<Messaging>) => m.cancelHandoffReset as Mock;

describe('handoffResetTokens setting', () => {
  const props = {
    open: true,
    onClose: vi.fn(),
    settings: DEFAULT_AGENT_VIEW_SETTINGS,
    userSettings: null,
    daemon: null,
    repos: [],
    capabilities: null,
    onRefresh: vi.fn(),
  };

  it('shows the default and saves a changed number on blur', () => {
    const onUpdate = vi.fn(async () => {});
    renderWithAgents(<AgentSettingsPanel {...props} onUpdate={onUpdate} />);
    const input = screen.getByRole('spinbutton', { name: /Handoff \+ Reset/ });
    expect(input).toHaveValue(150_000);
    expect(input).toHaveAttribute('min', '1000');
    fireEvent.change(input, { target: { value: '120000' } });
    fireEvent.blur(input);
    expect(onUpdate).toHaveBeenLastCalledWith({ handoffResetTokens: 120_000 });
  });

  it('lifts a value below the minimum to 1000 and ignores a non-number', () => {
    const onUpdate = vi.fn(async () => {});
    renderWithAgents(<AgentSettingsPanel {...props} onUpdate={onUpdate} />);
    const input = screen.getByRole('spinbutton', { name: /Handoff \+ Reset/ });
    fireEvent.change(input, { target: { value: '50' } });
    fireEvent.blur(input);
    expect(onUpdate).toHaveBeenLastCalledWith({ handoffResetTokens: 1000 });
    onUpdate.mockClear();
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(onUpdate).not.toHaveBeenCalled();
    expect(input).toHaveValue(150_000);
  });
});

describe('mock transport Handoff + Reset', () => {
  it('walks writing, resetting, continuing and done, then reports a small context', async () => {
    vi.useFakeTimers();
    const mock = createMockTransport([session('m1')], {
      contextTokens: { m1: 180_000 },
      handoffStepMs: 1000,
    });
    const api = mock.messaging!;
    expect(await api.fetchHandoffReset!('m1')).toBeNull();
    expect((await api.startHandoffReset!('m1')).phase).toBe('writing');
    await expect(api.startHandoffReset!('m1')).rejects.toThrow(/already running/);
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(1000);
      seen.push((await api.fetchHandoffReset!('m1'))!.phase);
    }
    expect(seen).toEqual(['resetting', 'continuing', 'done']);
    expect((await mock.contexts!.fetchAgentContexts())['m1'].contextTokens).toBe(12_000);
  });

  it('can end in an error, and a cancel ends the job as Cancelled', async () => {
    vi.useFakeTimers();
    const failing = createMockTransport([session('m1')], {
      handoffStepMs: 500,
      handoffError: 'boom',
    });
    await failing.messaging!.startHandoffReset!('m1');
    await vi.advanceTimersByTimeAsync(1000);
    expect(await failing.messaging!.fetchHandoffReset!('m1')).toMatchObject({
      phase: 'error',
      error: 'boom',
    });
    const mock = createMockTransport([session('m1')], { handoffStepMs: 500 });
    await mock.messaging!.startHandoffReset!('m1');
    expect(await mock.messaging!.cancelHandoffReset!('m1')).toMatchObject({
      phase: 'error',
      error: 'Cancelled',
    });
    await vi.advanceTimersByTimeAsync(2000);
    expect((await mock.messaging!.fetchHandoffReset!('m1'))!.phase).toBe('error');
  });
});
