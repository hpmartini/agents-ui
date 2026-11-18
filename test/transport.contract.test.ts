import { describe, it, expect, vi } from 'vitest';
import type { Agent, AgentsTransport, PtyHandlers, StartAgentRequest } from '../src/transport';
import { createHttpTransport } from '../src/transports/http';
import { createIpcTransport, IPC_CHANNELS, type IpcBridge } from '../src/transports/ipc';
import { createMockTransport } from '../src/transports/mock';

const agent = (id: string, patch: Partial<Agent> = {}): Agent => ({
  id,
  name: id,
  cwd: '/work',
  displayState: 'idle',
  startedAt: 1,
  ...patch,
});

/** A backend behind one adapter, driven by the shared contract suite */
interface Harness {
  transport: AgentsTransport;
  /** Server-side change of the agent list */
  setAgents: (agents: Agent[]) => void;
  /** Server-side terminal output / end for the last attached terminal */
  output: (data: string) => void;
  exit: (code: number) => void;
  /** What reached the server from the last attached terminal */
  inputs: () => string[];
  resizes: () => [number, number][];
  started: () => { cwd: string; prompt?: string; name?: string }[];
  stopped: () => string[];
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function contract(name: string, make: () => Harness) {
  describe(`${name} transport contract`, () => {
    it('pushes the list on subscribe and on change, and stops after unsubscribe', async () => {
      const h = make();
      const seen: Agent[][] = [];
      const off = h.transport.subscribe((a) => seen.push(a));
      h.setAgents([agent('a')]);
      await flush();
      expect(seen.at(-1)?.map((a) => a.id)).toEqual(['a']);
      off();
      h.setAgents([agent('a'), agent('b')]);
      await flush();
      expect(seen.at(-1)?.map((a) => a.id)).toEqual(['a']);
    });

    it('starts and stops agents', async () => {
      const h = make();
      const { id } = await h.transport.start({ cwd: '/work', prompt: 'do it', name: 'n' });
      expect(typeof id).toBe('string');
      expect(h.started().at(-1)).toMatchObject({ cwd: '/work', prompt: 'do it', name: 'n' });
      await h.transport.stop(id);
      expect(h.stopped()).toContain(id);
    });

    it('attaches a terminal: output in, input and resize out, exit, close', async () => {
      const h = make();
      h.transport.subscribe(() => {});
      h.setAgents([agent('a')]);
      const handlers: PtyHandlers = { onData: vi.fn(), onExit: vi.fn(), onOpen: vi.fn() };
      const pty = h.transport.attach('a', { cols: 80, rows: 24 }, handlers);
      await flush();
      expect(handlers.onOpen).toHaveBeenCalled();
      h.output('hello');
      expect(handlers.onData).toHaveBeenCalledWith('hello');
      pty.write('x');
      pty.resize(100, 30);
      await flush();
      expect(h.inputs()).toContain('x');
      expect(h.resizes()).toContainEqual([100, 30]);
      h.exit(3);
      expect(handlers.onExit).toHaveBeenCalledWith(3);
      pty.close();
    });
  });
}

// --- Orkumo wire protocol over fakes -----------------------------------------------------------

function httpHarness(): Harness {
  const started: Harness['started'] extends () => infer T ? T : never = [];
  const stopped: string[] = [];
  const streams = new Set<ReadableStreamDefaultController<Uint8Array>>();
  const sse = (list: Agent[]) =>
    new TextEncoder().encode(`event: sessions\ndata: ${JSON.stringify(list)}\n\n`);
  let socket: FakeWebSocket | null = null;
  let agents: Agent[] = [];

  class FakeWebSocket {
    static OPEN = 1;
    readyState = 0;
    sent: { type: string; data?: string; cols?: number; rows?: number }[] = [];
    onopen: (() => void) | null = null;
    onmessage: ((e: { data: string }) => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(public url: string) {
      socket = this;
      queueMicrotask(() => {
        this.readyState = 1;
        this.onopen?.();
      });
    }
    send(raw: string) {
      this.sent.push(JSON.parse(raw));
    }
    close() {
      this.readyState = 3;
      this.onclose?.();
    }
  }
  const fakeFetch = (async (url: string, init?: RequestInit) => {
    if (url.endsWith('/agents/stream')) {
      let ctrl!: ReadableStreamDefaultController<Uint8Array>;
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          ctrl = c;
          streams.add(c);
          c.enqueue(sse(agents));
        },
        cancel() {
          streams.delete(ctrl);
        },
      });
      init?.signal?.addEventListener('abort', () => {
        streams.delete(ctrl);
        try {
          ctrl.error(new DOMException('aborted', 'AbortError'));
        } catch {
          // already closed
        }
      });
      return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
    }
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    if (url.endsWith('/agents/dispatch')) {
      started.push(body);
      return new Response(JSON.stringify({ id: 'new1' }));
    }
    const stop = /\/agents\/([^/]+)\/stop$/.exec(url);
    if (stop) {
      stopped.push(decodeURIComponent(stop[1]));
      return new Response(JSON.stringify({ output: '' }));
    }
    return new Response(JSON.stringify({ error: 'nope' }), { status: 404 });
  }) as typeof fetch;

  return {
    transport: createHttpTransport({
      baseUrl: 'http://h/api',
      fetch: fakeFetch,
      WebSocket: FakeWebSocket as unknown as typeof WebSocket,
    }),
    setAgents: (list) => {
      agents = list;
      streams.forEach((c) => c.enqueue(sse(list)));
    },
    output: (data) => socket?.onmessage?.({ data: JSON.stringify({ type: 'output', data }) }),
    exit: (exitCode) => socket?.onmessage?.({ data: JSON.stringify({ type: 'exit', exitCode }) }),
    inputs: () => socket?.sent.filter((m) => m.type === 'input').map((m) => m.data!) ?? [],
    resizes: () =>
      socket?.sent.filter((m) => m.type === 'resize').map((m) => [m.cols!, m.rows!]) ?? [],
    started: () => started,
    stopped: () => stopped,
  };
}

