import React from 'react';
import type { AgentSession } from '../../types';
import type { PaneView } from '../../hooks/useAgentWorkspace';
import { type DropZone, type InsertPosition, type PaneLayout, type Workspace } from '../../utils/agentWorkspace';
import type { ChatSubmitKey } from '../../utils/chatEvents';
import type { FocusZone } from '../../hooks/useAgentFocusZone';
interface AgentWorkspaceProps {
    sessions: AgentSession[];
    workspace: Workspace;
    onActivateTab: (tabId: string) => void;
    onFocusPane: (sessionId: string) => void;
    onClosePane: (sessionId: string) => void;
    onCloseTab: (tabId: string) => void;
    onMoveTab: (tabId: string, targetId: string, position: InsertPosition) => void;
    onSplit: (sessionId: string, targetId: string, zone: DropZone) => void;
    onDetach: (sessionId: string) => void;
    onSetLayout: (tabId: string, layout: PaneLayout) => void;
    /** Absent: panes offer no peek */
    onPeek?: (sessionId: string) => void;
    /** Cmd/Ctrl-click on a terminal link: show it in a browser pane next to `fromId` */
    onOpenLink?: (fromId: string, url: string) => void;
    /** Where keyboard focus is; only the active pane of the visible tab can show as focused */
    focusZone: FocusZone;
    /** Extra header content per pane (linked PRs, issues, processes) */
    renderPaneMeta?: (session: AgentSession) => React.ReactNode;
    /** Host buttons in a pane's header (`host.renderPaneActions`) */
    renderPaneActions?: (session: AgentSession) => React.ReactNode;
    /** Host view in place of a pane's body (`host.renderPaneView`); null: the pane as usual */
    renderPaneView?: (session: AgentSession) => React.ReactNode;
    /** Parked workspace of another context: terminals stay connected but never count as visible */
    hidden?: boolean;
    /** UI views (#189): key that sends a message */
    chatSubmitKey?: ChatSubmitKey;
    chatShowSteps?: boolean;
    onToggleChatSteps?: () => void;
    /** Panes shown in the UI view; the rest show their terminal */
    views?: Record<string, PaneView>;
    /** Switches a pane between terminal and UI view; its process is untouched */
    onSetView?: (sessionId: string, view: PaneView) => void;
    /**
     * Own content for a pane (Chats mode: a conversation reader); null keeps the default. Such a
     * pane never gets a terminal, so no process starts for it.
     */
    renderCustomPane?: (session: AgentSession, pane: CustomPaneProps) => React.ReactNode | null;
    /** Shown while no tab is open */
    emptyState?: React.ReactNode;
    /** What a tab of three or more panes counts ("3 chats"); agents by default */
    paneNoun?: string;
}
export interface CustomPaneProps {
    active: boolean;
    visible: boolean;
    onFocus: () => void;
    onClose: () => void;
    /** Own tab; only while the tab holds several panes */
    onMaximize?: () => void;
    /** Drag handle for rearranging; only while the tab holds several panes */
    headerProps?: React.HTMLAttributes<HTMLDivElement>;
}
/** Built-in browser next to the agent terminals: the host's (`renderBrowser`; Orkumo: the Coding view's preview) */
export declare const BrowserPane: React.FC<{
    url: string;
    active: boolean;
    onFocus: () => void;
    onClose: () => void;
    onMaximize?: () => void;
    headerProps?: React.HTMLAttributes<HTMLDivElement>;
}>;
/**
 * Attached agent sessions. Tabs and panes are decoupled: a tab holds one or more
 * panes (a split), and splitting moves a session into another tab instead of
 * creating a tab. Drag a tab or pane header onto a pane edge to split; drag a pane
 * header onto the empty tab strip to give it its own tab again.
 */
export declare const AgentWorkspace: React.FC<AgentWorkspaceProps>;
export {};
