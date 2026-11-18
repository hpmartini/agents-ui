/**
 * Grouping, sorting and formatting helpers for the agent view session list.
 */
import { type AgentTargets } from '../transport';
import type { AgentSession, AgentHarness, AgentDisplayState, AgentGrouping, AgentPrLink, AgentContext, AgentPullRequest, AgentCardElement, AgentCardFields, AgentCardSlot } from '../types';
export type GroupKey = 'pinned' | 'review' | 'needs-input' | 'working' | 'completed' | 'app' | 'interactive' | 'all' | 'orchestrators' | `dir:${string}` | `project:${string}`;
export interface SessionGroup {
    key: GroupKey;
    title: string;
    /** Directory path for directory groups (dispatch target) */
    cwd?: string;
    /** Orkumo app behind a project group (header opens its detail view) */
    appId?: string;
    sessions: AgentSession[];
    /** Sessions hidden behind the "… N more" row */
    hidden: AgentSession[];
    /** Fixed project (#253): stays in the rail without sessions */
    fixed?: boolean;
}
/** GitHub repo ("owner/name") of a project/directory group's agents; null for state groups */
export declare const groupRepoSlug: (group: Pick<SessionGroup, "cwd" | "sessions">, contexts: Record<string, {
    repo?: {
        slug: string | null;
    } | null;
} | undefined>) => string | null;
export declare const STATE_GROUP_ORDER: GroupKey[];
/** Maximum completed rows shown before folding into "… N more" */
export declare const COMPLETED_VISIBLE_LIMIT = 6;
export declare function openPrCount(session: AgentSession): number;
export declare function hasOpenPr(session: AgentSession): boolean;
export declare function isFinished(session: AgentSession): boolean;
/**
 * Sort inside a group: manual order first, then newest first.
 */
export declare function sortSessions(sessions: AgentSession[]): AgentSession[];
/**
 * Group sessions by state (default) or by directory.
 */
export declare function groupSessions(sessions: AgentSession[], grouping: AgentGrouping, options?: {
    expandedCompleted?: boolean;
    collapsed?: string[];
    sort?: AgentSort;
    lookup?: SessionLookup;
    /** Orkumo apps, needed for the 'project' grouping */
    apps?: ProjectApp[];
    /** Directories of fixed projects (#253): their 'project' groups exist without sessions */
    fixedProjects?: string[];
}): SessionGroup[];
/** Key of the synthetic group holding orchestrator sessions (always first, not reorderable) */
export declare const ORCHESTRATORS_GROUP_KEY: GroupKey;
/**
 * Marked as orchestrator (`agentView.orchestrators`): by row id, transcript uuid or pane id, so
 * the mark survives a pane resuming its session under a new row id.
 */
export declare function isOrchestrator(session: Pick<AgentSession, 'id' | 'sessionId' | 'paneId'>, ids: readonly string[] | undefined): boolean;
/** Id stored when marking: a job's own id, else its transcript uuid (row ids follow the pid) */
export declare const orchestratorKey: (session: AgentSession) => string;
/** Role of an orchestrator in `agentView.orchestratorRoles` (same keys as the mark); null when none */
export declare function orchestratorRole(session: Pick<AgentSession, 'id' | 'sessionId' | 'paneId'>, roles: Readonly<Record<string, string>> | undefined): string | null;
/** `roles` without the entries of `session` (unmarking, reassigning) */
export declare const withoutOrchestratorRole: (roles: Readonly<Record<string, string>> | undefined, session: AgentSession) => Record<string, string>;
/** `ids` without every id that names `session` (unmarking) */
export declare const withoutOrchestrator: (ids: readonly string[], session: AgentSession) => string[];
/**
 * Pulls orchestrator sessions out of their groups into a leading Orchestrators group, in every
 * grouping (a session never shows twice). A non-state group left empty by this goes away.
 */
