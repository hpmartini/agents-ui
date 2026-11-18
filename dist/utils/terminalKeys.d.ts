import type { Terminal } from '@xterm/xterm';
export type TerminalKeyAction = {
    type: 'input';
    data: string;
} | {
    type: 'close-tab';
};
type KeyLike = Pick<KeyboardEvent, 'type' | 'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'>;
/**
 * macOS editing shortcuts xterm.js does not map itself (same bytes as iTerm's
 * "Natural Text Editing"), plus Shift+Enter for Claude Code. null: xterm handles the key.
 */
export declare function terminalKeyAction(e: KeyLike): TerminalKeyAction | null;
/**
 * Install the shortcuts on a terminal. Callbacks are read at key time, so pass
 * functions that resolve the current socket / tab (xterm keeps only one handler).
 */
export declare function attachTerminalKeys(terminal: Terminal, send: (data: string) => void, closeTab: () => void, passThrough?: (e: KeyboardEvent) => boolean): void;
export {};
