import type { AgentSession, AgentDaemonStatus, ClaudeUserSettings, AgentViewSettings, AgentCapabilities } from '../types';
interface UseAgentSessionsOptions {
    /** When false, no SSE subscription is opened (view not visible) */
    active?: boolean;
}
/**
 * Loads the agent view settings, keeps the session list live via SSE and
 * surfaces notifications (needs input / completed / failed).
 */
export declare function useAgentSessions({ active }?: UseAgentSessionsOptions): {
    sessions: AgentSession[];
    listTarget: string | null;
    daemon: AgentDaemonStatus | null;
    userSettings: ClaudeUserSettings | null;
    cliInstalled: boolean | null;
    capabilities: AgentCapabilities | null;
    settings: AgentViewSettings;
    updateSettings: (partial: Partial<AgentViewSettings>) => Promise<void>;
    loading: boolean;
    error: string | null;
    errorStatus: number | null;
    received: boolean;
    connected: boolean;
    counts: {
        awaitingInput: number;
        working: number;
        completed: number;
        failed: number;
    };
    lastCompleted: {
        count: number;
        at: number;
    } | null;
    refresh: () => Promise<void>;
};
export {};
