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
    const push = () => listeners.forEach((fn) => fn(agents));
    const later = (value) => latencyMs > 0
        ? new Promise((resolve) => setTimeout(() => resolve(value), latencyMs))
        : Promise.resolve(value);
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
        subscribe(onAgents) {
            listeners.add(onAgents);
            onAgents(agents);
            return () => listeners.delete(onAgents);
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
