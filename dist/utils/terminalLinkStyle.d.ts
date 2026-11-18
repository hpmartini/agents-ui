/**
 * URLs and file paths in a terminal stay visibly links: colored and underlined, not only on hover.
 * xterm has no per-range text style, so each visible link gets a decoration (foreground color plus
 * an underline drawn by its element). Only the viewport is scanned, again whenever its text changes.
 */
import type { IDisposable, Terminal } from '@xterm/xterm';
export declare const LINK_COLOR = "#60a5fa";
/** Link ranges in one logical line, string offsets, end exclusive, sorted */
export declare function findLinkRanges(text: string): Array<[number, number]>;
export declare function styleTerminalLinks(terminal: Terminal): IDisposable;
