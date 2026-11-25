/**
 * What a chat is doing, derived from its messages (#189 follow-up): the plan (TaskCreate /
 * TaskUpdate / TodoWrite), background shells, sub-agents and the steps of the running turn.
 */
import type { ChatBlock, ChatMessage } from './chatEvents';
export interface PlanItem {
    id: string;
    subject: string;
    status: 'pending' | 'in_progress' | 'completed';
}
/** Latest plan state; TaskCreate ids come from the result ("Task #3 created"), else in order */
export declare function chatPlan(messages: ChatMessage[]): PlanItem[];
export interface ChatShell {
    id: string;
    command: string;
    description: string;
}
/** Background shells still running: started by Bash `run_in_background`, no end reported yet */
export declare function chatShells(messages: ChatMessage[], ended?: string[]): ChatShell[];
export interface ChatSubagent {
    toolId: string;
    type: string;
    description: string;
    done: boolean;
    isError: boolean;
}
export declare function chatSubagents(messages: ChatMessage[], ended?: string[]): ChatSubagent[];
/** Thinking + tool blocks since the last user message: the work of the current turn */
export declare function turnSteps(messages: ChatMessage[]): ChatBlock[];
