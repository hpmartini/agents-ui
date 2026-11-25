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
  it('names folders relative to the common parent; slugs without a checkout fall back to their owner', () => {
    const keys = folderKeys(
      rows.map((r) => r.pr.repoSlug),
      roots
    );
    expect(keys.get('acme/web')).toBe('apps');
    expect(keys.get('globex/tools')).toBe('apps');
    expect(keys.get('acme/api')).toBe('services');
    expect(keys.get('initech/lonely')).toBe('@initech');
  });

  it('one folder only: its own name', () => {
    const keys = folderKeys(['acme/web'], { 'acme/web': '/home/dev/code/apps/web' });
    expect(keys.get('acme/web')).toBe('apps');
  });

  it('no local checkouts: owner → repo', () => {
    const keys = folderKeys(['acme/web', 'globex/tools'], {});
    expect([...keys.values()]).toEqual(['@acme', '@globex']);
  });
});

describe('buildRepoTree', () => {
  it('lists every repo of the rows with the counts of the counted rows', () => {
    const counted = rows.filter((r) => r.pr.ci === 'failure');
    const tree = buildRepoTree(rows, counted, roots);
    expect(tree.total).toBe(2);
    expect(tree.folders.map((f) => [f.key, f.label, f.count])).toEqual([
      ['apps', 'apps', 2],
      ['services', 'services', 0],
      ['@initech', 'initech', 0],
    ]);
    expect(tree.folders[0].repos.map((r) => [r.slug, r.name, r.count])).toEqual([
      ['globex/tools', 'tools', 1],
      ['acme/web', 'web', 1],
    ]);
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
    const shown = filterPulls(rows, { ...DEFAULT_QUERY, folder: 'apps' }, keys);
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
    expect(spy).toHaveBeenLastCalledWith({ kind: 'folder', key: 'services' });
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
    await user.click(screen.getByRole('button', { name: 'Collapse apps' }));
    expect(JSON.parse(localStorage.getItem(REPO_TREE_COLLAPSED_KEY)!)).toEqual(['apps']);
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
    rerender(
      <RepoTree tree={empty} selection={{ kind: 'all' }} onSelect={() => {}} loading={false} />
    );
    expect(screen.getByText('No repositories with open pull requests')).toBeInTheDocument();
  });
});
