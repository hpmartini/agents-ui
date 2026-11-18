// UI view parts with the smallest chat group (MAPLE): transcript stream and history only
import React, { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithAgents, testTransport } from './agents';
import type { AgentsTransport } from '../transport';
import type { ChatMessage } from '../utils/chatEvents';
import { ChatStatusLine } from '../components/AgentsView/Chat/ChatStatusLine';
import { ChatActivity } from '../components/AgentsView/Chat/ChatActivity';
import { ChatComposer } from '../components/AgentsView/Chat/ChatComposer';
import { AssistantBlock, ChatIdContext } from '../components/AgentsView/Chat/ChatMessages';

const messages: ChatMessage[] = [
  {
    kind: 'assistant',
    key: 'a1',
    streaming: false,
    blocks: [
      {
        type: 'tool',
        id: 'tool-1',
        name: 'Bash',
        input: { command: 'npm run dev', run_in_background: true },
        result: 'Command running in background with ID: sh1',
        images: ['shot-1'],
      },
    ],
  },
];

function Composer() {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  return (
    <ChatComposer
      chatId="c1"
      value={value}
      onChange={setValue}
      onSubmit={() => {}}
      onStop={() => {}}
      busy={false}
      disabled={false}
      submitKey="enter"
      history={[]}
      commands={[{ name: 'cd', description: 'change dir', argumentHint: '<path>' }]}
      agents={[]}
      inputRef={inputRef}
    />
  );
}

describe('UI view with only the transcript part of the chat group', () => {
  it('renders without status, completion, shell output or result images', async () => {
    vi.useFakeTimers();
    const chat: AgentsTransport['chat'] = {
      openTranscriptView: vi.fn(),
      subscribeToChat: vi.fn(() => () => {}),
      fetchChatHistory: vi.fn(),
    };
    const { container } = renderWithAgents(
      <ChatIdContext.Provider value="c1">
        <ChatStatusLine chatId="c1" turns={0} visible />
        <ChatActivity chatId="c1" messages={messages} sub={{}} busy={false} />
        <AssistantBlock
          block={(messages[0] as Extract<ChatMessage, { kind: 'assistant' }>).blocks[0]}
        />
        <Composer />
      </ChatIdContext.Provider>,
      { transport: testTransport({ chat }) }
    );
    const input = screen.getByLabelText('Message');
    fireEvent.change(input, { target: { value: '@src', selectionStart: 4 } });
    fireEvent.change(input, { target: { value: '/cd ~/Mu', selectionStart: 8 } });
    await act(async () => vi.advanceTimersByTime(500));
    vi.useRealTimers();

    // the shell is listed from the events, but opens no output panel
    fireEvent.click(screen.getByRole('button', { name: /npm run dev/ }));
    expect(screen.queryByText('Loading…')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByText('Context')).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
