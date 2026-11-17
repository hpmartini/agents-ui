import type { AgentsTransport } from '../transport';
type HeaderMap = Record<string, string>;
export interface HttpTransportOptions {
    /** API root, e.g. `/api` or `http://127.0.0.1:3001/api` (default `/api`) */
    baseUrl?: string;
    /** WebSocket root for the PTY; default: `baseUrl` with ws(s):// (relative roots use the page origin) */
    wsUrl?: string;
    /** CLI the PTY runs to attach to an agent (default `claude`) */
    command?: string;
    /** Its arguments (default `attach <id>`) */
    attachArgs?: (id: string) => string[];
    /**
     * Extra request headers for every HTTP call, the agent stream included (e.g. a bearer token).
     * A function is called per request, so a refreshed token is picked up.
     */
    headers?: HeaderMap | (() => HeaderMap | Promise<HeaderMap>);
    /** fetch credentials mode; `'include'` sends cookies cross-origin (default: fetch's `'same-origin'`) */
    credentials?: RequestCredentials;
    /**
     * Extra query parameters on the PTY WebSocket URL. Browsers cannot set headers on a WebSocket:
     * cookies go along by themselves (same site), a token has to travel here.
     */
    wsParams?: HeaderMap | (() => HeaderMap);
    /** Injectable for tests */
    fetch?: typeof fetch;
    WebSocket?: typeof WebSocket;
}
/**
 * HTTP + SSE + WebSocket, the wire protocol of Orkumo's server (`/api/agents/*`, `/api/pty`):
 * - list: SSE `{base}/agents/stream` (read with fetch, so headers and status codes work), event
 *   `sessions` carries the full `Agent[]`
 * - POST `{base}/agents/dispatch` `{cwd, prompt?, name?, idle}` -> `{id}`
 * - POST `{base}/agents/{id}/stop`
 * - WS `{ws}/pty?sessionId&cwd&cols&rows&command&args` with JSON frames
 *   out `{type:'input',data}` `{type:'resize',cols,rows}`, in `{type:'output'|'exit'|'error'|'connected'}`
 */
export declare function createHttpTransport(options?: HttpTransportOptions): AgentsTransport;
export {};
