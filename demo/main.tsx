import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AgentsProvider, type AgentsHost, type ToastOptions } from '../src/host';
import type { Locale } from '../src/labels';
import { AgentsView } from '../src/components/AgentsView/AgentsView';
import type { AgentsTransport } from '../src/transport';
import { createMockTransport } from '../src/transports/mock';
import type { AgentSession } from '../src/types';
import '../src/styles.css';
import './demo.css';
import { ChoiceShowcase, DividerShowcase, PullsShowcase } from './showcase';

const now = Date.now();
const session = (
  id: string,
  name: string,
  cwd: string,
  displayState: AgentSession['displayState'],
  detail: string
): AgentSession => ({
  id,
  sessionId: `uuid-${id}`,
  kind: 'background',
  cwd,
  startedAt: now,
  name,
  state:
    displayState === 'completed' ? 'done' : displayState === 'needs-input' ? 'blocked' : 'working',
  detail,
  pinned: false,
  order: null,
  links: [],
  displayState,
});

const transport = createMockTransport(
  [
    session('inbox', 'Inbox triage', '~/MAPLE', 'working', 'Sorting 14 new mails'),
    session(
      'offer',
      'Angebot Kanzlei Weber',
      '~/MAPLE/leads/weber',
      'needs-input',
      'Which price tier?'
    ),
    session('invoices', 'Rechnungen Oktober', '~/MAPLE/finanzen', 'idle', 'Waiting for input'),
    session('wiki', 'Wiki cleanup', '~/MAPLE/wiki', 'completed', 'Merged 6 pages'),
  ],
  {
    latencyMs: 300,
    // Handoff + Reset: inbox, offer and invoices are above the default 150k threshold, wiki is below.
    // ?handoff=error ends the job in an error while resetting, ?handoffStep=<ms> sets the phase length
    contextTokens: { inbox: 182_000, offer: 96_000, invoices: 171_000, wiki: 40_000 },
    handoffStepMs: Number(new URLSearchParams(location.search).get('handoffStep')) || 2500,
    handoffError:
      new URLSearchParams(location.search).get('handoff') === 'error'
        ? 'The new session did not take the handoff (marker still pending: ~/.claude/handoffs/.pending/-Users-hape-MAPLE)'
        : undefined,
  }
);

// The UI view of a pane: one answer in the log, no live stream (the mock has no transcripts)
const chat: NonNullable<AgentsTransport['chat']> = {
  openTranscriptView: async (paneId, body) => ({
    id: `chat-${paneId}`,
    harness: body.harness,
    cwd: body.cwd,
    name: body.name ?? paneId,
    sessionId: body.sessionId,
    model: 'claude-opus-5-5',
    running: true,
    startedAt: now,
  }),
  subscribeToChat: (_id, handlers) => {
    const timer = setTimeout(() => {
      handlers.onOpen();
      handlers.onEvent({
        type: 'assistant',
        message: {
          id: 'msg_demo',
          content: [{ type: 'text', text: 'Sorted 14 mails: 9 archived, 5 need an answer.' }],
        },
      });
      handlers.onEvent({ type: 'result', subtype: 'success', duration_ms: 1 });
    }, 0);
    return () => clearTimeout(timer);
  },
  fetchChatHistory: async () => ({ events: [], before: 0, more: false }),
};
// ?threads=1: the UI views are orchestrator chats with one thread (threads panel, menu over its drawer)
const threads: NonNullable<AgentsTransport['threads']> = {
  fetchThreads: async () => ({
    orchestrator: 'demo',
    threads: [
      {
        id: 't1',
        name: { project: 'Shop', task: 'Checkout' },
        tag: '[Thread: Shop · Checkout]',
        createdAt: now,
        readAt: now,
        agents: [],
        closed: false,
        binding: null,
      },
    ],
    tasks: [],
  }),
  createThread: async () => {
    throw new Error('demo: no threads');
  },
  updateThread: async () => {
    throw new Error('demo: no threads');
  },
};
const demoTransport: AgentsTransport = {
  ...transport,
  chat,
  ...(new URLSearchParams(location.search).get('threads') ? { threads } : {}),
};

// ?fail=503 opens the demo straight in the error state (screenshots)
const initialFail = Number(new URLSearchParams(location.search).get('fail')) || null;
// ?view=choice|pulls|divider shows one component alone, ?theme=light the light variables, ?state= the PR tree states
const demoParams = new URLSearchParams(location.search);
const view = demoParams.get('view');
if (demoParams.get('theme') === 'light') document.documentElement.classList.add('demo-light');
if (initialFail)
  transport.fail({ status: initialFail, message: `HTTP ${initialFail} from /api/agents/stream` });

interface Toast {
  id: string;
  kind: 'info' | 'success' | 'error';
  message: string;
}

function Demo() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [failing, setFailing] = useState(!!initialFail);
  // ?locale=de opens the demo in German
  const [locale, setLocale] = useState<Locale>(
    new URLSearchParams(location.search).get('locale') === 'de' ? 'de' : 'en'
  );
  const host = useMemo<AgentsHost>(() => {
    let counter = 0;
    const dismiss = (id?: string) =>
      setToasts((list) => (id ? list.filter((t) => t.id !== id) : []));
    const show = (kind: Toast['kind']) => (message: string, options?: ToastOptions) => {
      const id = options?.id ?? `t${++counter}`;
      setToasts((list) => [...list.filter((t) => t.id !== id), { id, kind, message }]);
      setTimeout(() => dismiss(id), options?.duration ?? 4000);
    };
    return {
      toast: { info: show('info'), success: show('success'), error: show('error'), dismiss },
    };
  }, []);

  return (
    <div className="demo">
      <header className="demo-bar">
        <strong>agents-ui</strong>
        <span>mock transport</span>
        <button
          onClick={() => {
            transport.fail(
              failing ? null : { status: 503, message: 'HTTP 503 from /api/agents/stream' }
            );
            setFailing(!failing);
          }}
        >
          {failing ? 'Recover backend' : 'Simulate 503'}
        </button>
        <label>
          locale{' '}
          <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
            <option value="en">en</option>
            <option value="de">de</option>
          </select>
        </label>
      </header>
      <main className="demo-main agents-ui">
        <AgentsProvider transport={demoTransport} host={host} locale={locale}>
          {view === 'choice' ? (
            <ChoiceShowcase />
          ) : view === 'pulls' ? (
            <PullsShowcase state={demoParams.get('state')} />
          ) : view === 'divider' ? (
            <DividerShowcase />
          ) : (
            <AgentsView active />
          )}
        </AgentsProvider>
      </main>
      <ul className="demo-toasts" aria-live="polite">
        {toasts.map((t) => (
          <li
            key={t.id}
            className={`demo-toast demo-toast-${t.kind}`}
            onClick={() => host.toast.dismiss(t.id)}
          >
            {t.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Demo />
  </React.StrictMode>
);