export declare function withOrchestratorSessions(groups: SessionGroup[], ids: readonly string[] | undefined): SessionGroup[];
/** Minimal Orkumo project shape for the 'project' grouping (GET /api/apps) */
export interface ProjectApp {
    id: string;
    name: string;
    path: string;
    /** Main checkouts it covers: its own path plus those of projects merged into it */
    paths?: string[];
    /** Linked git worktrees of those checkouts */
    worktrees?: string[];
    /** Ids of projects merged into this one */
    mergedIds?: string[];
    /** The user chose the name: it wins over the GitHub repo title */
    userNamed?: boolean;
}
/** The one group of sessions no project contains (non-git folders, deleted dirs, tmp runs) */
export declare const NO_PROJECT_KEY: GroupKey;
/**
 * Sessions belonging to a project context (#133): those whose project is a member, or holds a
 * member merged into it. `appIds === null` is the "all" context and keeps every session.
 */
export declare function sessionsInContext(sessions: AgentSession[], apps: ProjectApp[], appIds: string[] | null | undefined, lookup?: SessionLookup): AgentSession[];
/** A dev-server port of a Orkumo app that lives in a session's directory */
export interface AgentServer {
    port: number;
    running: boolean;
    name: string;
    /** Only set for really listening processes (AgentContext.servers) */
    command?: string;
    pid?: number;
}
/** Minimal Orkumo app shape needed to match servers to sessions */
export interface ServerApp {
    name: string;
    path: string;
    port?: number;
    addresses?: string[];
    status?: string;
}
/** Per-session data that is not part of the session itself */
export interface SessionLookup {
    contexts?: Record<string, AgentContext | undefined>;
    servers?: Map<string, AgentServer[]>;
    /** Session id -> board issue key ("owner/repo#12") of agents the workflow provider started (#159) */
    workflowIssues?: Map<string, string>;
    /** Session-name pattern of the workflow provider; none: no name matching */
    workflowName?: RegExp | null;
    /** Clock for time-dependent filters (cache expiry); defaults to Date.now() */
    now?: number;
}
export interface WorkflowName {
    repo: string;
    number: number;
    /** Name without the prefix; the full name when nothing follows it */
    title: string;
}
/** Splits a workflow session name by the provider's pattern (repo, number, title); null otherwise */
export declare function parseWorkflowName(name: string | null | undefined, re: RegExp | null | undefined): WorkflowName | null;
/** Started by the workflow provider for a GitHub issue, not by hand */
export declare function isWorkflowSession(session: Pick<AgentSession, 'id' | 'name'>, lookup?: SessionLookup): boolean;
/**
 * Board issue a workflow agent works on: the workflow link, else the name prefix resolved
 * against the agent's linked issues or its repo slug (key null if neither matches).
 * null for hand-started agents.
 */
export declare function workflowIssue(session: Pick<AgentSession, 'id' | 'name'>, lookup?: SessionLookup, issueKeys?: string[]): {
    key: string | null;
    number: number;
} | null;
export type AgentSortKey = 'attention' | 'updated' | 'newest' | 'oldest' | 'name' | 'repo' | 'prs' | 'servers' | 'manual';
export interface AgentSort {
    key: AgentSortKey;
    dir: 'asc' | 'desc';
}
export declare const SORT_OPTIONS: {
    key: AgentSortKey;
    label: string;
    dir: 'asc' | 'desc';
    /** Whether the direction toggle makes sense */
    directional: boolean;
}[];
export declare const DEFAULT_SORT: AgentSort;
/**
 * Main checkout of a Claude/git worktree path ("<main>/.claude/worktrees/x" or
 * "<main>/.worktrees/x"), derived from the path alone so it works before contexts load.
 * Worktrees created elsewhere (`git worktree add ../x`) join their main checkout once the
 * server context delivers repo.root.
 */
export declare function mainRepoPath(dir: string): string;
/** Project name of a directory: "Repo", or "Repo · folder" for a worktree */
export declare function dirName(dir: string): string;
/** Main repository name (never the worktree folder), falling back to the path-derived name */
export declare function repoName(session: AgentSession, lookup?: SessionLookup): string;
/**
 * Repository shown in the rail: the server context, else a worktree hint from the session's
 * job state alone (context not loaded yet or git lookup failed). Branch stays unknown then.
 */
export declare function displayRepo(session: AgentSession, ctx?: AgentContext): AgentContext['repo'];
/**
 * Display name of a model id: "claude-opus-5-5" -> "Opus 5.5", "claude-3-5-sonnet-20241022" ->
 * "Sonnet 3.5". Unknown ids stay unchanged; empty and "<synthetic>" give null.
 */
