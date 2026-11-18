import type { AgentCacheInfo } from '../types';
/** Remaining cache time at or below which an agent and its project are highlighted */
export declare const CACHE_WARN_MS: number;
export interface CacheCountdown {
    remainingMs: number;
    expired: boolean;
    warning: boolean;
}
export declare function cacheCountdown(cache: AgentCacheInfo, now: number): CacheCountdown;
export declare function isCacheWarning(cache: AgentCacheInfo | null | undefined, now: number): boolean;
/** mm:ss, rounded up so "0:00" only shows once the cache is gone */
export declare function formatCountdown(ms: number): string;
/** 142000 -> "142k", 1000000 -> "1M" */
export declare function formatTokens(n: number): string;
