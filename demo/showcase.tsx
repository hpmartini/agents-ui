// Demo surfaces for the shared Choice and the /pulls repo tree: ?view=choice, ?view=pulls
// (&state=loading|empty). Fake owners, repos and paths only (public repo).
import React, { useCallback, useMemo, useState } from 'react';
import { Choice, type ChoiceOption } from '../src/components/Choice';
import { PullRequestsPage } from '../src/components/AgentsView/PullRequestsPage';
import type { AgentContext, AgentPullRequest, AgentSession } from '../src/types';
import type { PullRequestRow } from '../src/utils/agentSessions';

const greek = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'].map((l) => ({
  value: l.toLowerCase(),
  label: l,
}));
const harnesses: ChoiceOption[] = [
  { value: 'claude', label: 'Claude Code' },
  { value: 'omp', label: 'Oh My Pi' },
  { value: 'opencode', label: 'OpenCode (not installed)', disabled: true },
  { value: 'codex', label: 'Codex', hint: 'GPT' },
  { value: 'pi', label: 'Pi' },
];
const repos: ChoiceOption[] = [
  ...['web', 'api', 'docs', 'design-system', 'mobile'].map((r) => ({
    value: `acme/${r}`,
    label: `acme/${r}`,
    group: 'acme',
  })),
  ...['tools', 'billing', 'search-indexer', 'infra'].map((r) => ({
    value: `globex/${r}`,
    label: `globex/${r}`,
    group: 'globex',
  })),
  ...['tps-reports', 'printer'].map((r) => ({
    value: `initech/${r}`,
    label: `initech/${r}`,
    group: 'initech',
  })),
];

const Row: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-1.5">
    <h3 className="text-xs text-gray-400">{title}</h3>
    {children}
  </section>
);

export const ChoiceShowcase: React.FC = () => {
  const [density, setDensity] = useState('comfortable');
  const [scope, setScope] = useState('mine');
  const [letter, setLetter] = useState('beta');
  const [harness, setHarness] = useState('claude');
  const [repo, setRepo] = useState('acme/web');
  const [bottom, setBottom] = useState('globex/tools');
  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-900 text-gray-200 text-sm">
      <div className="max-w-xl space-y-6">
        <Row title="Pills (2 options)">
          <Choice
            label="Card density"
            value={density}
            onChange={setDensity}
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
        </Row>
        <Row title="Pills, long labels in a narrow column (wrap, no clipping)">
          <div className="w-56 border border-dashed border-gray-700 p-2">
            <Choice
              label="Scope"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'all', label: 'All sessions on this machine' },
                { value: 'mine', label: 'Only sessions I started' },
                { value: 'pinned', label: 'Pinned' },
              ]}
            />
          </div>
        </Row>
        <Row title="Menu (5 options)">
          <Choice label="Greek letter" value={letter} onChange={setLetter} options={greek} />
        </Row>
        <Row title="Menu with a disabled option and a hint">
          <Choice label="Harness" value={harness} onChange={setHarness} options={harnesses} />
        </Row>
        <Row title="Search (11 options, grouped)">
          <Choice label="Repository" value={repo} onChange={setRepo} options={repos} />
        </Row>
        <Row title="Disabled">
          <Choice label="Locked" value="beta" onChange={() => {}} options={greek} disabled />
        </Row>
        <div className="h-[60vh]" />
        <Row title="Near the bottom: opens upwards">
          <Choice label="Bottom repository" value={bottom} onChange={setBottom} options={repos} />
        </Row>
      </div>
    </div>
  );
};

const pr = (
  n: number,
  repoSlug: string,
  over: Partial<AgentPullRequest> = {}
): AgentPullRequest => ({
  number: n,
  title: `Pull request ${n}`,
  url: `https://github.com/${repoSlug}/pull/${n}`,
  author: 'dev',
  isDraft: false,
  headRef: `feat/${n}`,
  baseRef: 'main',
  updatedAt: new Date(Date.now() - n * 3_600_000).toISOString(),
  reviewDecision: null,
  mergeable: 'MERGEABLE',
  ci: 'success',
  ciPassed: 3,
  ciFailed: 0,
  ciPending: 0,
  mergeReady: true,
  repoSlug,
  ...over,
});
const fakeRows: PullRequestRow[] = [
  { pr: pr(12, 'acme/web', { title: 'Speed up the checkout page' }), agents: [] },
  {
    pr: pr(15, 'acme/web', { title: 'Fix login redirect', ci: 'failure', mergeReady: false }),
    agents: [],
  },
  { pr: pr(7, 'acme/api', { title: 'Rate limit the search endpoint', ci: 'pending' }), agents: [] },
  { pr: pr(3, 'acme/docs', { title: 'Document the webhooks', isDraft: true }), agents: [] },
  { pr: pr(41, 'globex/tools', { title: 'Release script for the CLI' }), agents: [] },
  {
    pr: pr(9, 'globex/billing', {
      title: 'Invoice rounding',
      reviewDecision: 'CHANGES_REQUESTED',
      mergeReady: false,
    }),
    agents: [],
  },
  { pr: pr(2, 'initech/tps-reports', { title: 'New cover sheet' }), agents: [] },
];
const ctx = (slug: string, root: string) =>
  ({ repo: { slug, root }, pulls: { open: 0, url: null, items: [] } }) as unknown as AgentContext;
// initech/tps-reports has no local checkout: it lands under its owner
const fakeContexts: Record<string, AgentContext> = {
  a: ctx('acme/web', '/home/dev/code/apps/web'),
  b: ctx('acme/api', '/home/dev/code/services/api'),
  c: ctx('acme/docs', '/home/dev/code/apps/docs'),
  d: ctx('globex/tools', '/home/dev/code/tools/globex-tools'),
  e: ctx('globex/billing', '/home/dev/code/services/billing'),
};

export const PullsShowcase: React.FC<{ state: string | null }> = ({ state }) => {
  const [search, setSearch] = useState(() => new URLSearchParams());
  const setSearchParams = useCallback(
    (next: (prev: URLSearchParams) => URLSearchParams) => setSearch((prev) => next(prev)),
    []
  );
  const rows = state === 'loading' || state === 'empty' ? [] : fakeRows;
  const contexts = state === 'loading' ? {} : fakeContexts;
  const sessions = useMemo(
    () => Object.keys(contexts).map((id) => ({ id }) as AgentSession),
    [contexts]
  );
  return (
    <div className="relative h-full">
      <PullRequestsPage
        rows={rows}
        sessions={sessions}
        contexts={contexts}
        onSelectAgent={() => {}}
        searchParams={search}
        setSearchParams={setSearchParams}
      />
    </div>
  );
};
