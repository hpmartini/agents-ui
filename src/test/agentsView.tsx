/**
 * The whole agents view as Orkumo renders it: every transport group (requests that never settle,
 * as a server that does not answer, unless a test overrides them) and every host field.
 */
import { vi } from 'vitest';
import type { AgentsHost } from '../host';
import type { AgentsTransport } from '../transport';
import { testHost, testTransport } from './agents';

const pending = () => new Promise<never>(() => {});

export function orkumoTransport(overrides: Partial<AgentsTransport> = {}): AgentsTransport {
  const base = testTransport();
  return {
    ...base,
    pty: {
      ...base.pty,
      shell: vi.fn(() => {
        throw new Error('no PTY in tests');
      }),
    },
    manage: {
      renameAgent: vi.fn(pending),
      pinAgent: vi.fn(pending),
      reorderAgents: vi.fn(pending),
      removeAgent: vi.fn(pending),
      respawnAgent: vi.fn(pending),
      fetchAgentsRawJson: vi.fn(pending),
    },
    daemon: { respawnAllAgents: vi.fn(pending), stopAgentDaemon: vi.fn(pending) },
    messaging: {
      replyToAgent: vi.fn(pending),
      sendToPane: vi.fn(pending),
      stopPane: vi.fn(pending),
    },
    contexts: { fetchAgentContexts: vi.fn(pending) },
    discovery: {
      fetchAgentRepos: vi.fn(pending),
      fetchSubagents: vi.fn(pending),
      fetchAgentCommands: vi.fn(pending),
      fetchHarnesses: vi.fn(pending),
      fetchHarnessModels: vi.fn(pending),
    },
    history: { fetchPastSessions: vi.fn(pending) },
    cloud: { openCloudSession: vi.fn(pending) },
    logs: { fetchAgentLogs: vi.fn(pending) },
    uploads: {
      uploadAttachment: vi.fn(pending),
      agentImageUrl: () => null,
      attachmentExtensions: ['pdf', 'txt', 'md'],
    },
    chat: {
      openTranscriptView: vi.fn(pending),
      subscribeToChat: vi.fn(() => () => {}),
      fetchChatHistory: vi.fn(pending),
      fetchChatStatus: vi.fn(pending),
      fetchChatFiles: vi.fn(pending),
      fetchChatDirs: vi.fn(pending),
      fetchChatShell: vi.fn(pending),
      chatImageUrl: () => '',
    },
    artifacts: { fetchChatArtifacts: vi.fn(pending), fetchChatArtifactContent: vi.fn(pending) },
    servers: {
      fetchOrphanServers: vi.fn(pending),
      stopOrphanServer: vi.fn(pending),
      fetchServerStats: vi.fn(pending),
    },
    orchestrator: {
      fetchOrchestratorRoles: vi.fn(pending),
      fetchOrchestratorWorkspace: vi.fn(pending),
      startOrchestrator: vi.fn(pending),
    },
    files: { openFile: vi.fn(pending) },
    ghostty: { openInGhostty: vi.fn(pending) },
    ...overrides,
  };
}

export function orkumoHost(overrides: Partial<AgentsHost> = {}): AgentsHost {
  return testHost({
    openCode: vi.fn(),
    openBoard: vi.fn(),
    openMode: vi.fn(),
    openPulls: vi.fn(),
    openProjectSettings: vi.fn(),
    fetchRepoPath: vi.fn(pending),
    useRegisterCommands: () => {},
    usePaletteOpen: () => false,
    renderActivityBar: () => null,
    renderIssueModal: () => null,
    renderIssueCreate: () => null,
    renderBrowser: () => null,
    ...overrides,
  });
}

/** Orkumo's app navigation for the rail */
export const nav = {
  onOpenDashboard: () => {},
  onOpenContextDashboard: () => {},
  onOpenSettings: () => {},
  onOpenProject: () => {},
};
