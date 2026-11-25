import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { AgentPullRequest, AgentSession } from '../types';
import type { PullRequestRow } from '../utils/agentSessions';
import { PullRequestsPanel } from '../components/AgentsView/PullRequestsPanel';
import {
  ConnectedPullRequestsPage,
  PullRequestsDataContext,
  PullRequestsPage,
  type PullRequestsQueryProps,
} from '../components/AgentsView/PullRequestsPage';
import { configureLinks } from '../utils/links';
import { AgentsProvider } from '../host';
import { testHost, testTransport } from './agents';

// The host's built-in browser; the pane only needs to show which URL it got
const host = testHost({
  renderBrowser: ({ url, onClose, closeLabel }) => (
    <div data-testid="pr-pane">
      {url}
      <button onClick={onClose}>{closeLabel}</button>
    </div>
  ),
});
const transport = testTransport();

/** The host route's URL query (Orkumo: react-router's useSearchParams), in memory */
const QueryContext = createContext<PullRequestsQueryProps | null>(null);
const useQuery = (): PullRequestsQueryProps => {
  const query = useContext(QueryContext);
  if (!query) throw new Error('render inside renderPage');
  return query;
};
const QueryRouter: React.FC<{ route: string; children: React.ReactNode }> = ({
  route,
  children,
}) => {
  const [url, setUrl] = useState(() => new URL(route, 'http://localhost'));
  const setSearchParams = useCallback<PullRequestsQueryProps['setSearchParams']>(
    (next) =>
      setUrl((current) => {
        const updated = new URL(current);
        updated.search = next(new URLSearchParams(current.search)).toString();
        return updated;
      }),
    []
  );
  const searchParams = useMemo(() => new URLSearchParams(url.search), [url]);
  return (
    <QueryContext.Provider value={{ searchParams, setSearchParams }}>
      {children}
      <div data-testid="location">{url.pathname + url.search}</div>
    </QueryContext.Provider>
  );
};
/** The page and the route container as the host renders them, with its URL query */
const Page: React.FC<Partial<React.ComponentProps<typeof PullRequestsPage>>> = (props) => (
  <PullRequestsPage {...listProps} {...useQuery()} {...props} />
);
const Connected: React.FC = () => <ConnectedPullRequestsPage {...useQuery()} />;

const pr = (number: number, repoSlug = 'o/r'): AgentPullRequest => ({
  number,
  title: `PR ${number}`,
  url: `https://github.com/${repoSlug}/pull/${number}`,
  author: 'dev',
  isDraft: false,
  headRef: `feat/${number}`,
  baseRef: 'main',
  updatedAt: new Date().toISOString(),
  reviewDecision: null,
  mergeable: 'MERGEABLE',
  ci: 'success',
  ciPassed: 1,
  ciFailed: 0,
  ciPending: 0,
  mergeReady: true,
  repoSlug,
});

const rows: PullRequestRow[] = [
  { pr: pr(1), agents: [] },
  { pr: pr(2), agents: [] },
  { pr: pr(3, 'o/other'), agents: [] },
];
const session = { id: 's1' } as AgentSession;
// A non-empty contexts map means "loaded"
const listProps = {
  rows,
  sessions: [session],
  contexts: { s1: { repo: { slug: 'o/r' }, pulls: [] } } as never,
  repoFilter: null,
  onSelectAgent: vi.fn(),
  onOpenCode: vi.fn(),
  onClearRepo: vi.fn(),
};

const electron = (on: boolean) => configureLinks({ embedsAnySite: on });

/** /pulls keeps its filters in the URL, so the page renders inside the host's router */
const renderPage = (ui: React.ReactElement, route = '/pulls') =>
  render(ui, {
    wrapper: ({ children }) => (
      <AgentsProvider transport={transport} host={host}>
        <QueryRouter route={route}>{children}</QueryRouter>
      </AgentsProvider>
    ),
  });

afterEach(() => {
  localStorage.clear();
  electron(false);
  vi.restoreAllMocks();
});

describe('PullRequestsPanel (popover)', () => {
  it('AC-1: maximize button opens the full view and closes the popover', () => {
    const onMaximize = vi.fn();
    const onClose = vi.fn();
    render(<PullRequestsPanel {...listProps} onMaximize={onMaximize} onClose={onClose} />);
    const button = screen.getByRole('button', { name: 'Maximize pull requests' });
    expect(button).toHaveAttribute('title', 'Open as full view');
    fireEvent.click(button);
    expect(onMaximize).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps PR titles as external links in the popover', () => {
    render(<PullRequestsPanel {...listProps} onMaximize={vi.fn()} onClose={vi.fn()} />);
    const link = screen.getByRole('link', { name: /PR 1$/ });
    expect(link).toHaveAttribute('href', rows[0].pr.url);
    expect(link).toHaveAttribute('target', '_blank');
  });
});

