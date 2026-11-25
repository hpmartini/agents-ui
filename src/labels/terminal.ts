/** Texts of the terminal components; `en` is Orkumo's wording verbatim, `de` the German one */
import { createElement, Fragment, type ReactNode } from 'react';

type Layout = 'columns' | 'rows' | 'grid';
type SuggestionKind = 'command' | 'agent' | 'file' | 'dir';
type PageSource = 'published' | 'linked' | 'read';

export interface TerminalLabels {
  // shared
  close: string;
  closeNamed: (name: string) => string;
  closeAgentTitle: string;
  ownTab: string;
  moveToItsOwnTab: string;
  reattach: string;
  send: string;
  copy: string;
  copied: string;
  loading: string;

  // AgentTerminal
  openInGhosttyFailed: (message: string) => string;
  noShells: string;
  noSpawn: string;
  cwdNotFound: (cwd: string) => string;
  shellStarted: (shell: string, cwd: string, pid: string) => string;
  reattachedPrefix: string;
  ptyExit: (shell: boolean, exitCode: string) => string;
  wsError: string;
  moveToOwnTab: string;
  restart: string;
  restartTitle: string;
  peek: string;
  peekTitle: string;
  uiView: string;
  uiViewTitle: string;
  detach: string;
  detachTitle: string;
  openInGhostty: string;
  connected: string;
  disconnected: string;
  typingHere: string;
  active: string;
  paneActions: string;
  closeShellTitle: string;
  detachedNotice: string;

  // AgentWorkspace
  layout: (layout: Layout) => string;
  closeBrowser: string;
  moveBrowserToOwnTab: string;
  noAgentAttached: (enter: ReactNode, arrow: ReactNode) => ReactNode;
  dragTabsHint: string;
  dragPaneTitle: string;
  attachedAgents: string;
  tabPaneTitle: (name: string, cwd: string, sessionId: string | null) => string;
  tabAria: (title: string, state: string, panes: number, needsInput: boolean) => string;
  tabMoved: (title: string, position: number, total: number) => string;
  splitRightTitle: string;
  splitRight: (title: string) => string;
  splitDownTitle: string;
  splitDown: (title: string) => string;
  allTabs: string;
  allTabsHidden: (hidden: number) => string;
  paneLayout: string;
  tabActive: string;
  tabHidden: string;
  tabVisible: string;

  // ChatActivity
  stepStarting: string;
  stepThinking: string;
  noOutputYet: string;
  updatedAt: (time: string) => string;
  plan: string;
  planDone: string;
  planInProgress: string;
  planOpen: string;
  backgroundShell: (command: string) => string;
  subAgent: (type: string, description: string) => string;
  chipsMore: (count: number) => string;
  chipsLess: string;
  agentsDone: (count: number) => string;
  noSubagentOutput: string;
  stepCount: (count: number) => string;

  // ChatArtifacts
  artifactsButtonTitle: string;
  artifactCount: (count: number) => string;
  fileCount: (count: number) => string;
  groupDocuments: string;
  groupCreated: string;
  groupEdited: string;
  fileGone: string;
  previewFailed: string;
  loadingPreview: string;
  openElsewhere: string;
  emptyFile: string;
  pageSource: (source: PageSource) => string;
  factType: string;
  factStatus: string;
  factVersion: string;
  factUpdated: string;
  factLabel: string;
  factDescription: string;
  factSource: string;
  factUrl: string;
  claudeArtifact: (type: string) => string;
  artifactVersion: (version: number) => string;
  openOnClaude: string;
  noLocalSource: string;
  openSource: string;
  copyUrl: string;
  sourceNotWritten: (canOpen: boolean) => string;
  sectionClaudeArtifacts: string;
  sectionFiles: string;
  sessionDocument: string;
  deleted: string;
  artifacts: string;
  countsFrom: (counts: string, title: string) => string;
  closeEsc: string;
  noArtifacts: string;
  nothingToPreview: string;
  openInVsCode: string;
  revealInFinder: string;
  copyPath: string;

  // ChatComposer
  composerDisconnected: string;
  composerPlaceholderEnter: string;
  composerPlaceholderModEnter: string;
  commands: string;
  filesAndAgents: string;
  suggestionKind: (kind: SuggestionKind) => string;
  arguments: string;
  noDescription: string;
  pickerHintDir: string;
  pickerHint: string;
  message: string;

  // ChatMarkdown
  modClickOpen: (mod: string) => string;
  openInVsCodeMod: (mod: string) => string;
  imagePlaceholder: (alt: string | undefined) => string;
  taskDone: string;
  taskOpen: string;

  // ChatMessages
  openImage: string;
  toolResultImage: string;
  toolRunning: string;
  toolError: string;
  diffLines: (count: number) => string;
  noOutput: string;
  thinking: string;
  thinkingHidden: string;
  unknownAgent: string;
  messageFrom: string;
  openAgent: (id: string) => string;
  attachedImage: string;
  imageRef: (path: string) => string;
  queuedNote: string;
  resultDone: string;
  resultInterrupted: string;
  resultError: (subtype: string) => string;
  working: string;
  answerFrom: (harness: string) => string;
  answerStepsTitle: string;
  answerSteps: (count: number) => string;
  copyAnswer: string;
  recapInline: string;

