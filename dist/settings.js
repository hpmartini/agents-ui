import { DEFAULT_AGENT_VIEW_SETTINGS } from './types';
/**
 * `settings` group for a host without a server store: the view settings live in localStorage
 * under `storageKey`, on top of Orkumo's defaults. `null` keeps them in memory only.
 */
export function createLocalSettings(storageKey) {
    let current = { ...DEFAULT_AGENT_VIEW_SETTINGS };
    if (storageKey) {
        try {
            const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
            if (stored && typeof stored === 'object')
                current = { ...current, ...stored };
        }
        catch {
            // unavailable or corrupt storage: defaults
        }
    }
    return {
        fetchAgentViewSettings: async () => current,
        updateAgentViewSettings: async (partial) => {
            current = { ...current, ...partial };
            if (storageKey) {
                try {
                    localStorage.setItem(storageKey, JSON.stringify(current));
                }
                catch {
                    // full or unavailable: the change still holds for this page
                }
            }
            return current;
        },
    };
}
