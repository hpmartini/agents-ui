/** Texts of the panels components; `en` is Orkumo's wording verbatim, `de` the German one */
export interface PanelsLabels {
  // shared
  close: string;
  cancel: string;
  open: string;

  // AgentSettingsPanel
  settingsTitle: string;
  settingsView: string;
  settingsScope: string;
  settingsAllSessions: string;
  settingsTaskCwd: string;
  settingsTaskCwdPlaceholder: string;
  settingsGroupBy: string;
  settingsGroupState: string;
  settingsGroupDirectory: string;
  settingsCardDensity: string;
  settingsDensityComfortable: string;
  settingsDensityCompact: string;
  settingsChatSubmit: string;
  settingsSubmitModEnter: string;
  settingsSubmitEnter: string;
  settingsOpenAgentsIn: string;
  settingsOpenChat: string;
  settingsOpenTerminal: string;
  settingsCardFields: string;
  settingsReset: string;
  settingsInAppNotifications: string;
  settingsBrowserNotifications: string;
  settingsNotificationsDenied: string;
  settingsHarness: string;
  settingsDefaultHarness: string;
  settingsHarnessHint: string;
  settingsDispatchDefaults: string;
  settingsUnsafeLocked: string;
  settingsFromUserSettings: string;
  settingsEffortSep: string;
  settingsPermissionSep: string;
  settingsDefault: string;
  settingsDirectoryRules: string;
  settingsDefaultSubagent: string;
  settingsNone: string;
  settingsFileOrJson: string;
  settingsOnePerLine: string;
  settingsFileOrJsonPerLine: string;
  settingsSkipPermissionsConfirm: string;
  settingsBypassOn: string;
  settingsSupervisor: string;
  settingsStatusUnavailable: string;
  settingsVersionMismatch: string;
  settingsStopSupervisorConfirm: string;
  settingsDaemonDone: (label: string) => string;
  settingsDaemonFailed: (label: string) => string;
  settingsTurnOff: string;
  settingsHideView: string;
  settingsCliViewOff: string;

  // ShortcutsHelp
  shortcutsTitle: string;
  shortcutsBrowserNote: string;
  shortcutSections: { title: string; rows: [string, string][] }[];

  // PeekPanel
  peekHarnessNote: string;
  peekInteractiveNote: string;
  peekLoadFailed: string;
  peekCommandSent: string;
  peekReplySent: string;
  peekReplyFailed: string;
  peekRefresh: string;
  peekIdCopied: string;
  peekCopyId: string;
  peekBackToPanelEsc: string;
  peekBackToPanel: string;
  peekOpenLarge: string;
  peekOpenOnClaudeAi: string;
  peekOpenInTerminal: string;
  peekAttachTitle: string;
  peekAttach: string;
  peekCloseTitle: string;
  peekState: string;
  peekStartedInApp: (origin: string) => string;
  peekWaitingFor: (what: string) => string;
  peekTokens: (tokens: number) => string;
  peekTask: string;
  peekWorktree: string;
  peekLoading: string;
  peekNoOutput: string;
  peekReplyInApp: string;
  peekReplyHarness: string;
  peekReplyInteractive: string;
  peekReplyPlaceholder: string;
  peekReplyLabel: string;

  // ResumePicker
  resumeSearch: string;
  resumeSearchLabel: string;
  resumeScopeTitle: string;
  resumeScope: string;
  resumeEmpty: string;
  resumeAgo: (age: string) => string;
  resumeFooter: string;

  // ServersPanel
  serversNoPid: string;
  serversLoadUnavailable: string;
  serversStale: (time: string) => string;
  serversExited: string;
  serversTitle: string;
  serversEmpty: string;
  serversCpu: string;
  serversMemory: string;
  serversSelectAgent: string;
  serversOpenPort: (port: number) => string;
  serversCopyPort: (port: number) => string;
  serversCopyUrl: string;
  serversOrphaned: string;
  serversOrphanedHeading: string;
  serversOrphanedHint: string;
  serversStopPid: (pid: number) => string;
  serversStopOrphan: (port: number) => string;
  serversStopTitle: string;

  // ModelEffortPicker
  /** Shown name of the picker's '' row/column; `keep` is 'default' or 'current' */
  keepWord: (keep: string) => string;
  modelEffort: string;
  modelEffortEmpty: string;
  modelCellEffort: (keep: string) => string;
  modelInUse: string;
  modelInUseNow: string;
  modelFilter: string;
  modelFilterLabel: string;
  modelLoading: string;
  modelHeader: string;
  modelDefault: string;
  modelKeepModel: (keep: string) => string;
  modelRowInUse: (id: string, current: string) => string;
  modelNoMatch: (typed: string) => string;
  modelNotListed: string;
  /** modelMatrix pickLabel: the '' model */
  pickDefault: (defaultModel?: string | null) => string;

