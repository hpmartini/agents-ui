// ============================================
// Claude Code Agent View (browser counterpart of `claude agents`)
// ============================================

/** Raw supervisor state as reported by `claude agents --json` */
export type AgentSessionState = 'working' | 'blocked' | 'done' | 'failed' | 'stopped';

/** Process status while the worker is alive */
export type AgentProcessStatus = 'busy' | 'waiting' | 'idle';

/** Display state used for icons and grouping in the agent view */
export type AgentDisplayState =
  | 'working'
  /** CLI says working, but the turn only waits on its own background task (shell, monitor) */
  | 'waiting'
  | 'needs-input'
  | 'idle'
  | 'completed'
  | 'failed'
  | 'stopped'
  | 'loop'
  | 'interactive';

export interface AgentPrLink {
  id: string;
  href: string;
  title: string | null;
  number: number | null;
  provider: 'github' | 'gitlab';
  state: string | null;
}

export interface AgentPullRequest {
  number: number;
  title: string;
  url: string;
  author: string | null;
  isDraft: boolean;
  headRef: string;
  baseRef: string;
  updatedAt: string;
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN';
  ci: 'success' | 'failure' | 'pending' | 'none';
  ciPassed: number;
  ciFailed: number;
  ciPending: number;
  mergeReady: boolean;
  repoSlug: string;
}

/** Real listening TCP port whose process cwd is inside the session's directory */
export interface AgentListeningServer {
  port: number;
  pid: number;
  command: string;
  url: string;
}

/** Listening server in a worktree or job dir no running session owns (GET /api/agents/servers/orphans, #243) */
export interface AgentOrphanServer extends AgentListeningServer {
  cwd: string;
}

/** Live resource use of a listening server process (GET /api/agents/servers/stats) */
export interface AgentServerStats {
  pid: number;
  /** CPU percent of one core, as reported by ps */
  cpu: number;
  memMb: number;
}

export interface AgentCacheInfo {
  /** Epoch ms of the latest assistant turn: the cache TTL counts from here */
  lastActivityAt: number;
  ttlMs: number;
  /** Prompt tokens of the latest turn (cached + written + uncached) */
  cachedTokens: number;
  contextWindow: number;
  /** Turns that read from the cache, out of all turns */
  hits: number;
  turns: number;
  /** Cache-read share of all input tokens, 0..1 */
  hitRatio: number;
}

export interface AgentContext {
  /** slug = "owner/repo" from the origin remote (github) */
  repo: {
    name: string;
    /** Main checkout path; the same for every subfolder and worktree of the repo */
    root: string;
    slug: string | null;
    branch: string | null;
    dirty: boolean;
    /** Untracked and other changed paths from git status (chat status line) */
    untracked?: number;
    changed?: number;
    ahead: number;
    behind: number;
    /** true when the session runs in a linked git worktree (not the main checkout) */
    isWorktree: boolean;
    /** Folder name of the linked worktree; null for the main checkout */
    worktreeName: string | null;
    /** Absolute path of the linked worktree; null for the main checkout */
    worktreePath: string | null;
  } | null;
  /**
   * Detected or custom project the session runs in (repo root, else worktree / cwd), before
   * merges and disabling, which the client applies; null when no project contains it
   */
  projectId?: string | null;
  /** Model of the session's latest assistant turn (e.g. "claude-opus-5-5"); null when unknown */
  model: string | null;
  /** Prompt-cache stats from the session transcript; null when there is no local transcript */
  cache?: AgentCacheInfo | null;
  /** null when gh is unavailable/unauthenticated or not a github repo */
  issues: { open: number; url: string | null } | null;
  pulls: { open: number; url: string | null; items: AgentPullRequest[] } | null;
  servers: AgentListeningServer[];
  subagents: { running: number; total: number; names: string[] };
}