describe('PullRequestsPage (/pulls)', () => {
  it('AC-2: renders all PRs with count, repo filter (from the URL) and code buttons', () => {
    const { unmount } = renderPage(<Page />);
    expect(screen.getByText('Open pull requests')).toBeInTheDocument();
    expect(screen.getByTestId('pulls-count')).toHaveTextContent(/^3$/);
    expect(screen.getAllByRole('button', { name: /Code/ })).toHaveLength(3);
    unmount();
    renderPage(<Page />, '/pulls?repo=o/other');
    expect(screen.getByTestId('pulls-count')).toHaveTextContent('1 of 3');
    expect(screen.queryByText('PR 1')).not.toBeInTheDocument();
    expect(screen.getByText('PR 3')).toBeInTheDocument();
  });

  it('AC-2: agent and code buttons call their handlers', () => {
    const onSelectAgent = vi.fn();
    const onOpenCode = vi.fn();
    const agentRows = [{ pr: pr(1), agents: [{ id: 'a1', name: 'Agent One' } as AgentSession] }];
    renderPage(<Page rows={agentRows} onSelectAgent={onSelectAgent} onOpenCode={onOpenCode} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agent One' }));
    expect(onSelectAgent).toHaveBeenCalledWith('a1');
    fireEvent.click(screen.getByRole('button', { name: /Code/ }));
    expect(onOpenCode).toHaveBeenCalledWith(agentRows[0]);
  });

  it('AC-3: a PR opens one pane, the next PR replaces it', () => {
    electron(true);
    renderPage(<Page />);
    expect(screen.queryByTestId('pr-pane')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /PR 1$/ }));
    expect(screen.getAllByTestId('pr-pane')).toHaveLength(1);
    expect(screen.getByTestId('pr-pane')).toHaveTextContent(rows[0].pr.url);
    fireEvent.click(screen.getByRole('button', { name: /PR 2$/ }));
    expect(screen.getAllByTestId('pr-pane')).toHaveLength(1);
    expect(screen.getByTestId('pr-pane')).toHaveTextContent(rows[1].pr.url);
    expect(screen.getByRole('button', { name: /PR 2$/ })).toHaveAttribute('aria-current', 'true');
  });

  it('AC-4: closing the pane removes it', () => {
    electron(true);
    renderPage(<Page />);
    fireEvent.click(screen.getByRole('button', { name: /PR 1$/ }));
    const pane = screen.getByTestId('pr-pane').closest('div.rounded') as HTMLElement;
    fireEvent.click(within(pane).getByRole('button', { name: 'Close browser' }));
    expect(screen.queryByTestId('pr-pane')).not.toBeInTheDocument();
  });

  it('AC-5: without Electron a PR opens in a new tab, no pane', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderPage(<Page />);
    fireEvent.click(screen.getByRole('button', { name: /PR 1$/ }));
    expect(open).toHaveBeenCalledWith(rows[0].pr.url, '_blank', 'noopener,noreferrer');
    expect(screen.queryByTestId('pr-pane')).not.toBeInTheDocument();
  });

  it('the host route renders the page from the AgentsView context, nothing without it', () => {
    const { rerender } = renderPage(<Connected />);
    expect(screen.queryByText('Open pull requests')).not.toBeInTheDocument();
    rerender(
      <PullRequestsDataContext.Provider value={listProps}>
        <Connected />
      </PullRequestsDataContext.Provider>
    );
    expect(screen.getByText('Open pull requests')).toBeInTheDocument();
    expect(screen.getByText('PR 1')).toBeInTheDocument();
  });

  it('focuses the view on arrival and keeps the list mounted when the pane opens and closes', () => {
    electron(true);
    renderPage(<Page />);
    expect(document.activeElement).toHaveAttribute('data-pulls-view');
    const list = screen.getByText('PR 3').closest('ul, div.overflow-y-auto');
    fireEvent.click(screen.getByRole('button', { name: /PR 1$/ }));
    expect(screen.getByText('PR 3').closest('ul, div.overflow-y-auto')).toBe(list);
    fireEvent.click(screen.getByRole('button', { name: 'Close browser' }));
    expect(screen.getByText('PR 3').closest('ul, div.overflow-y-auto')).toBe(list);
  });

  it('embeds only https://github.com/, opens other https hosts externally, ignores the rest', () => {
    electron(true);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const other = [
      { pr: { ...pr(8), url: 'https://ghe.example/o/r/pull/8' }, agents: [] },
      { pr: { ...pr(9), url: 'javascript:alert(1)' }, agents: [] },
    ];
    renderPage(<Page rows={other} />);
    fireEvent.click(screen.getByRole('button', { name: /PR 8$/ }));
    expect(open).toHaveBeenCalledWith(other[0].pr.url, '_blank', 'noopener,noreferrer');
    fireEvent.click(screen.getByRole('button', { name: /PR 9$/ }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('pr-pane')).not.toBeInTheDocument();
  });

  it('narrow Electron window (< md) opens the PR externally, no split', () => {
    electron(true);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(500);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderPage(<Page />);
    fireEvent.click(screen.getByRole('button', { name: /PR 1$/ }));
    expect(open).toHaveBeenCalledWith(rows[0].pr.url, '_blank', 'noopener,noreferrer');
    expect(screen.queryByTestId('pr-pane')).not.toBeInTheDocument();
  });

  it('keeps an external link icon next to each PR', () => {
    renderPage(<Page />);
    expect(screen.getByRole('link', { name: 'Open #1 in browser' })).toHaveAttribute(
      'href',
      rows[0].pr.url
    );
  });
});