  // DispatchInput
  dispatchSuggestions: string;
  dispatchChatHarness: string;
  dispatchChatClaude: string;
  dispatchAgentPrompt: string;
  dispatchTaskPrompt: string;
  dispatchTaskLabel: string;
  dispatchHarness: string;
  dispatchHarnessTitle: string;
  dispatchNotInstalled: string;
  dispatchModelTitleClaude: string;
  dispatchModelTitleOmp: string;
  dispatchModel: string;
  dispatchModelPlaceholder: (defaultModel: string | null) => string;
  dispatchModelTitle: string;
  dispatchEditorTitle: string;
  dispatchEditor: string;
  dispatchAttachTitle: string;
  dispatchAttach: string;
  dispatchStartTitle: string;
  dispatchSubmitTitle: string;
  dispatchStartChat: string;
  dispatchStartAgent: string;
  dispatchSubmit: string;
  dispatchDirAgent: string;
  dispatchDirTask: string;
  dispatchPickDir: string;
  dispatchHintHarness: (omp: boolean) => string;
  dispatchHintClaude: string;

  // DirectoryPicker
  dirPlaceholder: string;
  dirCollapseAll: string;
  dirExpandAll: string;
  dirFiltering: string;
  dirPinned: string;
  dirSource: (source: string) => string;
  dirNoMatches: string;
  dirUsePath: string;
  /** directoryGroups: detail of a worktree entry */
  dirWorktreeOf: (repo: string) => string;

  // CopyWarningDialog
  copyHandoverTitle: string;
  copyTitle: string;
  copyHolderBackground: (id: string) => string;
  copyHolderPid: (pid: number) => string;
  copyHolderTerminal: string;
  copyRunsAs: (name: string, what: string) => string;
  copyHandoverText: string;
  copyText: string;
  copyIn: string;
  copyHandoverEnd: string;
  copyEnd: string;
  copyInterrupts: string;
  copyTakeOver: string;
  copyCreate: string;

  // CloudSessionBar
  cloudOpenFailed: string;
  cloudPlaceholder: string;
  cloudSessions: string;
  cloudHint: string;
  /** cloudSession parseCloudTarget errors */
  cloudInvalid: string;
  cloudOnlyClaudeAi: string;
  cloudNoId: string;

  // CacheBadge
  cacheExpires: (countdown: string, ttlMin: number) => string;
  cacheContext: (cached: string, window: string, percent: number) => string;
  cacheHitsTitle: (hits: number, turns: number, percent: number) => string;
  cacheFill: string;
  cacheHits: (hits: number) => string;
}

