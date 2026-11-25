/**
 * Claude Code stream-json events → chat message model (#189).
 * Pure: the Chat pane folds every server event through `reduceChat`. A second harness
 * (Pi, OMP) would get its own reducer producing the same `ChatState`.
 */
import type { ChatHistoryPage } from '../transport';
export type ChatBlock = {
    type: 'text';
    text: string;
} | {
    type: 'thinking';
    text: string;
} | {
    type: 'tool';
    id: string;
    name: string;
    input: Record<string, unknown>;
    result?: string;
    isError?: boolean;
    /** Refs of the result's images; the server serves their bytes (`chatImageUrl`) */
    images?: string[];
};
export type ChatMessage = 
/**
 * `ts`: when the prompt was sent (ms), if the transcript says. `initial`: first prompt of the
 * session or after a compaction / `/clear`
 */
{
    kind: 'user';
    key: string;
    text: string;
    ts?: number;
    initial?: boolean;
    queued?: boolean;
} | {
    kind: 'assistant';
    key: string;
    blocks: ChatBlock[];
    streaming: boolean;
    /** Model that wrote this message, if the transcript names it */
    model?: string;
    /** When it was written (ms), if the transcript says */
    ts?: number;
} | {
    kind: 'result';
    key: string;
    ok: boolean;
    subtype: string;
    durationMs: number | null;
} | {
    kind: 'notice';
    key: string;
    text: string;
    tone: 'info' | 'error';
}
/** The CLI's "※ recap" summary (system/away_summary) */
 | {
    kind: 'recap';
    key: string;
    text: string;
};
export type AssistantMessage = Extract<ChatMessage, {
    kind: 'assistant';
}>;
export type ResultMessage = Extract<ChatMessage, {
    kind: 'result';
}>;
/** One answer card: the assistant messages of one turn and the result that ended it */
export interface ChatAnswer {
    kind: 'answer';
    key: string;
    parts: AssistantMessage[];
    result: ResultMessage | null;
}
/** What the chat renders: answers grouped, everything else as it came */
export type ChatItem = Exclude<ChatMessage, {
    kind: 'assistant';
}> | ChatAnswer;
/**
 * Group consecutive assistant messages into one answer per turn. A `result` closes the answer
 * before it; a user message, recap or notice starts a new one.
 */
export declare function groupAnswers(messages: ChatMessage[]): ChatItem[];
export interface ChatCommand {
    name: string;
    description: string;
    argumentHint?: string;
    builtin?: boolean;
}
export interface ChatState {
    messages: ChatMessage[];
    sessionId: string | null;
    model: string | null;
    /** Effort of the latest main-thread answer (Claude Code logs it per assistant record) */
    effort: string | null;
    /** Assistant message id → index of the next block a full `assistant` event fills */
    filled: Record<string, number>;
    /** Slash commands (built-ins, skills) and agents the CLI reported */
    commands: ChatCommand[];
    agents: {
        name: string;
        description: string;
    }[];
    /** Sub-agent blocks by the Agent tool call that runs them */
    sub: Record<string, ChatBlock[]>;
    /**
     * Claude Code's prompt queue as the transcript logs it (`queue-operation`): a prompt typed while
     * the agent works shows up as a user record only when the turn takes it, often minutes later
     */
    queued: string[];
    /**
     * Prompts this view typed into a harness without such a log (omp logs a prompt only once the
     * agent takes it): shown at once, the oldest gives way to each logged user turn
     */
    sent: string[];
    /** The next user prompt starts a context (session start, compaction, `/clear`) */
    boundary: boolean;
    /** Background tasks (shells) whose `<task-notification>` reported an end */
    endedTasks: string[];
    /** Cursor of the next older page (`fetchChatHistory`); null before the replay said */
    older: {
        before: number;
        more: boolean;
        olderTs?: number;
    } | null;
}
export declare const initialChatState: ChatState;
/**
 * Puts an older page (`fetchChatHistory`) in front of the loaded messages. Pages end where a
 * turn starts, so its tool calls and results are complete; keys get the cursor as prefix.
 */
export declare function prependHistory(state: ChatState, page: ChatHistoryPage): ChatState;
/** Queued prompts the user typed (task notifications and other `<…>` wrappers left out) */
export declare const pendingPrompts: (state: ChatState) => string[];
/** Prompts that start a context: the session's first and each first after compaction / `/clear` */
export declare const initialPrompts: (messages: ChatMessage[]) => {
    kind: "user";
    key: string;
    text: string;
    ts?: number;
    initial?: boolean;
    queued?: boolean;
}[];
/** A user turn another agent sent with `orkumo send`: its sender (null = unknown) and text */
export declare function agentMessage(text: string): {
    id: string | null;
    name: string | null;
    body: string;
} | null;
/** Fold one server event into the chat. Unknown or malformed events leave the state unchanged. */
export declare function reduceChat(state: ChatState, event: unknown): ChatState;
export type ChatSubmitKey = 'enter' | 'mod+enter';
/**
 * Does this keydown send the message? `enter`: Enter sends, Shift+Enter breaks the line.
 * `mod+enter`: Cmd/Ctrl+Enter sends, plain Enter breaks the line. IME composition never sends.
 */
export declare function isSubmitKey(e: {
    key: string;
    shiftKey: boolean;
    metaKey: boolean;
    ctrlKey: boolean;
    isComposing?: boolean;
}, mode: ChatSubmitKey): boolean;
export interface DiffLine {
    sign: '+' | '-' | ' ';
    text: string;
}
/** Edit/Write/MultiEdit input → diff lines (whole old block removed, new block added) */
export declare function toolDiff(name: string, input: Record<string, unknown>): DiffLine[] | null;
/** One-line summary of a tool call's main argument */
export declare function toolSummary(input: Record<string, unknown>): string;
