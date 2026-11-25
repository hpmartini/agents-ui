/** Texts of the shell components; `en` is Orkumo's wording verbatim, `de` the German one */
import type { AgentCardElement, AgentCardSlot, AgentDisplayState, AgentGrouping } from '../types';
import type { AgentQuickFilter, AgentSortKey } from '../utils/agentSessions';
import type {
  CiKey,
  GroupKey as PullGroupKey,
  MergeKey,
  ReviewKey,
  SortKey as PullSortKey,
  YesNo,
} from '../utils/pullRequestQuery';

export interface ShellLabels {
  // AgentSummaryBar
  filterToggleTitle: (active: boolean, label: string) => string;
  supervisor: (running: boolean) => string;
  supervisorMismatch: string;
  awaitingInputFilterTitle: string;
  awaitingInput: string;
  workingCount: string;
  completedCount: string;
  cacheExpiringCount: string;
  failedCount: string;
  openPrsTitle: string;
  openPrsCount: (count: number | null) => string;
  serversTitle: string;
  serversRunning: (count: number | null) => string;
  justDone: (count: number) => string;
  searchPanel: string;
  searchAgents: string;
  linksHeading: string;
  linksList: string;
  noLinks: string;
  noMatch: string;
  sortAgentsBy: (label: string) => string;
  sortAgents: string;
  sortDirection: (ascending: boolean) => string;
  fixedDirection: string;
  reverseSort: string;
  hideFilters: string;
  showFilters: string;
  searchTitle: (shortcut: string) => string;
  shownOf: (shown: number, total: number) => string;
  agentCount: (count: number) => string;
  clearFilters: string;
  filterAgents: string;
  sortOptions: Record<AgentSortKey, string>;
  quickFilters: Record<AgentQuickFilter, { label: string; title: string }>;
  // agentSessions utils
  ageUnits: { s: string; m: string; h: string; d: string };
  displayStates: Record<AgentDisplayState | 'unknown', string>;
  documentTitle: (awaitingInput: number) => string;
  /** Titles of the built-in rail groups by group key; other groups keep their own title */
  groupTitles: Record<string, string>;
  cardElements: Record<AgentCardElement, string>;
  cardSlots: Record<AgentCardSlot, string>;
  // pullRequestQuery, PullRequestsPanel, PullRequestsPage
  pulls: {
    ci: Record<CiKey, string>;
    merge: Record<MergeKey, string>;
    review: Record<ReviewKey, string>;
    group: Record<PullGroupKey, string>;
    sort: Record<PullSortKey, string>;
    yesNo: Record<YesNo, string>;
    all: string;
    noAuthor: string;
    noAgent: string;
  };
  openNextToList: string;
  openInBrowser: string;
  /** `ref` is "#12" or similar */
  openPrInBrowser: (ref: string) => string;
  draft: string;
  ciCounts: (passed: number, failed: number, pending: number) => string;
  byAuthor: (author: string) => string;
  updatedAgo: (age: string) => string;
  branchTo: (head: string, base: string) => string;
  selectAgent: string;
  openCodeTitle: string;
  code: string;
  loadingPulls: string;
  noPullsMatch: string;
  noOpenPulls: (repo: string | null) => string;
  pullsUnavailable: string;
  openPullRequests: string;
  showAllRepos: string;
  maximizePulls: string;
  openFullView: string;
  close: string;
  filterAny: (label: string) => string;
  resetFilters: string;
  pullsToolbar: string;
  /** The "any" pill of a filter shown as pills */
  anyOption: string;
  repoTree: string;
  allRepositories: string;
  repoTreeLoading: string;
  repoTreeEmpty: string;
  expandNode: (label: string) => string;
  collapseNode: (label: string) => string;
  searchPulls: string;
  searchPullsPlaceholder: string;
  pullFilters: Record<
    'repo' | 'ci' | 'merge' | 'review' | 'draft' | 'author' | 'base' | 'agent',
    string
  >;
  groupBy: string;
  groupOption: (label: string) => string;
  sortBy: string;
  sortOption: (label: string) => string;
  sortAscending: string;
  sortDescending: string;
  ascending: string;
  descending: string;
  // SessionLinks
  openNamed: (name: string) => string;
  showPullRequests: (count: number) => string;
  showPullRequest: (label: string) => string;
  /** Screen-reader prefix before the PR number, with its trailing space */
  pullRequestSr: string;
  openPullRequestsLink: (count: number) => string;
  serverTitle: (name: string, port: number, pid?: number | null) => string;
  clickToOpen: string;
  subagentsRunning: (count: number) => string;
  // PullRequestModal
  /** `ref` is "#12" or "" */
  pullRequestTitle: (ref: string) => string;
  pullRequestsTitle: (count: number) => string;
  allOpenPrs: string;
  closeEsc: string;
  pullRequestNoun: string;
  // ConfirmDialog
  cancel: string;
  // MainAgentDialog
  mainAgent: string;
  keepAliveTitle: string;
  keepAlive: string;
  /** Text before and after the session name */
  noMainSession: [string, string];
  /** Text before and after the start command */
  startMainSession: [string, string];
  // NewTaskButton, TaskComposerModal
  newMenu: Record<'task' | 'agent' | 'chat' | 'issue' | 'orchestrator', string>;
  newMenuHints: Record<'task' | 'agent' | 'chat' | 'issue' | 'orchestrator', string>;
  roleGeneral: string;
  role: string;
  create: string;
  newTaskTitle: (shortcut: string) => string;
  newMoreLabel: string;
  newMoreTitle: string;
  whatToCreate: string;
  newKinds: Record<'task' | 'agent' | 'chat' | 'issue', string>;
  imagesNote: string;
  // ProjectsRail
  groupModes: Record<AgentGrouping, string>;
  groupAgentsByCurrent: (label: string) => string;
  groupAgentsByTitle: string;
  groupAgentsBy: string;
  expandAllGroups: string;
  collapseAllGroups: string;
  collapseAllCards: string;
  expandAllCards: string;
  foldGroupsDisabled: string;
  projects: string;
  viewCodeOf: (name: string) => string;
  // useAgentSessions
  loadAgentsFailed: string;
  saveSettingsFailed: string;
  notifyNeedsInput: (name: string) => string;
  notifyFinished: (name: string) => string;
  notifyFailed: (name: string) => string;
  notificationTitle: string;
  // agentDelete
  confirmDeleteSession: (name: string) => string;
  // AgentList
  favoriteToggle: (isFavorite: boolean) => string;
  moveUp: string;
  moveDown: string;
  agentSessions: string;
  noFilterMatch: string;
  /** Text before and after the palette shortcut */
  noSessions: [string, string];
  toggleGroup: (collapsed: boolean, title: string) => string;
  groupAttached: (count: number, oneActive: boolean) => string;
  attachedCount: (count: number) => string;
  groupCacheWarning: string;
  openIssuesInRepo: (count: number) => string;
  favorite: string;
  projectActions: string;
  actionsFor: (title: string) => string;
  moreCount: (count: number) => string;
  waitingShort: (what: string) => string;
  appSessionTitle: (origin: string) => string;
  appSessionLabel: (origin: string) => string;
  runsWith: (harness: string) => string;
  harnessLabel: (harness: string) => string;
  issueNumber: (number: number) => string;
  branchNamed: (branch: string) => string;
  worktree: string;
  uncommittedChanges: string;
  aheadOfUpstream: (count: number) => string;
  behindUpstream: (count: number) => string;
  uncommittedChangesLabel: string;
  /** Appended to the row tooltip, with its leading separator */
  waitingForSuffix: (what: string) => string;
  toggleDetailsOf: (expanded: boolean, name: string) => string;
  hideDetails: string;
  showDetails: string;
  orchestratorBadgeTitle: string;
  orchestrator: string;
  copiesTitle: string;
  copiesCount: (count: number) => string;
  attachedActive: string;
  attachedInTab: string;
  activeSr: string;
  attachedSr: string;
  loop: string;
  age: string;
  peekTitle: string;
  peek: string;
  favoriteSessionToggle: (isFavorite: boolean, name: string) => string;
  // AgentsView: hints and toasts
  quickAgentMissing: string;
  orchestratorNotListed: string;
  startingOrchestrator: (role: string | undefined) => string;
  orchestratorFailed: (message: string) => string;
  noLocalCheckout: (repo: string) => string;
  agentNotFound: (id: string) => string;
  clearFiltersToCollapse: string;
  /** Tab name of a cloud session opened without a target */
  cloudSessions: string;
  takeoverFailed: (message: string) => string;
  interactiveOwnTerminal: string;
  pickDirectory: string;
  startedCopy: (id: string) => string;
  startedNamed: (name: string) => string;
  dispatchFailed: string;
  folderNotTrusted: string;
  giveSessionId: string;
  dispatchModel: (model: string | null) => string;
  dispatchEffort: (effort: string | null) => string;
  commandInsideSession: (command: string) => string;
  uploadFailed: string;
  harnessNotInstalled: (harness: string) => string;
  pickProjectDirectory: string;
  harnessGiveSessionId: (harness: string) => string;
  continueClaudeOnly: string;
  harnessNoUiView: (harness: string) => string;
  openCodeNoPrompt: string;
  homeInteractiveOnly: string;
  describeTask: string;
  noSessionOnPr: string;
  tooShort: string;
  renamePrompt: string;
  renameFailed: string;
  unpinned: string;
  pinnedHint: string;
  pinFailed: string;
  discardUnpushedConfirm: (message: string) => string;
  forceRemoveWorktreeConfirm: (message: string) => string;
  deleted: (name: string) => string;
  deleteFailed: string;
  deleteAllInGroup: (count: number, group: string) => string;
  reorderFailed: string;
  jsonCopied: string;
  copyFailed: string;
  ctrlCAgain: string;
  markedOutside: (dir: string) => string;
  markedBriefed: string;
  markedBriefingFailed: (message: string) => string;
  roleAssigned: (role: string) => string;
  roleAssignedOutside: (role: string) => string;
  roleBriefingFailed: (message: string) => string;
  // AgentsView: row and group menus
  attachInTab: string;
  openOnClaudeAi: string;
  peekReply: string;
  openInCode: string;
  openTerminalHere: string;
  showOnBoard: string;
  showMode: (mode: string) => string;
  unpin: string;
  pin: string;
  rename: string;
  stop: string;
  respawn: string;
  unmarkOrchestrator: string;
  markOrchestrator: string;
  roleNamed: (role: string) => string;
  copySessionId: string;
  copied: string;
  delete: string;
  expand: string;
  collapse: string;
  openProject: string;
  projectSettings: string;
  removeFixedProject: string;
  keepFixedProject: string;
  viewCode: string;
  viewBoard: string;
  viewMode: (mode: string) => string;
  newIssue: string;
  newIssueNoRepo: string;
  dispatchHere: string;
  newAgentHere: string;
  deleteAllInGroupAction: string;
  // AgentsView: palette commands
  newAgentTask: string;
  paletteGroups: Record<'agents' | 'rail' | 'selected' | 'workspace' | 'panels', string>;
  addFixedProject: string;
  groupByCommand: (mode: AgentGrouping) => string;
  sortByCommand: (label: string) => string;
  filterCommand: (on: boolean, label: string) => string;
  splitLayout: (layout: 'columns' | 'rows' | 'grid') => string;
  closeTab: string;
  showPullRequestsCommand: string;
  openPullsFullCommand: string;
  showServersCommand: string;
  settingsCommand: string;
  shortcutsCommand: string;
  refreshCommand: string;
  hideInteractive: string;
  showInteractive: string;
  copyJsonCommand: string;
  leaveView: string;
  // AgentsView: header and rail
  modelDefault: string;
  modelDefaultNamed: (model: string) => string;
  modelOfOpenAgent: string;
  dispatchModelTitle: string;
  viewTurnedOff: string;
  turnOnAgain: string;
  cliNotFound: string;
  /** Text before and after the `claude` command */
  cliInstall: [string, string];
  checkAgain: string;
  activityBar: string;
  settings: string;
  contextDashboardTitle: string;
  /** Header switch for the agent list, shown when the host has no activity bar */
  agentListToggle: string;
  showAgentList: string;
  hideAgentList: string;
  contextDashboardLabel: string;
  focusSwitchTitle: string;
  focusZones: Record<'terminal' | 'rail' | 'page', string>;
  switches: string;
  modelPrefix: string;
  effortTitle: string;
  effortPrefix: string;
  bypassPermissions: string;
  scopeTitle: string;
  reconnecting: string;
  copyJsonTitle: string;
  refresh: string;
  settingsTitle: string;
  shortcutsTitle: string;
  loadingSessions: string;
  filterActive: (shown: number, total: number) => string;
  clearFilter: string;
  interactiveSessions: string;
  interactiveCount: (count: number, shown: boolean) => string;
  interactiveNotRunning: string;
  dispatching: string;
  stopAgentTitle: string;
  stopAgentBody: (name: string) => string;
  fixedProjectPicker: string;
  homeChoice: string;
  chatsChoice: string;
  // AgentsView: ListError, PromptEditor
  listNoAccess: string;
  listUnavailable: string;
  listFailed: string;
  tryAgain: string;
  editPromptTitle: string;
  editPromptKeys: string;
  usePrompt: string;
}

