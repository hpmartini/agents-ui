import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, RefreshCw, Copy, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { useHost, useTransport } from '../../host';
import { useLabels } from '../../labels';
import { extractNumberedChoices } from '../../utils/agentInput';
import { renderTerminalScreen } from '../../utils/terminalScreen';
import { useDialogA11y } from '../CommandPalette/useDialogA11y';
import { appOriginLabel, sessionHarness, stateGlyph } from '../../utils/agentSessions';
import { openInSystemBrowser } from '../../utils/links';
import { pollWhileVisible } from '../../utils/visiblePoll';
/**
 * Peek panel: recent output / blocking question of a session plus a reply input.
 * Numbered keys pick predefined choices, Tab inserts the suggested reply,
 * a `!` prefix sends a shell command instead of a prompt. The maximize button shows the same
 * panel as a near full-screen modal for wide output (tables, long answers).
 * Without the transport's `logs` group there is no output; without `messaging` no reply input
 * and no choice buttons (read-only peek).
 */
export const PeekPanel = ({ session, onClose, onAttach, onReply }) => {
    const [logs, setLogs] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const replyRef = useRef(null);
    const outputRef = useRef(null);
    const dialogRef = useRef(null);
    const { toast } = useHost();
    const labels = useLabels();
    const t = labels.panels;
    const transport = useTransport();
    const logsApi = transport.logs;
    const canReply = !!transport.messaging;
    const [expanded, setExpanded] = useState(false);
    // `claude logs` is a raw TUI stream; this is its final screen as plain text
    const [screen, setScreen] = useState('');
    const trapTab = useDialogA11y(expanded, dialogRef, () => replyRef.current);
    // A harness session the server lists (#195, omp) has a transcript; one only started here not yet
    const harness = sessionHarness(session) !== 'claude';
    const harnessTranscript = harness && !!session.sessionId;
    const load = useCallback(async () => {
        if (session.kind === 'interactive' && !harnessTranscript) {
            setLogs({
                source: 'logs',
                text: '',
                entries: [],
                note: harness ? t.peekHarnessNote : t.peekInteractiveNote,
            });
            setLoading(false);
            return;
        }
        if (!logsApi) {
            setLoading(false);
            return;
        }
        try {
            const data = await logsApi.fetchAgentLogs(session.id, 60);
            setLogs(data);
        }
        catch (err) {
            setLogs({
                source: 'logs',
                text: '',
                entries: [],
                note: err instanceof Error ? err.message : t.peekLoadFailed,
            });
        }
        finally {
            setLoading(false);
        }
    }, [session.id, session.kind, harness, harnessTranscript, logsApi, t]);
    useEffect(() => {
        setLoading(true);
        return pollWhileVisible(load, 4000);
    }, [load]);
    useEffect(() => {
        setExpanded(false);
    }, [session.id]);
    // The panel remounts when it moves into / out of the modal, so focus follows explicitly
    useEffect(() => {
        replyRef.current?.focus();
    }, [session.id, expanded]);
    const rawText = logs?.source === 'logs' ? logs.text : '';
    useEffect(() => {
        let cancelled = false;
        renderTerminalScreen(rawText).then((text) => {
            if (!cancelled)
                setScreen(text);
        });
        return () => {
            cancelled = true;
        };
    }, [rawText]);
    useEffect(() => {
        outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
    }, [logs, screen, expanded]);
    const choices = canReply && logs?.source === 'logs' ? extractNumberedChoices(screen) : [];
    const send = async (text) => {
        if (!text.trim() || sending)
            return;
        setSending(true);
        try {
            await onReply(text);
            setReply('');
            toast.success(text.startsWith('!') ? t.peekCommandSent : t.peekReplySent);
            setTimeout(load, 1500);
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : t.peekReplyFailed);
        }
        finally {
            setSending(false);
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            send(reply);
            return;
        }
        if (e.key === 'Tab' && session.suggestedReply && !reply) {
            e.preventDefault();
            setReply(session.suggestedReply);
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            if (expanded)
                setExpanded(false);
            else
                onClose();
            return;
        }
        if (!reply && /^[1-9]$/.test(e.key) && choices.some((c) => c.number === Number(e.key))) {
            e.preventDefault();
            send(e.key);
        }
    };
    const glyph = stateGlyph(session.displayState, labels.shell.displayStates);
    const appUrl = session.app?.url;
    const outputLines = screen
        .split('\n')
        .filter((line, idx, arr) => line.trim() || (idx > 0 && arr[idx - 1].trim()));
    const panel = (_jsxs("div", { className: `flex flex-col h-full min-h-0 bg-gray-950 ${expanded ? 'w-full rounded-xl border border-gray-700 shadow-2xl overflow-hidden' : 'border-l border-gray-800'}`, "data-peek-panel": true, onClick: expanded ? (e) => e.stopPropagation() : undefined, children: [_jsxs("div", { className: "flex items-center gap-2 px-3 py-2 border-b border-gray-800 shrink-0", children: [_jsx("span", { className: `${glyph.className} ${glyph.animate ? 'animate-pulse' : ''}`, children: glyph.glyph }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { id: "peek-title", className: "text-sm font-medium text-gray-100 truncate", children: session.name }), _jsxs("div", { className: "text-[11px] text-gray-500 font-mono truncate", children: [session.id, " \u00B7 ", session.cwd] })] }), logsApi && (_jsx("button", { onClick: load, className: "p-1 rounded text-gray-500 hover:text-white hover:bg-gray-800", title: t.peekRefresh, children: _jsx(RefreshCw, { size: 12, className: loading ? 'animate-spin' : '' }) })), _jsx("button", { onClick: () => {
                            navigator.clipboard?.writeText(session.sessionId || session.id);
                            toast.success(t.peekIdCopied);
                        }, className: "p-1 rounded text-gray-500 hover:text-white hover:bg-gray-800", title: t.peekCopyId, children: _jsx(Copy, { size: 12 }) }), _jsx("button", { onClick: () => setExpanded((v) => !v), className: "p-1 rounded text-gray-500 hover:text-white hover:bg-gray-800", title: expanded ? t.peekBackToPanelEsc : t.peekOpenLarge, "aria-label": expanded ? t.peekBackToPanel : t.peekOpenLarge, children: expanded ? _jsx(Minimize2, { size: 12 }) : _jsx(Maximize2, { size: 12 }) }), appUrl ? (_jsxs("button", { onClick: () => openInSystemBrowser(appUrl), className: "flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-600/20 text-blue-300 hover:bg-blue-600/40", title: t.peekOpenOnClaudeAi, children: [_jsx(ExternalLink, { size: 12 }), " claude.ai"] })) : (_jsxs("button", { onClick: onAttach, className: "flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-600/20 text-blue-300 hover:bg-blue-600/40", title: harness ? t.peekOpenInTerminal : t.peekAttachTitle, children: [_jsx(ArrowRight, { size: 12 }), " ", harness ? t.open : t.peekAttach] })), _jsx("button", { onClick: onClose, className: "p-1 rounded text-gray-500 hover:text-white hover:bg-gray-800", title: t.peekCloseTitle, children: _jsx(X, { size: 14 }) })] }), _jsxs("div", { className: "px-3 py-2 border-b border-gray-800 text-xs space-y-1 shrink-0", children: [_jsxs("div", { className: "text-gray-400", children: [_jsx("span", { className: "text-gray-500", children: t.peekState }), glyph.label.toLowerCase(), session.app && (_jsx("span", { className: "text-violet-300", children: t.peekStartedInApp(appOriginLabel(session) ?? '') })), session.waitingFor && (_jsx("span", { className: "text-yellow-400", children: t.peekWaitingFor(session.waitingFor) })), session.tokens != null && (_jsx("span", { className: "text-gray-500", children: t.peekTokens(session.tokens) }))] }), session.detail && _jsx("div", { className: "text-gray-300", children: session.detail }), session.intent && (_jsxs("div", { className: "text-gray-500 line-clamp-3", title: session.intent, children: [_jsx("span", { className: "text-gray-500", children: t.peekTask }), session.intent] })), session.worktree && (_jsxs("div", { className: "text-gray-500 font-mono truncate", children: [t.peekWorktree, " ", session.worktree] })), session.links.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1 pt-1", children: session.links.map((link) => (_jsxs("a", { href: link.href, target: "_blank", rel: "noreferrer", className: "flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-700 text-gray-300 hover:border-blue-500/50 hover:text-white", children: [link.provider === 'gitlab' ? '!' : '#', link.number ?? 'PR', " ", link.title ? `· ${link.title}` : '', _jsx(ExternalLink, { size: 9 })] }, link.id))) }))] }), (logsApi || logs) && (_jsxs("div", { ref: outputRef, className: "flex-1 overflow-auto min-h-0 p-3 font-mono text-xs leading-5", style: { backgroundColor: '#1a274b' }, children: [loading && !logs ? (_jsx("div", { className: "text-gray-500 italic", children: t.peekLoading })) : logs?.source === 'transcript' ? (logs.entries.length === 0 ? (_jsx("div", { className: "text-gray-500 italic", children: logs.note || t.peekNoOutput })) : (logs.entries.map((entry, idx) => (_jsxs("div", { className: `mb-3 whitespace-pre-wrap break-words ${entry.role === 'user' ? 'text-blue-300' : 'text-gray-200'}`, children: [_jsx("span", { className: "text-gray-500 select-none", children: entry.role === 'user' ? '❯ ' : '● ' }), entry.text] }, idx))))) : outputLines.length === 0 ? (_jsx("div", { className: "text-gray-500 italic", children: logs?.note || t.peekNoOutput })) : (
                    // Terminal layout: no wrapping (it would tear tables apart), scroll sideways instead
                    _jsx("pre", { className: "w-max min-w-full whitespace-pre text-gray-300", "data-peek-screen": true, children: outputLines.join('\n') })), session.result && logs?.source === 'transcript' && (_jsx("div", { className: "mt-2 pt-2 border-t border-gray-800 text-emerald-300 whitespace-pre-wrap", children: session.result }))] })), choices.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1 px-3 py-2 border-t border-gray-800 shrink-0", children: choices.map((choice) => (_jsxs("button", { onClick: () => send(String(choice.number)), className: "px-2 py-1 rounded border border-gray-700 text-xs text-gray-200 hover:border-blue-500/60 hover:bg-blue-600/10", children: [_jsx("span", { className: "text-blue-300 font-mono mr-1", children: choice.number }), choice.label] }, choice.number))) })), canReply && (_jsxs("div", { className: "border-t border-gray-800 px-3 py-2 shrink-0", children: [session.suggestedReply && !reply && (_jsxs("div", { className: "text-[11px] text-gray-500 mb-1 truncate", children: [_jsx("kbd", { className: "kbd", children: "Tab" }), " ", session.suggestedReply] })), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-blue-300 font-mono", children: "\u276F" }), _jsx("input", { ref: replyRef, value: reply, onChange: (e) => setReply(e.target.value), onKeyDown: handleKeyDown, disabled: sending || !!session.app || harness, placeholder: session.app
                                    ? t.peekReplyInApp
                                    : harness
                                        ? t.peekReplyHarness
                                        : session.kind === 'interactive'
                                            ? t.peekReplyInteractive
                                            : t.peekReplyPlaceholder, className: "flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 outline-none font-mono", "aria-label": t.peekReplyLabel }), sending && _jsx(RefreshCw, { size: 12, className: "animate-spin text-gray-500" })] })] }))] }));
    if (!expanded)
        return panel;
    return createPortal(_jsx("div", { ref: dialogRef, className: "agents-ui fixed inset-0 z-50 bg-gray-950/70 flex p-4 md:p-8", role: "dialog", "aria-modal": "true", "aria-labelledby": "peek-title", tabIndex: -1, onClick: () => setExpanded(false), onKeyDown: (e) => {
            if (e.key === 'Escape' && !e.defaultPrevented) {
                e.preventDefault();
                setExpanded(false);
            }
            else if (!e.defaultPrevented)
                trapTab(e);
        }, children: panel }), document.body);
};
