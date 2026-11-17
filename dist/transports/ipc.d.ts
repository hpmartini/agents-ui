import type { AgentsTransport } from '../transport';
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
export declare const IPC_CHANNELS: {
    /** invoke -> Agent[] (current list); main then sends `list` on every change */
    readonly list: "agents:list";
    /** event: Agent[] */
    readonly changed: "agents:changed";
    /** invoke StartAgentRequest -> {id} */
    readonly start: "agents:start";
    /** invoke {id} */
    readonly stop: "agents:stop";
    /** invoke {ptyId, id, cols, rows}; the renderer picks ptyId so no event can arrive unclaimed */
    readonly ptyOpen: "agents:pty:open";
    /** invoke {ptyId, data} */
    readonly ptyInput: "agents:pty:input";
    /** invoke {ptyId, cols, rows} */
    readonly ptyResize: "agents:pty:resize";
    /** invoke {ptyId}: detach, the agent keeps running */
    readonly ptyClose: "agents:pty:close";
    /** event {ptyId, type: 'output'|'exit'|'error', data?, exitCode?, message?} */
    readonly ptyEvent: "agents:pty:event";
};
export declare function createIpcTransport(bridge: IpcBridge): AgentsTransport;
