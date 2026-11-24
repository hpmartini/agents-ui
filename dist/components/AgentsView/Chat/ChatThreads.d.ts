import React from 'react';
import type { ChatThreadList, ChatThreadTask } from '../../../transport';
import { type ChatItem, type ChatSubmitKey } from '../../../utils/chatEvents';
import { type ChatThread } from '../../../utils/chatThreads';
import type { ChatQuote } from './ChatMessages';
export type ThreadsStatus = 'loading' | 'ready' | 'error';
/** Threads of the pane's session from the host; `orchestrator` null: no threads for it */
export declare function useChatThreads(session: string | null | undefined): {
    enabled: boolean;
    status: ThreadsStatus;
    threads: ChatThread[];
    tasks: ChatThreadTask[];
    reload: (quiet?: boolean) => void;
    create: (body: Parameters<NonNullable<{
        fetchThreads: (session: string) => Promise<ChatThreadList>;
        createThread: (session: string, body: {
            task: {
                project: string;
                task: string;
            };
        } | {
            name: {
                project: string;
                task: string;
            };
            parentKey?: string;
        }) => Promise<ChatThread>;
        updateThread: (session: string, id: string, patch: {
            closed?: boolean;
            readAt?: number;
        }) => Promise<ChatThread>;
    } | undefined>["createThread"]>[1]) => Promise<ChatThread>;
    update: (id: string, patch: {
        closed?: boolean;
        readAt?: number;
    }) => Promise<void>;
};
/** First words of a text, for a thread named after an answer or its first message */
export declare function firstWords(text: string, words?: number): string;
/** The quote a reply will carry, above a composer */
export declare const QuoteChip: React.FC<{
    quote: ChatQuote;
    onRemove: () => void;
}>;
/** In the main chat where a thread starts: "3 replies in thread Shop · Checkout" */
export declare const ThreadMarkerRow: React.FC<{
    thread: ChatThread;
    items: ChatItem[];
    onOpen: () => void;
}>;
export declare const THREAD_COMPOSER_HEIGHT_KEY = "devOrbitChatThreadComposerHeight";
/**
 * Composer of the open thread: the main chat's composer (send key from the settings, height grip,
 * `@` files) plus quote, images and files. `/` commands are left out: the tag line in front
 * would turn them into plain text.
 */
export declare const ThreadComposer: React.FC<{
    chatId: string | null;
    submitKey: ChatSubmitKey;
    /** The thread's sent messages, oldest first (Arrow up walks them) */
    history: string[];
    agents: {
        name: string;
        description: string;
    }[];
    quote: ChatQuote | null;
    onClearQuote: () => void;
    onSend: (text: string, files: File[]) => Promise<boolean>;
    disabled?: boolean;
    /** Focus the input when this changes (thread opened, quote added, panel maximised) */
    focusKey?: unknown;
}>;
export interface ThreadsPanelProps {
    status: ThreadsStatus;
    threads: ChatThread[];
    tasks: ChatThreadTask[];
    byThread: Map<string, ChatItem[]>;
    /** Open thread id; `DRAFT_THREAD` for a thread without task before its first message */
    openId: string | null;
    onOpen: (id: string | null) => void;
    onRetry: () => void;
    onNewTask: (task: {
        project: string;
        task: string;
    }) => void;
    onNewFree: () => void;
    onClose: (id: string, closed: boolean) => void;
    /** Messages and composer of the open thread (null: the draft) */
    renderThread: (thread: ChatThread | null) => React.ReactNode;
    /** Over the whole pane, the main chat hidden */
    maximized: boolean;
    onMaximize: (maximized: boolean) => void;
}
export declare const THREADS_SIDEBAR_KEY = "agents-ui:threads-sidebar";
/** Mod+Shift+M: maximise or restore the threads panel of the active pane */
export declare const isThreadsMaxKey: (e: {
    code: string;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    ctrlKey: boolean;
}) => boolean;
export declare const THREADS_MAX_SHORTCUT: string;
export declare const DRAFT_THREAD = "draft";
/** Right panel of an orchestrator chat: its threads, below them the open one */
export declare const ThreadsPanel: React.FC<ThreadsPanelProps>;
