import React from 'react';
import type { ChatThreadList, ChatThreadTask } from '../../../transport';
import { type ChatCommand, type ChatItem, type ChatSubmitKey } from '../../../utils/chatEvents';
import { type ChatThread } from '../../../utils/chatThreads';
import type { ChatQuote } from './ChatMessages';
export type ThreadsStatus = 'loading' | 'ready' | 'error';
/** Threads of the pane's session from the host; `orchestrator` null: no threads for it */
export declare function useChatThreads(session: string | null | undefined, active?: boolean): {
    enabled: boolean;
    status: ThreadsStatus;
    threads: ChatThread[];
    tasks: ChatThreadTask[];
    overrides: import("../../../utils/chatThreads").ChatThreadOverrides | undefined;
    canUndo: boolean;
    /** undefined: the host cannot undo a tidy-up */
    undoTidy: (() => Promise<void>) | undefined;
    reload: (quiet?: boolean) => void;
    create: (body: Parameters<NonNullable<{
        fetchThreads: (session: string) => Promise<ChatThreadList>;
        createThread: (session: string, body: {
            task: {
                project: string;
                task: string;
            };
        } | {
            parentKey: string;
            answerText: string;
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
            command?: string;
            cancelCommand?: boolean;
            name?: {
                project: string;
                task: string;
            };
        }) => Promise<ChatThread>;
        undoTidy?: (session: string) => Promise<ChatThreadList>;
    } | undefined>["createThread"]>[1]) => Promise<ChatThread>;
    update: (id: string, patch: Parameters<NonNullable<{
        fetchThreads: (session: string) => Promise<ChatThreadList>;
        createThread: (session: string, body: {
            task: {
                project: string;
                task: string;
            };
        } | {
            parentKey: string;
            answerText: string;
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
            command?: string;
            cancelCommand?: boolean;
            name?: {
                project: string;
                task: string;
            };
        }) => Promise<ChatThread>;
        undoTidy?: (session: string) => Promise<ChatThreadList>;
    } | undefined>["updateThread"]>[2]) => Promise<void>;
};
type ThreadNameParts = ChatThread['name'];
/**
 * A typed thread name: "Project · Task" sets both parts, a name without " · " is the task and
 * keeps the project. null for an empty name (cancel)
 */
export declare function parseThreadName(text: string, was: ThreadNameParts): ThreadNameParts | null;
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
 * `/` commands and skills, `@` files) plus quote, images and files. A command goes out without
 * the tag line (ChatPane `sendInThread`).
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
    /** The chat's commands and skills, as the main composer lists them */
    commands: ChatCommand[];
    quote: ChatQuote | null;
    onClearQuote: () => void;
    onSend: (text: string, files: File[]) => Promise<boolean>;
    disabled?: boolean;
    /** Focus the input when this changes (thread opened, quote added, panel maximised) */
    focusKey?: unknown;
    /** The open thread (its unsent text survives hiding the panel) */
    draftKey?: string | null;
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
    /** New display name of a thread (its tag, and so its routing, stays) */
    onRename: (id: string, name: ThreadNameParts) => void;
    /** Messages and composer of the open thread (null: the draft) */
    renderThread: (thread: ChatThread | null) => React.ReactNode;
    /** Over the whole pane, the main chat hidden */
    maximized: boolean;
    onMaximize: (maximized: boolean) => void;
    /** Hide the whole panel (the pane header's threads button shows it again) */
    onHide: () => void;
    /** A tidy-up of the orchestrator can be undone */
    canUndo?: boolean;
    /** Undo the last tidy-up; absent when the host cannot */
    onUndo?: () => void;
    /**
     * Details of a report task from the host (its Status view); without it no Status list and no
     * "Show in Status" in a bound thread
     */
    onShowStatus?: (task: StatusTask) => void;
    /** The task whose details `statusView` shows (null: the host's whole status) */
    statusTask?: StatusTask | null;
    /** Host view in the main area in place of the open thread (maximised panel) */
    statusView?: React.ReactNode;
    /** Back from `statusView` to the thread (Esc, Back) */
    onCloseStatus?: () => void;
}
export type StatusTask = {
    project: string;
    task: string;
};
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
export {};