export const panelsEn: PanelsLabels = {
  close: 'Close',
  cancel: 'Cancel',
  open: 'Open',

  // AgentSettingsPanel
  settingsTitle: 'Agent view settings',
  settingsView: 'View',
  settingsScope: 'Scope (claude agents --cwd)',
  settingsAllSessions: 'All sessions',
  settingsTaskCwd: 'New tasks start in',
  settingsTaskCwdPlaceholder: 'Selected project or last pick, e.g. ~/MAPLE',
  settingsGroupBy: 'Group by',
  settingsGroupState: 'State (pinned · review · needs input · working · completed)',
  settingsGroupDirectory: 'Directory',
  settingsCardDensity: 'Card density',
  settingsDensityComfortable: 'Comfortable (metrics on their own line)',
  settingsDensityCompact: 'Compact',
  settingsChatSubmit: 'Chat: send message with',
  settingsSubmitModEnter: 'Cmd/Ctrl+Enter (Enter = new line)',
  settingsSubmitEnter: 'Enter (Shift+Enter = new line)',
  settingsOpenAgentsIn: 'Open agents in',
  settingsOpenChat: 'UI view (switch to the terminal any time)',
  settingsOpenTerminal: 'Terminal view',
  settingsCardFields: 'Card fields: where each detail sits on an agent card',
  settingsReset: 'Reset',
  settingsInAppNotifications: 'In-app notifications (needs input · finished · failed)',
  settingsBrowserNotifications: 'Browser notifications when the tab is hidden',
  settingsNotificationsDenied: 'Browser notifications were not allowed',
  settingsHarness: 'Harness',
  settingsDefaultHarness: 'Default harness for new agents',
  settingsHarnessHint:
    'Preselected in New task / New agent. Other harnesses run interactively in a terminal pane; the flags below apply to Claude Code only.',
  settingsDispatchDefaults: 'Dispatch defaults (flags of `claude agents`)',
  settingsUnsafeLocked:
    'Bypass permissions, --settings, --mcp-config and --plugin-dir are locked on this server. Start it with DEVORBIT_AGENTS_ALLOW_UNSAFE_FLAGS=true to enable them. Sessions can only run inside the configured project directories.',
  settingsFromUserSettings: 'From ~/.claude/settings.json: model',
  settingsEffortSep: ', effort',
  settingsPermissionSep: ', permission mode',
  settingsDefault: 'default',
  settingsDirectoryRules: 'directory rules',
  settingsDefaultSubagent: 'default subagent',
  settingsNone: 'none',
  settingsFileOrJson: 'file or JSON',
  settingsOnePerLine: 'one per line',
  settingsFileOrJsonPerLine: 'file or JSON, one per line',
  settingsSkipPermissionsConfirm:
    'Start every dispatched session with --dangerously-skip-permissions? Claude will run commands without asking.',
  settingsBypassOn: 'Bypass mode is on for new sessions. Only use this in trusted environments.',
  settingsSupervisor: 'Background service (supervisor)',
  settingsStatusUnavailable: 'status unavailable',
  settingsVersionMismatch:
    'The supervisor runs a different Claude Code version. Stop it (--any) so it restarts on the current version.',
  settingsStopSupervisorConfirm: 'Stop the supervisor and all background sessions?',
  settingsDaemonDone: (label) => `${label} done`,
  settingsDaemonFailed: (label) => `${label} failed`,
  settingsTurnOff: 'Turn off',
  settingsHideView: 'Hide the agent view in Orkumo (mirrors the CLI `disableAgentView` setting)',
  settingsCliViewOff:
    'The CLI agent view is turned off via `disableAgentView` / CLAUDE_CODE_DISABLE_AGENT_VIEW. Background sessions still work from here.',

  // ShortcutsHelp
  shortcutsTitle: 'Agent view shortcuts',
  shortcutsBrowserNote:
    'Ctrl+T is reserved by most browsers - use Alt+P there (Ctrl+T works in the desktop app).',
  shortcutSections: [
    {
      title: 'Navigate',
      rows: [
        ['↑ / ↓', 'Move between rows'],
        ['Cmd/Ctrl+P', 'Command palette: > commands, @ agents, # projects'],
        ['Cmd/Ctrl+K', 'Search agents, PRs and issues (in a terminal off macOS: Ctrl+Shift+K)'],
        ['N / Cmd+N (Ctrl+N)', 'New task (opens the task composer)'],
        ['Enter', 'Attach to the selected session'],
        ['→', 'Attach to the selected session'],
        ['Space', 'Open / close the peek panel'],
        ['Ctrl+1 … Ctrl+9', 'Switch mode (Agents, Board, Issues, … in sidebar order)'],
        ['Alt+1 … Alt+9', 'Attach to session 1-9 in the focused directory'],
        ['Enter on a group', 'Collapse / expand the group'],
        ['Esc', 'Close peek panel'],
        ['Ctrl+C', 'Press twice to leave the agents view'],
        ['?', 'Show this overlay'],
      ],
    },
    {
      title: 'New task / agent (composer)',
      rows: [
        ['Cmd/Ctrl+Enter', 'Dispatch (New agent: start and attach)'],
        ['Cmd/Ctrl+Shift+Enter', 'Dispatch and attach immediately'],
        ['Enter / Ctrl+J', 'Insert a newline'],
        ['Tab', 'Apply the highlighted suggestion'],
        ['Esc', 'Close the composer (the draft is kept)'],
        ['Ctrl+G', 'Edit the prompt in a larger editor'],
        ['@agent / <agent> …', 'Run a custom subagent'],
        ['@repo …', 'Dispatch into another repository'],
        ['! command', 'Run a shell command as a background job'],
        ['/resume · /model · /effort', 'Resume a past session, set dispatch model / effort'],
        ['a:name · s:state · #123 · URL', 'Filter the list instead of dispatching'],
      ],
    },
    {
      title: 'Manage',
      rows: [
        ['Ctrl+S', 'Toggle grouping: state ↔ directory'],
        ['Ctrl+T (Alt+P)', 'Pin / unpin the selected session'],
        ['Ctrl+R', 'Rename the selected session'],
        ['Shift+↑ / Shift+↓', 'Reorder the selected session or group'],
        ['Shift+F', 'Favorite / unfavorite the selected session or group'],
        ['Ctrl+X', 'Delete session (with confirmation)'],
        ['Ctrl+X on a group', 'Delete all sessions in the group (with confirmation)'],
      ],
    },
    {
      title: 'Attached terminal',
      rows: [
        ['Ctrl+Z', 'Detach - the session keeps running'],
        ['← on an empty prompt', 'Return to the agent view (CLI behaviour)'],
        ['/bg · /fork', 'Background / fork the conversation from inside the session'],
        ['Ctrl+O', 'Transcript mode'],
      ],
    },
  ],

  // PeekPanel
  peekHarnessNote: 'The session shows up here once its first message is written.',
  peekInteractiveNote:
    'Interactive sessions run in their own terminal. Background them with /bg or ← to manage them here.',
  peekLoadFailed: 'Failed to load output',
  peekCommandSent: 'Command sent',
  peekReplySent: 'Reply sent',
  peekReplyFailed: 'Failed to send reply',
  peekRefresh: 'Refresh',
  peekIdCopied: 'Session id copied',
  peekCopyId: 'Copy session id',
  peekBackToPanelEsc: 'Back to panel (Esc)',
  peekBackToPanel: 'Back to panel',
  peekOpenLarge: 'Open large view',
  peekOpenOnClaudeAi: 'Open this session on claude.ai (Enter)',
  peekOpenInTerminal: 'Open in a terminal pane, resuming the session (Enter / →)',
  peekAttachTitle: 'Attach (Enter / →)',
  peekAttach: 'Attach',
  peekCloseTitle: 'Close (Esc / Space)',
  peekState: 'state ',
  peekStartedInApp: (origin) => ` · started in the Claude app (${origin})`,
  peekWaitingFor: (what) => ` · waiting for ${what}`,
  peekTokens: (tokens) => ` · ${tokens} tokens`,
  peekTask: 'task ',
  peekWorktree: 'worktree',
  peekLoading: 'Loading recent output…',
  peekNoOutput: 'No output yet.',
  peekReplyInApp: 'Reply in the Claude app or on claude.ai',
  peekReplyHarness: 'Open the session (Enter) to reply in its terminal',
  peekReplyInteractive: 'Interactive sessions cannot be replied to here',
  peekReplyPlaceholder: 'reply · ! for a shell command · 1-9 to pick a choice',
  peekReplyLabel: 'Reply to session',

  // ResumePicker
  resumeSearch: 'Search past sessions (name, prompt, id)',
  resumeSearchLabel: 'Search past sessions',
  resumeScopeTitle: 'Only sessions from the current directory',
  resumeScope: 'this directory',
  resumeEmpty: 'No past sessions found.',
  resumeAgo: (age) => `${age} ago`,
  resumeFooter: '↑↓ select · enter resume as background session · esc close',

  // ServersPanel
  serversNoPid: 'No PID known',
  serversLoadUnavailable: 'Load unavailable',
  serversStale: (time) => `As of ${time}, refresh failed`,
  serversExited: 'Process exited',
  serversTitle: 'Running servers',
  serversEmpty: 'No server is listening in an agent directory.',
  serversCpu: 'CPU (share of one core, incl. child processes)',
  serversMemory: 'Memory (RSS, incl. child processes)',
  serversSelectAgent: 'Select this agent',
  serversOpenPort: (port) => `Open localhost:${port}`,
  serversCopyPort: (port) => `Copy URL of port ${port}`,
  serversCopyUrl: 'Copy URL',
  serversOrphaned: 'Orphaned servers',
  serversOrphanedHeading: 'Verwaist',
  serversOrphanedHint: 'no running session owns these (worktree or job dir)',
  serversStopPid: (pid) => `Stop pid ${pid}`,
  serversStopOrphan: (port) => `Stop orphaned server on port ${port}`,
  serversStopTitle: 'Stop (SIGTERM)',

  // ModelEffortPicker
  keepWord: (keep) => keep,
  modelEffort: 'Model and effort',
  modelEffortEmpty: 'Model · effort',
  modelCellEffort: (keep) => `${keep} effort`,
  modelInUse: ' (in use)',
  modelInUseNow: ' · in use now',
  modelFilter: 'Filter models · Enter uses a typed name',
  modelFilterLabel: 'Filter models',
  modelLoading: 'Loading models…',
  modelHeader: 'Model',
  modelDefault: 'Default model',
  modelKeepModel: (keep) => `${keep} model`,
  modelRowInUse: (id, current) => `${id} · in use now (${current})`,
  modelNoMatch: (typed) => `No listed model matches; Enter uses "${typed}".`,
  modelNotListed: 'The CLI did not list its models; type a model name.',
  pickDefault: (defaultModel) => (defaultModel ? `default (${defaultModel})` : 'default'),

  // DispatchInput
  dispatchSuggestions: 'Suggestions',
  dispatchChatHarness: 'First message (optional) - /resume <id> picks up an earlier session',
  dispatchChatClaude: 'First message (optional) - /resume or /continue picks up an earlier session',
  dispatchAgentPrompt: 'Optional first prompt - leave empty to start an idle session',
  dispatchTaskPrompt: 'Describe the task for a new session',
  dispatchTaskLabel: 'Task description',
  dispatchHarness: 'Harness',
  dispatchHarnessTitle: 'CLI the new agent or chat runs with',
  dispatchNotInstalled: ' (not installed)',
  dispatchModelTitleClaude: 'Model and effort (--model, --effort); default = the dispatch settings',
  dispatchModelTitleOmp:
    'Model and thinking level (--model, --thinking); default = the CLI default',
  dispatchModel: 'Model',
  dispatchModelPlaceholder: (defaultModel) =>
    defaultModel ? `default (${defaultModel})` : 'default',
  dispatchModelTitle: 'Model of this chat, passed as --model; empty = the CLI default',
  dispatchEditorTitle: 'Edit in a larger editor (Ctrl+G)',
  dispatchEditor: 'Edit in a larger editor',
  dispatchAttachTitle: 'Dispatch and open the session (Cmd/Ctrl+Shift+Enter)',
  dispatchAttach: 'Dispatch and attach',
  dispatchStartTitle: 'Start and attach (Cmd/Ctrl+Enter)',
  dispatchSubmitTitle: 'Dispatch (Cmd/Ctrl+Enter)',
  dispatchStartChat: 'Start chat',
  dispatchStartAgent: 'Start agent',
  dispatchSubmit: 'Dispatch',
  dispatchDirAgent: 'Directory the agent starts in',
  dispatchDirTask: 'Directory the new session starts in (mention @repo to override)',
  dispatchPickDir: 'Pick a directory',
  dispatchHintHarness: (omp) =>
    `Runs interactively in a terminal pane${omp ? ' · /skill' : ''} · Cmd/Ctrl+Enter to start · Enter for a new line`,
  dispatchHintClaude:
    '@agent · @repo · /command · ! shell command · Cmd/Ctrl+Enter to send · Enter for a new line',

  // DirectoryPicker
  dirPlaceholder: 'Directory for new sessions…',
  dirCollapseAll: 'Collapse all directories',
  dirExpandAll: 'Expand all directories',
  dirFiltering: 'All matches are shown while filtering',
  dirPinned: 'Current and home',
  dirSource: (source) => source,
  dirNoMatches: 'No matches.',
  dirUsePath: 'Use path',
  dirWorktreeOf: (repo) => `worktree of ${repo}`,

  // CopyWarningDialog
  copyHandoverTitle: 'Übernimmt Session',
  copyTitle: 'Erzeugt Kopie',
  copyHolderBackground: (id) => `background job ${id}`,
  copyHolderPid: (pid) => `a terminal (PID ${pid})`,
  copyHolderTerminal: 'a running terminal',
  copyRunsAs: (name, what) => `"${name}" runs as ${what}.`,
  copyHandoverText:
    'Continuing it here stops that process and starts a new one on the same session',
  copyText: 'Resuming it here starts a second process on the same session',
  copyIn: 'in',
  copyHandoverEnd: '.',
  copyEnd: "; both can overwrite each other's work.",
  copyInterrupts: ' It is working right now: its current turn is cut off.',
  copyTakeOver: 'Take over',
  copyCreate: 'Create copy',

  // CloudSessionBar
  cloudOpenFailed: 'Failed to open session',
  cloudPlaceholder: 'Cloud session ID or claude.ai/code URL',
  cloudSessions: 'Cloud-Sessions',
  cloudHint: 'Sessions on other machines only show up if started there with',
  cloudInvalid: 'Expected a session ID or a claude.ai/code URL',
  cloudOnlyClaudeAi: 'Only https://claude.ai/code/… URLs are allowed',
  cloudNoId: 'URL does not contain a valid session ID',

  // CacheBadge
  cacheExpires: (countdown, ttlMin) => `Prompt cache expires in ${countdown} (TTL ${ttlMin} min)`,
  cacheContext: (cached, window, percent) => `Context: ${cached} / ${window} tokens (${percent}%)`,
  cacheHitsTitle: (hits, turns, percent) =>
    `Cache hits: ${hits} of ${turns} turns, ${percent}% of input tokens read from cache`,
  cacheFill: 'Context window fill',
  cacheHits: (hits) => `${hits} hits`,
};

