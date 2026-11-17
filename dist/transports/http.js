const STREAM_RETRIES = 10;
async function errorFrom(res) {
    const payload = await res.json().catch(() => null);
    const message = payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : `${res.status} ${res.statusText}`.trim();
    return Object.assign(new Error(message), { status: res.status });
}
/** Server-sent events from a fetch body: calls onEvent(type, data) per complete event */
async function readEvents(body, onEvent) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
        const { value, done } = await reader.read();
        if (done)
            return;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() ?? '';
        for (const block of blocks) {
            let type = 'message';
            const data = [];
            for (const line of block.split(/\r?\n/)) {
                if (line.startsWith('event:'))
                    type = line.slice(6).trim();
                else if (line.startsWith('data:'))
                    data.push(line.slice(5).replace(/^ /, ''));
            }
            if (data.length)
                onEvent(type, data.join('\n'));
        }
    }
}
const absolute = (url) => typeof location === 'undefined' ? url : new URL(url, location.href).toString();
/**
 * HTTP + SSE + WebSocket, the wire protocol of Orkumo's server (`/api/agents/*`, `/api/pty`):
 * - list: SSE `{base}/agents/stream` (read with fetch, so headers and status codes work), event
 *   `sessions` carries the full `Agent[]`
 * - POST `{base}/agents/dispatch` `{cwd, prompt?, name?, idle}` -> `{id}`
 * - POST `{base}/agents/{id}/stop`
 * - WS `{ws}/pty?sessionId&cwd&cols&rows&command&args` with JSON frames
 *   out `{type:'input',data}` `{type:'resize',cols,rows}`, in `{type:'output'|'exit'|'error'|'connected'}`
 */
export function createHttpTransport(options = {}) {
    const base = (options.baseUrl ?? '/api').replace(/\/+$/, '');
    const wsBase = (options.wsUrl ?? absolute(base).replace(/^http/, 'ws')).replace(/\/+$/, '');
    const doFetch = options.fetch ?? ((...args) => fetch(...args));
    const WS = options.WebSocket ?? globalThis.WebSocket;
    const command = options.command ?? 'claude';
    const attachArgs = options.attachArgs ?? ((id) => ['attach', id]);
    // attach needs the agent's cwd; the stream is the only list we see
    const known = new Map();
    const extraHeaders = async () => typeof options.headers === 'function' ? await options.headers() : (options.headers ?? {});
    const request = async (path, init = {}) => doFetch(`${base}${path}`, {
        ...init,
        headers: { ...init.headers, ...(await extraHeaders()) },
        ...(options.credentials ? { credentials: options.credentials } : {}),
    });
    const post = async (path, body) => {
        const res = await request(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (!res.ok)
            throw await errorFrom(res);
        return (await res.json().catch(() => null));
    };
    return {
        subscribe(onAgents, onError) {
            let closed = false;
            let attempts = 0;
            let timer;
            let abort = null;
            const fail = (error, retry) => {
                if (closed)
                    return;
                onError?.(error);
                if (retry && attempts < STREAM_RETRIES)
                    timer = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 30000));
            };
            const connect = async () => {
                if (closed)
                    return;
                abort = new AbortController();
                try {
                    const res = await request('/agents/stream', {
                        headers: { Accept: 'text/event-stream' },
                        signal: abort.signal,
                    });
                    if (!res.ok || !res.body) {
                        // 401/403 do not heal by retrying; 5xx and the like may
                        return fail(await errorFrom(res), res.status !== 401 && res.status !== 403);
                    }
                    await readEvents(res.body, (type, data) => {
                        if (type !== 'sessions')
                            return;
                        try {
                            const agents = JSON.parse(data);
                            attempts = 0;
                            agents.forEach((a) => known.set(a.id, a));
                            onAgents(agents);
                        }
                        catch {
                            // malformed frame: keep the last list
                        }
                    });
                    // the server ended the stream: reconnect
                    fail(Object.assign(new Error('Agent stream closed'), {}), true);
                }
                catch (err) {
                    fail(Object.assign(new Error(err instanceof Error ? err.message : String(err)), {}), true);
                }
            };
            void connect();
            return () => {
                closed = true;
                clearTimeout(timer);
                abort?.abort();
            };
        },
        async start({ cwd, prompt, name }) {
            const result = await post('/agents/dispatch', {
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
        attach(id, { cols, rows }, handlers) {
            const query = new URLSearchParams({
                sessionId: `agent-${id}-${Date.now()}`,
                cwd: known.get(id)?.cwd ?? '',
                cols: String(cols),
                rows: String(rows),
                command,
                args: JSON.stringify(attachArgs(id)),
                ...(typeof options.wsParams === 'function' ? options.wsParams() : options.wsParams),
            });
            const ws = new WS(`${wsBase}/pty?${query}`);
            let ended = false;
            const send = (message) => {
                if (ws.readyState === WS.OPEN)
                    ws.send(JSON.stringify(message));
            };
            ws.onopen = () => handlers.onOpen?.();
            ws.onmessage = (event) => {
                let data;
                try {
                    data = JSON.parse(String(event.data));
                }
                catch {
                    handlers.onData(String(event.data));
                    return;
                }
                if (data.type === 'output')
                    handlers.onData(data.data ?? '');
                else if (data.type === 'exit') {
                    ended = true;
                    handlers.onExit(data.exitCode ?? null);
                }
                else if (data.type === 'error')
                    handlers.onError?.(data.message ?? 'PTY error');
            };
            ws.onerror = () => handlers.onError?.('WebSocket connection error');
            ws.onclose = () => {
                if (!ended)
                    handlers.onExit(null);
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
