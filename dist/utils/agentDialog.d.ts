export type DialogRole = 'option' | 'other' | 'submit' | 'deny';
export interface DialogOption {
    label: string;
    description?: string;
    role: DialogRole;
    /** Checkbox state in a multi select; undefined for plain options and the submit row */
    checked?: boolean;
    /** omp radio: the option picked so far (the box waits on Submit) */
    selected?: boolean;
    /** Digit that picks it (Claude), null where only arrows reach it */
    number: number | null;
}
export interface AgentDialog {
    kind: 'question' | 'permission' | 'review' | 'choice';
    harness: 'claude' | 'omp';
    /** Question tabs (Claude): header and whether answered */
    tabs: {
        label: string;
        done: boolean;
    }[];
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
};
/** The dialog an agent's screen waits on, or null (no dialog, or one this parser does not know) */
export declare function parseAgentDialog(screen: string): AgentDialog | null;
/** Keys that give `answer` to `dialog`, from where its cursor is */
export declare function dialogKeys(dialog: AgentDialog, answer: DialogAnswer): string;
