import type { AgentSession } from '../types';
import type { AgentTargets } from '../transport';
/**
 * Session copies (#236). `claude -p --resume <id>` keeps the session id, so a second process on
 * a transcript another process still writes is a second writer in the same worktree: the rail
 * shows it as a copy of that agent, and starting one asks first.
 */
/** Every transcript id a session writes or wrote (a background job's respawn writes a new one) */
export declare function transcriptIds(session: AgentSession): string[];
/**
 * One rail row per agent: a session whose transcript an earlier session already holds moves into
 * that session's `copies`. Background jobs are the source before interactive processes, then the
 * older session wins.
 */
export declare function collapseCopies(sessions: AgentSession[]): AgentSession[];
/** Listed session that holds transcript `sessionId` (a running job or process), or null */
export declare function transcriptHolder(sessions: AgentSession[], sessionId: string | null | undefined): AgentSession | null;
/** Open terminal pane that already runs transcript `sessionId`, or null */
export declare function paneHolding(panes: AgentSession[], openIds: Set<string>, sessionId: string | null | undefined, targets?: AgentTargets): string | null;
/**
 * Resuming `session` elsewhere makes a copy: a background job always (its own process is
 * `claude attach`), an interactive session while its process still runs.
 */
export declare function resumeMakesCopy(session: AgentSession): boolean;
/**
 * What opening a rail row does: a session an Orkumo pane runs focuses that pane, or reattaches it
 * when the pane was closed (closing only detaches); a background job attaches (never a resume), a
 * Claude app session opens its claude.ai page (a resume would fork it), another harness attaches,
 * anything else resumes its transcript.
 */
export type OpenPlan = {
    type: 'attach';
} | {
    type: 'focus';
    paneId: string;
} | {
    type: 'reattach';
    paneId: string;
} | {
    type: 'app';
    url: string | null;
} | {
    type: 'resume';
    sessionId: string | null;
};
export declare function openPlan(session: AgentSession, panes: AgentSession[], openIds: Set<string>, 
/** The transport's instances (#220); local only without */
targets?: AgentTargets): OpenPlan;
/** Session id shown on a workspace tab: the job id for background jobs, else the transcript id */
export declare function tabSessionLabel(session: AgentSession): string | null;
