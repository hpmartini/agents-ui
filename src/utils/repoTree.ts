/**
 * Repository tree of the /pulls view: All repositories → folder → repo. A folder is the parent
 * directory of the repo's local checkout (`AgentContext.repo.root`). Its key (URL `folder`,
 * stored selection) is the folder's own name plus a hash of its absolute path: stable whichever
 * other repos have PRs, and no path reaches the URL. Its label is the path relative to the
 * common parent of all checkouts. A repo without a known checkout is listed under its owner
 * (`@owner`).
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
  count: number;
  repos: RepoTreeRepo[];
}

export interface RepoTreeData {
  folders: RepoTreeFolder[];
  total: number;
}

const parentOf = (p: string) => p.replace(/\/+$/, '').replace(/\/[^/]*$/, '') || '/';
const byText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

/** FNV-1a, base 36: short, synchronous, the same in every browser */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}

/** Stable key of a checkout folder (absolute path) */
const folderKey = (dir: string) => `${dir.split('/').pop() || 'root'}-${hash(dir)}`;

/**
 * Folder key per lower-case slug. `roots`: lower-case slug → main checkout path.
 */
export function folderKeys(slugs: string[], roots: Record<string, string>): Map<string, string> {
  const keys = new Map<string, string>();
  for (const slug of slugs) {
    const root = roots[slug.toLowerCase()];
    keys.set(slug.toLowerCase(), root ? folderKey(parentOf(root)) : `@${slug.split('/')[0]}`);
  }
  return keys;
}

/** Label per folder key: checkout folders relative to the common parent of all of them */
function folderLabels(slugs: string[], roots: Record<string, string>): Map<string, string> {
  const parents = [
    ...new Set(
      slugs
        .map((s) => roots[s.toLowerCase()])
        .filter(Boolean)
        .map(parentOf)
    ),
  ];
  // Common parent directory of all checkout parents, segment by segment
  let common = parents[0]?.split('/') ?? [];
  for (const p of parents.slice(1)) {
    const parts = p.split('/');
    let i = 0;
    while (i < common.length && common[i] === parts[i]) i++;
    common = common.slice(0, i);
  }
  let base = common.join('/');
  // A folder that is the common parent itself keeps its own name
  if (parents.includes(base)) base = parentOf(base);
  const labels = new Map<string, string>();
  for (const p of parents)
    labels.set(folderKey(p), p.slice(base === '/' ? 1 : base.length + 1) || p);
  return labels;
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
  const keys = folderKeys(slugs, roots);
  const labels = folderLabels(slugs, roots);
  const counts = new Map<string, number>();
  for (const r of counted) {
    const slug = r.pr.repoSlug.toLowerCase();
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  const folders = new Map<string, RepoTreeFolder>();
  for (const slug of slugs) {
    const key = keys.get(slug.toLowerCase())!;
    const folder = folders.get(key) ?? {
      key,
      label: labels.get(key) ?? key.slice(1),
      count: 0,
      repos: [],
    };
    const count = counts.get(slug.toLowerCase()) ?? 0;
    folder.repos.push({ slug, name: slug.split('/').pop() || slug, count });
    folder.count += count;
    folders.set(key, folder);
  }
  const list = [...folders.values()];
  for (const f of list) f.repos.sort((a, b) => byText(a.name, b.name) || byText(a.slug, b.slug));
  // Checkout folders first, owners (no local checkout) last
  list.sort(
    (a, b) =>
      Number(a.key.startsWith('@')) - Number(b.key.startsWith('@')) || byText(a.label, b.label)
  );
  return { folders: list, total: counted.length };
}
