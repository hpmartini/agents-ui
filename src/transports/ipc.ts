import type { Agent, AgentsTransport, PtyChannel } from '../transport';

/**
 * What an Electron preload exposes through `contextBridge` (two functions, nothing Electron-typed):
 *   invoke: (channel, payload) => ipcRenderer.invoke(channel, payload)
 *   on: (channel, fn) => { const l = (_e, p) => fn(p); ipcRenderer.on(channel, l);
 *                          return () => ipcRenderer.removeListener(channel, l) }
 */
export interface IpcBridge {
  invoke: (channel: string, payload?: unknown) => Promise<unknown>;
  on: (channel: string, listener: (payload: unknown) => void) => () => void;
}

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
} as const;

interface PtyEvent {
  ptyId: string;
  type: 'output' | 'exit' | 'error';
  data?: string;
  exitCode?: number | null;
  message?: string;
}

let ptyCounter = 0;

export function createIpcTransport(bridge: IpcBridge): AgentsTransport {
  const fail = (handlers: { onError?: (m: string) => void }) => (err: unknown) =>
    handlers.onError?.(err instanceof Error ? err.message : String(err));

  return {
    subscribe(onAgents, onError) {
      let closed = false;
      let pushed = false;
      const off = bridge.on(IPC_CHANNELS.changed, (agents) => {
        pushed = true;
        onAgents(agents as Agent[]);
      });
      // a push that arrived meanwhile is newer than this snapshot
      bridge.invoke(IPC_CHANNELS.list).then(
        (agents) => {
          if (!closed && !pushed) onAgents(agents as Agent[]);
        },
        (err: unknown) => {
          if (closed || pushed) return;
          const status = (err as { status?: unknown })?.status;
          onError?.(
            Object.assign(new Error(err instanceof Error ? err.message : String(err)), {
              ...(typeof status === 'number' ? { status } : {}),
            })
          );
        }
      );
      return () => {
        closed = true;
        off();
      };
    },

    async start(request) {
      return (await bridge.invoke(IPC_CHANNELS.start, request)) as { id: string };
    },

    async stop(id) {
      await bridge.invoke(IPC_CHANNELS.stop, { id });
    },

    attach(id, { cols, rows }, handlers): PtyChannel {
      const ptyId = `pty-${Date.now()}-${++ptyCounter}`;
      let ended = false;
      const off = bridge.on(IPC_CHANNELS.ptyEvent, (payload) => {
        const event = payload as PtyEvent;
        if (event.ptyId !== ptyId || ended) return;
        if (event.type === 'output') handlers.onData(event.data ?? '');
        else if (event.type === 'error') handlers.onError?.(event.message ?? 'PTY error');
        else {
          ended = true;
          off();
          handlers.onExit(event.exitCode ?? null);
        }
      });
      bridge
        .invoke(IPC_CHANNELS.ptyOpen, { ptyId, id, cols, rows })
        .then(() => handlers.onOpen?.(), fail(handlers));
      const call = (channel: string, payload: object) => {
        if (!ended) bridge.invoke(channel, { ptyId, ...payload }).catch(fail(handlers));
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
