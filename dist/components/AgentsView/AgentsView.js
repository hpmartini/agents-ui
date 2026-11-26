import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Settings, Settings2, HelpCircle, RefreshCw, Braces, AlertTriangle, Power, X, ArrowLeft, Network, PanelLeftClose, PanelLeftOpen, } from 'lucide-react';
import { useAgentSessions } from '../../hooks/useAgentSessions';
import { useAgentWorkspace } from '../../hooks/useAgentWorkspace';
import { LOCAL_TARGETS } from '../../transport';
import { useAgentContexts } from '../../hooks/useAgentContexts';
import { useHost, useTransport, } from '../../host';
import { useRailPreferences, groupNeighbour, isFoldedAway, FAVORITES_GROUP_KEY, } from '../../hooks/useRailPreferences';
import { FOCUS_CHORD_LABEL, useAgentFocusZone } from '../../hooks/useAgentFocusZone';
import { useStoredToggle } from '../../hooks/useStoredToggle';
import { openInSystemBrowser } from '../../utils/links';
import { RailSwitch } from './RailSwitch';
import { RailOutletContext } from './railOutlet';
import { confirmDelete } from '../../utils/agentDelete';
import { parseDispatchInput, parseFilter, applySessionFilter, isUntrustedWorkspaceError, } from '../../utils/agentInput';
import { agentFolder, groupSessions, railItems, documentTitle, applyQuickFilters, applyTextQuery, applyLinkFilter, collectLinkEntries, sessionsInContext, matchesQuickFilter, mergeServers, collectPullRequests, summarizeContext, formatModelName, groupRepoSlug, DEFAULT_SORT, QUICK_FILTERS, SORT_OPTIONS, harnessLabel, HARNESSES, sessionHarness, withBranchPullRequests, sessionsWithBranchPullRequests, terminalResumeArgs, UI_VIEW_HARNESSES, HARNESS_MODEL_FLAG, isOmpStoreSession, withOrchestratorSessions, isOrchestrator, orchestratorKey, withoutOrchestrator, orchestratorRole, withoutOrchestratorRole, ORCHESTRATORS_GROUP_KEY, } from '../../utils/agentSessions';
import { AgentList } from './AgentList';
import { FoldButtons, GROUP_MODES, GroupingPicker, ProjectsSection, } from './ProjectsRail';
import { NewTaskButton } from './NewTaskButton';
import { AgentSummaryBar, AgentFilterBar } from './AgentSummaryBar';
import { PullRequestsPanel } from './PullRequestsPanel';
import { PullRequestModal } from './PullRequestModal';
import { PullRequestsDataContext } from './PullRequestsPage';
import { ServersPanel } from './ServersPanel';
import { TaskComposerModal } from '../CommandPalette/TaskComposerModal';
import { isMac } from '../../utils/platform';
import { CloudSessionBar } from './CloudSessionBar';
import { PeekPanel } from './PeekPanel';
import { AgentWorkspace } from './AgentWorkspace';
import { SessionLinks } from './SessionLinks';
import { ResumePicker } from './ResumePicker';
import { CopyWarningDialog } from './CopyWarningDialog';
import { useLabels } from '../../labels';
import { collapseCopies, openPlan, resumeMakesCopy, transcriptHolder, } from '../../utils/sessionCopies';
import { ShortcutsHelp } from './ShortcutsHelp';
import { AgentSettingsPanel } from './AgentSettingsPanel';
import { composerStartCwd, issueDraftToTask, promptWithAttachments, taskToIssueDraft, } from '../../utils/composer';
import { DirectoryPicker } from './DirectoryPicker';
import { MAIN_AGENT_EVENT, MainAgentDialog } from './MainAgentDialog';
import { ConfirmDialog } from './ConfirmDialog';
const noop = () => { };
const NO_APPS = [];
const NO_ISSUES = {
    byAgent: undefined,
    workflowIssues: new Map(),
    titles: new Map(),
    workflowName: null,
};
// Stand-ins for host hooks it does not have; called as hooks, so a host must not toggle them
const noIssues = () => NO_ISSUES;
const paletteClosed = () => false;
const registerNothing = noop;
const DISPATCH_CWD_STORAGE_KEY = 'devOrbitAgentDispatchCwd';
const SORT_STORAGE_KEY = 'devOrbitAgentSort';
const INTERACTIVE_STORAGE_KEY = 'devOrbitAgentInteractive';
/**
 * Terminal session no Orkumo pane runs (started elsewhere, often by another agent, or ended):
 * hidden in the rail unless switched on. `panes`: this view's own pane rows, never hidden.
 */
const isHiddenInteractive = (s, panes) => s.kind === 'interactive' && !s.paneId && !panes.has(s.id);
function loadSort() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SORT_STORAGE_KEY) || 'null');
        if (SORT_OPTIONS.some((o) => o.key === parsed?.key) && /^(asc|desc)$/.test(parsed?.dir)) {
            return parsed;
        }
    }
    catch {
        // unavailable or corrupt storage: use the default
    }
    return DEFAULT_SORT;
}
function isEditableTarget(target) {
    const el = target;
    if (!el)
        return false;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}
function isInsideTerminal(target) {
    const el = target;
    return !!el?.closest?.('.xterm');
}
/** New task: Cmd+N on macOS (also in a terminal), Ctrl+N elsewhere outside a terminal (the shell's there) */
export function isNewTaskKey(e) {
    if (e.code !== 'KeyN' || e.altKey || e.shiftKey)
        return false;
    return isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey && !isInsideTerminal(e.target);
}
/**
 * Hands a briefing to a running agent: replied to a background job, typed into a pane; false
 * when it runs outside Orkumo and cannot be reached, or the transport cannot message agents
 */
async function briefSession(messaging, session, text) {
    if (!messaging)
        return false;
    if (session.kind === 'background') {
        await messaging.replyToAgent(session.id, text);
        return true;
    }
    const pane = session.kind === 'interactive'
        ? session.paneId || (sessionHarness(session) !== 'claude' ? session.id : null)
        : null;
    if (!pane)
        return false;
    await messaging.sendToPane(pane, text);
    return true;
}
/**
 * Browser counterpart of `claude agents`: session list, dispatch input, peek panel
 * and attached sessions in tabs / tiles.
 */
