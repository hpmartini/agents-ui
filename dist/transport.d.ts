/**
 * The contract between the agents panel and whatever runs the agents. The panel only ever talks
 * to an `AgentsTransport`; pick an adapter (HTTP/WebSocket, Electron IPC, mock) or write your own.
 */
/** Same states and names as Orkumo's `AgentSession.displayState` */
export type AgentDisplayState = 'working' | 'waiting' | 'needs-input' | 'idle' | 'completed' | 'failed' | 'stopped' | 'loop' | 'interactive';
/** One agent; a subset of Orkumo's `AgentSession`, so its rows fit as they are */
export interface Agent {
    id: string;
    name: string;
    /** Working directory the agent runs in */
    cwd: string;
    displayState: AgentDisplayState;
    /** One-line activity summary */
    detail?: string | null;
    /** epoch ms */
    startedAt: number;
}
export interface StartAgentRequest {
    cwd: string;
    /** First task; without one the agent starts idle and waits for input */
    prompt?: string;
    name?: string;
}
/** Output of one attached terminal */
export interface PtyHandlers {
    onData: (data: string) => void;
    /** The process behind the terminal ended or detached; null when unknown */
    onExit: (exitCode: number | null) => void;
    /** Connection-level failure (refused, dropped); the terminal stays usable for a reattach */
    onError?: (message: string) => void;
    /** The channel is open and accepts input */
    onOpen?: () => void;
}
/** Input side of one attached terminal */
export interface PtyChannel {
    write: (data: string) => void;
    resize: (cols: number, rows: number) => void;
    /** Detach only: the agent keeps running */
    close: () => void;
}
/** Why the agent list could not be loaded; `status` is the HTTP status where there is one */
export interface TransportError extends Error {
    status?: number;
}
/** One line of an agent's conversation, as the transcript view shows it (plain text, no markup) */
export interface TranscriptEntry {
    /** Stable per entry, so the view can keep its scroll position across updates */
    id: string;
    /** `tool`: a tool call of the agent, summarised to one line */
    role: 'user' | 'assistant' | 'tool';
    text: string;
    /** epoch ms, where known */
    at?: number | null;
}
export interface AgentsTransport {
    /**
     * Pushes the full agent list now (as soon as known) and on every change; returns unsubscribe.
     * `onError` reports a failed load (e.g. 403, 503, unreachable); a later list clears it.
     */
    subscribe: (onAgents: (agents: Agent[]) => void, onError?: (error: TransportError) => void) => () => void;
    /** Starts an agent; resolves with its id */
    start: (request: StartAgentRequest) => Promise<{
        id: string;
    }>;
    stop: (id: string) => Promise<void>;
    /** Attaches a terminal to the agent's process */
    attach: (id: string, size: {
        cols: number;
        rows: number;
    }, handlers: PtyHandlers) => PtyChannel;
    /**
     * Optional: pushes the agent's conversation (oldest first, the whole visible window each time)
     * now and on every change; returns unsubscribe. Without it the panes offer no transcript view.
     */
    transcript?: (id: string, onEntries: (entries: TranscriptEntry[]) => void, onError?: (error: TransportError) => void) => () => void;
}
