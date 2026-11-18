/**
 * Groups dispatch-target directories for the directory picker (#158):
 * pinned entries (home, current) first, then one group per parent directory.
 */
import { panelsEn } from '../labels/panels';
const WORKTREE_MARKER = '/.claude/worktrees/';
/** Real paths win over app config paths, which may be typed in another case */
const SOURCE_PRIORITY = ['home', 'repo', 'worktree', 'session', 'configured', 'app'];
const stripSlash = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p);
// The server runs on macOS (case-insensitive FS): ~/projects and ~/PROJECTS are one folder
const pathKey = (p) => stripSlash(p).toLowerCase();
const rank = (source) => {
    const i = SOURCE_PRIORITY.indexOf(source);
    return i === -1 ? SOURCE_PRIORITY.length : i;
};
const basename = (p) => p.split('/').pop() || p;
const parentOf = (p) => p.slice(0, p.lastIndexOf('/')) || '/';
const byText = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' });
export const samePath = (a, b) => !!a && !!b && pathKey(a) === pathKey(b);
export function shortenHome(p, home) {
    if (!home)
        return p;
    if (pathKey(p) === pathKey(home))
        return '~';
    return pathKey(p).startsWith(pathKey(home) + '/') ? '~' + p.slice(stripSlash(home).length) : p;
}
/** One entry per directory, case-insensitively; sources of all spellings merged */
export function dedupeDirectories(choices) {
    const byKey = new Map();
    for (const choice of choices) {
        const key = pathKey(choice.path);
        const hit = byKey.get(key);
        if (!hit) {
            byKey.set(key, { best: choice, sources: [choice.source], names: [choice.name] });
            continue;
        }
        if (!hit.sources.includes(choice.source))
            hit.sources.push(choice.source);
        if (!hit.names.includes(choice.name))
            hit.names.push(choice.name);
        if (rank(choice.source) < rank(hit.best.source))
            hit.best = choice;
    }
    return [...byKey.values()].map(({ best, sources, names }) => {
        const path = stripSlash(best.path);
        return {
            name: best.name,
            path,
            sources: sources.sort((a, b) => rank(a) - rank(b)),
            detail: byText(basename(path), best.name) === 0 ? null : basename(path),
            aliases: names.filter((n) => n !== best.name),
        };
    });
}
// Worktrees sort right after their repo: same primary key, repo first
const byItem = (a, b) => byText(a.primary, b.primary) ||
    Number(a.worktree) - Number(b.worktree) ||
    byText(a.entry.name, b.entry.name);
export function groupDirectories(choices, opts = {}) {
    const home = opts.home ?? null;
    const query = (opts.query || '').trim().toLowerCase();
    const worktreeOf = opts.worktreeOf ?? panelsEn.dirWorktreeOf;
    const pinnedKeys = [opts.current, home].filter(Boolean).map((p) => pathKey(p));
    const entries = dedupeDirectories(choices);
    const nameByPath = new Map(entries.map((e) => [pathKey(e.path), e.name]));
    const pinned = [];
    const groups = new Map();
    for (const entry of entries) {
        const haystack = [entry.name, ...entry.aliases, entry.path].join(' ').toLowerCase();
        if (query && !haystack.includes(query))
            continue;
        if (pinnedKeys.includes(pathKey(entry.path))) {
            pinned.push(entry);
            continue;
        }
        const wt = entry.path.indexOf(WORKTREE_MARKER);
        // Worktrees sit next to their repo, in the repo's parent group
        const repoRoot = wt === -1 ? null : entry.path.slice(0, wt);
        const parent = parentOf(repoRoot ?? entry.path);
        const item = repoRoot
            ? {
                primary: nameByPath.get(pathKey(repoRoot)) ?? basename(repoRoot),
                worktree: true,
                entry: { ...entry, detail: worktreeOf(basename(repoRoot)) },
            }
            : { primary: entry.name, worktree: false, entry };
        const key = pathKey(parent);
        const group = groups.get(key) ?? { label: '', labelRank: Infinity, items: [] };
        groups.set(key, group);
        // Parent spelling follows the best-ranked member, like the entry paths
        if (rank(entry.sources[0]) < group.labelRank) {
            group.label = shortenHome(parent, home);
            group.labelRank = rank(entry.sources[0]);
        }
        group.items.push(item);
    }
    // Current before home
    pinned.sort((a, b) => pinnedKeys.indexOf(pathKey(a.path)) - pinnedKeys.indexOf(pathKey(b.path)));
    const result = pinned.length
        ? [{ key: 'pinned', label: null, entries: pinned }]
        : [];
    for (const [key, group] of [...groups.entries()].sort((a, b) => byText(a[1].label, b[1].label))) {
        result.push({ key, label: group.label, entries: group.items.sort(byItem).map((i) => i.entry) });
    }
    return result;
}
