import React, { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { Terminal as XTerm, type ITheme } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Keyboard, LogOut, Maximize2, RefreshCw, X } from 'lucide-react';
import type { Agent, AgentsTransport, PtyChannel } from './transport';
import { attachTerminalKeys } from './terminalKeys';
import { stateGlyph, useTransport } from './state';
import { en, useLabels, type Labels } from './labels';
import { AgentTranscript } from './AgentTranscript';

// terminal or transcript per agent; outlives the pane, which remounts on split and unsplit
const paneViews = new Map<string, 'terminal' | 'transcript'>();

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
  /** Refreshed on every render, like onClose: texts the terminal writes itself */
  labels: Labels;
  /** Last theme/font we applied (xterm normalizes options, so they cannot be compared) */
  style: string;
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

/** Nerd Font first (prompt and TUI glyphs), plain monospace when none is installed */
export const DEFAULT_TERMINAL_FONT =
  '"JetBrainsMono Nerd Font", "JetBrainsMono NF", "MesloLGS NF", "Hack Nerd Font", "FiraCode Nerd Font", "Symbols Nerd Font Mono", "JetBrains Mono", Menlo, Monaco, Consolas, monospace';

const ANSI = [
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
] as const;
const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * Terminal colours from the panel's CSS variables, so the host theme (light or dark) reaches
 * xterm too: --agents-term-* first, then the panel's own --agents-bg/--agents-text, and the 16
 * ANSI colours as --agents-term-<name> (e.g. --agents-term-bright-blue) where the host sets them.
 */
function themeFrom(el: HTMLElement): ITheme {
  const css = getComputedStyle(el);
  const v = (name: string, fallback = '') => css.getPropertyValue(name).trim() || fallback;
  const background = v('--agents-term-bg', v('--agents-bg', '#0b1220'));
  const theme: ITheme = {
    background,
    foreground: v('--agents-term-fg', v('--agents-text', '#e4e4e7')),
    cursor: v('--agents-term-cursor', v('--agents-accent', '#8fd0ff')),
    cursorAccent: background,
    selectionBackground: v('--agents-term-selection', '#3f639980'),
  };
  for (const name of ANSI) {
    const colour = v(`--agents-term-${kebab(name)}`);
    if (colour) theme[name] = colour;
  }
  return theme;
}

const fontFrom = (el: HTMLElement) =>
  getComputedStyle(el).getPropertyValue('--agents-mono').trim() || DEFAULT_TERMINAL_FONT;

/**
 * Re-reads colours and font of every open terminal from the --agents-* variables. Runs by itself
 * when <html>/<body> change class, style or data-theme, or the OS colour scheme flips; a host that
 * switches its theme elsewhere (a wrapper element) calls it after the switch.
 */
export function refreshTerminalTheme() {
  for (const pane of paneTerminals.values()) {
    const host = pane.terminal.element?.parentElement;
    if (!host) continue;
    const theme = themeFrom(host);
    const font = fontFrom(host);
    const style = JSON.stringify([theme, font]);
    // applying a theme mutates xterm's own styles, which wakes the observer again: stop here
    if (style === pane.style) continue;
    const fontChanged = font !== pane.terminal.options.fontFamily;
    pane.style = style;
    pane.terminal.options.theme = theme;
    if (fontChanged) {
      pane.terminal.options.fontFamily = font;
      try {
        pane.fit.fit();
      } catch {
        // not laid out
      }
    }
  }
}
let themeWatch: (() => void) | null = null;
/** One watcher for all panes: class/style/data-theme changes anywhere, and the OS colour scheme */
function watchTheme() {
  if (themeWatch || typeof MutationObserver === 'undefined') return;
  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(refreshTerminalTheme);
  };
  // no subtree: watching every element would run on each xterm repaint; themes live on html/body
  const observer = new MutationObserver(schedule);
  const filter = { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] };
  observer.observe(document.documentElement, filter);
  if (document.body) observer.observe(document.body, filter);
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener?.('change', schedule);
  themeWatch = () => {
    observer.disconnect();
    media?.removeEventListener?.('change', schedule);
    themeWatch = null;
  };
}

