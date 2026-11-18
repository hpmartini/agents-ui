import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useDialogA11y } from '../CommandPalette/useDialogA11y';
const SECTIONS = [
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
];
export const ShortcutsHelp = ({ open, onClose }) => {
    const dialogRef = useRef(null);
    const trapTab = useDialogA11y(open, dialogRef, () => dialogRef.current);
    useEffect(() => {
        if (!open)
            return;
        const handler = (e) => {
            if (e.key === 'Escape' || e.key === '?') {
                e.preventDefault();
                onClose();
            }
        };
        document.addEventListener('keydown', handler, { capture: true });
        return () => document.removeEventListener('keydown', handler, { capture: true });
    }, [open, onClose]);
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-gray-950/70 flex items-center justify-center p-4", onClick: onClose, role: "dialog", "aria-modal": "true", "aria-labelledby": "shortcuts-title", ref: dialogRef, tabIndex: -1, onKeyDown: trapTab, children: _jsxs("div", { className: "w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center gap-2 px-5 py-3 border-b border-gray-800 sticky top-0 bg-gray-900", children: [_jsx(Keyboard, { size: 16, className: "text-blue-300" }), _jsx("h3", { id: "shortcuts-title", className: "text-sm font-semibold text-gray-100", children: "Agent view shortcuts" }), _jsx("span", { className: "text-xs text-gray-500", children: "Ctrl+T is reserved by most browsers - use Alt+P there (Ctrl+T works in the desktop app)." }), _jsx("button", { onClick: onClose, className: "ml-auto p-1 rounded text-gray-500 hover:text-white hover:bg-gray-800", "aria-label": "Close", children: _jsx(X, { size: 14 }) })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 p-5", children: SECTIONS.map((section) => (_jsxs("div", { children: [_jsx("div", { className: "text-xs font-semibold text-gray-300 mb-2", children: section.title }), _jsx("table", { className: "w-full text-sm", children: _jsx("tbody", { children: section.rows.map(([keys, desc]) => (_jsxs("tr", { className: "border-t border-gray-800/60", children: [_jsx("td", { className: "py-1 pr-3 font-mono text-xs text-blue-300 whitespace-nowrap align-top", children: keys }), _jsx("td", { className: "py-1 text-gray-300", children: desc })] }, keys))) }) })] }, section.title))) })] }) }));
};
