import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Bot, ChevronDown, CircleDot, MessageSquare, Network, Plus } from 'lucide-react';
import { usePopover } from './PullRequestsPanel';
import { isMac } from '../../utils/platform';
const ENTRIES = [
    { kind: 'task', label: 'New task', hint: 'N', icon: Plus },
    { kind: 'agent', label: 'New agent', hint: 'interactive, attached', icon: Bot },
    { kind: 'chat', label: 'New chat', hint: 'agent in the UI view', icon: MessageSquare },
    { kind: 'issue', label: 'New issue', hint: 'GitHub', icon: CircleDot },
    { kind: 'orchestrator', label: 'New orchestrator', hint: 'coordinates agents', icon: Network },
];
const NewMenu = ({ onPick, onClose, roles, hidden }) => {
    const ref = usePopover(onClose);
    // With roles, "New orchestrator" is the general one and each role gets an entry below it
    const entries = ENTRIES.filter((e) => !hidden.includes(e.kind)).flatMap((e) => e.kind === 'orchestrator' && roles.length > 0
        ? [
            { ...e, hint: 'general' },
            ...roles.map((r) => ({ ...e, role: r.id, label: r.id, hint: 'role', title: r.title })),
        ]
        : [e]);
    // ↑/↓ move between the entries, as in a native menu
    const onKeyDown = (e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')
            return;
        e.preventDefault();
        const items = [...(ref.current?.querySelectorAll('[role="menuitem"]') ?? [])];
        const at = items.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown' ? at + 1 : (at <= 0 ? items.length : at) - 1;
        items[next % items.length]?.focus();
    };
    return (_jsx("div", { ref: ref, tabIndex: -1, role: "menu", "aria-label": "Create", onKeyDown: onKeyDown, className: "absolute left-0 top-full mt-1 z-40 min-w-[240px] bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 outline-none", children: entries.map((entry) => (_jsxs("button", { type: "button", role: "menuitem", title: 'title' in entry ? entry.title : undefined, onClick: () => {
                onClose();
                onPick(entry.kind, 'role' in entry ? entry.role : undefined);
            }, className: `w-full flex items-center gap-2 text-left ${'role' in entry ? 'pl-7' : 'pl-3'} pr-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 hover:text-white focus-visible:bg-gray-700 focus-visible:outline-none`, children: [_jsx(entry.icon, { size: 13, "aria-hidden": true, className: "shrink-0 text-gray-400" }), _jsx("span", { className: "flex-1 whitespace-nowrap", children: entry.label }), _jsx("span", { className: "text-[11px] text-gray-500 whitespace-nowrap", children: entry.hint })] }, 'role' in entry ? `role:${entry.role}` : entry.kind))) }));
};
/** [New task | ⌄]: the main part starts a task, the chevron offers agent, chat, issue and orchestrator */
export const NewTaskButton = ({ onNew, roles = [], onOpenMenu, hidden = [] }) => {
    const [open, setOpen] = useState(false);
    return (_jsxs("div", { className: "relative flex shrink-0", children: [_jsxs("button", { type: "button", onClick: () => onNew('task'), className: "flex items-center gap-1 pl-2 pr-2.5 py-0.5 rounded-l text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white", title: `New task (N or ${isMac ? '⌘N' : 'Ctrl+N'})`, children: [_jsx(Plus, { size: 13, "aria-hidden": true }), " New task"] }), _jsx("button", { type: "button", onClick: () => {
                    if (!open)
                        onOpenMenu?.();
                    setOpen(!open);
                }, "data-popover-trigger": true, "aria-haspopup": "menu", "aria-expanded": open, "aria-label": "More: new agent, chat, issue or orchestrator", title: "New agent, chat, issue or orchestrator", className: "flex items-center px-1 py-0.5 rounded-r border-l border-blue-800 text-white bg-blue-600 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white", children: _jsx(ChevronDown, { size: 13, "aria-hidden": true }) }), open && (_jsx(NewMenu, { onPick: onNew, onClose: () => setOpen(false), roles: roles, hidden: hidden }))] }));
};
const KINDS = [
    { kind: 'task', label: 'Task' },
    { kind: 'agent', label: 'Agent' },
    { kind: 'chat', label: 'Chat' },
    { kind: 'issue', label: 'Issue' },
];
/** Switch between the four "new" dialogs while one is open (#271); the caller carries the draft over */
export const NewKindTabs = ({ kind, onChange, disabled, hidden = [] }) => (_jsx("div", { role: "tablist", "aria-label": "What to create", className: "flex rounded-md bg-gray-850 p-0.5", children: KINDS.filter((k) => !hidden.includes(k.kind)).map((k) => (_jsx("button", { type: "button", role: "tab", "aria-selected": k.kind === kind, disabled: disabled, onClick: () => k.kind !== kind && onChange(k.kind), className: `px-2.5 py-0.5 rounded text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50 ${k.kind === kind
            ? 'bg-blue-600 text-white font-medium'
            : 'text-gray-300 hover:text-white hover:bg-gray-700'}`, children: k.label }, k.kind))) }));
