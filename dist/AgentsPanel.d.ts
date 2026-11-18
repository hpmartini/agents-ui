import React from 'react';
import type { Agent, AgentsTransport } from './transport';
import { type Labels, type Locale } from './labels';
export interface AgentsPanelProps {
    transport: AgentsTransport;
    /** Folder the start dialog proposes */
    defaultCwd: string;
    /** localStorage key of the open tabs and splits (the list width goes under `<key>:list`); null keeps them in memory only */
    storageKey?: string | null;
    /** List heading (default: the locale's "Agents") */
    title?: string;
    /** Below this own width the panel shows list or panes, not both (it reacts to its container) */
    narrowBelowPx?: number;
    className?: string;
    /** Built-in texts: 'en' (default) or 'de' */
    locale?: Locale;
    /** Overrides single texts of the locale */
    labels?: Partial<Labels>;
    /**
     * Opens this agent (in its tab, or a new one) whenever the value changes and the agent is
     * listed; pass it once as an initial selection or keep it in sync with onSelectedIdChange.
     */
    selectedId?: string | null;
    /** The agent of the active pane changed (null: nothing open) */
    onSelectedIdChange?: (id: string | null) => void;
    /** false protects an agent: no stop button, and stop requests are ignored (default: all stoppable) */
    canStop?: (agent: Agent) => boolean;
    /** Ask before stopping (default true) */
    confirmStop?: boolean;
    /** Terminal font-family chain; default a Nerd Font chain with plain monospace fallbacks */
    terminalFont?: string;
}
/** The whole agents view: list, tabs with split panes of terminals, chat input, start dialog */
export declare const AgentsPanel: React.FC<AgentsPanelProps>;
