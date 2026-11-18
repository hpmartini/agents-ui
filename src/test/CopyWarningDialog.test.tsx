import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import type { AgentSession } from '../types';
import { CopyWarningDialog } from '../components/AgentsView/CopyWarningDialog';

// From Orkumo's test/sessionOpenPath.test.tsx (#236); the PTY spawn part stays there.
const JOB = 'fa4e0236';
const ORIG = 'fa4e0236-0000-4000-8000-000000000001';
const RESPAWN = 'b0b00236-0000-4000-8000-000000000002';

const job: AgentSession = {
  id: JOB,
  sessionId: RESPAWN,
  sessionIds: [RESPAWN, ORIG],
  kind: 'background',
  cwd: '/w/issue-10',
  startedAt: 1,
  name: 'MACC demo-landing#10',
  state: null,
  pinned: false,
  order: null,
  links: [],
  displayState: 'idle',
};

describe('CopyWarningDialog (#236 AC-3)', () => {
  const setup = (handover: boolean) => {
    const run = vi.fn();
    const close = vi.fn();
    render(<CopyWarningDialog holder={job} handover={handover} onConfirm={run} onClose={close} />);
    return { run, close };
  };

  it('Cancel starts nothing', () => {
    const { run, close } = setup(false);
    expect(screen.getByRole('alertdialog').textContent).toMatch(/Erzeugt Kopie/);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).toHaveBeenCalledTimes(1);
    expect(run).not.toHaveBeenCalled();
    cleanup();
  });

  it('Create copy runs exactly once', () => {
    const { run } = setup(false);
    fireEvent.click(screen.getByRole('button', { name: 'Create copy' }));
    expect(run).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('says "stops" only when the caller stops the holder', () => {
    setup(false);
    expect(screen.getByRole('alertdialog').textContent).toMatch(/second process/);
    expect(screen.getByRole('alertdialog').textContent).not.toMatch(/stops/);
    cleanup();
    setup(true);
    expect(screen.getByRole('alertdialog').textContent).toMatch(/stops that process/);
    cleanup();
  });
});
