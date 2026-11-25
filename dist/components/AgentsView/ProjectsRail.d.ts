import React from 'react';
import { type LucideIcon } from 'lucide-react';
import type { AgentGrouping } from '../../types';
import type { AgentConfigLike } from './types';
/** A work mode of the host (Orkumo: a module's mode); opened through `host.openMode` */
export interface RailMode {
    /** Passed to `host.openMode` */
    id: string;
    label: string;
    icon: LucideIcon;
    /** Filters to a repo and agent: gets per-agent and per-group entries */
    scoped?: boolean;
}
/** App-level navigation and actions the merged rail needs from the host's app shell */
export interface RailNavProps {
    /** Global dashboard (all contexts) */
    onOpenDashboard: () => void;
    /** Dashboard of the active context (#184) */
    onOpenContextDashboard: () => void;
    /** Modes of loaded modules: per-agent/repo entries for scoped ones (needs `host.openMode`) */
    modes?: RailMode[];
    onOpenSettings: () => void;
    onOpenProject: (appId: string) => void;
}
/** Every value `AgentGrouping` accepts, in the order the picker, the settings and Ctrl+S use */
export declare const GROUP_MODES: AgentGrouping[];
/** Grouping of the agent list: a Choice menu with the four groupings */
export declare const GroupingPicker: React.FC<{
    grouping: AgentGrouping;
    onGrouping: (grouping: AgentGrouping) => void;
}>;
/**
 * Filter row toggles: collapse / expand all groups (projects) and all agent cards. Each button
 * names the action it does next.
 */
export declare const FoldButtons: React.FC<{
    /** Every shown group is collapsed: the groups button expands */
    groupsCollapsed: boolean;
    onGroups: (collapse: boolean) => void;
    /** A quick filter forces every group open: folding would have no visible effect */
    groupsDisabled?: boolean;
    /** Some shown card has its details open: the cards button collapses */
    cardsExpanded: boolean;
    onCards: (expand: boolean) => void;
    cardsDisabled?: boolean;
}>;
/** Collapsible list of Orkumo apps for the status grouping (favorites first) */
export declare const ProjectsSection: React.FC<{
    apps: AgentConfigLike[];
    nav: RailNavProps;
    /** A filter is active: the list is for agents, so keep the project list out of the way */
    filtered?: boolean;
}>;
