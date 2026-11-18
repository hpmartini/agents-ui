import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Code2, Layers, ListChevronsDownUp, ListChevronsUpDown, } from 'lucide-react';
import { useHost } from '../../host';
const GROUP_MODES = [
    { key: 'project', label: 'Project' },
    { key: 'state', label: 'Status' },
    { key: 'directory', label: 'Directory' },
    { key: 'none', label: 'None' },
];
const PROJECTS_COLLAPSED_KEY = 'devOrbitAgentProjectsCollapsed';
/** Pointer may cross the gap between trigger and menu without the menu closing */
const HOVER_CLOSE_MS = 150;
/** Grouping of the agent list: shows only the current grouping; hovering (or clicking) opens the others */
export const GroupingPicker = ({ grouping, onGrouping }) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const closeTimer = useRef(undefined);
    const current = GROUP_MODES.find((m) => m.key === grouping) ?? GROUP_MODES[0];
    const cancelClose = () => window.clearTimeout(closeTimer.current);
    useEffect(() => cancelClose, []);
    useEffect(() => {
        if (!open)
            return;
        const onDown = (e) => {
            if (!rootRef.current?.contains(e.target))
                setOpen(false);
        };
        const onKey = (e) => {
            if (e.key !== 'Escape')
                return;
            e.stopImmediatePropagation();
            setOpen(false);
            if (rootRef.current?.contains(document.activeElement))
                rootRef.current.querySelector('[aria-haspopup]')?.focus();
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey, true);
        };
    }, [open]);
    const run = (action) => {
        setOpen(false);
        action();
    };
    const item = 'w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 hover:text-white focus-visible:bg-gray-700 focus-visible:outline-none disabled:opacity-40 disabled:pointer-events-none';
    return (_jsxs("div", { ref: rootRef, className: "relative shrink-0", onMouseEnter: () => {
            cancelClose();
            setOpen(true);
        }, onMouseLeave: () => {
            cancelClose();
            closeTimer.current = window.setTimeout(() => setOpen(false), HOVER_CLOSE_MS);
        }, children: [_jsxs("button", { type: "button", 
                // Hover already opened it for the mouse; Enter / Space (detail 0) toggles
                onClick: (e) => setOpen((v) => (e.detail === 0 ? !v : true)), "aria-haspopup": "menu", "aria-expanded": open, "aria-label": `Group agents by: ${current.label} (Ctrl+S)`, title: "Group agents by (Ctrl+S)", className: `flex items-center gap-1 px-1.5 py-1 rounded border text-gray-300 hover:bg-gray-800 ${open ? 'bg-gray-800 border-gray-700' : 'border-gray-800'}`, children: [_jsx(Layers, { size: 12, "aria-hidden": true }), current.label] }), open && (
            // pt-1 instead of mt-1: the pointer stays inside the hover area on its way to the menu
            _jsx("div", { className: "absolute left-0 top-full pt-1 z-30", children: _jsx("div", { role: "menu", "aria-label": "Group agents by", className: "min-w-[180px] bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1", children: GROUP_MODES.map((mode) => (_jsxs("button", { type: "button", role: "menuitemradio", "aria-checked": mode.key === grouping, onClick: () => run(() => onGrouping(mode.key)), className: item, children: [_jsx("span", { className: "w-3", children: mode.key === grouping && _jsx(Check, { size: 12 }) }), mode.label] }, mode.key))) }) }))] }));
};
const foldButton = 'shrink-0 p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed';
/**
 * Filter row toggles: collapse / expand all groups (projects) and all agent cards. Each button
 * names the action it does next.
 */
export const FoldButtons = ({ groupsCollapsed, onGroups, groupsDisabled, cardsExpanded, onCards, cardsDisabled }) => {
    const groupsLabel = groupsCollapsed ? 'Expand all groups' : 'Collapse all groups';
    const cardsLabel = cardsExpanded ? 'Collapse all agent cards' : 'Expand all agent cards';
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => onGroups(!groupsCollapsed), disabled: groupsDisabled, title: groupsDisabled ? 'Clear the filters to fold groups' : groupsLabel, "aria-label": groupsLabel, className: foldButton, children: groupsCollapsed ? _jsx(ChevronsUpDown, { size: 13 }) : _jsx(ChevronsDownUp, { size: 13 }) }), _jsx("button", { type: "button", onClick: () => onCards(!cardsExpanded), disabled: cardsDisabled, title: cardsLabel, "aria-label": cardsLabel, className: foldButton, children: cardsExpanded ? _jsx(ListChevronsDownUp, { size: 13 }) : _jsx(ListChevronsUpDown, { size: 13 }) })] }));
};
/** Collapsible list of Orkumo apps for the status grouping (favorites first) */
export const ProjectsSection = ({ apps, nav, filtered }) => {
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
    return (_jsxs("div", { className: "mx-2 mt-2 rounded-lg border border-gray-700 bg-gray-850 overflow-hidden", children: [_jsxs("button", { onClick: toggle, "aria-expanded": open, className: `w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-300 bg-gray-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cursor ${open ? 'border-b border-gray-700' : ''}`, children: [open ? _jsx(ChevronDown, { size: 12 }) : _jsx(ChevronRight, { size: 12 }), "Projects", _jsx("span", { className: "font-normal text-gray-400", children: list.length })] }), open && (_jsx("div", { children: list.map((app) => (_jsxs("div", { className: "group flex items-center gap-2 px-3 py-1 hover:bg-gray-800", children: [_jsx("button", { onClick: () => nav.onOpenProject(app.id), className: "flex-1 min-w-0 truncate text-left text-sm text-gray-300 hover:text-white", title: `Open ${app.name}\n${app.path}`, children: app.name }), openCode && (_jsx("span", { className: "flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100", children: _jsx("button", { onClick: () => openCode(app.path), className: "p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor", title: `View code of ${app.name}`, "aria-label": `View code of ${app.name}`, children: _jsx(Code2, { size: 11 }) }) }))] }, app.id))) }))] }));
};
