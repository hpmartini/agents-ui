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
export interface AgentsTransport {
    /** Pushes the full agent list now (as soon as known) and on every change; returns unsubscribe */
    subscribe: (onAgents: (agents: Agent[]) => void) => () => void;
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
}
