import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createPortal } from 'react-dom';
import { PeekPanel } from './PeekPanel';
import { useLabels } from '../../labels';
/** Window event that opens the main agent dialog from anywhere in the host (Orkumo's title bar) */
export const MAIN_AGENT_EVENT = 'orkumo:main-agent';
/**
 * Main agent (#252): the session named in the settings (the martini-workflow main orchestrator
 * by default), reachable from every view. Shows its recent output with a reply field (the peek
 * panel) and the keep-alive switch; the server restarts a stopped main agent while it is on.
 */
export const MainAgentDialog = ({ session, config, onConfig, onClose, onAttach, onReply }) => {
    const t = useLabels().shell;
    return createPortal(_jsx("div", { className: "fixed inset-0 z-[80] bg-gray-950/70 flex items-start justify-center px-4 pt-[8vh]", onMouseDown: onClose, onKeyDown: (e) => {
            if (e.key === 'Escape' && !e.defaultPrevented)
                onClose();
        }, children: _jsxs("div", { role: "dialog", "aria-modal": "true", "aria-label": t.mainAgent, onMouseDown: (e) => e.stopPropagation(), className: "w-full max-w-[760px] h-[70vh] flex flex-col bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden", children: [_jsxs("div", { className: "flex items-center gap-3 px-3 py-2 border-b border-gray-700 text-xs text-gray-300 shrink-0", children: [_jsx("span", { className: "font-semibold text-gray-50", children: t.mainAgent }), _jsx("span", { className: "font-mono text-gray-400", children: config.name }), _jsxs("label", { className: "ml-auto flex items-center gap-1.5 cursor-pointer", title: t.keepAliveTitle, children: [_jsx("input", { type: "checkbox", checked: config.keepAlive, onChange: (e) => onConfig({ ...config, keepAlive: e.target.checked }) }), t.keepAlive] })] }), _jsx("div", { className: "flex-1 min-h-0", children: session ? (_jsx(PeekPanel, { session: session, onClose: onClose, onAttach: () => onAttach(session), onReply: (text) => onReply(session, text) })) : (_jsxs("div", { className: "h-full flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-gray-300", children: [_jsxs("p", { children: [t.noMainSession[0], _jsx("span", { className: "font-mono", children: config.name }), t.noMainSession[1]] }), _jsxs("p", { className: "text-xs text-gray-400", children: [t.startMainSession[0], _jsxs("span", { className: "font-mono", children: ["claude --bg --name ", config.name] }), t.startMainSession[1]] }), _jsx("button", { autoFocus: true, onClick: onClose, className: "mt-2 px-3 py-1.5 rounded text-xs text-gray-200 bg-gray-700 hover:bg-gray-600", children: t.close })] })) })] }) }), document.body);
};