  // Reply and threads (orchestrator chats)
  reply: string;
  replyToSelection: string;
  replyTo: (time: string) => string;
  removeQuote: string;
  openThread: string;
  threads: string;
  showThreads: string;
  hideThreads: string;
  hideThreadsPanel: string;
  collapseThread: string;
  newThread: string;
  bindToTask: string;
  threadWithoutTask: string;
  threadWithoutTaskHint: string;
  noReportTasks: string;
  threadReplies: (count: number) => string;
  inThread: string;
  unreadNew: (count: number) => string;
  unreadCount: (count: number) => string;
  loadingThreads: string;
  threadsFailed: string;
  threadsFailedHint: string;
  tryAgain: string;
  uiViewFailed: (reason: string) => string;
  noThreads: string;
  noThreadsHint: string;
  pickThread: string;
  closeThread: string;
  closedThreads: (count: number) => string;
  reopenThread: string;
  replyInThread: string;
  threadPlaceholderEnter: string;
  threadPlaceholderModEnter: string;
  maximizeThreads: string;
  restoreThreads: string;
  maximizeThreadsTitle: (shortcut: string) => string;
  restoreThreadsTitle: (shortcut: string) => string;
  threadsSidebar: string;
  /** H-6: the report tasks under the thread list of the maximised panel, and their details */
  statusList: string;
  statusOf: (title: string) => string;
  taskState: (state: string) => string;
  showInStatus: string;
  backToThread: string;
  firstThreadMessage: (tag: string) => string;
  boundTo: (repo: string | null) => string;
  notBound: string;
  resizeThreads: string;
  threadLog: (name: string) => string;
  loadingThreadHistory: string;

  // ChatPane
  notConnected: string;
  questionChanged: string;
  sendingFailed: string;
  noTerminalToReattach: string;
  statusDisconnected: string;
  statusNeedsInput: string;
  statusWorking: string;
  statusReady: string;
  reattachTitle: string;
  hideStepsTitle: string;
  showStepsTitle: string;
  showSteps: string;
  showAnswersTitle: string;
  promptsOnlyTitle: string;
  promptsOnly: string;
  stopTurnTitle: string;
  stopTurn: string;
  terminalViewTitle: string;
  terminalView: string;
  startPrompts: (count: number) => string;
  startPromptsHint: string;
  chatLog: (name: string) => string;
  loadingEarlier: string;
  loadEarlier: string;
  emptyChat: (harness: string, uploads: boolean) => string;
  waitingForSession: (harness: string) => string;
  recap: string;
  recapPrefix: string;
  agentAskingPrompt: string;
  sendMessage: string;
  switchModelBusy: string;
  switchModel: (commands: string) => string;
  keepCurrent: string;

  // ChatStatusLine
  gitTitle: (untracked: number, changed: number, ahead: number, behind: number) => string;
  context: string;
  contextFill: string;
  cacheColdTitle: string;
  cacheCold: string;
  limitFiveHours: string;
  limitWeek: string;
  today: string;

  // QuestionCard
  permissionRequest: string;
  agentQuestion: string;
  permission: string;
  agentAsking: string;
  answerSent: string;
  typed: (text: string) => string;
  otherAnswer: string;
  reason: string;
  denyWithReason: string;
  submit: string;
  /** A multi select's button on a question tab before the last */
  next: string;
  questionTabs: string;
  /** The question tabs' last step, where Submit sends all answers */
  reviewTab: string;

  // ImageAttachments
  removeAttachment: (name: string, index: number) => string;
  imageAlt: (index: number) => string;
  attachFilesTitle: string;
  attachImagesTitle: string;
  attach: string;
  addImage: string;

  // LimitBar, formatResetIn
  limitUnknown: string;
  limitUsed: (label: string) => string;
  reset: string;
  resetDone: string;
  resetNow: string;
  resetInDays: (days: number, hours: number) => string;
  resetInHours: (hours: number, minutes: number) => string;
  resetInMinutes: (minutes: number) => string;

  // useOpenFile, relativeTime
  launchableRevealed: (path: string) => string;
  openFileFailed: (message: string) => string;
  justNow: string;
}

