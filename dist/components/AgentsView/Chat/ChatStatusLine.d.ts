import React from 'react';
/**
 * Columns of the status line by its width (0: not measured yet). Below 640 px the empty cells
 * that align the wide grid go: branch/model and the usage then share one row, so the footer
 * (pane-wide, under the threads panel too) leaves a short split pane room for the composers
 */
export declare function statusLayout(width: number): {
    cols: string;
    placeholders: boolean;
};
/**
 * TUI-like status line: branch with untracked (?) / changed (±) counts, prompt cache and
 * context, 5h / 7d plan limits. Refreshes while visible and after each finished turn.
 */
export declare const ChatStatusLine: React.FC<{
    chatId: string;
    turns: number;
    visible: boolean;
    /** Model × effort picker of the session, shown under the branch */
    picker?: React.ReactNode;
}>;
