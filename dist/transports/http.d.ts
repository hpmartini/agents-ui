import type { AgentsTransport } from '../transport';
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
/**
 * HTTP + SSE + WebSocket, the wire protocol of Orkumo's server (`/api/agents/*`, `/api/pty`):
 * - GET-less list: SSE `{base}/agents/stream`, event `sessions` carries the full `Agent[]`
 * - POST `{base}/agents/dispatch` `{cwd, prompt?, name?, idle}` -> `{id}`
 * - POST `{base}/agents/{id}/stop`
 * - WS `{ws}/pty?sessionId&cwd&cols&rows&command&args` with JSON frames
 *   out `{type:'input',data}` `{type:'resize',cols,rows}`, in `{type:'output'|'exit'|'error'|'connected'}`
 */
export declare function createHttpTransport(options?: HttpTransportOptions): AgentsTransport;
