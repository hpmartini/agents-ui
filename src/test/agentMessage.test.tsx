// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { agentMessage } from '../utils/chatEvents';
import { UserMessage } from '../components/AgentsView/Chat/ChatMessages';
import { ViewActionsContext } from '../viewActions';
import { renderWithAgents } from './agents';

describe('message from another agent (orkumo send)', () => {
  it('reads the sender line: id and name, id only, unknown sender, none', () => {
    expect(agentMessage('[von Agent omp-u3 „playmaker“ via orkumo send]\n\nbitte prüfen')).toEqual({
      id: 'omp-u3',
      name: 'playmaker',
      body: 'bitte prüfen',
    });
    expect(agentMessage('[von Agent abc-1 via orkumo send]\n\nhi')).toEqual({
      id: 'abc-1',
      name: null,
      body: 'hi',
    });
    expect(agentMessage('[via orkumo send, Absender unbekannt]\n\nhi')).toEqual({
      id: null,
      name: null,
      body: 'hi',
    });
    expect(agentMessage('mach [von Agent x via orkumo send] weiter')).toBeNull();
  });

  it("renders as the agent's bubble with a link to it, not as the user's", () => {
    const openAgent = vi.fn();
    const { container } = renderWithAgents(
      <ViewActionsContext.Provider value={{ openAgent }}>
        <UserMessage text={'[von Agent omp-u3 „playmaker“ via orkumo send]\n\nbitte prüfen'} />
      </ViewActionsContext.Provider>
    );
    expect(container.querySelector('[data-agent-message]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'playmaker' }));
    expect(openAgent).toHaveBeenCalledWith('omp-u3');
    expect(screen.getByText('bitte prüfen')).toBeTruthy();
    expect(screen.queryByText(/von Agent/)).toBeNull();
  });

  it('outside the view the sender is plain text', () => {
    renderWithAgents(
      <UserMessage text={'[von Agent omp-u3 „playmaker“ via orkumo send]\n\nbitte prüfen'} />
    );
    expect(screen.getByText('playmaker').tagName).toBe('SPAN');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('own prompts stay the user bubble', () => {
    const { container } = renderWithAgents(<UserMessage text="eigener prompt" />);
    expect(container.querySelector('[data-agent-message]')).toBeNull();
    expect(screen.getByText('eigener prompt')).toBeTruthy();
  });
});
