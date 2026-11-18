import type { AgentContext, AgentSession } from '../types';
/**
 * What of the sessions can change their repo or PRs: state and turn status (an agent edits,
 * commits and pushes during a turn) and PR links. Not `detail`, which changes all through a turn.
 */
export declare function contextTriggerKey(sessions: AgentSession[]): string;
/**
 * Git/PR/issue/sub-agent context per session id. Refetched when a session changes (`sessions`,
 * from the agents SSE), plus a slow reconcile; nothing while the page is hidden. Keeps the
 * previous data when a refresh fails. Empty without the transport's `contexts` group.
 */
export declare function useAgentContexts(active: boolean, sessions?: AgentSession[]): Record<string, AgentContext>;
