import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AgentsPanel } from '../src/AgentsPanel';
import { createMockTransport } from '../src/transports/mock';
import type { Agent } from '../src/transport';

beforeAll(() => {
  // jsdom lacks these browser APIs
  window.CSS ??= { escape: (v: string) => v } as typeof CSS;
  Element.prototype.scrollIntoView ??= () => {};
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
});
