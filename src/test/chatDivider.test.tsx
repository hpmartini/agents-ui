// The divider between a session's contexts: /clear, compaction, the pane's next session
import React from 'react';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithAgents } from './agents';
import { groupAnswers, initialChatState, reduceChat, type ChatState } from '../utils/chatEvents';
import { ChatItemView } from '../components/AgentsView/Chat/ChatMessages';

const at = new Date(2026, 10, 25, 22, 29).getTime();
const fold = (events: unknown[], state: ChatState = initialChatState) =>
  events.reduce<ChatState>(reduceChat, state);
const prompt = (text: string) => ({ type: 'devorbit_user', text });

describe('context divider', () => {
  it('keeps the turns before a /clear, then a timed divider, then the new turns', () => {
    const state = fold([
      prompt('before'),
      { type: 'system', subtype: 'clear', ts: at },
      prompt('after'),
    ]);
    expect(state.messages.map((m) => m.kind)).toEqual(['user', 'divider', 'user']);
    expect(state.messages[1]).toMatchObject({ kind: 'divider', reason: 'clear', ts: at });
    // the prompt after it still starts a context (start prompts)
    expect(state.messages[2]).toMatchObject({ text: 'after', initial: true });
  });

  it('one divider per switch: a session mark right before the /clear record becomes the clear', () => {
    const state = fold([
      prompt('before'),
      { type: 'system', subtype: 'session_switch', ts: at - 1000 },
      { type: 'system', subtype: 'clear', ts: at },
      prompt('after'),
    ]);
    expect(state.messages.filter((m) => m.kind === 'divider')).toEqual([
      { kind: 'divider', key: 'd1', reason: 'clear', ts: at },
    ]);
  });

  it('compaction and a switch to another session have their own labels; none before the first turn', () => {
    const state = fold([
      { type: 'system', subtype: 'compact_boundary', ts: at },
      prompt('one'),
      { type: 'system', subtype: 'compact_boundary', ts: at },
      prompt('two'),
      { type: 'system', subtype: 'session_switch', ts: at },
      prompt('three'),
    ]);
    expect(state.messages.map((m) => (m.kind === 'divider' ? m.reason : m.kind))).toEqual([
      'user',
      'compact',
      'user',
      'switch',
      'user',
    ]);
  });

  it('renders as a labelled separator with the time', () => {
    const state = fold([prompt('before'), { type: 'system', subtype: 'clear', ts: at }]);
    const item = groupAnswers(state.messages)[1];
    renderWithAgents(<ChatItemView item={item} showSteps={false} harness="Claude" model={null} />);
    const sep = screen.getByRole('separator');
    expect(sep.textContent).toBe('Context cleared · 22:29');
  });
});
