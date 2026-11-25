// Chip row above the input: only running shells / sub-agents; finished ones sit behind "N done"
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithAgents } from './agents';
import { initialChatState, reduceChat, type ChatState } from '../utils/chatEvents';
import { chatSubagents } from '../utils/chatActivity';
import { ChatActivity } from '../components/AgentsView/Chat/ChatActivity';

const tool = (id: string, name: string, input: Record<string, unknown>) => ({
  type: 'assistant',
  message: { id: `m-${id}`, content: [{ type: 'tool_use', id, name, input }] },
});
const result = (id: string, content: string) => ({
  type: 'user',
  message: { content: [{ type: 'tool_result', tool_use_id: id, content }] },
});
const ended = (id: string, toolUseId?: string) => ({
  type: 'devorbit_task_ended',
  id,
  ...(toolUseId ? { toolUseId } : {}),
});
// Claude Code answers a background Agent call at once; the end comes as a <task-notification>
const asyncLaunch = (agentId: string) =>
  `Async agent launched successfully. (This tool result is internal metadata.) agentId: ${agentId} (use SendMessage)`;

/** Long orchestrator session: 38 async agents and 4 shells ended (one stopped), 1 sync agent done */
function session(): ChatState {
  const events: unknown[] = [];
  for (let i = 0; i < 40; i++) {
    events.push(
      tool(`ag${i}`, 'Agent', { subagent_type: 'general-purpose', description: `job ${i}` })
    );
    events.push(result(`ag${i}`, asyncLaunch(`a${i}`)));
    // the same end is logged as queue entry and attachment: arrives twice; some carry no
    // tool-use id and name the agent only by its agentId
    if (i < 30) events.push(ended(`a${i}`, `ag${i}`), ended(`a${i}`, `ag${i}`));
    else if (i < 38) events.push(ended(`a${i}`));
  }
  events.push(tool('sync1', 'Task', { subagent_type: 'Explore', description: 'sync done' }));
  events.push(result('sync1', 'found it'));
  events.push(tool('sync2', 'Agent', { description: 'sync running' }));
  for (let i = 0; i < 5; i++) {
    events.push(tool(`sh${i}`, 'Bash', { command: `serve ${i}`, run_in_background: true }));
    events.push(result(`sh${i}`, `Command running in background with ID: b${i}. Output …`));
    if (i < 3) events.push(ended(`b${i}`, `sh${i}`));
  }
  // stopped by the agent itself: no notification, the TaskStop result is the end
  events.push(tool('stop', 'TaskStop', { task_id: 'b3' }));
  events.push(result('stop', '{"message":"Successfully stopped task: b3"}'));
  return events.reduce<ChatState>(reduceChat, initialChatState);
}

describe('finished background work', () => {
  it('an async agent runs until its notification; ends are recorded once', () => {
    const s = session();
    const agents = chatSubagents(s.messages, s.endedTasks);
    expect(agents.filter((a) => !a.done).map((a) => a.description)).toEqual([
      'job 38',
      'job 39',
      'sync running',
    ]);
    expect(new Set(s.endedTasks).size).toBe(s.endedTasks.length);
  });

  it('shows running chips only and collects finished agents behind "N done"', () => {
    const s = session();
    renderWithAgents(
      <ChatActivity
        chatId="c1"
        messages={s.messages}
        sub={{}}
        busy={false}
        endedTasks={s.endedTasks}
      />
    );
    expect(screen.queryByText(/job 0$/)).toBeNull();
    expect(screen.getByText(/job 39$/)).toBeTruthy();
    expect(screen.getByText('serve 4')).toBeTruthy();
    expect(screen.queryByText('serve 0')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '39 done' }));
    expect(screen.getByText(/job 0$/)).toBeTruthy();
    expect(screen.getByText(/sync done$/)).toBeTruthy();
  });
});
