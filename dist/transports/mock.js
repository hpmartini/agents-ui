const ESC = '\x1b[';
const banner = (agent) => `${ESC}2m# mock attach ${agent.id} in ${agent.cwd}${ESC}0m\r\n` +
    `${ESC}38;5;208m✻${ESC}0m ${agent.name}\r\n` +
    `${ESC}2m${agent.detail ?? 'waiting for input'}${ESC}0m\r\n\r\n> `;
/**
 * In-memory backend for demos and tests: agents live in an array, a terminal echoes what is typed
 * and answers each line. No timers run unless `latencyMs` > 0.
 */
export function createMockTransport(initial = [], latencyMs = 0) {
    let agents = [...initial];
    const listeners = new Set();
    const ptys = new Map();
    const attachCount = new Map();
    let counter = agents.length;
    const errorListeners = new Set();
    let failure = null;
    const push = () => {
        if (failure)
            errorListeners.forEach((fn) => fn(failure));
        else
            listeners.forEach((fn) => fn(agents));
    };
    const later = (value) => latencyMs > 0
        ? new Promise((resolve) => setTimeout(() => resolve(value), latencyMs))
        : Promise.resolve(value);
    // transcript per agent: its task (detail) first, then every line typed and its answer
    const transcripts = new Map();
    const transcriptListeners = new Map();
    const transcriptOf = (id) => {
        if (!transcripts.has(id)) {
            const detail = agents.find((a) => a.id === id)?.detail;
            transcripts.set(id, detail ? [{ id: `${id}-0`, role: 'user', text: detail }] : []);
        }
        return transcripts.get(id);
    };
    const say = (id, role, text) => {
        const list = [...transcriptOf(id)];
        list.push({ id: `${id}-${list.length}`, role, text, at: Date.now() });
        transcripts.set(id, list);
        transcriptListeners.get(id)?.forEach((fn) => fn(list));
    };
    const update = (id, patch) => {
        agents = agents.map((a) => (a.id === id ? { ...a, ...patch } : a));
        push();
    };
    return {
        attachCount,
        update,
        setAgents(next) {
            agents = [...next];
            push();
        },
        fail(error) {
            failure = error
                ? Object.assign(new Error(error.message ?? `HTTP ${error.status}`), { status: error.status })
                : null;
            push();
        },
        subscribe(onAgents, onError) {
            listeners.add(onAgents);
            if (onError)
                errorListeners.add(onError);
            const first = () => (failure ? onError?.(failure) : onAgents(agents));
            // with latency the first list arrives late, like a real server (shows the loading state)
            if (!latencyMs)
                first();
            const t = latencyMs ? setTimeout(first, latencyMs) : undefined;
            return () => {
                clearTimeout(t);
                listeners.delete(onAgents);
                if (onError)
                    errorListeners.delete(onError);
            };
        },
        async start({ cwd, prompt, name }) {
            const id = `mock${++counter}`;
            agents = [
                ...agents,
                {
                    id,
                    name: name || prompt?.slice(0, 40) || `agent ${counter}`,
                    cwd,
                    displayState: prompt ? 'working' : 'idle',
                    detail: prompt ?? null,
                    startedAt: Date.now(),
                },
            ];
            push();
            return later({ id });
        },
        async stop(id) {
            if (!agents.some((a) => a.id === id))
                throw new Error(`unknown agent ${id}`);
            update(id, { displayState: 'stopped', detail: 'stopped' });
            ptys.get(id)?.forEach((h) => h.onExit(0));
            ptys.delete(id);
            await later(undefined);
        },
        transcript(id, onEntries, onError) {
            if (!agents.some((a) => a.id === id)) {
                onError?.(Object.assign(new Error(`unknown agent ${id}`), { status: 404 }));
                return () => { };
            }
            const set = transcriptListeners.get(id) ?? new Set();
            transcriptListeners.set(id, set);
            set.add(onEntries);
            const first = () => onEntries(transcriptOf(id));
            if (!latencyMs)
                first();
            const t = latencyMs ? setTimeout(first, latencyMs) : undefined;
            return () => {
                clearTimeout(t);
                set.delete(onEntries);
            };
        },
        attach(id, _size, handlers) {
            attachCount.set(id, (attachCount.get(id) ?? 0) + 1);
            const agent = agents.find((a) => a.id === id);
            const set = ptys.get(id) ?? new Set();
            ptys.set(id, set);
            set.add(handlers);
            let line = '';
            queueMicrotask(() => {
                handlers.onOpen?.();
                if (agent)
                    handlers.onData(banner(agent));
                else
                    handlers.onError?.(`unknown agent ${id}`);
            });
            return {
                write(data) {
                    for (const ch of data) {
                        if (ch === '\r') {
                            handlers.onData(`\r\n${ESC}36m●${ESC}0m mock answer to: ${line}\r\n\r\n> `);
                            say(id, 'user', line);
                            say(id, 'assistant', `mock answer to: ${line}`);
                            line = '';
                        }
                        else if (ch === '\x7f') {
                            if (line)
                                handlers.onData('\b \b');
                            line = line.slice(0, -1);
                        }
                        else if (ch >= ' ') {
                            line += ch;
                            handlers.onData(ch);
                        }
                    }
                },
                resize() { },
                close() {
                    set.delete(handlers);
                },
            };
        },
    };
}