function createPaneTerminal(container: HTMLElement, onClose: () => void, labels: Labels): PaneTerminal {
  watchTheme();
  const theme = themeFrom(container);
  const fontFamily = fontFrom(container);
  const terminal = new XTerm({
    theme,
    fontFamily,
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
    labels,
    style: JSON.stringify([theme, fontFamily]),
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
        terminal.write(`\r\n\x1b[2m${pane.labels.detachedLine(code)}\x1b[0m\r\n`);
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
  const t = useLabels();
  const [view, setViewState] = useState(() => (transport.transcript && paneViews.get(agent.id)) || 'terminal');
  const setView = (next: 'terminal' | 'transcript') => {
    paneViews.set(agent.id, next);
    setViewState(next);
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const pane = paneTerminals.get(agent.id);
  const connected = pane?.connected ?? false;
  const exited = pane?.exited ?? false;
  if (pane) {
    pane.onClose = onClose;
    pane.labels = t;
  }

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
      // a parked pane missed theme switches while it was out of the document
      refreshTerminalTheme();
    } else {
      current = createPaneTerminal(container, onClose, t);
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
              title={t.states[agent.displayState]}
            >
              {glyph.glyph}
            </span>
            <span className="font-medium text-ag-text truncate min-w-0">{agent.name}</span>
          </>
        )}
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${connected ? 'bg-ag-ok' : 'bg-ag-faint'}`}
          role="img"
          aria-label={connected ? t.connected : t.disconnected}
        />
        <div className="flex-1" />
        {transport.transcript && (
          <div
            role="group"
            aria-label={t.viewSwitch}
            className="flex shrink-0 rounded border border-ag-border overflow-hidden"
          >
            {(['terminal', 'transcript'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`px-1.5 py-0.5 text-[11px] leading-none ${
                  view === v ? 'bg-ag-accent text-ag-on-accent' : 'text-ag-muted hover:text-ag-text'
                }`}
              >
                {v === 'terminal' ? t.terminalView : t.transcriptView}
              </button>
            ))}
          </div>
        )}
        {active && !solo && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-ag-border text-ag-muted shrink-0">
            <Keyboard size={11} aria-hidden="true" /> {t.active}
          </span>
        )}
        {connected ? (
          <button
            onClick={() => paneTerminals.get(agent.id)?.pty?.write('\x1a')}
            className={paneBtn}
            title={t.detachTitle}
            aria-label={t.detach}
          >
            <LogOut size={12} />
          </button>
        ) : (
          <button onClick={reattach} className={paneBtn} title={t.reattach} aria-label={t.reattach}>
            <RefreshCw size={12} />
          </button>
        )}
        {onMaximize && (
          <button
            onClick={onMaximize}
            className={paneBtn}
            title={t.moveToOwnTabTitle}
            aria-label={t.moveToOwnTab}
          >
            <Maximize2 size={12} />
          </button>
        )}
        <button
          onClick={onClose}
          className={`${paneBtn} hover:text-ag-danger`}
          title={t.closePaneTitle}
          aria-label={t.closePane(agent.name)}
        >
          <X size={12} />
        </button>
      </div>
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0 p-1 bg-ag-term" />
        {/* over the terminal, which stays attached underneath and keeps its scrollback */}
        {view === 'transcript' && <AgentTranscript agentId={agent.id} />}
        {exited && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-1.5 bg-ag-surface/95 border-t border-ag-border text-xs text-ag-muted">
            <span>{t.detachedNote}</span>
            <button
              onClick={reattach}
              className="flex items-center gap-1 px-2 py-1 rounded bg-ag-accent hover:opacity-90 text-ag-on-accent shrink-0"
            >
              <RefreshCw size={12} /> {t.reattach}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
