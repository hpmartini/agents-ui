import type { AgentsTransport } from '../transport';
import type { AgentSession } from '../types';
export interface MockTransportOptions {
    /** Delay (ms) of the first list and of every answer; 0 answers at once (tests) */
    latencyMs?: number;
    /** Context tokens per session id, as `contexts` reports them (Handoff + Reset shows above the threshold) */
    contextTokens?: Record<string, number>;
    /**
     * Handoff + Reset: how long each phase (writing, resetting, continuing) lasts before the next.
     * 0 (default): a started job stays in `writing`, nothing is timed.
     */
    handoffStepMs?: number;
    /** Handoff + Reset ends in this error while resetting instead of finishing (demo: the error state) */
    handoffError?: string;
    /** Context tokens a pane has after a finished Handoff + Reset (default 12000) */
    handoffResetTokens?: number;
}
export interface MockTransport extends AgentsTransport {
    /** Terminals attached so far, per session id (tests: a remount must not open a second one) */
    attachCount: Map<string, number>;
    /** Replaces one session's fields and pushes the list */
    update: (id: string, patch: Partial<AgentSession>) => void;
    /** Replaces the whole list and pushes it */
    setAgents: (sessions: AgentSession[]) => void;
    /** Makes the list fail (`onError` with the message) for current and new subscribers; null recovers */
    fail: (error: {
        message?: string;
        status?: number;
    } | null) => void;
}
/**
 * In-memory transport for the demo and tests: sessions live in an array, `dispatchAgent` adds
 * one, `stopAgent` marks it stopped, a terminal echoes what is typed and answers each line, and
 * `logs` returns those lines (peek panel). Settings are kept in memory. No timers run unless
 * `latencyMs` > 0.
 */
export declare function createMockTransport(initial?: AgentSession[], { latencyMs, contextTokens: initialTokens, handoffStepMs, handoffError, handoffResetTokens, }?: MockTransportOptions): MockTransport;
