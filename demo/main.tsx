import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AgentsPanel, createMockTransport, workspace as ws, type Agent } from '../src';
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

function Demo() {
  const [light, setLight] = useState(false);
  return (
    <div className={`demo ${light ? 'demo-light' : ''}`}>
      <header className="demo-bar">
        <strong>agents-ui</strong>
        <span>mock transport</span>
        <button onClick={() => setLight((l) => !l)}>{light ? 'Dark theme' : 'Light theme (CSS variables)'}</button>
        <button onClick={() => (localStorage.removeItem(KEY), location.reload())}>Reset layout</button>
      </header>
      <main className="demo-main">
        <AgentsPanel transport={transport} defaultCwd="~/MAGOS" storageKey={KEY} />
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Demo />
  </React.StrictMode>
);
