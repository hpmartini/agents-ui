// The view and what a host needs to run it. Every module is also importable on its own path
// (`@hpmartini/agents-ui/utils/agentSessions`, …), as Orkumo does for its other pages.
export { AgentsView, isNewTaskKey, } from './components/AgentsView/AgentsView';
export { MAIN_AGENT_EVENT } from './components/AgentsView/MainAgentDialog';
export { AgentsProvider, useHost, useTransport, } from './host';
export { createLocalSettings } from './settings';
export { de, en, useLabels } from './labels';
export { createMockTransport, } from './transports/mock';
export { DEFAULT_TERMINAL_FONT, refreshTerminalTheme } from './components/AgentsView/AgentTerminal';
export { configureLinks } from './utils/links';
export { ResizeHandle, clampWidth, useStoredWidth } from './ResizeHandle';
