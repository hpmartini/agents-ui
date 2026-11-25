import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AgentPullRequest } from '../types';
import type { PullRequestRow } from '../utils/agentSessions';
import { buildRepoTree, folderKeys, type RepoSelection } from '../utils/repoTree';
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

// Fake names only: public repo
const rows = [
  row(pr(1, 'acme/web')),
  row(pr(2, 'acme/web', { ci: 'failure' })),
  row(pr(3, 'acme/api')),
  row(pr(4, 'globex/tools', { ci: 'failure' })),
  row(pr(5, 'initech/lonely')),
];
const roots = {
  'acme/web': '/home/dev/code/apps/web',
  'acme/api': '/home/dev/code/services/api',
  'globex/tools': '/home/dev/code/apps/tools',
};

describe('folderKeys', () => {
  const slugs = rows.map((r) => r.pr.repoSlug);
  const keys = folderKeys(slugs, roots);

  it('one key per checkout folder; slugs without a checkout fall back to their owner', () => {
    expect(keys.get('acme/web')).toBe(keys.get('globex/tools'));
    expect(keys.get('acme/api')).not.toBe(keys.get('acme/web'));
    expect(keys.get('initech/lonely')).toBe('@initech');
  });

  it('keys stay the same when another repo with a checkout elsewhere comes and goes', () => {
    // A checkout outside /home/dev/code moves the common parent up: labels change, keys must not
    const more = folderKeys([...slugs, 'umbrella/x'], {
      ...roots,
      'umbrella/x': '/home/dev/other/x',
    });
    for (const slug of slugs)
      expect(more.get(slug.toLowerCase())).toBe(keys.get(slug.toLowerCase()));
    const fewer = folderKeys(['acme/web'], roots);
    expect(fewer.get('acme/web')).toBe(keys.get('acme/web'));
  });

  it('keys carry no path; two folders with the same name differ', () => {
    const twins = folderKeys(['a/x', 'b/y'], {
      'a/x': '/home/dev/one/apps/x',
      'b/y': '/home/dev/two/apps/y',
    });
    expect(twins.get('a/x')).not.toBe(twins.get('b/y'));
    for (const k of [...keys.values(), ...twins.values()]) {
      expect(k).not.toContain('/');
      expect(k).not.toContain('dev');
    }
    expect(keys.get('acme/web')).toMatch(/^apps-[0-9a-z]+$/);
  });

  it('no local checkouts: owner → repo', () => {
    const owners = folderKeys(['acme/web', 'globex/tools'], {});
    expect([...owners.values()]).toEqual(['@acme', '@globex']);
  });
});

describe('buildRepoTree', () => {
  const keys = folderKeys(
    rows.map((r) => r.pr.repoSlug),
    roots
  );
  const apps = keys.get('acme/web');
  const services = keys.get('acme/api');

  it('lists every repo of the rows with the counts of the counted rows', () => {
    const counted = rows.filter((r) => r.pr.ci === 'failure');
    const tree = buildRepoTree(rows, counted, roots);
    expect(tree.total).toBe(2);
    expect(tree.folders.map((f) => [f.key, f.label, f.count])).toEqual([
      [apps, 'apps', 2],
      [services, 'services', 0],
      ['@initech', 'initech', 0],
    ]);
    expect(tree.folders[0].repos.map((r) => [r.slug, r.name, r.count])).toEqual([
      ['globex/tools', 'tools', 1],
      ['acme/web', 'web', 1],
    ]);
  });

  it('labels are relative to the common parent; one folder only keeps its own name', () => {
    const extra = [...rows, row(pr(6, 'umbrella/x'))];
    const tree = buildRepoTree(extra, extra, { ...roots, 'umbrella/x': '/home/dev/other/x' });
    expect(tree.folders.find((f) => f.key === apps)?.label).toBe('code/apps');
    expect(buildRepoTree([rows[0]], [rows[0]], roots).folders[0].label).toBe('apps');
  });
});

describe('folder filter in the PR query', () => {
  it('parses, writes, counts as filter, resets, and filters by the folder map', () => {
    const q = parsePullQuery(new URLSearchParams('folder=apps'));
    expect(q.folder).toBe('apps');
    expect(hasFilters(q)).toBe(true);
    expect(FILTER_RESET.folder).toBeNull();
    expect(
      patchPullParams(new URLSearchParams('repo=a/b'), { folder: 'apps', repo: null }).toString()
    ).toBe('folder=apps');
    const keys = folderKeys(
      rows.map((r) => r.pr.repoSlug),
      roots
    );
    const shown = filterPulls(rows, { ...DEFAULT_QUERY, folder: keys.get('acme/web')! }, keys);
    expect(shown.map((r) => r.pr.number)).toEqual([1, 2, 4]);
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

  it('renders a WAI-ARIA tree: root, folders, repos with counts', () => {
    render(<Host />);
    expect(screen.getByRole('tree', { name: 'Repositories' })).toBeInTheDocument();
    expect(item(/^All repositories/)).toHaveAttribute('aria-selected', 'true');
    expect(item(/^All repositories/)).toHaveAttribute('aria-expanded', 'true');
    expect(item(/^apps/)).toHaveAttribute('aria-level', '2');
    expect(item(/^web/)).toHaveAttribute('aria-level', '3');
    expect(item(/^All repositories/)).toHaveTextContent('5');
    expect(item(/^apps/)).toHaveTextContent('3');
    expect(item(/^web/)).toHaveTextContent('2');
  });

  it('click selects a folder or a repo', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Host spy={spy} />);
    await user.click(screen.getByText('services'));
    expect(spy).toHaveBeenLastCalledWith({
      kind: 'folder',
      key: folderKeys(['acme/api'], roots).get('acme/api'),
    });
    await user.click(screen.getByText('api'));
    expect(spy).toHaveBeenLastCalledWith({ kind: 'repo', slug: 'acme/api' });
    expect(item(/^api/)).toHaveAttribute('aria-selected', 'true');
  });

  it('keyboard: one tab stop, Up/Down, Right/Left expand-collapse and move, Home/End, Enter selects', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Host spy={spy} />);
    await user.click(screen.getByText('before'));
    await user.tab();
    expect(document.activeElement).toBe(item(/^All repositories/));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item(/^apps/));
    await user.keyboard('{ArrowLeft}');
    expect(item(/^apps/)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('treeitem', { name: /^web/ })).toBeNull();
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(item(/^All repositories/));
    await user.keyboard('{ArrowDown}{ArrowRight}');
    expect(item(/^apps/)).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(item(/^tools/));
    await user.keyboard('{Enter}');
    expect(spy).toHaveBeenLastCalledWith({ kind: 'repo', slug: 'globex/tools' });
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(item(/^lonely/));
    await user.keyboard('{Home} ');
    expect(spy).toHaveBeenLastCalledWith({ kind: 'all' });
    await user.keyboard('s');
    expect(document.activeElement).toBe(item(/^services/));
  });

  it('remembers collapsed folders across mounts', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Host />);
    await user.click(screen.getByTitle('Collapse apps'));
    expect(JSON.parse(localStorage.getItem(REPO_TREE_COLLAPSED_KEY)!)).toEqual([
      folderKeys(['acme/web'], roots).get('acme/web'),
    ]);
    unmount();
    render(<Host />);
    expect(item(/^apps/)).toHaveAttribute('aria-expanded', 'false');
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