const DE_SOURCES: Record<string, string> = {
  home: 'Home',
  repo: 'Repo',
  worktree: 'Worktree',
  session: 'Session',
  configured: 'konfiguriert',
  app: 'App',
};

export const panelsDe: PanelsLabels = {
  close: 'Schließen',
  cancel: 'Abbrechen',
  open: 'Öffnen',

  // AgentSettingsPanel
  settingsTitle: 'Einstellungen der Agent-Ansicht',
  settingsView: 'Ansicht',
  settingsScope: 'Bereich (claude agents --cwd)',
  settingsAllSessions: 'Alle Sessions',
  settingsTaskCwd: 'Neue Aufgaben starten in',
  settingsTaskCwdPlaceholder: 'Gewähltes Projekt oder letzte Wahl, z. B. ~/MAPLE',
  settingsGroupBy: 'Gruppieren nach',
  settingsGroupState: 'Status (angeheftet · Review · wartet auf Eingabe · arbeitet · fertig)',
  settingsGroupDirectory: 'Verzeichnis',
  settingsCardDensity: 'Kartendichte',
  settingsDensityComfortable: 'Großzügig (Kennzahlen in eigener Zeile)',
  settingsDensityCompact: 'Kompakt',
  settingsChatSubmit: 'Chat: Nachricht senden mit',
  settingsSubmitModEnter: 'Cmd/Ctrl+Enter (Enter = neue Zeile)',
  settingsSubmitEnter: 'Enter (Shift+Enter = neue Zeile)',
  settingsOpenAgentsIn: 'Agents öffnen in',
  settingsOpenChat: 'UI-Ansicht (jederzeit zum Terminal wechselbar)',
  settingsOpenTerminal: 'Terminal-Ansicht',
  settingsCardFields: 'Kartenfelder: wo welches Detail auf einer Agent-Karte steht',
  settingsReset: 'Zurücksetzen',
  settingsInAppNotifications: 'Hinweise in der App (wartet auf Eingabe · fertig · fehlgeschlagen)',
  settingsBrowserNotifications: 'Browser-Benachrichtigungen, wenn der Tab verborgen ist',
  settingsNotificationsDenied: 'Browser-Benachrichtigungen wurden nicht erlaubt',
  settingsHarness: 'Harness',
  settingsDefaultHarness: 'Standard-Harness für neue Agents',
  settingsHarnessHint:
    'Vorausgewählt bei Neue Aufgabe / Neuer Agent. Andere Harnesses laufen interaktiv in einem Terminal-Bereich; die Flags unten gelten nur für Claude Code.',
  settingsDispatchDefaults: 'Standards beim Starten (Flags von `claude agents`)',
  settingsUnsafeLocked:
    'Bypass permissions, --settings, --mcp-config und --plugin-dir sind auf diesem Server gesperrt. Starte ihn mit DEVORBIT_AGENTS_ALLOW_UNSAFE_FLAGS=true, um sie freizugeben. Sessions laufen nur in den konfigurierten Projektverzeichnissen.',
  settingsFromUserSettings: 'Aus ~/.claude/settings.json: Modell',
  settingsEffortSep: ', Effort',
  settingsPermissionSep: ', Berechtigungsmodus',
  settingsDefault: 'Standard',
  settingsDirectoryRules: 'Regeln des Verzeichnisses',
  settingsDefaultSubagent: 'Standard-Subagent',
  settingsNone: 'keiner',
  settingsFileOrJson: 'Datei oder JSON',
  settingsOnePerLine: 'eins pro Zeile',
  settingsFileOrJsonPerLine: 'Datei oder JSON, eins pro Zeile',
  settingsSkipPermissionsConfirm:
    'Jede gestartete Session mit --dangerously-skip-permissions starten? Claude führt dann Befehle ohne Rückfrage aus.',
  settingsBypassOn:
    'Bypass-Modus ist für neue Sessions aktiv. Nur in vertrauenswürdigen Umgebungen nutzen.',
  settingsSupervisor: 'Hintergrunddienst (Supervisor)',
  settingsStatusUnavailable: 'Status nicht verfügbar',
  settingsVersionMismatch:
    'Der Supervisor läuft mit einer anderen Claude-Code-Version. Stoppe ihn (--any), damit er mit der aktuellen Version neu startet.',
  settingsStopSupervisorConfirm: 'Supervisor und alle Hintergrund-Sessions stoppen?',
  settingsDaemonDone: (label) => `${label} erledigt`,
  settingsDaemonFailed: (label) => `${label} fehlgeschlagen`,
  settingsTurnOff: 'Ausschalten',
  settingsHideView: 'Agent-Ansicht ausblenden (entspricht der CLI-Einstellung `disableAgentView`)',
  settingsCliViewOff:
    'Die Agent-Ansicht der CLI ist über `disableAgentView` / CLAUDE_CODE_DISABLE_AGENT_VIEW ausgeschaltet. Hintergrund-Sessions funktionieren hier trotzdem.',

  // ShortcutsHelp
  shortcutsTitle: 'Tastenkürzel der Agent-Ansicht',
  shortcutsBrowserNote:
    'Ctrl+T belegen die meisten Browser - dort Alt+P nutzen (Ctrl+T geht in der Desktop-App).',
  shortcutSections: [
    {
      title: 'Navigieren',
      rows: [
        ['↑ / ↓', 'Zwischen Zeilen wechseln'],
        ['Cmd/Ctrl+P', 'Befehlspalette: > Befehle, @ Agents, # Projekte'],
        ['Cmd/Ctrl+K', 'Agents, PRs und Issues suchen (im Terminal außerhalb macOS: Ctrl+Shift+K)'],
        ['N / Cmd+N (Ctrl+N)', 'Neue Aufgabe (öffnet den Aufgaben-Editor)'],
        ['Enter', 'Mit der gewählten Session verbinden'],
        ['→', 'Mit der gewählten Session verbinden'],
        ['Space', 'Vorschau öffnen / schließen'],
        [
          'Ctrl+1 … Ctrl+9',
          'Modus wechseln (Agents, Board, Issues, … in Seitenleisten-Reihenfolge)',
        ],
        ['Alt+1 … Alt+9', 'Mit Session 1-9 im fokussierten Verzeichnis verbinden'],
        ['Enter auf einer Gruppe', 'Gruppe ein- / ausklappen'],
        ['Esc', 'Vorschau schließen'],
        ['Ctrl+C', 'Zweimal drücken, um die Agent-Ansicht zu verlassen'],
        ['?', 'Diese Übersicht anzeigen'],
      ],
    },
    {
      title: 'Neue Aufgabe / neuer Agent (Editor)',
      rows: [
        ['Cmd/Ctrl+Enter', 'Starten (Neuer Agent: starten und verbinden)'],
        ['Cmd/Ctrl+Shift+Enter', 'Starten und sofort verbinden'],
        ['Enter / Ctrl+J', 'Zeilenumbruch einfügen'],
        ['Tab', 'Markierten Vorschlag übernehmen'],
        ['Esc', 'Editor schließen (Entwurf bleibt erhalten)'],
        ['Ctrl+G', 'Prompt in größerem Editor bearbeiten'],
        ['@agent / <agent> …', 'Eigenen Subagent ausführen'],
        ['@repo …', 'In einem anderen Repository starten'],
        ['! command', 'Shell-Befehl als Hintergrundjob ausführen'],
        ['/resume · /model · /effort', 'Frühere Session fortsetzen, Modell / Effort festlegen'],
        ['a:name · s:state · #123 · URL', 'Liste filtern statt starten'],
      ],
    },
    {
      title: 'Verwalten',
      rows: [
        ['Ctrl+S', 'Gruppierung umschalten: Status ↔ Verzeichnis'],
        ['Ctrl+T (Alt+P)', 'Gewählte Session anheften / lösen'],
        ['Ctrl+R', 'Gewählte Session umbenennen'],
        ['Shift+↑ / Shift+↓', 'Gewählte Session oder Gruppe verschieben'],
        ['Shift+F', 'Gewählte Session oder Gruppe favorisieren / entfernen'],
        ['Ctrl+X', 'Session löschen (mit Rückfrage)'],
        ['Ctrl+X auf einer Gruppe', 'Alle Sessions der Gruppe löschen (mit Rückfrage)'],
      ],
    },
    {
      title: 'Verbundenes Terminal',
      rows: [
        ['Ctrl+Z', 'Trennen - die Session läuft weiter'],
        ['← bei leerem Prompt', 'Zurück zur Agent-Ansicht (wie in der CLI)'],
        [
          '/bg · /fork',
          'Unterhaltung aus der Session heraus in den Hintergrund schicken / abzweigen',
        ],
        ['Ctrl+O', 'Transkript-Modus'],
      ],
    },
  ],

  // PeekPanel
  peekHarnessNote: 'Die Session erscheint hier, sobald ihre erste Nachricht geschrieben ist.',
  peekInteractiveNote:
    'Interaktive Sessions laufen in ihrem eigenen Terminal. Schick sie mit /bg oder ← in den Hintergrund, um sie hier zu verwalten.',
  peekLoadFailed: 'Ausgabe konnte nicht geladen werden',
  peekCommandSent: 'Befehl gesendet',
  peekReplySent: 'Antwort gesendet',
  peekReplyFailed: 'Antwort konnte nicht gesendet werden',
  peekRefresh: 'Aktualisieren',
  peekIdCopied: 'Session-ID kopiert',
  peekCopyId: 'Session-ID kopieren',
  peekBackToPanelEsc: 'Zurück zur Seitenansicht (Esc)',
  peekBackToPanel: 'Zurück zur Seitenansicht',
  peekOpenLarge: 'Große Ansicht öffnen',
  peekOpenOnClaudeAi: 'Session auf claude.ai öffnen (Enter)',
  peekOpenInTerminal: 'In einem Terminal-Bereich öffnen und Session fortsetzen (Enter / →)',
  peekAttachTitle: 'Verbinden (Enter / →)',
  peekAttach: 'Verbinden',
  peekCloseTitle: 'Schließen (Esc / Space)',
  peekState: 'Status ',
  peekStartedInApp: (origin) => ` · in der Claude-App gestartet (${origin})`,
  peekWaitingFor: (what) => ` · wartet auf ${what}`,
  peekTokens: (tokens) => ` · ${tokens} Tokens`,
  peekTask: 'Aufgabe ',
  peekWorktree: 'Worktree',
  peekLoading: 'Lade letzte Ausgabe…',
  peekNoOutput: 'Noch keine Ausgabe.',
  peekReplyInApp: 'In der Claude-App oder auf claude.ai antworten',
  peekReplyHarness: 'Session öffnen (Enter), um im Terminal zu antworten',
  peekReplyInteractive: 'Interaktiven Sessions kann man hier nicht antworten',
  peekReplyPlaceholder: 'Antwort · ! für Shell-Befehl · 1-9 wählt eine Option',
  peekReplyLabel: 'Der Session antworten',

  // ResumePicker
  resumeSearch: 'Frühere Sessions suchen (Name, Prompt, ID)',
  resumeSearchLabel: 'Frühere Sessions suchen',
  resumeScopeTitle: 'Nur Sessions aus dem aktuellen Verzeichnis',
  resumeScope: 'dieses Verzeichnis',
  resumeEmpty: 'Keine früheren Sessions gefunden.',
  resumeAgo: (age) => `vor ${age}`,
  resumeFooter: '↑↓ wählen · Enter als Hintergrund-Session fortsetzen · Esc schließen',

  // ServersPanel
  serversNoPid: 'Keine PID bekannt',
  serversLoadUnavailable: 'Auslastung nicht verfügbar',
  serversStale: (time) => `Stand ${time}, Aktualisierung fehlgeschlagen`,
  serversExited: 'Prozess beendet',
  serversTitle: 'Laufende Server',
  serversEmpty: 'In keinem Agent-Verzeichnis lauscht ein Server.',
  serversCpu: 'CPU (Anteil eines Kerns, inkl. Kindprozesse)',
  serversMemory: 'Speicher (RSS, inkl. Kindprozesse)',
  serversSelectAgent: 'Diesen Agent auswählen',
  serversOpenPort: (port) => `localhost:${port} öffnen`,
  serversCopyPort: (port) => `URL von Port ${port} kopieren`,
  serversCopyUrl: 'URL kopieren',
  serversOrphaned: 'Verwaiste Server',
  serversOrphanedHeading: 'Verwaist',
  serversOrphanedHint: 'keine laufende Session gehört dazu (Worktree oder Job-Verzeichnis)',
  serversStopPid: (pid) => `PID ${pid} stoppen`,
  serversStopOrphan: (port) => `Verwaisten Server auf Port ${port} stoppen`,
  serversStopTitle: 'Stoppen (SIGTERM)',

  // ModelEffortPicker
  keepWord: (keep) => (keep === 'default' ? 'Standard' : keep === 'current' ? 'aktuell' : keep),
  modelEffort: 'Modell und Effort',
  modelEffortEmpty: 'Modell · Effort',
  modelCellEffort: (keep) => `Effort: ${keep}`,
  modelInUse: ' (in Verwendung)',
  modelInUseNow: ' · gerade in Verwendung',
  modelFilter: 'Modelle filtern · Enter nimmt den getippten Namen',
  modelFilterLabel: 'Modelle filtern',
  modelLoading: 'Lade Modelle…',
  modelHeader: 'Modell',
  modelDefault: 'Standardmodell',
  modelKeepModel: (keep) => `Modell: ${keep}`,
  modelRowInUse: (id, current) => `${id} · gerade in Verwendung (${current})`,
  modelNoMatch: (typed) => `Kein gelistetes Modell passt; Enter nimmt "${typed}".`,
  modelNotListed: 'Die CLI hat ihre Modelle nicht gelistet; tippe einen Modellnamen.',
  pickDefault: (defaultModel) => (defaultModel ? `Standard (${defaultModel})` : 'Standard'),

  // DispatchInput
  dispatchSuggestions: 'Vorschläge',
  dispatchChatHarness: 'Erste Nachricht (optional) - /resume <id> setzt eine frühere Session fort',
  dispatchChatClaude:
    'Erste Nachricht (optional) - /resume oder /continue setzt eine frühere Session fort',
  dispatchAgentPrompt: 'Optionaler erster Prompt - leer lassen für eine wartende Session',
  dispatchTaskPrompt: 'Aufgabe für eine neue Session beschreiben',
  dispatchTaskLabel: 'Aufgabenbeschreibung',
  dispatchHarness: 'Harness',
  dispatchHarnessTitle: 'CLI, mit der der neue Agent oder Chat läuft',
  dispatchNotInstalled: ' (nicht installiert)',
  dispatchModelTitleClaude:
    'Modell und Effort (--model, --effort); Standard = die Start-Einstellungen',
  dispatchModelTitleOmp: 'Modell und Denkstufe (--model, --thinking); Standard = Vorgabe der CLI',
  dispatchModel: 'Modell',
  dispatchModelPlaceholder: (defaultModel) =>
    defaultModel ? `Standard (${defaultModel})` : 'Standard',
  dispatchModelTitle: 'Modell dieses Chats, übergeben als --model; leer = Vorgabe der CLI',
  dispatchEditorTitle: 'In größerem Editor bearbeiten (Ctrl+G)',
  dispatchEditor: 'In größerem Editor bearbeiten',
  dispatchAttachTitle: 'Starten und Session öffnen (Cmd/Ctrl+Shift+Enter)',
  dispatchAttach: 'Starten und verbinden',
  dispatchStartTitle: 'Starten und verbinden (Cmd/Ctrl+Enter)',
  dispatchSubmitTitle: 'Starten (Cmd/Ctrl+Enter)',
  dispatchStartChat: 'Chat starten',
  dispatchStartAgent: 'Agent starten',
  dispatchSubmit: 'Starten',
  dispatchDirAgent: 'Verzeichnis, in dem der Agent startet',
  dispatchDirTask: 'Verzeichnis, in dem die neue Session startet (@repo überschreibt es)',
  dispatchPickDir: 'Verzeichnis wählen',
  dispatchHintHarness: (omp) =>
    `Läuft interaktiv in einem Terminal-Bereich${omp ? ' · /skill' : ''} · Cmd/Ctrl+Enter startet · Enter für neue Zeile`,
  dispatchHintClaude:
    '@agent · @repo · /command · ! Shell-Befehl · Cmd/Ctrl+Enter sendet · Enter für neue Zeile',

  // DirectoryPicker
  dirPlaceholder: 'Verzeichnis für neue Sessions…',
  dirCollapseAll: 'Alle Verzeichnisse einklappen',
  dirExpandAll: 'Alle Verzeichnisse ausklappen',
  dirFiltering: 'Beim Filtern werden alle Treffer gezeigt',
  dirPinned: 'Aktuell und Home',
  dirSource: (source) => DE_SOURCES[source] ?? source,
  dirNoMatches: 'Keine Treffer.',
  dirUsePath: 'Pfad verwenden',
  dirWorktreeOf: (repo) => `Worktree von ${repo}`,

  // CopyWarningDialog
  copyHandoverTitle: 'Übernimmt Session',
  copyTitle: 'Erzeugt Kopie',
  copyHolderBackground: (id) => `Hintergrundjob ${id}`,
  copyHolderPid: (pid) => `Terminal (PID ${pid})`,
  copyHolderTerminal: 'laufendes Terminal',
  copyRunsAs: (name, what) => `"${name}" läuft als ${what}.`,
  copyHandoverText:
    'Wenn du sie hier fortsetzt, stoppt dieser Prozess und ein neuer startet auf derselben Session',
  copyText: 'Wenn du sie hier fortsetzt, startet ein zweiter Prozess auf derselben Session',
  copyIn: 'in',
  copyHandoverEnd: '.',
  copyEnd: '; beide können die Arbeit des anderen überschreiben.',
  copyInterrupts: ' Sie arbeitet gerade: der laufende Schritt wird abgebrochen.',
  copyTakeOver: 'Übernehmen',
  copyCreate: 'Kopie erzeugen',

  // CloudSessionBar
  cloudOpenFailed: 'Session konnte nicht geöffnet werden',
  cloudPlaceholder: 'Cloud-Session-ID oder claude.ai/code-URL',
  cloudSessions: 'Cloud-Sessions',
  cloudHint: 'Sessions auf anderen Rechnern erscheinen nur, wenn sie dort gestartet wurden mit',
  cloudInvalid: 'Erwartet eine Session-ID oder eine claude.ai/code-URL',
  cloudOnlyClaudeAi: 'Nur URLs der Form https://claude.ai/code/… sind erlaubt',
  cloudNoId: 'URL enthält keine gültige Session-ID',

  // CacheBadge
  cacheExpires: (countdown, ttlMin) => `Prompt-Cache läuft ab in ${countdown} (TTL ${ttlMin} min)`,
  cacheContext: (cached, window, percent) => `Kontext: ${cached} / ${window} Tokens (${percent}%)`,
  cacheHitsTitle: (hits, turns, percent) =>
    `Cache-Treffer: ${hits} von ${turns} Runden, ${percent}% der Eingabe-Tokens aus dem Cache gelesen`,
  cacheFill: 'Füllstand des Kontextfensters',
  cacheHits: (hits) => `${hits} Treffer`,
};
