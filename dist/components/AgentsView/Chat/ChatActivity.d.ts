import React from 'react';
import type { ChatBlock, ChatMessage } from '../../../utils/chatEvents';
interface ChatActivityProps {
    chatId: string;
    messages: ChatMessage[];
    sub: Record<string, ChatBlock[]>;
    busy: boolean;
    /** Ids of background tasks that reported their end (ChatState.endedTasks) */
    endedTasks?: string[];
}
/** Above the input: plan with checkmarks, shells and sub-agents to look into, the running turn */
export declare const ChatActivity: React.FC<ChatActivityProps>;
export {};
