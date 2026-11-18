/**
 * The contract between the agents view and whatever runs the agents. The view only ever talks to
 * an `AgentsTransport`. `agents`, `settings` and `pty` are required; every other group is a
 * capability: without it, the view hides what depends on it (no placeholders).
 *
 * Method names and signatures are those of Orkumo's `services/agentsApi.ts`, so Orkumo's
 * transport is those functions, grouped. Errors are thrown as `Error`, with the HTTP status as
 * `status` where there is one (`TransportError`).
 */
import type {
  AgentContext,
  AgentDispatchRequest,
  AgentDispatchResult,
  AgentHarness,
  AgentLogs,
  AgentNotification,
  AgentOrphanServer,
  AgentPastSession,
  AgentRemoveResult,
  AgentRepo,
  AgentServerStats,
  AgentSession,
  AgentSlashCommand,
  AgentSubagent,
  AgentViewSettings,
  AgentsResponse,
  AgentCacheInfo,
} from './types';
import type { HarnessModel } from './utils/modelMatrix';
import type { StoredAttachment } from './utils/composer';
import type { UsageLimits } from './components/UsageView/types';

export interface TransportError extends Error {
  status?: number;
}

/** A session the server started in an agent pane (quick window, orchestrator) */
export interface QuickAgent {
  paneId: string;
  harness: AgentHarness;
  sessionId: string;
  cwd: string;
}

export interface AgentsHandlers {
  onSessions: (sessions: AgentSession[]) => void;
  onNotify?: (notification: AgentNotification) => void;
  /**
   * The list could not be loaded or the stream failed; `status`: the HTTP status where there is
   * one. Before any list arrived the view shows it in place of the list: 401/403 no access, 5xx
   * service down, else load failed (with a retry).
   */
  onError?: (message: string, status?: number) => void;
  onConnectionChange?: (connected: boolean) => void;
}

/** Terminal of a session the server runs: `claude attach <id>` */
export interface PtyAttachRequest {
  id: string;
  cwd: string;
  cols: number;
  rows: number;
}

/**
 * A terminal the server starts from scratch for a client-side session: an interactive harness,
 * `--session-id`, `--resume`, `--continue`, `--cloud` (the session's `ptyArgs`)
 */
export interface PtySpawnRequest {
  /** Id of the client-side session (names the PTY session; the instance it runs on, #220) */
  id: string;
  cwd: string;
  cols: number;
  rows: number;
  command: AgentHarness;
  args: string[];
}

/** A plain shell in `cwd` (the server's default shell) */
export interface PtyShellRequest {
  cwd: string;
  cols: number;
  rows: number;
}

/**
 * The PTY socket speaks Orkumo's protocol: client → `{type:'input',data}`,
 * `{type:'resize',cols,rows}`; server → `{type:'output',data}`,
 * `{type:'connected',pid,cwd,shell?,reattached?}`, `{type:'exit',exitCode}`, `{type:'error',message}`.
 * A host without WebSockets returns an object with the same surface.
 */
export type PtySocket = WebSocket;

export interface ChatSummary {
  id: string;
  harness: AgentHarness;
  cwd: string;
  name: string;
  sessionId: string | null;
  model: string | null;
  running: boolean;
  startedAt: number;
}

export interface ChatStatus {
  git: {
    branch: string | null;
    untracked: number;
    changed: number;
    ahead: number;
    behind: number;
  } | null;
  /** Claude Code only: prompt cache (expiry badge) */
  cache: AgentCacheInfo | null;
  /** Tokens in the context window, for every harness that reports them */
  context: { tokens: number; window: number } | null;
  limits: UsageLimits | null;
}

export interface ChatHandlers {
  onOpen: () => void;
  onEvent: (event: unknown) => void;
  onGone: () => void;
}

/** A page of older transcript events; `before` is the cursor of the next older page */
export interface ChatHistoryPage {
  events: unknown[];
  before: number;
  more: boolean;
}

/** A file the chat's agent created or edited, or one of omp's session documents (`local://`) */
export interface ChatArtifact {
  path: string;
  name: string;
  kind: 'file' | 'document';
  action: 'created' | 'edited';
  size: number | null;
  mtime: number | null;
  exists: boolean;
}

/** A page on claude.ai the chat's agent published (newest version), only read, or linked to */
export interface ClaudeArtifact {
  url: string;
  source: 'published' | 'read' | 'linked';
  title: string | null;
  label: string | null;
  description: string | null;
  version: number | null;
  updatedAt: number | null;
  /** local HTML source of a published page */
  file: string | null;
  /** Slides, Dashboard, Design, Document or Page */
  type: string;
}

