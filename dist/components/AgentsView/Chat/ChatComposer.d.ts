import React from 'react';
import { type ChatCommand, type ChatSubmitKey } from '../../../utils/chatEvents';
export declare const CHAT_COMPOSER_HEIGHT_KEY = "devOrbitChatComposerHeight";
interface ChatComposerProps {
    /** Transcript view id for `@` file completion; null until the view is open */
    chatId: string | null;
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onStop: () => void;
    busy: boolean;
    disabled: boolean;
    submitKey: ChatSubmitKey;
    /** Sent user messages, oldest first (Arrow up walks them from the newest) */
    history: string[];
    commands: ChatCommand[];
    agents: {
        name: string;
        description: string;
    }[];
    /** The agent's prompt suggestion: shown in the empty input, Tab or → takes it, typing drops it */
    suggestion?: string | null;
    /** The TUI cut the suggestion at the pane's width */
    suggestionCut?: boolean;
    /** Fetches a cut suggestion's full text once it is taken */
    takeSuggestion?: () => Promise<string | null>;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    /** Accessible name; default "Message" */
    label?: string;
    /** Placeholders per submit key; default the main input's */
    placeholders?: {
        enter: string;
        modEnter: string;
    };
    /** Where the dragged height is remembered; default the main input's key */
    heightKey?: string;
    /** Tallest dragged height, read at use (keep the function stable); default 70 % of the window */
    pinMax?: (el: HTMLTextAreaElement) => number;
}
/** Chat input: grows with its content, TUI-like keys, `/` and `@` picker with details */
export declare const ChatComposer: React.FC<ChatComposerProps>;
export {};
