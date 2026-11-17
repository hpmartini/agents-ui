import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
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
});