function ipcHarness(): Harness {
  const started: { cwd: string; prompt?: string; name?: string }[] = [];
  const stopped: string[] = [];
  const inputs: string[] = [];
  const resizes: [number, number][] = [];
  const listeners = new Map<string, Set<(p: unknown) => void>>();
  let agents: Agent[] = [];
  let ptyId = '';
  const emit = (channel: string, payload: unknown) =>
    listeners.get(channel)?.forEach((fn) => fn(payload));
  const bridge: IpcBridge = {
    on(channel, fn) {
      const set = listeners.get(channel) ?? new Set();
      listeners.set(channel, set);
      set.add(fn);
      return () => set.delete(fn);
    },
    async invoke(channel, payload) {
      const p = payload as Record<string, never>;
      switch (channel) {
        case IPC_CHANNELS.list:
          return agents;
        case IPC_CHANNELS.start:
          started.push(payload as StartAgentRequest);
          return { id: 'new1' };
        case IPC_CHANNELS.stop:
          stopped.push(p.id);
          return;
        case IPC_CHANNELS.ptyOpen:
          ptyId = p.ptyId;
          return;
        case IPC_CHANNELS.ptyInput:
          inputs.push(p.data);
          return;
        case IPC_CHANNELS.ptyResize:
          resizes.push([p.cols, p.rows]);
          return;
      }
    },
  };
  return {
    transport: createIpcTransport(bridge),
    setAgents: (list) => {
      agents = list;
      emit(IPC_CHANNELS.changed, list);
    },
    output: (data) => emit(IPC_CHANNELS.ptyEvent, { ptyId, type: 'output', data }),
    exit: (exitCode) => emit(IPC_CHANNELS.ptyEvent, { ptyId, type: 'exit', exitCode }),
    inputs: () => inputs,
    resizes: () => resizes,
    started: () => started,
    stopped: () => stopped,
  };
}

function mockHarness(): Harness {
  const transport = createMockTransport();
  const started: { cwd: string; prompt?: string; name?: string }[] = [];
  const stopped: string[] = [];
  const inputs: string[] = [];
  const resizes: [number, number][] = [];
  let handlers: PtyHandlers | null = null;
  // the mock is its own backend: observe it by wrapping
  const wrapped: AgentsTransport = {
    subscribe: transport.subscribe,
    start: (req) => (started.push(req), transport.start(req)),
    stop: (id) => (stopped.push(id), transport.stop(id)),
    attach: (id, size, h) => {
      handlers = h;
      const pty = transport.attach(id, size, h);
      return {
        write: (d) => (inputs.push(d), pty.write(d)),
        resize: (c, r) => (resizes.push([c, r]), pty.resize(c, r)),
        close: pty.close,
      };
    },
  };
  return {
    transport: wrapped,
    setAgents: transport.setAgents,
    output: (data) => handlers?.onData(data),
    exit: (code) => handlers?.onExit(code),
    inputs: () => inputs,
    resizes: () => resizes,
    started: () => started,
    stopped: () => stopped,
  };
}

