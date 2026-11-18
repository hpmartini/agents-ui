import React from 'react';
import { type ChatBlock, type ChatItem } from '../../../utils/chatEvents';
/** The chat a message list belongs to: its tool results' images load from there */
export declare const ChatIdContext: React.Context<string | null>;
export declare const AssistantBlock: React.FC<{
    block: ChatBlock;
}>;
export declare const UserMessage: React.FC<{
    text: string;
    queued?: boolean;
}>;
/** 12.3 s · 4 min 12 s · 1 h 5 min */
export declare function formatDuration(ms: number): string;
export declare const ChatItemView: React.FC<{
    item: ChatItem | null;
    showSteps: boolean;
    live?: boolean;
    harness: string;
    model: string | null;
}>;