export const terminalEn: TerminalLabels = {
  // shared
  close: 'Close',
  closeNamed: (name) => `Close ${name}`,
  closeAgentTitle: 'Close (the agent keeps running)',
  ownTab: 'Own tab',
  moveToItsOwnTab: 'Move to its own tab',
  reattach: 'Reattach',
  send: 'Send',
  copy: 'Copy',
  copied: 'Copied',
  loading: 'Loading…',

  // AgentTerminal
  openInGhosttyFailed: (message) => `Open in Ghostty failed: ${message}`,
  noShells: 'This host cannot open shells',
  noSpawn: 'This host cannot start terminals',
  cwdNotFound: (cwd) => `${cwd} not found`,
  shellStarted: (shell, cwd, pid) => `${shell} in ${cwd} (PID ${pid})`,
  reattachedPrefix: 'reattached: ',
  ptyExit: (shell, exitCode) => `${shell ? 'shell exited' : 'detached'} (exit code ${exitCode})`,
  wsError: 'WebSocket connection error',
  moveToOwnTab: 'Move to own tab',
  restart: 'Restart',
  restartTitle: 'Start a new shell in this directory',
  peek: 'Peek',
  peekTitle: 'Peek (recent output)',
  uiView: 'UI view',
  uiViewTitle: 'Show this agent in the UI view (same process, it keeps running)',
  detach: 'Detach',
  detachTitle: 'Detach (Ctrl+Z) - the session keeps running',
  openInGhostty: 'Open in Ghostty',
  connected: 'Connected',
  disconnected: 'Disconnected',
  typingHere: 'Typing here',
  active: 'Active',
  paneActions: 'Pane actions',
  closeShellTitle: 'Close (ends the shell)',
  detachedNotice: 'Detached. The session keeps running in the background.',

  // AgentWorkspace
  layout: (layout) =>
    ({ columns: 'Panes side by side', rows: 'Panes stacked', grid: 'Panes in a grid' })[layout],
  closeBrowser: 'Close browser',
  moveBrowserToOwnTab: 'Move browser to its own tab',
  noAgentAttached: (enter, arrow) =>
    createElement(
      Fragment,
      null,
      'No agent attached. Select a session and press ',
      enter,
      ' or ',
      arrow,
      ' to open it in a tab.'
    ),
  dragTabsHint: 'Drag one tab onto another pane to work with several agents side by side.',
  dragPaneTitle: 'Drag onto a pane edge to rearrange, or onto the tab strip for its own tab',
  attachedAgents: 'Attached agents',
  tabPaneTitle: (name, cwd, sessionId) =>
    `${name} · ${cwd}${sessionId ? ` · session ${sessionId}` : ''}`,
  tabAria: (title, state, panes, needsInput) =>
    `${title}, ${state}${panes > 1 ? `, ${panes} panes` : ''}${needsInput ? ', needs input' : ''}`,
  tabMoved: (title, position, total) => `${title} moved to position ${position} of ${total}`,
  splitRightTitle: 'Split right (into the neighbouring tab)',
  splitRight: (title) => `Split ${title} right`,
  splitDownTitle: 'Split down (into the neighbouring tab)',
  splitDown: (title) => `Split ${title} down`,
  allTabs: 'All tabs',
  allTabsHidden: (hidden) => `All tabs, ${hidden} hidden`,
  paneLayout: 'Pane layout',
  tabActive: 'active',
  tabHidden: 'hidden',
  tabVisible: 'visible',

  // ChatActivity
  stepStarting: 'Starting…',
  stepThinking: 'Thinking…',
  noOutputYet: '(no output yet)',
  updatedAt: (time) => `updated ${time}`,
  plan: 'Plan',
  planDone: 'done',
  planInProgress: 'in progress',
  planOpen: 'open',
  backgroundShell: (command) => `Background shell: ${command}`,
  subAgent: (type, description) => `Sub-agent ${type}: ${description}`,
  chipsMore: (count) => `+${count} more`,
  chipsLess: 'Show less',
  agentsDone: (count) => `${count} done`,
  noSubagentOutput: 'No sub-agent output yet',
  stepCount: (count) => `${count} steps`,

  // ChatArtifacts
  artifactsButtonTitle:
    'Claude artifacts (pages on claude.ai) and files this agent created or edited',
  artifactCount: (count) => `${count} artifact${count === 1 ? '' : 's'}`,
  fileCount: (count) => `${count} file${count === 1 ? '' : 's'}`,
  groupDocuments: 'Documents',
  groupCreated: 'Created',
  groupEdited: 'Edited',
  fileGone: 'The file no longer exists.',
  previewFailed: 'Preview failed',
  loadingPreview: 'Loading preview…',
  openElsewhere: 'Open it in VS Code or reveal it in Finder above.',
  emptyFile: 'Empty file',
  pageSource: (source) => ({ published: 'Published', linked: 'Linked', read: 'Read only' })[source],
  factType: 'Type',
  factStatus: 'Status',
  factVersion: 'Version',
  factUpdated: 'Updated',
  factLabel: 'Label',
  factDescription: 'Description',
  factSource: 'Source',
  factUrl: 'URL',
  claudeArtifact: (type) => `Claude artifact · ${type}`,
  artifactVersion: (version) => ` · version ${version}`,
  openOnClaude: 'Open on claude.ai',
  noLocalSource: 'No local source known',
  openSource: 'Open source',
  copyUrl: 'Copy URL',
  sourceNotWritten: (canOpen) =>
    `The source was not written in this session, so it has no preview here${canOpen ? ': open it with “Open source”.' : '.'}`,
  sectionClaudeArtifacts: 'Claude Artifacts',
  sectionFiles: 'Files',
  sessionDocument: 'session document',
  deleted: 'deleted',
  artifacts: 'Artifacts',
  countsFrom: (counts, title) => `${counts} from ${title}`,
  closeEsc: 'Close (Esc)',
  noArtifacts: 'No artifacts in this session yet.',
  nothingToPreview: 'Nothing to preview',
  openInVsCode: 'Open in VS Code',
  revealInFinder: 'Reveal in Finder',
  copyPath: 'Copy path',

  // ChatComposer
  composerDisconnected: 'Terminal not connected',
  composerPlaceholderEnter: 'Message · Enter sends · / commands · @ files',
  composerPlaceholderModEnter: 'Message · Cmd/Ctrl+Enter sends · / commands · @ files',
  commands: 'Commands',
  filesAndAgents: 'Files and agents',
  suggestionKind: (kind) =>
    ({ command: 'command', agent: 'agent', file: 'file', dir: 'directory' })[kind],
  arguments: 'Arguments: ',
  noDescription: 'No description',
  pickerHintDir: '↑↓ choose · Tab opens the folder · Enter on a finished path sends · Esc close',
  pickerHint: '↑↓ choose · Enter/Tab insert · Esc close',
  message: 'Message',

  // ChatMarkdown
  modClickOpen: (mod) => `${mod}-click: open in VS Code`,
  openInVsCodeMod: (mod) => `Open in VS Code (${mod}+Shift: default app)`,
  imagePlaceholder: (alt) => `[image${alt ? `: ${alt}` : ''}]`,
  taskDone: 'Done',
  taskOpen: 'Open',

  // ChatMessages
  openImage: 'Open image',
  toolResultImage: 'Tool result image',
  toolRunning: 'running…',
  toolError: 'error',
  diffLines: (count) => `${count} lines`,
  noOutput: '(no output)',
  thinking: 'Thinking',
  thinkingHidden: '(not shown by the CLI)',
  unknownAgent: 'unknown agent',
  messageFrom: 'Message from',
  openAgent: (id) => `Open agent ${id}`,
  attachedImage: 'Attached image',
  imageRef: (path) => `[Image: ${path}]`,
  queuedNote: 'sent · waits for the current turn',
  resultDone: 'Done',
  resultInterrupted: 'Interrupted',
  resultError: (subtype) => `Error (${subtype})`,
  working: 'Working…',
  answerFrom: (harness) => `Answer from ${harness}`,
  answerStepsTitle: 'Tool calls of this answer (show steps to see them)',
  answerSteps: (count) => `${count} ${count === 1 ? 'step' : 'steps'}`,
  copyAnswer: 'Copy answer',
  recapInline: 'recap: ',

  reply: 'Reply',
  replyToSelection: 'Reply to selection',
  replyTo: (time) => `Reply to ${time}`,
  removeQuote: 'Remove quote',
  openThread: 'Open thread',
  threads: 'Threads',
  showThreads: 'Show threads',
  hideThreads: 'Hide threads',
  hideThreadsPanel: 'Hide threads panel',
  collapseThread: 'Back to the list (thread stays open)',
  newThread: 'New thread',
  bindToTask: 'Bind to a task from the status report',
  threadWithoutTask: 'Thread without a task',
  threadWithoutTaskHint: 'Named after its first message',
  noReportTasks: 'No status report yet',
  threadReplies: (count) => `${count} ${count === 1 ? 'reply' : 'replies'}`,
  inThread: 'in thread',
  unreadNew: (count) => `${count} new`,
  unreadCount: (count) => `${count} unread`,
  loadingThreads: 'Loading threads…',
  threadsFailed: 'Threads could not be loaded',
  threadsFailedHint: 'Messages still reach the orchestrator through the main chat.',
  tryAgain: 'Try again',
  uiViewFailed: (reason) =>
    `The UI view cannot read this agent's transcript (${reason}). The terminal view still works.`,
  noThreads: 'No threads yet',
  noThreadsHint:
    'Open a thread from an answer, from Instruct on a status card, or bind a new one to a task.',
  pickThread: 'Pick a thread to read it here.',
  closeThread: 'Close thread',
  closedThreads: (count) => `Closed (${count})`,
  reopenThread: 'Reopen',
  replyInThread: 'Reply in thread',
  threadPlaceholderEnter: 'Reply in thread · Enter sends · @ files',
  threadPlaceholderModEnter: 'Reply in thread · Cmd/Ctrl+Enter sends · @ files',
  maximizeThreads: 'Maximize threads',
  restoreThreads: 'Restore threads',
  maximizeThreadsTitle: (shortcut) => `Threads over the whole pane (${shortcut})`,
  restoreThreadsTitle: (shortcut) => `Show the main chat again (Esc or ${shortcut})`,
  threadsSidebar: 'Thread list on the left',
  statusList: 'Status',
  statusOf: (title) => `Status · ${title}`,
  taskState: (state) => (state === 'waiting' ? 'waiting for you' : state),
  showInStatus: 'Show in Status',
  backToThread: 'Back to the thread (Esc)',
  firstThreadMessage: (tag) =>
    `Write the first message. It goes to the orchestrator tagged ${tag}.`,
  boundTo: (repo) => `Bound to status task${repo ? ` · ${repo}` : ''}`,
  notBound: 'Not bound to a status task',
  resizeThreads: 'Resize threads panel',
  threadLog: (name) => `Thread ${name}`,
  loadingThreadHistory: 'Loading earlier messages of this thread…',

  // ChatPane
  notConnected: 'The terminal is not connected: use Reattach above, then send again',
  questionChanged: 'The question on the agent’s screen changed: check it and answer again',
  sendingFailed: 'Sending failed',
  noTerminalToReattach: 'No terminal to reattach: reopen the agent',
  statusDisconnected: 'terminal disconnected',
  statusNeedsInput: 'needs input',
  statusWorking: 'working…',
  statusReady: 'ready',
  reattachTitle: 'Reattach the terminal behind this view (the session keeps running)',
  hideStepsTitle: 'Hide thinking and tool calls',
  showStepsTitle: 'Show thinking and tool calls in the chat',
  showSteps: 'Show thinking and tool calls',
  showAnswersTitle: 'Show the answers again',
  promptsOnlyTitle: 'Show only my prompts (hide the answers)',
  promptsOnly: 'Show only my prompts',
  stopTurnTitle: 'Stop this turn (Esc)',
  stopTurn: 'Stop this turn',
  terminalViewTitle: 'Terminal view (same process, it keeps running)',
  terminalView: 'Terminal view',
  startPrompts: (count) => (count === 1 ? 'Start prompt' : `${count} start prompts`),
  startPromptsHint: '(session start, after compaction or /clear)',
  chatLog: (name) => `Chat ${name}`,
  loadingEarlier: 'Loading earlier messages…',
  loadEarlier: 'Load earlier messages',
  emptyChat: (harness, uploads) =>
    `Ask ${harness} anything. Markdown works${uploads ? '; paste or drop images' : ''}.`,
  waitingForSession: (harness) =>
    `Waiting for ${harness} to report its session; the terminal view works meanwhile.`,
  recap: 'Recap',
  recapPrefix: 'Recap: ',
  agentAskingPrompt: 'The agent is asking: pick an answer or type it below',
  sendMessage: 'Send message',
  switchModelBusy: 'Switch model and effort once the agent is idle',
  switchModel: (commands) => `Switch model and effort of this session (${commands})`,
  keepCurrent: 'current',

  // ChatStatusLine
  gitTitle: (untracked, changed, ahead, behind) =>
    `${untracked} untracked, ${changed} uncommitted changes${ahead || behind ? `, ${ahead} ahead, ${behind} behind` : ''}`,
  context: 'Context',
  contextFill: 'Context window fill',
  cacheColdTitle: 'Prompt cache expired: the next turn writes it again',
  cacheCold: 'cache cold',
  limitFiveHours: '5h',
  limitWeek: '7 days',
  today: 'Today',

  // QuestionCard
  permissionRequest: 'Permission request',
  agentQuestion: 'Agent question',
  permission: 'Permission',
  agentAsking: 'The agent is asking',
  answerSent: 'Answer sent',
  typed: (text) => `Typed: ${text}`,
  otherAnswer: 'Other answer',
  reason: 'Reason',
  denyWithReason: 'No, with reason',
  submit: 'Submit',
  next: 'Next',
  questionTabs: 'Questions',
  reviewTab: 'Review',

  // ImageAttachments
  removeAttachment: (name, index) => `Remove ${name || `attachment ${index}`}`,
  imageAlt: (index) => `Image ${index}`,
  attachFilesTitle: 'Attach images, PDF, text or code files up to 20 MB (or paste / drop them)',
  attachImagesTitle: 'Attach images (or paste / drop them)',
  attach: 'Attach',
  addImage: 'Add image',

  // LimitBar, formatResetIn
  limitUnknown: 'Limit unknown',
  limitUsed: (label) => `${label} used`,
  reset: 'Reset',
  resetDone: 'done',
  resetNow: 'now',
  resetInDays: (days, hours) => `in ${days} d ${hours} h`,
  resetInHours: (hours, minutes) => `in ${hours} h ${minutes} min`,
  resetInMinutes: (minutes) => `in ${minutes} min`,

  // useOpenFile, relativeTime
  launchableRevealed: (path) => `Launchable file, revealed in Finder: ${path}`,
  openFileFailed: (message) => `Could not open file: ${message}`,
  justNow: 'now',
};

