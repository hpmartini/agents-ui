import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { cleanup, screen, fireEvent, within } from '@testing-library/react';
import { DispatchInput } from '../components/AgentsView/DispatchInput';
import { resumableSessionId, sessionHarness } from '../utils/agentSessions';
import type { AgentHarness, AgentSession } from '../types';
import { renderWithAgents } from './agents';

// The server-side settings schema check (#195 AC-2) stays in Orkumo, next to its server.

function renderInput(
  harness: AgentHarness | undefined,
  extra: Partial<React.ComponentProps<typeof DispatchInput>> = {}
) {
  const onHarnessChange = vi.fn();
  renderWithAgents(
    <DispatchInput
      value="@"
      onChange={() => {}}
      onSubmit={() => {}}
      onEscape={() => {}}
      onOpenEditor={() => {}}
      onPickDirectory={() => {}}
      targetCwd="/p"
      hint={null}
      subagents={[{ name: 'reviewer', description: 'd', model: null, source: 'project' }]}
      repos={[]}
      commands={[]}
      inputRef={React.createRef()}
      harness={harness}
      onHarnessChange={onHarnessChange}
      harnessInstalled={{ opencode: false, codex: true }}
      {...extra}
    />
  );
  return { onHarnessChange };
}

describe('harness picker (#195, AC-5, AC-7)', () => {
  it('shows the preset harness and reports a change', () => {
    const { onHarnessChange } = renderInput('codex');
    const trigger = screen.getByRole('button', { name: /^Harness/ });
    expect(trigger).toHaveTextContent('Codex');
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: 'Pi' }));
    expect(onHarnessChange).toHaveBeenCalledWith('pi');
  });

  it('marks a missing CLI as not installed and disables it', () => {
    renderInput('claude');
    fireEvent.click(screen.getByRole('button', { name: /^Harness/ }));
    const option = screen.getByRole('option', { name: 'OpenCode (not installed)' });
    expect(option).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('option', { name: 'Codex' })).not.toHaveAttribute('aria-disabled');
  });

  it('turns off the Claude-only parts for another harness', () => {
    renderInput('claude');
    expect(screen.getByText('Dispatch and attach')).toBeTruthy();
    expect(screen.getByText(/@agent · @repo/)).toBeTruthy();

    cleanup();
    renderInput('omp');
    expect(screen.queryByText('Dispatch and attach')).toBeNull();
    expect(screen.queryByText(/@agent · @repo/)).toBeNull();
    expect(screen.getByText(/Runs interactively in a terminal pane/)).toBeTruthy();
    expect(screen.getByText('Start agent')).toBeTruthy();
  });

  it('has no picker for chats', () => {
    renderInput(undefined, { variant: 'chat' });
    expect(screen.queryByRole('button', { name: /^Harness/ })).toBeNull();
  });
});

describe('sessionHarness / resumableSessionId (#195)', () => {
  const base = {
    id: 'i',
    sessionId: null,
    kind: 'interactive',
    cwd: '/p',
    startedAt: 0,
    name: 'n',
    state: null,
    pinned: false,
    order: null,
    links: [],
    displayState: 'idle',
  } as AgentSession;

  it('derives the harness from the PTY command', () => {
    expect(sessionHarness(base)).toBe('claude');
    expect(sessionHarness({ ...base, ptyCommand: 'pi' })).toBe('pi');
  });

  it('never offers another harness for `claude --resume`', () => {
    expect(resumableSessionId({ ...base, ptyArgs: ['--session-id', 'abc'] })).toBe('abc');
    expect(resumableSessionId({ ...base, ptyCommand: 'codex', ptyArgs: ['--', 'x'] })).toBeNull();
  });
});

describe('slash list in the composer', () => {
  const commands = [
    { name: 'skill:grilling', description: 'Grill the user about a plan', source: 'omp' },
    { name: 'skill:tdd', description: 'Test-driven development', source: 'omp' },
    // omp's commands carry source 'omp', which AgentSlashCommand does not list (as in Orkumo)
  ] as unknown as React.ComponentProps<typeof DispatchInput>['commands'];

  it('offers omp its own commands, filtered on name and description', () => {
    renderInput('omp', { value: '/', commands });
    fireEvent.select(screen.getByRole('textbox'), { target: { selectionStart: 1 } });
    const opts = () => within(screen.getByRole('listbox')).getAllByRole('option');
    expect(opts().map((o) => o.textContent)).toEqual([
      expect.stringContaining('/skill:grilling'),
      expect.stringContaining('/skill:tdd'),
    ]);
    cleanup();
    renderInput('omp', { value: '/driven', commands });
    fireEvent.select(screen.getByRole('textbox'), { target: { selectionStart: 7 } });
    expect(opts()).toHaveLength(1);
    expect(opts()[0]).toHaveTextContent('Test-driven development');
  });
});
