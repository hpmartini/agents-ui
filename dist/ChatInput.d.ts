import React from 'react';
import type { Agent } from './transport';
/**
 * Message box under the panes: typed into the active pane's terminal like a paste plus Enter (as
 * Orkumo's UI view does), so it needs no transport call of its own. Enter sends, Shift+Enter breaks.
 */
export declare const ChatInput: React.FC<{
    target: Agent | null;
}>;
