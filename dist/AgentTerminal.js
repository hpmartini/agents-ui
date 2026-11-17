import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useReducer, useRef, useSyncExternalStore } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Keyboard, LogOut, Maximize2, RefreshCw, X } from 'lucide-react';
import { attachTerminalKeys } from './terminalKeys';
import { stateGlyph, useTransport } from './state';
const paneBtn = 'p-1.5 rounded text-ag-muted hover:text-ag-text hover:bg-ag-raised shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ag-accent';
const paneTerminals = new Map();
const RELEASE_MS = 2000;
const paneListeners = new Set();
const notifyPanes = () => paneListeners.forEach((listener) => listener());
const subscribePanes = (listener) => {
    paneListeners.add(listener);
    return () => paneListeners.delete(listener);
};
/** Whether pane `id`'s terminal is connected, so the chat input can type into it */
export function usePaneConnected(id) {
    return useSyncExternalStore(subscribePanes, () => id ? (paneTerminals.get(id)?.connected ?? false) : false);
}
/**
 * Types a message into pane `id`'s agent like a paste followed by Enter (the chat input).
 * xterm's paste wraps it in bracketed-paste markers when the TUI asked for them, so a multi-line
 * message stays one message. false when the terminal is not connected.
 */
export function typeIntoPane(id, text) {
    const pane = paneTerminals.get(id);
    if (!pane?.connected)
        return false;
    pane.terminal.paste(text);
    // A TUI that just received a paste treats an Enter in the same chunk as part of it
    window.setTimeout(() => pane.pty?.write('\r'), 80);
    return true;
}
/** Terminal colours from the panel's CSS variables, so the host theme reaches xterm too */
function themeFrom(el) {
    const css = getComputedStyle(el);
    const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    const background = v('--agents-term-bg', '#0d1424');
    return {
        background,
        foreground: v('--agents-term-fg', '#e4e4e7'),
        cursor: v('--agents-term-cursor', '#8fd0ff'),
        cursorAccent: background,
        selectionBackground: v('--agents-term-selection', '#3f639980'),
    };
}
function createPaneTerminal(container, onClose) {
    const terminal = new XTerm({
        theme: themeFrom(container),
        fontFamily: getComputedStyle(container).getPropertyValue('--agents-mono').trim() ||
            'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
        fontSize: 13,
        scrollback: 5000,
        cursorBlink: true,
    });
    const fit = new FitAddon();
    const pane = {
        terminal,
        fit,
        pty: null,
        connected: false,
        exited: false,
        rerender: null,
        onClose,
    };
    terminal.loadAddon(fit);
    terminal.open(container);
    try {
        fit.fit();
    }
    catch {
        // container not laid out yet
    }
    const input = (data) => pane.pty?.write(data);
    terminal.onData(input);
    terminal.onResize(({ cols, rows }) => pane.pty?.resize(cols, rows));
    attachTerminalKeys(terminal, input, () => pane.onClose());
    return pane;
}
function connect(pane, agentId, transport, reset) {
    const update = (state) => {
        Object.assign(pane, state);
        pane.rerender?.();
        notifyPanes();
    };
    pane.pty?.close();
    update({ connected: false, exited: false });
    try {
        pane.fit.fit();
    }
    catch {
        // ignore
    }
    if (reset)
        pane.terminal.reset();
    const { terminal } = pane;
    const pty = transport.attach(agentId, { cols: terminal.cols, rows: terminal.rows }, {
        onOpen: () => {
            if (pane.pty !== pty)
                return;
            update({ connected: true });
            pty.resize(terminal.cols, terminal.rows);
        },
        onData: (data) => terminal.write(data),
        onExit: (code) => {
            // a superseded channel (Reattach) must not flag the live one as detached
            if (pane.pty !== pty)
                return;
            terminal.write(`\r\n\x1b[2m# detached${code === null ? '' : ` (exit code ${code})`}\x1b[0m\r\n`);
            update({ connected: false, exited: true });
        },
        onError: (message) => terminal.write(`\x1b[31m${message}\x1b[0m\r\n`),
    });
    pane.pty = pty;
}
/**
 * A terminal pane attached to one agent. The xterm instance lives for the whole lifetime of the
 * pane; the PTY channel can be re-established with "Reattach" after the process detached.
 */
