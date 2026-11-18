import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AgentSession,
  AgentDaemonStatus,
  ClaudeUserSettings,
  AgentViewSettings,
  AgentNotification,
  AgentCapabilities,
} from '../types';
import { DEFAULT_AGENT_VIEW_SETTINGS } from '../types';

/** Nested preferences merge one level deep, so older settings files gain new keys */
const withDefaults = (loaded: Partial<AgentViewSettings>): AgentViewSettings => ({
  ...DEFAULT_AGENT_VIEW_SETTINGS,
  ...loaded,
  dispatch: { ...DEFAULT_AGENT_VIEW_SETTINGS.dispatch, ...loaded.dispatch },
  cardFields: { ...DEFAULT_AGENT_VIEW_SETTINGS.cardFields, ...loaded.cardFields },
});
import { useHost, useTransport } from '../host';
import { useLabels } from '../labels';
import { LOCAL_TARGETS, type TransportError } from '../transport';
import { summarizeSessions } from '../utils/agentSessions';
import { pollWhileVisible } from '../utils/visiblePoll';

const DAEMON_REFRESH_MS = 60_000;

interface UseAgentSessionsOptions {
  /** When false, no SSE subscription is opened (view not visible) */
  active?: boolean;
}

/**
 * Loads the agent view settings, keeps the session list live via SSE and
 * surfaces notifications (needs input / completed / failed).
 */
export function useAgentSessions({ active = true }: UseAgentSessionsOptions = {}) {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [daemon, setDaemon] = useState<AgentDaemonStatus | null>(null);
  const [userSettings, setUserSettings] = useState<ClaudeUserSettings | null>(null);
  const [cliInstalled, setCliInstalled] = useState<boolean | null>(null);
  const [capabilities, setCapabilities] = useState<AgentCapabilities | null>(null);
  const [settings, setSettings] = useState<AgentViewSettings>(DEFAULT_AGENT_VIEW_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // HTTP status of `error`, where there is one (no access, service down)
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  // A list of the current target arrived (fetch or stream): an error before that replaces the list
  const [received, setReceived] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastCompleted, setLastCompleted] = useState<{ count: number; at: number } | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const { agents, settings: settingsApi, targets = LOCAL_TARGETS } = useTransport();
  const { toast } = useHost();
  // Refs: a host object or labels rebuilt on every render must not resubscribe the stream
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const shellLabels = useLabels().shell;
  const labelsRef = useRef(shellLabels);
  labelsRef.current = shellLabels;
  // #220: the list belongs to the instance picked in the agents rail (transport `targets`)
  const target = targets.useAgentTarget();
  // Target the current `sessions` came from; null while a switch waits for the new list
  const [listTarget, setListTarget] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const asked = targets.getAgentTarget();
    try {
      const data = await agents.fetchAgents({ cwd: settingsRef.current.scopeCwd });
      // An answer from the instance picked before a switch is not this list
      if (asked !== targets.getAgentTarget()) return;
      setSessions(data.sessions);
      setListTarget(asked);
      setReceived(true);
      setDaemon(data.daemon);
      setUserSettings(data.userSettings);
      setCliInstalled(data.cli.installed);
      setCapabilities(data.capabilities ?? null);
      setError(null);
      setErrorStatus(null);
    } catch (err) {
      if (asked !== targets.getAgentTarget()) return;
      setError(err instanceof Error ? err.message : labelsRef.current.loadAgentsFailed);
      setErrorStatus((err as TransportError | null)?.status ?? null);
    }
    setLoading(false);
  }, [agents, targets]);

  // A switch empties the list until the picked instance answers: no rows of the previous one
  useEffect(() => {
    setSessions([]);
    setListTarget(null);
    setError(null);
    setErrorStatus(null);
    setReceived(false);
    setLoading(true);
  }, [target]);

  // Load settings once
  useEffect(() => {
    let mounted = true;
    settingsApi
      .fetchAgentViewSettings()
      .then((loaded) => {
        if (mounted) setSettings(withDefaults(loaded));
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      mounted = false;
    };
  }, [settingsApi]);

  const updateSettings = useCallback(
    async (partial: Partial<AgentViewSettings>) => {
      const previous = settingsRef.current;
      const optimistic: AgentViewSettings = {
        ...previous,
        ...partial,
        dispatch: { ...previous.dispatch, ...(partial.dispatch || {}) },
        cardFields: { ...previous.cardFields, ...(partial.cardFields || {}) },
      };
      setSettings(optimistic);
      try {
        const saved = await settingsApi.updateAgentViewSettings(partial);
        setSettings(withDefaults(saved));
      } catch (err) {
        setSettings(previous);
        toastRef.current.error(
          err instanceof Error ? err.message : labelsRef.current.saveSettingsFailed
        );
      }
    },
    [settingsApi]
  );

  // Initial fetch and refetch when scope changes
  useEffect(() => {
    if (!active) return;
    refresh();
  }, [active, refresh, settings.scopeCwd, target]);

  // Daemon status rides along a slow refresh (SSE only carries sessions); none while hidden
  useEffect(() => {
    if (!active) return;
    return pollWhileVisible(refresh, DAEMON_REFRESH_MS, { immediate: false });
  }, [active, refresh]);

  // SSE subscription
  useEffect(() => {
    if (!active) return;
    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const notify = (notification: AgentNotification) => {
      const current = settingsRef.current;
      if (!current.notifications) return;
      const name = notification.session.name;
      const t = labelsRef.current;
      const messages: Record<AgentNotification['type'], { text: string; icon: string }> = {
        agent_needs_input: { text: t.notifyNeedsInput(name), icon: '✻' },
        agent_completed: { text: t.notifyFinished(name), icon: '✓' },
        agent_failed: { text: t.notifyFailed(name), icon: '✗' },
      };
      const message = messages[notification.type];
      const toast = toastRef.current;
      if (notification.type === 'agent_failed') toast.error(message.text);
      else toast.info(message.text, { icon: message.icon, duration: reducedMotion ? 2500 : 4000 });
      if (notification.type === 'agent_completed') {
        setLastCompleted((prev) => ({
          count: (prev && Date.now() - prev.at < 5000 ? prev.count : 0) + 1,
          at: Date.now(),
        }));
      }
      if (
        current.desktopNotifications &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted' &&
        document.visibilityState !== 'visible'
      ) {
        try {
          new Notification(t.notificationTitle, {
            body: message.text,
            tag: `agent-${notification.session.id}`,
          });
        } catch {
          // Notification API unavailable
        }
      }
    };

    const unsubscribe = agents.subscribeToAgents({
      onSessions: (next) => {
        if (targets.getAgentTarget() !== target) return;
        const scope = settingsRef.current.scopeCwd;
        setSessions(
          scope ? next.filter((s) => s.cwd === scope || s.cwd.startsWith(`${scope}/`)) : next
        );
        setReceived(true);
        setLoading(false);
      },
      onNotify: notify,
      onError: (message, status) => {
        setError(message);
        setErrorStatus(status ?? null);
      },
      onConnectionChange: setConnected,
    });
    return unsubscribe;
  }, [active, target, agents, targets]);

  const counts = summarizeSessions(sessions);

  return {
    sessions,
    listTarget,
    daemon,
    userSettings,
    cliInstalled,
    capabilities,
    settings,
    updateSettings,
    loading,
    error,
    errorStatus,
    received,
    connected,
    counts,
    lastCompleted,
    refresh,
  };
}
