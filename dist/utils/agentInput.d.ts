/**
 * Parsing of the agent view dispatch input.
 *
 * Mirrors the TUI rules documented for `claude agents`:
 *   <agent-name> <prompt>   run as subagent when the first word matches a subagent
 *   @<agent-name> <prompt>  mention a subagent anywhere
 *   @<repo> <prompt>        mention a repository to target its directory
 *   /<command>              slash command (/resume, /model, /effort, skills)
 *   ! <command>             run a shell command as a background job (--exec)
 *   #<number> | PR URL      select the session working on that PR
 *   a:<name> s:<state> #<n> URL  filter the list instead of dispatching
 */
import type { AgentSession, AgentSubagent, AgentRepo } from '../types';
export declare const MIN_PROMPT_LENGTH = 4;
export interface ParseContext {
    subagents?: Pick<AgentSubagent, 'name'>[];
    repos?: Pick<AgentRepo, 'name' | 'path'>[];
}
export type ParsedInput = {
    kind: 'empty';
} | {
    kind: 'filter';
    filter: SessionFilter;
    raw: string;
} | {
    kind: 'select-pr';
    number: number | null;
    url: string | null;
    raw: string;
} | {
    kind: 'command';
    command: string;
    args: string;
    raw: string;
} | {
    kind: 'exec';
    command: string;
    raw: string;
} | {
    kind: 'too-short';
    raw: string;
} | {
    kind: 'dispatch';
    prompt: string;
    agent: string | null;
    repo: Pick<AgentRepo, 'name' | 'path'> | null;
    raw: string;
};
export interface SessionFilter {
    agent?: string;
    state?: string;
    prNumber?: number;
    url?: string;
}
/** Remove ANSI escape sequences (colours, cursor movement, OSC titles) from terminal output. */
export declare function stripAnsi(text: string): string;
/**
 * Detect a "filter" expression (typed in the dispatch input to narrow the list).
 */
export declare function parseFilter(text: string): SessionFilter | null;
/**
 * Apply a filter to a list of sessions.
 */
export declare function applySessionFilter(sessions: AgentSession[], filter: SessionFilter | null): AgentSession[];
/**
 * Parse the dispatch input into an action.
 */
export declare function parseDispatchInput(text: string, context?: ParseContext): ParsedInput;
/**
 * Suggestion helpers for the dispatch input (Tab completion / popover).
 */
export interface Suggestion {
    type: 'agent' | 'repo' | 'command';
    label: string;
    description?: string;
    insert: string;
}
export declare function computeSuggestions(text: string, caret: number, context: {
    subagents: AgentSubagent[];
    repos: AgentRepo[];
    commands: {
        name: string;
        description: string;
    }[];
}): {
    suggestions: Suggestion[];
    replaceStart: number;
    replaceEnd: number;
};
/**
 * Parse numbered choices out of a session's recent output (permission prompts, questions).
 * Returns e.g. [{ number: 1, label: 'Yes' }, { number: 2, label: 'No' }].
 */
export declare function extractNumberedChoices(output: string): {
    number: number;
    label: string;
}[];
/**
 * Lines [start, end) of the dialog an agent's screen waits on, or null. Claude Code draws its input
 * line as `❯` right under a rule, with its prompt suggestion (ghost text) and echoed prompts as
 * `❯ …` as well, so a `❯ 1.` alone is no dialog: it needs a key-hint footer below the last `❯`, or
 * (the review step has no footer) a cursor on a numbered option with more below; never when the
 * last `❯` is the input line (under a rule), whose typed text may hold a hint as well.
 */
export declare function dialogRange(lines: string[]): {
    start: number;
    end: number;
} | null;
/**
 * The dialog on an agent's screen (permission or choice) without the input line and status lines
 * around it, or null when no dialog waits: an answer that merely ends with open questions is no prompt
 */
export declare function screenPrompt(screen: string): string | null;
/** `claude --bg` refuses a folder whose trust prompt was never accepted (needs an interactive run there) */
export declare function isUntrustedWorkspaceError(message: string): boolean;
