import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
const field = 'w-full rounded-md border border-ag-border bg-ag-bg px-2.5 py-1.5 text-sm text-ag-text placeholder:text-ag-faint focus:outline-none focus:border-ag-accent';
/** Task, folder, optional name; Cmd/Ctrl+Enter starts, Esc closes */
export const StartAgentDialog = ({ defaultCwd, onStart, onClose, }) => {
    const [prompt, setPrompt] = useState('');
    const [cwd, setCwd] = useState(defaultCwd);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const first = useRef(null);
    useEffect(() => first.current?.focus(), []);
    const submit = async () => {
        if (!cwd.trim() || busy)
            return;
        setBusy(true);
        setError(null);
        try {
            await onStart({
                cwd: cwd.trim(),
                prompt: prompt.trim() || undefined,
                name: name.trim() || undefined,
            });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setBusy(false);
        }
    };
    return (_jsx("div", { className: "absolute inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[10vh]", onMouseDown: (e) => e.target === e.currentTarget && onClose(), children: _jsxs("form", { role: "dialog", "aria-modal": "true", "aria-labelledby": "agents-ui-start-title", className: "w-full max-w-lg rounded-lg border border-ag-border bg-ag-surface shadow-2xl", onSubmit: (e) => {
                e.preventDefault();
                void submit();
            }, onKeyDown: (e) => {
                if (e.key === 'Escape')
                    onClose();
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void submit();
                }
            }, children: [_jsxs("div", { className: "flex items-center justify-between px-4 h-11 border-b border-ag-border", children: [_jsx("h2", { id: "agents-ui-start-title", className: "text-sm font-semibold text-ag-text", children: "New agent" }), _jsx("button", { type: "button", onClick: onClose, className: "p-1.5 rounded text-ag-muted hover:text-ag-text hover:bg-ag-raised", "aria-label": "Close", children: _jsx(X, { size: 14 }) })] }), _jsxs("div", { className: "p-4 flex flex-col gap-3", children: [_jsxs("label", { className: "flex flex-col gap-1 text-xs text-ag-muted", children: ["Task", _jsx("textarea", { ref: first, value: prompt, onChange: (e) => setPrompt(e.target.value), rows: 4, placeholder: "What should the agent do? Empty: it starts and waits for input.", className: `${field} resize-y` })] }), _jsxs("label", { className: "flex flex-col gap-1 text-xs text-ag-muted", children: ["Folder", _jsx("input", { value: cwd, onChange: (e) => setCwd(e.target.value), required: true, spellCheck: false, className: `${field} font-mono` })] }), _jsxs("label", { className: "flex flex-col gap-1 text-xs text-ag-muted", children: ["Name (optional)", _jsx("input", { value: name, onChange: (e) => setName(e.target.value), className: field })] }), error && (_jsx("p", { role: "alert", className: "text-xs text-ag-danger", children: error }))] }), _jsxs("div", { className: "flex items-center justify-end gap-2 px-4 py-3 border-t border-ag-border", children: [_jsx("span", { className: "text-[11px] text-ag-faint mr-auto", children: "\u2318/Ctrl+Enter" }), _jsx("button", { type: "button", onClick: onClose, className: "px-3 py-1.5 rounded text-sm text-ag-muted hover:text-ag-text hover:bg-ag-raised", children: "Cancel" }), _jsx("button", { type: "submit", disabled: busy || !cwd.trim(), className: "px-3 py-1.5 rounded text-sm bg-ag-accent text-ag-on-accent hover:opacity-90 disabled:opacity-50", children: busy ? 'Starting…' : 'Start' })] })] }) }));
};
