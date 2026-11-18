// AgentTerminal against the transport: the PTY comes from `pty.attach` / `pty.shell`, optional
// groups (ghostty, targets, files) only add their actions.
import React from 'react';
import { describe, it, expect, vi, type Mock } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import type { AgentSession } from '../types';
import type { AgentsTransport, PtySocket } from '../transport';
import { renderWithAgents, testHost, testTransport } from './agents';
import { AgentTerminal } from '../components/AgentsView/AgentTerminal';

// xterm needs a canvas and real layout: a stand-in that records what reaches it
const terminals = vi.hoisted(() => [] as { write: Mock; options: Record<string, unknown> }[]);
vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80;
    rows = 24;
    element: HTMLElement | undefined;
    options: Record<string, unknown>;
    write = vi.fn();
    constructor(options: Record<string, unknown>) {
      this.options = { ...options };
      terminals.push(this);
    }
    loadAddon() {}
    registerLinkProvider() {}
    open(container: HTMLElement) {
      this.element = document.createElement('div');
      container.appendChild(this.element);
    }
    onData() {}
    onResize() {}
    reset() {}
    focus() {}
    dispose() {}
  },
}));
vi.mock('@xterm/addon-fit', () => ({ FitAddon: class { fit() {} } }));
vi.mock('@xterm/addon-web-links', () => ({ WebLinksAddon: class {} }));
vi.mock('@xterm/addon-image', () => ({ ImageAddon: class {} }));
vi.mock('../utils/terminalLinkStyle', () => ({ styleTerminalLinks: () => ({ dispose() {} }) }));
vi.mock('../utils/terminalKeys', () => ({ attachTerminalKeys: () => {} }));

const session = (id: string, over: Partial<AgentSession> = {}): AgentSession => ({
  id,
  sessionId: null,
  kind: 'background',
  cwd: '/w/app',
  startedAt: 0,
  name: 'worker',
  state: null,
  pinned: false,
  order: null,
  links: [],
  displayState: 'idle',
  ...over,
});

function fakeSocket() {
  return {
    readyState: 0,
    send: vi.fn(),
    close: vi.fn(),
    onopen: null as (() => void) | null,
    onmessage: null as ((event: { data: string }) => void) | null,
    onclose: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };
}

function setup(id: string, overrides: Partial<AgentsTransport> = {}, host = testHost()) {
  const socket = fakeSocket();
  const attach = vi.fn(() => socket as unknown as PtySocket);
  const transport = testTransport({ ...overrides, pty: { attach, ...overrides.pty } });
  renderWithAgents(
    <AgentTerminal
      session={session(id)}
      visible
      active
      focused={false}
      onFocus={() => {}}
      onClose={() => {}}
      onPeek={() => {}}
    />,
    { transport, host }
  );
  return { socket, attach, transport, host };
}

describe('AgentTerminal', () => {
  it('only pty.attach: attaches through the transport and is a plain working terminal', async () => {
    const { socket, attach } = setup('t-plain');
    expect(attach).toHaveBeenCalledWith({
      cwd: '/w/app',
      cols: 80,
      rows: 24,
      id: 't-plain',
      args: undefined,
      command: undefined,
    });
    // theme from the --agents-* variables (defaults here), not a host's options
    const terminal = terminals.at(-1)!;
    expect(terminal.options.fontFamily).toContain('Nerd Font');
    expect(screen.queryByRole('button', { name: 'Open in Ghostty' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'UI view' })).toBeNull();
    expect(screen.getByRole('img', { name: 'Disconnected' })).toBeInTheDocument();

    act(() => {
      socket.readyState = WebSocket.OPEN;
      socket.onopen?.();
    });
    await waitFor(() => expect(screen.getByRole('img', { name: 'Connected' })).toBeInTheDocument());
    act(() => socket.onmessage?.({ data: JSON.stringify({ type: 'output', data: 'hello' }) }));
    expect(terminal.write).toHaveBeenCalledWith('hello');
    expect(screen.getByRole('button', { name: 'Detach' })).toBeInTheDocument();
  });

  it("uses the host's terminal options when it has them", () => {
    setup('t-host', {}, testHost({ terminalOptions: { fontFamily: 'Host Mono', theme: { background: '#123456' } } }));
    expect(terminals.at(-1)!.options.fontFamily).toBe('Host Mono');
  });

  it('with ghostty: opens a local Claude session there; failures toast', async () => {
    const openInGhostty = vi.fn().mockRejectedValueOnce(new Error('not installed'));
    const { host } = setup('t-ghostty', { ghostty: { openInGhostty } });
    fireEvent.click(screen.getByRole('button', { name: 'Open in Ghostty' }));
    expect(openInGhostty).toHaveBeenCalledWith({
      cwd: '/w/app',
      command: 'claude',
      args: ['attach', 't-ghostty'],
    });
    await waitFor(() =>
      expect(host.toast.error).toHaveBeenCalledWith('Open in Ghostty failed: not installed')
    );
  });

  it('a session of another instance (#220) has no Ghostty action', () => {
    setup('t-remote', {
      ghostty: { openInGhostty: vi.fn() },
      targets: {
        useAgentTarget: () => '',
        getAgentTarget: () => '',
        targetOf: () => 'mac-mini',
        pinTarget: () => {},
      },
    });
    expect(screen.queryByRole('button', { name: 'Open in Ghostty' })).toBeNull();
  });

  it('a shell pane opens through pty.shell', () => {
    const socket = fakeSocket();
    const shell = vi.fn(() => socket as unknown as PtySocket);
    const attach = vi.fn();
    renderWithAgents(
      <AgentTerminal
        session={session('shell:1:/w/app')}
        visible
        active
        focused={false}
        onFocus={() => {}}
        onClose={() => {}}
        onPeek={() => {}}
      />,
      { transport: testTransport({ pty: { attach, shell } }) }
    );
    expect(shell).toHaveBeenCalledWith({ cwd: '/w/app', cols: 80, rows: 24 });
    expect(attach).not.toHaveBeenCalled();
  });
});
