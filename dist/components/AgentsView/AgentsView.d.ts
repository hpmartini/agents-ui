import React from 'react';
import type { AgentConfigLike } from './types';
import type { AgentSession, AgentHarness } from '../../types';
import { RailNavProps } from './ProjectsRail';
/** Composer prefill (Orkumo: router state of the board's "Agent starten", chat history's "Continue") */
export interface AgentsPrefill {
    /** Text of the task */
    dispatch?: string;
    cwd?: string;
    mode?: 'task' | 'chat';
    harness?: AgentHarness;
    /** 'chats': no project, the chats folder */
    place?: 'chats';
    /** A chat to open again: its rail row, else it resumes in the chats folder */
    openChat?: {
        harness: AgentHarness;
        sessionId: string;
        cwd: string;
        title?: string;
    };
}
/**
 * Shell-only props (Orkumo's app shell) are optional: without them the view is the bare agents
 * view (always active, no navigation, no other routes). Render it inside `AgentsProvider`.
 */
export interface AgentsViewProps {
    /**
     * Whether the agents route is shown (keyboard handling, workspace); the rail itself is always
     * live. Default true
     */
    active?: boolean;
    /** Discovered apps - offered as dispatch directories */
    apps?: AgentConfigLike[];
    /** Leave the agents view (Ctrl+C twice); without it those keys do nothing */
    onExit?: () => void;
    /** App navigation for the merged left rail (replaces the separate app sidebar) */
    nav?: RailNavProps;
    /** Make this view the visible route (palette command "New task" from another page) */
    onOpenView?: () => void;
    /** Active project context (#97): its stored workspace and rail prefs are reloaded on change */
    contextId?: string;
    /** Member apps of the active context; null shows every session (#133) */
    contextAppIds?: string[] | null;
    /** Main area of the other routes (dashboard, board, code, ...): replaces the workspace while not active */
    children?: React.ReactNode;
    /** The route below lists its own items in the rail column (Chats mode): agents hidden meanwhile */
    railOutlet?: boolean;
    /**
     * Opens this agent (in its tab, or a new one) whenever the value changes and the agent is
     * listed (Orkumo: `?attach=`); pass it once or keep it in sync with onSelectedIdChange
     */
    selectedId?: string | null;
    /** The agent of the active pane changed (null: nothing open) */
    onSelectedIdChange?: (id: string | null) => void;
    /** Opens the composer (or a chat) with this; read while `active` */
    prefill?: AgentsPrefill | null;
    /** The view took `prefill` over: clear it, or it is taken again */
    onPrefillConsumed?: () => void;
    /** false protects an agent: no Stop action (default: all stoppable) */
    canStop?: (session: AgentSession) => boolean;
    /** Ask in a small dialog before stopping (default false) */
    confirmStop?: boolean;
    /** On the root element, next to `agents-ui` */
    className?: string;
}
/** New task: Cmd+N on macOS (also in a terminal), Ctrl+N elsewhere outside a terminal (the shell's there) */
export declare function isNewTaskKey(e: KeyboardEvent): boolean;
/**
 * Browser counterpart of `claude agents`: session list, dispatch input, peek panel
 * and attached sessions in tabs / tiles.
 */
export declare const AgentsView: React.FC<AgentsViewProps>;
