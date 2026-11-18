/** Keyboard platform: macOS takes Cmd where others take Ctrl */
export const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

/** Rail search (agents, PRs, issues); handled by the agent filter bar */
export const SEARCH_SHORTCUT = isMac ? '⌘K' : 'Ctrl+K';
