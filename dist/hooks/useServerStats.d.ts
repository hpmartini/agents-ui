import type { AgentServerStats } from '../types';
/** Failed refreshes in a row after which the last values are dropped instead of shown as stale */
export declare const MAX_STALE_FAILURES = 3;
export interface ServerStatsState {
    /** Last successful result, keyed by pid */
    stats: Record<number, AgentServerStats>;
    /** Pids asked in the last successful poll: asked but missing from `stats` means the process exited */
    checked: Set<number>;
    /** Time of the last successful poll (ms), null before the first one */
    updatedAt: number | null;
    /** Failed refreshes since the last success */
    failures: number;
}
/**
 * CPU/memory per server pid. Polls every 5s only while `enabled` (panel open) and the tab is
 * visible; a failed refresh keeps the last data and counts up `failures` so the UI can mark it stale.
 * Without the transport's `servers` group it never polls.
 */
export declare function useServerStats(pids: number[], enabled: boolean): ServerStatsState;
