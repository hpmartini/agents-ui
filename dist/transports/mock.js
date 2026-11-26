import { createLocalSettings } from '../settings';
const ESC = '\x1b[';
const banner = (session) => `${ESC}38;5;208m✻${ESC}0m ${session.name}\r\n` +
    `${ESC}2m${session.detail ?? session.intent ?? 'waiting for input'}${ESC}0m\r\n\r\n> `;
/** A new background session as the list shows it */
function mockSession(id, fields) {
    return {
        id,
        sessionId: null,
        kind: 'background',
        startedAt: Date.now(),
        state: 'working',
        pinned: false,
        order: null,
        links: [],
        displayState: 'working',
        ...fields,
    };
}
/**
 * The socket the terminal reads: Orkumo's PTY protocol over an in-memory object with the
 * WebSocket surface the terminal uses. Echoes what is typed and answers each line.
 */
class MockPtySocket {
    session;
    onLine;
    onClose;
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = MockPtySocket.CONNECTING;
    onopen = null;
    onmessage = null;
    onclose = null;
    onerror = null;
    line = '';
    constructor(session, onLine, onClose, delayMs) {
        this.session = session;
        this.onLine = onLine;
        this.onClose = onClose;
        const open = () => {
            if (this.readyState !== MockPtySocket.CONNECTING)
                return;
            this.readyState = MockPtySocket.OPEN;
            this.onopen?.(new Event('open'));
            if (!session) {
                this.emit({ type: 'error', message: 'unknown agent' });
                return;
            }
            this.emit({ type: 'connected', pid: 4242, cwd: session.cwd });
            this.output(banner(session));
        };
        if (delayMs > 0)
            setTimeout(open, delayMs);
        else
            queueMicrotask(open);
    }
    emit(message) {
        if (this.readyState !== MockPtySocket.OPEN)
            return;
        this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }));
    }
    output(data) {
        this.emit({ type: 'output', data });
    }
    send(raw) {
        if (this.readyState !== MockPtySocket.OPEN)
            return;
        const message = JSON.parse(raw);
        if (message.type !== 'input' || !message.data)
            return;
        for (const ch of message.data) {
            if (ch === '\r') {
                this.output(`\r\n${ESC}36m●${ESC}0m mock answer to: ${this.line}\r\n\r\n> `);
                this.onLine(this.line);
                this.line = '';
            }
            else if (ch === '\x7f') {
                if (this.line)
                    this.output('\b \b');
                this.line = this.line.slice(0, -1);
            }
            else if (ch >= ' ') {
                this.line += ch;
                this.output(ch);
            }
        }
    }
    /** The session ended (stop): the terminal sees `exit`, then the socket closes */
    exit() {
        this.emit({ type: 'exit', exitCode: 0 });
        this.close();
    }
    close() {
        if (this.readyState === MockPtySocket.CLOSED)
            return;
        this.readyState = MockPtySocket.CLOSED;
        this.onClose();
        this.onclose?.(new CloseEvent('close'));
    }
}
/**
 * In-memory transport for the demo and tests: sessions live in an array, `dispatchAgent` adds
 * one, `stopAgent` marks it stopped, a terminal echoes what is typed and answers each line, and
 * `logs` returns those lines (peek panel). Settings are kept in memory. No timers run unless
 * `latencyMs` > 0.
 */
