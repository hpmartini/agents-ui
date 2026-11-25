import React, { useState } from 'react';
import { X, Settings2, AlertTriangle, Power, RefreshCw } from 'lucide-react';
import { useHost, useTransport } from '../../host';
import { useLabels } from '../../labels';
import { Choice } from '../Choice';
import { GROUP_MODES } from './ProjectsRail';
import type {
  AgentHarness,
  AgentViewSettings,
  AgentDispatchDefaults,
  ClaudeUserSettings,
  AgentDaemonStatus,
  AgentRepo,
  AgentCapabilities,
  AgentCardSlot,
} from '../../types';
import { DEFAULT_AGENT_CARD_FIELDS } from '../../types';
import { CARD_ELEMENTS, CARD_SLOTS, HARNESSES } from '../../utils/agentSessions';

interface AgentSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: AgentViewSettings;
  onUpdate: (partial: Partial<AgentViewSettings>) => Promise<void>;
  userSettings: ClaudeUserSettings | null;
  daemon: AgentDaemonStatus | null;
  repos: AgentRepo[];
  capabilities: AgentCapabilities | null;
  onRefresh: () => void;
}

const PERMISSION_MODES = [
  '',
  'default',
  'manual',
  'plan',
  'acceptEdits',
  'dontAsk',
  'auto',
  'bypassPermissions',
];
const EFFORTS = ['', 'standard', 'high', 'ultracode'];
const MODELS = ['', 'default', 'opus', 'sonnet', 'haiku'];

