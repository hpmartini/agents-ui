import React from 'react';
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
