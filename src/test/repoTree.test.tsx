import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AgentPullRequest } from '../types';
import type { PullRequestRow } from '../utils/agentSessions';
import {
  buildRepoTree,
  findFolder,
  folderKeys,
  type RepoSelection,
  type RepoTreeFolder,
} from '../utils/repoTree';
import {
  filterPulls,
  DEFAULT_QUERY,
  parsePullQuery,
  patchPullParams,
  hasFilters,
  FILTER_RESET,
} from '../utils/pullRequestQuery';
import { RepoTree, REPO_TREE_COLLAPSED_KEY } from '../components/AgentsView/RepoTree';

const pr = (
  n: number,
  repoSlug: string,
  over: Partial<AgentPullRequest> = {}
): AgentPullRequest => ({
  number: n,
  title: `PR ${n}`,
  url: `https://github.com/${repoSlug}/pull/${n}`,
  author: 'dev',
  isDraft: false,
  headRef: `feat/${n}`,
  baseRef: 'main',
  updatedAt: '2026-11-01T10:00:00Z',
  reviewDecision: null,
  mergeable: 'MERGEABLE',
  ci: 'success',
  ciPassed: 1,
  ciFailed: 0,
  ciPending: 0,
  mergeReady: true,
  repoSlug,
  ...over,
});
const row = (p: AgentPullRequest): PullRequestRow => ({ pr: p, agents: [] });

// Fake names and paths only: public repo
const rows = [
  row(pr(1, 'acme/web')),
  row(pr(2, 'acme/web', { ci: 'failure' })),
  row(pr(3, 'acme/api')),
  row(pr(4, 'globex/tools', { ci: 'failure' })),
  row(pr(5, 'initech/lonely')),
  row(pr(6, 'acme/dots')),
  row(pr(7, 'umbrella/x')),
];
const roots = {
  'acme/web': '/Users/dev/REPOS/apps/web',
  'acme/api': '/Users/dev/REPOS/services/api',
  'globex/tools': '/Users/dev/REPOS/apps/tools',
  'acme/dots': '/Users/dev/dots',
  'umbrella/x': '/Users/dev/PROJECTS/clients/x',
};
const slugs = rows.map((r) => r.pr.repoSlug);
/** Key of the checkout folder itself (the deepest of a repo's folder keys) */
const keyOf = (slug: string, r: Record<string, string> = roots) =>
  folderKeys([slug], r).get(slug)![0];
type Shape = { label: string; count: number; folders?: Shape[]; repos?: string[] };
const shape = (f: RepoTreeFolder): Shape => ({
  label: f.label,
  count: f.count,
  ...(f.folders.length ? { folders: f.folders.map(shape) } : {}),
  ...(f.repos.length ? { repos: f.repos.map((r) => `${r.name}:${r.count}`) } : {}),
});

describe('folderKeys', () => {
  const keys = folderKeys(slugs, roots);

  it('every folder above a checkout, deepest first; no checkout: the owner', () => {
    expect(keys.get('acme/web')![0]).toBe(keys.get('globex/tools')![0]);
    expect(keys.get('acme/web')![0]).not.toBe(keys.get('acme/api')![0]);
    // REPOS holds both
    expect(keys.get('acme/web')![1]).toBe(keys.get('acme/api')![1]);
    expect(keys.get('initech/lonely')).toEqual(['@initech']);
  });

  it('keys stay the same when another repo with a checkout elsewhere comes and goes', () => {
    const more = folderKeys([...slugs, 'hooli/y'], { ...roots, 'hooli/y': '/opt/src/y' });
    for (const slug of slugs) expect(more.get(slug)).toEqual(keys.get(slug));
    expect(folderKeys(['acme/web'], roots).get('acme/web')).toEqual(keys.get('acme/web'));
  });

  it('keys carry no path and no user name; two folders with the same name differ', () => {
    const twins = folderKeys(['a/x', 'b/y'], {
      'a/x': '/home/dev/one/apps/x',
      'b/y': '/home/dev/two/apps/y',
    });
    expect(twins.get('a/x')![0]).not.toBe(twins.get('b/y')![0]);
    for (const list of [...keys.values(), ...twins.values()])
      for (const k of list) {
        expect(k).not.toContain('/');
        expect(k).not.toContain('dev');
      }
    expect(keys.get('acme/web')![0]).toMatch(/^apps-[0-9a-z]+$/);
  });

  it('no local checkouts: owner → repo', () => {
    const owners = folderKeys(['acme/web', 'globex/tools'], {});
    expect([...owners.values()]).toEqual([['@acme'], ['@globex']]);
  });
});

