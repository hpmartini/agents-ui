/**
 * Throwaway prototype for the threads/status redesign (concept: Orkumo docs/konzept-threads-status.md).
 * Static sample data, no transport. ?view=prototype plus ?agent= ?thread= ?pill= ?pane=split|max ?theme=light
 */
import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  CircleDot,
  Clock,
  Hourglass,
  Loader2,
  MessageSquare,
  Moon,
  Send,
  Terminal,
  X,
} from 'lucide-react';
import { Choice } from '../src/components/Choice';
import './prototype.css';

type State = 'asks' | 'failed' | 'working' | 'tasks' | 'done' | 'idle';

const STATE: Record<
  State,
  { label: string; icon: React.FC<{ size?: number; className?: string }> }
> = {
  asks: { label: 'Waiting for you', icon: MessageSquare },
  failed: { label: 'Failed', icon: AlertTriangle },
  working: { label: 'Working', icon: Loader2 },
  tasks: { label: 'Waiting on tasks', icon: Hourglass },
  done: { label: 'Done', icon: Check },
  idle: { label: 'Idle', icon: Moon },
};

interface Pill {
  id: string;
  kind: 'Shell' | 'Subagent';
  name: string;
  status: string;
  running: boolean;
  detail: string[];
}

interface Msg {
  from: 'you' | 'agent';
  text: string;
  wide?: 'table' | 'diff';
  unanswered?: string;
}

interface Thread {
  id: string;
  name: string;
  kind: 'main' | 'thread' | 'subagent';
  state?: State | 'unanswered';
  note?: string;
  msgs: Msg[];
}

interface Agent {
  id: string;
  name: string;
  project: string;
  state: State;
  /** One line under the name: the question, the reason, the current step */
  line: string;
  age: string;
  question?: {
    text: string;
    options: { value: string; label: string; hint: string }[];
    source: 'dialog' | 'answer text';
  };
  pills?: Pill[];
  threads: Thread[];
}

const LONG_ANSWER =
  'The docs now build from one source. I moved the reference pages to the new generator, kept every old URL as a redirect and checked all 412 internal links. Search indexing runs on the new build; the old one is switched off.';

