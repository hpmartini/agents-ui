/**
 * Repository tree of the /pulls view: All repositories → folders by path → repo, following the
 * local checkouts (`AgentContext.repo.root`). Paths are shown relative to the home dir
 * (`/Users/<name>`, `/home/<name>` become `~`, the user name never shows) and start at the
 * common root of all checkouts; a checkout directly in that root sits at the tree's root.
 * A folder with one subfolder and no repos merges with it (`REPOS/apps`, like VS Code's
 * compact folders). A folder's key (URL `folder`, stored selection) is its own name plus a hash
 * of its absolute path: stable whichever other repos have PRs, and no path reaches the URL.
 * A compacted folder takes the key of its deepest folder. A repo without a known checkout is
 * listed under its owner (`@owner`).
 */
import type { PullRequestRow } from './agentSessions';

/** What the tree has selected; maps to the `folder` / `repo` params of the PR query */
export type RepoSelection =
  { kind: 'all' } | { kind: 'folder'; key: string } | { kind: 'repo'; slug: string };

export interface RepoTreeRepo {
  slug: string;
  /** Repo part of the slug */
  name: string;
  count: number;
}

export interface RepoTreeFolder {
  /** Value of the `folder` param: `<name>-<hash of the absolute path>`, or `@owner` */
  key: string;
  label: string;
  /** Home-relative path (`~/REPOS/apps`); none for owners */
  title?: string;
  /** Open PRs in the whole subtree */
  count: number;
  folders: RepoTreeFolder[];
  repos: RepoTreeRepo[];
}

export interface RepoTreeData {
  /** Path folders, then owners */
  folders: RepoTreeFolder[];
  /** Checkouts directly in the common root */
  repos: RepoTreeRepo[];
  total: number;
}

const byText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });
const join = (a: string, b: string) => (a.endsWith('/') ? a : `${a}/`) + b;

/** FNV-1a, base 36: short, synchronous, the same in every browser */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}

interface Dir {
  /** Shown segment: `~` for the home dir, `/` for the file system root */
  name: string;
  abs: string;
  /** Home-relative path */
  path: string;
}

/** Every folder from the top down to the parent of `checkout`, the home dir folded into `~` */
function dirsAbove(checkout: string): Dir[] {
  const home = checkout.match(/^\/(?:Users|home)\/[^/]+(?=\/)/)?.[0];
  const top = home ?? '/';
  const dirs: Dir[] = [{ name: home ? '~' : '/', abs: top, path: home ? '~' : '/' }];
  const parts = checkout.slice(top.length).split('/').filter(Boolean).slice(0, -1);
  for (const name of parts) {
    const up = dirs[dirs.length - 1];
    dirs.push({ name, abs: join(up.abs, name), path: join(up.path, name) });
  }
  return dirs;
}

/** Stable key of a folder; `~` and `root` instead of the user's or the root's name */
const keyOf = (d: Dir) => `${d.name === '/' ? 'root' : d.name}-${hash(d.abs)}`;

/**
 * Keys of every folder that holds a repo's checkout, deepest first, per lower-case slug;
 * `[@owner]` without a checkout. `roots`: lower-case slug → main checkout path.
 */
export function folderKeys(slugs: string[], roots: Record<string, string>): Map<string, string[]> {
  const keys = new Map<string, string[]>();
  for (const slug of slugs) {
    const root = roots[slug.toLowerCase()];
    keys.set(
      slug.toLowerCase(),
      root ? dirsAbove(root).map(keyOf).reverse() : [`@${slug.split('/')[0]}`]
    );
  }
  return keys;
}

/** Folder `key` anywhere in the tree */
export function findFolder(tree: RepoTreeData, key: string): RepoTreeFolder | undefined {
  const find = (fs: RepoTreeFolder[]): RepoTreeFolder | undefined => {
    for (const f of fs) {
      const hit = f.key === key ? f : find(f.folders);
      if (hit) return hit;
    }
  };
  return find(tree.folders);
}

const sortRepos = (repos: RepoTreeRepo[]) =>
  repos.sort((a, b) => byText(a.name, b.name) || byText(a.slug, b.slug));
const sortFolders = (folders: RepoTreeFolder[]) => folders.sort((a, b) => byText(a.label, b.label));

/** Merges single-subfolder chains, sorts, and sums the counts of the subtree */
function finish(f: RepoTreeFolder): RepoTreeFolder {
  while (f.folders.length === 1 && f.repos.length === 0) {
    const [only] = f.folders;
    f = { ...only, label: join(f.label, only.label) };
  }
  const folders = sortFolders(f.folders.map(finish));
  const repos = sortRepos(f.repos);
  const count = [...folders, ...repos].reduce((n, c) => n + c.count, 0);
  return { ...f, folders, repos, count };
}

/**
 * Every repo of `rows` in its folder; the counts come from `counted` (the rows that pass the
 * other filters), so a repo without matching PRs shows 0 instead of vanishing.
 */
export function buildRepoTree(
  rows: PullRequestRow[],
  counted: PullRequestRow[],
  roots: Record<string, string>
): RepoTreeData {
  const slugs = [
    ...new Map(rows.map((r) => [r.pr.repoSlug.toLowerCase(), r.pr.repoSlug])).values(),
  ];
  const counts = new Map<string, number>();
  for (const r of counted) {
    const slug = r.pr.repoSlug.toLowerCase();
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  const repo = (slug: string): RepoTreeRepo => ({
    slug,
    name: slug.split('/').pop() || slug,
    count: counts.get(slug.toLowerCase()) ?? 0,
  });

  const placed = slugs
    .filter((s) => roots[s.toLowerCase()])
    .map((s) => ({ slug: s, dirs: dirsAbove(roots[s.toLowerCase()]) }));
  // Common root: the folder chain every checkout shares
  let common = placed[0]?.dirs.length ?? 0;
  for (const { dirs } of placed) {
    let i = 0;
    while (i < common && dirs[i]?.abs === placed[0].dirs[i].abs) i++;
    common = i;
  }
  const top: RepoTreeFolder = { key: '', label: '', count: 0, folders: [], repos: [] };
  for (const { slug, dirs } of placed) {
    let at = top;
    for (const d of dirs.slice(common)) {
      const key = keyOf(d);
      let next = at.folders.find((f) => f.key === key);
      if (!next) {
        next = { key, label: d.name, title: d.path, count: 0, folders: [], repos: [] };
        at.folders.push(next);
      }
      at = next;
    }
    at.repos.push(repo(slug));
  }

  const owners = new Map<string, RepoTreeFolder>();
  for (const slug of slugs.filter((s) => !roots[s.toLowerCase()])) {
    const owner = slug.split('/')[0];
    const f = owners.get(owner) ?? {
      key: `@${owner}`,
      label: owner,
      count: 0,
      folders: [],
      repos: [],
    };
    f.repos.push(repo(slug));
    owners.set(owner, f);
  }

  return {
    // Checkout folders first, owners (no local checkout) last
    folders: [
      ...sortFolders(top.folders.map(finish)),
      ...sortFolders([...owners.values()].map(finish)),
    ],
    repos: sortRepos(top.repos),
    total: counted.length,
  };
}
