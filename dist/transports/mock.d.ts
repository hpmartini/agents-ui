import type { Agent, AgentsTransport } from '../transport';
export interface MockTransport extends AgentsTransport {
    /** Terminals attached so far, per agent id (tests: a remount must not open a second one) */
    attachCount: Map<string, number>;
    /** Replaces one agent's fields and pushes the list */
    update: (id: string, patch: Partial<Agent>) => void;
    /** Replaces the whole list and pushes it */
    setAgents: (agents: Agent[]) => void;
    /** Makes the list fail (e.g. `{status: 403}`) for current and new subscribers; null recovers */
    fail: (error: {
        message?: string;
        status?: number;
    } | null) => void;
}
/**
 * In-memory backend for demos and tests: agents live in an array, a terminal echoes what is typed
 * and answers each line. No timers run unless `latencyMs` > 0.
 */
export declare function createMockTransport(initial?: Agent[], latencyMs?: number): MockTransport;
