/**
 * Repository tree of the /pulls view: All repositories → folder → repo. A folder is the parent
 * directory of the repo's local checkout (`AgentContext.repo.root`), named relative to the
 * common parent of all checkouts, so no absolute path reaches the URL or the screen. A repo
 * without a known checkout is listed under its owner (`@owner`).
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
  /** Value of the `folder` param: relative folder path, or `@owner` */
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

/**
 * Folder key per lower-case slug. `roots`: lower-case slug → main checkout path.
 */
export function folderKeys(slugs: string[], roots: Record<string, string>): Map<string, string> {
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
  const keys = new Map<string, string>();
  for (const slug of slugs) {
    const root = roots[slug.toLowerCase()];
    const key = root
      ? parentOf(root).slice(base === '/' ? 1 : base.length + 1) || parentOf(root)
      : `@${slug.split('/')[0]}`;
    keys.set(slug.toLowerCase(), key);
  }
  return keys;
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
      label: key.startsWith('@') ? key.slice(1) : key,
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
    (a, b) => Number(a.key.startsWith('@')) - Number(b.key.startsWith('@')) || byText(a.key, b.key)
  );
  return { folders: list, total: counted.length };
}
