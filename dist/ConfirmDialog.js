import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { useLabels } from './labels';
/** Small modal yes/no inside the panel (no window.confirm: it blocks and cannot be themed) */
export const ConfirmDialog = ({ title, body, confirm, onConfirm, onCancel }) => {
    const t = useLabels();
    const cancelRef = useRef(null);
    // the safe choice has focus, so Enter does not stop by accident
    useEffect(() => cancelRef.current?.focus(), []);
    return (_jsx("div", { className: "absolute inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[15vh]", onMouseDown: (e) => e.target === e.currentTarget && onCancel(), children: _jsxs("div", { role: "alertdialog", "aria-modal": "true", "aria-labelledby": "agents-ui-confirm-title", "aria-describedby": "agents-ui-confirm-body", className: "w-full max-w-sm rounded-lg border border-ag-border bg-ag-surface shadow-2xl", onKeyDown: (e) => e.key === 'Escape' && onCancel(), children: [_jsxs("div", { className: "p-4", children: [_jsx("h2", { id: "agents-ui-confirm-title", className: "text-sm font-semibold text-ag-text", children: title }), _jsx("p", { id: "agents-ui-confirm-body", className: "mt-1.5 text-xs text-ag-muted", children: body })] }), _jsxs("div", { className: "flex justify-end gap-2 px-4 py-3 border-t border-ag-border", children: [_jsx("button", { ref: cancelRef, onClick: onCancel, className: "px-3 py-1.5 rounded text-sm text-ag-muted hover:text-ag-text hover:bg-ag-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-ag-accent", children: t.cancel }), _jsx("button", { onClick: onConfirm, className: "px-3 py-1.5 rounded text-sm bg-ag-danger text-ag-on-accent hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ag-danger", children: confirm })] })] }) }));
};
