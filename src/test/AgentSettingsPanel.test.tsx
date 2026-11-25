import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentSettingsPanel } from '../components/AgentsView/AgentSettingsPanel';
import { DEFAULT_AGENT_VIEW_SETTINGS } from '../types';
import { renderWithAgents, testHost, testTransport } from './agents';

const props = {
  open: true,
  onClose: vi.fn(),
  settings: DEFAULT_AGENT_VIEW_SETTINGS,
  onUpdate: vi.fn(async () => {}),
  userSettings: null,
  daemon: null,
  repos: [],
  capabilities: null,
  onRefresh: vi.fn(),
};

describe('AgentSettingsPanel transport groups', () => {
  it('hides the supervisor section without the `daemon` group', () => {
    renderWithAgents(<AgentSettingsPanel {...props} />);
    expect(screen.getByText('Agent view settings')).toBeTruthy();
    expect(screen.queryByText('Background service (supervisor)')).toBeNull();
    expect(screen.queryByRole('button', { name: /claude respawn --all/ })).toBeNull();
  });

  it('runs the daemon actions through the transport and toasts the first output line', async () => {
    const respawnAllAgents = vi.fn(async () => ({ output: 'respawned 2\nmore' }));
    const host = testHost();
    renderWithAgents(<AgentSettingsPanel {...props} />, {
      transport: testTransport({ daemon: { respawnAllAgents, stopAgentDaemon: vi.fn() } }),
      host,
    });
    fireEvent.click(screen.getByRole('button', { name: /claude respawn --all/ }));
    await waitFor(() => expect(host.toast.success).toHaveBeenCalledWith('respawned 2'));
    expect(respawnAllAgents).toHaveBeenCalledTimes(1);
    expect(props.onRefresh).toHaveBeenCalled();
  });
});

describe('AgentSettingsPanel choices', () => {
  it('two-value settings are pills, longer lists menus; Escape closes only the menu', () => {
    const onUpdate = vi.fn(async () => {});
    const onClose = vi.fn();
    renderWithAgents(<AgentSettingsPanel {...props} onUpdate={onUpdate} onClose={onClose} />);
    const density = screen.getByRole('radiogroup', { name: 'Card density' });
    fireEvent.click(within(density).getByRole('radio', { name: 'Compact' }));
    expect(onUpdate).toHaveBeenLastCalledWith({ cardDensity: 'compact' });
    fireEvent.click(screen.getByRole('button', { name: /^--permission-mode/ }));
    const list = screen.getByRole('listbox', { name: '--permission-mode' });
    expect(screen.getByRole('combobox', { name: 'Search --permission-mode' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(list).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('"Group by" offers every grouping and shows the stored one, the default included', async () => {
    const user = userEvent.setup();
    for (const [grouping, label] of [
      ['project', 'Project'],
      ['state', 'Status'],
      ['directory', 'Directory'],
      ['none', 'None'],
    ] as const) {
      const { unmount } = renderWithAgents(
        <AgentSettingsPanel {...props} settings={{ ...DEFAULT_AGENT_VIEW_SETTINGS, grouping }} />
      );
      const trigger = screen.getByRole('button', { name: /^Group by/ });
      expect(trigger).toHaveTextContent(label);
      await user.click(trigger);
      const list = screen.getByRole('listbox', { name: 'Group by' });
      expect(within(list).getAllByRole('option').map((o) => o.textContent)).toEqual([
        'Project',
        'Status',
        'Directory',
        'None',
      ]);
      expect(within(list).getByRole('option', { selected: true })).toHaveTextContent(label);
      unmount();
    }
    expect(DEFAULT_AGENT_VIEW_SETTINGS.grouping).toBe('project');
  });
});
