import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Code2,
  Layers,
  ListChevronsDownUp,
  ListChevronsUpDown,
  type LucideIcon,
} from 'lucide-react';
import type { AgentGrouping } from '../../types';
import type { AgentConfigLike } from './types';
import { useHost } from '../../host';
import { useLabels } from '../../labels';
import { Choice } from '../Choice';

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
export const GROUP_MODES: AgentGrouping[] = ['project', 'state', 'directory', 'none'];

const PROJECTS_COLLAPSED_KEY = 'devOrbitAgentProjectsCollapsed';

/** Grouping of the agent list: a Choice menu with the four groupings */
export const GroupingPicker: React.FC<{
  grouping: AgentGrouping;
  onGrouping: (grouping: AgentGrouping) => void;
}> = ({ grouping, onGrouping }) => {
  const t = useLabels().shell;
  return (
    <Choice<AgentGrouping>
      label={t.groupAgentsBy}
      title={t.groupAgentsByTitle}
      icon={<Layers size={12} aria-hidden className="shrink-0 text-gray-400" />}
      // Raw value: a stale stored grouping shows the placeholder and Project stays pickable
      value={grouping}
      placeholder={t.groupModes[GROUP_MODES[0]]}
      onChange={onGrouping}
      options={GROUP_MODES.map((mode) => ({ value: mode, label: t.groupModes[mode] }))}
    />
  );
};

const foldButton =
  'shrink-0 p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed';

/**
 * Filter row toggles: collapse / expand all groups (projects) and all agent cards. Each button
 * names the action it does next.
 */
export const FoldButtons: React.FC<{
  /** Every shown group is collapsed: the groups button expands */
  groupsCollapsed: boolean;
  onGroups: (collapse: boolean) => void;
  /** A quick filter forces every group open: folding would have no visible effect */
  groupsDisabled?: boolean;
  /** Some shown card has its details open: the cards button collapses */
  cardsExpanded: boolean;
  onCards: (expand: boolean) => void;
  cardsDisabled?: boolean;
}> = ({ groupsCollapsed, onGroups, groupsDisabled, cardsExpanded, onCards, cardsDisabled }) => {
  const t = useLabels().shell;
  const groupsLabel = groupsCollapsed ? t.expandAllGroups : t.collapseAllGroups;
  const cardsLabel = cardsExpanded ? t.collapseAllCards : t.expandAllCards;
  return (
    <>
      <button
        type="button"
        onClick={() => onGroups(!groupsCollapsed)}
        disabled={groupsDisabled}
        title={groupsDisabled ? t.foldGroupsDisabled : groupsLabel}
        aria-label={groupsLabel}
        className={foldButton}
      >
        {groupsCollapsed ? <ChevronsUpDown size={13} /> : <ChevronsDownUp size={13} />}
      </button>
      <button
        type="button"
        onClick={() => onCards(!cardsExpanded)}
        disabled={cardsDisabled}
        title={cardsLabel}
        aria-label={cardsLabel}
        className={foldButton}
      >
        {cardsExpanded ? <ListChevronsDownUp size={13} /> : <ListChevronsUpDown size={13} />}
      </button>
    </>
  );
};

/** Collapsible list of Orkumo apps for the status grouping (favorites first) */
export const ProjectsSection: React.FC<{
  apps: AgentConfigLike[];
  nav: RailNavProps;
  /** A filter is active: the list is for agents, so keep the project list out of the way */
  filtered?: boolean;
}> = ({ apps, nav, filtered }) => {
  const t = useLabels().shell;
  const { openCode } = useHost();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      // Collapsed by default: 13 expanded projects push the agents below the fold
      return localStorage.getItem(PROJECTS_COLLAPSED_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const toggle = () => {
    setCollapsed(!collapsed);
    try {
      localStorage.setItem(PROJECTS_COLLAPSED_KEY, String(!collapsed));
    } catch {
      // stays in memory only
    }
  };
  const list = [...apps].sort(
    (a, b) => Number(!!b.isFavorite) - Number(!!a.isFavorite) || a.name.localeCompare(b.name)
  );
  if (list.length === 0) return null;
  const open = !collapsed && !filtered;
  return (
    <div className="mx-2 mt-2 rounded-lg border border-gray-700 bg-gray-850 overflow-hidden">
      <button
        onClick={toggle}
        aria-expanded={open}
        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-300 bg-gray-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cursor ${open ? 'border-b border-gray-700' : ''}`}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {t.projects}
        <span className="font-normal text-gray-400">{list.length}</span>
      </button>
      {open && (
        <div>
          {list.map((app) => (
            <div key={app.id} className="group flex items-center gap-2 px-3 py-1 hover:bg-gray-800">
              <button
                onClick={() => nav.onOpenProject(app.id)}
                className="flex-1 min-w-0 truncate text-left text-sm text-gray-300 hover:text-white"
                title={`${t.openNamed(app.name)}\n${app.path}`}
              >
                {app.name}
              </button>
              {openCode && (
                <span className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    onClick={() => openCode(app.path)}
                    className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor"
                    title={t.viewCodeOf(app.name)}
                    aria-label={t.viewCodeOf(app.name)}
                  >
                    <Code2 size={11} />
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
