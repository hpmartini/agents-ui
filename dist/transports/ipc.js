/** Channel names; the main process implements the `invoke` ones and sends the two events */
export const IPC_CHANNELS = {
    /** invoke -> Agent[] (current list); main then sends `list` on every change */
    list: 'agents:list',
    /** event: Agent[] */
    changed: 'agents:changed',
    /** invoke StartAgentRequest -> {id} */
    start: 'agents:start',
    /** invoke {id} */
    stop: 'agents:stop',
    /** invoke {ptyId, id, cols, rows}; the renderer picks ptyId so no event can arrive unclaimed */
    ptyOpen: 'agents:pty:open',
    /** invoke {ptyId, data} */
    ptyInput: 'agents:pty:input',
    /** invoke {ptyId, cols, rows} */
    ptyResize: 'agents:pty:resize',
    /** invoke {ptyId}: detach, the agent keeps running */
    ptyClose: 'agents:pty:close',
    /** event {ptyId, type: 'output'|'exit'|'error', data?, exitCode?, message?} */
    ptyEvent: 'agents:pty:event',
};
let ptyCounter = 0;
export function createIpcTransport(bridge) {
    const fail = (handlers) => (err) => handlers.onError?.(err instanceof Error ? err.message : String(err));
    return {
        subscribe(onAgents, onError) {
            let closed = false;
            let pushed = false;
            const off = bridge.on(IPC_CHANNELS.changed, (agents) => {
                pushed = true;
                onAgents(agents);
            });
            // a push that arrived meanwhile is newer than this snapshot
            bridge.invoke(IPC_CHANNELS.list).then((agents) => {
                if (!closed && !pushed)
                    onAgents(agents);
            }, (err) => {
                if (closed || pushed)
                    return;
                const status = err?.status;
                onError?.(Object.assign(new Error(err instanceof Error ? err.message : String(err)), {
                    ...(typeof status === 'number' ? { status } : {}),
                }));
            });
            return () => {
                closed = true;
                off();
            };
        },
        async start(request) {
            return (await bridge.invoke(IPC_CHANNELS.start, request));
        },
        async stop(id) {
            await bridge.invoke(IPC_CHANNELS.stop, { id });
        },
        attach(id, { cols, rows }, handlers) {
            const ptyId = `pty-${Date.now()}-${++ptyCounter}`;
            let ended = false;
            const off = bridge.on(IPC_CHANNELS.ptyEvent, (payload) => {
                const event = payload;
                if (event.ptyId !== ptyId || ended)
                    return;
                if (event.type === 'output')
                    handlers.onData(event.data ?? '');
                else if (event.type === 'error')
                    handlers.onError?.(event.message ?? 'PTY error');
                else {
                    ended = true;
                    off();
                    handlers.onExit(event.exitCode ?? null);
                }
            });
            bridge
                .invoke(IPC_CHANNELS.ptyOpen, { ptyId, id, cols, rows })
                .then(() => handlers.onOpen?.(), fail(handlers));
            const call = (channel, payload) => {
                if (!ended)
                    bridge.invoke(channel, { ptyId, ...payload }).catch(fail(handlers));
            };
            return {
                write: (data) => call(IPC_CHANNELS.ptyInput, { data }),
                resize: (c, r) => call(IPC_CHANNELS.ptyResize, { cols: c, rows: r }),
                close: () => {
                    call(IPC_CHANNELS.ptyClose, {});
                    ended = true;
                    off();
                },
            };
        },
    };
}