function listToText(list: string[]): string {
  return list.join('\n');
}
function textToList(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Dispatch defaults (the flags `claude agents` accepts) and view preferences.
 */
export const AgentSettingsPanel: React.FC<AgentSettingsPanelProps> = ({
  open,
  onClose,
  settings,
  onUpdate,
  userSettings,
  daemon,
  repos,
  capabilities,
  onRefresh,
}) => {
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useHost();
  const daemonApi = useTransport().daemon;
  const labels = useLabels();
  const t = labels.panels;
  if (!open) return null;

  const dispatch = settings.dispatch;
  const setDispatch = (partial: Partial<AgentDispatchDefaults>) =>
    onUpdate({ dispatch: { ...dispatch, ...partial } });
  const unsafeLocked = capabilities ? !capabilities.unsafeFlagsAllowed : false;

  const runDaemon = async (label: string, fn: () => Promise<{ output: string }>) => {
    setBusy(label);
    try {
      const result = await fn();
      toast.success(result.output ? result.output.split('\n')[0] : t.settingsDaemonDone(label));
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.settingsDaemonFailed(label));
    } finally {
      setBusy(null);
    }
  };

  const field =
    'w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-blue-500';
  const label = 'block text-xs text-gray-400 mb-1';
  // Form size; a menu trigger fills its column like the inputs next to it
  const md = { size: 'md', className: 'w-full' } as const;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <Settings2 size={16} className="text-blue-300" />
          <h3 className="text-sm font-semibold text-gray-100">{t.settingsTitle}</h3>
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded text-gray-500 hover:text-white hover:bg-gray-800"
            aria-label={t.close}
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* View */}
          <section className="space-y-3">
            <h4 className="text-xs text-gray-500">{t.settingsView}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className={label}>{t.settingsScope}</span>
                <Choice
                  {...md}
                  label={t.settingsScope}
                  value={settings.scopeCwd || ''}
                  onChange={(v) => onUpdate({ scopeCwd: v || null })}
                  options={[
                    { value: '', label: t.settingsAllSessions },
                    ...repos.map((repo) => ({
                      value: repo.path,
                      label: `${repo.name} — ${repo.path}`,
                    })),
                  ]}
                />
              </div>
              <div>
                <label className={label} htmlFor="agent-task-cwd">
                  {t.settingsTaskCwd}
                </label>
                <input
                  id="agent-task-cwd"
                  className={field}
                  placeholder={t.settingsTaskCwdPlaceholder}
                  defaultValue={settings.taskCwd || ''}
                  onBlur={(e) => onUpdate({ taskCwd: e.target.value.trim() || null })}
                />
              </div>
              <div>
                <span className={label}>{t.settingsGroupBy}</span>
                <Choice<AgentViewSettings['grouping']>
                  {...md}
                  label={t.settingsGroupBy}
                  value={settings.grouping}
                  onChange={(grouping) => onUpdate({ grouping })}
                  options={GROUP_MODES.map((mode) => ({
                    value: mode,
                    label: labels.shell.groupModes[mode],
                  }))}
                />
              </div>
              <div>
                <span className={label}>{t.settingsCardDensity}</span>
                <Choice<AgentViewSettings['cardDensity']>
                  {...md}
                  id="agent-card-density"
                  label={t.settingsCardDensity}
                  value={settings.cardDensity}
                  onChange={(cardDensity) => onUpdate({ cardDensity })}
                  options={[
                    { value: 'comfortable', label: t.settingsDensityComfortable },
                    { value: 'compact', label: t.settingsDensityCompact },
                  ]}
                />
              </div>
              <div>
                <span className={label}>{t.settingsChatSubmit}</span>
                <Choice<AgentViewSettings['chatSubmitKey']>
                  {...md}
                  id="agent-chat-submit-key"
                  label={t.settingsChatSubmit}
                  value={settings.chatSubmitKey}
                  onChange={(chatSubmitKey) => onUpdate({ chatSubmitKey })}
                  options={[
                    { value: 'mod+enter', label: t.settingsSubmitModEnter },
                    { value: 'enter', label: t.settingsSubmitEnter },
                  ]}
                />
              </div>
              <div>
                <span className={label}>{t.settingsOpenAgentsIn}</span>
                <Choice<AgentViewSettings['agentOpenView']>
                  {...md}
                  id="agent-open-view"
                  label={t.settingsOpenAgentsIn}
                  value={settings.agentOpenView}
                  onChange={(agentOpenView) => onUpdate({ agentOpenView })}
                  options={[
                    { value: 'chat', label: t.settingsOpenChat },
                    { value: 'terminal', label: t.settingsOpenTerminal },
                  ]}
                />
              </div>
            </div>
            <fieldset className="space-y-2">
              <legend className={`${label} flex items-center gap-2 w-full`}>
                {t.settingsCardFields}
                <button
                  type="button"
                  onClick={() => onUpdate({ cardFields: DEFAULT_AGENT_CARD_FIELDS })}
                  className="ml-auto text-[11px] text-blue-300 hover:text-white"
                >
                  {t.settingsReset}
                </button>
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1.5">
                {CARD_ELEMENTS.map((element) => (
                  <div key={element.key} className="flex items-center gap-2">
                    <span className="flex-1 min-w-0 truncate text-xs text-gray-300">
                      {labels.shell.cardElements[element.key]}
                    </span>
                    <div className="w-44 shrink-0">
                      <Choice<AgentCardSlot>
                        {...md}
                        id={`agent-card-field-${element.key}`}
                        label={labels.shell.cardElements[element.key]}
                        value={settings.cardFields[element.key]}
                        onChange={(slot) =>
                          onUpdate({ cardFields: { ...settings.cardFields, [element.key]: slot } })
                        }
                        options={CARD_SLOTS.map((slot) => ({
                          value: slot.key,
                          label: labels.shell.cardSlots[slot.key],
                        }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap gap-4 text-sm text-gray-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => onUpdate({ notifications: e.target.checked })}
                />
                {t.settingsInAppNotifications}
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.desktopNotifications}
                  onChange={async (e) => {
                    if (
                      e.target.checked &&
                      typeof Notification !== 'undefined' &&
                      Notification.permission !== 'granted'
                    ) {
                      const permission = await Notification.requestPermission();
                      if (permission !== 'granted') {
                        toast.error(t.settingsNotificationsDenied);
                        return;
                      }
                    }
                    onUpdate({ desktopNotifications: e.target.checked });
                  }}
                />
                {t.settingsBrowserNotifications}
              </label>
            </div>
          </section>

          {/* Default harness (#195) */}
          <section className="space-y-2">
            <h4 className="text-xs text-gray-500">{t.settingsHarness}</h4>
            <div className="max-w-xs">
              <span className={label}>{t.settingsDefaultHarness}</span>
              <Choice<AgentHarness>
                {...md}
                id="agent-default-harness"
                label={t.settingsDefaultHarness}
                value={dispatch.harness}
                onChange={(harness) => setDispatch({ harness })}
                options={HARNESSES.map((h) => ({ value: h.id, label: h.label }))}
              />
            </div>
            <p className="text-xs text-gray-500">{t.settingsHarnessHint}</p>
          </section>

          {/* Dispatch defaults */}
          <section className="space-y-3">
            <h4 className="text-xs text-gray-500">{t.settingsDispatchDefaults}</h4>
            {unsafeLocked && (
              <div className="flex items-start gap-2 text-xs text-gray-300 bg-gray-800 border border-gray-700 rounded p-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-yellow-400" />
                <span>{t.settingsUnsafeLocked}</span>
              </div>
            )}
            {userSettings && (
              <div className="text-xs text-gray-500">
                {t.settingsFromUserSettings}{' '}
                <span className="text-gray-300">{userSettings.model || t.settingsDefault}</span>
                {t.settingsEffortSep}{' '}
                <span className="text-gray-300">
                  {userSettings.effortLevel || t.settingsDefault}
                </span>
                {t.settingsPermissionSep}{' '}
                <span className="text-gray-300">
                  {userSettings.permissionMode || t.settingsDefault}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={label}>--model</label>
                <input
                  list="agent-model-options"
                  className={field}
                  value={dispatch.model || ''}
                  placeholder={t.settingsDefault}
                  onChange={(e) => setDispatch({ model: e.target.value || null })}
                />
                <datalist id="agent-model-options">
                  {MODELS.filter(Boolean).map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
              <div>
                <span className={label}>--effort</span>
                <Choice
                  {...md}
                  label="--effort"
                  value={dispatch.effort || ''}
                  onChange={(v) => setDispatch({ effort: v || null })}
                  options={EFFORTS.map((e) => ({ value: e, label: e || t.settingsDefault }))}
                />
              </div>
              <div>
                <span className={label}>--permission-mode</span>
                <Choice
                  {...md}
                  label="--permission-mode"
                  value={dispatch.permissionMode || ''}
                  onChange={(v) => setDispatch({ permissionMode: v || null })}
                  options={PERMISSION_MODES.map((m) => ({
                    value: m,
                    label: m || t.settingsDirectoryRules,
                  }))}
                />
              </div>
              <div>
                <label className={label}>--agent ({t.settingsDefaultSubagent})</label>
                <input
                  className={field}
                  value={dispatch.agent || ''}
                  placeholder={t.settingsNone}
                  onChange={(e) => setDispatch({ agent: e.target.value || null })}
                />
              </div>
              <div>
                <label className={label}>--fallback-model</label>
                <input
                  className={field}
                  value={dispatch.fallbackModel || ''}
                  placeholder={t.settingsNone}
                  onChange={(e) => setDispatch({ fallbackModel: e.target.value || null })}
                />
              </div>
              <div>
                <label className={label}>--settings ({t.settingsFileOrJson})</label>
                <input
                  disabled={unsafeLocked}
                  className={field}
                  value={dispatch.settings || ''}
                  placeholder="./ci-settings.json"
                  onChange={(e) => setDispatch({ settings: e.target.value || null })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={label}>--add-dir ({t.settingsOnePerLine})</label>
                <textarea
                  className={`${field} font-mono text-xs`}
                  rows={3}
                  value={listToText(dispatch.addDirs)}
                  onChange={(e) => setDispatch({ addDirs: textToList(e.target.value) })}
                />
              </div>
              <div>
                <label className={label}>--plugin-dir ({t.settingsOnePerLine})</label>
                <textarea
                  disabled={unsafeLocked}
                  className={`${field} font-mono text-xs`}
                  rows={3}
                  value={listToText(dispatch.pluginDirs)}
                  onChange={(e) => setDispatch({ pluginDirs: textToList(e.target.value) })}
                />
              </div>
              <div>
                <label className={label}>--mcp-config ({t.settingsFileOrJsonPerLine})</label>
                <textarea
                  disabled={unsafeLocked}
                  className={`${field} font-mono text-xs`}
                  rows={3}
                  value={listToText(dispatch.mcpConfigs)}
                  onChange={(e) => setDispatch({ mcpConfigs: textToList(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dispatch.strictMcpConfig}
                  onChange={(e) => setDispatch({ strictMcpConfig: e.target.checked })}
                />
                --strict-mcp-config
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dispatch.restricted}
                  onChange={(e) => setDispatch({ restricted: e.target.checked })}
                />
                --restricted
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dispatch.allowSkipPermissions}
                  disabled={unsafeLocked}
                  onChange={(e) => setDispatch({ allowSkipPermissions: e.target.checked })}
                />
                --allow-dangerously-skip-permissions
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-orange-300">
                <input
                  type="checkbox"
                  checked={dispatch.skipPermissions}
                  disabled={unsafeLocked}
                  onChange={(e) => {
                    if (e.target.checked && !window.confirm(t.settingsSkipPermissionsConfirm))
                      return;
                    setDispatch({ skipPermissions: e.target.checked });
                  }}
                />
                --dangerously-skip-permissions
              </label>
            </div>
            {dispatch.skipPermissions && (
              <div className="flex items-start gap-2 text-xs text-red-300 bg-red-900/20 border border-red-800 rounded p-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                {t.settingsBypassOn}
              </div>
            )}
          </section>

          {/* Supervisor (only with a transport that controls the daemon) */}
          {daemonApi && (
            <section className="space-y-3">
              <h4 className="text-xs text-gray-500">{t.settingsSupervisor}</h4>
              <pre className="text-[11px] text-gray-400 bg-gray-950 border border-gray-800 rounded p-2 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {daemon?.raw || t.settingsStatusUnavailable}
              </pre>
              {daemon?.versionMismatch && (
                <div className="text-xs text-yellow-300">{t.settingsVersionMismatch}</div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={!!busy}
                  onClick={() => runDaemon('respawn --all', daemonApi.respawnAllAgents)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 hover:text-white text-sm text-gray-200 disabled:opacity-50"
                >
                  <RefreshCw size={12} /> claude respawn --all
                </button>
                <button
                  disabled={!!busy}
                  onClick={() =>
                    runDaemon('daemon stop --keep-workers', () =>
                      daemonApi.stopAgentDaemon({ keepWorkers: true })
                    )
                  }
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 hover:text-white text-sm text-gray-200 disabled:opacity-50"
                >
                  <Power size={12} /> claude daemon stop --keep-workers
                </button>
                <button
                  disabled={!!busy}
                  onClick={() => {
                    if (window.confirm(t.settingsStopSupervisorConfirm)) {
                      runDaemon('daemon stop --any', () =>
                        daemonApi.stopAgentDaemon({ any: true })
                      );
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-900/40 hover:bg-red-900/60 text-sm text-red-200 disabled:opacity-50"
                >
                  <Power size={12} /> claude daemon stop --any
                </button>
              </div>
            </section>
          )}

          {/* Turn off */}
          <section className="space-y-2">
            <h4 className="text-xs text-gray-500">{t.settingsTurnOff}</h4>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.disabled}
                onChange={(e) => onUpdate({ disabled: e.target.checked })}
              />
              {t.settingsHideView}
            </label>
            {userSettings?.disableAgentView && (
              <div className="text-xs text-yellow-300">{t.settingsCliViewOff}</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
