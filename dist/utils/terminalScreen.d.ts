import { Terminal } from '@xterm/xterm';
/**
 * Plays a raw TUI stream (`claude logs`: cursor jumps instead of spaces, partial redraws)
 * through a terminal emulator and returns the final screen as plain text lines.
 */
export declare function renderTerminalScreen(raw: string): Promise<string>;
/** Minimal xterm view `promptSuggestion` reads (the pane's live terminal) */
type ScreenTerminal = Pick<Terminal, 'rows' | 'cols'> & {
    buffer: {
        active: Pick<Terminal['buffer']['active'], 'viewportY' | 'getLine'>;
    };
};
/**
 * Claude Code's prompt suggestion: grey (dim) ghost text in its empty input line `❯ …`, the
 * lowest `❯` row on screen. null when the line holds typed text or nothing. `truncated`: the TUI
 * cut it at the pane's width with `…` (the rest is nowhere on screen, see `promptInput`).
 */
export declare function promptSuggestion(terminal: ScreenTerminal): {
    text: string;
    truncated: boolean;
} | null;
/**
 * The text typed into Claude Code's input, over all rows it wraps to (indented below the `❯`
 * row). null for an empty input or one that shows a suggestion.
 */
export declare function promptInput(terminal: ScreenTerminal): string | null;
export {};
