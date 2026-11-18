import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { AgentsPanel } from '../src/AgentsPanel';
import * as ws from '../src/workspace';
import { createMockTransport } from '../src/transports/mock';
import type { Agent, AgentsTransport } from '../src/transport';
import { clampWidth } from '../src/ResizeHandle';

beforeAll(() => {
  // jsdom lacks these browser APIs
  window.CSS ??= { escape: (v: string) => v } as typeof CSS;
  Element.prototype.scrollIntoView ??= () => {};
  // jsdom has no PointerEvent: fireEvent.pointer* would drop clientX and pointerId
  globalThis.PointerEvent ??= class extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  } as typeof PointerEvent;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});
beforeEach(() => localStorage.clear());
afterEach(cleanup);

const agent = (id: string): Agent => ({
  id,
  name: id,
  cwd: `/w/${id}`,
  displayState: 'idle',
  startedAt: 0,
});

describe('AgentsPanel', () => {
  it('keeps one terminal channel per agent across split and unsplit (pane remounts)', async () => {
    const transport = createMockTransport([agent('alpha'), agent('beta')]);
    render(<AgentsPanel transport={transport} defaultCwd="/w" />);
    fireEvent.click(screen.getByTitle('alpha · /w/alpha'));
    fireEvent.click(screen.getByTitle('beta · /w/beta'));
    expect(screen.getAllByRole('tab')).toHaveLength(2);

    // split the active tab (beta) into its neighbour: one tab, two panes
    fireEvent.click(screen.getByLabelText('Split beta right'));
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(screen.getByRole('tab').getAttribute('aria-label')).toContain('2 panes');

    // and back out into its own tab
    fireEvent.click(screen.getAllByLabelText('Move to own tab')[0]);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    await act(() => new Promise((r) => setTimeout(r, 0)));

    expect(transport.attachCount.get('alpha')).toBe(1);
    expect(transport.attachCount.get('beta')).toBe(1);
  });

  it('starts an agent from the dialog and opens it in a tab', async () => {
    const transport = createMockTransport();
    render(<AgentsPanel transport={transport} defaultCwd="/home/magos" />);
    fireEvent.click(screen.getByTitle('Start a new agent'));
    expect((screen.getByLabelText('Folder') as HTMLInputElement).value).toBe('/home/magos');
    fireEvent.change(screen.getByLabelText('Task'), { target: { value: 'sort the inbox' } });
    await act(async () => fireEvent.click(screen.getByText('Start')));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('tab').getAttribute('aria-label')).toContain('sort the inbox');
  });

  it('closes panes of agents that disappeared and remembers the layout', () => {
    const transport = createMockTransport([agent('a')]);
    const { unmount } = render(<AgentsPanel transport={transport} defaultCwd="/w" />);
    fireEvent.click(screen.getByTitle('a · /w/a'));
    expect(JSON.parse(localStorage.getItem('agents-ui:workspace')!).tabs).toHaveLength(1);
    act(() => transport.setAgents([]));
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    unmount();
  });

  it('speaks German with locale="de" and takes single label overrides', () => {
    const transport = createMockTransport([agent('a')]);
    render(<AgentsPanel transport={transport} defaultCwd="/w" locale="de" labels={{ newAgent: 'Los' }} />);
    expect(screen.getByText('Agenten')).toBeTruthy();
    expect(screen.getByTitle('Neuen Agenten starten').textContent).toContain('Los');
    expect(screen.getByLabelText('Bereit')).toBeTruthy();
  });

  it('shows an error instead of loading forever, and retries', async () => {
    const transport = createMockTransport([agent('a')]);
    transport.fail({ status: 503, message: 'upstream down' });
    render(<AgentsPanel transport={transport} defaultCwd="/w" locale="de" />);
    expect(screen.getByRole('alert').textContent).toContain('nicht erreichbar');
    expect(screen.getByRole('alert').textContent).toContain('upstream down');
    expect(screen.queryByRole('status')).toBeNull();
    transport.fail(null);
    act(() => fireEvent.click(screen.getByText('Erneut versuchen')));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTitle('a · /w/a')).toBeTruthy();
  });

  it('names a 403 as missing access', () => {
    const transport = createMockTransport();
    transport.fail({ status: 403 });
    render(<AgentsPanel transport={transport} defaultCwd="/w" />);
    expect(screen.getByRole('alert').textContent).toContain('No access');
  });

  it('opens the agent given as selectedId and reports the active one', () => {
    const transport = createMockTransport([agent('a'), agent('b')]);
    const onChange = vi.fn();
    const { rerender } = render(
      <AgentsPanel transport={transport} defaultCwd="/w" selectedId="b" onSelectedIdChange={onChange} />
    );
    expect(screen.getByRole('tab').getAttribute('aria-label')).toContain('b');
    expect(onChange).toHaveBeenLastCalledWith('b');
    rerender(<AgentsPanel transport={transport} defaultCwd="/w" selectedId="a" onSelectedIdChange={onChange} />);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(onChange).toHaveBeenLastCalledWith('a');
  });

  it('asks before stopping and lets the host protect agents with canStop', async () => {
    const transport = createMockTransport([
      { ...agent('main'), displayState: 'working' },
      { ...agent('w'), displayState: 'working' },
    ]);
    const stop = vi.spyOn(transport, 'stop');
    render(<AgentsPanel transport={transport} defaultCwd="/w" canStop={(a) => a.id !== 'main'} />);
    expect(screen.queryByLabelText('Stop main')).toBeNull();
    fireEvent.click(screen.getByLabelText('Stop w'));
    expect(screen.getByRole('alertdialog').textContent).toContain('Stop agent?');
    fireEvent.click(screen.getByText('Cancel'));
    expect(stop).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Stop w'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Stop' })));
    expect(stop).toHaveBeenCalledWith('w');
  });

  it('stops without asking when confirmStop is false, and sets the terminal font', () => {
    const transport = createMockTransport([{ ...agent('w'), displayState: 'working' }]);
    const stop = vi.spyOn(transport, 'stop');
    const { container } = render(
      <AgentsPanel transport={transport} defaultCwd="/w" confirmStop={false} terminalFont="Iosevka, monospace" />
    );
    fireEvent.click(screen.getByLabelText('Stop w'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(stop).toHaveBeenCalledWith('w');
    const root = container.querySelector('.agents-ui') as HTMLElement;
    expect(root.style.getPropertyValue('--agents-mono')).toBe('Iosevka, monospace');
  });

  it('a synced selectedId wins over the stored layout (no stale report before the list loads)', async () => {
    localStorage.setItem('agents-ui:workspace', JSON.stringify(ws.openSession(ws.EMPTY_WORKSPACE, 'a')));
    const transport = createMockTransport([agent('a'), agent('b')], 20);
    const reports: (string | null)[] = [];
    function Host() {
      const [id, setId] = useState<string | null>('b');
      return (
        <AgentsPanel
          transport={transport}
          defaultCwd="/w"
          selectedId={id}
          onSelectedIdChange={(next) => (reports.push(next), setId(next))}
        />
      );
    }
    render(<Host />);
    await act(() => new Promise((r) => setTimeout(r, 40)));
    expect(reports).not.toContain('a');
    expect(reports.at(-1)).toBe('b');
    fireEvent.click(document.querySelector('[data-agent-row][title="a · /w/a"]')!);
    expect(reports.at(-1)).toBe('a');
  });
});

