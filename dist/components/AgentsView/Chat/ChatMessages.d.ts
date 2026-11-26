import React from 'react';
import { type ChatAnswer, type ChatBlock, type ChatItem } from '../../../utils/chatEvents';
/** What Reply puts in the composer: the answer's time and the quoted text */
export interface ChatQuote {
    ts?: number;
    text: string;
}
/** Reply and thread actions of a message list; without a provider answers have no actions */
export interface ChatReplies {
    reply: (quote: ChatQuote) => void;
    openThread?: (answer: ChatAnswer) => void;
}
export declare const ChatRepliesContext: React.Context<ChatReplies | null>;
/** The quote of a sent reply, above its text */
export declare const QuoteBox: React.FC<{
    time: string | null;
    text: string;
}>;
/** Tags of every thread of the chat's session: only those are hidden in message text */
export declare const ChatTagsContext: React.Context<ReadonlySet<string>>;
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
