import React from 'react';
import { type LucideIcon } from 'lucide-react';
import type { AgentSession, AgentGrouping, AgentContext, AgentCardDensity, AgentCardFields, AgentPrLink } from '../../types';
import { AgentServer, NavItem, SessionGroup, SessionLookup } from '../../utils/agentSessions';
import type { AgentConfigLike } from './types';
import { RailNavProps } from './ProjectsRail';
/** Drag payload of a group header (separate from the workspace tab drag) */
export declare const RAIL_GROUP_MIME = "application/x-devorbit-rail-group";
/** Drag payload of an agent row in manual sort mode (#299) */
export declare const RAIL_SESSION_MIME = "application/x-devorbit-rail-session";
export interface AgentRowAction {
    id: string;
    label: string;
    /** Overrides the context-menu icon picked by id (MENU_ICONS), e.g. for module modes */
    icon?: LucideIcon;
    danger?: boolean;
    disabled?: boolean;
    onSelect: () => void;
}
interface AgentListProps {
    items: NavItem[];
    selectedIndex: number;
    onSelectIndex: (index: number) => void;
    onActivate: (item: NavItem) => void;
    /** Without it (no peek in this host) the rows have no Peek button */
    onTogglePeek?: (session: AgentSession) => void;
    peekId: string | null;
    openIds: Set<string>;
    /** Single click on a session that is already attached: jump into its terminal */
    onFocusOpen?: (id: string) => void;
    now: number;
    grouping: AgentGrouping;
    cardDensity?: AgentCardDensity;
    /** Which card slot each detail element sits in (#159) */
    cardFields?: AgentCardFields;
    /** workflow links, to tell workflow agents from hand-started ones */
    lookup?: SessionLookup;
    /** Repo / issue / sub-agent data per session id (may be empty while loading) */
    contexts: Record<string, AgentContext | undefined>;
    /** Matched Orkumo dev servers per session id */
    servers: Map<string, AgentServer[]>;
    /** Filters hide everything: show a different empty state */
    filtered?: boolean;
    /** Row PR chip opens the PR panel, filtered to that repo ("owner/repo") */
    onOpenPr?: (links: AgentPrLink[]) => void;
    rowActions: (session: AgentSession) => AgentRowAction[];
    groupActions: (group: SessionGroup) => AgentRowAction[];
    /** Session that was just backgrounded/dispatched (rendered bold) */
    highlightedId?: string | null;
    /** Keys of collapsed groups (chevron state) */
    collapsedKeys: Set<string>;
    /** Scrolls together with the list (the rail has a single scroller) */
    top?: React.ReactNode;
    /** Rendered after the session cards, inside the same scroller (remote devices) */
    bottom?: React.ReactNode;
    /** Project grouping: app lookup and navigation for the cluster headers */
    appsById?: Map<string, AgentConfigLike>;
    nav?: RailNavProps;
    /** Keyboard focus is in the rail: selection is solid, otherwise hollow (focus is in a terminal) */
    railFocused?: boolean;
    /** Session open in the workspace: gets a marker, its group is revealed and the row scrolled in */
    activeSessionId?: string | null;
    /** Called when the active session's row is not rendered (group collapsed) so the owner can expand it */
    onRevealActive?: (sessionId: string) => void;
    /** Single click on a group header; falls back to onActivate */
    onToggleGroup?: (key: string) => void;
    favoriteGroupKeys?: Set<string>;
    favoriteSessionIds?: Set<string>;
    /** Rows whose details (PRs, issues, servers) are open */
    expandedSessionIds?: Set<string>;
    /** Chevron on the card's left: open or close its details */
    onToggleExpanded?: (id: string) => void;
    onToggleFavoriteGroup?: (key: string) => void;
    onToggleFavoriteSession?: (id: string) => void;
    /** Drag-and-drop / menu reorder: move `key` to the position of `targetKey` among `visibleKeys` */
    onMoveGroup?: (key: string, targetKey: string, visibleKeys: string[]) => void;
    /** Set only with the "Manual" sort: drag-and-drop / Alt+Up/Down moves an agent inside its group */
    onMoveSession?: (groupKey: string, id: string, targetId: string, visibleIds: string[], hiddenIds: string[]) => void;
    /** Board issue keys ("owner/name#12") per session id, derived from the GitHub project */
    issuesByAgent?: Map<string, string[]>;
    onOpenIssue?: (issueKey: string) => void;
    /** `agentView.orchestrators`: marked sessions get the Orchestrator badge */
    orchestratorIds?: readonly string[];
    /** `agentView.orchestratorRoles`: the badge names the role */
    orchestratorRoles?: Readonly<Record<string, string>>;
}
/** Selected row/header: filled while the rail has focus, outline only while it does not */
export declare const selectedClass: (focused: boolean) => "bg-sel text-white [&_.text-gray-300]:text-gray-100 [&_.text-gray-400]:text-gray-200 [&_.text-gray-500]:text-gray-200 [&_.text-gray-500]:text-gray-200 [&_.text-emerald-400]:text-emerald-200 [&_.text-yellow-400]:text-yellow-200 [&_.text-blue-300]:text-blue-100 [&_.text-sky-300]:text-sky-100" | "bg-transparent text-white ring-2 ring-inset ring-cursor";
/** Menu actions split into their sections (in order, empty ones left out); unknown ids come last */
export declare function menuSections(actions: AgentRowAction[]): AgentRowAction[][];
/**
 * Session list with group headers, keyboard selection and per-row menus.
 */
export declare const AgentList: React.FC<AgentListProps>;
export {};