export interface ChatArtifacts {
  files: ChatArtifact[];
  pages: ClaudeArtifact[];
}

export interface OrchestratorWorkspace {
  dir: string;
  cli: string;
  /** Typed into / replied to a session that was just marked as orchestrator */
  briefing: string;
}

/** A role file `<workspace>/roles/<id>.md`; briefing assigns it to a running orchestrator */
export interface OrchestratorRole {
  id: string;
  title: string;
  briefing: string;
}

export interface OpenFileOptions {
  /** In the editor, in the window of the session's project (else the default app) */
  editor?: boolean;
  /** Show the file in the file manager instead of opening it */
  reveal?: boolean;
  line?: number;
  col?: number;
}

export interface AgentsTransport {
  /** Session list, start, stop */
  agents: {
    fetchAgents: (options?: { cwd?: string | null; all?: boolean }) => Promise<AgentsResponse>;
    /** Pushes the session list on every change; reconnects by itself; returns unsubscribe */
    subscribeToAgents: (handlers: AgentsHandlers) => () => void;
    dispatchAgent: (body: AgentDispatchRequest) => Promise<AgentDispatchResult>;
    stopAgent: (id: string) => Promise<{ output: string }>;
  };
  /** View settings (grouping, layout, card fields, dispatch defaults, …); see `createLocalSettings` */
  settings: {
    fetchAgentViewSettings: () => Promise<AgentViewSettings>;
    /** Resolves with the full settings after the change */
    updateAgentViewSettings: (partial: Partial<AgentViewSettings>) => Promise<AgentViewSettings>;
  };
  /** Terminals */
  pty: {
    attach: (request: PtyAttachRequest) => PtySocket;
    /** Sessions started in a pane (`ptyArgs`); without it those panes show a notice, detached */
    spawn?: (request: PtySpawnRequest) => PtySocket;
    /** Plain shell panes ("Open terminal here") */
    shell?: (request: PtyShellRequest) => PtySocket;
  };
  /** Rename, pin, order, delete, respawn, raw `claude agents --json` */
  manage?: {
    renameAgent: (id: string, name: string) => Promise<{ id: string; name: string }>;
    pinAgent: (id: string, pinned: boolean) => Promise<{ id: string; pinned: boolean }>;
    reorderAgents: (ids: string[]) => Promise<{ ids: string[] }>;
    removeAgent: (
      id: string,
      options?: { discardUnpushed?: string | null; forceRemoveWorktree?: string | null }
    ) => Promise<AgentRemoveResult>;
    respawnAgent: (id: string) => Promise<{ output: string }>;
    fetchAgentsRawJson: (options?: { cwd?: string | null; all?: boolean }) => Promise<string>;
  };
  /** The background-agent daemon (settings panel) */
  daemon?: {
    respawnAllAgents: () => Promise<{ output: string }>;
    stopAgentDaemon: (options: {
      any?: boolean;
      keepWorkers?: boolean;
    }) => Promise<{ output: string; code: number }>;
  };
  /** Text to running agents: reply to a background job, type into an agent pane, end a pane */
  messaging?: {
    replyToAgent: (
      id: string,
      text: string,
      mode?: 'auto' | 'attach' | 'resume'
    ) => Promise<{ delivered: boolean; queued?: boolean; mode: string; output?: string }>;
    sendToPane: (paneId: string, text: string) => Promise<{ delivered: boolean }>;
    stopPane: (paneId: string) => Promise<{ stopped: number }>;
  };
  /** Repo, PRs, issues, servers, model and cache per session: PR panel, PR page, repo chips */
  contexts?: {
    /** `fresh`: wait for a recompute instead of the server's cached result */
    fetchAgentContexts: (options?: { fresh?: boolean }) => Promise<Record<string, AgentContext>>;
  };
  /** Repos, subagents, slash commands, harnesses and their models for the composer */
  discovery?: {
    fetchAgentRepos: (
      cwd?: string | null
    ) => Promise<{ cwd: string; repos: AgentRepo[]; home?: string; chats?: string }>;
    fetchSubagents: (cwd?: string | null) => Promise<AgentSubagent[]>;
    fetchAgentCommands: (cwd?: string | null, harness?: 'omp') => Promise<AgentSlashCommand[]>;
    /** Non-Claude harnesses and whether their CLI is installed (null: unknown) */
    fetchHarnesses: () => Promise<{ id: string; installed: boolean | null }[]>;
    fetchHarnessModels: (harness: 'claude' | 'omp') => Promise<HarnessModel[]>;
  };
  /** Past sessions for `/resume` */
  history?: {
    fetchPastSessions: (options?: {
      cwd?: string | null;
      q?: string;
    }) => Promise<AgentPastSession[]>;
  };
  /** Claude cloud sessions (`--cloud` / `--teleport`) */
  cloud?: {
    openCloudSession: (target?: string) => Promise<{ args: string[] }>;
  };
  /** Recent output of a session (peek panel, main agent dialog) */
  logs?: {
    fetchAgentLogs: (id: string, lines?: number) => Promise<AgentLogs>;
  };
  /** Images and files attached to prompts */
  uploads?: {
    uploadAttachment: (file: File) => Promise<StoredAttachment>;
    /** Preview URL of an uploaded image path; null for any other path */
    agentImageUrl: (path: string) => string | null;
    /** File extensions the server accepts as non-image attachments (lowercase, without dot) */
    attachmentExtensions: readonly string[];
  };
  /** UI view of an agent pane: transcript stream, history paging, status, completion, shells */
  chat?: {
    /** Opens (or reuses) the transcript view of the session pane `paneId` runs */
    openTranscriptView: (
      paneId: string,
      body: { harness: AgentHarness; sessionId: string; cwd: string; name?: string }
    ) => Promise<ChatSummary>;
    /** Every (re)open replays the whole history first, so `onOpen` resets the client state */
    subscribeToChat: (id: string, handlers: ChatHandlers) => () => void;
    /** Older turns: the page before cursor `before` */
    fetchChatHistory: (id: string, before: number) => Promise<ChatHistoryPage>;
    /** Branch, context, cache and plan limits under the input; without it that line is not shown */
    fetchChatStatus?: (id: string) => Promise<ChatStatus>;
    /** `@` file completion in the input; without it `@` lists agents only */
    fetchChatFiles?: (id: string, q: string) => Promise<string[]>;
    /** Directory completion for path arguments (`/cd <path>`); without it there is none */
    fetchChatDirs?: (id: string, q: string) => Promise<string[]>;
    /** Output of a background shell; without it a shell chip opens no output panel */
    fetchChatShell?: (
      id: string,
      shellId: string
    ) => Promise<{ output: string; updatedAt: number; truncated: boolean }>;
    /** URL of an image in a chat's tool results (its ref comes from the server); without it no images */
    chatImageUrl?: (chatId: string, ref: string) => string;
  };
  /** Files and pages a chat produced */
  artifacts?: {
    fetchChatArtifacts: (id: string) => Promise<ChatArtifacts>;
    fetchChatArtifactContent: (
      id: string,
      path: string
    ) => Promise<{ path: string; content: string; size: number; mtime: number }>;
  };
  /** Dev servers the agents run: orphans, stop, CPU/memory */
  servers?: {
    fetchOrphanServers: () => Promise<AgentOrphanServer[]>;
    stopOrphanServer: (pid: number) => Promise<{ stopped: number }>;
    fetchServerStats: (pids: number[], signal?: AbortSignal) => Promise<AgentServerStats[]>;
  };
  /** Orchestrators and their roles */
  orchestrator?: {
    fetchOrchestratorRoles: () => Promise<{ roles: OrchestratorRole[] }>;
    fetchOrchestratorWorkspace: () => Promise<OrchestratorWorkspace>;
    startOrchestrator: (role?: string) => Promise<QuickAgent>;
  };
  /** Opening a clicked file path on the agents' machine; resolves with what the server did */
  files?: {
    openFile: (
      path: string,
      cwd: string,
      options?: OpenFileOptions
    ) => Promise<{ action?: string }>;
  };
  /** Opening a session in the native Ghostty terminal */
  ghostty?: {
    openInGhostty: (request: { cwd: string; command: string; args: string[] }) => Promise<void>;
  };
  /**
   * Several agent instances behind one view (Orkumo #220). `''` is the local one. Each session id
   * keeps the instance it was first seen on. Without this group everything is local
   * (`LOCAL_TARGETS`).
   */
  targets?: AgentTargets;
}

export interface AgentTargets {
  /** Hook: the instance picked in the view; re-renders on a switch */
  useAgentTarget: () => string;
  /** The picked instance, outside React */
  getAgentTarget: () => string;
  /** Instance session `id` runs on */
  targetOf: (id: string) => string;
  /** Binds session `id` to `target` (panes started here, stand-ins of server rows) */
  pinTarget: (id: string, target: string) => void;
}

/** A transport without `targets`: one local instance */
export const LOCAL_TARGETS: AgentTargets = {
  useAgentTarget: () => '',
  getAgentTarget: () => '',
  targetOf: () => '',
  pinTarget: () => {},
};