export const terminalDe: TerminalLabels = {
  // shared
  close: 'Schließen',
  closeNamed: (name) => `${name} schließen`,
  closeAgentTitle: 'Schließen (der Agent läuft weiter)',
  ownTab: 'Eigener Tab',
  moveToItsOwnTab: 'In eigenen Tab verschieben',
  reattach: 'Neu verbinden',
  send: 'Senden',
  copy: 'Kopieren',
  copied: 'Kopiert',
  loading: 'Lädt…',

  // AgentTerminal
  openInGhosttyFailed: (message) => `Öffnen in Ghostty fehlgeschlagen: ${message}`,
  noShells: 'Dieser Host kann keine Shells öffnen',
  noSpawn: 'Dieser Host kann keine Terminals starten',
  cwdNotFound: (cwd) => `${cwd} nicht gefunden`,
  shellStarted: (shell, cwd, pid) => `${shell} in ${cwd} (PID ${pid})`,
  reattachedPrefix: 'neu verbunden: ',
  ptyExit: (shell, exitCode) => `${shell ? 'Shell beendet' : 'getrennt'} (Exit-Code ${exitCode})`,
  wsError: 'WebSocket-Verbindungsfehler',
  moveToOwnTab: 'In eigenen Tab',
  restart: 'Neu starten',
  restartTitle: 'Neue Shell in diesem Verzeichnis starten',
  peek: 'Einblick',
  peekTitle: 'Einblick (letzte Ausgabe)',
  uiView: 'UI-Ansicht',
  uiViewTitle: 'Diesen Agent in der UI-Ansicht zeigen (gleicher Prozess, er läuft weiter)',
  detach: 'Trennen',
  detachTitle: 'Trennen (Ctrl+Z) – die Session läuft weiter',
  openInGhostty: 'In Ghostty öffnen',
  connected: 'Verbunden',
  disconnected: 'Getrennt',
  typingHere: 'Eingabe hier',
  active: 'Aktiv',
  paneActions: 'Aktionen des Bereichs',
  closeShellTitle: 'Schließen (beendet die Shell)',
  detachedNotice: 'Getrennt. Die Session läuft im Hintergrund weiter.',

  // AgentWorkspace
  layout: (layout) =>
    ({
      columns: 'Bereiche nebeneinander',
      rows: 'Bereiche untereinander',
      grid: 'Bereiche im Raster',
    })[layout],
  closeBrowser: 'Browser schließen',
  moveBrowserToOwnTab: 'Browser in eigenen Tab verschieben',
  noAgentAttached: (enter, arrow) =>
    createElement(
      Fragment,
      null,
      'Kein Agent geöffnet. Wähle eine Session und drücke ',
      enter,
      ' oder ',
      arrow,
      ', um sie in einem Tab zu öffnen.'
    ),
  dragTabsHint:
    'Zieh einen Tab auf einen anderen Bereich, um mit mehreren Agents nebeneinander zu arbeiten.',
  dragPaneTitle:
    'Auf den Rand eines Bereichs ziehen zum Umordnen, auf die Tab-Leiste für einen eigenen Tab',
  attachedAgents: 'Geöffnete Agents',
  tabPaneTitle: (name, cwd, sessionId) =>
    `${name} · ${cwd}${sessionId ? ` · Session ${sessionId}` : ''}`,
  tabAria: (title, state, panes, needsInput) =>
    `${title}, ${state}${panes > 1 ? `, ${panes} Bereiche` : ''}${needsInput ? ', wartet auf Eingabe' : ''}`,
  tabMoved: (title, position, total) => `${title} an Position ${position} von ${total} verschoben`,
  splitRightTitle: 'Nach rechts teilen (in den Nachbar-Tab)',
  splitRight: (title) => `${title} nach rechts teilen`,
  splitDownTitle: 'Nach unten teilen (in den Nachbar-Tab)',
  splitDown: (title) => `${title} nach unten teilen`,
  allTabs: 'Alle Tabs',
  allTabsHidden: (hidden) => `Alle Tabs, ${hidden} verborgen`,
  paneLayout: 'Anordnung der Bereiche',
  tabActive: 'aktiv',
  tabHidden: 'verborgen',
  tabVisible: 'sichtbar',

  // ChatActivity
  stepStarting: 'Startet…',
  stepThinking: 'Denkt nach…',
  noOutputYet: '(noch keine Ausgabe)',
  updatedAt: (time) => `aktualisiert ${time}`,
  plan: 'Plan',
  planDone: 'erledigt',
  planInProgress: 'in Arbeit',
  planOpen: 'offen',
  backgroundShell: (command) => `Hintergrund-Shell: ${command}`,
  subAgent: (type, description) => `Sub-Agent ${type}: ${description}`,
  chipsMore: (count) => `+${count} weitere`,
  chipsLess: 'Weniger',
  agentsDone: (count) => `${count} fertig`,
  noSubagentOutput: 'Noch keine Ausgabe des Sub-Agents',
  stepCount: (count) => `${count} Schritte`,

  // ChatArtifacts
  artifactsButtonTitle:
    'Claude-Artefakte (Seiten auf claude.ai) und Dateien, die dieser Agent erstellt oder bearbeitet hat',
  artifactCount: (count) => `${count} ${count === 1 ? 'Artefakt' : 'Artefakte'}`,
  fileCount: (count) => `${count} ${count === 1 ? 'Datei' : 'Dateien'}`,
  groupDocuments: 'Dokumente',
  groupCreated: 'Erstellt',
  groupEdited: 'Bearbeitet',
  fileGone: 'Die Datei existiert nicht mehr.',
  previewFailed: 'Vorschau fehlgeschlagen',
  loadingPreview: 'Vorschau lädt…',
  openElsewhere: 'Öffne sie oben in VS Code oder zeige sie im Finder.',
  emptyFile: 'Leere Datei',
  pageSource: (source) =>
    ({ published: 'Veröffentlicht', linked: 'Verlinkt', read: 'Nur gelesen' })[source],
  factType: 'Typ',
  factStatus: 'Status',
  factVersion: 'Version',
  factUpdated: 'Aktualisiert',
  factLabel: 'Label',
  factDescription: 'Beschreibung',
  factSource: 'Quelle',
  factUrl: 'URL',
  claudeArtifact: (type) => `Claude-Artefakt · ${type}`,
  artifactVersion: (version) => ` · Version ${version}`,
  openOnClaude: 'Auf claude.ai öffnen',
  noLocalSource: 'Keine lokale Quelle bekannt',
  openSource: 'Quelle öffnen',
  copyUrl: 'URL kopieren',
  sourceNotWritten: (canOpen) =>
    `Die Quelle wurde nicht in dieser Session geschrieben, daher gibt es hier keine Vorschau${canOpen ? ': öffne sie mit „Quelle öffnen“.' : '.'}`,
  sectionClaudeArtifacts: 'Claude-Artefakte',
  sectionFiles: 'Dateien',
  sessionDocument: 'Session-Dokument',
  deleted: 'gelöscht',
  artifacts: 'Artefakte',
  countsFrom: (counts, title) => `${counts} aus ${title}`,
  closeEsc: 'Schließen (Esc)',
  noArtifacts: 'Noch keine Artefakte in dieser Session.',
  nothingToPreview: 'Nichts zur Vorschau',
  openInVsCode: 'In VS Code öffnen',
  revealInFinder: 'Im Finder zeigen',
  copyPath: 'Pfad kopieren',

  // ChatComposer
  composerDisconnected: 'Terminal nicht verbunden',
  composerPlaceholderEnter: 'Nachricht · Enter sendet · / Befehle · @ Dateien',
  composerPlaceholderModEnter: 'Nachricht · Cmd/Ctrl+Enter sendet · / Befehle · @ Dateien',
  commands: 'Befehle',
  filesAndAgents: 'Dateien und Agents',
  suggestionKind: (kind) =>
    ({ command: 'Befehl', agent: 'Agent', file: 'Datei', dir: 'Verzeichnis' })[kind],
  arguments: 'Argumente: ',
  noDescription: 'Keine Beschreibung',
  pickerHintDir:
    '↑↓ wählen · Tab öffnet den Ordner · Enter auf fertigem Pfad sendet · Esc schließen',
  pickerHint: '↑↓ wählen · Enter/Tab einfügen · Esc schließen',
  message: 'Nachricht',

  // ChatMarkdown
  modClickOpen: (mod) => `${mod}-Klick: in VS Code öffnen`,
  openInVsCodeMod: (mod) => `In VS Code öffnen (${mod}+Shift: Standard-App)`,
  imagePlaceholder: (alt) => `[Bild${alt ? `: ${alt}` : ''}]`,
  taskDone: 'Erledigt',
  taskOpen: 'Offen',

  // ChatMessages
  openImage: 'Bild öffnen',
  toolResultImage: 'Bild aus Tool-Ergebnis',
  toolRunning: 'läuft…',
  toolError: 'Fehler',
  diffLines: (count) => `${count} Zeilen`,
  noOutput: '(keine Ausgabe)',
  thinking: 'Denkt nach',
  thinkingHidden: '(von der CLI nicht gezeigt)',
  unknownAgent: 'unbekannter Agent',
  messageFrom: 'Nachricht von',
  openAgent: (id) => `Agent ${id} öffnen`,
  attachedImage: 'Angehängtes Bild',
  imageRef: (path) => `[Bild: ${path}]`,
  queuedNote: 'gesendet · wartet auf den laufenden Turn',
  resultDone: 'Fertig',
  resultInterrupted: 'Unterbrochen',
  resultError: (subtype) => `Fehler (${subtype})`,
  working: 'Arbeitet…',
  answerFrom: (harness) => `Antwort von ${harness}`,
  answerStepsTitle: 'Tool-Aufrufe dieser Antwort (Schritte einblenden, um sie zu sehen)',
  answerSteps: (count) => `${count} ${count === 1 ? 'Schritt' : 'Schritte'}`,
  copyAnswer: 'Antwort kopieren',
  recapInline: 'Zusammenfassung: ',

  reply: 'Antworten',
  replyToSelection: 'Auf Markierung antworten',
  replyTo: (time) => `Antwort auf ${time}`,
  removeQuote: 'Zitat entfernen',
  openThread: 'Thread öffnen',
  threads: 'Threads',
  showThreads: 'Threads einblenden',
  hideThreads: 'Threads ausblenden',
  hideThreadsPanel: 'Thread-Panel ausblenden',
  collapseThread: 'Zurück zur Liste (Thread bleibt offen)',
  newThread: 'Neuer Thread',
  bindToTask: 'An eine Aufgabe aus dem Status-Bericht binden',
  threadWithoutTask: 'Thread ohne Aufgabe',
  threadWithoutTaskHint: 'Benannt nach der ersten Nachricht',
  noReportTasks: 'Noch kein Status-Bericht',
  threadReplies: (count) => `${count} ${count === 1 ? 'Antwort' : 'Antworten'}`,
  inThread: 'im Thread',
  unreadNew: (count) => `${count} neu`,
  unreadCount: (count) => `${count} ungelesen`,
  loadingThreads: 'Threads werden geladen…',
  threadsFailed: 'Threads konnten nicht geladen werden',
  threadsFailedHint: 'Nachrichten erreichen den Orchestrator weiter über den Haupt-Chat.',
  tryAgain: 'Erneut versuchen',
  uiViewFailed: (reason) =>
    `Die UI-Ansicht kann das Transkript dieses Agents nicht lesen (${reason}). Die Terminal-Ansicht geht weiter.`,
  noThreads: 'Noch keine Threads',
  noThreadsHint:
    'Thread an einer Antwort öffnen, über Instruct auf einer Status-Karte oder neu an eine Aufgabe binden.',
  pickThread: 'Thread wählen, um ihn hier zu lesen.',
  closeThread: 'Thread schließen',
  closedThreads: (count) => `Geschlossen (${count})`,
  reopenThread: 'Wieder öffnen',
  replyInThread: 'Im Thread antworten',
  threadPlaceholderEnter: 'Im Thread antworten · Enter sendet · @ Dateien',
  threadPlaceholderModEnter: 'Im Thread antworten · Cmd/Ctrl+Enter sendet · @ Dateien',
  maximizeThreads: 'Threads maximieren',
  restoreThreads: 'Threads verkleinern',
  maximizeThreadsTitle: (shortcut) => `Threads über die ganze Pane (${shortcut})`,
  restoreThreadsTitle: (shortcut) => `Haupt-Chat wieder zeigen (Esc oder ${shortcut})`,
  threadsSidebar: 'Thread-Liste links',
  statusList: 'Status',
  statusOf: (title) => `Status · ${title}`,
  taskState: (state) =>
    ({
      waiting: 'wartet auf dich',
      running: 'läuft',
      planned: 'geplant',
      done: 'erledigt',
      cancelled: 'abgebrochen',
    })[state] ?? state,
  showInStatus: 'Im Status zeigen',
  backToThread: 'Zurück zum Thread (Esc)',
  firstThreadMessage: (tag) =>
    `Erste Nachricht schreiben. Sie geht mit der Kennung ${tag} an den Orchestrator.`,
  boundTo: (repo) => `An Status-Aufgabe gebunden${repo ? ` · ${repo}` : ''}`,
  notBound: 'Nicht an eine Status-Aufgabe gebunden',
  resizeThreads: 'Breite des Thread-Panels ändern',
  threadLog: (name) => `Thread ${name}`,
  loadingThreadHistory: 'Frühere Nachrichten dieses Threads werden geladen…',

  // ChatPane
  notConnected: 'Das Terminal ist nicht verbunden: oben neu verbinden, dann erneut senden',
  questionChanged:
    'Die Frage auf dem Bildschirm des Agents hat sich geändert: prüfen und erneut antworten',
  sendingFailed: 'Senden fehlgeschlagen',
  noTerminalToReattach: 'Kein Terminal zum Verbinden: Agent erneut öffnen',
  statusDisconnected: 'Terminal getrennt',
  statusNeedsInput: 'wartet auf Eingabe',
  statusWorking: 'arbeitet…',
  statusReady: 'bereit',
  reattachTitle: 'Terminal hinter dieser Ansicht neu verbinden (die Session läuft weiter)',
  hideStepsTitle: 'Denken und Tool-Aufrufe ausblenden',
  showStepsTitle: 'Denken und Tool-Aufrufe im Chat zeigen',
  showSteps: 'Denken und Tool-Aufrufe zeigen',
  showAnswersTitle: 'Antworten wieder zeigen',
  promptsOnlyTitle: 'Nur meine Prompts zeigen (Antworten ausblenden)',
  promptsOnly: 'Nur meine Prompts zeigen',
  stopTurnTitle: 'Diesen Turn stoppen (Esc)',
  stopTurn: 'Diesen Turn stoppen',
  terminalViewTitle: 'Terminal-Ansicht (gleicher Prozess, er läuft weiter)',
  terminalView: 'Terminal-Ansicht',
  startPrompts: (count) => (count === 1 ? 'Start-Prompt' : `${count} Start-Prompts`),
  startPromptsHint: '(Session-Start, nach Kompaktierung oder /clear)',
  chatLog: (name) => `Chat ${name}`,
  loadingEarlier: 'Frühere Nachrichten laden…',
  loadEarlier: 'Frühere Nachrichten laden',
  emptyChat: (harness, uploads) =>
    `Frag ${harness}, was du willst. Markdown geht${uploads ? '; Bilder einfügen oder ablegen' : ''}.`,
  waitingForSession: (harness) =>
    `Warte, bis ${harness} seine Session meldet; die Terminal-Ansicht funktioniert schon.`,
  recap: 'Zusammenfassung',
  recapPrefix: 'Zusammenfassung: ',
  agentAskingPrompt: 'Der Agent fragt: wähle eine Antwort oder tippe sie unten ein',
  sendMessage: 'Nachricht senden',
  switchModelBusy: 'Modell und Effort wechseln, sobald der Agent frei ist',
  switchModel: (commands) => `Modell und Effort dieser Session wechseln (${commands})`,
  keepCurrent: 'aktuell',

  // ChatStatusLine
  gitTitle: (untracked, changed, ahead, behind) =>
    `${untracked} nicht verfolgt, ${changed} nicht committete Änderungen${ahead || behind ? `, ${ahead} voraus, ${behind} zurück` : ''}`,
  context: 'Kontext',
  contextFill: 'Füllstand des Kontextfensters',
  cacheColdTitle: 'Prompt-Cache abgelaufen: der nächste Turn schreibt ihn neu',
  cacheCold: 'Cache kalt',
  limitFiveHours: '5 h',
  limitWeek: '7 Tage',
  today: 'Heute',

  // QuestionCard
  permissionRequest: 'Berechtigungsanfrage',
  agentQuestion: 'Frage des Agents',
  permission: 'Berechtigung',
  agentAsking: 'Der Agent fragt',
  answerSent: 'Antwort gesendet',
  typed: (text) => `Eingetippt: ${text}`,
  otherAnswer: 'Andere Antwort',
  reason: 'Begründung',
  denyWithReason: 'Nein, mit Begründung',
  submit: 'Absenden',
  next: 'Weiter',
  questionTabs: 'Fragen',
  reviewTab: 'Übersicht',

  // ImageAttachments
  removeAttachment: (name, index) => `${name || `Anhang ${index}`} entfernen`,
  imageAlt: (index) => `Bild ${index}`,
  attachFilesTitle:
    'Bilder, PDF-, Text- oder Code-Dateien bis 20 MB anhängen (oder einfügen / ablegen)',
  attachImagesTitle: 'Bilder anhängen (oder einfügen / ablegen)',
  attach: 'Anhängen',
  addImage: 'Bild hinzufügen',

  // LimitBar, formatResetIn
  limitUnknown: 'Limit unbekannt',
  limitUsed: (label) => `${label} genutzt`,
  reset: 'Reset',
  resetDone: 'erfolgt',
  resetNow: 'jetzt',
  resetInDays: (days, hours) => `in ${days} T ${hours} h`,
  resetInHours: (hours, minutes) => `in ${hours} h ${minutes} min`,
  resetInMinutes: (minutes) => `in ${minutes} min`,

  // useOpenFile, relativeTime
  launchableRevealed: (path) => `Startbare Datei, im Finder gezeigt: ${path}`,
  openFileFailed: (message) => `Datei öffnen fehlgeschlagen: ${message}`,
  justNow: 'jetzt',
};