describe('resizable list', () => {
  it('clamps a width into its bounds, and an unknown max yields to min', () => {
    expect(clampWidth(100, 200, 500)).toBe(200);
    expect(clampWidth(900, 200, 500)).toBe(500);
    expect(clampWidth(300, 200, 500)).toBe(300);
    expect(clampWidth(300, 200, 150)).toBe(200);
  });

  it('resizes the list by keyboard and drag, and remembers the width', () => {
    const transport = createMockTransport([agent('a')]);
    const { unmount } = render(<AgentsPanel transport={transport} defaultCwd="/w" storageKey="k" />);
    const handle = screen.getByRole('separator', { name: 'Resize the agent list' });
    expect(handle.getAttribute('aria-valuenow')).toBe('300');
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle.getAttribute('aria-valuenow')).toBe('316');
    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 150, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 150, pointerId: 1 });
    expect(handle.getAttribute('aria-valuenow')).toBe('366');
    fireEvent.keyDown(handle, { key: 'Home' });
    expect(handle.getAttribute('aria-valuenow')).toBe('200');
    unmount();
    render(<AgentsPanel transport={transport} defaultCwd="/w" storageKey="k" />);
    expect(screen.getByRole('separator', { name: 'Resize the agent list' }).getAttribute('aria-valuenow')).toBe('200');
  });
});

describe('transcript view', () => {
  it('switches a pane between terminal and transcript, the terminal staying attached', async () => {
    // own id: the terminal registry is module-wide and outlives a test
    const transport = createMockTransport([{ ...agent('tv'), detail: 'sort the inbox' }]);
    render(<AgentsPanel transport={transport} defaultCwd="/w" locale="de" />);
    fireEvent.click(screen.getByTitle('tv · /w/tv'));
    await act(() => new Promise((r) => setTimeout(r, 0)));
    expect(transport.attachCount.get('tv')).toBe(1);
    expect(screen.queryByRole('log')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Verlauf' }));
    const log = await screen.findByRole('log');
    expect(log.textContent).toContain('sort the inbox');
    expect(screen.getByRole('button', { name: 'Verlauf' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Terminal' }));
    expect(screen.queryByRole('log')).toBeNull();
    expect(transport.attachCount.get('tv')).toBe(1);
  });

  it('shows what is typed in the terminal in the transcript', async () => {
    const transport = createMockTransport([agent('a')]);
    const seen: string[][] = [];
    transport.transcript!('a', (e) => seen.push(e.map((x) => `${x.role}:${x.text}`)));
    const pty = transport.attach('a', { cols: 80, rows: 24 }, { onData() {}, onExit() {} });
    pty.write('hi\r');
    expect(seen.at(-1)).toEqual(['user:hi', 'assistant:mock answer to: hi']);
  });

  it('reports a transcript that cannot be read', async () => {
    const mock = createMockTransport([agent('a')]);
    const transport: AgentsTransport = {
      ...mock,
      transcript: (_id, _on, onError) => {
        onError?.(Object.assign(new Error('gone'), { status: 404 }));
        return () => {};
      },
    };
    render(<AgentsPanel transport={transport} defaultCwd="/w" />);
    fireEvent.click(screen.getByTitle('a · /w/a'));
    fireEvent.click(screen.getByRole('button', { name: 'Transcript' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Transcript not readable: gone');
  });

  it('offers no switch when the transport has no transcript', () => {
    const { transcript: _omit, ...rest } = createMockTransport([agent('a')]);
    render(<AgentsPanel transport={rest} defaultCwd="/w" />);
    fireEvent.click(screen.getByTitle('a · /w/a'));
    expect(screen.queryByRole('button', { name: 'Transcript' })).toBeNull();
  });
});