export declare function formatModelName(id: string | null | undefined): string | null;
export declare function sortSessionsBy(sessions: AgentSession[], sort: AgentSort, lookup?: SessionLookup): AgentSession[];
export type AgentQuickFilter = 'needs-input' | 'working' | 'completed' | 'failed' | 'pr' | 'server' | 'subagents' | 'local' | 'workflow' | 'cache-expiring';
export declare const QUICK_FILTERS: {
    key: AgentQuickFilter;
    label: string;
    title: string;
}[];
export declare function matchesQuickFilter(key: AgentQuickFilter, session: AgentSession, lookup?: SessionLookup): boolean;
/** State chips and origin chips each combine with OR (alternatives), attribute chips with AND. */
export declare function applyQuickFilters(sessions: AgentSession[], active: ReadonlySet<AgentQuickFilter>, lookup?: SessionLookup): AgentSession[];
/** One open PR or linked issue offered by the PR / issue filter */
export interface LinkFilterEntry {
    /** "pr:<url>" or "issue:<owner/repo#n>" */
    key: string;
    kind: 'pr' | 'issue';
    label: string;
    title: string;
}
/** Filter keys of a session's open PRs and linked issues (board links plus its workflow issue). */
export declare function sessionLinkKeys(session: AgentSession, issueKeys?: string[], lookup?: SessionLookup): string[];
/** Every open PR and linked issue of the given sessions, deduped; PRs first, newest number first. */
export declare function collectLinkEntries(sessions: AgentSession[], issuesByAgent?: Map<string, string[]>, lookup?: SessionLookup, issueTitles?: Map<string, string>): LinkFilterEntry[];
/** Sessions linked to any selected PR or issue; all sessions when nothing is selected. */
export declare function applyLinkFilter(sessions: AgentSession[], selected: ReadonlySet<string>, issuesByAgent?: Map<string, string[]>, lookup?: SessionLookup): AgentSession[];
/**
 * Rail text search (#198): every whitespace-separated word must occur (case-insensitive) in the
 * session's name, directory, agent, branch, or the number / title of a linked PR or issue.
 */
export declare function applyTextQuery(sessions: AgentSession[], query: string, issuesByAgent?: Map<string, string[]>, lookup?: SessionLookup, issueTitles?: Map<string, string>): AgentSession[];
/**
 * Orkumo apps whose directory equals, contains or lies inside the session's directory.
 */
export declare function matchServers(session: AgentSession, apps: ServerApp[]): AgentServer[];
/**
 * A session's servers: Orkumo apps in its directory plus really listening
 * processes (AgentContext.servers), deduped by port. Listening processes win
 * because they prove the port is live.
 */
export declare function mergeServers(session: AgentSession, apps: ServerApp[], context?: AgentContext): AgentServer[];
export interface PullRequestRow {
    pr: AgentPullRequest;
    /** Sessions whose current branch is the PR's head branch */
    agents: AgentSession[];
}
/**
 * Every open PR across all agent repos, deduped by repo + number, merge-ready
 * first, then most recently updated.
 */
export declare function collectPullRequests(sessions: AgentSession[], contexts: Record<string, AgentContext | undefined>): PullRequestRow[];
/**
 * The session with PR links for every harness: Claude Code jobs report theirs (`links`), any
 * other session (omp, chats, interactive terminals) gets the open PRs of its current branch,
 * matched like the PR panel does (`collectPullRequests`). Unchanged sessions are returned as is.
 */
export declare function withBranchPullRequests(session: AgentSession, ctx: AgentContext | undefined): AgentSession;
/** `withBranchPullRequests` over a list; the same array when no session changed (stable deps) */
export declare function sessionsWithBranchPullRequests(sessions: AgentSession[], contexts: Record<string, AgentContext | undefined>): AgentSession[];
/** Totals across all sessions for the summary bar. */
export declare function summarizeContext(sessions: AgentSession[], lookup?: SessionLookup): {
    openPrs: number | null;
    runningServers: number | null;
};
/**
 * Flattened, keyboard-navigable list (group headers + rows).
 */
