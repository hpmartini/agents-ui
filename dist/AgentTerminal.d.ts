import React from 'react';
import '@xterm/xterm/css/xterm.css';
import type { Agent } from './transport';
interface AgentTerminalProps {
    agent: Agent;
    /** Whether the pane is currently visible (inactive tabs stay mounted but hidden) */
    visible: boolean;
    /** Active pane of its tab */
    active: boolean;
    onFocus: () => void;
    onClose: () => void;
    /** Present in multi-pane tabs: pulls this pane out into its own tab */
    onMaximize?: () => void;
    /** Spread on the header, which doubles as the pane's drag handle */
    headerProps?: React.HTMLAttributes<HTMLDivElement>;
    /** Only pane of its tab: the tab already shows name and state */
    solo?: boolean;
}
/** Whether pane `id`'s terminal is connected, so the chat input can type into it */
export declare function usePaneConnected(id: string | null): boolean;
/**
 * Types a message into pane `id`'s agent like a paste followed by Enter (the chat input).
 * xterm's paste wraps it in bracketed-paste markers when the TUI asked for them, so a multi-line
 * message stays one message. false when the terminal is not connected.
 */
export declare function typeIntoPane(id: string, text: string): boolean;
/**
 * A terminal pane attached to one agent. The xterm instance lives for the whole lifetime of the
 * pane; the PTY channel can be re-established with "Reattach" after the process detached.
 */
export declare const AgentTerminal: React.FC<AgentTerminalProps>;
export {};