contract('http', httpHarness);
contract('ipc', ipcHarness);

describe('mock transport', () => {
  it('starts, lists, answers typed lines and stops', async () => {
    const t = createMockTransport();
    const lists: Agent[][] = [];
    t.subscribe((a) => lists.push(a));
    const { id } = await t.start({ cwd: '/w', prompt: 'hi' });
    expect(lists.at(-1)?.[0]).toMatchObject({ id, displayState: 'working', cwd: '/w' });
    const onData = vi.fn();
    const onExit = vi.fn();
    const pty = t.attach(id, { cols: 80, rows: 24 }, { onData, onExit });
    pty.write('ok\r');
    expect(onData.mock.calls.map((c) => c[0]).join('')).toContain('mock answer to: ok');
    await t.stop(id);
    expect(onExit).toHaveBeenCalledWith(0);
    expect(lists.at(-1)?.[0].displayState).toBe('stopped');
    expect(t.attachCount.get(id)).toBe(1);
  });
});

describe('http transport wire details', () => {
  it('sends the Orkumo PTY query (attach args, size) and idle start without prompt', async () => {
    const h = httpHarness();
    h.transport.subscribe(() => {});
    h.setAgents([agent('a b', { cwd: '/x y' })]);
    let url = '';
    class Spy {
      static OPEN = 1;
      constructor(u: string) {
        url = u;
      }
      close() {}
    }
    const t = createHttpTransport({
      baseUrl: 'http://h/api',
      WebSocket: Spy as unknown as typeof WebSocket,
      wsParams: () => ({ token: 't0k' }),
    });
    t.attach('a', { cols: 1, rows: 2 }, { onData() {}, onExit() {} });
    const q = new URL(url).searchParams;
    expect(url.startsWith('ws://h/api/pty?')).toBe(true);
    expect(JSON.parse(q.get('args')!)).toEqual(['attach', 'a']);
    expect(q.get('command')).toBe('claude');
    expect([q.get('cols'), q.get('rows')]).toEqual(['1', '2']);
    expect(q.get('token')).toBe('t0k');
    await h.transport.start({ cwd: '/w' });
    expect(h.started().at(-1)).toMatchObject({ cwd: '/w', idle: true });
  });

  it('has no transcript unless asked for, then polls it and pushes only changes', async () => {
    expect(createHttpTransport({ baseUrl: 'http://h/api' }).transcript).toBeUndefined();
    vi.useFakeTimers();
    try {
      const urls: string[] = [];
      let entries = [{ id: '1', role: 'user', text: 'hi' }];
      const t = createHttpTransport({
        baseUrl: 'http://h/api',
        transcriptPollMs: 1000,
        fetch: (async (url: string) => {
          urls.push(url);
          return new Response(JSON.stringify({ ok: true, entries }));
        }) as unknown as typeof fetch,
      });
      const seen: unknown[][] = [];
      const off = t.transcript!('a b', (e) => seen.push(e));
      await vi.advanceTimersByTimeAsync(0);
      expect(urls[0]).toBe('http://h/api/agents/a%20b/transcript');
      expect(seen).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1000);
      expect(seen).toHaveLength(1);
      entries = [...entries, { id: '2', role: 'assistant', text: 'hello' }];
      await vi.advanceTimersByTimeAsync(1000);
      expect(seen).toHaveLength(2);
      off();
      await vi.advanceTimersByTimeAsync(5000);
      expect(urls).toHaveLength(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports a transcript the server refuses, with its message', async () => {
    const t = createHttpTransport({
      baseUrl: 'http://h/api',
      transcriptPollMs: 60000,
      fetch: (async () =>
        new Response(JSON.stringify({ error: 'no transcript' }), { status: 404 })) as unknown as typeof fetch,
    });
    const error = await new Promise<{ message: string; status?: number }>((resolve) => {
      t.transcript!('a', () => {}, resolve);
    });
    expect(error).toMatchObject({ message: 'no transcript', status: 404 });
  });

  it('rejects with the server error message', async () => {
    const t = createHttpTransport({
      baseUrl: 'http://h/api',
      fetch: (async () =>
        new Response(JSON.stringify({ error: 'cwd not allowed' }), {
          status: 400,
        })) as unknown as typeof fetch,
    });
    await expect(t.start({ cwd: '/etc' })).rejects.toThrow('cwd not allowed');
  });

  it('sends the auth headers and credentials on every call, the stream included', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    let token = 'a';
    const t = createHttpTransport({
      baseUrl: 'http://h/api',
      headers: () => ({ Authorization: `Bearer ${token}` }),
      credentials: 'include',
      fetch: (async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return new Response(JSON.stringify({ id: 'x' }));
      }) as unknown as typeof fetch,
    });
    await t.start({ cwd: '/w', prompt: 'p' });
    token = 'b';
    const off = t.subscribe(() => {});
    await flush();
    off();
    const headers = calls.map((c) => (c.init?.headers as Record<string, string>).Authorization);
    expect(headers).toEqual(['Bearer a', 'Bearer b']);
    expect(calls.every((c) => c.init?.credentials === 'include')).toBe(true);
    expect(calls[1].url).toBe('http://h/api/agents/stream');
  });

  it('reports a failed stream with its status and does not retry a 403', async () => {
    let calls = 0;
    const t = createHttpTransport({
      baseUrl: 'http://h/api',
      fetch: (async () => {
        calls++;
        return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
      }) as unknown as typeof fetch,
    });
    const errors: { message: string; status?: number }[] = [];
    const off = t.subscribe(() => {}, (e) => errors.push(e));
    await new Promise((r) => setTimeout(r, 20));
    off();
    expect(errors).toEqual([expect.objectContaining({ message: 'forbidden', status: 403 })]);
    expect(calls).toBe(1);
  });

  it('reports a 503 and retries', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const t = createHttpTransport({
      baseUrl: 'http://h/api',
      fetch: (async () => {
        calls++;
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
      }) as unknown as typeof fetch,
    });
    const errors: number[] = [];
    const off = t.subscribe(() => {}, (e) => errors.push(e.status ?? 0));
    await vi.advanceTimersByTimeAsync(1100);
    off();
    vi.useRealTimers();
    expect(errors).toEqual([503, 503]);
    expect(calls).toBe(2);
  });

  it('reconnects quietly when a working stream ends', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const enc = new TextEncoder();
    const t = createHttpTransport({
      baseUrl: 'http://h/api',
      fetch: (async () => {
        calls++;
        return new Response(
          new ReadableStream({
            start(c) {
              c.enqueue(enc.encode('event: sessions\ndata: []\n\n'));
              c.close();
            },
          })
        );
      }) as unknown as typeof fetch,
    });
    const errors: unknown[] = [];
    const off = t.subscribe(() => {}, (e) => errors.push(e));
    await vi.advanceTimersByTimeAsync(1100);
    off();
    vi.useRealTimers();
    expect(calls).toBe(2);
    expect(errors).toEqual([]);
  });

  it('parses events split across chunks and ignores other event types', async () => {
    const enc = new TextEncoder();
    const chunks = ['event: connected\ndata: {}\n\nevent: sess', 'ions\ndata: [{"id":"a","name":"a","cwd":"/","displayState":"idle","startedAt":0}]\n', '\n'];
    const t = createHttpTransport({
      baseUrl: 'http://h/api',
      fetch: (async () =>
        new Response(
          new ReadableStream({
            start(c) {
              chunks.forEach((x) => c.enqueue(enc.encode(x)));
            },
          })
        )) as unknown as typeof fetch,
    });
    const lists: Agent[][] = [];
    const off = t.subscribe((a) => lists.push(a));
    await flush();
    off();
    expect(lists).toEqual([[expect.objectContaining({ id: 'a' })]]);
  });
});

describe('subscribe error channel', () => {
  it('ipc: a failing list call reports through onError', async () => {
    const t = createIpcTransport({
      invoke: async () => {
        throw Object.assign(new Error('denied'), { status: 403 });
      },
      on: () => () => {},
    });
    const errors: { message: string; status?: number }[] = [];
    t.subscribe(() => {}, (e) => errors.push(e));
    await flush();
    expect(errors[0]).toMatchObject({ message: 'denied', status: 403 });
  });

  it('mock: fail() reports to subscribers, recovery pushes the list again', () => {
    const t = createMockTransport([agent('a')]);
    const lists: Agent[][] = [];
    const errors: (number | undefined)[] = [];
    t.subscribe((a) => lists.push(a), (e) => errors.push(e.status));
    t.fail({ status: 503 });
    t.fail(null);
    expect(errors).toEqual([503]);
    expect(lists).toHaveLength(2);
  });
});

// the mock is checked against the same suite through a thin observer
contract('mock', mockHarness);
