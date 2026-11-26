// UI view of an orchestrator while its agent may wait (bugs D and E): the question card shows only
// for a real dialog on the pane's screen, and the threads panel maximises while it shows
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { ChatPane } from '../components/AgentsView/Chat/ChatPane';
import type { AgentSession } from '../types';
import { renderWithAgents, testTransport } from './agents';

const pty = vi.hoisted(() => ({ screen: '' }));
vi.mock('../components/AgentsView/AgentTerminal', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../components/AgentsView/AgentTerminal')>()),
  paneScreen: () => pty.screen,
  paneActiveTab: () => null,
  paneSuggestion: () => null,
  usePaneConnected: () => true,
  pressKeys: () => true,
  typeIntoPane: () => true,
}));

const fixture = (name: string) =>
  fs
    .readFileSync(path.join(__dirname, 'fixtures', 'agentDialogs', `${name}.txt`), 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .slice(-40)
    .join('\n');

const pane: AgentSession = {
  id: 'p1',
  sessionId: 'uuid-1',
  kind: 'interactive',
  cwd: '/work/demo',
  startedAt: 1,
  name: 'orchestrator',
  state: null,
  pinned: false,
  order: null,
  links: [],
  harness: 'claude',
  // an orchestrator with agents in flight: the server reports it as waiting
  displayState: 'waiting',
};

const renderPane = (screenText: string) => {
  pty.screen = screenText;
  const transport = testTransport({
    chat: {
      openTranscriptView: vi.fn(async () => ({
        id: 'c1',
        harness: 'claude' as const,
        cwd: '/work/demo',
        name: 'orchestrator',
        sessionId: 'uuid-1',
        model: null,
        running: true,
        startedAt: 1,
      })),
      subscribeToChat: vi.fn(() => () => {}),
      fetchChatHistory: vi.fn(async () => ({ events: [], before: 0, more: false })),
    },
    threads: {
      fetchThreads: vi.fn(async () => ({ orchestrator: 'o1', threads: [], tasks: [] })),
      createThread: vi.fn(),
      updateThread: vi.fn(),
    },
  });
  return renderWithAgents(
    <ChatPane
      pane={pane}
      agent={pane}
      sessionId="uuid-1"
      active
      focused
      submitKey="mod+enter"
      showSteps={false}
      onToggleSteps={vi.fn()}
      onFocus={vi.fn()}
      onClose={vi.fn()}
      onShowTerminal={vi.fn()}
    />,
    { transport }
  );
};

// on a control inside the pane (jsdom lays out nothing, so <body> never counts as this pane's)
const maxKey = (on: HTMLElement) =>
  act(() => {
    fireEvent.keyDown(on, { code: 'KeyM', key: 'M', shiftKey: true, metaKey: true, ctrlKey: true });
  });
const mode = () => document.querySelector('[data-threads-mode]')?.getAttribute('data-threads-mode');

afterEach(() => localStorage.clear());

describe('question card in the UI view', () => {
  it('no card for an idle screen: prompt suggestion, status line, agent list (bug D)', async () => {
    renderPane(fixture('claude-idle-suggestion'));
    await screen.findByRole('button', { name: 'Maximize threads' });
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(screen.queryByText(/The agent is asking/)).toBeNull();
    // waiting on its own tasks without a dialog on screen is no question
    expect(screen.queryByText('needs input')).toBeNull();
    expect(screen.queryByRole('button', { name: /Code-Aufgaben/ })).toBeNull();
  });

  it('a real permission dialog and a real AskUserQuestion still show the card', async () => {
    const view = renderPane(fixture('claude-permission-bash'));
    expect(await screen.findByText('Do you want to proceed?')).toBeTruthy();
    expect(screen.getByText('needs input')).toBeTruthy();
    view.unmount();
    renderPane(fixture('claude-question-single'));
    expect(await screen.findByText('Wohin deployen?')).toBeTruthy();
  });

  it('with a card open the threads panel maximises and restores, button and shortcut (bug E)', async () => {
    renderPane(fixture('claude-permission-bash'));
    await screen.findByText('Do you want to proceed?');
    fireEvent.click(screen.getByRole('button', { name: 'Maximize threads' }));
    await waitFor(() => expect(mode()).toBe('full'));
    fireEvent.click(screen.getByRole('button', { name: 'Restore threads' }));
    await waitFor(() => expect(mode()).not.toBe('full'));
    // the card stayed in the main chat
    expect(screen.getByText('Do you want to proceed?')).toBeTruthy();
    maxKey(screen.getByRole('button', { name: 'Maximize threads' }));
    await waitFor(() => expect(mode()).toBe('full'));
    maxKey(screen.getByRole('button', { name: 'Restore threads' }));
    await waitFor(() => expect(mode()).not.toBe('full'));
    expect(screen.getByText('Do you want to proceed?')).toBeTruthy();
  });
});
