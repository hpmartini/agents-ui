export declare const RECENCY: readonly ["Today", "Yesterday", "This week", "Older"];
export type Recency = (typeof RECENCY)[number];
/** Rail section of a last activity, in local days; "This week" = the 7 days before yesterday */
export declare function recencyOf(time: number | null, now?: number): Recency;
/** Short age for a rail row: "now", "5m", "3h", a weekday this week, else the date */
export declare function relativeTime(time: number | null, now?: number): string;
