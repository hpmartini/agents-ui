import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useDialogA11y } from '../CommandPalette/useDialogA11y';
import { useLabels } from '../../labels';
export const ShortcutsHelp = ({ open, onClose }) => {
    const dialogRef = useRef(null);
    const trapTab = useDialogA11y(open, dialogRef, () => dialogRef.current);
    const t = useLabels().panels;
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
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-gray-950/70 flex items-center justify-center p-4", onClick: onClose, role: "dialog", "aria-modal": "true", "aria-labelledby": "shortcuts-title", ref: dialogRef, tabIndex: -1, onKeyDown: trapTab, children: _jsxs("div", { className: "w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center gap-2 px-5 py-3 border-b border-gray-800 sticky top-0 bg-gray-900", children: [_jsx(Keyboard, { size: 16, className: "text-blue-300" }), _jsx("h3", { id: "shortcuts-title", className: "text-sm font-semibold text-gray-100", children: t.shortcutsTitle }), _jsx("span", { className: "text-xs text-gray-500", children: t.shortcutsBrowserNote }), _jsx("button", { onClick: onClose, className: "ml-auto p-1 rounded text-gray-500 hover:text-white hover:bg-gray-800", "aria-label": t.close, children: _jsx(X, { size: 14 }) })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 p-5", children: t.shortcutSections.map((section) => (_jsxs("div", { children: [_jsx("div", { className: "text-xs font-semibold text-gray-300 mb-2", children: section.title }), _jsx("table", { className: "w-full text-sm", children: _jsx("tbody", { children: section.rows.map(([keys, desc]) => (_jsxs("tr", { className: "border-t border-gray-800/60", children: [_jsx("td", { className: "py-1 pr-3 font-mono text-xs text-blue-300 whitespace-nowrap align-top", children: keys }), _jsx("td", { className: "py-1 text-gray-300", children: desc })] }, keys))) }) })] }, section.title))) })] }) }));
};