describe('buildRepoTree', () => {
  it('nests folders by path below the home dir; checkouts in home sit at the root', () => {
    const tree = buildRepoTree(rows, rows, roots);
    expect(tree.total).toBe(7);
    expect(tree.folders.map(shape)).toEqual([
      // single-child chain compacted like VS Code compact folders
      { label: 'PROJECTS/clients', count: 1, repos: ['x:1'] },
      {
        label: 'REPOS',
        count: 4,
        folders: [
          { label: 'apps', count: 3, repos: ['tools:1', 'web:2'] },
          { label: 'services', count: 1, repos: ['api:1'] },
        ],
      },
      { label: 'initech', count: 1, repos: ['lonely:1'] },
    ]);
    expect(tree.repos.map((r) => r.slug)).toEqual(['acme/dots']);
  });

  it('never shows the user name; folder titles are home-relative paths', () => {
    const tree = buildRepoTree(rows, rows, roots);
    const all = (fs: RepoTreeFolder[]): RepoTreeFolder[] =>
      fs.flatMap((f) => [f, ...all(f.folders)]);
    const labels = all(tree.folders).flatMap((f) => [f.label, f.title ?? '']);
    expect(labels.join(' ')).not.toContain('dev');
    expect(all(tree.folders).find((f) => f.label === 'apps')?.title).toBe('~/REPOS/apps');
    expect(tree.folders[0].title).toBe('~/PROJECTS/clients');
  });

  it('a compacted folder is keyed by its deepest folder; keys match folderKeys', () => {
    const tree = buildRepoTree(rows, rows, roots);
    expect(tree.folders[0].key).toBe(keyOf('umbrella/x'));
    expect(findFolder(tree, keyOf('acme/web'))?.label).toBe('apps');
    expect(findFolder(tree, folderKeys(['acme/web'], roots).get('acme/web')![1])?.label).toBe(
      'REPOS'
    );
    expect(findFolder(tree, '@initech')?.label).toBe('initech');
    expect(findFolder(tree, 'nope')).toBeUndefined();
  });

  it('starts at the common root when every checkout is deeper than home', () => {
    const under = { 'acme/web': roots['acme/web'], 'acme/api': roots['acme/api'] };
    const two = rows.filter((r) => r.pr.repoSlug in under);
    const tree = buildRepoTree(two, two, under);
    expect(tree.folders.map((f) => f.label)).toEqual(['apps', 'services']);
    // one folder only: its repos sit at the root
    const one = buildRepoTree([rows[0]], [rows[0]], roots);
    expect(one.folders).toEqual([]);
    expect(one.repos.map((r) => r.slug)).toEqual(['acme/web']);
  });

  it('/home/<name> is stripped like /Users/<name>; paths outside home keep their absolute path', () => {
    const r = { 'a/x': '/home/dev/code/x', 'b/y': '/srv/git/y' };
    const tree = buildRepoTree([row(pr(1, 'a/x')), row(pr(2, 'b/y'))], [], r);
    expect(tree.folders.map((f) => [f.label, f.count])).toEqual([
      ['/srv/git', 0],
      ['~/code', 0],
    ]);
  });

  it('counts follow the counted rows through the whole subtree', () => {
    const counted = rows.filter((r) => r.pr.ci === 'failure');
    const tree = buildRepoTree(rows, counted, roots);
    expect(tree.total).toBe(2);
    expect(tree.folders.map(shape)).toEqual([
      { label: 'PROJECTS/clients', count: 0, repos: ['x:0'] },
      {
        label: 'REPOS',
        count: 2,
        folders: [
          { label: 'apps', count: 2, repos: ['tools:1', 'web:1'] },
          { label: 'services', count: 0, repos: ['api:0'] },
        ],
      },
      { label: 'initech', count: 0, repos: ['lonely:0'] },
    ]);
  });
});

describe('folder filter in the PR query', () => {
  it('parses, writes, counts as filter, resets, and filters a folder with its whole subtree', () => {
    const q = parsePullQuery(new URLSearchParams('folder=apps'));
    expect(q.folder).toBe('apps');
    expect(hasFilters(q)).toBe(true);
    expect(FILTER_RESET.folder).toBeNull();
    expect(
      patchPullParams(new URLSearchParams('repo=a/b'), { folder: 'apps', repo: null }).toString()
    ).toBe('folder=apps');
    const keys = folderKeys(slugs, roots);
    const nums = (folder: string) =>
      filterPulls(rows, { ...DEFAULT_QUERY, folder }, keys).map((r) => r.pr.number);
    expect(nums(keyOf('acme/web'))).toEqual([1, 2, 4]);
    expect(nums(keys.get('acme/web')![1])).toEqual([1, 2, 3, 4]);
    expect(nums('@initech')).toEqual([5]);
  });
});

