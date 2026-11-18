import type { AgentsTransport } from './transport';
/**
 * `settings` group for a host without a server store: the view settings live in localStorage
 * under `storageKey`, on top of Orkumo's defaults. `null` keeps them in memory only.
 */
export declare function createLocalSettings(storageKey: string | null): AgentsTransport['settings'];