export const shellEn: ShellLabels = {
  // AgentSummaryBar
  filterToggleTitle: (active, label) => `${active ? 'Remove filter' : 'Filter'}: ${label}`,
  supervisor: (running) => `Supervisor ${running ? 'running' : 'idle'}`,
  supervisorMismatch: 'Supervisor version mismatch',
  awaitingInputFilterTitle: 'Filter: agents waiting for your input',
  awaitingInput: 'awaiting input',
  workingCount: 'working',
  completedCount: 'completed',
  cacheExpiringCount: 'cache expiring',
  failedCount: 'failed',
  openPrsTitle: 'List open pull requests across all agents',
  openPrsCount: (n) => `${n ?? '-'} open ${n === 1 ? 'PR' : 'PRs'}`,
  serversTitle: 'List servers listening in agent directories',
  serversRunning: (n) => `${n ?? '-'} ${n === 1 ? 'server' : 'servers'} running`,
  justDone: (n) => `+${n} done`,
  searchPanel: 'Search agents, PRs and issues',
  searchAgents: 'Search agents',
  linksHeading: 'Pull requests and issues',
  linksList: 'PRs and issues',
  noLinks: 'No open PRs or issues here',
  noMatch: 'No match',
  sortAgentsBy: (label) => `Sort agents: ${label}`,
  sortAgents: 'Sort agents',
  sortDirection: (asc) => `Direction: ${asc ? 'ascending' : 'descending'} (click to reverse)`,
  fixedDirection: 'This sort has a fixed direction',
  reverseSort: 'Reverse sort direction',
  hideFilters: 'Hide filters',
  showFilters: 'Show filters',
  searchTitle: (shortcut) => `Search agents, PRs and issues (${shortcut})`,
  shownOf: (shown, total) => `${shown} of ${total}`,
  agentCount: (n) => `${n} ${n === 1 ? 'agent' : 'agents'}`,
  clearFilters: 'Clear all filters',
  filterAgents: 'Filter agents',
  sortOptions: {
    attention: 'Attention',
    updated: 'Recently updated',
    newest: 'Newest',
    oldest: 'Oldest',
    name: 'Name',
    repo: 'Repository',
    prs: 'Open PRs',
    servers: 'Running servers',
    manual: 'Manual',
  },
  quickFilters: {
    'needs-input': { label: 'Needs input', title: 'Agents waiting for your input' },
    working: { label: 'Working', title: 'Agents currently working' },
    completed: { label: 'Completed', title: 'Agents that finished without failing' },
    failed: { label: 'Failed', title: 'Agents that failed' },
    pr: { label: 'Open PR', title: 'Agents with an open pull request' },
    server: { label: 'Server', title: 'Agents with a running dev server in their directory' },
    subagents: { label: 'Sub-agents', title: 'Agents with running sub-agents' },
    local: { label: 'Local', title: 'Agents you started yourself' },
    workflow: { label: 'Workflow', title: 'Agents a workflow tool started for a GitHub issue' },
    'cache-expiring': {
      label: 'Cache expiring',
      title: 'Agents whose prompt cache expires within 10 minutes',
    },
  },
  // agentSessions utils
  ageUnits: { s: 's', m: 'm', h: 'h', d: 'd' },
  displayStates: {
    working: 'Working',
    'needs-input': 'Needs input',
    waiting: 'Waiting on background task',
    idle: 'Idle',
    completed: 'Completed',
    failed: 'Failed',
    stopped: 'Stopped',
    loop: 'Loop (sleeping)',
    interactive: 'Interactive',
    unknown: 'Unknown',
  },
  documentTitle: (n) => (n > 0 ? `${n} awaiting input · claude agents` : 'claude agents'),
  groupTitles: {
    pinned: 'Pinned',
    review: 'Ready for review',
    'needs-input': 'Needs input',
    working: 'Working',
    completed: 'Completed',
    app: 'Claude App',
    interactive: 'Interactive',
    all: 'All',
    orchestrators: 'Orchestrators',
    'project:none': 'No project',
    favorites: 'Favorites',
  },
  cardElements: {
    issue: 'Workflow issue (#nr)',
    pr: 'Pull request',
    project: 'Project name',
    branch: 'Branch / worktree',
    git: 'Git status (dirty, ahead, behind)',
    metrics: 'Context and cache',
    status: 'Status text (working on, waiting for)',
    links: 'Linked issues',
    servers: 'Dev servers',
    subagents: 'Running sub-agents',
    harness: 'Harness (Claude Code, Codex, …)',
  },
  cardSlots: {
    left: 'Left, under the status icon',
    title: 'After the name',
    row2: 'Row 2',
    row3: 'Row 3 (joins row 2 when compact)',
    row4: 'Row 4',
    details: 'Details (expanded card)',
    hidden: 'Hidden',
  },
  // pullRequestQuery, PullRequestsPanel, PullRequestsPage
  pulls: {
    ci: { success: 'Passing', failure: 'Failing', pending: 'Running', none: 'No checks' },
    merge: {
      ready: 'Ready to merge',
      blocked: 'Blocked',
      checking: 'Checking',
      conflicts: 'Conflicts',
    },
    review: {
      approved: 'Approved',
      changes: 'Changes requested',
      required: 'Review required',
      none: 'No review',
    },
    group: {
      none: 'No grouping',
      repo: 'Repository',
      merge: 'Merge state',
      ci: 'CI',
      review: 'Review',
      author: 'Author',
      agent: 'Agent',
    },
    sort: {
      updated: 'Last updated',
      ready: 'Ready to merge first',
      number: 'Number',
      title: 'Title',
      repo: 'Repository',
    },
    yesNo: { yes: 'Yes', no: 'No' },
    all: 'All',
    noAuthor: 'No author',
    noAgent: 'No agent',
  },
  openNextToList: 'Open next to the list',
  openInBrowser: 'Open in browser',
  openPrInBrowser: (ref) => `Open ${ref} in browser`,
  draft: 'Draft',
  ciCounts: (p, f, pe) => `${p} passed, ${f} failed, ${pe} pending`,
  byAuthor: (author) => `by ${author}`,
  updatedAgo: (age) => `updated ${age} ago`,
  branchTo: (head, base) => `${head} to ${base}`,
  selectAgent: 'Select this agent',
  openCodeTitle: 'Open the branch in Code mode (agent worktree, else the repo)',
  code: 'Code',
  loadingPulls: 'Loading pull requests…',
  noPullsMatch: 'No pull requests match the filters.',
  noOpenPulls: (repo) => `No open pull requests${repo ? ` in ${repo}` : ''}.`,
  pullsUnavailable: 'Pull requests unavailable (gh missing, not signed in or no access):',
  openPullRequests: 'Open pull requests',
  showAllRepos: 'Show all repositories',
  maximizePulls: 'Maximize pull requests',
  openFullView: 'Open as full view',
  close: 'Close',
  filterAny: (label) => `${label}: any`,
  resetFilters: 'Reset filters',
  pullsToolbar: 'Filter, group and sort pull requests',
  anyOption: 'Any',
  repoTree: 'Repositories',
  allRepositories: 'All repositories',
  repoTreeLoading: 'Loading…',
  repoTreeEmpty: 'No repositories with open pull requests',
  expandNode: (label) => `Expand ${label}`,
  collapseNode: (label) => `Collapse ${label}`,
  searchPulls: 'Search pull requests',
  searchPullsPlaceholder: 'Title, #number, branch, author',
  pullFilters: {
    repo: 'Repo',
    ci: 'CI',
    merge: 'Merge',
    review: 'Review',
    draft: 'Draft',
    author: 'Author',
    base: 'Base',
    agent: 'Has agent',
  },
  groupBy: 'Group by',
  groupOption: (label) => `Group: ${label}`,
  sortBy: 'Sort by',
  sortOption: (label) => `Sort: ${label}`,
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  ascending: 'Ascending',
  descending: 'Descending',
  // SessionLinks
  openNamed: (name) => `Open ${name}`,
  showPullRequests: (n) => `Show these ${n} pull requests`,
  showPullRequest: (label) => `Show pull request ${label}`,
  pullRequestSr: 'Pull request ',
  openPullRequestsLink: (n) => `Open pull request${n > 1 ? 's' : ''}`,
  serverTitle: (name, port, pid) => `${name}: port ${port}${pid ? `, pid ${pid}` : ''}`,
  clickToOpen: 'Click to open',
  subagentsRunning: (n) => `${n} sub-agent${n === 1 ? '' : 's'} running`,
  // PullRequestModal
  pullRequestTitle: (ref) => `Pull request ${ref}`.trim(),
  pullRequestsTitle: (n) => `${n} pull requests`,
  allOpenPrs: 'All open PRs',
  closeEsc: 'Close (Esc)',
  pullRequestNoun: 'pull request',
  // ConfirmDialog
  cancel: 'Cancel',
  // MainAgentDialog
  mainAgent: 'Main agent',
  keepAliveTitle: 'Restart this session when it is stopped (claude respawn)',
  keepAlive: 'Keep alive',
  noMainSession: ['No background session named ', '.'],
  startMainSession: [
    'Start it with ',
    ' (or a new task with that name); it shows up here once it runs.',
  ],
  // NewTaskButton, TaskComposerModal
  newMenu: {
    task: 'New task',
    agent: 'New agent',
    chat: 'New chat',
    issue: 'New issue',
    orchestrator: 'New orchestrator',
  },
  newMenuHints: {
    task: 'N',
    agent: 'interactive, attached',
    chat: 'agent in the UI view',
    issue: 'GitHub',
    orchestrator: 'coordinates agents',
  },
  roleGeneral: 'general',
  role: 'role',
  create: 'Create',
  newTaskTitle: (shortcut) => `New task (N or ${shortcut})`,
  newMoreLabel: 'More: new agent, chat, issue or orchestrator',
  newMoreTitle: 'New agent, chat, issue or orchestrator',
  whatToCreate: 'What to create',
  newKinds: { task: 'Task', agent: 'Agent', chat: 'Chat', issue: 'Issue' },
  imagesNote: 'Stays local, handed to the agent by path',
  // ProjectsRail
  groupModes: { project: 'Project', state: 'Status', directory: 'Directory', none: 'None' },
  groupAgentsByCurrent: (label) => `Group agents by: ${label} (Ctrl+S)`,
  groupAgentsByTitle: 'Group agents by (Ctrl+S)',
  groupAgentsBy: 'Group agents by',
  expandAllGroups: 'Expand all groups',
  collapseAllGroups: 'Collapse all groups',
  collapseAllCards: 'Collapse all agent cards',
  expandAllCards: 'Expand all agent cards',
  foldGroupsDisabled: 'Clear the filters to fold groups',
  projects: 'Projects',
  viewCodeOf: (name) => `View code of ${name}`,
  // useAgentSessions
  loadAgentsFailed: 'Failed to load agents',
  saveSettingsFailed: 'Failed to save agent view settings',
  notifyNeedsInput: (name) => `${name} needs input`,
  notifyFinished: (name) => `${name} finished`,
  notifyFailed: (name) => `${name} failed`,
  notificationTitle: 'Claude agents',
  // agentDelete
  confirmDeleteSession: (name) =>
    `Delete session "${name}"?\n\nThis removes the session and its worktree.`,
  // AgentList
  favoriteToggle: (fav) => (fav ? 'Remove from favorites' : 'Add to favorites'),
  moveUp: 'Move up',
  moveDown: 'Move down',
  agentSessions: 'Agent sessions',
  noFilterMatch: 'No agents match the current filters.',
  noSessions: ['No sessions yet. Press ', ' and choose New task to start one.'],
  toggleGroup: (collapsed, title) => `${collapsed ? 'Expand' : 'Collapse'} ${title}`,
  groupAttached: (n, active) =>
    `${n} agent${n === 1 ? '' : 's'} attached${active ? ', one shown in the workspace' : ''}`,
  attachedCount: (n) => `${n} attached`,
  groupCacheWarning: 'Prompt cache of an agent here expires within 10 minutes',
  openIssuesInRepo: (n) => `${n} open issue${n === 1 ? '' : 's'} in the repository`,
  favorite: 'Favorite',
  projectActions: 'Project actions',
  actionsFor: (title) => `Actions for ${title}`,
  moreCount: (n) => `… ${n} more`,
  waitingShort: (what) => `waiting: ${what}`,
  appSessionTitle: (origin) =>
    `Started in the Claude app (${origin}), runs on this machine. Opens on claude.ai`,
  appSessionLabel: (origin) => `Claude app session from ${origin}`,
  runsWith: (harness) => `Runs with ${harness}`,
  harnessLabel: (harness) => `Harness: ${harness}`,
  issueNumber: (n) => `Issue #${n}`,
  branchNamed: (branch) => `branch ${branch}`,
  worktree: 'worktree',
  uncommittedChanges: 'uncommitted changes',
  aheadOfUpstream: (n) => `${n} ahead of upstream`,
  behindUpstream: (n) => `${n} behind upstream`,
  uncommittedChangesLabel: 'Uncommitted changes',
  waitingForSuffix: (what) => ` · waiting for ${what}`,
  toggleDetailsOf: (expanded, name) => `${expanded ? 'Hide' : 'Show'} details of ${name}`,
  hideDetails: 'Hide details',
  showDetails: 'Show details',
  orchestratorBadgeTitle:
    "Orchestrator: watches and distributes the other agents' work, does none itself",
  orchestrator: 'Orchestrator',
  copiesTitle: 'Second process on this session (same worktree, can overwrite work):',
  copiesCount: (n) => `+${n} ${n === 1 ? 'copy' : 'copies'}`,
  attachedActive: 'Attached, shown in the workspace',
  attachedInTab: 'Attached in a tab',
  activeSr: 'active',
  attachedSr: 'attached',
  loop: 'loop',
  age: 'Age',
  peekTitle: 'Peek (Space)',
  peek: 'Peek',
  favoriteSessionToggle: (fav, name) =>
    `${fav ? 'Remove' : 'Add'} ${name} ${fav ? 'from' : 'to'} favorites`,
  // AgentsView: hints and toasts
  quickAgentMissing: 'The quick window agent did not show up here',
  orchestratorNotListed: 'The orchestrator runs but is not listed yet: open it from the rail',
  startingOrchestrator: (role) => `Starting ${role ?? 'an orchestrator'}…`,
  orchestratorFailed: (message) => `Orchestrator did not start: ${message}`,
  noLocalCheckout: (repo) => `No local checkout of ${repo}`,
  agentNotFound: (id) => `Agent ${id} not found`,
  clearFiltersToCollapse: 'Clear the filters to collapse groups',
  cloudSessions: 'Cloud-Sessions',
  takeoverFailed: (message) => `Takeover failed: ${message}`,
  interactiveOwnTerminal: 'Interactive sessions run in their own terminal',
  pickDirectory: 'Pick a directory first',
  startedCopy: (id) => `Started a copy: ${id}`,
  startedNamed: (name) => `Started ${name}`,
  dispatchFailed: 'Dispatch failed',
  folderNotTrusted:
    'Folder not trusted yet: accept the trust prompt in the terminal, then start the agent again',
  giveSessionId: 'Give the session id: /resume <id>',
  dispatchModel: (model) => (model ? `Dispatch model: ${model}` : 'Dispatch model: default'),
  dispatchEffort: (effort) => (effort ? `Dispatch effort: ${effort}` : 'Dispatch effort: default'),
  commandInsideSession: (command) => `/${command} works inside an attached session`,
  uploadFailed: 'Upload failed',
  harnessNotInstalled: (harness) => `${harness} is not installed on this machine`,
  pickProjectDirectory: 'Pick a project directory first',
  harnessGiveSessionId: (harness) => `${harness}: give the session id, /resume <id>`,
  continueClaudeOnly: '/continue is Claude Code only: use /resume <id>',
  harnessNoUiView: (harness) => `${harness} has no UI view yet: it opens in the terminal`,
  openCodeNoPrompt: 'OpenCode takes no start prompt: leave it empty and type in the terminal',
  homeInteractiveOnly:
    'In ~ Claude Code only runs interactively: start without prompt and type it in the terminal, or pick a project folder',
  describeTask: 'Describe the task first',
  noSessionOnPr: 'No session is working on that PR',
  tooShort: 'Too short — describe the task',
  renamePrompt: 'Rename session:',
  renameFailed: 'Rename failed',
  unpinned: 'Unpinned',
  pinnedHint: 'Pinned — kept running while idle',
  pinFailed: 'Pin failed',
  discardUnpushedConfirm: (message) =>
    `${message}\n\nDiscard the unpushed commits and delete anyway?`,
  forceRemoveWorktreeConfirm: (message) =>
    `${message}\n\nForce-remove the worktree directory and delete?`,
  deleted: (name) => `Deleted ${name}`,
  deleteFailed: 'Delete failed',
  deleteAllInGroup: (n, group) => `Delete all ${n} sessions in "${group}"?`,
  reorderFailed: 'Reorder failed',
  jsonCopied: 'claude agents --json copied to clipboard',
  copyFailed: 'Copy failed',
  ctrlCAgain: 'Press Ctrl+C again to leave the agents view',
  markedOutside: (dir) =>
    `Marked as orchestrator. It runs outside Orkumo: point it to ${dir}/AGENTS.md yourself`,
  markedBriefed: 'Marked as orchestrator and briefed',
  markedBriefingFailed: (message) =>
    `Marked as orchestrator, but the briefing did not arrive: ${message}`,
  roleAssigned: (role) => `Role ${role} assigned`,
  roleAssignedOutside: (role) =>
    `Role assigned. It runs outside Orkumo: point it to roles/${role}.md yourself`,
  roleBriefingFailed: (message) => `Role assigned, but the briefing did not arrive: ${message}`,
  // AgentsView: row and group menus
  attachInTab: 'Attach in tab',
  openOnClaudeAi: 'Open on claude.ai',
  peekReply: 'Peek / reply',
  openInCode: 'Open in Code',
  openTerminalHere: 'Open terminal here',
  showOnBoard: 'Show on Board',
  showMode: (mode) => `Show ${mode}`,
  unpin: 'Unpin',
  pin: 'Pin (keep running while idle)',
  rename: 'Rename',
  stop: 'Stop',
  respawn: 'Respawn (restart)',
  unmarkOrchestrator: 'Remove orchestrator mark',
  markOrchestrator: 'Mark as orchestrator',
  roleNamed: (role) => `Role: ${role}`,
  copySessionId: 'Copy session id',
  copied: 'Copied',
  delete: 'Delete',
  expand: 'Expand',
  collapse: 'Collapse',
  openProject: 'Open project',
  projectSettings: 'Project settings…',
  removeFixedProject: 'Remove fixed project',
  keepFixedProject: 'Keep as fixed project',
  viewCode: 'View Code',
  viewBoard: 'View Board',
  viewMode: (mode) => `View ${mode}`,
  newIssue: 'New issue',
  newIssueNoRepo: 'New issue (no GitHub repo)',
  dispatchHere: 'Dispatch into this directory',
  newAgentHere: 'New agent here',
  deleteAllInGroupAction: 'Delete all sessions in group',
  // AgentsView: palette commands
  newAgentTask: 'New agent task',
  paletteGroups: {
    agents: 'Agents',
    rail: 'Rail',
    selected: 'Selected agent',
    workspace: 'Workspace',
    panels: 'Panels',
  },
  addFixedProject: 'Add fixed project…',
  groupByCommand: (mode) => `Group agents by ${mode === 'state' ? 'status' : mode}`,
  sortByCommand: (label) => `Sort agents by ${label.toLowerCase()}`,
  filterCommand: (on, label) => `${on ? 'Remove' : 'Add'} filter: ${label}`,
  splitLayout: (layout) => `Split layout: ${layout}`,
  closeTab: 'Close current tab',
  showPullRequestsCommand: 'Show pull requests',
  openPullsFullCommand: 'Open pull requests (full view)',
  showServersCommand: 'Show running servers',
  settingsCommand: 'Dispatch defaults and settings',
  shortcutsCommand: 'Show keyboard shortcuts',
  refreshCommand: 'Refresh agent list',
  hideInteractive: 'Hide interactive sessions',
  showInteractive: 'Show interactive sessions',
  copyJsonCommand: 'Copy claude agents --json',
  leaveView: 'Leave agents view',
  // AgentsView: header and rail
  modelDefault: 'default',
  modelDefaultNamed: (model) => `default: ${model}`,
  modelOfOpenAgent: 'Model of the open agent (from its session)',
  dispatchModelTitle: 'Dispatch model for new agents (/model)',
  viewTurnedOff: 'The agent view is turned off.',
  turnOnAgain: 'Turn on again',
  cliNotFound: 'Claude Code CLI not found',
  cliInstall: [
    'Install it on the machine running the Orkumo server, then run ',
    ' once to sign in.',
  ],
  checkAgain: 'Check again',
  activityBar: 'Activity bar',
  settings: 'Settings',
  contextDashboardTitle: 'Dashboard of this context',
  agentListToggle: 'Agent list',
  showAgentList: 'Show agent list',
  hideAgentList: 'Hide agent list',
  contextDashboardLabel: 'Open context dashboard',
  focusSwitchTitle: 'Switch with F6 or Ctrl+Alt+Left / Right',
  focusZones: { terminal: 'Keys: terminal', rail: 'Keys: agent list', page: 'Keys: page' },
  switches: 'switches',
  modelPrefix: 'model',
  effortTitle: 'Dispatch effort (/effort)',
  effortPrefix: 'effort',
  bypassPermissions: 'bypass permissions',
  scopeTitle: 'Scope (--cwd)',
  reconnecting: 'reconnecting…',
  copyJsonTitle: 'Copy `claude agents --json --all`',
  refresh: 'Refresh',
  settingsTitle: 'Dispatch defaults & settings',
  shortcutsTitle: 'Shortcuts (?)',
  loadingSessions: 'Loading sessions…',
  filterActive: (shown, total) => `filter active — ${shown} of ${total} sessions`,
  clearFilter: 'Clear filter',
  interactiveSessions: 'Interactive sessions',
  interactiveCount: (n, shown) => `${n} ${shown ? 'shown' : 'hidden'}`,
  interactiveNotRunning: 'not running in Orkumo',
  dispatching: 'Dispatching…',
  stopAgentTitle: 'Stop agent?',
  stopAgentBody: (name) => `${name} ends its current work. This cannot be undone.`,
  fixedProjectPicker: 'Project to keep in the rail…',
  homeChoice: '~ (home)',
  chatsChoice: 'Chats (no project)',
  // AgentsView: ListError, PromptEditor
  listNoAccess: 'No access to the agents.',
  listUnavailable: 'The agent service is not available right now.',
  listFailed: 'Could not load the agents.',
  tryAgain: 'Try again',
  editPromptTitle: 'Edit dispatch prompt',
  editPromptKeys: 'Ctrl+Enter to apply · Esc to cancel',
  usePrompt: 'Use prompt',
};

