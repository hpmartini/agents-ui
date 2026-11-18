import React from 'react';
import type { ChatArtifacts } from '../../../transport';
import type { ChatMessage } from '../../../utils/chatEvents';
/** Changes when a file tool call finishes or a turn ends: then the list is fetched again */
export declare function artifactRefreshKey(messages: ChatMessage[], turns: number): string;
export declare function useChatArtifacts(chatId: string | null, refreshKey: string): ChatArtifacts;
/** Footer button with both counts ("2 artifacts · 12 files"); hidden while there is neither */
export declare const ChatArtifactsButton: React.FC<{
    artifacts: ChatArtifacts;
    onOpen: () => void;
}>;
/**
 * Everything the session produced, in two sections: Claude artifacts (pages hosted on
 * claude.ai) and Files (grouped Documents / Created / Edited); the selected one on the right.
 * Arrow keys move through the list, Esc closes.
 */
export declare const ChatArtifactsModal: React.FC<{
    chatId: string;
    cwd: string;
    title: string;
    artifacts: ChatArtifacts;
    onClose: () => void;
}>;