export type NavItem = {
    type: 'group';
    group: SessionGroup;
} | {
    type: 'session';
    session: AgentSession;
    group: SessionGroup;
} | {
    type: 'more';
    group: SessionGroup;
    count: number;
};
export declare function flattenGroups(groups: SessionGroup[], collapsed: Set<string>, hideEmpty?: boolean): NavItem[];
/** Rail rows for a grouping: empty project/directory groups and an empty Claude App / Interactive group are left out */
export declare function railItems(groups: SessionGroup[], collapsed: Set<string>, grouping: AgentGrouping): NavItem[];
export declare function summarizeSessions(sessions: AgentSession[]): {
    awaitingInput: number;
    working: number;
    completed: number;
    failed: number;
};
/**
 * Age since creation. Frozen at the last update once the session finished.
 */
export declare function sessionAgeMs(session: AgentSession, now?: number): number;
export declare function formatAge(ms: number): string;
/**
 * Icon glyph + colour for a display state, matching the TUI legend.
 */
export declare function stateGlyph(state: AgentDisplayState): {
    glyph: string;
    className: string;
    animate: boolean;
    label: string;
};
/** Card elements in display order within a slot, with their settings labels (#159) */
export declare const CARD_ELEMENTS: {
    key: AgentCardElement;
    label: string;
}[];
/** Agent harnesses (#195) in picker order, with their display names */
export declare const HARNESSES: {
    id: AgentHarness;
    label: string;
}[];
export declare const harnessLabel: (id: AgentHarness) => string;
/** Which CLI a session runs with: a harness PTY or chat names it, everything else is Claude Code */
export declare function sessionHarness(session: AgentSession): AgentHarness;
/** Harnesses whose transcript the server can read, so their panes have a UI view */
export declare const UI_VIEW_HARNESSES: Record<AgentHarness, boolean>;
/** PTY arguments that continue `sessionId` in the harness's terminal UI */
export declare const terminalResumeArgs: (harness: AgentHarness, sessionId: string) => string[];
/**
 * Harnesses started in a PTY that take `--model <name>` before their prompt (#19 AK-2; server
 * allowlist: config/harnesses.js). Claude Code gets its model through the dispatch.
 */
export declare const HARNESS_MODEL_FLAG: Record<AgentHarness, boolean>;
/** Model names the composer offers per harness (CLI aliases; any other name can be typed) */
export declare const MODEL_SUGGESTIONS: Record<AgentHarness, string[]>;
/**
 * An Oh My Pi session listed from omp's session store (#195), wherever its process runs: the
 * server stops and deletes it. A harness pane started here gets such a row once omp writes.
 */
export declare const isOmpStoreSession: (session: AgentSession) => boolean;
/** Where a Claude app session was started ("iOS", "Android", "Web"); null for other sessions */
export declare function appOriginLabel(session: AgentSession): string | null;
export declare const CARD_SLOTS: {
    key: AgentCardSlot;
    label: string;
}[];
/**
 * Sorts rendered card elements into their slots. Empty elements (null, false, empty list)
 * are dropped, so a slot without content is an empty array. `wrap` keys rendered nodes.
 */
export declare function cardSlots<T, U = T>(fields: Partial<AgentCardFields>, nodes: Record<AgentCardElement, T>, wrap?: (node: T, key: AgentCardElement) => U): Record<AgentCardSlot, U[]>;
/**
 * PR label for the right edge of a row.
 */
export declare function prLabel(links: AgentPrLink[]): {
    text: string;
    className: string;
    href: string | null;
} | null;
/**
 * Title for the browser tab: "2 awaiting input · claude agents".
 */
export declare function documentTitle(awaitingInput: number): string;
export declare function shortenPath(cwd: string, max?: number): string;
/**
 * Transcript id of the session a pane runs, or null: Claude Code's UUID (`claude --resume`), or
 * the id the server lists for another harness's session (omp). The UI view reads that transcript.
 * Harness panes without a listed session and cloud panes have none. `targets`: the transport's
 * instances (#220), local only without.
 */
export declare function resumableSessionId(session: AgentSession, targets?: AgentTargets): string | null;
/** An agent works in its worktree; its cwd is the worktree (or a folder in it) otherwise */
export declare function agentFolder(session: Pick<AgentSession, 'cwd'> | undefined, ctx?: AgentContext | null): string | null;
