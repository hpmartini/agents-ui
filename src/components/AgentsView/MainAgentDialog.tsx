import React from 'react';
import { createPortal } from 'react-dom';
import type { AgentSession, AgentViewSettings } from '../../types';
import { PeekPanel } from './PeekPanel';
import { useLabels } from '../../labels';

type MainAgentConfig = AgentViewSettings['mainAgent'];

/** Window event that opens the main agent dialog from anywhere in the host (Orkumo's title bar) */
export const MAIN_AGENT_EVENT = 'orkumo:main-agent';

/**
 * Main agent (#252): the session named in the settings (the martini-workflow main orchestrator
 * by default), reachable from every view. Shows its recent output with a reply field (the peek
 * panel) and the keep-alive switch; the server restarts a stopped main agent while it is on.
 */
export const MainAgentDialog: React.FC<{
  session: AgentSession | undefined;
  config: MainAgentConfig;
  onConfig: (config: MainAgentConfig) => void;
  onClose: () => void;
  onAttach: (session: AgentSession) => void;
  onReply: (session: AgentSession, text: string) => Promise<void>;
}> = ({ session, config, onConfig, onClose, onAttach, onReply }) => {
  const t = useLabels().shell;
  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-gray-950/70 flex items-start justify-center px-4 pt-[8vh]"
      onMouseDown={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !e.defaultPrevented) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.mainAgent}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-[760px] h-[70vh] flex flex-col bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-700 text-xs text-gray-300 shrink-0">
          <span className="font-semibold text-gray-50">{t.mainAgent}</span>
          <span className="font-mono text-gray-400">{config.name}</span>
          <label
            className="ml-auto flex items-center gap-1.5 cursor-pointer"
            title={t.keepAliveTitle}
          >
            <input
              type="checkbox"
              checked={config.keepAlive}
              onChange={(e) => onConfig({ ...config, keepAlive: e.target.checked })}
            />
            {t.keepAlive}
          </label>
        </div>
        <div className="flex-1 min-h-0">
          {session ? (
            <PeekPanel
              session={session}
              onClose={onClose}
              onAttach={() => onAttach(session)}
              onReply={(text) => onReply(session, text)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-gray-300">
              <p>
                {t.noMainSession[0]}
                <span className="font-mono">{config.name}</span>
                {t.noMainSession[1]}
              </p>
              <p className="text-xs text-gray-400">
                {t.startMainSession[0]}
                <span className="font-mono">claude --bg --name {config.name}</span>
                {t.startMainSession[1]}
              </p>
              <button
                autoFocus
                onClick={onClose}
                className="mt-2 px-3 py-1.5 rounded text-xs text-gray-200 bg-gray-700 hover:bg-gray-600"
              >
                {t.close}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
