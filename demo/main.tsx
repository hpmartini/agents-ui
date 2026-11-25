import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AgentsProvider, type AgentsHost, type ToastOptions } from '../src/host';
import type { Locale } from '../src/labels';
import { AgentsView } from '../src/components/AgentsView/AgentsView';
import { createMockTransport } from '../src/transports/mock';
import type { AgentSession } from '../src/types';
import '../src/styles.css';
import './demo.css';
import { ChoiceShowcase, PullsShowcase } from './showcase';

const now = Date.now();
const session = (
  id: string,
  name: string,
  cwd: string,
  displayState: AgentSession['displayState'],
  detail: string
): AgentSession => ({
  id,
  sessionId: null,
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
  { latencyMs: 300 }
);

// ?fail=503 opens the demo straight in the error state (screenshots)
const initialFail = Number(new URLSearchParams(location.search).get('fail')) || null;
// ?view=choice|pulls shows one component alone, ?theme=light the light variables, ?state= the PR tree states
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
        <AgentsProvider transport={transport} host={host} locale={locale}>
          {view === 'choice' ? (
            <ChoiceShowcase />
          ) : view === 'pulls' ? (
            <PullsShowcase state={demoParams.get('state')} />
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