const AGENTS: Agent[] = [
  {
    id: 'pricing',
    name: 'Pricing page copy',
    project: 'marketing-site',
    state: 'asks',
    line: 'Which tier should be highlighted as recommended?',
    age: '4m',
    question: {
      text: 'Which tier should be highlighted as recommended?',
      source: 'dialog',
      options: [
        { value: 'team', label: 'Team', hint: 'Middle tier, most signups last quarter' },
        { value: 'pro', label: 'Pro', hint: 'Highest revenue per account' },
        { value: 'none', label: 'None', hint: 'Show all tiers equally' },
      ],
    },
    threads: [
      {
        id: 'main',
        name: 'Main',
        kind: 'main',
        msgs: [
          { from: 'you', text: 'Rewrite the pricing page copy. Keep it short and plain.' },
          {
            from: 'agent',
            text: 'Drafted headlines and descriptions for all three tiers. One decision is open before I write the comparison table.',
          },
        ],
      },
    ],
  },
  {
    id: 'reindex',
    name: 'Search reindex',
    project: 'search-service',
    state: 'asks',
    line: 'Switch the alias now, or keep both indexes until Monday?',
    age: '1h',
    question: {
      text: 'Switch the alias and drop the old index now, or keep both until Monday?',
      source: 'answer text',
      options: [
        { value: 'now', label: 'Switch now', hint: 'Frees 40 GB today' },
        { value: 'monday', label: 'Keep both until Monday', hint: 'Rollback stays possible' },
      ],
    },
    threads: [
      {
        id: 'main',
        name: 'Main',
        kind: 'main',
        msgs: [
          {
            from: 'you',
            text: 'Index the product catalogue for the new search. Ask me before you drop the old index.',
          },
          {
            from: 'agent',
            text: 'The new index is built next to the old one and answers the 50 sample queries with the same top results. Should I switch the alias and drop the old index now, or keep both until Monday?',
          },
        ],
      },
    ],
  },
  {
    id: 'webhook',
    name: 'Webhook test on CI',
    project: 'billing-api',
    state: 'failed',
    line: 'Contract test: 401 from the staging webhook',
    age: '46s',
    threads: [
      {
        id: 'main',
        name: 'Main',
        kind: 'main',
        msgs: [
          { from: 'you', text: 'Run the webhook contract tests against staging.' },
          {
            from: 'agent',
            text: 'The contract test stopped: the staging webhook answered 401 Unauthorized. The signing secret on staging differs from the one in the test config.',
          },
        ],
      },
    ],
  },
  {
    id: 'checkout',
    name: 'Checkout refactor',
    project: 'shop-web',
    state: 'working',
    line: 'Step 3 · running the pricing tests',
    age: '6m',
    threads: [
      {
        id: 'main',
        name: 'Main',
        kind: 'main',
        msgs: [
          { from: 'you', text: 'Move the tax rounding into one place and update the call sites.' },
        ],
      },
    ],
  },
  {
    id: 'release',
    name: 'Release 4.2 orchestrator',
    project: 'shop-web',
    state: 'tasks',
    line: '3 tasks · 1 thread without answer',
    age: '12m',
    pills: [
      {
        id: 'preview',
        kind: 'Shell',
        name: 'Preview server',
        status: 'running · 14m',
        running: true,
        detail: [
          '$ npm run preview -- --port 4173',
          'Local: http://localhost:4173/',
          'ready in 812 ms',
        ],
      },
      {
        id: 'webkit',
        kind: 'Shell',
        name: 'WebKit e2e suite',
        status: 'running · 6m',
        running: true,
        detail: [
          '$ npx playwright test --project=webkit',
          'Running 214 tests using 2 workers',
          '  128 passed (6m)',
        ],
      },
      {
        id: 'changelog',
        kind: 'Subagent',
        name: 'Draft changelog',
        status: 'working · step 4',
        running: true,
        detail: [
          'general-purpose',
          'Reads merged PRs since 4.1',
          'Has its own thread: Draft changelog',
        ],
      },
    ],
    threads: [
      {
        id: 'main',
        name: 'Main',
        kind: 'main',
        state: 'tasks',
        msgs: [
          {
            from: 'you',
            text: 'Prepare the 4.2 release: changelog, tag candidates, and keep the preview server running.',
          },
          {
            from: 'agent',
            text: 'Preview server, WebKit suite and the changelog agent are running. I report back when the suite and the changelog are done.',
          },
        ],
      },
      {
        id: 'webkit',
        name: 'WebKit suite',
        kind: 'thread',
        state: 'unanswered',
        note: 'No answer · 12m',
        msgs: [
          { from: 'you', text: 'Why is the WebKit suite so slow today?' },
          {
            from: 'agent',
            text: 'The WebKit suite runs with 2 workers instead of 6 because the runner has 4 GB RAM. It needs about 18 minutes.',
          },
          {
            from: 'you',
            text: 'Can we raise the workers?',
            unanswered: 'No answer yet · sent 12m ago',
          },
        ],
      },
      {
        id: 'changelog',
        name: 'Draft changelog',
        kind: 'subagent',
        state: 'working',
        note: 'Step 4',
        msgs: [
          {
            from: 'agent',
            text: 'Collected 23 merged PRs since 4.1. Grouping them into features, fixes and internal changes.',
          },
        ],
      },
      {
        id: 'tags',
        name: 'Tag candidates',
        kind: 'thread',
        state: 'done',
        msgs: [
          {
            from: 'agent',
            text: 'Two tag candidates: 4.2.0-rc.1 on the current main, 4.2.0 after the WebKit suite passes.',
          },
        ],
      },
    ],
  },
  {
    id: 'docs',
    name: 'Docs migration',
    project: 'docs-site',
    state: 'done',
    line: '412 links checked, old URLs redirect',
    age: '1m',
    threads: [
      {
        id: 'main',
        name: 'Main',
        kind: 'main',
        msgs: [
          { from: 'you', text: 'Migrate the reference docs to the new generator.' },
          { from: 'agent', text: LONG_ANSWER, wide: 'table' },
          { from: 'agent', text: 'One redirect needed a code change:', wide: 'diff' },
        ],
      },
    ],
  },
  {
    id: 'audit',
    name: 'Dependency audit',
    project: 'billing-api',
    state: 'idle',
    line: 'Two low findings, nothing ships',
    age: '1h',
    threads: [
      {
        id: 'main',
        name: 'Main',
        kind: 'main',
        msgs: [
          {
            from: 'agent',
            text: 'Two low findings, both in dev dependencies. Nothing ships to production.',
          },
        ],
      },
    ],
  },
];

