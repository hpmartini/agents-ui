import React from 'react';
import type { Agent } from './transport';
import { type DropZone, type InsertPosition, type PaneLayout, type Workspace } from './workspace';
export interface AgentWorkspaceProps {
    agents: Agent[];
    workspace: Workspace;
    onActivateTab: (tabId: string) => void;
    onFocusPane: (agentId: string) => void;
    onClosePane: (agentId: string) => void;
    onCloseTab: (tabId: string) => void;
    onMoveTab: (tabId: string, targetId: string, position: InsertPosition) => void;
    onSplit: (agentId: string, targetId: string, zone: DropZone) => void;
    onDetach: (agentId: string) => void;
    onSetLayout: (tabId: string, layout: PaneLayout) => void;
    /** Shown while no tab is open */
    emptyState?: React.ReactNode;
}
/**
 * Attached agents (from Orkumo). Tabs and panes are decoupled: a tab holds one or more panes (a
 * split), and splitting moves an agent into another tab instead of creating a tab. Drag a tab or
 * pane header onto a pane edge to split; drag a pane header onto the empty tab strip to give it
 * its own tab again.
 */
export declare const AgentWorkspace: React.FC<AgentWorkspaceProps>;