export interface AgentSession {
  /** Short id (`claude attach <id>`), or `interactive-<pid>` for foreground sessions */
  id: string;
  /** Full session UUID (usable with `claude --resume`); for a background job the transcript it writes now */
  sessionId: string | null;
  /** Background job: every transcript id it wrote (respawns write a new one, #236) */
  sessionIds?: string[];
  /** Rail: other sessions on the same transcript, shown as copies of this one (#236) */
  copies?: AgentSession[];
  /** `app`: started in the Claude app (iOS, Android, web), runs here via Remote Control */
  kind: 'background' | 'interactive' | 'app';
  /** Claude app session: its claude.ai page, origin ("ios", "android", "web") and last turn status */
  app?: { url: string; origin: string | null; statusCategory: string | null };
  /** Client-side cloud/remote session or a harness session (#195): PTY args instead of `attach <id>` */
  ptyArgs?: string[];
  /** Harness session listed by the server: id of the Orkumo pane whose process runs it */
  paneId?: string | null;
  /** PTY command for ptyArgs (default `claude`; another harness, #195) */
  ptyCommand?: AgentHarness;
  /** Harness of a server-listed session (default `claude`) */
  harness?: AgentHarness;
  cwd: string;
  startedAt: number;
  updatedAt?: number | null;
  name: string;
  nameSource?: string | null;
  state: AgentSessionState | null;
  status?: AgentProcessStatus | null;
  waitingFor?: string | null;
  pid?: number | null;
  /** One-line activity summary maintained by the CLI */
  detail?: string | null;
  tempo?: string | null;
  /** First prompt / task description */
  intent?: string | null;
  template?: string | null;
  agent?: string | null;
  result?: string | null;
  suggestedReply?: string | null;
  tokens?: number | null;
  loop?: { routine: string } | null;
  worktree?: string | null;
  transcriptPath?: string | null;
  cliVersion?: string | null;
  respawnFlags?: string[];
  pinned: boolean;
  order: number | null;
  links: AgentPrLink[];
  displayState: AgentDisplayState;
}

export interface AgentDaemonStatus {
  running: boolean;
  pid: number | null;
  version: string | null;
  workers: number | null;
  versionMismatch: boolean;
  raw: string;
}

export interface ClaudeUserSettings {
  model: string | null;
  effortLevel: string | null;
  permissionMode: string | null;
  disableAgentView: boolean;
  leftArrowOpensAgents: boolean;
  prefersReducedMotion: boolean;
  bgIsolation: string;
}

export interface AgentsResponse {
  sessions: AgentSession[];
  daemon: AgentDaemonStatus | null;
  userSettings: ClaudeUserSettings | null;
  cli: { installed: boolean; path: string | null };
  capabilities?: AgentCapabilities;
}

export interface AgentCapabilities {
  /** Unsafe dispatch flags need DEVORBIT_AGENTS_ALLOW_UNSAFE_FLAGS=true on the server */
  unsafeFlagsAllowed: boolean;
  /** Configured project directories - the only valid session working directories */
  allowedDirs: string[];
}

export type AgentGrouping = 'state' | 'directory' | 'project' | 'none';
export type AgentLayout = 'tabs' | 'columns' | 'rows' | 'grid';
/** When a session card shows its details (issues, PRs, servers, sub-agents) */
/** CLI an agent runs with (#195); everything from `claude agents` / chats is `claude` */
export type AgentHarness = 'claude' | 'omp' | 'opencode' | 'codex' | 'pi';

export type AgentCardDensity = 'comfortable' | 'compact';
/** Detail elements of an agent card (#159); each sits in one AgentCardSlot */
export type AgentCardElement =
  | 'issue'
  | 'pr'
  | 'project'
  | 'branch'
  | 'git'
  | 'metrics'
  | 'status'
  | 'links'
  | 'servers'
  | 'subagents'
  | 'harness';
/** left = column under the status glyph, title = after the name, row2-4 = lines below it */
export type AgentCardSlot = 'left' | 'title' | 'row2' | 'row3' | 'row4' | 'details' | 'hidden';
export type AgentCardFields = Record<AgentCardElement, AgentCardSlot>;

export interface AgentDispatchDefaults {
  /** Harness preselected when creating an agent (#195) */
  harness: AgentHarness;
  model: string | null;
  effort: string | null;
  permissionMode: string | null;
  agent: string | null;
  fallbackModel: string | null;
  skipPermissions: boolean;
  allowSkipPermissions: boolean;
  restricted: boolean;
  settings: string | null;
  addDirs: string[];
  pluginDirs: string[];
  mcpConfigs: string[];
  strictMcpConfig: boolean;
}

