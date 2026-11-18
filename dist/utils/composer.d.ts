/**
 * Shared rules of the task / agent / issue composers (#105): Enter inserts a newline,
 * Cmd+Enter (Ctrl+Enter off macOS) submits, Cmd+Shift+Enter submits and attaches.
 */
interface KeyLike {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    nativeEvent?: {
        isComposing?: boolean;
    };
}
/** null = not a submit key (plain Enter stays a newline) */
export declare function submitIntent(e: KeyLike): {
    attach: boolean;
} | null;
/** Image files of a paste / drop / file-input list */
export declare function imageFiles(list: FileList | File[] | null | undefined): File[];
/** Images the agents' image store takes (`POST /api/agents/images` sniffs the same four) */
export declare const PROMPT_IMAGE_TYPES: string[];
/**
 * Files a chat or agent prompt can carry (#19 AK-3): the four image types, else PDF, text and
 * code by extension (`extensions`: the transport's `uploads.attachmentExtensions`; the server
 * checks the content).
 */
export declare function attachableFiles(list: FileList | File[] | null | undefined, extensions: readonly string[]): File[];
/** An attachment stored on the server: images go to Claude Code as images, files by path */
export interface StoredAttachment {
    path: string;
    kind: 'image' | 'file';
}
/**
 * Prompt with the stored attachments appended: `[Image: <path>]` the way Claude Code references
 * pasted images, `[File: <path>]` for documents the agent reads itself
 */
export declare function promptWithAttachments(prompt: string, stored: StoredAttachment[]): string;
/** Issue body with the uploaded images embedded as Markdown */
export declare function bodyWithImages(body: string, urls: string[]): string;
/** Task text -> issue fields when switching dialogs (#271): first line is the title (GitHub limit 256) */
export declare function taskToIssueDraft(text: string): {
    title: string;
    body: string;
};
/** Issue fields -> task text; the inverse of taskToIssueDraft */
export declare function issueDraftToTask(draft: {
    title: string;
    body: string;
}): string;
/**
 * Directory a new task, agent or chat starts in, the same one the composer shows: a pick in the
 * composer first, then per kind the task default (settings `taskCwd`) or the directory handed
 * over on open, then the rail target (task, chat) or home (agent)
 */
export declare function composerStartCwd(kind: 'task' | 'agent' | 'chat', dirs: {
    picked: string | null;
    opened: string | null;
    taskCwd: string | null;
    targetCwd: string | null;
    homeDir: string | null;
}): string | null;
export {};
