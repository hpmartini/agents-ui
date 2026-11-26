import React from 'react';
import { type AgentSession } from '../../../types';
import { type ChatSubmitKey } from '../../../utils/chatEvents';
import { type StatusTask } from './ChatThreads';
/** Main chat beside the panel: answer footers, model chip and the host's usage bars fit uncut */
export declare const CHAT_MAIN_MIN = 460;
/**
 * Threads panel beside the main chat, which keeps CHAT_MAIN_MIN; a pane too narrow for both
 * (splits) gets the panel as a drawer over the chat, up to the pane's width. 0: not measured yet.
 */
export declare function threadsLayout(row: number): {
    overlay: boolean;
    min: number;
    max: number;
};
interface ChatPaneProps {
    /** Terminal pane whose agent this view shows; input is typed into its PTY */
    pane: AgentSession;
    /** Listed session behind the pane (state, prompts); the pane itself for a background job */
    agent?: AgentSession;
    /** Transcript the view reads; null until the server lists the pane's session */
    sessionId: string | null;
    active: boolean;
    /** The pane's tab is on screen; a hidden UI view fetches nothing */
    visible?: boolean;
    focused: boolean;
    submitKey: ChatSubmitKey;
    /** Thinking and tool calls inline in the transcript (else only in the work panel) */
    showSteps: boolean;
    onToggleSteps: () => void;
    onFocus: () => void;
    /** Closes the pane, exactly like closing its terminal */
    onClose: () => void;
    onMaximize?: () => void;
    /** Back to the terminal view of the same process */
    onShowTerminal: () => void;
    headerProps?: React.HTMLAttributes<HTMLDivElement>;
    /** Host buttons before the pane's own actions (`host.renderPaneActions`) */
    hostActions?: React.ReactNode;
    /** Tokens in the agent's context (`AgentContext.contextTokens`); Handoff + Reset shows above the threshold */
    contextTokens?: number | null;
    /** Context size above which the header offers Handoff + Reset */
    handoffResetTokens?: number;
    /** Host view over the chat body (`host.renderPaneView`) */
    paneView?: React.ReactNode;
    /**
     * Details of one report task from the host (`host.renderPaneView` with `statusTask`), shown in
     * the maximised threads panel; null when the host has no Status view
     */
    renderStatus?: (task: StatusTask, onClose: () => void) => React.ReactNode;
    /** Linked PRs, issues and running servers (same items as a terminal pane's header) */
    meta?: React.ReactNode;
}
/**
 * UI view of an agent pane (#189): renders the agent's transcript and types into the pane's
 * terminal. The terminal process is the agent; this view never starts or stops a process.
 */
export declare const ChatPane: React.FC<ChatPaneProps>;
export {};
