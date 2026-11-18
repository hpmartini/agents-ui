import type { UsageWindow } from '../components/UsageView/types';
import { type TerminalLabels } from '../labels/terminal';
/** "in 2 h 53 min", "in 4 T 6 h", "in 12 min", "jetzt" */
export declare function formatResetIn(resetsAt: number | null, now?: number, t?: TerminalLabels): string;
export type LimitStatus = 'unknown' | 'ok' | 'warn' | 'critical';
export declare function limitStatus(window: UsageWindow | null | undefined): LimitStatus;
/** Week bar sections Mo, Di, Mi, Do, Fr, weekend (Sa+So count as one), as % borders */
export declare const WEEK_TICKS: number[];
/** Where `now` sits on that week bar in % (Mon 00:00 = 0, Sun 24:00 = 100), local time */
export declare function weekPace(now?: number): number;