export interface AgentViewSettings {
  grouping: AgentGrouping;
  layout: AgentLayout;
  scopeCwd: string | null;
  /** Start directory of new tasks (`~` = home); null: the selected rail item or the last pick */
  taskCwd: string | null;
  collapsedGroups: string[];
  notifications: boolean;
  desktopNotifications: boolean;
  cardDensity: AgentCardDensity;
  cardFields: AgentCardFields;
  disabled: boolean;
  /** Chat pane (#189): which key sends the message */
  chatSubmitKey: 'enter' | 'mod+enter';
  /** Chat pane: thinking and tool calls inline in the transcript (else only in the work panel) */
  chatShowSteps: boolean;
  /** View an opened agent pane starts in; both views show the same process */
  agentOpenView: 'chat' | 'terminal';
  /** Main agent (#252): name of the session behind the "Main Agent" dialog; keepAlive respawns it when stopped */
  mainAgent: { name: string; keepAlive: boolean };
  /** Orchestrator sessions (row id, transcript uuid or pane id): own rail group and badge */
  orchestrators: string[];
  /** Orchestrator session key -> role id (`<workspace>/roles/<id>.md`) */
  orchestratorRoles: Record<string, string>;
  dispatch: AgentDispatchDefaults;
  version: number;
}

export interface AgentDispatchRequest extends Partial<AgentDispatchDefaults> {
  prompt?: string;
  exec?: string;
  resume?: string;
  name?: string | null;
  cwd: string;
  /** Start without a prompt ("New agent"); the session waits for input */
  idle?: boolean;
}

export interface AgentDispatchResult {
  id: string;
  name: string | null;
  alreadyRunning: boolean;
  output: string;
}

export interface AgentLogEntry {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string | null;
}

export interface AgentLogs {
  source: 'logs' | 'transcript';
  text: string;
  entries: AgentLogEntry[];
  note?: string | null;
}

export interface AgentSubagent {
  name: string;
  description: string;
  model: string | null;
  source: 'project' | 'user';
}

export interface AgentRepo {
  name: string;
  path: string;
  source: 'repo' | 'worktree' | 'session' | 'configured';
}

export interface AgentSlashCommand {
  name: string;
  description: string;
  source: 'builtin' | 'project' | 'user';
}

export interface AgentPastSession {
  sessionId: string;
  id: string | null;
  name: string;
  firstPrompt: string | null;
  cwd: string | null;
  projectSlug: string;
  lastActivity: number;
  size: number;
  state: AgentSessionState | null;
}

export interface AgentRemoveResult {
  removed: boolean;
  message: string;
  hints?: { discardUnpushed: string | null; forceRemoveWorktree: string | null };
}

export interface AgentNotification {
  type: 'agent_needs_input' | 'agent_completed' | 'agent_failed';
  session: AgentSession;
}

export const DEFAULT_AGENT_DISPATCH_DEFAULTS: AgentDispatchDefaults = {
  harness: 'omp',
  model: null,
  effort: null,
  permissionMode: null,
  agent: null,
  fallbackModel: null,
  skipPermissions: false,
  allowSkipPermissions: false,
  restricted: false,
  settings: null,
  addDirs: [],
  pluginDirs: [],
  mcpConfigs: [],
  strictMcpConfig: false,
};

export const DEFAULT_AGENT_CARD_FIELDS: AgentCardFields = {
  issue: 'left',
  pr: 'left',
  project: 'row2',
  branch: 'row2',
  git: 'row2',
  metrics: 'row3',
  status: 'row4',
  links: 'details',
  servers: 'details',
  subagents: 'details',
  harness: 'title',
};

export const DEFAULT_AGENT_VIEW_SETTINGS: AgentViewSettings = {
  grouping: 'project',
  layout: 'tabs',
  scopeCwd: null,
  taskCwd: null,
  collapsedGroups: [],
  notifications: true,
  desktopNotifications: false,
  cardDensity: 'comfortable',
  cardFields: DEFAULT_AGENT_CARD_FIELDS,
  disabled: false,
  chatSubmitKey: 'mod+enter',
  chatShowSteps: false,
  agentOpenView: 'chat',
  mainAgent: { name: 'main-orchestrator', keepAlive: true },
  orchestrators: [],
  orchestratorRoles: {},
  dispatch: DEFAULT_AGENT_DISPATCH_DEFAULTS,
  version: 1,
};
