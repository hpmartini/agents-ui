import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithAgents } from './agents';
import { NewTaskButton } from '../components/AgentsView/NewTaskButton';
import { GroupingPicker } from '../components/AgentsView/ProjectsRail';
import { shellDe, shellEn, type ShellLabels } from '../labels/shell';

// `de` must name every text `en` has: a missing key fails the type check
const complete: Record<keyof ShellLabels, unknown> = shellDe;

describe('shell labels', () => {
  it('has a German text for every key', () => {
    expect(Object.keys(complete).sort()).toEqual(Object.keys(shellEn).sort());
  });

  it('renders the new-task button and the grouping picker in German', () => {
    renderWithAgents(
      <>
        <NewTaskButton onNew={vi.fn()} />
        <GroupingPicker grouping="state" onGrouping={vi.fn()} />
      </>,
      { locale: 'de' }
    );
    expect(screen.getByRole('button', { name: /Neue Aufgabe/ })).toBeTruthy();
    expect(screen.getByLabelText('Mehr: neuer Agent, Chat, Issue oder Orchestrator')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agents gruppieren nach Status' })).toBeTruthy();
  });
});
