import { describe, it, expect, vi } from 'vitest';
import { createMockTransport } from '../transports/mock';
import type { AgentSession } from '../types';

// The mock opens its socket in a microtask (latencyMs 0)
const tick = () => Promise.resolve();

describe('createMockTransport', () => {
  it('pushes the list, adds a dispatched session and marks a stopped one', async () => {
    const transport = createMockTransport();
    const onSessions = vi.fn();
    transport.agents.subscribeToAgents({ onSessions });
    expect(onSessions).toHaveBeenLastCalledWith([]);

    const { id } = await transport.agents.dispatchAgent({ cwd: '/w', prompt: 'fix the build' });
    const added: AgentSession[] = onSessions.mock.lastCall![0];
    expect(added).toEqual([
      expect.objectContaining({ id, cwd: '/w', name: 'fix the build', displayState: 'working' }),
    ]);

    await transport.agents.stopAgent(id);
    expect(onSessions.mock.lastCall![0][0]).toMatchObject({ id, displayState: 'stopped' });
  });

  it('reports a failing list to subscribers and recovers', () => {
    const transport = createMockTransport();
    const onError = vi.fn();
    const onSessions = vi.fn();
    transport.agents.subscribeToAgents({ onSessions, onError });
    transport.fail({ status: 503, message: 'HTTP 503' });
    expect(onError).toHaveBeenLastCalledWith('HTTP 503');
    transport.fail(null);
    expect(onSessions).toHaveBeenCalledTimes(2);
  });

  it('attaches a PTY that connects, echoes input and answers each line', async () => {
    const transport = createMockTransport();
    const { id } = await transport.agents.dispatchAgent({ cwd: '/w', prompt: 'task' });
    const socket = transport.pty.attach({ id, cwd: '/w', cols: 80, rows: 24 });
    const messages: { type: string; data?: string }[] = [];
    socket.onmessage = (event) => messages.push(JSON.parse(event.data));
    const onopen = vi.fn();
    socket.onopen = onopen;
    await tick();
    expect(onopen).toHaveBeenCalled();
    expect(socket.readyState).toBe(WebSocket.OPEN);
    expect(messages[0]).toMatchObject({ type: 'connected', cwd: '/w' });

    socket.send(JSON.stringify({ type: 'input', data: 'hi\r' }));
    const output = messages
      .filter((m) => m.type === 'output')
      .map((m) => m.data)
      .join('');
    expect(output).toContain('hi');
    expect(output).toContain('mock answer to: hi');
    expect(transport.attachCount.get(id)).toBe(1);

    const logs = await transport.logs!.fetchAgentLogs(id);
    expect(logs.entries.map((e) => e.text)).toEqual(['hi', 'mock answer to: hi']);

    await transport.agents.stopAgent(id);
    expect(messages.at(-1)).toMatchObject({ type: 'exit', exitCode: 0 });
    expect(socket.readyState).toBe(WebSocket.CLOSED);
  });
});
