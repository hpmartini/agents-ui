import React from 'react';
import type { AgentCacheInfo } from '../../types';
/** Prompt-cache countdown, context fill and hits of one session; ticks every second while warm, hidden once expired */
export declare const CacheBadge: React.FC<{
    cache: AgentCacheInfo;
    /** false: countdown and hits only, the caller shows the context fill itself */
    context?: boolean;
}>;
