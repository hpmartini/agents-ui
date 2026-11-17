import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AgentsPanel, createMockTransport, workspace as ws, type Agent, type Locale } from '../src';
import '../src/styles.css';
import './demo.css';

const now = Date.now();
const agents: Agent[] = [
  { id: 'inbox', name: 'Inbox triage', cwd: '~/MAGOS', displayState: 'working', detail: 'Sorting 14 new mails', startedAt: now },
  { id: 'offer', name: 'Angebot Kanzlei Weber', cwd: '~/MAGOS/leads/weber', displayState: 'needs-input', detail: 'Which price tier?', startedAt: now },
  { id: 'invoices', name: 'Rechnungen Oktober', cwd: '~/MAGOS/finanzen', displayState: 'idle', detail: 'Waiting for input', startedAt: now },
  { id: 'wiki', name: 'Wiki cleanup', cwd: '~/MAGOS/wiki', displayState: 'completed', detail: 'Merged 6 pages', startedAt: now },
];

// Demo start state: two tabs, the first split into two panes
const KEY = 'agents-ui-demo:workspace';
if (!localStorage.getItem(KEY)) {
  let w = ws.openSession(ws.EMPTY_WORKSPACE, 'inbox');
  w = ws.openSession(w, 'offer');
  w = ws.splitInto(w, 'offer', 'inbox', 'right');
  w = ws.openSession(w, 'invoices');
  w = ws.activateTab(w, w.tabs[0].id);
  localStorage.setItem(KEY, JSON.stringify(w));
}

const transport = createMockTransport(agents, 300);
// Demo of the error path: the mock refuses folders outside ~/MAGOS
const mockStart = transport.start.bind(transport);
transport.start = (req) =>
  req.cwd.startsWith('~/MAGOS') ? mockStart(req) : Promise.reject(new Error(`Folder outside ~/MAGOS: ${req.cwd}`));

// ?lang=de and ?fail=503 open the demo straight in German or in the error state (screenshots)
const params = new URLSearchParams(location.search);
const initialFail = Number(params.get('fail')) || null;
if (initialFail) transport.fail({ status: initialFail, message: `HTTP ${initialFail} from /api/agents/stream` });

function Demo() {
  const [locale, setLocale] = useState<Locale>(params.get('lang') === 'de' ? 'de' : 'en');
  const [failing, setFailing] = useState(!!initialFail);
  const [light, setLight] = useState(false);
  // on <html>, where the panel's terminals notice a theme switch by themselves
  useEffect(() => void document.documentElement.classList.toggle('demo-light', light), [light]);
  return (
    <div className="demo">
      <header className="demo-bar">
        <strong>agents-ui</strong>
        <span>mock transport</span>
        <button onClick={() => setLight((l) => !l)}>{light ? 'Dark theme' : 'Light theme (CSS variables)'}</button>
        <button onClick={() => setLocale((l) => (l === 'en' ? 'de' : 'en'))}>
          {locale === 'en' ? 'Deutsch' : 'English'}
        </button>
        <button
          onClick={() => {
            transport.fail(failing ? null : { status: 503, message: 'HTTP 503 from /api/agents/stream' });
            setFailing(!failing);
          }}
        >
          {failing ? 'Recover backend' : 'Simulate 503'}
        </button>
        <button onClick={() => (localStorage.removeItem(KEY), location.reload())}>Reset layout</button>
      </header>
      <main className="demo-main">
        <AgentsPanel
          transport={transport}
          defaultCwd="~/MAGOS"
          storageKey={KEY}
          locale={locale}
          // the host protects its own orchestrator session
          canStop={(agent) => agent.id !== 'inbox'}
        />
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Demo />
  </React.StrictMode>
);
