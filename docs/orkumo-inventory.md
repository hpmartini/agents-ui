# Orkumo's Agents view in this package: inventory and plan

Source of truth: Orkumo `origin/main` at `a5a77db` (includes #309–#319), `components/AgentsView/**`.
Goal: that view, unchanged in behaviour, lives in this package. Orkumo and MAPLE both render it.
Every server capability it uses becomes a transport group. A transport without a group hides
that part of the UI. There are no placeholders.

Status per row:
- **vorhanden**: the package has the same behaviour.
- **teilweise**: the package has a reduced port.
- **fehlt**: nothing equivalent.
- **Transport**: what the component needs from the server, as transport groups (see §3).
- **Host**: what it needs from the host app (see §4).

## 1. Components (35 files, 13,884 lines)

| Orkumo file | Lines | Package today | Status | Transport | Host |
| --- | ---: | --- | --- | --- | --- |
| `AgentsView.tsx` | 3246 | `AgentsPanel.tsx` (list, start, stop, tabs) | teilweise | `agents`, `settings`, `manage`, `messaging`, `discovery`, `uploads`, `cloud`, `orchestrator`, `contexts`, `targets` | toast, navigation, palette, activity bar, header slot, board/issues, project settings, quick prompt/chat (Electron), document title |
| `AgentList.tsx` | 1320 | `AgentList.tsx` (flat rows, error states) | teilweise | — (data from view) | module icons for row actions |
| `AgentWorkspace.tsx` | 946 | `AgentWorkspace.tsx` (tabs, splits) | teilweise | `targets` | browser pane |
| `AgentTerminal.tsx` | 779 | `AgentTerminal.tsx` (xterm via `attach`) | teilweise | `pty`, `files`, `ghostty`, `targets` | terminal options (Ghostty theme), link routing |
| `AgentSettingsPanel.tsx` | 563 | — | fehlt | `settings`, `daemon` | toast |
| `AgentSummaryBar.tsx` | 482 | — | fehlt | — | palette shortcut label |
| `CacheBadge.tsx` | 64 | — | fehlt | — | — |
| `CloudSessionBar.tsx` | 64 | — | fehlt | `cloud` | — |
| `CopyWarningDialog.tsx` | 84 | `ConfirmDialog.tsx` (generic yes/no) | teilweise | — | — |
| `DirectoryPicker.tsx` | 195 | free-text folder in `StartAgentDialog` | fehlt | — | — |
| `DispatchInput.tsx` | 391 | `StartAgentDialog.tsx` (task, folder, name) | teilweise | `discovery`, `uploads` | — |
| `MainAgentDialog.tsx` | 81 | — | fehlt | `logs`, `messaging` | title-bar event |
| `ModelEffortPicker.tsx` | 250 | — | fehlt | `discovery` (models) | — |
| `NewTaskButton.tsx` | 148 | "New" button in list header | teilweise | `orchestrator` (roles) | issue kind |
| `PeekPanel.tsx` | 375 | — | fehlt | `logs`, `messaging` | toast, link routing |
| `ProjectsRail.tsx` | 253 | — | fehlt | — | nav (apps, modes, open code view) |
| `PullRequestModal.tsx` | 151 | — | fehlt | `contexts` | browser pane |
| `PullRequestsPage.tsx` | 275 | — | fehlt | `contexts` | URL query (`/pulls` route) |
| `PullRequestsPanel.tsx` | 353 | — | fehlt | `contexts` | — |
| `RailSwitch.tsx` | 34 | — | fehlt | — | — |
| `ResumePicker.tsx` | 159 | — | fehlt | `history` | — |
| `ServersPanel.tsx` | 246 | — | fehlt | `servers` | — |
| `SessionLinks.tsx` | 141 | — | fehlt | — | issue modal |
| `ShortcutsHelp.tsx` | 137 | — | fehlt | — | — |
| `index.ts` | 9 | `index.ts` | teilweise | — | — |
| `railOutlet.ts` | 7 | — | fehlt | — | Chats route (Orkumo) |
| `types.ts` | 15 | — | fehlt | — | — |
| `Chat/ChatPane.tsx` | 875 | `AgentTranscript.tsx` (plain text, polled) + `ChatInput.tsx` | teilweise | `chat`, `uploads`, `pty` | — |
| `Chat/ChatActivity.tsx` | 306 | — | fehlt | `chat` (shells) | — |
| `Chat/ChatArtifacts.tsx` | 570 | — | fehlt | `artifacts`, `files` | — |
| `Chat/ChatComposer.tsx` | 371 | `ChatInput.tsx` (auto-grow, Enter) | teilweise | `chat` (files, dirs) | — |
| `Chat/ChatMarkdown.tsx` | 271 | — | fehlt | `files` | — |
| `Chat/ChatMessages.tsx` | 409 | rows in `AgentTranscript.tsx` | teilweise | `chat` (images), `uploads` (image URLs) | — |
| `Chat/ChatStatusLine.tsx` | 118 | — | fehlt | `chat` (status) | — |
| `Chat/QuestionCard.tsx` | 196 | — | fehlt | `pty` (answers are keystrokes) | — |

Also moved, because only the view uses them or because they are the agent domain that other Orkumo
views read from the package afterwards:

- Composer: `CommandPalette/TaskComposerModal.tsx`, `ImageAttachments.tsx`, `ResizeGrip.tsx`,
  `CommandPalette/useDialogA11y.ts`, `UsageView/LimitBar.tsx`.
- Hooks: `useAgentSessions`, `useAgentContexts`, `useAgentWorkspace`, `useRailPreferences`,
  `useAgentFocusZone`, `useServerStats`, `useAutoGrowTextarea`, `useStoredToggle`.
- Utils: `agentSessions`, `agentCache`, `agentInput`, `agentDialog`, `agentDelete`,
  `agentWorkspace`, `sessionCopies`, `terminalKeys`, `terminalScreen`, `terminalLinkStyle`,
  `fileLinks`, `links`, `menuPosition`, `cloudSession`, `directoryGroups`, `modelMatrix`,
  `pullRequestQuery`, `chatEvents`, `chatActivity`, `chatComposer`, `chatHistory`
  (`relativeTime`), `highlight`, `composer`, `visiblePoll`, `openFile`, `imageFit`, `usage`.
- Types: the agent types from Orkumo's `types.ts`, and the chat types from `services/agentsApi.ts`
  (`ChatSummary`, `ChatStatus`, `ChatArtifact`, …).

These stay in Orkumo, because they are Orkumo's own wiring:
- `services/*` becomes Orkumo's transport.
- `utils/apiConfig`, `utils/backendTarget` and `utils/agentTarget` (multi-instance routing, behind
  `targets`).
- Board, CodingView, CommandPalette, ModeSwitcher, ModuleSlot, TitleBar and ProjectsSettings.

## 2. Server calls (Orkumo route → transport)

Line numbers refer to Orkumo `server/index.js`, unless another file is named.

| Capability | Orkumo calls | Orkumo route | Transport group | MAPLE server today |
| --- | --- | --- | --- | --- |
| Agent list | `fetchAgents`, `subscribeToAgents` (SSE `sessions`, `notify`, `agent-error`, `settings` → `onSettingsChanged`) | `GET /agents` :1487, `GET /agents/stream` :1535 | `agents` | `GET /api/agents/stream` (SSE `sessions`) |
| Start, stop | `dispatchAgent`, `stopAgent` | `POST /agents/dispatch` :1577, `POST /agents/:id/stop` :2039 | `agents` | yes (`panel-*` guard, cwd = vault) |
| View settings | `fetchAgentViewSettings`, `updateAgentViewSettings` (carries the `revision` it was read at) | `GET/PUT /settings/agent-view` :3004/:3012 | `settings` | — (host keeps them locally) |
| Terminal | PTY WebSocket: attach, harness start, resume, cloud args, shell | `WS /api/pty` :3294 | `pty` | `WS /api/pty` (`claude attach <id>` only) |
| Manage sessions | `renameAgent`, `pinAgent`, `reorderAgents`, `removeAgent`, `respawnAgent`, `fetchAgentsRawJson` | :2328, :2341, :1840, :2313, :2300, :1522 | `manage` | — |
| Daemon | `respawnAllAgents`, `stopAgentDaemon` | :1832, :1870 | `daemon` | — |
| Messages to agents | `replyToAgent`, `sendToPane`, `stopPane` | :2020, :2110, :2054 | `messaging` | — |
| Repo, PR, issue, server context | `fetchAgentContexts` | `GET /agents/context` :1884 | `contexts` (PR panel, PR page, repo chips) | — |
| Discovery | `fetchAgentRepos`, `fetchSubagents`, `fetchAgentCommands`, `fetchHarnesses`, `fetchHarnessModels` | :1982, :1940, :1969, :1853, :1960 | `discovery` | — |
| Resume | `fetchPastSessions` | `GET /agents/past` :2001 | `history` | — |
| Cloud session | `openCloudSession` | `POST /agents/cloud-session` :1805 | `cloud` | — |
| Peek | `fetchAgentLogs` | `GET /agents/:id/logs` :2011 | `logs` | — |
| Images, files | `uploadAttachment` (image or file), `agentImageUrl` | `POST /agents/images` :1592, `POST /agents/files` (agentFiles.js:87), `GET /agents/images/:name` :1604 | `uploads` | — |
| UI view (chat) | `openTranscriptView`, `subscribeToChat` (shared SSE + watch), `fetchChatHistory` (paging), `fetchChatStatus`, `fetchChatFiles`, `fetchChatDirs`, `fetchChatShell`, `chatImageUrl` | :1618, :1645, :1673/:1687, :1747, :1698, :1708, :1719, :1730, :1759 | `chat` | — (only `GET /agents/:id/transcript`, plain text) |
| Questions (Rückfragen) | none: the terminal screen is parsed, answers are keystrokes | PTY | `chat` + `pty` | (PTY yes, UI view no) |
| Prompt suggestion | none: ghost text read from the terminal buffer, taken with Tab | PTY | `chat` + `pty` | (PTY yes, UI view no) |
| Pending prompts | none: `devorbit_queue`/`devorbit_sent` events of the chat stream | chat SSE | `chat` | — |
| Artifacts | `fetchChatArtifacts`, `fetchChatArtifactContent` | :1780, :1792 | `artifacts` | — |
| Dev servers | `fetchOrphanServers`, `stopOrphanServer`, `fetchServerStats` | :1906, :1925, :1893 | `servers` | — |
| Roles, orchestrator | `fetchOrchestratorRoles`, `fetchOrchestratorWorkspace`, `startOrchestrator` | :2228, :2218, :2273 | `orchestrator` | — (MAPLE's `/api/orchestrator/*` is a different thing: `claude -p` runs) |
| Open file | `openFile` | `POST /files/open`, `/files/open-in-editor` (fileOpenRoutes.js:196/:204) | `files` | — |
| Ghostty | `GET /terminal/ghostty` (theme), `POST /terminal/ghostty/open` | ghosttyRoutes.js:27/:39 | `ghostty` (open); the theme is a host prop | — |
| Instances (#220) | `targetOf`, `pinTarget`, `useAgentTarget` | module relay `/api/modules/<id>/…` | `targets` | — (always local) |
| Board, issues | `fetchBoard`, `getWorkflowProvider`, `fetchRepoPath` | :2375, :2500, :2431 | host (Orkumo's board) | — |

There is no dedicated PR endpoint and no merge call. PR rows come from `contexts`, plus each
session's `links`.

## 3. Transport contract

`AgentsTransport` (in `src/transport.ts`) is required for `agents`, `settings` and `pty`. Every
other group is optional; its presence is the capability flag. Inside a group, method names and
signatures are those of Orkumo's `services/agentsApi.ts`. Orkumo's transport is therefore those
functions, grouped:

```ts
interface AgentsTransport {
  agents: { fetchAgents; subscribeToAgents; dispatchAgent; stopAgent };
  settings: { fetchAgentViewSettings; updateAgentViewSettings };
  pty: { open(request: PtyRequest): WebSocket };    // agent attach, harness start, shell
  manage?: { renameAgent; pinAgent; reorderAgents; removeAgent; respawnAgent; fetchAgentsRawJson };
  daemon?: { respawnAllAgents; stopAgentDaemon };
  messaging?: { replyToAgent; sendToPane; stopPane; startHandoffReset?; fetchHandoffReset?; cancelHandoffReset? };
  contexts?: { fetchAgentContexts };
  discovery?: { fetchAgentRepos; fetchSubagents; fetchAgentCommands; fetchHarnesses; fetchHarnessModels };
  history?: { fetchPastSessions };
  cloud?: { openCloudSession };
  logs?: { fetchAgentLogs };
  uploads?: { uploadAttachment; agentImageUrl };
  chat?: { openTranscriptView; subscribeToChat; fetchChatHistory; fetchChatStatus;
           fetchChatFiles; fetchChatDirs; fetchChatShell; chatImageUrl };
  artifacts?: { fetchChatArtifacts; fetchChatArtifactContent };
  servers?: { fetchOrphanServers; stopOrphanServer; fetchServerStats };
  orchestrator?: { fetchOrchestratorRoles; fetchOrchestratorWorkspace; startOrchestrator };
  files?: { openFile };
  ghostty?: { openInGhostty };
  targets?: { useAgentTarget; getAgentTarget; targetOf; pinTarget };
}
```

`settings` is required, because the view reads its layout from it. A host without a server store
uses the package's `createLocalSettings(storageKey)` (localStorage, Orkumo's defaults).

## 4. Host seams

Orkumo-specific UI and behaviour enter through one `host` prop (`AgentsHost`). Nothing in the
package imports a router, a toast library or `window.electronAPI`:

| Seam | Orkumo today | In the package |
| --- | --- | --- |
| Notifications | `react-hot-toast` | `host.toast` (`success`, `error`, `dismiss`) |
| Navigation | `useNavigate` to `/code`, `/board`, module modes, `/pulls` | `host.openCode`, `openBoard`, `openMode`, `openPulls`, `openProjectSettings`, `openPullRequestCode`; a missing callback hides its menu entry |
| Deep links | `?attach=`, router state prefill | `selectedId`, `onSelectedIdChange`, `prefill` props |
| Command palette | `useRegisterCommands`, `useCommandPalette().isOpen` | `host.useRegisterCommands`, `host.usePaletteOpen` |
| Activity bar, module slot | `ModeSwitcher`, `AgentsRailSlot` | `host.activityBar`, `host.headerSlot` |
| Board | `fetchBoard`, `deriveAgentLinks`, `IssueModal`, `IssueCreateModal`, workflow provider | `host.useIssues(sessions)`, `host.renderIssueModal`, `host.renderIssueCreate` |
| Browser pane | `CodingView/BrowserPreviewPanel` | `host.renderBrowser` |
| Terminal look | `useGhosttyTheme` (`/terminal/ghostty`) | `host.terminalOptions`; without it, the `--agents-*` CSS variables |
| Electron quick window | `electronAPI.onQuickPrompt`, `onQuickChat` | `host.onQuickPrompt`, `host.onQuickChat` (subscribe functions) |
| Window title | `document.title` | `host.onAttention(count)` |
| App shell | `nav`, `children`, `railOutlet`, `PullRequestsDataContext` | same props; all optional, so MAPLE renders the bare view |

The MAPLE features of the package stay as props of the full view: `canStop`, `confirmStop`,
`selectedId`/`onSelectedIdChange`, list error states (401/403, 5xx, other), `storageKey`,
`ResizeHandle`, and the root class `.agents-ui` with `--agents-*` theming.

## 5. Decisions and assumptions

- **Delivery.** Hape decided on 18.11. to make this repo public, after a gitleaks scan of the
  whole history found only false positives. Orkumo (public) and MAPLE both pin the same git tag
  (`github:hpmartini/agents-ui#v0.4.9`), and neither CI needs a key.
- **Styling.** Orkumo styles with the Tailwind v3 Play CDN, using its own `gray` scale. The moved
  components keep their classes unchanged. The package compiles them with Tailwind v4 (no
  preflight) for hosts without Orkumo's CDN, and its `gray` scale is Orkumo's, as
  `--agents-gray-*` variables. Orkumo does not import `styles.css`.
- **Texts (Hape, 18.11.).** Every text goes through `src/labels/{shell,terminal,panels}.ts`. `en`
  is Orkumo's wording verbatim, including the texts that are already German there, and Orkumo
  renders `en`. `de` is for MAPLE (`locale="de"`). Product names, CLI commands and shortcuts stay as
  they are.
- **Removed reduced ports.** `AgentsPanel`, `StartAgentDialog`, `ChatInput`, `AgentTranscript`
  and the old `labels`, plus the HTTP and IPC transports. MAPLE supplies its own transport. The
  mock transport stays for the demo and the tests.
- **Terminals.** `pty.attach` attaches to a listed agent. `pty.spawn` starts the terminals of
  client-side sessions: interactive harnesses, `--resume`, `--continue` and `--cloud`. Without
  `spawn`, the view offers background dispatch only (MAPLE).
- **Tests.** Tests of moved components and utils move here. Orkumo's tests that render
  Orkumo-side parts (Chats route, board dialogs, PTY spawn of the server) stay in Orkumo.
- **MAPLE's plain transcript view (#613).** Orkumo's UI view replaces it. MAPLE's server serves
  the `chat` stream and history from the Claude transcript. Status line, file completion, shells
  and images are optional parts of `chat` that MAPLE leaves out.
