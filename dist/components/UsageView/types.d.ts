/** Plan limits as `GET /api/usage` and the chat status report them */
export interface UsageWindow {
    /** null = window has reset or the value is stale */
    usedPercent: number | null;
    /** null when `reset`: the window rolled over and nothing was used since */
    resetsAt: number | null;
    reset?: boolean;
    windowMinutes?: number;
}
export type UsageLimitSource = 'statusline' | 'oauth' | 'claude-cache' | 'rollout';
export interface UsageLimits {
    fiveHour: UsageWindow | null;
    weekly: UsageWindow | null;
    source: UsageLimitSource;
    asOf: number;
    plan?: string;
}
