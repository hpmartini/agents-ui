import React from 'react';
interface ModelEffortPickerProps {
    harness: 'claude' | 'omp';
    /** '' = the CLI's (or the dispatch's) default */
    model: string;
    effort: string;
    onPick: (model: string, effort: string) => void;
    defaultModel?: string | null;
    disabled?: boolean;
    /** Where the matrix opens: below the button (dialog) or above it (status line) */
    placement?: 'down' | 'up';
    title?: string;
    /** Name of the '' row and column: "default" at a start, "current" in a running session */
    keepLabel?: string;
    /** What the running session uses now: its cell is marked and the button names it */
    currentModel?: string | null;
    currentEffort?: string | null;
}
/**
 * Model × effort matrix (rows: models, columns: effort levels the CLI names). A cell picks
 * both; "default" keeps what the CLI picks itself. The filter also takes any model name: Enter
 * uses it as typed.
 */
export declare const ModelEffortPicker: React.FC<ModelEffortPickerProps>;
export {};
