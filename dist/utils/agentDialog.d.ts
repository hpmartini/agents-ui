export type DialogRole = 'option' | 'other' | 'submit' | 'deny';
export interface DialogOption {
    label: string;
    description?: string;
    role: DialogRole;
    /** Checkbox state in a multi select; undefined for plain options and the submit row */
    checked?: boolean;
    /** The option picked so far: omp radio (the box waits on Submit), Claude tab answered before */
    selected?: boolean;
    /** Digit that picks it (Claude), null where only arrows reach it */
    number: number | null;
    /** omp box with several questions: index into `groups` */
    group?: number;
}
export interface AgentDialog {
    kind: 'question' | 'permission' | 'review' | 'choice';
    harness: 'claude' | 'omp';
    /** Question tabs (Claude): header and whether answered */
    tabs: {
        label: string;
        done: boolean;
    }[];
    /** Step on screen among `tabs`: a tab's index, `tabs.length` on the review, -1 unknown */
    tab: number;
    /** omp box with several questions: each question, its options point here with `group` */
    groups: string[];
    /** Permission: the tool ("Bash command", "Edit file") */
    title: string;
    /** Permission: command, file, diff; review: the answers */
    detail: string;
    question: string;
    multi: boolean;
    /** Options in cursor order: arrows move along this list */
    options: DialogOption[];
    /** Row the cursor is on */
    cursor: number;
}
export type DialogAnswer = {
    type: 'pick';
    row: number;
} | {
    type: 'text';
    row: number;
    text: string;
}
/** Claude: go to question tab `tab` (`tabs.length` is the review) */
 | {
    type: 'tab';
    tab: number;
}
/** Claude: one tab back or forward */
 | {
    type: 'step';
    by: -1 | 1;
};
/**
 * The dialog an agent's screen waits on, or null (no dialog, or one this parser does not know).
 * `activeTab`: the tab label the TUI highlights (colour only, not in the text), see `paneActiveTab`.
 */
export declare function parseAgentDialog(screen: string, activeTab?: string | null): AgentDialog | null;
/** Keys that give `answer` to `dialog`, from where its cursor is */
export declare function dialogKeys(dialog: AgentDialog, answer: DialogAnswer): string;
