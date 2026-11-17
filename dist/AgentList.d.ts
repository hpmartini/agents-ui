import React from 'react';
import type { Agent, TransportError } from './transport';
export interface AgentListProps {
    agents: Agent[];
    /** Agents with a pane in some tab */
    openIds: ReadonlySet<string>;
    /** Agent of the active pane */
    activeId: string | null;
    loaded: boolean;
    /** The list failed to load (subscribe's onError); cleared by the next list */
    error?: TransportError | null;
    onRetry?: () => void;
    title: string;
    onOpen: (id: string) => void;
    onStop: (id: string) => void;
    /** Hides the stop button where it returns false (protected sessions) */
    canStop?: (agent: Agent) => boolean;
    onNew: () => void;
}
/** Agent rows (state, name, activity, folder); Arrow keys move, Enter opens */
export declare const AgentList: React.FC<AgentListProps>;
