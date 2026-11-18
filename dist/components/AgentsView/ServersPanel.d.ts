import React from 'react';
import type { AgentServerStats } from '../../types';
import type { AgentServer } from '../../utils/agentSessions';
import { type ServerStatsState } from '../../hooks/useServerStats';
export interface ServerRow {
    server: AgentServer;
    agentId: string;
    agentName: string;
}
interface ServersPanelProps {
    rows: ServerRow[];
    onSelectAgent: (id: string) => void;
    onClose: () => void;
}
/** What a row shows for its load: the values (if any), whether they are stale, and why. */
export declare function serverLoad(state: ServerStatsState, pid?: number): {
    stats?: AgentServerStats;
    stale: boolean;
    note?: string;
};
export declare const ServersPanel: React.FC<ServersPanelProps>;
export {};
