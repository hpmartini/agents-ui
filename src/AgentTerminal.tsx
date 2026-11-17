import React, { useCallback, useEffect, useReducer, useRef, useSyncExternalStore } from 'react';
import { Terminal as XTerm, type ITheme } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Keyboard, LogOut, Maximize2, RefreshCw, X } from 'lucide-react';
import type { Agent, AgentsTransport, PtyChannel } from './transport';
import { attachTerminalKeys } from './terminalKeys';
import { stateGlyph, useTransport } from './state';

const paneBtn =
  'p-1.5 rounded text-ag-muted hover:text-ag-text hover:bg-ag-raised shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ag-accent';

interface AgentTerminalProps {
  agent: Agent;
  /** Whether the pane is currently visible (inactive tabs stay mounted but hidden) */
  visible: boolean;
  /** Active pane of its tab */
  active: boolean;
  onFocus: () => void;
  onClose: () => void;
  /** Present in multi-pane tabs: pulls this pane out into its own tab */
  onMaximize?: () => void;
  /** Spread on the header, which doubles as the pane's drag handle */
  headerProps?: React.HTMLAttributes<HTMLDivElement>;
  /** Only pane of its tab: the tab already shows name and state */
  solo?: boolean;
}

/**
 * A pane's terminal and PTY channel outlive its component (copied from Orkumo): splitting or
 * unsplitting a tab remounts the pane, and a new attach would restart what the user sees. An
 * unmounted pane is released only if no mount takes it back within RELEASE_MS.
 */
interface PaneTerminal {
  terminal: XTerm;
  fit: FitAddon;
  pty: PtyChannel | null;
  connected: boolean;
  exited: boolean;
  rerender: (() => void) | null;
  release?: number;
  onClose: () => void;
}
const paneTerminals = new Map<string, PaneTerminal>();
const RELEASE_MS = 2000;
const paneListeners = new Set<() => void>();
const notifyPanes = () => paneListeners.forEach((listener) => listener());
const subscribePanes = (listener: () => void) => {
  paneListeners.add(listener);
  return () => paneListeners.delete(listener);
};

/** Whether pane `id`'s terminal is connected, so the chat input can type into it */
export function usePaneConnected(id: string | null): boolean {
  return useSyncExternalStore(subscribePanes, () =>
    id ? (paneTerminals.get(id)?.connected ?? false) : false
  );
}

/**
 * Types a message into pane `id`'s agent like a paste followed by Enter (the chat input).
 * xterm's paste wraps it in bracketed-paste markers when the TUI asked for them, so a multi-line
 * message stays one message. false when the terminal is not connected.
 */
export function typeIntoPane(id: string, text: string): boolean {
  const pane = paneTerminals.get(id);
  if (!pane?.connected) return false;
  pane.terminal.paste(text);
  // A TUI that just received a paste treats an Enter in the same chunk as part of it
  window.setTimeout(() => pane.pty?.write('\r'), 80);
  return true;
}

/** Terminal colours from the panel's CSS variables, so the host theme reaches xterm too */
function themeFrom(el: HTMLElement): ITheme {
  const css = getComputedStyle(el);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const background = v('--agents-term-bg', '#0d1424');
  return {
    background,
    foreground: v('--agents-term-fg', '#e4e4e7'),
    cursor: v('--agents-term-cursor', '#8fd0ff'),
    cursorAccent: background,
    selectionBackground: v('--agents-term-selection', '#3f639980'),
  };
}

function createPaneTerminal(container: HTMLElement, onClose: () => void): PaneTerminal {
  const terminal = new XTerm({
    theme: themeFrom(container),
    fontFamily:
      getComputedStyle(container).getPropertyValue('--agents-mono').trim() ||
      'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
    fontSize: 13,
    scrollback: 5000,
    cursorBlink: true,
  });
  const fit = new FitAddon();
  const pane: PaneTerminal = {
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
  } catch {
    // container not laid out yet
  }
  const input = (data: string) => pane.pty?.write(data);
  terminal.onData(input);
  terminal.onResize(({ cols, rows }) => pane.pty?.resize(cols, rows));
  attachTerminalKeys(terminal, input, () => pane.onClose());
  return pane;
}

function connect(pane: PaneTerminal, agentId: string, transport: AgentsTransport, reset: boolean) {
  const update = (state: Partial<Pick<PaneTerminal, 'connected' | 'exited'>>) => {
    Object.assign(pane, state);
    pane.rerender?.();
    notifyPanes();
  };
  pane.pty?.close();
  update({ connected: false, exited: false });
  try {
    pane.fit.fit();
  } catch {
    // ignore
  }
  if (reset) pane.terminal.reset();
  const { terminal } = pane;
  const pty: PtyChannel = transport.attach(
    agentId,
    { cols: terminal.cols, rows: terminal.rows },
    {
      onOpen: () => {
        if (pane.pty !== pty) return;
        update({ connected: true });
        pty.resize(terminal.cols, terminal.rows);
      },
      onData: (data) => terminal.write(data),
      onExit: (code) => {
        // a superseded channel (Reattach) must not flag the live one as detached
        if (pane.pty !== pty) return;
        terminal.write(`\r\n\x1b[2m# detached${code === null ? '' : ` (exit code ${code})`}\x1b[0m\r\n`);
        update({ connected: false, exited: true });
      },
      onError: (message) => terminal.write(`\x1b[31m${message}\x1b[0m\r\n`),
    }
  );
  pane.pty = pty;
}