export function createMockTransport(initial = [], { latencyMs = 0, contextTokens: initialTokens = {}, handoffStepMs = 0, handoffError, handoffResetTokens = 12_000, } = {}) {
    let sessions = [...initial];
    const subscribers = new Set();
    const sockets = new Map();
    const transcripts = new Map();
    const attachCount = new Map();
    let counter = sessions.length;
    let failure = null;
    const deliver = (handlers) => {
        if (failure) {
            handlers.onConnectionChange?.(false);
            handlers.onError?.(failure.message);
        }
        else {
            handlers.onConnectionChange?.(true);
            handlers.onSessions(sessions);
        }
    };
    const push = () => subscribers.forEach(deliver);
    const later = (value) => latencyMs > 0
        ? new Promise((resolve) => setTimeout(() => resolve(value), latencyMs))
        : Promise.resolve(value);
    const rejectIfFailing = () => {
        if (!failure)
            return null;
        return Promise.reject(Object.assign(new Error(failure.message), { status: failure.status }));
    };
    const update = (id, patch) => {
        sessions = sessions.map((s) => (s.id === id ? { ...s, ...patch } : s));
        push();
    };
    const contextTokens = { ...initialTokens };
    const handoffs = new Map();
    const handoffTimers = new Map();
    const setHandoff = (paneId, patch) => {
        const job = { ...handoffs.get(paneId), ...patch, updatedAt: Date.now() };
        handoffs.set(paneId, job);
        return job;
    };
    // writing -> resetting -> continuing -> done, one step every `handoffStepMs`; the pane works
    // while it resets, and its context is small afterwards (the refetch drops the button)
    const advanceHandoff = (paneId, next) => {
        if (handoffs.get(paneId)?.phase === 'error')
            return;
        if (next === 'error') {
            setHandoff(paneId, { phase: 'error', error: handoffError });
            update(paneId, { displayState: 'idle' });
            return;
        }
        setHandoff(paneId, { phase: next });
        if (next === 'resetting')
            update(paneId, { displayState: 'working' });
        if (next === 'done') {
            contextTokens[paneId] = handoffResetTokens;
            update(paneId, { displayState: 'idle' });
            return;
        }
        const after = { writing: 'resetting', resetting: 'continuing', continuing: 'done' };
        const following = next === 'resetting' && handoffError ? 'error' : after[next];
        handoffTimers.set(paneId, setTimeout(() => advanceHandoff(paneId, following), handoffStepMs));
    };
    const record = (id, line) => {
        const list = transcripts.get(id) ?? [];
        const timestamp = new Date().toISOString();
        list.push({ role: 'user', text: line, timestamp }, { role: 'assistant', text: `mock answer to: ${line}`, timestamp });
        transcripts.set(id, list);
    };
    return {
        attachCount,
        update,
        setAgents(next) {
            sessions = [...next];
            push();
        },
        fail(error) {
            failure = error
                ? { message: error.message ?? `HTTP ${error.status}`, status: error.status }
                : null;
            push();
        },
        agents: {
            fetchAgents: async () => rejectIfFailing() ??
                later({
                    sessions,
                    daemon: null,
                    userSettings: null,
                    cli: { installed: true, path: null },
                }),
            subscribeToAgents(handlers) {
                subscribers.add(handlers);
                // with latency the first list arrives late, like a real server (shows the loading state)
                const timer = latencyMs ? setTimeout(() => deliver(handlers), latencyMs) : undefined;
                if (!latencyMs)
                    deliver(handlers);
                return () => {
                    clearTimeout(timer);
                    subscribers.delete(handlers);
                };
            },
            async dispatchAgent({ cwd, prompt, name, idle }) {
                const failed = rejectIfFailing();
                if (failed)
                    return failed;
                const id = `mock${++counter}`;
                const label = name || prompt?.slice(0, 40) || `agent ${counter}`;
                sessions = [
                    ...sessions,
                    mockSession(id, {
                        cwd,
                        name: label,
                        intent: prompt ?? null,
                        ...(idle || !prompt
                            ? { state: null, status: 'idle', displayState: 'idle' }
                            : { state: 'working', displayState: 'working' }),
                    }),
                ];
                push();
                return later({ id, name: label, alreadyRunning: false, output: '' });
            },
            async stopAgent(id) {
                if (!sessions.some((s) => s.id === id))
                    throw new Error(`unknown agent ${id}`);
                update(id, { state: 'stopped', displayState: 'stopped', status: null });
                sockets.get(id)?.forEach((socket) => socket.exit());
                sockets.delete(id);
                return later({ output: '' });
            },
        },
        settings: createLocalSettings(null),
        pty: {
            attach({ id }) {
                attachCount.set(id, (attachCount.get(id) ?? 0) + 1);
                const set = sockets.get(id) ?? new Set();
                sockets.set(id, set);
                const socket = new MockPtySocket(sessions.find((s) => s.id === id), (line) => record(id, line), () => set.delete(socket), latencyMs);
                set.add(socket);
                // The terminal only uses readyState, send, close and the on* handlers (see PtySocket)
                return socket;
            },
        },
        messaging: {
            async replyToAgent(id, text) {
                record(id, text);
                return later({ delivered: true, mode: 'auto' });
            },
            async sendToPane(paneId, text) {
                record(paneId, text);
                return later({ delivered: true });
            },
            async stopPane(paneId) {
                const stopped = sessions.some((s) => s.id === paneId);
                if (stopped)
                    update(paneId, { state: 'stopped', displayState: 'stopped', status: null });
                return later({ stopped: stopped ? 1 : 0 });
            },
            async startHandoffReset(paneId) {
                const failed = rejectIfFailing();
                if (failed)
                    return failed;
                const running = handoffs.get(paneId)?.phase;
                if (running === 'writing' || running === 'resetting' || running === 'continuing')
                    throw new Error('A Handoff + Reset is already running for this pane');
                const now = Date.now();
                handoffs.set(paneId, {
                    paneId,
                    harness: 'claude',
                    cwd: sessions.find((s) => s.id === paneId)?.cwd ?? '',
                    phase: 'writing',
                    startedAt: now,
                    updatedAt: now,
                });
                clearTimeout(handoffTimers.get(paneId));
                if (handoffStepMs > 0)
                    handoffTimers.set(paneId, setTimeout(() => advanceHandoff(paneId, 'resetting'), handoffStepMs));
                return later({ ...handoffs.get(paneId) });
            },
            async fetchHandoffReset(paneId) {
                const job = handoffs.get(paneId);
                return later(job ? { ...job } : null);
            },
            async cancelHandoffReset(paneId) {
                if (!handoffs.has(paneId))
                    throw new Error('No Handoff + Reset to cancel');
                clearTimeout(handoffTimers.get(paneId));
                return later({ ...setHandoff(paneId, { phase: 'error', error: 'Cancelled' }) });
            },
        },
        contexts: {
            async fetchAgentContexts() {
                return later(Object.fromEntries(sessions.map((s) => [
                    s.id,
                    {
                        repo: null,
                        model: null,
                        issues: null,
                        pulls: null,
                        servers: [],
                        subagents: { running: 0, total: 0, names: [] },
                        contextTokens: contextTokens[s.id] ?? null,
                    },
                ])));
            },
        },
        logs: {
            async fetchAgentLogs(id) {
                const entries = transcripts.get(id) ?? [];
                return later({ source: 'transcript', text: '', entries });
            },
        },
    };
}
