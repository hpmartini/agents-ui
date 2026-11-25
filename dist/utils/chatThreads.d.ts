/**
 * Reply quotes and threads of an orchestrator chat. A thread is a slice of the same session: its
 * messages start with the thread's tag (`[Thread: <Project> · <Task>]`), the orchestrator starts
 * its answer with the same tag, and messages of linked workers (`orkumo send`) join it. Anything
 * unclear stays in the main chat; nothing is guessed. Pure: the chat pane routes on every render.
 */
import { type ChatAnswer, type ChatItem } from './chatEvents';
/** Thread as the host stores it (Orkumo: `/api/orchestrator/threads`) */
export interface ChatThread {
    id: string;
    /** Written in front of every message of the thread; fixed when the thread is created */
    tag: string;
    name: {
        project: string;
        task: string;
    };
    /** ms */
    createdAt: number;
    /** ms; answers and worker messages after it count as unread */
    readAt: number;
    /** Workers whose `orkumo send` messages join the thread (task refs, sessions in its repo) */
    agents: string[];
    closed: boolean;
    /** Key of the answer the thread was opened on */
    parentKey?: string | null;
    /** Repo or monorepo subfolder of the bound project */
    repo?: string | null;
    /** From the bound status task (title, note, description, refs); null without binding */
    summary?: string | null;
    /** Bound status task, null for a thread opened on an answer */
    binding?: {
        project: string;
        task: string;
    } | null;
    /** Renamed by the user in the UI: never named automatically again */
    renamed?: boolean;
}
/** The orchestrator's tidy-up layer over the transcript (`orkumo thread move/merge`) */
export interface ChatThreadOverrides {
    /** Entry key (`entryKey`) → thread id, or 'main' */
    entries: Record<string, string>;
    /** Merged source thread id → target thread id; sources are hidden */
    merged: Record<string, string>;
}
/** Routing key of an item: its transcript key without the history page prefixes `h<before>:` */
export declare const entryKey: (item: {
    key: string;
}) => string;
/** Final thread of `id` along the merge chain; an unknown target (or a cycle) keeps `id` */
export declare function threadTarget(id: string, threads: ChatThread[], overrides?: ChatThreadOverrides): string;
/** Threads the panel lists: merged sources are gone */
export declare const visibleThreads: (threads: ChatThread[], overrides?: ChatThreadOverrides) => ChatThread[];
/** Shown name: "Project · Task", Markdown stripped, a doubled part once */
export declare function threadTitle(name: {
    project: string;
    task: string;
}): string;
/** Where a thread starts in the main chat: "N replies in thread …" */
export interface ChatThreadMarker {
    kind: 'thread';
    key: string;
    threadId: string;
    count: number;
}
export declare const threadTag: (name: {
    project: string;
    task: string;
}) => string;
/** Message text without its thread tag line */
export declare function stripTag(text: string, tag: string): string;
export declare const hhmm: (ms: number) => string;
/** First lines of a quoted text, cut with an ellipsis */
export declare function quoteExcerpt(text: string): string;
/** Sent in front of a reply: `Re your reply from 09:32: "…"` (no time when the transcript has none) */
export declare const quoteHeader: (ts: number | undefined, text: string) => string;
/** A sent reply split back into the quote and the user's text; null for a plain prompt */
export declare function parseQuote(text: string): {
    time: string | null;
    quote: string;
    body: string;
} | null;
/** The text an answer shows (its text blocks) */
export declare const answerText: (a: ChatAnswer) => string;
export declare const itemTime: (item: ChatItem) => number | undefined;
/** Thread of one chat item, null when it stays in the main chat */
export declare function threadOf(item: ChatItem, threads: ChatThread[]): string | null;
/**
 * Splits the chat: thread items go to their thread, the main chat keeps the rest plus one marker
 * per thread (after the answer it was opened on, else where its first message was). An answer of
 * tool steps only follows the item before it
 */
export declare function routeThreads(items: ChatItem[], threads: ChatThread[], overrides?: ChatThreadOverrides): {
    main: (ChatItem | ChatThreadMarker)[];
    byThread: Map<string, ChatItem[]>;
};
/** Answers and worker messages of a thread after `readAt`; own prompts never count */
export declare const unreadCount: (items: ChatItem[], readAt: number) => number;