export const AgentsView = ({ active = true, apps = NO_APPS, onExit, nav, onOpenView = noop, contextId, contextAppIds, children, railOutlet = false, selectedId, onSelectedIdChange, prefill: prefillProp, onPrefillConsumed, canStop, confirmStop = false, className = '', }) => {
    const host = useHost();
    const t = useLabels().shell;
    const { toast, openCode, openBoard, openMode, openPulls, openProjectSettings, fetchRepoPath, renderIssueModal, renderIssueCreate, onQuickPrompt, onQuickChat, onAttention, } = host;
    const transport = useTransport();
    const { agents: agentsApi, manage, messaging, orchestrator, discovery, cloud, uploads, history, } = transport;
    const targets = transport.targets ?? LOCAL_TARGETS;
    // The transport can start a terminal session itself (`pty.spawn`): interactive claude, other
    // harnesses, `--resume` in a terminal, cloud sessions, agent and chat starts that attach. Without
    // it (MAPLE) the view only dispatches Claude Code in the background.
    const canSpawn = !!transport.pty.spawn;
    // Peek and the main agent dialog (a peek) read the session's recent output
    const peekAvailable = !!transport.logs;
    const canShell = !!transport.pty.shell;
    const paletteOpen = (host.usePaletteOpen ?? paletteClosed)();
    const { sessions: listed, listTarget, daemon, userSettings, cliInstalled, capabilities, settings, updateSettings, loading, error, errorStatus, received, connected, counts, lastCompleted, refresh, } = useAgentSessions({ active: true });
    const contexts = useAgentContexts(true, listed);
    // Every harness gets the PRs of its branch, not only Claude jobs that report links
    const sessions = useMemo(() => sessionsWithBranchPullRequests(listed, contexts), [listed, contexts]);
    const [input, setInput] = useState('');
    const [hint, setHint] = useState(null);
    const [selectedKey, setSelectedKey] = useState(null);
    const [peekId, setPeekId] = useState(null);
    // Issue pill clicked: issue as modal over the agents view (#104)
    const [issueModalKey, setIssueModalKey] = useState(null);
    const { workspace, parked, openIds: openIdSet, attach: attachPane, closePane, prune: pruneMissing, views: paneViews, setView: setPaneView, ...workspaceActions } = useAgentWorkspace(contextId);
    const { openShell } = workspaceActions;
    const [expandedCompleted, setExpandedCompleted] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    // chat: the picked session opens in the UI view (#189)
    const [resumePicker, setResumePicker] = useState({
        open: false,
        query: '',
    });
    const [composerOpen, setComposerOpen] = useState(false);
    // 'agent' = New agent (#105): interactive session in composerCwd, attached right away
    // 'chat' = New chat (#189): the same agent, shown in the UI view
    const [composerMode, setComposerMode] = useState('task');
    // Directory handed over on open (a group's "New agent here") and one picked in the composer; a
    // pick outlives switching between Task, Agent and Chat, a new open starts from the defaults
    const [openCwd, setOpenCwd] = useState(null);
    const [pickedCwd, setPickedCwd] = useState(null);
    // Harness of the next agent (#195), preset from the default on every open
    // null follows the default harness, also when the settings arrive after the composer opened
    const [pickedHarness, setComposerHarness] = useState(null);
    // Other harnesses only run in a terminal this view starts
    const composerHarness = canSpawn ? (pickedHarness ?? settings.dispatch.harness) : 'claude';
    const [harnessInstalled, setHarnessInstalled] = useState({});
    useEffect(() => {
        discovery
            ?.fetchHarnesses()
            .then((list) => setHarnessInstalled(Object.fromEntries(list.map((h) => [h.id, h.installed]))))
            .catch(() => { });
    }, [discovery]);
    const [composerImages, setComposerImages] = useState([]);
    // Model of the next agent or chat (#19 AK-2); '' = the default (settings.dispatch.model)
    const [composerModel, setComposerModel] = useState('');
    // Effort picked in the model × effort matrix, '' = default
    const [composerEffort, setComposerEffort] = useState('');
    // New agent "Orchestrator": Remote Control on (Claude app); workers start without
    const [composerOrchestrator, setComposerOrchestrator] = useState(false);
    const [homeDir, setHomeDir] = useState(null);
    // Where chats without a project run (#19 AK-1): `<data>/chats` of the agent target; `discovered`
    // once the discovery data is in (an older host has no chats folder)
    const [chatsDir, setChatsDir] = useState(null);
    const [discovered, setDiscovered] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const [pickDirOpen, setPickDirOpen] = useState(false);
    /** Main agent dialog (#252): opened from the title bar or the palette in every view */
    const [mainAgentOpen, setMainAgentOpen] = useState(false);
    useEffect(() => {
        if (!peekAvailable)
            return;
        const open = () => setMainAgentOpen(true);
        window.addEventListener(MAIN_AGENT_EVENT, open);
        return () => window.removeEventListener(MAIN_AGENT_EVENT, open);
    }, [peekAvailable]);
    /** Directory picker for a new fixed project (#253) */
    const [pickFixedOpen, setPickFixedOpen] = useState(false);
    const [dispatching, setDispatching] = useState(false);
    const [highlightedId, setHighlightedId] = useState(null);
    const [subagents, setSubagents] = useState([]);
    const [repos, setRepos] = useState([]);
    const [commands, setCommands] = useState([]);
    // omp's own `/` list (skills, file commands) for the composer, fetched per start directory
    const [ompCommands, setOmpCommands] = useState([]);
    const [defaultCwd, setDefaultCwd] = useState(null);
    // Cloud/remote PTY tabs live client-side only (not in the `claude agents` list)
    const [cloudSessions, setCloudSessions] = useState([]);
    // #220: panes opened on another instance stay renderable (and unpruned) after the picker
    // switches; `seen` keeps the last known copy of every session
    const agentTarget = targets.useAgentTarget();
    const [seen, setSeen] = useState(new Map());
    useEffect(() => {
        setSeen((prev) => {
            const next = new Map(prev);
            sessions.forEach((s) => next.set(s.id, s));
            return next;
        });
    }, [sessions]);
    const foreignPanes = useMemo(() => [...seen.values()].filter((s) => targets.targetOf(s.id) !== agentTarget), [seen, agentTarget, targets]);
    const [dispatchCwd, setDispatchCwd] = useState(() => localStorage.getItem(DISPATCH_CWD_STORAGE_KEY));
    const [now, setNow] = useState(Date.now());
    // Terminal sessions no Orkumo pane runs (often started by other agents) crowd the rail: hidden until switched on
    const [showInteractive, toggleInteractive] = useStoredToggle(INTERACTIVE_STORAGE_KEY);
    const inputRef = useRef(null);
    const ctrlCRef = useRef(0);
    const hintTimerRef = useRef(null);
    // ---------------------------------------------------------------------
    // Derived data
    // ---------------------------------------------------------------------
    const filter = useMemo(() => parseFilter(input), [input]);
    // Harness agents (#195) started here are listed from this view's state until the server lists
    // their session (omp: from its session store, matched to the pane that runs it)
    const listedSessions = useMemo(() => {
        const claimed = new Set(sessions.map((s) => s.paneId).filter(Boolean));
        return [
            ...sessions,
            ...cloudSessions.filter((s) => sessionHarness(s) !== 'claude' && !claimed.has(s.id)),
        ];
    }, [sessions, cloudSessions]);
    // After a reload the client rows of panes are gone while their agents still run (closing or
    // reloading only detaches): the server rows that name a pane stand in for it, so it reattaches
    const paneStandIns = useMemo(() => {
        const known = new Set(cloudSessions.map((s) => s.id));
        return sessions.flatMap((s) => {
            if (s.kind !== 'interactive' || !s.paneId || known.has(s.paneId))
                return [];
            targets.pinTarget(s.paneId, targets.targetOf(s.id));
            return [
                {
                    ...s,
                    id: s.paneId,
                    paneId: null,
                    // only used if the agent ended meanwhile: the pane then resumes its session
                    ptyArgs: s.ptyArgs ?? (s.sessionId ? ['--resume', s.sessionId] : []),
                },
            ];
        });
    }, [sessions, cloudSessions, targets]);
    const visibleSessions = useMemo(() => applySessionFilter(listedSessions, filter), [listedSessions, filter]);
    const railRef = useRef(null);
    // Rail column handed to `children` while `railOutlet` (RailOutletContext), with or without workspace
    const [outlet, setOutlet] = useState(null);
    const outletShown = railOutlet;
    // Side panel (agents rail or a route's outlet) hidden from md up, like VS Code's sidebar
    const [railCollapsed, toggleRail] = useStoredToggle('orkumo.railCollapsed');
    const viewRef = useRef(null);
    // Cmd+B on macOS, Ctrl+B elsewhere outside a terminal (Ctrl+B belongs to the shell there).
    // A host without an app shell (activity bar) keeps Cmd+B for itself outside this view.
    const appShell = !!host.renderActivityBar;
    useEffect(() => {
        const onKey = (e) => {
            if (e.code !== 'KeyB' || e.altKey || e.shiftKey)
                return;
            if (isMac ? !e.metaKey || e.ctrlKey : !e.ctrlKey || e.metaKey)
                return;
            if (!isMac && e.target instanceof HTMLElement && e.target.closest('.xterm'))
                return;
            if (!appShell && !(e.target instanceof Node && viewRef.current?.contains(e.target)))
                return;
            e.preventDefault();
            e.stopPropagation();
            toggleRail();
        };
        window.addEventListener('keydown', onKey, { capture: true });
        return () => window.removeEventListener('keydown', onKey, { capture: true });
    }, [toggleRail, appShell]);
    const { zone: focusZone, focusZone: moveFocus } = useAgentFocusZone(active, railRef);
    const servers = useMemo(() => new Map(sessions.map((s) => [s.id, mergeServers(s, apps, contexts[s.id])])), [sessions, apps, contexts]);
    // Agent -> board issue chips from the host's board; none without it
    const { byAgent: issuesByAgent, workflowIssues, titles: issueTitles, workflowName, } = (host.useIssues ?? noIssues)(sessions);
    const lookup = useMemo(() => ({ contexts, servers, workflowIssues, workflowName, now }), [contexts, servers, workflowIssues, workflowName, now]);
    const [panel, setPanel] = useState(null);
    useEffect(() => {
        if (!active)
            setPanel(null);
    }, [active]);
    const [prRepo, setPrRepo] = useState(null);
    // PR pill -> exactly that session's PR(s); the overview opens from the summary bar
    const [prModal, setPrModal] = useState(null);
    const pullRows = useMemo(() => collectPullRequests(sessions, contexts), [sessions, contexts]);
    const serverRows = useMemo(() => {
        const seen = new Set();
        const rows = [];
        for (const s of sessions) {
            for (const server of servers.get(s.id) || []) {
                if (!server.running || seen.has(server.port))
                    continue;
                seen.add(server.port);
                rows.push({ server, agentId: s.id, agentName: s.name });
            }
        }
        return rows.sort((a, b) => a.server.port - b.server.port);
    }, [sessions, servers]);
    const [sort, setSortState] = useState(loadSort);
    const setSort = useCallback((next) => {
        setSortState(next);
        try {
            localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(next));
        }
        catch {
            // sort stays in memory only
        }
    }, []);
    const [quickFilters, setQuickFilters] = useState(() => new Set());
    const toggleQuickFilter = useCallback((key) => {
        setQuickFilters((prev) => {
            const next = new Set(prev);
            if (!next.delete(key))
                next.add(key);
            return next;
        });
    }, []);
    const [linkFilter, setLinkFilter] = useState(() => new Set());
    const toggleLinkFilter = useCallback((key) => {
        setLinkFilter((prev) => {
            const next = new Set(prev);
            if (!next.delete(key))
                next.add(key);
            return next;
        });
    }, []);
    const [textQuery, setTextQuery] = useState('');
    const filterActive = quickFilters.size > 0 || linkFilter.size > 0 || !!textQuery.trim();
    const contextSessions = useMemo(() => sessionsInContext(visibleSessions, apps, contextAppIds, lookup), [visibleSessions, apps, contextAppIds, lookup]);
    const linkEntries = useMemo(() => collectLinkEntries(contextSessions, issuesByAgent, lookup, issueTitles), [contextSessions, issuesByAgent, lookup, issueTitles]);
    // One row per agent; terminal sessions no Orkumo pane runs only when switched on
    const agentRows = useMemo(() => collapseCopies(contextSessions), [contextSessions]);
    const paneRowIds = useMemo(() => new Set(cloudSessions.map((s) => s.id)), [cloudSessions]);
    const railSessions = useMemo(() => showInteractive ? agentRows : agentRows.filter((s) => !isHiddenInteractive(s, paneRowIds)), [agentRows, showInteractive, paneRowIds]);
    const interactiveCount = useMemo(() => agentRows.filter((s) => isHiddenInteractive(s, paneRowIds)).length, [agentRows, paneRowIds]);
    const shownSessions = useMemo(() => applyTextQuery(applyQuickFilters(applyLinkFilter(railSessions, linkFilter, issuesByAgent, lookup), quickFilters, lookup), textQuery, issuesByAgent, lookup, issueTitles), [railSessions, linkFilter, issuesByAgent, quickFilters, lookup, textQuery, issueTitles]);
    const chipCounts = useMemo(() => {
        const result = {};
        for (const { key } of QUICK_FILTERS) {
            result[key] = sessions.filter((s) => matchesQuickFilter(key, s, lookup)).length;
        }
        return result;
    }, [sessions, lookup]);
    const totals = useMemo(() => summarizeContext(sessions, lookup), [sessions, lookup]);
    // An active quick filter must not hide its matches inside collapsed groups
    const rail = useRailPreferences(settings.grouping, contextId);
    const { arrange, toggleCollapsed, moveGroup, moveSession, toggleFavoriteGroup, toggleFavoriteSession, favoriteGroups, } = rail;
    const collapsed = useMemo(() => (filterActive ? new Set() : rail.collapsed), [rail.collapsed, filterActive]);
    const groups = useMemo(() => 
    // Orchestrators stay pinned above everything, favorites included
    withOrchestratorSessions(arrange(groupSessions(shownSessions, settings.grouping, {
        // Filtering for Completed means the user wants all of them, not "… N more"
        expandedCompleted: expandedCompleted || quickFilters.has('completed'),
        sort,
        lookup,
        apps,
        // A filter asks for agents: empty fixed projects would only be in the way
        fixedProjects: filterActive ? [] : rail.fixedProjects,
    }), sort.key === 'manual'), settings.orchestrators
    // Built-in groups carry their `en` title: the locale's replaces it
    ).map((g) => (t.groupTitles[g.key] ? { ...g, title: t.groupTitles[g.key] } : g)), [
        shownSessions,
        filterActive,
        settings.grouping,
        settings.orchestrators,
        expandedCompleted,
        quickFilters,
        sort,
        lookup,
        apps,
        arrange,
        rail.fixedProjects,
        t,
    ]);
    // Session of the active workspace tab: marked and revealed in the rail
    const activeSessionId = useMemo(() => {
        const id = workspace.tabs.find((t) => t.id === workspace.activeTabId)?.activeSessionId;
        // A harness pane started here is represented by the server row that claimed it (#195)
        return (id && sessions.find((s) => s.id === id || s.paneId === id)?.id) || null;
    }, [workspace.tabs, workspace.activeTabId, sessions]);
    const appsById = useMemo(() => new Map(apps.map((a) => [a.id, a])), [apps]);
    const items = useMemo(() => railItems(groups, collapsed, settings.grouping), [groups, collapsed, settings.grouping]);
    const itemKey = (item) => item.type === 'group'
        ? `group:${item.group.key}`
        : item.type === 'more'
            ? `more:${item.group.key}`
            : item.session.id;
    const selectedIndex = useMemo(() => {
        const index = items.findIndex((item) => itemKey(item) === selectedKey);
        if (index >= 0)
            return index;
        const firstSession = items.findIndex((item) => item.type === 'session');
        return firstSession >= 0 ? firstSession : items.length > 0 ? 0 : -1;
    }, [items, selectedKey]);
    const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : null;
    const selectedSession = selectedItem?.type === 'session' ? selectedItem.session : null;
    const peekSession = peekId ? (sessions.find((s) => s.id === peekId) ?? null) : null;
    // Item that was selected when a directory was chosen explicitly: that choice beats the selection's cwd until the selection changes
    const [cwdPickedFor, setCwdPickedFor] = useState(null);
    const selectedItemKey = selectedItem ? itemKey(selectedItem) : null;
    const pickDispatchCwd = useCallback((cwd) => {
        setDispatchCwd(cwd);
        setCwdPickedFor(selectedItemKey);
    }, [selectedItemKey]);
    const targetCwd = useMemo(() => {
        if ((settings.grouping === 'directory' || settings.grouping === 'project') &&
            selectedItem &&
            cwdPickedFor !== selectedItemKey) {
            if (selectedItem.type === 'group' && selectedItem.group.cwd)
                return selectedItem.group.cwd;
            if (selectedItem.type === 'session')
                return selectedItem.session.cwd;
        }
        return dispatchCwd || settings.scopeCwd || defaultCwd;
    }, [
        settings.grouping,
        selectedItem,
        selectedItemKey,
        cwdPickedFor,
        dispatchCwd,
        settings.scopeCwd,
        defaultCwd,
    ]);
    // Start directory of new tasks (settings `taskCwd`, `~` = home); unset: the rail selection decides
    const taskCwd = settings.taskCwd?.replace(/^~(?=\/|$)/, homeDir ?? '~') || null;
    const openComposer = useCallback((mode, cwd = null) => {
        // Agent and chat start a session and attach it right away: a terminal this view starts
        setComposerMode(canSpawn ? mode : 'task');
        setOpenCwd(cwd);
        setPickedCwd(null);
        setComposerHarness(null);
        setComposerModel('');
        setComposerEffort('');
        setComposerOrchestrator(false);
        setComposerOpen(true);
    }, [canSpawn]);
    // Quick window (#251): its prompt opens the chat composer here, ready to send, without a project
    useEffect(() => canSpawn
        ? onQuickPrompt?.((text) => {
            onOpenView();
            setInput(text);
            openComposer('chat', chatsDir);
        })
        : undefined, [canSpawn, onQuickPrompt, onOpenView, openComposer, chatsDir]);
    // What the composer shows is what every start path uses
    const composerCwd = composerStartCwd(composerMode, {
        picked: pickedCwd,
        opened: openCwd,
        taskCwd,
        targetCwd,
        homeDir,
    });
    useEffect(() => {
        if (!discovery || !composerOpen || composerHarness !== 'omp' || !composerCwd)
            return;
        let cancelled = false;
        discovery
            .fetchAgentCommands(composerCwd, 'omp')
            .then((list) => !cancelled && setOmpCommands(list))
            .catch(() => !cancelled && setOmpCommands([]));
        return () => {
            cancelled = true;
        };
    }, [discovery, composerOpen, composerHarness, composerCwd]);
    // GitHub repos of the known sessions
    const issueRepos = useMemo(() => [...new Set(Object.values(contexts).map((c) => c.repo?.slug))].filter((slug) => !!slug), [contexts]);
    const selectedRepo = selectedItem?.type === 'group'
        ? groupRepoSlug(selectedItem.group, contexts)
        : selectedItem?.type === 'session'
            ? contexts[selectedItem.session.id]?.repo?.slug || null
            : null;
    // repo null: the host picks one (Orkumo: the repo used last)
    const openIssueDialog = useCallback((repo) => setIssueDialog({ repo }), []);
    const directoryChoices = useMemo(() => {
        const seen = new Map();
        for (const repo of repos)
            seen.set(repo.path, repo);
        for (const app of apps)
            if (!seen.has(app.path))
                seen.set(app.path, { name: app.name, path: app.path, source: 'app' });
        for (const session of sessions)
            if (!seen.has(session.cwd))
                seen.set(session.cwd, {
                    name: session.cwd.split('/').pop() || session.cwd,
                    path: session.cwd,
                    source: 'session',
                });
        return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [repos, apps, sessions]);
    // ---------------------------------------------------------------------
    // Effects
    // ---------------------------------------------------------------------
    useEffect(() => {
        if (dispatchCwd)
            localStorage.setItem(DISPATCH_CWD_STORAGE_KEY, dispatchCwd);
        else
            localStorage.removeItem(DISPATCH_CWD_STORAGE_KEY);
    }, [dispatchCwd]);
    // Tick for ages
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 10000);
        return () => clearInterval(interval);
    }, []);
    // Window title, through the host
    useEffect(() => {
        if (!active || !onAttention)
            return;
        onAttention(documentTitle(counts.awaitingInput, t.documentTitle));
        return () => onAttention(null);
    }, [active, counts.awaitingInput, onAttention, t]);
    // Discovery data (subagents, repos, slash commands) follows the scope
    useEffect(() => {
        if (!active)
            return;
        // Nothing to wait for without discovery (no chats folder will come)
        if (!discovery) {
            setDiscovered(true);
            return;
        }
        let cancelled = false;
        const scope = settings.scopeCwd;
        Promise.all([
            discovery.fetchSubagents(scope).catch(() => []),
            discovery.fetchAgentRepos(scope).catch(() => ({
                cwd: null,
                repos: [],
                home: undefined,
                chats: undefined,
            })),
            discovery.fetchAgentCommands(scope).catch(() => []),
        ]).then(([agentsList, repoData, commandList]) => {
            if (cancelled)
                return;
            setSubagents(agentsList);
            setRepos(repoData.repos);
            setDefaultCwd(repoData.cwd);
            if (repoData.home)
                setHomeDir(repoData.home);
            if (repoData.chats)
                setChatsDir(repoData.chats);
            setDiscovered(true);
            setCommands(commandList);
        });
        return () => {
            cancelled = true;
        };
    }, [active, discovery, settings.scopeCwd, sessions.length]);
    // Drop tabs for sessions that no longer exist; right after a switch `sessions` still holds the
    // previous instance's list for one render, so only a list of the picked target counts
    const listIsCurrent = listTarget === agentTarget;
    useEffect(() => {
        if (loading || !listIsCurrent || sessions.length === 0)
            return;
        pruneMissing(new Set([...sessions, ...cloudSessions, ...paneStandIns, ...foreignPanes].map((s) => s.id)));
    }, [sessions, cloudSessions, paneStandIns, foreignPanes, loading, listIsCurrent, pruneMissing]);
    // Forget open row details of removed sessions; a scoped (--cwd) or failed list is incomplete
    const { pruneExpandedSessions } = rail;
    useEffect(() => {
        if (loading || !listIsCurrent || error || settings.scopeCwd || sessions.length === 0)
            return;
        pruneExpandedSessions([...sessions, ...cloudSessions].map((s) => s.id));
    }, [
        sessions,
        cloudSessions,
        loading,
        listIsCurrent,
        error,
        settings.scopeCwd,
        pruneExpandedSessions,
    ]);
    const showHint = useCallback((text, tone = 'info', ttl = 4000) => {
        setHint({ text, tone });
        if (hintTimerRef.current)
            clearTimeout(hintTimerRef.current);
        hintTimerRef.current = setTimeout(() => setHint(null), ttl);
    }, []);
    // ---------------------------------------------------------------------
    // Workspace (tabs)
    // ---------------------------------------------------------------------
    // Small screens show either the session list or the workspace; attaching switches to the workspace
    const [narrowWorkspace, setNarrowWorkspace] = useState(false);
    const attach = useCallback((id) => {
        attachPane(id);
        setSelectedKey(id);
        setNarrowWorkspace(true);
        // From board/code/module modes/dashboard: the tab only shows on the agents route
        if (!active)
            onOpenView();
    }, [attachPane, active, onOpenView]);
    // Quick window (#251) handing over its agent pane: opened here once the session list names the
    // pane (its stand-in), which reattaches to the same process
    const [quickPane, setQuickPane] = useState(null);
    useEffect(() => canSpawn
        ? onQuickChat?.((paneId) => {
            onOpenView();
            setQuickPane(paneId);
        })
        : undefined, [canSpawn, onQuickChat, onOpenView]);
    const quickPaneListed = !!quickPane && paneStandIns.some((s) => s.id === quickPane);
    useEffect(() => {
        if (!quickPane)
            return;
        if (quickPaneListed) {
            setQuickPane(null);
            attach(quickPane);
            return;
        }
        const timer = setTimeout(() => {
            setQuickPane(null);
            showHint(t.quickAgentMissing, 'error');
        }, 20000);
        return () => clearTimeout(timer);
    }, [quickPane, quickPaneListed, attach, showHint, t]);
    // "New orchestrator": the server starts the default harness as an agent pane in the
    // orchestrator workspace; it is marked right away and opened once the list names its pane
    const [orchestratorPane, setOrchestratorPane] = useState(null);
    const [startingOrchestrator, setStartingOrchestrator] = useState(false);
    const orchestratorPaneListed = !!orchestratorPane && paneStandIns.some((s) => s.id === orchestratorPane);
    useEffect(() => {
        if (!orchestratorPane)
            return;
        if (orchestratorPaneListed) {
            setOrchestratorPane(null);
            attach(orchestratorPane);
            return;
        }
        const timer = setTimeout(() => {
            setOrchestratorPane(null);
            showHint(t.orchestratorNotListed, 'error');
        }, 30000);
        return () => clearTimeout(timer);
    }, [orchestratorPane, orchestratorPaneListed, attach, showHint, t]);
    // Roles (<workspace>/roles/*.md): loaded on mount and whenever the "New" menu opens
    const [orchestratorRoles, setOrchestratorRoles] = useState([]);
    const loadOrchestratorRoles = useCallback(() => {
        orchestrator?.fetchOrchestratorRoles().then((r) => setOrchestratorRoles(r.roles), () => setOrchestratorRoles([]));
    }, [orchestrator]);
    useEffect(loadOrchestratorRoles, [loadOrchestratorRoles]);
    const newOrchestrator = useCallback(async (role) => {
        if (!orchestrator || startingOrchestrator)
            return;
        setStartingOrchestrator(true);
        showHint(t.startingOrchestrator(role), 'info');
        try {
            const agent = await orchestrator.startOrchestrator(role);
            // from the settings as they are now: the server marked the pane meanwhile and the page
            // refetched them (the start awaited above)
            await updateSettings((latest) => ({
                orchestrators: [...latest.orchestrators, agent.sessionId],
                ...(role
                    ? { orchestratorRoles: { ...latest.orchestratorRoles, [agent.sessionId]: role } }
                    : {}),
            }));
            setOrchestratorPane(agent.paneId);
            refresh();
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            showHint(t.orchestratorFailed(message), 'error', 8000);
        }
        finally {
            setStartingOrchestrator(false);
        }
    }, [
        orchestrator,
        startingOrchestrator,
        showHint,
        t,
        updateSettings,
        settings.orchestrators,
        settings.orchestratorRoles,
        refresh,
    ]);
    // PR "Code": agents on the PR's head branch sit in its worktree; else the repo's checkout
    const openPrCode = useMemo(() => openCode &&
        (async ({ pr, agents }) => {
            const folder = agents.map((a) => agentFolder(a, contexts[a.id])).find(Boolean) ??
                (await (fetchRepoPath?.(pr.repoSlug) ?? Promise.resolve(null)).catch(() => null));
            if (folder)
                openCode(folder);
            else
                toast.error(t.noLocalCheckout(pr.repoSlug));
        }), [contexts, openCode, fetchRepoPath, toast, t]);
    // Read by the host's /pulls route (ConnectedPullRequestsPage)
    const pullsData = useMemo(() => ({
        rows: pullRows,
        sessions,
        contexts,
        onSelectAgent: attach,
        onOpenCode: openPrCode,
    }), [pullRows, sessions, contexts, attach, openPrCode]);
    // New issue dialog; repo null = the user picks one of `issueRepos`
    const [issueDialog, setIssueDialog] = useState(null);
    // selectedId (Orkumo: `/agents?attach=<jobId>`, e.g. from the board): open the agent once per
    // new value, as soon as it is listed. Until it is active nothing is reported, so a host syncing
    // both does not get the stored layout's agent back
    const appliedSelection = useRef(undefined);
    const awaiting = useRef(null);
    if (selectedId && selectedId !== appliedSelection.current && selectedId !== awaiting.current)
        awaiting.current = selectedId;
    const reportSelection = useRef(onSelectedIdChange);
    reportSelection.current = onSelectedIdChange;
    const lastReported = useRef(undefined);
    useEffect(() => {
        if (loading)
            return;
        const pending = awaiting.current;
        if (pending) {
            const row = sessions.find((s) => s.id === pending);
            if (row && !row.app && pending !== activeSessionId)
                return;
            // not listed (or a claude.ai session): it never becomes active, stop waiting for it
            awaiting.current = null;
            if (!row)
                showHint(t.agentNotFound(pending), 'error');
        }
        if (lastReported.current === undefined && activeSessionId === null) {
            lastReported.current = null;
            return;
        }
        if (activeSessionId === lastReported.current)
            return;
        lastReported.current = activeSessionId;
        reportSelection.current?.(activeSessionId);
    }, [activeSessionId, loading, sessions, showHint, t]);
    // Board "Agent starten" / chat history "Continue" and "New chat" (#280, #19): composer prefill
    // from the host (Orkumo: router state, which external links cannot set). `place: 'chats'` = no
    // project, the chats folder; `openChat` = an Orkumo chat of /chats to open again
    const prefill = active ? (prefillProp ?? null) : null;
    useEffect(() => {
        if (typeof prefill?.dispatch !== 'string')
            return;
        // the chats folder comes with the discovery data: wait for it
        if (prefill.place === 'chats' && !chatsDir && !discovered)
            return;
        setInput(prefill.dispatch);
        if (prefill.place === 'chats')
            openComposer('chat', chatsDir);
        else {
            if (typeof prefill.cwd === 'string' && prefill.cwd)
                pickDispatchCwd(prefill.cwd);
            openComposer(prefill.mode === 'chat' ? 'chat' : 'task');
        }
        // After openComposer, which resets the pick; sending checks that the harness is installed
        const harness = HARNESSES.find((h) => h.id === prefill.harness)?.id;
        if (harness)
            setComposerHarness(harness);
        onPrefillConsumed?.();
    }, [prefill, onPrefillConsumed, openComposer, pickDispatchCwd, chatsDir, discovered]);
    const openCloud = useCallback(async (target) => {
        if (!cloud)
            return;
        const { args } = await cloud.openCloudSession(target);
        const id = `cloud-${Date.now()}`;
        const session = {
            id,
            sessionId: null,
            kind: 'interactive',
            cwd: targetCwd || '',
            startedAt: Date.now(),
            name: target ? `Cloud ${target.slice(-8)}` : t.cloudSessions,
            state: null,
            ptyArgs: args,
            pinned: false,
            order: null,
            links: [],
            displayState: 'idle',
        };
        targets.pinTarget(id, targets.getAgentTarget());
        setCloudSessions((prev) => [...prev, session]);
        attach(id);
    }, [cloud, targetCwd, attach, targets, t]);
    /**
     * A pane whose agent ended (Stop, Delete): gone from the workspace and from the rail. Closing a
     * pane or tab only detaches (the server keeps an agent PTY running) and its row reopens it.
     */
    const dropPane = useCallback((id) => {
        setCloudSessions((prev) => prev.filter((s) => s.id !== id));
        closePane(id);
    }, [closePane]);
    // ---------------------------------------------------------------------
    // Session actions
    // ---------------------------------------------------------------------
    const togglePeek = useCallback((session) => {
        if (!session)
            return;
        setPeekId((current) => (current === session.id ? null : session.id));
        setSelectedKey(session.id);
    }, []);
    const allPanes = useMemo(() => [...sessions, ...cloudSessions, ...paneStandIns, ...foreignPanes], [sessions, cloudSessions, paneStandIns, foreignPanes]);
    // A session an open pane runs is a row of its own (`omp-<uuid>`, a Claude terminal, a resumed
    // transcript) while the pane keeps its pane id: the rail treats the row as open and a click
    // switches to that pane, the same pane opening it would focus
    const paneOfRow = useMemo(() => {
        const map = new Map();
        for (const s of sessions) {
            const plan = openPlan(s, allPanes, openIdSet);
            if (plan.type === 'focus' && plan.paneId !== s.id)
                map.set(s.id, plan.paneId);
        }
        return map;
    }, [sessions, allPanes, openIdSet]);
    const railOpenIds = useMemo(() => new Set([...openIdSet, ...paneOfRow.keys()]), [openIdSet, paneOfRow]);
    // Single click on an already attached agent: switch to its tab/pane and put the cursor in the terminal
    const focusOpen = useCallback((id) => {
        attach(paneOfRow.get(id) ?? id);
        setSelectedKey(id);
        requestAnimationFrame(() => moveFocus('terminal'));
    }, [attach, moveFocus, paneOfRow]);
    const toggleGroup = useCallback((group) => {
        // Quick filters force all groups open, so a toggle would change nothing visible
        if (filterActive)
            showHint(t.clearFiltersToCollapse, 'info');
        else
            toggleCollapsed(group.key);
    }, [toggleCollapsed, filterActive, showHint, t]);
    /** The view a newly opened pane of `session` starts in: the UI view if preferred and readable */
    const preferredView = useCallback((session) => settings.agentOpenView === 'chat' &&
        UI_VIEW_HARNESSES[sessionHarness(session)] &&
        !session.ptyArgs?.includes('--cloud')
        ? 'chat'
        : 'terminal', [settings.agentOpenView]);
    /** Attaches pane `id` in `view`; a pane that is already open keeps the view it shows */
    const attachIn = useCallback((id, view) => {
        if (!openIdSet.has(id))
            setPaneView(id, view);
        attach(id);
    }, [openIdSet, setPaneView, attach]);
    // selectedId (above): opens in the view a rail click would use
    useEffect(() => {
        if (!selectedId) {
            appliedSelection.current = selectedId;
            return;
        }
        if (selectedId === appliedSelection.current || loading)
            return;
        const target = sessions.find((s) => s.id === selectedId);
        if (!target)
            return;
        appliedSelection.current = selectedId;
        if (target.app)
            openInSystemBrowser(target.app.url);
        else if (selectedId !== activeSessionId)
            attachIn(selectedId, preferredView(target));
    }, [selectedId, loading, sessions, activeSessionId, attachIn, preferredView]);
    /**
     * Opens an interactive PTY in `cwd`: `claude` (for ~ and folders whose trust prompt is pending)
     * or another harness (#195), which gets `ptyArgs` as is. `view`: how the pane shows it.
     */
    const openInteractiveClaude = useCallback((cwd, name, ptyArgs = [], command = 'claude', target = targets.getAgentTarget(), view = 'terminal') => {
        const id = `interactive-${Date.now()}`;
        // A known session id lets the UI view read this terminal's transcript
        if (command === 'claude' && ptyArgs.length === 0)
            ptyArgs = ['--session-id', crypto.randomUUID()];
        targets.pinTarget(id, target);
        setCloudSessions((prev) => [
            ...prev,
            {
                id,
                sessionId: null,
                kind: 'interactive',
                cwd,
                startedAt: Date.now(),
                name,
                state: null,
                ptyArgs,
                ...(command !== 'claude' && { ptyCommand: command }),
                pinned: false,
                order: null,
                links: [],
                displayState: 'idle',
            },
        ]);
        setComposerOpen(false);
        attachIn(id, view);
    }, [attachIn, targets]);
    /**
     * Resume that starts a new process on a held transcript: ask first (#236). `handover` = the
     * caller stops the holder before it resumes.
     */
    const [pendingCopy, setPendingCopy] = useState(null);
    const guardCopy = useCallback((holder, run, handover = false) => {
        if (holder)
            setPendingCopy({ holder, run, handover });
        else
            run();
    }, []);
    /**
     * Opens a rail session the way its kind needs (rail Enter / double-click, peek's open button),
     * in the preferred view ("Open agents in": UI view or terminal). Either view is the same process.
     */
    const openSession = useCallback((session) => {
        const plan = openPlan(session, allPanes, openIdSet, targets);
        // A Claude app session runs on claude.ai: a resume here would fork it (#236)
        if (plan.type === 'app')
            return plan.url ? openInSystemBrowser(plan.url) : undefined;
        const view = preferredView(session);
        if (plan.type === 'attach') {
            // A harness session running in another terminal: omp has no attach, so taking it over
            // ends that process and resumes the session here (a second process would write in parallel)
            const elsewhere = session.ptyArgs && session.pid != null && !session.paneId;
            if (!elsewhere)
                return attachIn(session.id, view);
            if (!canSpawn)
                return showHint(t.interactiveOwnTerminal, 'info');
            return guardCopy(session, () => void agentsApi.stopAgent(session.id).then(() => attachIn(session.id, view), (err) => showHint(t.takeoverFailed(err.message), 'error', 6000)), true);
        }
        if (plan.type === 'focus')
            return focusOpen(plan.paneId);
        // Its agent still runs detached in that pane's PTY: reopening reattaches, never a second one
        if (plan.type === 'reattach')
            return attachIn(plan.paneId, view);
        // Interactive and remote-control sessions keep their transcript locally: continue it here
        const { sessionId } = plan;
        if (sessionId && canSpawn)
            guardCopy(resumeMakesCopy(session) ? session : null, () => openInteractiveClaude(session.cwd, session.name, ['--resume', sessionId], 'claude', undefined, view));
        else
            showHint(t.interactiveOwnTerminal, 'info');
    }, [
        agentsApi,
        canSpawn,
        targets,
        attachIn,
        showHint,
        t,
        openInteractiveClaude,
        preferredView,
        allPanes,
        openIdSet,
        focusOpen,
        guardCopy,
    ]);
    const activateItem = useCallback((item) => {
        if (!item)
            return;
        if (item.type === 'group')
            return toggleGroup(item.group);
        if (item.type === 'more')
            return setExpandedCompleted(true);
        openSession(item.session);
    }, [toggleGroup, openSession]);
    const doDispatch = useCallback(async (extra, attachAfter = false, view = 'terminal') => {
        const cwd = extra.cwd || targetCwd;
        if (!cwd) {
            showHint(t.pickDirectory, 'error');
            return;
        }
        setDispatching(true);
        try {
            const result = await agentsApi.dispatchAgent({
                ...settings.dispatch,
                ...extra,
                agent: extra.agent === undefined ? settings.dispatch.agent : extra.agent,
                cwd,
            });
            // marked like "New orchestrator": rail group, badge, and its resume keeps Remote Control
            if (extra.profile === 'orchestrator')
                await updateSettings((latest) => ({
                    orchestrators: [...latest.orchestrators, result.id],
                }));
            setInput('');
            setComposerImages([]);
            setComposerOpen(false);
            setHighlightedId(result.id);
            setSelectedKey(result.id);
            showHint(result.alreadyRunning
                ? t.startedCopy(result.id)
                : t.startedNamed(result.name || result.id), 'success');
            refresh();
            if (attachAfter && canSpawn)
                attachIn(result.id, view);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : t.dispatchFailed;
            if (canSpawn && isUntrustedWorkspaceError(message)) {
                // Input stays in the composer so the user can retry once the folder is trusted
                openInteractiveClaude(cwd, `claude · ${cwd.split(/[\\/]/).filter(Boolean).pop() || cwd}`);
                showHint(t.folderNotTrusted, 'info', 10000);
                return;
            }
            showHint(message, 'error', 6000);
        }
        finally {
            setDispatching(false);
        }
    }, [
        agentsApi,
        targetCwd,
        settings.dispatch,
        settings.orchestrators,
        updateSettings,
        showHint,
        refresh,
        attachIn,
        openInteractiveClaude,
        t,
        canSpawn,
    ]);
    const handleCommand = useCallback(async (command, args, raw, attachAfter) => {
        switch (command) {
            case 'resume': {
                const looksLikeId = /^[a-f0-9-]{8,}$/i.test(args);
                if (looksLikeId) {
                    guardCopy(transcriptHolder(sessions, args), () => {
                        void doDispatch({ resume: args }, attachAfter);
                    });
                }
                else if (history) {
                    setResumePicker({ open: true, query: args });
                }
                else
                    showHint(t.giveSessionId, 'error');
                return;
            }
            case 'model': {
                const model = !args || args === 'default' ? null : args;
                await updateSettings({ dispatch: { ...settings.dispatch, model } });
                setInput('');
                setComposerOpen(false);
                showHint(t.dispatchModel(model), 'success');
                return;
            }
            case 'effort': {
                const effort = !args || args === 'default' ? null : args;
                await updateSettings({ dispatch: { ...settings.dispatch, effort } });
                setInput('');
                setComposerOpen(false);
                showHint(t.dispatchEffort(effort), 'success');
                return;
            }
            case 'bg':
            case 'background':
            case 'fork':
                showHint(t.commandInsideSession(command), 'info');
                return;
            default:
                // Skills / custom commands are sent as the prompt
                await doDispatch({ prompt: raw.trim() }, attachAfter);
        }
    }, [doDispatch, updateSettings, settings.dispatch, showHint, guardCopy, sessions, history, t]);
    /** Stores the composer attachments on the server; null when an upload failed (hint shown) */
    const uploadComposerImages = useCallback(async () => {
        if (composerImages.length === 0 || !uploads)
            return [];
        setDispatching(true);
        try {
            return await Promise.all(composerImages.map((file) => uploads.uploadAttachment(file)));
        }
        catch (err) {
            showHint(err instanceof Error ? err.message : t.uploadFailed, 'error', 6000);
            return null;
        }
        finally {
            setDispatching(false);
        }
    }, [composerImages, showHint, uploads, t]);
    const handleSubmit = useCallback(async ({ attach: attachAfter }) => {
        // New chat (#189) starts the same agent as New agent, only shown in the UI view
        const chat = composerMode === 'chat';
        const view = chat && UI_VIEW_HARNESSES[composerHarness] ? 'chat' : 'terminal';
        if (chat) {
            const harness = composerHarness;
            if (harnessInstalled[harness] === false) {
                showHint(t.harnessNotInstalled(harnessLabel(harness)), 'error');
                return;
            }
            if (!composerCwd) {
                showHint(t.pickProjectDirectory, 'error');
                return;
            }
            const cwd = composerCwd;
            const name = `${harness} · ${cwd.split('/').filter(Boolean).pop() || cwd}`;
            // `/resume [id]` and `/continue` pick up an earlier session; anything else is the first message
            const resume = input.trim().match(/^\/resume(?:\s+(\S+))?$/);
            if (resume) {
                if (resume[1]) {
                    const id = resume[1];
                    guardCopy(transcriptHolder(sessions, id), () => {
                        if (harness === 'claude')
                            void doDispatch({ resume: id, cwd }, true, view);
                        else
                            openInteractiveClaude(cwd, name, terminalResumeArgs(harness, id), harness, undefined, view);
                    });
                }
                else if (harness === 'claude')
                    setResumePicker({ open: true, query: '', chat: true });
                else
                    showHint(t.harnessGiveSessionId(harnessLabel(harness)), 'error');
                return;
            }
            if (input.trim() === '/continue') {
                if (harness === 'claude')
                    openInteractiveClaude(cwd, name, ['--continue'], 'claude', undefined, view);
                else
                    showHint(t.continueClaudeOnly, 'error');
                return;
            }
            if (view === 'terminal')
                showHint(t.harnessNoUiView(harnessLabel(harness)), 'info');
        }
        if (composerHarness !== 'claude') {
            // Other harnesses (#195) run interactively in a terminal pane; the server checks the args
            const cwd = composerCwd;
            if (!cwd) {
                showHint(t.pickProjectDirectory, 'error');
                return;
            }
            if (harnessInstalled[composerHarness] === false) {
                showHint(t.harnessNotInstalled(harnessLabel(composerHarness)), 'error');
                return;
            }
            const stored = await uploadComposerImages();
            if (!stored)
                return;
            const prompt = promptWithAttachments(input, stored).trim();
            if (prompt && composerHarness === 'opencode') {
                showHint(t.openCodeNoPrompt, 'error', 8000);
                return;
            }
            // A model picked for this agent or chat (#19 AK-2) goes as `--model` where the CLI takes it
            const model = composerModel.trim();
            openInteractiveClaude(cwd, `${composerHarness} · ${cwd.split('/').filter(Boolean).pop() || cwd}`, [
                ...(model && HARNESS_MODEL_FLAG[composerHarness] ? ['--model', model] : []),
                ...(composerEffort && composerHarness === 'omp' ? ['--thinking', composerEffort] : []),
                ...(prompt ? ['--', prompt] : []),
            ], composerHarness, undefined, view);
            setInput('');
            setComposerImages([]);
            return;
        }
        if (composerMode === 'agent' || chat) {
            const orchestrator = composerMode === 'agent' && composerOrchestrator;
            // The CLI refuses `--bg` in ~ (trusted one session at a time): run it interactively there
            if (homeDir && composerCwd === homeDir) {
                if (input.trim() || composerImages.length > 0) {
                    showHint(t.homeInteractiveOnly, 'error', 8000);
                    return;
                }
                if (orchestrator) {
                    const sessionId = crypto.randomUUID();
                    await updateSettings((latest) => ({
                        orchestrators: [...latest.orchestrators, sessionId],
                    }));
                    openInteractiveClaude(homeDir, 'home-orchestrator', ['--session-id', sessionId, '--remote-control', 'home-orchestrator'], 'claude', undefined, view);
                }
                else
                    openInteractiveClaude(homeDir, 'claude · ~', [], 'claude', undefined, view);
                return;
            }
            const stored = await uploadComposerImages();
            if (!stored)
                return;
            const prompt = promptWithAttachments(input, stored);
            const folder = composerCwd?.split(/[\\/]/).filter(Boolean).pop() || 'agent';
            await doDispatch({
                prompt: prompt || undefined,
                idle: true,
                cwd: composerCwd,
                // '' keeps the default: settings.dispatch.model / .effort
                ...(composerModel.trim() && { model: composerModel.trim() }),
                ...(composerEffort && { effort: composerEffort }),
                ...(orchestrator && { profile: 'orchestrator', name: `${folder}-orchestrator` }),
            }, true, view);
            return;
        }
        const parsed = parseDispatchInput(input, { subagents, repos });
        switch (parsed.kind) {
            case 'empty':
                showHint(t.describeTask, 'error');
                return;
            case 'filter':
                // The list filter follows `input`; keep it and let the user see the narrowed list
                setComposerOpen(false);
                return;
            case 'select-pr': {
                const match = sessions.find((s) => s.links.some((l) => parsed.url
                    ? l.href === parsed.url
                    : parsed.number !== null && l.number === parsed.number));
                if (!match) {
                    showHint(t.noSessionOnPr, 'error');
                    return;
                }
                setSelectedKey(match.id);
                setInput('');
                setComposerOpen(false);
                if (attachAfter)
                    attach(match.id);
                return;
            }
            case 'too-short':
                showHint(t.tooShort, 'error');
                return;
            case 'command':
                await handleCommand(parsed.command, parsed.args, parsed.raw, attachAfter);
                return;
            case 'exec':
                await doDispatch({ exec: parsed.command }, attachAfter);
                return;
            case 'dispatch': {
                const stored = await uploadComposerImages();
                if (!stored)
                    return;
                await doDispatch({
                    prompt: promptWithAttachments(parsed.prompt, stored),
                    agent: parsed.agent ?? undefined,
                    cwd: parsed.repo?.path || composerCwd || undefined,
                    ...(composerModel.trim() && { model: composerModel.trim() }),
                    ...(composerEffort && { effort: composerEffort }),
                }, attachAfter);
                return;
            }
        }
    }, [
        guardCopy,
        composerMode,
        composerCwd,
        composerHarness,
        composerModel,
        composerEffort,
        composerOrchestrator,
        settings.orchestrators,
        updateSettings,
        harnessInstalled,
        homeDir,
        composerImages.length,
        uploadComposerImages,
        input,
        subagents,
        repos,
        sessions,
        showHint,
        t,
        attach,
        handleCommand,
        doDispatch,
        openInteractiveClaude,
    ]);
    // /chats "Open in Agents" (#19 AK-4): an Orkumo chat opens like its rail row, else it resumes
    // in the chats folder the way `/resume <id>` does in the chat composer
    // Once per router state: the navigation that clears it is a transition, so renders the opening
    // causes can still see it
    const openedChat = useRef(null);
    useEffect(() => {
        const chat = prefill?.openChat;
        if (!chat || typeof chat !== 'object' || loading || openedChat.current === chat)
            return;
        openedChat.current = chat;
        onPrefillConsumed?.();
        const harness = HARNESSES.find((h) => h.id === chat.harness)?.id;
        const id = typeof chat.sessionId === 'string' ? chat.sessionId : '';
        const cwd = typeof chat.cwd === 'string' ? chat.cwd : '';
        if (!harness || !id || !cwd)
            return;
        const row = sessions.find((s) => s.sessionId === id);
        if (row)
            return openSession(row);
        const view = UI_VIEW_HARNESSES[harness] ? 'chat' : 'terminal';
        const name = typeof chat.title === 'string' && chat.title ? chat.title.slice(0, 80) : harness;
        guardCopy(transcriptHolder(sessions, id), () => {
            if (harness === 'claude')
                void doDispatch({ resume: id, cwd }, true, view);
            else if (canSpawn)
                openInteractiveClaude(cwd, name, terminalResumeArgs(harness, id), harness, undefined, view);
        });
    }, [
        prefill,
        loading,
        sessions,
        onPrefillConsumed,
        openSession,
        guardCopy,
        doDispatch,
        openInteractiveClaude,
        canSpawn,
    ]);
    const handleRename = useCallback(async (session) => {
        if (!manage || session.kind !== 'background')
            return;
        const name = window.prompt(t.renamePrompt, session.name);
        if (!name || !name.trim() || name.trim() === session.name)
            return;
        try {
            await manage.renameAgent(session.id, name.trim());
            refresh();
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : t.renameFailed);
        }
    }, [manage, refresh, toast, t]);
    const handlePin = useCallback(async (session) => {
        if (!manage || session.kind !== 'background')
            return;
        try {
            await manage.pinAgent(session.id, !session.pinned);
            showHint(session.pinned ? t.unpinned : t.pinnedHint, 'success');
            refresh();
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : t.pinFailed);
        }
    }, [manage, refresh, showHint, toast, t]);
    const removeSession = useCallback(async (session, options = {}) => {
        if (!manage)
            return;
        try {
            const result = await manage.removeAgent(session.id, options);
            if (!result.removed) {
                if (result.hints?.discardUnpushed &&
                    window.confirm(t.discardUnpushedConfirm(result.message))) {
                    return removeSession(session, { discardUnpushed: result.hints.discardUnpushed });
                }
                if (result.hints?.forceRemoveWorktree &&
                    window.confirm(t.forceRemoveWorktreeConfirm(result.message))) {
                    return removeSession(session, {
                        forceRemoveWorktree: result.hints.forceRemoveWorktree,
                    });
                }
                toast.error(result.message, { duration: 8000 });
                return;
            }
            toast.success(t.deleted(session.name));
            dropPane(session.paneId ?? session.id);
            if (peekId === session.id)
                setPeekId(null);
            refresh();
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : t.deleteFailed);
        }
    }, [manage, dropPane, peekId, refresh, toast, t]);
    const deleteSession = useCallback((session) => confirmDelete(session.name, () => removeSession(session), undefined, t.confirmDeleteSession), [removeSession, t]);
    const handleStopOrDelete = useCallback(async (item) => {
        if (!item || !manage)
            return;
        if (item.type === 'group') {
            const list = [...item.group.sessions, ...item.group.hidden].filter((s) => s.kind === 'background' || isOmpStoreSession(s));
            if (list.length === 0)
                return;
            if (!window.confirm(t.deleteAllInGroup(list.length, item.group.title)))
                return;
            for (const session of list)
                await removeSession(session);
            return;
        }
        if (item.type !== 'session')
            return;
        if (item.session.kind !== 'background' && !isOmpStoreSession(item.session))
            return;
        await deleteSession(item.session);
    }, [manage, deleteSession, removeSession, t]);
    const handleReorder = useCallback(async (direction) => {
        if (selectedItem?.type === 'group') {
            // Same rule as the group menu: orchestrators and favorites stay blocks of their own
            const key = selectedItem.group.key;
            const keys = items.flatMap((i) => i.type === 'group' &&
                i.group.key !== FAVORITES_GROUP_KEY &&
                i.group.key !== ORCHESTRATORS_GROUP_KEY
                ? [i.group.key]
                : []);
            const target = key !== 'all' &&
                groupNeighbour(keys, [...favoriteGroups], key, direction === 'up' ? -1 : 1);
            if (target)
                moveGroup(key, target, keys);
            return;
        }
        if (!selectedItem || selectedItem.type !== 'session')
            return;
        const group = selectedItem.group;
        const ids = group.sessions.map((s) => s.id);
        const index = ids.indexOf(selectedItem.session.id);
        const target = direction === 'up' ? index - 1 : index + 1;
        if (index < 0 || target < 0 || target >= ids.length)
            return;
        if (sort.key === 'manual') {
            moveSession(group.key, ids[index], ids[target], ids, group.hidden.map((s) => s.id));
            return;
        }
        if (!manage)
            return;
        [ids[index], ids[target]] = [ids[target], ids[index]];
        try {
            await manage.reorderAgents(ids);
            refresh();
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : t.reorderFailed);
        }
    }, [
        manage,
        selectedItem,
        items,
        favoriteGroups,
        moveGroup,
        moveSession,
        sort.key,
        refresh,
        toast,
        t,
    ]);
    const handleReply = useCallback(async (session, text) => {
        if (!messaging)
            return;
        await messaging.replyToAgent(session.id, text);
        refresh();
    }, [messaging, refresh]);
    const toggleGrouping = useCallback(() => {
        updateSettings({
            grouping: GROUP_MODES[(GROUP_MODES.indexOf(settings.grouping) + 1) % GROUP_MODES.length],
        });
    }, [settings.grouping, updateSettings]);
    const copyJson = useCallback(async () => {
        if (!manage)
            return;
        try {
            const json = await manage.fetchAgentsRawJson({ cwd: settings.scopeCwd, all: true });
            await navigator.clipboard.writeText(json);
            toast.success(t.jsonCopied);
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : t.copyFailed);
        }
    }, [manage, settings.scopeCwd, toast, t]);
    const attachNth = useCallback((n) => {
        let pool;
        if ((settings.grouping === 'directory' || settings.grouping === 'project') && selectedItem) {
            pool = selectedItem.group.sessions;
        }
        else {
            pool = items
                .filter((i) => i.type === 'session')
                .map((i) => i.session);
        }
        const session = pool.filter((s) => s.kind === 'background')[n - 1];
        if (session)
            attach(session.id);
    }, [settings.grouping, selectedItem, items, attach]);
    const moveSelection = useCallback((direction) => {
        const keys = items.map(itemKey);
        if (keys.length === 0)
            return;
        const at = selectedIndex;
        const next = direction === 'up' ? Math.max(0, at - 1) : Math.min(keys.length - 1, at + 1);
        setSelectedKey(keys[next]);
    }, [items, selectedIndex]);
    // ---------------------------------------------------------------------
    // Keyboard shortcuts
    // ---------------------------------------------------------------------
    // canStop false hides Stop; confirmStop asks first in a small dialog (`run` stops)
    const stoppable = useCallback((s) => canStop?.(s) ?? true, [canStop]);
    const [confirmingStop, setConfirmingStop] = useState(null);
    useEffect(() => {
        if (!active)
            return;
        const handler = (e) => {
            const modalOpen = showSettings ||
                showHelp ||
                resumePicker.open ||
                editorOpen ||
                pickDirOpen ||
                composerOpen ||
                paletteOpen ||
                confirmingStop !== null ||
                panel !== null;
            if (modalOpen)
                return;
            if (isNewTaskKey(e)) {
                e.preventDefault();
                openComposer('task');
                return;
            }
            if (isInsideTerminal(e.target))
                return;
            const target = e.target;
            // Explicit type: an inferred alias would narrow `target` to never below
            const inOtherInput = isEditableTarget(target);
            const key = e.key.toLowerCase();
            const ctrl = e.ctrlKey && !e.metaKey && !e.altKey;
            // Global (also inside text inputs)
            if (ctrl && key === 's' && !e.shiftKey) {
                e.preventDefault();
                toggleGrouping();
                return;
            }
            if ((ctrl && key === 't' && !e.shiftKey) || (e.altKey && !e.ctrlKey && key === 'p')) {
                e.preventDefault();
                if (selectedSession)
                    handlePin(selectedSession);
                return;
            }
            if (ctrl && key === 'r' && !e.shiftKey) {
                e.preventDefault();
                if (selectedSession)
                    handleRename(selectedSession);
                return;
            }
            if (ctrl && key === 'g' && !e.shiftKey) {
                e.preventDefault();
                setEditorOpen(true);
                return;
            }
            if (e.altKey && !e.ctrlKey && !e.metaKey && /^Digit[1-9]$/.test(e.code)) {
                e.preventDefault();
                attachNth(Number(e.code.slice(5)));
                return;
            }
            if (inOtherInput)
                return; // peek reply / rename inputs handle their own keys
            if (ctrl && key === 'x' && !e.shiftKey) {
                e.preventDefault();
                handleStopOrDelete(selectedItem);
                return;
            }
            if (ctrl && key === 'c' && onExit) {
                e.preventDefault();
                const nowMs = Date.now();
                if (nowMs - ctrlCRef.current < 1200) {
                    ctrlCRef.current = 0;
                    onExit();
                }
                else {
                    ctrlCRef.current = nowMs;
                    showHint(t.ctrlCAgain, 'info', 1200);
                }
                return;
            }
            if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.altKey && !ctrl) {
                e.preventDefault();
                handleReorder(e.key === 'ArrowUp' ? 'up' : 'down');
                return;
            }
            if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                setShowHelp(true);
                return;
            }
            // A row button (chevron, title) focused by click or Tab must not swallow ↑/↓ (#164).
            // Focus moves to the rail so Space/Enter then act on the new selection, not the old button.
            if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
                !e.altKey &&
                !ctrl &&
                !e.metaKey &&
                target?.closest('[role="listbox"] button:not([aria-haspopup])') &&
                railRef.current?.contains(target)) {
                e.preventDefault();
                railRef.current.focus();
                moveSelection(e.key === 'ArrowUp' ? 'up' : 'down');
                return;
            }
            // Rail, tab strip and popover controls (Choice popups too) keep their own keys
            if (target?.closest('button, a, [role="dialog"], [role="tab"], [role="tablist"], [role="menu"], [data-choice]'))
                return;
            // List / body context
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    moveSelection('up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    moveSelection('down');
                    break;
                case 'Enter':
                case 'ArrowRight':
                    e.preventDefault();
                    activateItem(selectedItem);
                    break;
                case ' ':
                    e.preventDefault();
                    if (selectedItem?.type === 'group')
                        toggleGroup(selectedItem.group);
                    else if (peekAvailable)
                        togglePeek(selectedSession);
                    break;
                case 'Escape':
                    if (peekId)
                        setPeekId(null);
                    break;
                case 'n':
                    if (e.ctrlKey || e.metaKey || e.altKey)
                        break;
                    e.preventDefault();
                    openComposer('task');
                    break;
                case 'F': // Shift+F: plain F is the app-wide "open favorites" shortcut
                    if (e.ctrlKey || e.metaKey || e.altKey || !selectedItem)
                        break;
                    if (selectedItem.type === 'group') {
                        const key = selectedItem.group.key;
                        if (key !== FAVORITES_GROUP_KEY && key !== ORCHESTRATORS_GROUP_KEY && key !== 'all')
                            toggleFavoriteGroup(key);
                    }
                    else if (selectedItem.type === 'session') {
                        toggleFavoriteSession(selectedItem.session.id);
                    }
                    e.preventDefault();
                    break;
                default:
                    break;
            }
        };
        document.addEventListener('keydown', handler, { capture: true });
        return () => document.removeEventListener('keydown', handler, { capture: true });
    }, [
        openComposer,
        active,
        showSettings,
        showHelp,
        resumePicker.open,
        editorOpen,
        pickDirOpen,
        composerOpen,
        paletteOpen,
        confirmingStop,
        panel,
        selectedItem,
        selectedSession,
        peekId,
        toggleGrouping,
        handlePin,
        handleRename,
        attachNth,
        handleStopOrDelete,
        handleReorder,
        toggleFavoriteGroup,
        toggleFavoriteSession,
        moveSelection,
        activateItem,
        toggleGroup,
        togglePeek,
        peekAvailable,
        attach,
        onExit,
        showHint,
        t,
    ]);
    // ---------------------------------------------------------------------
    // Row / group menus
    // ---------------------------------------------------------------------
    // Marking types a short briefing into the agent (pane) or replies it (background job), so it
    // takes up the role without being restarted in the orchestrator workspace
    const toggleOrchestrator = useCallback(async (session) => {
        if (!orchestrator)
            return;
        if (isOrchestrator(session, settings.orchestrators)) {
            await updateSettings((latest) => ({
                orchestrators: withoutOrchestrator(latest.orchestrators, session),
                orchestratorRoles: withoutOrchestratorRole(latest.orchestratorRoles, session),
            }));
            return;
        }
        await updateSettings((latest) => ({
            orchestrators: [...latest.orchestrators, orchestratorKey(session)],
        }));
        try {
            const { briefing, dir } = await orchestrator.fetchOrchestratorWorkspace();
            if (!(await briefSession(messaging, session, briefing))) {
                showHint(t.markedOutside(dir), 'info', 8000);
                return;
            }
            toast.success(t.markedBriefed);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            toast.error(t.markedBriefingFailed(message));
        }
    }, [
        orchestrator,
        messaging,
        settings.orchestrators,
        settings.orchestratorRoles,
        updateSettings,
        showHint,
        t,
        toast,
    ]);
    // Same delivery as the mark: the role briefing is typed into the pane or replied to the job
    const assignRole = useCallback(async (session, role) => {
        await updateSettings((latest) => ({
            orchestratorRoles: {
                ...withoutOrchestratorRole(latest.orchestratorRoles, session),
                [orchestratorKey(session)]: role.id,
            },
        }));
        try {
            if (await briefSession(messaging, session, role.briefing))
                toast.success(t.roleAssigned(role.id));
            else
                showHint(t.roleAssignedOutside(role.id), 'info', 8000);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            toast.error(t.roleBriefingFailed(message));
        }
    }, [messaging, settings.orchestratorRoles, updateSettings, showHint, toast, t]);
    const scopedModes = useMemo(() => (openMode ? (nav?.modes?.filter((m) => m.scoped) ?? []) : []), [nav?.modes, openMode]);
    const rowActions = useCallback((session) => {
        const bg = session.kind === 'background';
        const alive = session.state === 'working' || session.state === 'blocked';
        // An omp session from omp's store (#195) runs wherever its pid is, maybe in another terminal:
        // the server ends that process, then the pane that ran it here (its id is `paneId`) closes
        const omp = isOmpStoreSession(session);
        // An agent running in a pane of ours, maybe detached (pane closed): Stop ends that pane's PTY
        const heldPane = !omp && session.kind === 'interactive'
            ? session.paneId || (sessionHarness(session) !== 'claude' ? session.id : null)
            : null;
        const appUrl = session.app?.url;
        const stop = () => {
            if (heldPane && messaging)
                return void messaging
                    .stopPane(heldPane)
                    .then(() => {
                    dropPane(heldPane);
                    refresh();
                })
                    .catch((err) => toast.error(err.message));
            agentsApi
                .stopAgent(session.id)
                .then(() => {
                if (omp && session.paneId)
                    dropPane(session.paneId);
                refresh();
            })
                .catch((err) => toast.error(err.message));
        };
        return [
            { id: 'attach', label: t.attachInTab, disabled: !bg, onSelect: () => attach(session.id) },
            ...(appUrl
                ? [
                    {
                        id: 'claude-app',
                        label: t.openOnClaudeAi,
                        onSelect: () => openInSystemBrowser(appUrl),
                    },
                ]
                : []),
            ...(peekAvailable
                ? [{ id: 'peek', label: t.peekReply, onSelect: () => togglePeek(session) }]
                : []),
            ...(openCode
                ? [
                    {
                        id: 'code',
                        label: t.openInCode,
                        disabled: !agentFolder(session, contexts[session.id]),
                        onSelect: () => {
                            const folder = agentFolder(session, contexts[session.id]);
                            if (folder)
                                openCode(folder);
                        },
                    },
                ]
                : []),
            ...(canShell
                ? [
                    {
                        // #207: plain shell in the agent's folder (worktree); a peer agent's folder is on its host (#220)
                        id: 'terminal',
                        label: t.openTerminalHere,
                        disabled: targets.targetOf(session.id) !== '' ||
                            !agentFolder(session, contexts[session.id]),
                        onSelect: () => {
                            const folder = agentFolder(session, contexts[session.id]);
                            if (folder && targets.targetOf(session.id) === '')
                                openShell(folder);
                        },
                    },
                ]
                : []),
            ...(openBoard
                ? [
                    {
                        id: 'board',
                        label: t.showOnBoard,
                        disabled: !contexts[session.id]?.repo?.slug,
                        onSelect: () => {
                            const slug = contexts[session.id]?.repo?.slug;
                            if (slug)
                                openBoard(slug, session.id);
                        },
                    },
                ]
                : []),
            ...scopedModes.map((m) => ({
                id: `mode:${m.id}`,
                label: t.showMode(m.label),
                icon: m.icon,
                // Only agents started for a board issue have something to show in a scoped mode
                disabled: !contexts[session.id]?.repo?.slug || !issuesByAgent?.get(session.id)?.length,
                onSelect: () => {
                    const slug = contexts[session.id]?.repo?.slug;
                    if (slug)
                        openMode?.(m.id, slug, session.id);
                },
            })),
            ...(manage
                ? [
                    {
                        id: 'pin',
                        label: session.pinned ? t.unpin : t.pin,
                        disabled: !bg,
                        onSelect: () => handlePin(session),
                    },
                    {
                        id: 'rename',
                        label: t.rename,
                        disabled: !bg,
                        onSelect: () => handleRename(session),
                    },
                ]
                : []),
            // A pane's agent is ended through the pane: needs messaging
            ...(stoppable(session) && (!heldPane || messaging)
                ? [
                    {
                        id: 'stop',
                        label: t.stop,
                        disabled: omp ? session.pid == null : !heldPane && (!bg || !alive),
                        onSelect: () => (confirmStop ? setConfirmingStop({ session, run: stop }) : stop()),
                    },
                ]
                : []),
            ...(manage
                ? [
                    {
                        id: 'respawn',
                        label: t.respawn,
                        disabled: !bg,
                        onSelect: () => manage
                            .respawnAgent(session.id)
                            .then(refresh)
                            .catch((err) => toast.error(err.message)),
                    },
                ]
                : []),
            ...(orchestrator
                ? [
                    {
                        id: 'orchestrator',
                        label: isOrchestrator(session, settings.orchestrators)
                            ? t.unmarkOrchestrator
                            : t.markOrchestrator,
                        disabled: session.kind === 'app',
                        onSelect: () => void toggleOrchestrator(session),
                    },
                ]
                : []),
            ...(isOrchestrator(session, settings.orchestrators) ? orchestratorRoles : []).map((r) => ({
                id: `role:${r.id}`,
                label: t.roleNamed(r.id),
                icon: Network,
                disabled: orchestratorRole(session, settings.orchestratorRoles) === r.id,
                onSelect: () => void assignRole(session, r),
            })),
            {
                id: 'copy-id',
                label: t.copySessionId,
                onSelect: () => {
                    navigator.clipboard?.writeText(session.sessionId || session.id);
                    toast.success(t.copied);
                },
            },
            ...(manage
                ? [
                    {
                        id: 'delete',
                        label: t.delete,
                        danger: true,
                        disabled: !bg && !omp,
                        onSelect: () => deleteSession(session),
                    },
                ]
                : []),
        ];
    }, [
        agentsApi,
        manage,
        messaging,
        orchestrator,
        targets,
        toast,
        t,
        peekAvailable,
        canShell,
        openCode,
        openBoard,
        openMode,
        stoppable,
        confirmStop,
        attach,
        dropPane,
        togglePeek,
        handlePin,
        handleRename,
        refresh,
        deleteSession,
        contexts,
        issuesByAgent,
        openShell,
        scopedModes,
        settings.orchestrators,
        settings.orchestratorRoles,
        toggleOrchestrator,
        orchestratorRoles,
        assignRole,
    ]);
    const openProject = nav?.onOpenProject;
    // What host.renderPaneActions/renderPaneView get: a pane started here resolves to its row
    const paneInfo = (pane) => {
        const x = sessions.find((s) => s.paneId === pane.id) ?? pane;
        return {
            paneId: pane.id,
            session: x,
            orchestrator: isOrchestrator(x, settings.orchestrators),
            role: orchestratorRole(x, settings.orchestratorRoles),
        };
    };
    const groupActions = useCallback((group) => [
        {
            id: 'toggle',
            label: collapsed.has(group.key) ? t.expand : t.collapse,
            onSelect: () => toggleGroup(group),
        },
        ...(group.appId
            ? [
                ...(openProject
                    ? [
                        {
                            id: 'open-project',
                            label: t.openProject,
                            onSelect: () => openProject(group.appId),
                        },
                    ]
                    : []),
                ...(openProjectSettings
                    ? [
                        {
                            id: 'project-settings',
                            label: t.projectSettings,
                            onSelect: () => openProjectSettings(group.appId),
                        },
                    ]
                    : []),
            ]
            : []),
        ...(group.cwd && settings.grouping === 'project'
            ? [
                {
                    id: 'fixed-project',
                    label: group.fixed ? t.removeFixedProject : t.keepFixedProject,
                    // Several stored directories can mean this project (worktree, subfolder of an app)
                    onSelect: () => (group.fixed
                        ? rail.fixedProjects.filter((dir) => groupSessions([], 'project', { apps, fixedProjects: [dir] })[0]?.key ===
                            group.key)
                        : [group.cwd]).forEach(rail.toggleFixedProject),
                },
            ]
            : []),
        ...(group.cwd
            ? [
                ...(openCode
                    ? [{ id: 'view-code', label: t.viewCode, onSelect: () => openCode(group.cwd) }]
                    : []),
                ...(canShell
                    ? [
                        {
                            id: 'open-terminal',
                            label: t.openTerminalHere,
                            onSelect: () => openShell(group.cwd),
                        },
                    ]
                    : []),
            ]
            : []),
        ...(groupRepoSlug(group, contexts)
            ? [
                ...(openBoard
                    ? [
                        {
                            id: 'view-board',
                            label: t.viewBoard,
                            onSelect: () => openBoard(groupRepoSlug(group, contexts)),
                        },
                    ]
                    : []),
                ...scopedModes.map((m) => ({
                    id: `mode:${m.id}`,
                    label: t.viewMode(m.label),
                    icon: m.icon,
                    onSelect: () => openMode?.(m.id, groupRepoSlug(group, contexts)),
                })),
            ]
            : []),
        ...(renderIssueCreate
            ? [
                {
                    id: 'new-issue',
                    label: groupRepoSlug(group, contexts) ? t.newIssue : t.newIssueNoRepo,
                    disabled: !groupRepoSlug(group, contexts),
                    onSelect: () => openIssueDialog(groupRepoSlug(group, contexts)),
                },
            ]
            : []),
        ...(group.cwd
            ? [
                {
                    id: 'dispatch-here',
                    label: t.dispatchHere,
                    onSelect: () => pickDispatchCwd(group.cwd || null),
                },
                // A new agent attaches right away: a terminal this view starts
                ...(canSpawn
                    ? [
                        {
                            id: 'new-agent',
                            label: t.newAgentHere,
                            onSelect: () => openComposer('agent', group.cwd || null),
                        },
                    ]
                    : []),
            ]
            : []),
        ...(manage
            ? [
                {
                    id: 'delete-all',
                    label: t.deleteAllInGroupAction,
                    danger: true,
                    onSelect: () => handleStopOrDelete({ type: 'group', group }),
                },
            ]
            : []),
    ], [
        collapsed,
        t,
        canSpawn,
        toggleGroup,
        settings.grouping,
        rail.fixedProjects,
        rail.toggleFixedProject,
        apps,
        handleStopOrDelete,
        openProject,
        openProjectSettings,
        openCode,
        openBoard,
        openMode,
        renderIssueCreate,
        manage,
        canShell,
        contexts,
        openIssueDialog,
        openComposer,
        openShell,
        scopedModes,
    ]);
    // ---------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------
    const disabled = settings.disabled;
    // The rail stays visible on other routes; its keyboard focus marks only count on /agents
    const railFocused = active && focusZone === 'rail';
    // ---------------------------------------------------------------------
    // Command palette entries
    // ---------------------------------------------------------------------
    const collapseAllGroups = useCallback(() => rail.collapseAll([FAVORITES_GROUP_KEY, ...groups.map((g) => g.key)]), [rail.collapseAll, groups]);
    const expandAllGroups = useCallback(() => rail.expandAll(), [rail.expandAll]);
    // Filter row toggles: their state follows what the rail shows
    const groupsCollapsed = useMemo(() => {
        const keys = items.flatMap((item) => (item.type === 'group' ? [item.group.key] : []));
        return keys.length > 0 && keys.every((key) => rail.collapsed.has(key));
    }, [items, rail.collapsed]);
    const cardsExpanded = useMemo(() => shownSessions.some((s) => rail.expandedSessions.has(s.id)), [shownSessions, rail.expandedSessions]);
    const paletteCommands = useMemo(() => {
        const newTask = {
            id: 'agents.new-task',
            title: t.newAgentTask,
            group: t.paletteGroups.agents,
            scope: 'command',
            keywords: 'dispatch compose prompt session create',
            shortcut: 'N',
            run: () => {
                onOpenView();
                openComposer('task');
            },
            runWithText: (text) => {
                onOpenView();
                setInput(text);
                openComposer('task');
            },
        };
        const mainAgent = peekAvailable
            ? [
                {
                    id: 'agents.main-agent',
                    title: t.mainAgent,
                    group: t.paletteGroups.agents,
                    scope: 'command',
                    keywords: 'orchestrator main chef hauptagent',
                    run: () => setMainAgentOpen(true),
                },
            ]
            : [];
        // The rest acts on the visible view only; the task composer and the main agent work from every page
        if (!active)
            return [newTask, ...mainAgent];
        const cmd = (id, title, group, run, extra = {}) => ({ id: `agents.${id}`, title, group, scope: 'command', run, ...extra });
        const list = [newTask, ...mainAgent];
        // A fixed project is one of the host's projects
        if (apps.length > 0)
            list.push(cmd('fixed-project.add', t.addFixedProject, t.paletteGroups.rail, () => setPickFixedOpen(true), {
                keywords: 'projekt festlegen pflegen pin directory',
            }));
        if (selectedSession) {
            for (const action of rowActions(selectedSession)) {
                if (action.disabled)
                    continue;
                list.push(cmd(`selected.${action.id}`, `${action.label}: ${selectedSession.name}`, t.paletteGroups.selected, action.onSelect));
            }
        }
        for (const mode of ['project', 'state', 'directory', 'none']) {
            if (mode === settings.grouping)
                continue;
            list.push(cmd(`group.${mode}`, t.groupByCommand(mode), t.paletteGroups.rail, () => updateSettings({ grouping: mode })));
        }
        for (const option of SORT_OPTIONS) {
            list.push(cmd(`sort.${option.key}`, t.sortByCommand(t.sortOptions[option.key]), t.paletteGroups.rail, () => setSort({ key: option.key, dir: option.dir })));
        }
        for (const filterOption of QUICK_FILTERS) {
            const on = quickFilters.has(filterOption.key);
            list.push(cmd(`filter.${filterOption.key}`, t.filterCommand(on, t.quickFilters[filterOption.key].label), t.paletteGroups.rail, () => toggleQuickFilter(filterOption.key), { keywords: t.quickFilters[filterOption.key].title }));
        }
        // A quick filter keeps every group open, like the disabled header buttons
        if (!filterActive) {
            list.push(cmd('groups.collapse', t.collapseAllGroups, t.paletteGroups.rail, collapseAllGroups), cmd('groups.expand', t.expandAllGroups, t.paletteGroups.rail, expandAllGroups));
        }
        if (filterActive || filter) {
            list.push(cmd('filter.clear', t.clearFilters, t.paletteGroups.rail, () => {
                setQuickFilters(new Set());
                setLinkFilter(new Set());
                setTextQuery('');
                setInput('');
            }));
        }
        const activeTab = workspace.tabs.find((t) => t.id === workspace.activeTabId);
        if (activeTab && activeTab.panes.length > 1) {
            for (const layout of ['columns', 'rows', 'grid']) {
                if (layout === activeTab.layout)
                    continue;
                list.push(cmd(`layout.${layout}`, t.splitLayout(layout), t.paletteGroups.workspace, () => workspaceActions.setLayout(activeTab.id, layout)));
            }
        }
        if (activeTab) {
            list.push(cmd('tab.close', t.closeTab, t.paletteGroups.workspace, () => workspaceActions.closeTab(activeTab.id)));
        }
        if (transport.contexts)
            list.push(cmd('panel.prs', t.showPullRequestsCommand, t.paletteGroups.panels, () => {
                setPrRepo(null);
                setPanel('prs');
            }));
        if (openPulls)
            list.push(cmd('panel.prs-full', t.openPullsFullCommand, t.paletteGroups.panels, () => openPulls()));
        if (transport.contexts)
            list.push(cmd('panel.servers', t.showServersCommand, t.paletteGroups.panels, () => setPanel('servers')));
        list.push(cmd('settings', t.settingsCommand, t.paletteGroups.agents, () => setShowSettings(true)), cmd('shortcuts', t.shortcutsCommand, t.paletteGroups.agents, () => setShowHelp(true), {
            shortcut: '?',
        }), cmd('refresh', t.refreshCommand, t.paletteGroups.agents, refresh), cmd('interactive', showInteractive ? t.hideInteractive : t.showInteractive, t.paletteGroups.agents, toggleInteractive));
        if (manage)
            list.push(cmd('copy-json', t.copyJsonCommand, t.paletteGroups.agents, copyJson));
        if (onExit)
            list.push(cmd('exit', t.leaveView, t.paletteGroups.agents, onExit));
        for (const session of sessions) {
            list.push({
                id: `agent.${session.id}`,
                title: session.name,
                group: session.cwd.split('/').pop() || 'Agent',
                scope: 'agent',
                keywords: session.state ?? undefined,
                run: () => session.kind === 'background' ? attach(session.id) : setSelectedKey(session.id),
            });
        }
        return list;
    }, [
        openComposer,
        t,
        active,
        apps.length,
        peekAvailable,
        transport.contexts,
        manage,
        onOpenView,
        onExit,
        selectedSession,
        rowActions,
        settings.grouping,
        updateSettings,
        setSort,
        quickFilters,
        filterActive,
        filter,
        toggleQuickFilter,
        collapseAllGroups,
        expandAllGroups,
        workspace.tabs,
        workspace.activeTabId,
        workspaceActions,
        refresh,
        copyJson,
        sessions,
        attach,
        openPulls,
        showInteractive,
        toggleInteractive,
    ]);
    (host.useRegisterCommands ?? registerNothing)('agents', paletteCommands);
    // New kinds the host cannot create: issues (no issue dialog), orchestrators, chats (no UI view),
    // agents and chats without a terminal this view starts
    const hiddenKinds = useMemo(() => [
        ...(renderIssueCreate ? [] : ['issue']),
        ...(orchestrator ? [] : ['orchestrator']),
        ...(canSpawn ? [] : ['agent']),
        ...(transport.chat && canSpawn ? [] : ['chat']),
    ], [renderIssueCreate, orchestrator, transport.chat, canSpawn]);
    const defaultModel = settings.dispatch.model || userSettings?.model || 'default';
    // Model of the open agent; the dispatch default only stands in when it is unknown
    const activeModel = formatModelName(activeSessionId ? contexts[activeSessionId]?.model : null);
    const modelLabel = activeModel ??
        (defaultModel === 'default' ? t.modelDefault : t.modelDefaultNamed(defaultModel));
    const modelTitle = activeModel ? t.modelOfOpenAgent : t.dispatchModelTitle;
    // Other routes keep their main area when the agent view cannot show its rail
    if ((disabled || cliInstalled === false) && !active) {
        return _jsx("div", { className: `h-full relative agents-ui ${className}`, children: children });
    }
    if (disabled) {
        return (_jsxs("div", { className: `h-full flex flex-col items-center justify-center gap-4 text-gray-400 agents-ui ${className}`, children: [_jsx(Power, { size: 32, className: "text-gray-500" }), _jsx("div", { children: t.viewTurnedOff }), _jsx("button", { onClick: () => updateSettings({ disabled: false }), className: "px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm", children: t.turnOnAgain })] }));
    }
    if (cliInstalled === false) {
        return (_jsxs("div", { className: `h-full flex flex-col items-center justify-center gap-3 text-gray-400 p-8 text-center agents-ui ${className}`, children: [_jsx(AlertTriangle, { size: 32, className: "text-yellow-500" }), _jsx("div", { className: "text-gray-200 font-medium", children: t.cliNotFound }), _jsxs("div", { className: "text-sm", children: [t.cliInstall[0], _jsx("code", { className: "text-blue-300", children: "claude" }), t.cliInstall[1]] }), _jsx("pre", { className: "text-xs bg-gray-950 border border-gray-800 rounded p-3", children: "npm install -g @anthropic-ai/claude-code" }), _jsx("button", { onClick: refresh, className: "px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 hover:text-white text-sm text-gray-200", children: t.checkAgain })] }));
    }
    return (_jsxs("div", { ref: viewRef, className: `h-full flex min-h-0 bg-gray-900 text-gray-100 agents-ui ${className}`, "data-agents-view": true, children: [host.renderActivityBar && (_jsxs("nav", { "aria-label": t.activityBar, className: `${active ? 'flex' : 'hidden md:flex'} w-12 shrink-0 flex-col py-1 border-r border-gray-800 bg-gray-950`, children: [host.renderActivityBar({ onToggleRail: toggleRail }), nav && (_jsx("button", { onClick: nav.onOpenSettings, className: "mt-auto flex items-center justify-center h-11 text-gray-500 hover:text-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cursor", title: t.settings, "aria-label": t.settings, children: _jsx(Settings, { size: 20, strokeWidth: 1.75, "aria-hidden": true }) }))] })), _jsxs("div", { className: "flex-1 min-w-0 flex flex-col min-h-0", children: [_jsxs("div", { className: `relative ${active ? 'flex' : 'hidden md:flex'} flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 border-b border-gray-800 shrink-0`, children: [!appShell && (_jsx("button", { type: "button", onClick: toggleRail, "aria-pressed": !railCollapsed, className: "hidden md:inline-flex p-1 -m-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor", title: `${railCollapsed ? t.showAgentList : t.hideAgentList} (${isMac ? '⌘B' : 'Ctrl+B'})`, "aria-label": t.agentListToggle, children: railCollapsed ? (_jsx(PanelLeftOpen, { size: 18, "aria-hidden": true })) : (_jsx(PanelLeftClose, { size: 18, "aria-hidden": true })) })), nav && (_jsx("button", { onClick: nav.onOpenContextDashboard, className: "p-1 -m-1 rounded text-blue-300 hover:text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor", title: t.contextDashboardTitle, "aria-label": t.contextDashboardLabel, children: _jsx(Bot, { size: 18 }) })), _jsx(NewTaskButton, { onNew: (kind, role) => kind === 'issue'
                                    ? openIssueDialog(selectedRepo)
                                    : kind === 'orchestrator'
                                        ? void newOrchestrator(role)
                                        : openComposer(kind), roles: orchestratorRoles, onOpenMenu: loadOrchestratorRoles, hidden: hiddenKinds }), host.headerSlot, _jsx("div", { className: "min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1", children: _jsx(AgentSummaryBar, { counts: {
                                        ...counts,
                                        completed: chipCounts.completed,
                                        cacheExpiring: chipCounts['cache-expiring'],
                                    }, openPrs: totals.openPrs, runningServers: totals.runningServers, daemon: daemon, justCompleted: lastCompleted && Date.now() - lastCompleted.at < 5000 ? lastCompleted.count : 0, active: quickFilters, onToggle: toggleQuickFilter, panel: panel, onOpenPrs: transport.contexts
                                        ? () => {
                                            setPrRepo(null);
                                            setPanel((p) => (p === 'prs' ? null : 'prs'));
                                        }
                                        : undefined, onOpenServers: transport.contexts
                                        ? () => setPanel((p) => (p === 'servers' ? null : 'servers'))
                                        : undefined }) }), panel === 'prs' && (_jsx(PullRequestsPanel, { rows: pullRows, sessions: sessions, contexts: contexts, repoFilter: prRepo, onClearRepo: () => setPrRepo(null), onSelectAgent: attach, onOpenCode: openPrCode, onMaximize: openPulls && (() => openPulls(prRepo)), onClose: () => setPanel(null) })), panel === 'servers' && (_jsx(ServersPanel, { rows: serverRows, onSelectAgent: attach, onClose: () => setPanel(null) })), _jsx("div", { className: "flex-1" }), _jsxs("div", { className: `hidden ${active ? 'md:flex' : ''} items-center gap-1.5 text-[11px] text-gray-300`, role: "status", title: t.focusSwitchTitle, children: [_jsx("span", { className: `px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${focusZone === 'terminal' ? 'bg-blue-300 text-gray-950' : 'bg-gray-700 text-gray-100'}`, children: t.focusZones[focusZone === 'terminal' || focusZone === 'rail' ? focusZone : 'page'] }), _jsx("kbd", { className: "kbd", children: FOCUS_CHORD_LABEL }), _jsx("span", { className: "text-gray-400 hidden xl:inline", children: t.switches })] }), _jsxs("span", { className: "text-[11px] text-gray-500 font-mono", title: modelTitle, children: [t.modelPrefix, " ", modelLabel, _jsxs("span", { className: "sr-only", children: [" (", modelTitle, ")"] })] }), _jsxs("div", { className: "hidden xl:flex items-center gap-3 text-[11px] text-gray-500 font-mono", children: [settings.dispatch.effort && (_jsxs("span", { title: t.effortTitle, children: [t.effortPrefix, " ", settings.dispatch.effort] })), settings.dispatch.permissionMode && _jsx("span", { children: settings.dispatch.permissionMode }), settings.dispatch.skipPermissions && (_jsx("span", { className: "text-orange-400", children: t.bypassPermissions })), settings.scopeCwd && _jsxs("span", { title: t.scopeTitle, children: ["cwd ", settings.scopeCwd] }), !connected && _jsx("span", { className: "text-yellow-500", children: t.reconnecting })] }), manage && (_jsx("button", { onClick: copyJson, className: "p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800", title: t.copyJsonTitle, children: _jsx(Braces, { size: 15 }) })), _jsx("button", { onClick: refresh, className: "p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800", title: t.refresh, children: _jsx(RefreshCw, { size: 15, className: loading ? 'animate-spin' : '' }) }), _jsx("button", { onClick: () => setShowSettings(true), className: "p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800", title: t.settingsTitle, children: _jsx(Settings2, { size: 15 }) }), _jsx("button", { onClick: () => setShowHelp(true), className: "p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800", title: t.shortcutsTitle, children: _jsx(HelpCircle, { size: 15 }) })] }), error && received && (_jsxs("div", { className: "px-4 py-1.5 text-xs text-red-300 bg-red-900/20 border-b border-red-900/40 flex items-center gap-2", children: [_jsx(AlertTriangle, { size: 12 }), " ", error] })), _jsxs("div", { className: "flex-1 flex min-h-0", children: [outletShown && (_jsx("div", { ref: setOutlet, "data-collapsed": railCollapsed || undefined, className: `hidden ${railCollapsed ? '' : 'md:flex'} md:w-[340px] xl:w-[440px] shrink-0 flex-col min-h-0 border-r border-gray-800 bg-gray-950/40` })), _jsxs("div", { ref: railRef, tabIndex: -1, "data-focus-zone": "rail", "data-rail-focused": railFocused, "data-collapsed": railCollapsed || undefined, className: `${outletShown ? 'hidden' : active && !narrowWorkspace ? `flex ${railCollapsed ? 'md:hidden' : ''}` : `hidden ${railCollapsed ? '' : 'md:flex'}`} w-full md:w-[340px] xl:w-[440px] shrink-0 flex-col min-h-0 border-r border-gray-800 bg-gray-950/40 outline-none relative`, children: [railFocused && (_jsx("div", { "aria-hidden": "true", className: "pointer-events-none absolute inset-0 z-10 border-2 border-blue-300/80" })), _jsx(AgentFilterBar, { leading: _jsx(GroupingPicker, { grouping: settings.grouping, onGrouping: (grouping) => updateSettings({ grouping }) }), trailing: _jsx(FoldButtons, { groupsCollapsed: groupsCollapsed, onGroups: (collapse) => (collapse ? collapseAllGroups() : expandAllGroups()), groupsDisabled: filterActive, cardsExpanded: cardsExpanded, onCards: (expand) => rail.setSessionsExpanded(shownSessions.map((s) => s.id), expand), cardsDisabled: shownSessions.length === 0 }), sort: sort, onSort: setSort, active: quickFilters, onToggle: toggleQuickFilter, chipCounts: chipCounts, shown: shownSessions.length, total: sessions.length, filtered: filterActive || !!filter, onClear: () => {
                                            setQuickFilters(new Set());
                                            setLinkFilter(new Set());
                                            setTextQuery('');
                                            if (filter)
                                                setInput('');
                                        }, linkEntries: linkEntries, linkSelected: linkFilter, onToggleLink: toggleLinkFilter, query: textQuery, onQuery: setTextQuery }), error && !received ? (_jsx(ListError, { message: error, status: errorStatus, onRetry: refresh })) : loading && sessions.length === 0 ? (_jsxs("div", { className: "flex-1 flex items-center justify-center text-sm text-gray-500", children: [_jsx(RefreshCw, { size: 14, className: "animate-spin mr-2" }), " ", t.loadingSessions] })) : (_jsx(AgentList, { railFocused: railFocused, items: items, selectedIndex: selectedIndex, onSelectIndex: (index) => setSelectedKey(itemKey(items[index])), onActivate: activateItem, onTogglePeek: peekAvailable ? togglePeek : undefined, peekId: peekId, openIds: railOpenIds, onFocusOpen: focusOpen, now: now, grouping: settings.grouping, cardDensity: settings.cardDensity, cardFields: settings.cardFields, lookup: lookup, contexts: contexts, servers: servers, filtered: filterActive || !!filter, onOpenPr: setPrModal, rowActions: rowActions, groupActions: groupActions, highlightedId: highlightedId, collapsedKeys: collapsed, activeSessionId: activeSessionId, onRevealActive: (id) => {
                                            rail.revealSession(groups, id);
                                            if (isFoldedAway(groups, id))
                                                setExpandedCompleted(true);
                                        }, onToggleGroup: toggleCollapsed, favoriteGroupKeys: rail.favoriteGroups, favoriteSessionIds: rail.favoriteSessions, expandedSessionIds: rail.expandedSessions, onToggleExpanded: rail.toggleExpandedSession, onToggleFavoriteGroup: rail.toggleFavoriteGroup, onToggleFavoriteSession: rail.toggleFavoriteSession, onMoveGroup: rail.moveGroup, onMoveSession: sort.key === 'manual' ? rail.moveSession : undefined, appsById: appsById, nav: nav, issuesByAgent: issuesByAgent, onOpenIssue: renderIssueModal ? setIssueModalKey : undefined, orchestratorIds: settings.orchestrators, orchestratorRoles: settings.orchestratorRoles, top: settings.grouping === 'state' && nav ? (_jsx(ProjectsSection, { apps: apps, nav: nav, filtered: filterActive || !!filter })) : undefined })), filter && (_jsxs("div", { className: "px-3 py-1 text-[11px] text-blue-300 bg-blue-900/20 border-t border-blue-900/40 flex items-center gap-2", children: [t.filterActive(visibleSessions.length, sessions.length), _jsx("button", { onClick: () => setInput(''), className: "ml-auto hover:text-white", "aria-label": t.clearFilter, children: _jsx(X, { size: 11 }) })] })), _jsx(RailSwitch, { id: "interactive-sessions-label", label: t.interactiveSessions, hint: interactiveCount > 0
                                            ? t.interactiveCount(interactiveCount, showInteractive)
                                            : t.interactiveNotRunning, checked: showInteractive, onToggle: toggleInteractive }), cloud && canSpawn && _jsx(CloudSessionBar, { onOpen: openCloud }), _jsx("div", { role: "status", "aria-live": "polite", children: !composerOpen && (hint || dispatching) && (_jsx("p", { className: `px-3 py-2 text-xs border-t border-gray-700 ${hint?.tone === 'error'
                                                ? 'text-red-300'
                                                : hint?.tone === 'success'
                                                    ? 'text-emerald-300'
                                                    : 'text-gray-200'}`, children: hint?.text || t.dispatching })) })] }), _jsx("div", { className: active ? 'hidden' : 'flex-1 min-w-0 min-h-0 relative', children: _jsx(PullRequestsDataContext.Provider, { value: pullsData, children: _jsx(RailOutletContext.Provider, { value: outletShown ? outlet : null, children: children }) }) }), _jsxs("div", { className: `flex-1 min-w-0 min-h-0 ${active ? (narrowWorkspace ? 'flex flex-col' : 'hidden md:flex') : 'hidden'} md:flex-row overflow-hidden`, children: [_jsxs("button", { type: "button", onClick: () => setNarrowWorkspace(false), className: "md:hidden flex items-center gap-1.5 px-3 py-2 text-sm text-blue-300 border-b border-gray-800 shrink-0", children: [_jsx(ArrowLeft, { size: 16, "aria-hidden": true }), " Agents"] }), _jsx("div", { className: "flex-1 min-w-0 min-h-0", children: [...Object.entries(parked), [contextId ?? '', workspace]].map(([id, ws]) => {
                                            const live = id === (contextId ?? '');
                                            const allSessions = allPanes;
                                            return (_jsx("div", { className: live ? 'h-full' : 'hidden', children: _jsx(AgentWorkspace, { hidden: !live, 
                                                    // A session open in the live workspace attaches there only, not twice
                                                    sessions: live ? allSessions : allSessions.filter((x) => !openIdSet.has(x.id)), workspace: ws, onActivateTab: live ? workspaceActions.activateTab : noop, onFocusPane: live ? workspaceActions.focusPane : noop, onClosePane: live ? closePane : noop, onCloseTab: live ? workspaceActions.closeTab : noop, contexts: contexts, handoffResetTokens: settings.handoffResetTokens, chatSubmitKey: settings.chatSubmitKey, chatShowSteps: settings.chatShowSteps, onToggleChatSteps: () => updateSettings({ chatShowSteps: !settings.chatShowSteps }), views: paneViews, onSetView: live ? setPaneView : noop, onMoveTab: live ? workspaceActions.moveTab : noop, onSplit: live ? workspaceActions.split : noop, onDetach: live ? workspaceActions.detach : noop, onOpenLink: live ? workspaceActions.openBrowser : undefined, onSetLayout: live ? workspaceActions.setLayout : noop, onPeek: !peekAvailable ? undefined : live ? (sid) => setPeekId(sid) : noop, focusZone: focusZone, renderPaneMeta: (pane) => {
                                                        // A harness pane started here is represented by the server row that
                                                        // claimed it (#195); a chat by itself (its context comes from the server)
                                                        const x = sessions.find((s) => s.paneId === pane.id) ?? pane;
                                                        return (_jsx(SessionLinks, { session: withBranchPullRequests(x, contexts[x.id]), ctx: contexts[x.id], servers: (servers.get(x.id) || []).filter((srv) => srv.running), issueKeys: issuesByAgent?.get(x.id) || [], onOpenIssue: renderIssueModal ? setIssueModalKey : undefined, onOpenPr: setPrModal }));
                                                    }, renderPaneActions: host.renderPaneActions &&
                                                        ((pane) => host.renderPaneActions?.(paneInfo(pane))), renderPaneView: host.renderPaneView &&
                                                        ((pane, status) => host.renderPaneView?.({ ...paneInfo(pane), ...status })) }) }, id));
                                        }) }), peekSession && (_jsx("div", { className: "w-[400px] xl:w-[460px] shrink-0 min-h-0", children: _jsx(PeekPanel, { session: peekSession, onClose: () => setPeekId(null), onAttach: () => openSession(peekSession), onReply: (text) => handleReply(peekSession, text) }) }))] })] })] }), peekSession && (_jsx("div", { className: "md:hidden fixed inset-0 z-40 bg-gray-950", children: _jsx(PeekPanel, { session: peekSession, onClose: () => setPeekId(null), onAttach: () => openSession(peekSession), onReply: (text) => handleReply(peekSession, text) }) })), mainAgentOpen && (_jsx(MainAgentDialog, { session: sessions.find((s) => s.kind === 'background' &&
                    s.name === settings.mainAgent.name &&
                    !sessions.some((o) => o.kind === 'background' && o.name === s.name && o.startedAt > s.startedAt)), config: settings.mainAgent, onConfig: (mainAgent) => updateSettings({ mainAgent }), onClose: () => setMainAgentOpen(false), onAttach: (session) => {
                    setMainAgentOpen(false);
                    onOpenView();
                    openSession(session);
                }, onReply: handleReply })), _jsx(ShortcutsHelp, { open: showHelp, onClose: () => setShowHelp(false) }), issueModalKey &&
                renderIssueModal?.({
                    issueKey: issueModalKey,
                    sessions,
                    onClose: () => setIssueModalKey(null),
                }), prModal && (_jsx(PullRequestModal, { links: prModal, rows: pullRows, contexts: contexts, onSelectAgent: attach, onOpenCode: openPrCode, onOpenOverview: transport.contexts
                    ? () => {
                        setPrRepo(null);
                        setPanel('prs');
                    }
                    : undefined, onClose: () => setPrModal(null) })), issueDialog &&
                renderIssueCreate?.({
                    repo: issueDialog.repo,
                    repos: issueRepos,
                    draft: issueDialog.draft,
                    onKindChange: (kind, draft) => {
                        setIssueDialog(null);
                        setInput(issueDraftToTask(draft));
                        setComposerImages(draft.images);
                        openComposer(kind);
                    },
                    onClose: () => setIssueDialog(null),
                }), _jsx(AgentSettingsPanel, { open: showSettings, onClose: () => setShowSettings(false), settings: settings, onUpdate: updateSettings, userSettings: userSettings, daemon: daemon, repos: directoryChoices, capabilities: capabilities, onRefresh: refresh }), _jsx(TaskComposerModal, { open: composerOpen, onClose: () => setComposerOpen(false), value: input, onChange: setInput, onSubmit: handleSubmit, onOpenEditor: () => setEditorOpen(true), onPickDirectory: () => setPickDirOpen(true), targetCwd: composerCwd, variant: composerMode, onKindChange: (kind) => {
                    // Switching tabs keeps directory, harness and model as they are
                    if (kind !== 'issue')
                        return setComposerMode(kind);
                    // The text moves into the issue dialog, so it is not left behind in the composer
                    setComposerOpen(false);
                    setIssueDialog({
                        repo: selectedRepo,
                        draft: { ...taskToIssueDraft(input), images: composerImages },
                    });
                    setInput('');
                    setComposerImages([]);
                }, hiddenKinds: hiddenKinds, canAttach: canSpawn, 
                // Other harnesses only run in a terminal this view starts: no picker without one
                harness: canSpawn ? composerHarness : undefined, onHarnessChange: (harness) => {
                    setComposerHarness(harness);
                    // model names differ per CLI: a new harness starts from its default
                    setComposerModel('');
                    setComposerEffort('');
                }, harnessInstalled: harnessInstalled, model: composerModel, onModelChange: setComposerModel, effort: composerEffort, onEffortChange: setComposerEffort, orchestrator: composerOrchestrator, onOrchestratorChange: setComposerOrchestrator, defaultModel: composerHarness === 'claude' ? settings.dispatch.model || null : null, images: composerImages, onImagesChange: setComposerImages, hint: hint?.text || (dispatching ? t.dispatching : null), hintTone: hint?.tone, disabled: dispatching, subagents: subagents, repos: repos, commands: composerHarness === 'omp' ? ompCommands : composerHarness === 'claude' ? commands : [], inputRef: inputRef }), pendingCopy && (_jsx(CopyWarningDialog, { holder: pendingCopy.holder, handover: pendingCopy.handover, onClose: () => setPendingCopy(null), onConfirm: () => {
                    setPendingCopy(null);
                    pendingCopy.run();
                } })), confirmingStop && (_jsx(ConfirmDialog, { title: t.stopAgentTitle, body: t.stopAgentBody(confirmingStop.session.name), confirm: t.stop, onCancel: () => setConfirmingStop(null), onConfirm: () => {
                    setConfirmingStop(null);
                    confirmingStop.run();
                } })), _jsx(ResumePicker, { open: resumePicker.open, initialQuery: resumePicker.query, cwd: targetCwd, onClose: () => setResumePicker({ open: false, query: '' }), onResume: (past) => {
                    setResumePicker({ open: false, query: '' });
                    guardCopy(transcriptHolder(sessions, past.sessionId), () => {
                        if (resumePicker.chat)
                            void doDispatch({ resume: past.sessionId, cwd: past.cwd || composerCwd }, true, 'chat');
                        else
                            doDispatch({ resume: past.sessionId, cwd: past.cwd || targetCwd });
                    });
                } }), editorOpen && (_jsx(PromptEditor, { value: input, onCancel: () => setEditorOpen(false), onSave: (text) => {
                    setInput(text);
                    setEditorOpen(false);
                    requestAnimationFrame(() => inputRef.current?.focus());
                } })), pickFixedOpen && (_jsx(DirectoryPicker
            // A fixed project is a project: no free paths, no plain directories
            , { 
                // A fixed project is a project: no free paths, no plain directories
                choices: apps.map((a) => ({ name: a.name, path: a.path, source: 'project' })), current: null, home: homeDir, label: t.fixedProjectPicker, allowPath: false, onCancel: () => setPickFixedOpen(false), onPick: (path) => {
                    if (!rail.fixedProjects.includes(path))
                        rail.toggleFixedProject(path);
                    if (settings.grouping !== 'project')
                        updateSettings({ grouping: 'project' });
                    setPickFixedOpen(false);
                } })), pickDirOpen && (_jsx(DirectoryPicker, { choices: composerMode === 'agent' && homeDir
                    ? [{ name: t.homeChoice, path: homeDir, source: 'home' }, ...directoryChoices]
                    : composerMode === 'chat' && chatsDir
                        ? [{ name: t.chatsChoice, path: chatsDir, source: 'chats' }, ...directoryChoices]
                        : directoryChoices, current: composerCwd, home: homeDir, onCancel: () => setPickDirOpen(false), onPick: (path) => {
                    setPickedCwd(path);
                    if (composerMode === 'task')
                        pickDispatchCwd(path);
                    setPickDirOpen(false);
                    inputRef.current?.focus();
                } }))] }));
};
/** The list failed before any arrived: why, the transport's message, and a retry */
const ListError = ({ message, status, onRetry, }) => {
    const t = useLabels().shell;
    return (_jsxs("div", { role: "alert", className: "flex gap-2 p-4 text-xs", children: [_jsx(AlertTriangle, { size: 14, className: "text-red-400 shrink-0 mt-px", "aria-hidden": true }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-gray-100", children: status === 401 || status === 403
                            ? t.listNoAccess
                            : status !== null && status >= 500
                                ? t.listUnavailable
                                : t.listFailed }), message && _jsx("div", { className: "text-gray-500 font-mono break-words mt-0.5", children: message }), _jsxs("button", { onClick: onRetry, className: "mt-2 flex items-center gap-1 px-2 py-1 rounded border border-gray-700 text-gray-200 hover:bg-gray-800", children: [_jsx(RefreshCw, { size: 11, "aria-hidden": true }), " ", t.tryAgain] })] })] }));
};
/** Ctrl+G: larger prompt editor (browser stand-in for $VISUAL / $EDITOR) */
const PromptEditor = ({ value, onCancel, onSave }) => {
    const t = useLabels().shell;
    const [text, setText] = useState(value);
    return (_jsx("div", { className: "fixed inset-0 z-[95] bg-black/60 flex items-center justify-center p-4", onClick: onCancel, role: "dialog", "aria-modal": "true", children: _jsxs("div", { className: "w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "px-4 py-2 border-b border-gray-800 text-sm font-medium", children: t.editPromptTitle }), _jsx("textarea", { autoFocus: true, value: text, onChange: (e) => setText(e.target.value), onKeyDown: (e) => {
                        if (e.key === 'Escape')
                            onCancel();
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey))
                            onSave(text);
                    }, className: "flex-1 min-h-[40vh] bg-gray-950 text-sm text-gray-100 font-mono p-4 outline-none resize-y", spellCheck: false }), _jsxs("div", { className: "flex items-center justify-end gap-2 px-4 py-2 border-t border-gray-800 text-sm", children: [_jsx("span", { className: "text-xs text-gray-500 mr-auto", children: t.editPromptKeys }), _jsx("button", { onClick: onCancel, className: "px-3 py-1.5 rounded text-gray-300 hover:bg-gray-800", children: t.cancel }), _jsx("button", { onClick: () => onSave(text), className: "px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white", children: t.usePrompt })] })] }) }));
};