export const AgentTerminal = ({ agent, visible, active, onFocus, onClose, onMaximize, headerProps, solo, }) => {
    const transport = useTransport();
    const containerRef = useRef(null);
    const [, rerender] = useReducer((n) => n + 1, 0);
    const pane = paneTerminals.get(agent.id);
    const connected = pane?.connected ?? false;
    const exited = pane?.exited ?? false;
    if (pane)
        pane.onClose = onClose;
    // Fit, then tell the PTY the real size even if xterm saw no change: a TUI only redraws after a resize
    const syncSize = useCallback(() => {
        const current = paneTerminals.get(agent.id);
        if (!current)
            return;
        try {
            current.fit.fit();
        }
        catch {
            return;
        }
        current.pty?.resize(current.terminal.cols, current.terminal.rows);
    }, [agent.id]);
    // Create the pane's terminal and attach, or take back the one a remount left behind
    useEffect(() => {
        const container = containerRef.current;
        if (!container)
            return;
        let current = paneTerminals.get(agent.id);
        if (current?.terminal.element) {
            window.clearTimeout(current.release);
            container.appendChild(current.terminal.element);
        }
        else {
            current = createPaneTerminal(container, onClose);
            paneTerminals.set(agent.id, current);
            connect(current, agent.id, transport, false);
        }
        current.rerender = rerender;
        rerender();
        const id = agent.id;
        const held = current;
        return () => {
            held.rerender = null;
            held.release = window.setTimeout(() => {
                held.pty?.close();
                held.terminal.dispose();
                if (paneTerminals.get(id) === held)
                    paneTerminals.delete(id);
                notifyPanes();
            }, RELEASE_MS);
        };
        // created once per pane; onClose is refreshed on every render above
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [agent.id, transport]);
    // Fit on resize
    useEffect(() => {
        const container = containerRef.current;
        if (!container)
            return;
        let timer;
        const observer = new ResizeObserver(() => {
            clearTimeout(timer);
            timer = setTimeout(syncSize, 50);
        });
        observer.observe(container);
        return () => {
            clearTimeout(timer);
            observer.disconnect();
        };
    }, [syncSize]);
    useEffect(() => {
        if (!visible)
            return;
        const id = requestAnimationFrame(() => {
            syncSize();
            if (active && !document.querySelector('[aria-modal="true"]'))
                paneTerminals.get(agent.id)?.terminal.focus();
        });
        return () => cancelAnimationFrame(id);
    }, [visible, active, syncSize, agent.id]);
    const reattach = () => {
        const current = paneTerminals.get(agent.id);
        if (current)
            connect(current, agent.id, transport, true);
    };
    const glyph = stateGlyph(agent.displayState);
    return (_jsxs("div", { className: `flex flex-col h-full min-h-0 bg-ag-bg border rounded-lg overflow-hidden transition-colors motion-reduce:transition-none ${active ? 'border-ag-accent/60' : 'border-ag-border'}`, onMouseDown: onFocus, "data-agent-pane": agent.id, "data-pane-active": active, children: [_jsxs("div", { ...headerProps, className: `flex flex-nowrap items-center gap-x-1.5 h-8 px-2 border-b border-ag-border bg-ag-surface text-xs shrink-0 ${headerProps?.draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${headerProps?.className ?? ''}`, children: [!solo && (_jsxs(_Fragment, { children: [_jsx("span", { className: `${glyph.className} shrink-0 ${glyph.animate ? 'animate-pulse motion-reduce:animate-none' : ''}`, title: glyph.label, children: glyph.glyph }), _jsx("span", { className: "font-medium text-ag-text truncate min-w-0", children: agent.name })] })), _jsx("span", { className: `w-1.5 h-1.5 rounded-full shrink-0 ${connected ? 'bg-ag-ok' : 'bg-ag-faint'}`, role: "img", "aria-label": connected ? 'Connected' : 'Disconnected' }), _jsx("div", { className: "flex-1" }), active && !solo && (_jsxs("span", { className: "flex items-center gap-1 px-1.5 py-0.5 rounded border border-ag-border text-ag-muted shrink-0", children: [_jsx(Keyboard, { size: 11, "aria-hidden": "true" }), " Active"] })), connected ? (_jsx("button", { onClick: () => paneTerminals.get(agent.id)?.pty?.write('\x1a'), className: paneBtn, title: "Detach (Ctrl+Z) - the agent keeps running", "aria-label": "Detach", children: _jsx(LogOut, { size: 12 }) })) : (_jsx("button", { onClick: reattach, className: paneBtn, title: "Reattach", "aria-label": "Reattach", children: _jsx(RefreshCw, { size: 12 }) })), onMaximize && (_jsx("button", { onClick: onMaximize, className: paneBtn, title: "Move to its own tab", "aria-label": "Move to own tab", children: _jsx(Maximize2, { size: 12 }) })), _jsx("button", { onClick: onClose, className: `${paneBtn} hover:text-ag-danger`, title: "Close (the agent keeps running)", "aria-label": `Close ${agent.name}`, children: _jsx(X, { size: 12 }) })] }), _jsxs("div", { className: "relative flex-1 min-h-0", children: [_jsx("div", { ref: containerRef, className: "absolute inset-0 p-1 bg-ag-term" }), exited && (_jsxs("div", { className: "absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-1.5 bg-ag-surface/95 border-t border-ag-border text-xs text-ag-muted", children: [_jsx("span", { children: "Detached. The agent keeps running." }), _jsxs("button", { onClick: reattach, className: "flex items-center gap-1 px-2 py-1 rounded bg-ag-accent hover:opacity-90 text-ag-on-accent shrink-0", children: [_jsx(RefreshCw, { size: 12 }), " Reattach"] })] }))] })] }));
};
