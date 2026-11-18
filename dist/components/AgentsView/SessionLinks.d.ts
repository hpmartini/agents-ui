import React from 'react';
import type { AgentContext, AgentPrLink, AgentSession } from '../../types';
import { AgentServer } from '../../utils/agentSessions';
export declare const IssuePill: React.FC<{
    issueKey: string;
    repoSlug?: string | null;
    onOpen?: (issueKey: string) => void;
}>;
/** PR state of a session; opens exactly its PR(s) when `onOpenPr` is given, else links out */
export declare const PrPill: React.FC<{
    session: Pick<AgentSession, 'links'>;
    onOpenPr?: (links: AgentPrLink[]) => void;
}>;
export declare const ServerLinks: React.FC<{
    session: Pick<AgentSession, 'worktree' | 'cwd'>;
    /** Running servers only */
    servers: AgentServer[];
}>;
export declare const SubagentsBadge: React.FC<{
    ctx?: AgentContext;
}>;
export interface SessionLinksProps {
    session: AgentSession;
    ctx?: AgentContext;
    /** Running servers only */
    servers: AgentServer[];
    issueKeys: string[];
    onOpenIssue?: (issueKey: string) => void;
    onOpenPr?: (links: AgentPrLink[]) => void;
}
/**
 * Pull requests, board issues, running servers and sub-agents of one session,
 * as inline items (the caller owns the flex container).
 */
export declare const SessionLinks: React.FC<SessionLinksProps>;