export const shellDe: ShellLabels = {
  // AgentSummaryBar
  filterToggleTitle: (active, label) => `${active ? 'Filter entfernen' : 'Filtern'}: ${label}`,
  supervisor: (running) => `Supervisor ${running ? 'läuft' : 'inaktiv'}`,
  supervisorMismatch: 'Supervisor-Version passt nicht',
  awaitingInputFilterTitle: 'Filter: Agents, die auf deine Eingabe warten',
  awaitingInput: 'warten auf Eingabe',
  workingCount: 'arbeiten',
  completedCount: 'fertig',
  cacheExpiringCount: 'Cache läuft ab',
  failedCount: 'fehlgeschlagen',
  openPrsTitle: 'Offene Pull Requests aller Agents anzeigen',
  openPrsCount: (n) => `${n ?? '-'} offene${n === 1 ? 'r' : ''} ${n === 1 ? 'PR' : 'PRs'}`,
  serversTitle: 'Server anzeigen, die in Agent-Verzeichnissen lauschen',
  serversRunning: (n) => `${n ?? '-'} Server aktiv`,
  justDone: (n) => `+${n} fertig`,
  searchPanel: 'Agents, PRs und Issues durchsuchen',
  searchAgents: 'Agents durchsuchen',
  linksHeading: 'Pull Requests und Issues',
  linksList: 'PRs und Issues',
  noLinks: 'Hier keine offenen PRs oder Issues',
  noMatch: 'Kein Treffer',
  sortAgentsBy: (label) => `Agents sortieren: ${label}`,
  sortAgents: 'Agents sortieren',
  sortDirection: (asc) => `Richtung: ${asc ? 'aufsteigend' : 'absteigend'} (Klick kehrt um)`,
  fixedDirection: 'Diese Sortierung hat eine feste Richtung',
  reverseSort: 'Sortierrichtung umkehren',
  hideFilters: 'Filter ausblenden',
  showFilters: 'Filter einblenden',
  searchTitle: (shortcut) => `Agents, PRs und Issues durchsuchen (${shortcut})`,
  shownOf: (shown, total) => `${shown} von ${total}`,
  agentCount: (n) => `${n} ${n === 1 ? 'Agent' : 'Agents'}`,
  clearFilters: 'Alle Filter zurücksetzen',
  filterAgents: 'Agents filtern',
  sortOptions: {
    attention: 'Aufmerksamkeit',
    updated: 'Zuletzt aktualisiert',
    newest: 'Neueste',
    oldest: 'Älteste',
    name: 'Name',
    repo: 'Repository',
    prs: 'Offene PRs',
    servers: 'Laufende Server',
    manual: 'Manuell',
  },
  quickFilters: {
    'needs-input': { label: 'Braucht Eingabe', title: 'Agents, die auf deine Eingabe warten' },
    working: { label: 'Arbeitet', title: 'Agents, die gerade arbeiten' },
    completed: { label: 'Fertig', title: 'Agents, die ohne Fehler fertig sind' },
    failed: { label: 'Fehlgeschlagen', title: 'Agents, die fehlgeschlagen sind' },
    pr: { label: 'Offener PR', title: 'Agents mit offenem Pull Request' },
    server: { label: 'Server', title: 'Agents mit laufendem Dev-Server in ihrem Verzeichnis' },
    subagents: { label: 'Sub-Agents', title: 'Agents mit laufenden Sub-Agents' },
    local: { label: 'Lokal', title: 'Agents, die du selbst gestartet hast' },
    workflow: {
      label: 'Workflow',
      title: 'Agents, die ein Workflow-Tool für ein GitHub-Issue gestartet hat',
    },
    'cache-expiring': {
      label: 'Cache läuft ab',
      title: 'Agents, deren Prompt-Cache in 10 Minuten abläuft',
    },
  },
  // agentSessions utils
  ageUnits: { s: 's', m: 'min', h: 'h', d: 'T' },
  displayStates: {
    working: 'Arbeitet',
    'needs-input': 'Braucht Eingabe',
    waiting: 'Wartet auf Hintergrundaufgabe',
    idle: 'Untätig',
    completed: 'Fertig',
    failed: 'Fehlgeschlagen',
    stopped: 'Gestoppt',
    loop: 'Schleife (schläft)',
    interactive: 'Interaktiv',
    unknown: 'Unbekannt',
  },
  documentTitle: (n) => (n > 0 ? `${n} warten auf Eingabe · claude agents` : 'claude agents'),
  groupTitles: {
    pinned: 'Angeheftet',
    review: 'Bereit zum Review',
    'needs-input': 'Braucht Eingabe',
    working: 'Arbeitet',
    completed: 'Fertig',
    app: 'Claude App',
    interactive: 'Interaktiv',
    all: 'Alle',
    orchestrators: 'Orchestratoren',
    'project:none': 'Kein Projekt',
    favorites: 'Favoriten',
  },
  cardElements: {
    issue: 'Workflow-Issue (#Nr.)',
    pr: 'Pull Request',
    project: 'Projektname',
    branch: 'Branch / Worktree',
    git: 'Git-Status (geändert, voraus, zurück)',
    metrics: 'Kontext und Cache',
    status: 'Statustext (arbeitet an, wartet auf)',
    links: 'Verknüpfte Issues',
    servers: 'Dev-Server',
    subagents: 'Laufende Sub-Agents',
    harness: 'Harness (Claude Code, Codex, …)',
  },
  cardSlots: {
    left: 'Links, unter dem Status-Icon',
    title: 'Nach dem Namen',
    row2: 'Zeile 2',
    row3: 'Zeile 3 (rückt in kompakter Ansicht in Zeile 2)',
    row4: 'Zeile 4',
    details: 'Details (aufgeklappte Karte)',
    hidden: 'Ausgeblendet',
  },
  // pullRequestQuery, PullRequestsPanel, PullRequestsPage
  pulls: {
    ci: {
      success: 'Erfolgreich',
      failure: 'Fehlgeschlagen',
      pending: 'Läuft',
      none: 'Keine Checks',
    },
    merge: {
      ready: 'Bereit zum Mergen',
      blocked: 'Blockiert',
      checking: 'Wird geprüft',
      conflicts: 'Konflikte',
    },
    review: {
      approved: 'Freigegeben',
      changes: 'Änderungen angefragt',
      required: 'Review nötig',
      none: 'Kein Review',
    },
    group: {
      none: 'Keine Gruppierung',
      repo: 'Repository',
      merge: 'Merge-Status',
      ci: 'CI',
      review: 'Review',
      author: 'Autor',
      agent: 'Agent',
    },
    sort: {
      updated: 'Zuletzt aktualisiert',
      ready: 'Merge-bereite zuerst',
      number: 'Nummer',
      title: 'Titel',
      repo: 'Repository',
    },
    yesNo: { yes: 'Ja', no: 'Nein' },
    all: 'Alle',
    noAuthor: 'Kein Autor',
    noAgent: 'Kein Agent',
  },
  openNextToList: 'Neben der Liste öffnen',
  openInBrowser: 'Im Browser öffnen',
  openPrInBrowser: (ref) => `${ref} im Browser öffnen`,
  draft: 'Entwurf',
  ciCounts: (p, f, pe) => `${p} erfolgreich, ${f} fehlgeschlagen, ${pe} ausstehend`,
  byAuthor: (author) => `von ${author}`,
  updatedAgo: (age) => `vor ${age} aktualisiert`,
  branchTo: (head, base) => `${head} nach ${base}`,
  selectAgent: 'Diesen Agent auswählen',
  openCodeTitle: 'Branch im Code-Modus öffnen (Agent-Worktree, sonst das Repo)',
  code: 'Code',
  loadingPulls: 'Pull Requests werden geladen…',
  noPullsMatch: 'Keine Pull Requests passen zu den Filtern.',
  noOpenPulls: (repo) => `Keine offenen Pull Requests${repo ? ` in ${repo}` : ''}.`,
  pullsUnavailable: 'Pull Requests nicht verfügbar (gh fehlt, nicht angemeldet oder kein Zugriff):',
  openPullRequests: 'Offene Pull Requests',
  showAllRepos: 'Alle Repositories zeigen',
  maximizePulls: 'Pull Requests maximieren',
  openFullView: 'Als Vollansicht öffnen',
  close: 'Schließen',
  filterAny: (label) => `${label}: alle`,
  resetFilters: 'Filter zurücksetzen',
  pullsToolbar: 'Pull Requests filtern, gruppieren und sortieren',
  anyOption: 'Alle',
  repoTree: 'Repositories',
  allRepositories: 'Alle Repositories',
  repoTreeLoading: 'Wird geladen…',
  repoTreeEmpty: 'Keine Repositories mit offenen Pull Requests',
  expandNode: (label) => `${label} aufklappen`,
  collapseNode: (label) => `${label} zuklappen`,
  searchPulls: 'Pull Requests durchsuchen',
  searchPullsPlaceholder: 'Titel, #Nummer, Branch, Autor',
  pullFilters: {
    repo: 'Repo',
    ci: 'CI',
    merge: 'Merge',
    review: 'Review',
    draft: 'Entwurf',
    author: 'Autor',
    base: 'Basis',
    agent: 'Hat Agent',
  },
  groupBy: 'Gruppieren nach',
  groupOption: (label) => `Gruppe: ${label}`,
  sortBy: 'Sortieren nach',
  sortOption: (label) => `Sortierung: ${label}`,
  sortAscending: 'Aufsteigend sortieren',
  sortDescending: 'Absteigend sortieren',
  ascending: 'Aufsteigend',
  descending: 'Absteigend',
  // SessionLinks
  openNamed: (name) => `${name} öffnen`,
  showPullRequests: (n) => `Diese ${n} Pull Requests zeigen`,
  showPullRequest: (label) => `Pull Request ${label} zeigen`,
  pullRequestSr: 'Pull Request ',
  openPullRequestsLink: (n) => `Pull Request${n > 1 ? 's' : ''} öffnen`,
  serverTitle: (name, port, pid) => `${name}: Port ${port}${pid ? `, PID ${pid}` : ''}`,
  clickToOpen: 'Klicken zum Öffnen',
  subagentsRunning: (n) => `${n} Sub-Agent${n === 1 ? '' : 's'} aktiv`,
  // PullRequestModal
  pullRequestTitle: (ref) => `Pull Request ${ref}`.trim(),
  pullRequestsTitle: (n) => `${n} Pull Requests`,
  allOpenPrs: 'Alle offenen PRs',
  closeEsc: 'Schließen (Esc)',
  pullRequestNoun: 'Pull Request',
  // ConfirmDialog
  cancel: 'Abbrechen',
  // MainAgentDialog
  mainAgent: 'Haupt-Agent',
  keepAliveTitle: 'Diese Session neu starten, wenn sie gestoppt ist (claude respawn)',
  keepAlive: 'Am Leben halten',
  noMainSession: ['Keine Hintergrund-Session namens ', '.'],
  startMainSession: [
    'Starte sie mit ',
    ' (oder als neue Aufgabe mit diesem Namen); sie erscheint hier, sobald sie läuft.',
  ],
  // NewTaskButton, TaskComposerModal
  newMenu: {
    task: 'Neue Aufgabe',
    agent: 'Neuer Agent',
    chat: 'Neuer Chat',
    issue: 'Neues Issue',
    orchestrator: 'Neuer Orchestrator',
  },
  newMenuHints: {
    task: 'N',
    agent: 'interaktiv, verbunden',
    chat: 'Agent in der UI-Ansicht',
    issue: 'GitHub',
    orchestrator: 'koordiniert Agents',
  },
  roleGeneral: 'allgemein',
  role: 'Rolle',
  create: 'Erstellen',
  newTaskTitle: (shortcut) => `Neue Aufgabe (N oder ${shortcut})`,
  newMoreLabel: 'Mehr: neuer Agent, Chat, Issue oder Orchestrator',
  newMoreTitle: 'Neuer Agent, Chat, Issue oder Orchestrator',
  whatToCreate: 'Was erstellen',
  newKinds: { task: 'Aufgabe', agent: 'Agent', chat: 'Chat', issue: 'Issue' },
  imagesNote: 'Bleibt lokal, der Agent bekommt den Pfad',
  // ProjectsRail
  groupModes: { project: 'Projekt', state: 'Status', directory: 'Verzeichnis', none: 'Keine' },
  groupAgentsByCurrent: (label) => `Agents gruppieren nach: ${label} (Ctrl+S)`,
  groupAgentsByTitle: 'Agents gruppieren nach (Ctrl+S)',
  groupAgentsBy: 'Agents gruppieren nach',
  expandAllGroups: 'Alle Gruppen aufklappen',
  collapseAllGroups: 'Alle Gruppen zuklappen',
  collapseAllCards: 'Alle Agent-Karten zuklappen',
  expandAllCards: 'Alle Agent-Karten aufklappen',
  foldGroupsDisabled: 'Filter zurücksetzen, um Gruppen zu falten',
  projects: 'Projekte',
  viewCodeOf: (name) => `Code von ${name} ansehen`,
  // useAgentSessions
  loadAgentsFailed: 'Agents konnten nicht geladen werden',
  saveSettingsFailed: 'Einstellungen der Agent-Ansicht konnten nicht gespeichert werden',
  notifyNeedsInput: (name) => `${name} braucht Eingabe`,
  notifyFinished: (name) => `${name} ist fertig`,
  notifyFailed: (name) => `${name} ist fehlgeschlagen`,
  notificationTitle: 'Claude Agents',
  // agentDelete
  confirmDeleteSession: (name) =>
    `Session „${name}“ löschen?\n\nDas entfernt die Session und ihren Worktree.`,
  // AgentList
  favoriteToggle: (fav) => (fav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'),
  moveUp: 'Nach oben',
  moveDown: 'Nach unten',
  agentSessions: 'Agent-Sessions',
  noFilterMatch: 'Keine Agents passen zu den aktuellen Filtern.',
  noSessions: ['Noch keine Sessions. Drück ', ' und wähle „Neue Aufgabe“, um eine zu starten.'],
  toggleGroup: (collapsed, title) => `${title} ${collapsed ? 'aufklappen' : 'zuklappen'}`,
  groupAttached: (n, active) =>
    `${n} Agent${n === 1 ? '' : 's'} verbunden${active ? ', einer im Arbeitsbereich sichtbar' : ''}`,
  attachedCount: (n) => `${n} verbunden`,
  groupCacheWarning: 'Prompt-Cache eines Agents hier läuft in 10 Minuten ab',
  openIssuesInRepo: (n) =>
    `${n} offene${n === 1 ? 's' : ''} Issue${n === 1 ? '' : 's'} im Repository`,
  favorite: 'Favorit',
  projectActions: 'Projektaktionen',
  actionsFor: (title) => `Aktionen für ${title}`,
  moreCount: (n) => `… ${n} weitere`,
  waitingShort: (what) => `wartet: ${what}`,
  appSessionTitle: (origin) =>
    `In der Claude App (${origin}) gestartet, läuft auf diesem Rechner. Öffnet auf claude.ai`,
  appSessionLabel: (origin) => `Claude-App-Session von ${origin}`,
  runsWith: (harness) => `Läuft mit ${harness}`,
  harnessLabel: (harness) => `Harness: ${harness}`,
  issueNumber: (n) => `Issue #${n}`,
  branchNamed: (branch) => `Branch ${branch}`,
  worktree: 'Worktree',
  uncommittedChanges: 'nicht committete Änderungen',
  aheadOfUpstream: (n) => `${n} vor Upstream`,
  behindUpstream: (n) => `${n} hinter Upstream`,
  uncommittedChangesLabel: 'Nicht committete Änderungen',
  waitingForSuffix: (what) => ` · wartet auf ${what}`,
  toggleDetailsOf: (expanded, name) =>
    `Details von ${name} ${expanded ? 'ausblenden' : 'einblenden'}`,
  hideDetails: 'Details ausblenden',
  showDetails: 'Details einblenden',
  orchestratorBadgeTitle:
    'Orchestrator: beobachtet und verteilt die Arbeit der anderen Agents, arbeitet selbst nicht',
  orchestrator: 'Orchestrator',
  copiesTitle: 'Zweiter Prozess auf dieser Session (gleicher Worktree, kann Arbeit überschreiben):',
  copiesCount: (n) => `+${n} ${n === 1 ? 'Kopie' : 'Kopien'}`,
  attachedActive: 'Verbunden, im Arbeitsbereich sichtbar',
  attachedInTab: 'In einem Tab verbunden',
  activeSr: 'aktiv',
  attachedSr: 'verbunden',
  loop: 'Schleife',
  age: 'Alter',
  peekTitle: 'Vorschau (Leertaste)',
  peek: 'Vorschau',
  favoriteSessionToggle: (fav, name) =>
    fav ? `${name} aus Favoriten entfernen` : `${name} zu Favoriten hinzufügen`,
  // AgentsView: hints and toasts
  quickAgentMissing: 'Der Agent aus dem Schnellfenster ist hier nicht aufgetaucht',
  orchestratorNotListed:
    'Der Orchestrator läuft, ist aber noch nicht gelistet: öffne ihn in der Seitenleiste',
  startingOrchestrator: (role) => `${role ?? 'Orchestrator'} wird gestartet…`,
  orchestratorFailed: (message) => `Orchestrator ist nicht gestartet: ${message}`,
  noLocalCheckout: (repo) => `Kein lokaler Checkout von ${repo}`,
  agentNotFound: (id) => `Agent ${id} nicht gefunden`,
  clearFiltersToCollapse: 'Filter zurücksetzen, um Gruppen zuzuklappen',
  cloudSessions: 'Cloud-Sessions',
  takeoverFailed: (message) => `Übernahme fehlgeschlagen: ${message}`,
  interactiveOwnTerminal: 'Interaktive Sessions laufen in ihrem eigenen Terminal',
  pickDirectory: 'Wähle zuerst ein Verzeichnis',
  startedCopy: (id) => `Kopie gestartet: ${id}`,
  startedNamed: (name) => `${name} gestartet`,
  dispatchFailed: 'Start fehlgeschlagen',
  folderNotTrusted:
    'Ordner noch nicht vertraut: bestätige die Abfrage im Terminal und starte den Agent dann erneut',
  giveSessionId: 'Gib die Session-ID an: /resume <id>',
  dispatchModel: (model) => (model ? `Startmodell: ${model}` : 'Startmodell: Standard'),
  dispatchEffort: (effort) => (effort ? `Start-Effort: ${effort}` : 'Start-Effort: Standard'),
  commandInsideSession: (command) => `/${command} funktioniert in einer verbundenen Session`,
  uploadFailed: 'Upload fehlgeschlagen',
  harnessNotInstalled: (harness) => `${harness} ist auf diesem Rechner nicht installiert`,
  pickProjectDirectory: 'Wähle zuerst ein Projektverzeichnis',
  harnessGiveSessionId: (harness) => `${harness}: gib die Session-ID an, /resume <id>`,
  continueClaudeOnly: '/continue gibt es nur in Claude Code: nutze /resume <id>',
  harnessNoUiView: (harness) => `${harness} hat noch keine UI-Ansicht: es öffnet sich im Terminal`,
  openCodeNoPrompt: 'OpenCode nimmt keinen Start-Prompt: lass das Feld leer und tippe im Terminal',
  homeInteractiveOnly:
    'In ~ läuft Claude Code nur interaktiv: starte ohne Prompt und tippe ihn im Terminal, oder wähle einen Projektordner',
  describeTask: 'Beschreibe zuerst die Aufgabe',
  noSessionOnPr: 'Keine Session arbeitet an diesem PR',
  tooShort: 'Zu kurz – beschreibe die Aufgabe',
  renamePrompt: 'Session umbenennen:',
  renameFailed: 'Umbenennen fehlgeschlagen',
  unpinned: 'Losgelöst',
  pinnedHint: 'Angeheftet – läuft auch im Leerlauf weiter',
  pinFailed: 'Anheften fehlgeschlagen',
  discardUnpushedConfirm: (message) =>
    `${message}\n\nNicht gepushte Commits verwerfen und trotzdem löschen?`,
  forceRemoveWorktreeConfirm: (message) =>
    `${message}\n\nWorktree-Verzeichnis zwangsweise entfernen und löschen?`,
  deleted: (name) => `${name} gelöscht`,
  deleteFailed: 'Löschen fehlgeschlagen',
  deleteAllInGroup: (n, group) => `Alle ${n} Sessions in „${group}“ löschen?`,
  reorderFailed: 'Umsortieren fehlgeschlagen',
  jsonCopied: 'claude agents --json in die Zwischenablage kopiert',
  copyFailed: 'Kopieren fehlgeschlagen',
  ctrlCAgain: 'Drück Ctrl+C noch einmal, um die Agent-Ansicht zu verlassen',
  markedOutside: (dir) =>
    `Als Orchestrator markiert. Er läuft außerhalb dieser Ansicht: verweise ihn selbst auf ${dir}/AGENTS.md`,
  markedBriefed: 'Als Orchestrator markiert und eingewiesen',
  markedBriefingFailed: (message) =>
    `Als Orchestrator markiert, aber die Einweisung kam nicht an: ${message}`,
  roleAssigned: (role) => `Rolle ${role} zugewiesen`,
  roleAssignedOutside: (role) =>
    `Rolle zugewiesen. Er läuft außerhalb dieser Ansicht: verweise ihn selbst auf roles/${role}.md`,
  roleBriefingFailed: (message) => `Rolle zugewiesen, aber die Einweisung kam nicht an: ${message}`,
  // AgentsView: row and group menus
  attachInTab: 'In Tab verbinden',
  openOnClaudeAi: 'Auf claude.ai öffnen',
  peekReply: 'Vorschau / antworten',
  openInCode: 'In Code öffnen',
  openTerminalHere: 'Terminal hier öffnen',
  showOnBoard: 'Im Board zeigen',
  showMode: (mode) => `${mode} zeigen`,
  unpin: 'Loslösen',
  pin: 'Anheften (läuft im Leerlauf weiter)',
  rename: 'Umbenennen',
  stop: 'Stoppen',
  respawn: 'Neu starten (respawn)',
  unmarkOrchestrator: 'Orchestrator-Markierung entfernen',
  markOrchestrator: 'Als Orchestrator markieren',
  roleNamed: (role) => `Rolle: ${role}`,
  copySessionId: 'Session-ID kopieren',
  copied: 'Kopiert',
  delete: 'Löschen',
  expand: 'Aufklappen',
  collapse: 'Zuklappen',
  openProject: 'Projekt öffnen',
  projectSettings: 'Projekteinstellungen…',
  removeFixedProject: 'Festes Projekt entfernen',
  keepFixedProject: 'Als festes Projekt behalten',
  viewCode: 'Code ansehen',
  viewBoard: 'Board ansehen',
  viewMode: (mode) => `${mode} ansehen`,
  newIssue: 'Neues Issue',
  newIssueNoRepo: 'Neues Issue (kein GitHub-Repo)',
  dispatchHere: 'In diesem Verzeichnis starten',
  newAgentHere: 'Neuer Agent hier',
  deleteAllInGroupAction: 'Alle Sessions der Gruppe löschen',
  // AgentsView: palette commands
  newAgentTask: 'Neue Agent-Aufgabe',
  paletteGroups: {
    agents: 'Agents',
    rail: 'Seitenleiste',
    selected: 'Ausgewählter Agent',
    workspace: 'Arbeitsbereich',
    panels: 'Panels',
  },
  addFixedProject: 'Festes Projekt hinzufügen…',
  groupByCommand: (mode) =>
    `Agents gruppieren nach ${{ project: 'Projekt', state: 'Status', directory: 'Verzeichnis', none: 'nichts' }[mode]}`,
  sortByCommand: (label) => `Agents sortieren nach: ${label}`,
  filterCommand: (on, label) => `Filter ${on ? 'entfernen' : 'hinzufügen'}: ${label}`,
  splitLayout: (layout) =>
    `Geteiltes Layout: ${{ columns: 'Spalten', rows: 'Zeilen', grid: 'Raster' }[layout]}`,
  closeTab: 'Aktuellen Tab schließen',
  showPullRequestsCommand: 'Pull Requests zeigen',
  openPullsFullCommand: 'Pull Requests öffnen (Vollansicht)',
  showServersCommand: 'Laufende Server zeigen',
  settingsCommand: 'Startvorgaben und Einstellungen',
  shortcutsCommand: 'Tastenkürzel zeigen',
  refreshCommand: 'Agent-Liste aktualisieren',
  hideInteractive: 'Interaktive Sessions ausblenden',
  showInteractive: 'Interaktive Sessions einblenden',
  copyJsonCommand: 'claude agents --json kopieren',
  leaveView: 'Agent-Ansicht verlassen',
  // AgentsView: header and rail
  modelDefault: 'Standard',
  modelDefaultNamed: (model) => `Standard: ${model}`,
  modelOfOpenAgent: 'Modell des offenen Agents (aus seiner Session)',
  dispatchModelTitle: 'Startmodell für neue Agents (/model)',
  viewTurnedOff: 'Die Agent-Ansicht ist ausgeschaltet.',
  turnOnAgain: 'Wieder einschalten',
  cliNotFound: 'Claude Code CLI nicht gefunden',
  cliInstall: [
    'Installiere sie auf dem Rechner, auf dem der Agents-Server läuft, und führe dann einmal ',
    ' aus, um dich anzumelden.',
  ],
  checkAgain: 'Erneut prüfen',
  activityBar: 'Aktivitätsleiste',
  settings: 'Einstellungen',
  contextDashboardTitle: 'Dashboard dieses Kontexts',
  agentListToggle: 'Agent-Liste',
  showAgentList: 'Agent-Liste einblenden',
  hideAgentList: 'Agent-Liste ausblenden',
  contextDashboardLabel: 'Kontext-Dashboard öffnen',
  focusSwitchTitle: 'Wechseln mit F6 oder Ctrl+Alt+Links / Rechts',
  focusZones: { terminal: 'Tasten: Terminal', rail: 'Tasten: Agent-Liste', page: 'Tasten: Seite' },
  switches: 'wechselt',
  modelPrefix: 'Modell',
  effortTitle: 'Start-Effort (/effort)',
  effortPrefix: 'Effort',
  bypassPermissions: 'Berechtigungen umgehen',
  scopeTitle: 'Bereich (--cwd)',
  reconnecting: 'verbindet neu…',
  copyJsonTitle: '`claude agents --json --all` kopieren',
  refresh: 'Aktualisieren',
  settingsTitle: 'Startvorgaben & Einstellungen',
  shortcutsTitle: 'Tastenkürzel (?)',
  loadingSessions: 'Sessions werden geladen…',
  filterActive: (shown, total) => `Filter aktiv — ${shown} von ${total} Sessions`,
  clearFilter: 'Filter zurücksetzen',
  interactiveSessions: 'Interaktive Sessions',
  interactiveCount: (n, shown) => `${n} ${shown ? 'eingeblendet' : 'ausgeblendet'}`,
  interactiveNotRunning: 'laufen nicht hier',
  dispatching: 'Wird gestartet…',
  stopAgentTitle: 'Agent stoppen?',
  stopAgentBody: (name) =>
    `${name} beendet seine aktuelle Arbeit. Das lässt sich nicht rückgängig machen.`,
  fixedProjectPicker: 'Projekt, das in der Seitenleiste bleibt…',
  homeChoice: '~ (Home)',
  chatsChoice: 'Chats (kein Projekt)',
  // AgentsView: ListError, PromptEditor
  listNoAccess: 'Kein Zugriff auf die Agents.',
  listUnavailable: 'Der Agent-Dienst ist gerade nicht erreichbar.',
  listFailed: 'Die Agents konnten nicht geladen werden.',
  tryAgain: 'Erneut versuchen',
  editPromptTitle: 'Start-Prompt bearbeiten',
  editPromptKeys: 'Ctrl+Enter übernimmt · Esc bricht ab',
  usePrompt: 'Prompt übernehmen',
};
