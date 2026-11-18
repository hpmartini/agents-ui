/** On/off view switch kept in localStorage; a blocked or broken storage keeps it in memory only */
export declare function useStoredToggle(key: string, fallback?: boolean): [boolean, () => void];