/**
 * A terminal pane attached to one agent. The xterm instance lives for the whole lifetime of the
 * pane; the PTY channel can be re-established with "Reattach" after the process detached.
 */
export const AgentTerminal: React.FC<AgentTerminalProps> = ({
  agent,
  visible,
  active,
  onFocus,
  onClose,
  onMaximize,
  headerProps,
  solo,
}) => {
  const transport = useTransport();
  const containerRef = useRef<HTMLDivElement>(null);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const pane = paneTerminals.get(agent.id);
  const connected = pane?.connected ?? false;
  const exited = pane?.exited ?? false;
  if (pane) pane.onClose = onClose;

  // Fit, then tell the PTY the real size even if xterm saw no change: a TUI only redraws after a resize
  const syncSize = useCallback(() => {
    const current = paneTerminals.get(agent.id);
    if (!current) return;
    try {
      current.fit.fit();
    } catch {
      return;
    }
    current.pty?.resize(current.terminal.cols, current.terminal.rows);
  }, [agent.id]);

  // Create the pane's terminal and attach, or take back the one a remount left behind
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let current = paneTerminals.get(agent.id);
    if (current?.terminal.element) {
      window.clearTimeout(current.release);
      container.appendChild(current.terminal.element);
    } else {
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
        if (paneTerminals.get(id) === held) paneTerminals.delete(id);
        notifyPanes();
      }, RELEASE_MS);
    };
    // created once per pane; onClose is refreshed on every render above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id, transport]);

  // Fit on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
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
    if (!visible) return;
    const id = requestAnimationFrame(() => {
      syncSize();
      if (active && !document.querySelector('[aria-modal="true"]'))
        paneTerminals.get(agent.id)?.terminal.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [visible, active, syncSize, agent.id]);

  const reattach = () => {
    const current = paneTerminals.get(agent.id);
    if (current) connect(current, agent.id, transport, true);
  };
  const glyph = stateGlyph(agent.displayState);

  return (
    <div
      className={`flex flex-col h-full min-h-0 bg-ag-bg border rounded-lg overflow-hidden transition-colors motion-reduce:transition-none ${
        active ? 'border-ag-accent/60' : 'border-ag-border'
      }`}
      onMouseDown={onFocus}
      data-agent-pane={agent.id}
      data-pane-active={active}
    >
      <div
        {...headerProps}
        className={`flex flex-nowrap items-center gap-x-1.5 h-8 px-2 border-b border-ag-border bg-ag-surface text-xs shrink-0 ${
          headerProps?.draggable ? 'cursor-grab active:cursor-grabbing' : ''
        } ${headerProps?.className ?? ''}`}
      >
        {!solo && (
          <>
            <span
              className={`${glyph.className} shrink-0 ${glyph.animate ? 'animate-pulse motion-reduce:animate-none' : ''}`}
              title={glyph.label}
            >
              {glyph.glyph}
            </span>
            <span className="font-medium text-ag-text truncate min-w-0">{agent.name}</span>
          </>
        )}
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${connected ? 'bg-ag-ok' : 'bg-ag-faint'}`}
          role="img"
          aria-label={connected ? 'Connected' : 'Disconnected'}
        />
        <div className="flex-1" />
        {active && !solo && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-ag-border text-ag-muted shrink-0">
            <Keyboard size={11} aria-hidden="true" /> Active
          </span>
        )}
        {connected ? (
          <button
            onClick={() => paneTerminals.get(agent.id)?.pty?.write('\x1a')}
            className={paneBtn}
            title="Detach (Ctrl+Z) - the agent keeps running"
            aria-label="Detach"
          >
            <LogOut size={12} />
          </button>
        ) : (
          <button onClick={reattach} className={paneBtn} title="Reattach" aria-label="Reattach">
            <RefreshCw size={12} />
          </button>
        )}
        {onMaximize && (
          <button
            onClick={onMaximize}
            className={paneBtn}
            title="Move to its own tab"
            aria-label="Move to own tab"
          >
            <Maximize2 size={12} />
          </button>
        )}
        <button
          onClick={onClose}
          className={`${paneBtn} hover:text-ag-danger`}
          title="Close (the agent keeps running)"
          aria-label={`Close ${agent.name}`}
        >
          <X size={12} />
        </button>
      </div>
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0 p-1 bg-ag-term" />
        {exited && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-1.5 bg-ag-surface/95 border-t border-ag-border text-xs text-ag-muted">
            <span>Detached. The agent keeps running.</span>
            <button
              onClick={reattach}
              className="flex items-center gap-1 px-2 py-1 rounded bg-ag-accent hover:opacity-90 text-ag-on-accent shrink-0"
            >
              <RefreshCw size={12} /> Reattach
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
