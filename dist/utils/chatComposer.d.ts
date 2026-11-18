/**
 * Chat composer editing rules (#189 follow-up): pure functions of text + caret, so ChatPane only
 * applies the result. Each returns null when the key keeps its native behavior.
 */
export interface Edit {
    value: string;
    caret: number;
}
/** Home: start of the line; already there → start of the line above. Never leaves the text. */
export declare function homeKey(text: string, caret: number): number | null;
/** End: end of the line; already there → end of the line below. Never leaves the text. */
export declare function endKey(text: string, caret: number): number | null;
/** Newline inside a list item: continue the bullet; on an empty item end the list instead */
export declare function continueList(text: string, caret: number): Edit | null;
/** Tab / Shift+Tab on a list line: indent by 2 / outdent by up to 2. Other lines keep Tab (focus). */
export declare function indentList(text: string, caret: number, outdent: boolean): Edit | null;
/** Arrow up/down walks earlier messages only while the caret is on the first / last line */
export declare function historyStep(text: string, caret: number, direction: 'up' | 'down'): boolean;
/**
 * Message history cursor. `index` -1 = the draft; 0 = newest sent message.
 * Returns the new index and text, or null at either end.
 */
export declare function browseHistory(history: string[], index: number, draft: string, direction: 'up' | 'down'): {
    index: number;
    text: string;
} | null;
export interface ChatSuggestion {
    kind: 'command' | 'agent' | 'file' | 'dir';
    label: string;
    insert: string;
    description: string;
    hint: string;
}
export interface SuggestionContext {
    commands: {
        name: string;
        description: string;
        argumentHint?: string;
        builtin?: boolean;
    }[];
    agents: {
        name: string;
        description: string;
    }[];
    files: string[];
    /** Directories for a path argument, each the whole argument (`~/Music/`) */
    dirs?: string[];
}
/** A command whose argument is a path (`/cd <path>`, `add-dir <path>`): its picker lists directories */
export declare const takesPath: (c: {
    argumentHint?: string;
} | undefined) => boolean;
export type SuggestionTrigger = '/' | '@' | 'arg';
/**
 * Token at the caret that opens the picker: `/cmd` at line start, `@x` anywhere, or the argument
 * of a command on a one-line message (`/cd ~/Mu`, `command` = cd)
 */
export declare function suggestionQuery(text: string, caret: number): {
    trigger: SuggestionTrigger;
    query: string;
    start: number;
    command?: string;
} | null;
/** `limit` caps `@` results (files run into thousands); commands are never cut */
export declare function chatSuggestions(trigger: SuggestionTrigger, query: string, ctx: SuggestionContext, limit?: number): ChatSuggestion[];
/** `[Image: /path]` lines the composer appends → image paths + the text without them */
export declare function splitImages(text: string): {
    text: string;
    images: string[];
};
/**
 * The CLI runs a built-in command (`/compact`, `/model` …) only as the first word of a message.
 * "erst das, dann /compact" becomes two turns: the text before, then the command with its rest.
 * Skills and agents stay inline: the model calls them from anywhere in the text.
 */
export declare function splitAtBuiltin(text: string, builtins: ReadonlySet<string>): string[];
