/**
 * Groups dispatch-target directories for the directory picker (#158):
 * pinned entries (home, current) first, then one group per parent directory.
 */
export interface DirectoryChoice {
    name: string;
    path: string;
    source: string;
}
export interface DirectoryEntry {
    name: string;
    path: string;
    /** Merged sources of all spellings of this path, e.g. ['repo', 'session'] */
    sources: string[];
    /** Directory basename or worktree origin, only when it differs from `name` */
    detail: string | null;
    /** Names of the merged spellings, still searchable */
    aliases: string[];
}
export interface DirectoryGroup {
    /** Parent path (or 'pinned'), stable React key */
    key: string;
    /** Parent path with home shortened to `~`; null for the pinned group */
    label: string | null;
    entries: DirectoryEntry[];
}
export declare const samePath: (a: string | null, b: string | null) => boolean;
export declare function shortenHome(p: string, home: string | null): string;
/** One entry per directory, case-insensitively; sources of all spellings merged */
export declare function dedupeDirectories(choices: DirectoryChoice[]): DirectoryEntry[];
export declare function groupDirectories(choices: DirectoryChoice[], opts?: {
    home?: string | null;
    current?: string | null;
    query?: string;
}): DirectoryGroup[];
