import React from 'react';
import type { AgentsTransport } from './transport';
export interface AgentsPanelProps {
    transport: AgentsTransport;
    /** Folder the start dialog proposes */
    defaultCwd: string;
    /** localStorage key of the open tabs and splits; null keeps them in memory only */
    storageKey?: string | null;
    /** List heading */
    title?: string;
    /** Below this own width the panel shows list or panes, not both (it reacts to its container) */
    narrowBelowPx?: number;
    className?: string;
}
/** The whole agents view: list, tabs with split panes of terminals, chat input, start dialog */
export declare const AgentsPanel: React.FC<AgentsPanelProps>;
