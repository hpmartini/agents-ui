/**
 * File paths in terminal output as Cmd/Ctrl-clickable links (#188): VS Code, with Shift the default app.
 * Detection is pure; the xterm link provider maps matches back to buffer cells (wide chars, soft wraps).
 */
import type { ILinkProvider, Terminal } from '@xterm/xterm';
export interface FilePathMatch {
    /** String offsets in the scanned text, end exclusive, `:line:col` included */
    start: number;
    end: number;
    path: string;
    line?: number;
    col?: number;
}
export declare function findFilePaths(text: string): FilePathMatch[];
/**
 * Wrapped rows around `y` (0-based) joined into one string, with each char's cell position.
 * Clipped to rows [from, to): reading a scrollback-long wrapped line per row ran the renderer out of heap.
 */
export declare function logicalLine(terminal: Terminal, y: number, from?: number, to?: number): {
    text: string;
    cells: [number, number][];
    start: number;
};
/** Link provider for file paths; `activate` gets the click and the match */
export declare function createFileLinkProvider(terminal: Terminal, activate: (event: MouseEvent, match: FilePathMatch) => void): ILinkProvider;
