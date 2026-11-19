import React from 'react';
import type { AgentSession } from '../../../types';
import { type ChatSubmitKey } from '../../../utils/chatEvents';
interface ChatPaneProps {
    /** Terminal pane whose agent this view shows; input is typed into its PTY */
    pane: AgentSession;
    /** Listed session behind the pane (state, prompts); the pane itself for a background job */
    agent?: AgentSession;
    /** Transcript the view reads; null until the server lists the pane's session */
    sessionId: string | null;
    active: boolean;
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
    /** Linked PRs, issues and running servers (same items as a terminal pane's header) */
    meta?: React.ReactNode;
}
/**
 * UI view of an agent pane (#189): renders the agent's transcript and types into the pane's
 * terminal. The terminal process is the agent; this view never starts or stops a process.
 */
export declare const ChatPane: React.FC<ChatPaneProps>;
export {};