describe('/pulls filters, clusters and sorting (#191)', () => {
  const agentOne = { id: 'a1', name: 'Agent One' } as AgentSession;
  const richRows: PullRequestRow[] = [
    { pr: { ...pr(1), title: 'Fix login', author: 'alice' }, agents: [agentOne] },
    { pr: { ...pr(2), ci: 'failure', mergeReady: false }, agents: [] },
    { pr: pr(3, 'o/other'), agents: [] },
  ];
  // Through the route container, as the host renders it
  const page = (route = '/pulls') =>
    renderPage(
      <PullRequestsDataContext.Provider value={{ ...listProps, rows: richRows }}>
        <Connected />
      </PullRequestsDataContext.Provider>,
      route
    );
  const titles = () => screen.queryAllByRole('button', { name: /^#\d+/ }).map((b) => b.textContent);
  /** Picks the option named `text` of the Choice `label` (pills or menu) */
  const select = (label: string, text: string) => {
    const group = screen.queryByRole('radiogroup', { name: label });
    if (group) return fireEvent.click(within(group).getByRole('radio', { name: text }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label} `) }));
    fireEvent.click(screen.getByRole('option', { name: text }));
  };
  const shownValue = (label: string) =>
    screen.getByRole('button', { name: new RegExp(`^${label} `) }).textContent;
  const location = () => screen.getByTestId('location').textContent;

  it('AC-5: filters narrow the list and the count, reset restores everything', () => {
    page();
    expect(titles()).toHaveLength(3);
    select('CI', 'Failing');
    expect(titles()).toEqual(['#2PR 2']);
    expect(screen.getByTestId('pulls-count')).toHaveTextContent('1 of 3');
    select('CI', 'CI: any');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search pull requests' }), {
      target: { value: 'alice' },
    });
    expect(titles()).toEqual(['#1Fix login']);
    select('Has agent', 'No');
    expect(screen.getByText('No pull requests match the filters.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reset filters/ }));
    expect(titles()).toHaveLength(3);
    expect(screen.getByTestId('pulls-count')).toHaveTextContent(/^3$/);
    expect(screen.queryByRole('button', { name: /Reset filters/ })).toBeNull();
    expect(screen.getByRole('searchbox', { name: 'Search pull requests' })).toHaveFocus();
  });

  it('AC-5: clustering shows a header with the count per group', () => {
    page();
    select('Group by', 'Group: Repository');
    const other = screen.getByRole('region', { name: 'o/other (1)' });
    const main = screen.getByRole('region', { name: 'o/r (2)' });
    expect(within(other).getByText('PR 3')).toBeInTheDocument();
    expect(within(main).getByText('Fix login')).toBeInTheDocument();
    select('Group by', 'Group: Agent');
    expect(screen.getByRole('region', { name: 'Agent One (1)' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'No agent (2)' })).toBeInTheDocument();
  });

  it('AC-5: sort select and direction button reorder the list', () => {
    page();
    select('Sort by', 'Sort: Number');
    expect(titles()).toEqual(['#3PR 3', '#2PR 2', '#1Fix login']);
    fireEvent.click(screen.getByRole('button', { name: 'Sort descending' }));
    expect(titles()).toEqual(['#1Fix login', '#2PR 2', '#3PR 3']);
    expect(screen.getByRole('button', { name: 'Sort ascending' })).toBeInTheDocument();
  });

  it('AC-6: the state is written to the URL and restored from it', () => {
    const { unmount } = page();
    select('Merge', 'Blocked');
    select('Group by', 'Group: Repository');
    select('Sort by', 'Sort: Title');
    fireEvent.click(screen.getByRole('button', { name: 'Sort descending' }));
    const url = location()!;
    expect(url).toBe('/pulls?merge=blocked&group=repo&sort=title&dir=asc');
    unmount();
    page(url);
    expect(shownValue('Merge')).toBe('Blocked');
    expect(shownValue('Group by')).toBe('Group: Repository');
    expect(shownValue('Sort by')).toBe('Sort: Title');
    expect(screen.getByRole('region', { name: 'o/r (1)' })).toBeInTheDocument();
    expect(titles()).toEqual(['#2PR 2']);
  });

  it('AC-6: the repo filter of the popover arrives as ?repo= and is clearable', () => {
    page('/pulls?repo=o%2Fother');
    expect(screen.getByRole('treeitem', { name: /^other/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(titles()).toEqual(['#3PR 3']);
    fireEvent.click(screen.getByRole('treeitem', { name: /^All repositories/ }));
    expect(location()).toBe('/pulls');
    expect(titles()).toHaveLength(3);
  });
});

describe('/pulls repo tree', () => {
  // Fake checkouts: two repos in one folder, one elsewhere
  const treeRows: PullRequestRow[] = [
    { pr: pr(1, 'acme/web'), agents: [] },
    { pr: { ...pr(2, 'acme/web'), ci: 'failure' }, agents: [] },
    { pr: pr(3, 'acme/api'), agents: [] },
    { pr: { ...pr(4, 'globex/tools'), ci: 'failure' }, agents: [] },
  ];
  const ctx = (slug: string, root: string) => ({ repo: { slug, root }, pulls: null });
  const contexts = {
    a: ctx('acme/web', '/home/dev/code/apps/web'),
    b: ctx('acme/api', '/home/dev/code/services/api'),
    c: ctx('globex/tools', '/home/dev/code/apps/tools'),
  } as never;
  const page = (route = '/pulls') =>
    renderPage(
      <PullRequestsDataContext.Provider value={{ ...listProps, rows: treeRows, contexts }}>
        <Connected />
      </PullRequestsDataContext.Provider>,
      route
    );
  const titles = () => screen.queryAllByRole('button', { name: /^#\d+/ }).map((b) => b.textContent);
  const location = () => screen.getByTestId('location').textContent;

  it('groups repos by local folder, filters by folder or repo, counts follow the other filters', () => {
    page();
    expect(screen.queryByRole('button', { name: /^Repo / })).toBeNull();
    fireEvent.click(screen.getByRole('treeitem', { name: /^apps/ }));
    expect(location()).toMatch(/^\/pulls\?folder=apps-[0-9a-z]+$/);
    expect(titles().sort()).toEqual(['#1PR 1', '#2PR 2', '#4PR 4']);
    fireEvent.click(screen.getByRole('treeitem', { name: /^api/ }));
    expect(location()).toBe('/pulls?repo=acme%2Fapi');
    expect(titles()).toEqual(['#3PR 3']);
    fireEvent.click(screen.getByRole('button', { name: /^CI / }));
    fireEvent.click(screen.getByRole('option', { name: 'Failing' }));
    expect(screen.getByRole('treeitem', { name: /^apps/ })).toHaveTextContent(/2$/);
    expect(screen.getByRole('treeitem', { name: /^services/ })).toHaveTextContent(/0$/);
  });

  it('restores the last selection on a visit without one; reset forgets it', () => {
    const { unmount } = page();
    fireEvent.click(screen.getByRole('treeitem', { name: /^web/ }));
    unmount();
    const again = page();
    expect(location()).toBe('/pulls?repo=acme%2Fweb');
    fireEvent.click(screen.getByRole('button', { name: /Reset filters/ }));
    again.unmount();
    page();
    expect(location()).toBe('/pulls');
  });

  it('a selection that arrives via the URL is remembered for the next visit', () => {
    const first = page();
    fireEvent.click(screen.getByRole('treeitem', { name: /^web/ }));
    first.unmount();
    const linked = page('/pulls?repo=acme%2Fapi');
    linked.unmount();
    page();
    expect(location()).toBe('/pulls?repo=acme%2Fapi');
  });

  it('a stored folder key that no longer exists falls back to all repositories', () => {
    // Key format of 0.4.36 before the fix: relative folder name
    localStorage.setItem('agentsUi.pullsTreeSelection', JSON.stringify({ folder: 'apps' }));
    page();
    expect(titles()).toHaveLength(4);
    expect(screen.getByRole('treeitem', { name: /^All repositories/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});
