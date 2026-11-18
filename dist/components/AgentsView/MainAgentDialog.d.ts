import React from 'react';
import type { AgentSession, AgentViewSettings } from '../../types';
type MainAgentConfig = AgentViewSettings['mainAgent'];
/** Window event that opens the main agent dialog from anywhere in the host (Orkumo's title bar) */
export declare const MAIN_AGENT_EVENT = "orkumo:main-agent";
/**
 * Main agent (#252): the session named in the settings (the martini-workflow main orchestrator
 * by default), reachable from every view. Shows its recent output with a reply field (the peek
 * panel) and the keep-alive switch; the server restarts a stopped main agent while it is on.
 */
export declare const MainAgentDialog: React.FC<{
    session: AgentSession | undefined;
    config: MainAgentConfig;
    onConfig: (config: MainAgentConfig) => void;
    onClose: () => void;
    onAttach: (session: AgentSession) => void;
    onReply: (session: AgentSession, text: string) => Promise<void>;
}>;
export {};
