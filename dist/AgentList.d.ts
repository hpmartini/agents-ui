import React from 'react';
import type { Agent } from './transport';
export interface AgentListProps {
    agents: Agent[];
    /** Agents with a pane in some tab */
    openIds: ReadonlySet<string>;
    /** Agent of the active pane */
    activeId: string | null;
    loaded: boolean;
    title: string;
    onOpen: (id: string) => void;
    onStop: (id: string) => void;
    onNew: () => void;
}
/** Agent rows (state, name, activity, folder); Arrow keys move, Enter opens */
export declare const AgentList: React.FC<AgentListProps>;
