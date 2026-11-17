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
/** Nerd Font first (prompt and TUI glyphs), plain monospace when none is installed */
export declare const DEFAULT_TERMINAL_FONT = "\"JetBrainsMono Nerd Font\", \"JetBrainsMono NF\", \"MesloLGS NF\", \"Hack Nerd Font\", \"FiraCode Nerd Font\", \"Symbols Nerd Font Mono\", \"JetBrains Mono\", Menlo, Monaco, Consolas, monospace";
/**
 * Re-reads colours and font of every open terminal from the --agents-* variables. Runs by itself
 * when <html>/<body> change class, style or data-theme, or the OS colour scheme flips; a host that
 * switches its theme elsewhere (a wrapper element) calls it after the switch.
 */
export declare function refreshTerminalTheme(): void;
/**
 * A terminal pane attached to one agent. The xterm instance lives for the whole lifetime of the
 * pane; the PTY channel can be re-established with "Reattach" after the process detached.
 */
export declare const AgentTerminal: React.FC<AgentTerminalProps>;
export {};
