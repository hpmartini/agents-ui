import { type RefObject } from 'react';
/** Where keystrokes currently go: the agent list, an attached terminal, or a modal (palette, dialogs) */
export type FocusZone = 'rail' | 'terminal' | 'palette' | 'other';
type Closest = {
    closest(selector: string): unknown;
} | null | undefined;
/**
 * Without `rail` anything outside a terminal or dialog counts as the rail (document-level keys
 * drive the list). With it, focus on other controls (tabs, toolbar, peek reply) is 'other'.
 */
export declare function zoneOf(el: Closest, rail?: {
    contains(n: unknown): boolean;
} | null): FocusZone;
export type FocusChord = 'toggle' | 'rail' | 'terminal';
/**
 * F6 / Shift+F6 toggles (the standard "next region" key), Ctrl+Alt+Left/Right is the
 * laptop-friendly pair. Esc is not usable: xterm hands it to the agent.
 */
export declare function focusChord(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'metaKey' | 'shiftKey'>): FocusChord | null;
export declare const FOCUS_CHORD_LABEL = "F6";
/**
 * Tracks the focus zone from real DOM focus and provides keyboard switching between
 * the rail and the active terminal pane.
 */
export declare function useAgentFocusZone(enabled: boolean, railRef: RefObject<HTMLElement | null>): {
    zone: FocusZone;
    focusZone: (target: "rail" | "terminal") => void;
};
export {};