/** Tree with its selection kept like the page keeps it */
function Host({ initial = { kind: 'all' } as RepoSelection, spy = vi.fn() }) {
  const [selection, setSelection] = useState<RepoSelection>(initial);
  const tree = buildRepoTree(rows, rows, roots);
  return (
    <>
      <button>before</button>
      <RepoTree
        tree={tree}
        selection={selection}
        onSelect={(s) => {
          setSelection(s);
          spy(s);
        }}
        loading={false}
      />
    </>
  );
}

const item = (name: RegExp | string) => screen.getByRole('treeitem', { name });

describe('RepoTree', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('renders a WAI-ARIA tree: nested folders, repos at any level, counts per subtree', () => {
    render(<Host />);
    expect(screen.getByRole('tree', { name: 'Repositories' })).toBeInTheDocument();
    expect(item(/^All repositories/)).toHaveAttribute('aria-selected', 'true');
    expect(item(/^All repositories/)).toHaveAttribute('aria-expanded', 'true');
    expect(item(/^REPOS/)).toHaveAttribute('aria-level', '2');
    expect(item(/^apps/)).toHaveAttribute('aria-level', '3');
    expect(item(/^web/)).toHaveAttribute('aria-level', '4');
    expect(item(/^dots/)).toHaveAttribute('aria-level', '2');
    expect(item(/^All repositories/)).toHaveTextContent('7');
    expect(item(/^REPOS/)).toHaveTextContent('4');
    expect(item(/^apps/)).toHaveTextContent('3');
    expect(item(/^web/)).toHaveTextContent('2');
    expect(item(/^apps/)).toHaveAttribute('title', '~/REPOS/apps');
  });

  it('click selects a folder or a repo', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Host spy={spy} />);
    await user.click(screen.getByText('services'));
    expect(spy).toHaveBeenLastCalledWith({ kind: 'folder', key: keyOf('acme/api') });
    await user.click(screen.getByText('api'));
    expect(spy).toHaveBeenLastCalledWith({ kind: 'repo', slug: 'acme/api' });
    expect(item(/^api/)).toHaveAttribute('aria-selected', 'true');
  });

  it('keyboard: one tab stop, Up/Down, Right/Left expand-collapse and move across levels, Home/End, Enter selects', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Host spy={spy} />);
    await user.click(screen.getByText('before'));
    await user.tab();
    expect(document.activeElement).toBe(item(/^All repositories/));
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(document.activeElement).toBe(item(/^REPOS/));
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(item(/^apps/));
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(item(/^tools/));
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(item(/^apps/));
    await user.keyboard('{ArrowLeft}');
    expect(item(/^apps/)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('treeitem', { name: /^web/ })).toBeNull();
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(item(/^REPOS/));
    await user.keyboard('{ArrowLeft}');
    expect(item(/^REPOS/)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('treeitem', { name: /^services/ })).toBeNull();
    await user.keyboard('{ArrowRight}');
    expect(item(/^REPOS/)).toHaveAttribute('aria-expanded', 'true');
    // apps stays collapsed under its reopened parent
    expect(item(/^apps/)).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{Enter}');
    expect(spy).toHaveBeenLastCalledWith({
      kind: 'folder',
      key: folderKeys(slugs, roots).get('acme/web')![1],
    });
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}');
    expect(document.activeElement).toBe(item(/^api/));
    await user.keyboard('{Enter}');
    expect(spy).toHaveBeenLastCalledWith({ kind: 'repo', slug: 'acme/api' });
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(item(/^dots/));
    await user.keyboard('{Home} ');
    expect(spy).toHaveBeenLastCalledWith({ kind: 'all' });
    await user.keyboard('s');
    expect(document.activeElement).toBe(item(/^services/));
  });

  it('remembers collapsed folders at any level across mounts', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Host />);
    await user.click(screen.getByTitle('Collapse apps'));
    expect(JSON.parse(localStorage.getItem(REPO_TREE_COLLAPSED_KEY)!)).toEqual([keyOf('acme/web')]);
    unmount();
    render(<Host />);
    expect(item(/^apps/)).toHaveAttribute('aria-expanded', 'false');
    expect(item(/^REPOS/)).toHaveAttribute('aria-expanded', 'true');
    expect(item(/^services/)).toHaveAttribute('aria-expanded', 'true');
  });

  it('loading and empty states', () => {
    const empty = buildRepoTree([], [], {});
    const { rerender } = render(
      <RepoTree tree={empty} selection={{ kind: 'all' }} onSelect={() => {}} loading />
    );
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: 'All repositories' })).not.toHaveTextContent('0');
    rerender(
      <RepoTree tree={empty} selection={{ kind: 'all' }} onSelect={() => {}} loading={false} />
    );
    expect(screen.getByText('No repositories with open pull requests')).toBeInTheDocument();
  });
});
