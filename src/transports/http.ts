import type { Agent, AgentsTransport, PtyChannel } from '../transport';

export interface HttpTransportOptions {
  /** API root, e.g. `/api` or `http://127.0.0.1:3001/api` (default `/api`) */
  baseUrl?: string;
  /** WebSocket root for the PTY; default: `baseUrl` with ws(s):// (relative roots use the page origin) */
  wsUrl?: string;
  /** CLI the PTY runs to attach to an agent (default `claude`) */
  command?: string;
  /** Its arguments (default `attach <id>`) */
  attachArgs?: (id: string) => string[];
  /** Injectable for tests */
  fetch?: typeof fetch;
  EventSource?: typeof EventSource;
  WebSocket?: typeof WebSocket;
}

const absolute = (url: string) =>
  typeof location === 'undefined' ? url : new URL(url, location.href).toString();

/**
 * HTTP + SSE + WebSocket, the wire protocol of Orkumo's server (`/api/agents/*`, `/api/pty`):
 * - GET-less list: SSE `{base}/agents/stream`, event `sessions` carries the full `Agent[]`
 * - POST `{base}/agents/dispatch` `{cwd, prompt?, name?, idle}` -> `{id}`
 * - POST `{base}/agents/{id}/stop`
 * - WS `{ws}/pty?sessionId&cwd&cols&rows&command&args` with JSON frames
 *   out `{type:'input',data}` `{type:'resize',cols,rows}`, in `{type:'output'|'exit'|'error'|'connected'}`
 */
export function createHttpTransport(options: HttpTransportOptions = {}): AgentsTransport {
  const base = (options.baseUrl ?? '/api').replace(/\/+$/, '');
  const wsBase = (options.wsUrl ?? absolute(base).replace(/^http/, 'ws')).replace(/\/+$/, '');
  const doFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const ES = options.EventSource ?? globalThis.EventSource;
  const WS = options.WebSocket ?? globalThis.WebSocket;
  const command = options.command ?? 'claude';
  const attachArgs = options.attachArgs ?? ((id: string) => ['attach', id]);
  // attach needs the agent's cwd; the stream is the only list we see
  const known = new Map<string, Agent>();

  const post = async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await doFetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const error = payload && typeof payload === 'object' && 'error' in payload;
      throw new Error(error ? String(payload.error) : `${res.status} ${res.statusText}`);
    }
    return payload as T;
  };

  return {
    subscribe(onAgents) {
      let source: EventSource | null = null;
      let attempts = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let closed = false;
      const connect = () => {
        if (closed) return;
        source = new ES(`${base}/agents/stream`);
        source.addEventListener('connected', () => (attempts = 0));
        source.addEventListener('sessions', (event) => {
          try {
            const agents = JSON.parse((event as MessageEvent).data) as Agent[];
            agents.forEach((a) => known.set(a.id, a));
            onAgents(agents);
          } catch {
            // malformed frame: keep the last list
          }
        });
        source.onerror = () => {
          source?.close();
          source = null;
          if (closed || attempts >= 10) return;
          timer = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 30000));
        };
      };
      connect();
      return () => {
        closed = true;
        clearTimeout(timer);
        source?.close();
      };
    },

    async start({ cwd, prompt, name }) {
      const result = await post<{ id: string }>('/agents/dispatch', {
        cwd,
        prompt,
        name,
        idle: !prompt,
      });
      return { id: result.id };
    },

    async stop(id) {
      await post(`/agents/${encodeURIComponent(id)}/stop`);
    },

    attach(id, { cols, rows }, handlers): PtyChannel {
      const query = new URLSearchParams({
        sessionId: `agent-${id}-${Date.now()}`,
        cwd: known.get(id)?.cwd ?? '',
        cols: String(cols),
        rows: String(rows),
        command,
        args: JSON.stringify(attachArgs(id)),
      });
      const ws = new WS(`${wsBase}/pty?${query}`);
      let ended = false;
      const send = (message: object) => {
        if (ws.readyState === WS.OPEN) ws.send(JSON.stringify(message));
      };
      ws.onopen = () => handlers.onOpen?.();
      ws.onmessage = (event) => {
        let data: { type?: string; data?: string; exitCode?: number; message?: string };
        try {
          data = JSON.parse(String(event.data));
        } catch {
          handlers.onData(String(event.data));
          return;
        }
        if (data.type === 'output') handlers.onData(data.data ?? '');
        else if (data.type === 'exit') {
          ended = true;
          handlers.onExit(data.exitCode ?? null);
        } else if (data.type === 'error') handlers.onError?.(data.message ?? 'PTY error');
      };
      ws.onerror = () => handlers.onError?.('WebSocket connection error');
      ws.onclose = () => {
        if (!ended) handlers.onExit(null);
        ended = true;
      };
      return {
        write: (data) => send({ type: 'input', data }),
        resize: (c, r) => send({ type: 'resize', cols: c, rows: r }),
        close: () => {
          ended = true;
          ws.close();
        },
      };
    },
  };
}
