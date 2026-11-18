import React from 'react';
import { promptSuggestion } from '../../utils/terminalScreen';
import '@xterm/xterm/css/xterm.css';
import type { AgentSession } from '../../types';
interface AgentTerminalProps {
    session: AgentSession;
    /** Whether the pane is currently visible (tabs layout hides inactive panes) */
    visible: boolean;
    /** Highlight as the active pane in tiled layouts */
    active: boolean;
    /** Keyboard focus is inside this pane's terminal (true for at most one pane) */
    focused: boolean;
    onFocus: () => void;
    onClose: () => void;
    /** Absent: no Peek action (the transport cannot read logs) */
    onPeek?: () => void;
    /** Present in multi-pane tabs: pulls this pane out into its own tab */
    onMaximize?: () => void;
    /** Spread on the header, which doubles as the pane's drag handle */
    headerProps?: React.HTMLAttributes<HTMLDivElement>;
    /** Only pane of its tab: the tab already shows name and state, so the header is actions only */
    solo?: boolean;
    /** Linked PRs, issues and running processes, shown after the connection dot */
    meta?: React.ReactNode;
    /** Cmd/Ctrl-click on a link: open it in the built-in browser instead of externally */
    onOpenLink?: (url: string) => void;
    /** Present when the agent has a UI view: switches the pane to it, the process keeps running */
    onShowChat?: () => void;
}
/** Whether pane `id`'s PTY is connected, so its UI view can type into it */
export declare function usePaneConnected(id: string): boolean;
/**
 * Types a message into pane `id`'s agent like a paste followed by Enter (the UI view's input).
 * xterm's paste wraps it in bracketed-paste markers when the TUI asked for them, so a multi-line
 * message stays one message. false when the PTY is not connected.
 */
export declare function typeIntoPane(id: string, text: string): boolean;
/** Reattaches pane `id` (UI view's button); false when no mounted pane can */
export declare function reattachPane(id: string): boolean;
/** Sends raw keys to pane `id`'s PTY (Esc, a choice number); false when not connected */
export declare function pressKeys(id: string, keys: string): boolean;
/** Last `maxLines` non-empty lines of pane `id`'s visible screen ('' without a terminal) */
export declare function paneScreen(id: string, maxLines?: number): string;
/**
 * The full text of the suggestion in pane `id`, which the TUI cuts at the pane's width: Tab takes
 * it into the TUI's input, where it wraps over as many rows as it needs; read there, the input is
 * emptied again and the TUI shows the suggestion once more. null when the TUI took nothing.
 */
export declare function takePaneSuggestion(id: string): Promise<string | null>;
/** Claude Code's prompt suggestion (ghost text) in pane `id`'s input line, see `promptSuggestion` */
export declare function paneSuggestion(id: string): ReturnType<typeof promptSuggestion>;
/** Nerd Font first (prompt and TUI glyphs), plain monospace when none is installed */
export declare const DEFAULT_TERMINAL_FONT = "\"JetBrainsMono Nerd Font\", \"JetBrainsMono NF\", \"MesloLGS NF\", \"Hack Nerd Font\", \"FiraCode Nerd Font\", \"Symbols Nerd Font Mono\", \"JetBrains Mono\", Menlo, Monaco, Consolas, monospace";
/**
 * Re-reads colours and font of every open terminal from the --agents-* variables (terminals of a
 * host without `terminalOptions`). Runs by itself when <html>/<body> change class, style or
 * data-theme, or the OS colour scheme flips; a host that switches its theme elsewhere (a wrapper
 * element) calls it after the switch.
 */
export declare function refreshTerminalTheme(): void;
/**
 * A terminal pane attached to a background Claude Code session (`claude attach <id>`).
 * The xterm instance lives for the whole lifetime of the pane; the WebSocket/PTY can be
 * re-established with "Reattach" after the CLI detached (Ctrl+Z / ← / session end).
 */
export declare const AgentTerminal: React.FC<AgentTerminalProps>;
export {};