const GROUPS: { title: string; states: State[] }[] = [
  { title: 'Needs you', states: ['asks', 'failed'] },
  { title: 'Running', states: ['working', 'tasks'] },
  { title: 'Finished', states: ['done', 'idle'] },
];

const params = new URLSearchParams(location.search);

function StateTag({ state, compact }: { state: State | 'unanswered'; compact?: boolean }) {
  const key = state === 'unanswered' ? 'asks' : state;
  const Icon = state === 'unanswered' ? Clock : STATE[key].icon;
  const label = state === 'unanswered' ? 'No answer' : STATE[key].label;
  return (
    <span className={`p-state p-s-${key}`}>
      <Icon size={13} className={state === 'working' ? 'p-spin' : undefined} aria-hidden />
      {!compact && label}
      {compact && <span className="p-sr">{label}</span>}
    </span>
  );
}

function Rail({ current, onOpen }: { current: string; onOpen: (id: string) => void }) {
  return (
    <nav className="p-rail" aria-label="Agents">
      <div className="p-rail-head">
        <strong>Agents</strong>
        <span className="p-muted">{AGENTS.length}</span>
        <span className="p-hint">
          <kbd className="kbd">N</kbd> next that needs you
        </span>
      </div>
      {GROUPS.map((g) => {
        const rows = AGENTS.filter((a) => g.states.includes(a.state));
        return (
          <section
            key={g.title}
            className={`p-group ${g.title === 'Needs you' ? 'p-group-you' : ''}`}
          >
            <h2>
              {g.title} <span className="p-count">{rows.length}</span>
            </h2>
            {rows.map((a) => (
              <button
                key={a.id}
                className={`p-row ${a.id === current ? 'p-row-on' : ''}`}
                onClick={() => onOpen(a.id)}
                aria-current={a.id === current}
              >
                <span className="p-row-top">
                  <span className="p-row-name">{a.name}</span>
                  <span className="p-age">{a.age}</span>
                </span>
                <span className="p-row-mid">
                  <StateTag state={a.state} />
                  <span className="p-proj">{a.project}</span>
                </span>
                <span className={`p-row-line ${g.title === 'Needs you' ? 'p-row-line-you' : ''}`}>
                  {a.line}
                </span>
              </button>
            ))}
          </section>
        );
      })}
    </nav>
  );
}

