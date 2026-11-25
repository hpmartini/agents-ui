import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Code2, Layers, ListChevronsDownUp, ListChevronsUpDown, } from 'lucide-react';
import { useHost } from '../../host';
import { useLabels } from '../../labels';
import { Choice } from '../Choice';
/** Every value `AgentGrouping` accepts, in the order the picker, the settings and Ctrl+S use */
export const GROUP_MODES = ['project', 'state', 'directory', 'none'];
const PROJECTS_COLLAPSED_KEY = 'devOrbitAgentProjectsCollapsed';
/** Grouping of the agent list: a Choice menu with the four groupings */
export const GroupingPicker = ({ grouping, onGrouping }) => {
    const t = useLabels().shell;
    return (_jsx(Choice, { label: t.groupAgentsBy, title: t.groupAgentsByTitle, icon: _jsx(Layers, { size: 12, "aria-hidden": true, className: "shrink-0 text-gray-400" }), 
        // Raw value: a stale stored grouping shows the placeholder and Project stays pickable
        value: grouping, placeholder: t.groupModes[GROUP_MODES[0]], onChange: onGrouping, options: GROUP_MODES.map((mode) => ({ value: mode, label: t.groupModes[mode] })) }));
};
const foldButton = 'shrink-0 p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed';
/**
 * Filter row toggles: collapse / expand all groups (projects) and all agent cards. Each button
 * names the action it does next.
 */
export const FoldButtons = ({ groupsCollapsed, onGroups, groupsDisabled, cardsExpanded, onCards, cardsDisabled }) => {
    const t = useLabels().shell;
    const groupsLabel = groupsCollapsed ? t.expandAllGroups : t.collapseAllGroups;
    const cardsLabel = cardsExpanded ? t.collapseAllCards : t.expandAllCards;
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => onGroups(!groupsCollapsed), disabled: groupsDisabled, title: groupsDisabled ? t.foldGroupsDisabled : groupsLabel, "aria-label": groupsLabel, className: foldButton, children: groupsCollapsed ? _jsx(ChevronsUpDown, { size: 13 }) : _jsx(ChevronsDownUp, { size: 13 }) }), _jsx("button", { type: "button", onClick: () => onCards(!cardsExpanded), disabled: cardsDisabled, title: cardsLabel, "aria-label": cardsLabel, className: foldButton, children: cardsExpanded ? _jsx(ListChevronsDownUp, { size: 13 }) : _jsx(ListChevronsUpDown, { size: 13 }) })] }));
};
/** Collapsible list of Orkumo apps for the status grouping (favorites first) */
export const ProjectsSection = ({ apps, nav, filtered }) => {
    const t = useLabels().shell;
    const { openCode } = useHost();
    const [collapsed, setCollapsed] = useState(() => {
        try {
            // Collapsed by default: 13 expanded projects push the agents below the fold
            return localStorage.getItem(PROJECTS_COLLAPSED_KEY) !== 'false';
        }
        catch {
            return true;
        }
    });
    const toggle = () => {
        setCollapsed(!collapsed);
        try {
            localStorage.setItem(PROJECTS_COLLAPSED_KEY, String(!collapsed));
        }
        catch {
            // stays in memory only
        }
    };
    const list = [...apps].sort((a, b) => Number(!!b.isFavorite) - Number(!!a.isFavorite) || a.name.localeCompare(b.name));
    if (list.length === 0)
        return null;
    const open = !collapsed && !filtered;
    return (_jsxs("div", { className: "mx-2 mt-2 rounded-lg border border-gray-700 bg-gray-850 overflow-hidden", children: [_jsxs("button", { onClick: toggle, "aria-expanded": open, className: `w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-300 bg-gray-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cursor ${open ? 'border-b border-gray-700' : ''}`, children: [open ? _jsx(ChevronDown, { size: 12 }) : _jsx(ChevronRight, { size: 12 }), t.projects, _jsx("span", { className: "font-normal text-gray-400", children: list.length })] }), open && (_jsx("div", { children: list.map((app) => (_jsxs("div", { className: "group flex items-center gap-2 px-3 py-1 hover:bg-gray-800", children: [_jsx("button", { onClick: () => nav.onOpenProject(app.id), className: "flex-1 min-w-0 truncate text-left text-sm text-gray-300 hover:text-white", title: `${t.openNamed(app.name)}\n${app.path}`, children: app.name }), openCode && (_jsx("span", { className: "flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100", children: _jsx("button", { onClick: () => openCode(app.path), className: "p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor", title: t.viewCodeOf(app.name), "aria-label": t.viewCodeOf(app.name), children: _jsx(Code2, { size: 11 }) }) }))] }, app.id))) }))] }));
};