function WideBlock({ kind }: { kind: 'table' | 'diff' }) {
  return kind === 'table' ? (
    <div className="p-wide" tabIndex={0} aria-label="Table, scrolls sideways">
      <table>
        <thead>
          <tr>
            <th>Page group</th>
            <th>Pages</th>
            <th>Old path</th>
            <th>New path</th>
            <th>Redirect</th>
            <th>Checked links</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Getting started</td>
            <td>14</td>
            <td>/docs/v3/getting-started/*</td>
            <td>/start/*</td>
            <td>301</td>
            <td>58</td>
          </tr>
          <tr>
            <td>API reference</td>
            <td>212</td>
            <td>/docs/v3/reference/api/*</td>
            <td>/reference/*</td>
            <td>301</td>
            <td>301</td>
          </tr>
          <tr>
            <td>Guides</td>
            <td>37</td>
            <td>/docs/v3/guides/*</td>
            <td>/guides/*</td>
            <td>301</td>
            <td>53</td>
          </tr>
        </tbody>
      </table>
    </div>
  ) : (
    <pre className="p-wide p-diff" tabIndex={0} aria-label="Diff, scrolls sideways">
      <span className="p-del">
        {
          "- redirects.push({ from: '/docs/v3/reference/:path*', to: '/reference/:path*', permanent: false })"
        }
      </span>
      {'\n'}
      <span className="p-add">
        {
          "+ redirects.push({ from: '/docs/v3/reference/:path*', to: '/reference/:path*', permanent: true, locale: false })"
        }
      </span>
    </pre>
  );
}

function Messages({ thread }: { thread: Thread }) {
  return (
    <div className="p-msgs">
      {thread.msgs.map((m, i) =>
        m.from === 'you' ? (
          <div key={i} className="p-you-wrap">
            <div className="p-you">{m.text}</div>
            {m.unanswered && (
              <div className="p-unanswered">
                <Clock size={12} aria-hidden /> {m.unanswered}
              </div>
            )}
          </div>
        ) : (
          <article key={i} className="p-answer">
            <header>
              <Bot size={13} aria-hidden /> Claude Code
            </header>
            <p>{m.text}</p>
            {m.wide && <WideBlock kind={m.wide} />}
          </article>
        )
      )}
    </div>
  );
}

function PillBar({
  pills,
  open,
  onOpen,
}: {
  pills: Pill[];
  open: string | null;
  onOpen: (id: string | null) => void;
}) {
  const pill = pills.find((p) => p.id === open);
  return (
    <div className="p-pills-wrap">
      {pill && (
        <div className="p-pill-detail" role="region" aria-label={`${pill.kind} ${pill.name}`}>
          <header>
            <strong>
              {pill.kind} · {pill.name}
            </strong>
            <span className="p-muted">{pill.status}</span>
            <button className="p-icon" onClick={() => onOpen(null)} aria-label="Close details">
              <X size={14} />
            </button>
          </header>
          <pre>{pill.detail.join('\n')}</pre>
          {pill.kind === 'Subagent' && (
            <span className="p-muted">Opens as its own thread above.</span>
          )}
        </div>
      )}
      <div className="p-pills" aria-label="Background work">
        {pills.map((p) => (
          <button
            key={p.id}
            className={`p-pill ${p.id === open ? 'p-pill-on' : ''}`}
            onClick={() => onOpen(p.id === open ? null : p.id)}
            aria-expanded={p.id === open}
          >
            {p.kind === 'Shell' ? (
              <Terminal size={12} aria-hidden />
            ) : (
              <Bot size={12} aria-hidden />
            )}
            <span className="p-pill-kind">{p.kind}</span>
            <span className="p-pill-name">{p.name}</span>
            <span className="p-pill-status">
              {p.running && <CircleDot size={10} aria-hidden />} {p.status}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Pane({
  agent,
  threadId,
  onThread,
  pill,
  onPill,
}: {
  agent: Agent;
  threadId: string;
  onThread: (id: string) => void;
  pill: string | null;
  onPill: (id: string | null) => void;
}) {
  const thread = agent.threads.find((t) => t.id === threadId) ?? agent.threads[0];
  const [answer, setAnswer] = useState(agent.question?.options[0].value ?? '');
  const target =
    thread.kind === 'main' ? `Message ${agent.name}` : `Reply in thread “${thread.name}”`;
  return (
    <section className="p-pane" aria-label={agent.name}>
      <header className="p-pane-head">
        <h1>{agent.name}</h1>
        <StateTag state={agent.state} />
        <span className="p-proj">{agent.project}</span>
      </header>
      {agent.threads.length > 1 && (
        <div className="p-threads" role="tablist" aria-label="Threads">
          {agent.threads.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === thread.id}
              className={`p-tab ${t.id === thread.id ? 'p-tab-on' : ''}`}
              onClick={() => onThread(t.id)}
            >
              {t.kind === 'subagent' ? (
                <Bot size={12} aria-hidden />
              ) : (
                <MessageSquare size={12} aria-hidden />
              )}
              {t.name}
              {t.state && t.kind !== 'main' && <StateTag state={t.state} compact />}
              {t.note && (
                <span className={`p-tab-note ${t.state === 'unanswered' ? 'p-tab-note-hot' : ''}`}>
                  {t.note}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="p-scroll">
        <Messages thread={thread} />
        {agent.state === 'failed' && thread.kind === 'main' && (
          <div className="p-failed">
            <AlertTriangle size={14} aria-hidden />
            <span>
              <strong>Failed:</strong> 401 Unauthorized from the staging webhook.
            </span>
            <button className="p-btn">Show log</button>
            <button className="p-btn">Retry</button>
          </div>
        )}
      </div>
      {agent.question && thread.kind === 'main' && (
        <div className="p-ask" role="region" aria-label="Question for you">
          <div className="p-ask-head">
            <MessageSquare size={14} aria-hidden />
            <strong>{agent.question.text}</strong>
            <span className="p-muted">from the {agent.question.source}</span>
          </div>
          <div className="p-ask-row">
            <Choice
              label="Answer"
              value={answer}
              onChange={setAnswer}
              options={agent.question.options}
            />
            <button className="p-btn">Send answer</button>
          </div>
          <p className="p-muted">{agent.question.options.find((o) => o.value === answer)?.hint}</p>
        </div>
      )}
      {agent.pills && <PillBar pills={agent.pills} open={pill} onOpen={onPill} />}
      <div className="p-composer">
        <label className="p-target" htmlFor={`c-${agent.id}`}>
          To: <strong>{thread.kind === 'main' ? 'Main' : thread.name}</strong>
        </label>
        <textarea id={`c-${agent.id}`} placeholder={`${target} · Cmd/Ctrl+Enter sends`} rows={2} />
        <button className="p-send" aria-label="Send">
          <Send size={14} />
        </button>
      </div>
    </section>
  );
}

export function Prototype() {
  const [agentId, setAgentId] = useState(params.get('agent') ?? 'pricing');
  const [threadId, setThreadId] = useState(params.get('thread') ?? 'main');
  const [pill, setPill] = useState<string | null>(params.get('pill'));
  const pane = params.get('pane');
  const agent = AGENTS.find((a) => a.id === agentId) ?? AGENTS[0];
  const open = (id: string) => {
    setAgentId(id);
    setThreadId('main');
    setPill(null);
  };
  useEffect(() => {
    const needs = AGENTS.filter((a) => a.state === 'asks' || a.state === 'failed');
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'n' || (e.target as HTMLElement).closest('textarea,input')) return;
      const i = needs.findIndex((a) => a.id === agentId);
      open(needs[(i + 1) % needs.length].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [agentId]);
  const second = AGENTS.find((a) => a.id === 'docs')!;
  return (
    <div className={`p-root ${pane === 'max' ? 'p-max' : ''}`}>
      {pane !== 'max' && <Rail current={agent.id} onOpen={open} />}
      <div className="p-panes">
        <Pane
          agent={agent}
          threadId={threadId}
          onThread={setThreadId}
          pill={pill}
          onPill={setPill}
        />
        {pane === 'split' && agent.id !== second.id && (
          <Pane
            agent={second}
            threadId="main"
            onThread={() => undefined}
            pill={null}
            onPill={() => undefined}
          />
        )}
      </div>
    </div>
  );
}
