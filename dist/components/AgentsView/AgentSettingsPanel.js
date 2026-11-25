import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { X, Settings2, AlertTriangle, Power, RefreshCw } from 'lucide-react';
import { useHost, useTransport } from '../../host';
import { useLabels } from '../../labels';
import { Choice } from '../Choice';
import { DEFAULT_AGENT_CARD_FIELDS } from '../../types';
import { CARD_ELEMENTS, CARD_SLOTS, HARNESSES } from '../../utils/agentSessions';
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
function listToText(list) {
    return list.join('\n');
}
function textToList(text) {
    return text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
}
/**
 * Dispatch defaults (the flags `claude agents` accepts) and view preferences.
 */
export const AgentSettingsPanel = ({ open, onClose, settings, onUpdate, userSettings, daemon, repos, capabilities, onRefresh, }) => {
    const [busy, setBusy] = useState(null);
    const { toast } = useHost();
    const daemonApi = useTransport().daemon;
    const labels = useLabels();
    const t = labels.panels;
    if (!open)
        return null;
    const dispatch = settings.dispatch;
    const setDispatch = (partial) => onUpdate({ dispatch: { ...dispatch, ...partial } });
    const unsafeLocked = capabilities ? !capabilities.unsafeFlagsAllowed : false;
    const runDaemon = async (label, fn) => {
        setBusy(label);
        try {
            const result = await fn();
            toast.success(result.output ? result.output.split('\n')[0] : t.settingsDaemonDone(label));
            onRefresh();
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : t.settingsDaemonFailed(label));
        }
        finally {
            setBusy(null);
        }
    };
    const field = 'w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-blue-500';
    const label = 'block text-xs text-gray-400 mb-1';
    // Form size; a menu trigger fills its column like the inputs next to it
    const md = { size: 'md', className: 'w-full' };
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4", onClick: onClose, role: "dialog", "aria-modal": "true", children: _jsxs("div", { className: "w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center gap-2 px-5 py-3 border-b border-gray-800 sticky top-0 bg-gray-900 z-10", children: [_jsx(Settings2, { size: 16, className: "text-blue-300" }), _jsx("h3", { className: "text-sm font-semibold text-gray-100", children: t.settingsTitle }), _jsx("button", { onClick: onClose, className: "ml-auto p-1 rounded text-gray-500 hover:text-white hover:bg-gray-800", "aria-label": t.close, children: _jsx(X, { size: 14 }) })] }), _jsxs("div", { className: "p-5 space-y-6", children: [_jsxs("section", { className: "space-y-3", children: [_jsx("h4", { className: "text-xs text-gray-500", children: t.settingsView }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("span", { className: label, children: t.settingsScope }), _jsx(Choice, { ...md, label: t.settingsScope, value: settings.scopeCwd || '', onChange: (v) => onUpdate({ scopeCwd: v || null }), options: [
                                                        { value: '', label: t.settingsAllSessions },
                                                        ...repos.map((repo) => ({
                                                            value: repo.path,
                                                            label: `${repo.name} — ${repo.path}`,
                                                        })),
                                                    ] })] }), _jsxs("div", { children: [_jsx("label", { className: label, htmlFor: "agent-task-cwd", children: t.settingsTaskCwd }), _jsx("input", { id: "agent-task-cwd", className: field, placeholder: t.settingsTaskCwdPlaceholder, defaultValue: settings.taskCwd || '', onBlur: (e) => onUpdate({ taskCwd: e.target.value.trim() || null }) })] }), _jsxs("div", { children: [_jsx("span", { className: label, children: t.settingsGroupBy }), _jsx(Choice, { ...md, label: t.settingsGroupBy, value: settings.grouping, onChange: (grouping) => onUpdate({ grouping }), options: [
                                                        { value: 'state', label: t.settingsGroupState },
                                                        { value: 'directory', label: t.settingsGroupDirectory },
                                                    ] })] }), _jsxs("div", { children: [_jsx("span", { className: label, children: t.settingsCardDensity }), _jsx(Choice, { ...md, id: "agent-card-density", label: t.settingsCardDensity, value: settings.cardDensity, onChange: (cardDensity) => onUpdate({ cardDensity }), options: [
                                                        { value: 'comfortable', label: t.settingsDensityComfortable },
                                                        { value: 'compact', label: t.settingsDensityCompact },
                                                    ] })] }), _jsxs("div", { children: [_jsx("span", { className: label, children: t.settingsChatSubmit }), _jsx(Choice, { ...md, id: "agent-chat-submit-key", label: t.settingsChatSubmit, value: settings.chatSubmitKey, onChange: (chatSubmitKey) => onUpdate({ chatSubmitKey }), options: [
                                                        { value: 'mod+enter', label: t.settingsSubmitModEnter },
                                                        { value: 'enter', label: t.settingsSubmitEnter },
                                                    ] })] }), _jsxs("div", { children: [_jsx("span", { className: label, children: t.settingsOpenAgentsIn }), _jsx(Choice, { ...md, id: "agent-open-view", label: t.settingsOpenAgentsIn, value: settings.agentOpenView, onChange: (agentOpenView) => onUpdate({ agentOpenView }), options: [
                                                        { value: 'chat', label: t.settingsOpenChat },
                                                        { value: 'terminal', label: t.settingsOpenTerminal },
                                                    ] })] })] }), _jsxs("fieldset", { className: "space-y-2", children: [_jsxs("legend", { className: `${label} flex items-center gap-2 w-full`, children: [t.settingsCardFields, _jsx("button", { type: "button", onClick: () => onUpdate({ cardFields: DEFAULT_AGENT_CARD_FIELDS }), className: "ml-auto text-[11px] text-blue-300 hover:text-white", children: t.settingsReset })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1.5", children: CARD_ELEMENTS.map((element) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "flex-1 min-w-0 truncate text-xs text-gray-300", children: labels.shell.cardElements[element.key] }), _jsx("div", { className: "w-44 shrink-0", children: _jsx(Choice, { ...md, id: `agent-card-field-${element.key}`, label: labels.shell.cardElements[element.key], value: settings.cardFields[element.key], onChange: (slot) => onUpdate({ cardFields: { ...settings.cardFields, [element.key]: slot } }), options: CARD_SLOTS.map((slot) => ({
                                                                value: slot.key,
                                                                label: labels.shell.cardSlots[slot.key],
                                                            })) }) })] }, element.key))) })] }), _jsxs("div", { className: "flex flex-wrap gap-4 text-sm text-gray-300", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: settings.notifications, onChange: (e) => onUpdate({ notifications: e.target.checked }) }), t.settingsInAppNotifications] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: settings.desktopNotifications, onChange: async (e) => {
                                                        if (e.target.checked &&
                                                            typeof Notification !== 'undefined' &&
                                                            Notification.permission !== 'granted') {
                                                            const permission = await Notification.requestPermission();
                                                            if (permission !== 'granted') {
                                                                toast.error(t.settingsNotificationsDenied);
                                                                return;
                                                            }
                                                        }
                                                        onUpdate({ desktopNotifications: e.target.checked });
                                                    } }), t.settingsBrowserNotifications] })] })] }), _jsxs("section", { className: "space-y-2", children: [_jsx("h4", { className: "text-xs text-gray-500", children: t.settingsHarness }), _jsxs("div", { className: "max-w-xs", children: [_jsx("span", { className: label, children: t.settingsDefaultHarness }), _jsx(Choice, { ...md, id: "agent-default-harness", label: t.settingsDefaultHarness, value: dispatch.harness, onChange: (harness) => setDispatch({ harness }), options: HARNESSES.map((h) => ({ value: h.id, label: h.label })) })] }), _jsx("p", { className: "text-xs text-gray-500", children: t.settingsHarnessHint })] }), _jsxs("section", { className: "space-y-3", children: [_jsx("h4", { className: "text-xs text-gray-500", children: t.settingsDispatchDefaults }), unsafeLocked && (_jsxs("div", { className: "flex items-start gap-2 text-xs text-gray-300 bg-gray-800 border border-gray-700 rounded p-2", children: [_jsx(AlertTriangle, { size: 14, className: "shrink-0 mt-0.5 text-yellow-400" }), _jsx("span", { children: t.settingsUnsafeLocked })] })), userSettings && (_jsxs("div", { className: "text-xs text-gray-500", children: [t.settingsFromUserSettings, ' ', _jsx("span", { className: "text-gray-300", children: userSettings.model || t.settingsDefault }), t.settingsEffortSep, ' ', _jsx("span", { className: "text-gray-300", children: userSettings.effortLevel || t.settingsDefault }), t.settingsPermissionSep, ' ', _jsx("span", { className: "text-gray-300", children: userSettings.permissionMode || t.settingsDefault })] })), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: label, children: "--model" }), _jsx("input", { list: "agent-model-options", className: field, value: dispatch.model || '', placeholder: t.settingsDefault, onChange: (e) => setDispatch({ model: e.target.value || null }) }), _jsx("datalist", { id: "agent-model-options", children: MODELS.filter(Boolean).map((m) => (_jsx("option", { value: m }, m))) })] }), _jsxs("div", { children: [_jsx("span", { className: label, children: "--effort" }), _jsx(Choice, { ...md, label: "--effort", value: dispatch.effort || '', onChange: (v) => setDispatch({ effort: v || null }), options: EFFORTS.map((e) => ({ value: e, label: e || t.settingsDefault })) })] }), _jsxs("div", { children: [_jsx("span", { className: label, children: "--permission-mode" }), _jsx(Choice, { ...md, label: "--permission-mode", value: dispatch.permissionMode || '', onChange: (v) => setDispatch({ permissionMode: v || null }), options: PERMISSION_MODES.map((m) => ({
                                                        value: m,
                                                        label: m || t.settingsDirectoryRules,
                                                    })) })] }), _jsxs("div", { children: [_jsxs("label", { className: label, children: ["--agent (", t.settingsDefaultSubagent, ")"] }), _jsx("input", { className: field, value: dispatch.agent || '', placeholder: t.settingsNone, onChange: (e) => setDispatch({ agent: e.target.value || null }) })] }), _jsxs("div", { children: [_jsx("label", { className: label, children: "--fallback-model" }), _jsx("input", { className: field, value: dispatch.fallbackModel || '', placeholder: t.settingsNone, onChange: (e) => setDispatch({ fallbackModel: e.target.value || null }) })] }), _jsxs("div", { children: [_jsxs("label", { className: label, children: ["--settings (", t.settingsFileOrJson, ")"] }), _jsx("input", { disabled: unsafeLocked, className: field, value: dispatch.settings || '', placeholder: "./ci-settings.json", onChange: (e) => setDispatch({ settings: e.target.value || null }) })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [_jsxs("div", { children: [_jsxs("label", { className: label, children: ["--add-dir (", t.settingsOnePerLine, ")"] }), _jsx("textarea", { className: `${field} font-mono text-xs`, rows: 3, value: listToText(dispatch.addDirs), onChange: (e) => setDispatch({ addDirs: textToList(e.target.value) }) })] }), _jsxs("div", { children: [_jsxs("label", { className: label, children: ["--plugin-dir (", t.settingsOnePerLine, ")"] }), _jsx("textarea", { disabled: unsafeLocked, className: `${field} font-mono text-xs`, rows: 3, value: listToText(dispatch.pluginDirs), onChange: (e) => setDispatch({ pluginDirs: textToList(e.target.value) }) })] }), _jsxs("div", { children: [_jsxs("label", { className: label, children: ["--mcp-config (", t.settingsFileOrJsonPerLine, ")"] }), _jsx("textarea", { disabled: unsafeLocked, className: `${field} font-mono text-xs`, rows: 3, value: listToText(dispatch.mcpConfigs), onChange: (e) => setDispatch({ mcpConfigs: textToList(e.target.value) }) })] })] }), _jsxs("div", { className: "flex flex-wrap gap-4 text-sm text-gray-300", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: dispatch.strictMcpConfig, onChange: (e) => setDispatch({ strictMcpConfig: e.target.checked }) }), "--strict-mcp-config"] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: dispatch.restricted, onChange: (e) => setDispatch({ restricted: e.target.checked }) }), "--restricted"] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: dispatch.allowSkipPermissions, disabled: unsafeLocked, onChange: (e) => setDispatch({ allowSkipPermissions: e.target.checked }) }), "--allow-dangerously-skip-permissions"] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-orange-300", children: [_jsx("input", { type: "checkbox", checked: dispatch.skipPermissions, disabled: unsafeLocked, onChange: (e) => {
                                                        if (e.target.checked && !window.confirm(t.settingsSkipPermissionsConfirm))
                                                            return;
                                                        setDispatch({ skipPermissions: e.target.checked });
                                                    } }), "--dangerously-skip-permissions"] })] }), dispatch.skipPermissions && (_jsxs("div", { className: "flex items-start gap-2 text-xs text-red-300 bg-red-900/20 border border-red-800 rounded p-2", children: [_jsx(AlertTriangle, { size: 14, className: "shrink-0 mt-0.5" }), t.settingsBypassOn] }))] }), daemonApi && (_jsxs("section", { className: "space-y-3", children: [_jsx("h4", { className: "text-xs text-gray-500", children: t.settingsSupervisor }), _jsx("pre", { className: "text-[11px] text-gray-400 bg-gray-950 border border-gray-800 rounded p-2 whitespace-pre-wrap max-h-40 overflow-y-auto", children: daemon?.raw || t.settingsStatusUnavailable }), daemon?.versionMismatch && (_jsx("div", { className: "text-xs text-yellow-300", children: t.settingsVersionMismatch })), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs("button", { disabled: !!busy, onClick: () => runDaemon('respawn --all', daemonApi.respawnAllAgents), className: "flex items-center gap-1 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 hover:text-white text-sm text-gray-200 disabled:opacity-50", children: [_jsx(RefreshCw, { size: 12 }), " claude respawn --all"] }), _jsxs("button", { disabled: !!busy, onClick: () => runDaemon('daemon stop --keep-workers', () => daemonApi.stopAgentDaemon({ keepWorkers: true })), className: "flex items-center gap-1 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 hover:text-white text-sm text-gray-200 disabled:opacity-50", children: [_jsx(Power, { size: 12 }), " claude daemon stop --keep-workers"] }), _jsxs("button", { disabled: !!busy, onClick: () => {
                                                if (window.confirm(t.settingsStopSupervisorConfirm)) {
                                                    runDaemon('daemon stop --any', () => daemonApi.stopAgentDaemon({ any: true }));
                                                }
                                            }, className: "flex items-center gap-1 px-3 py-1.5 rounded bg-red-900/40 hover:bg-red-900/60 text-sm text-red-200 disabled:opacity-50", children: [_jsx(Power, { size: 12 }), " claude daemon stop --any"] })] })] })), _jsxs("section", { className: "space-y-2", children: [_jsx("h4", { className: "text-xs text-gray-500", children: t.settingsTurnOff }), _jsxs("label", { className: "flex items-center gap-2 text-sm text-gray-300 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: settings.disabled, onChange: (e) => onUpdate({ disabled: e.target.checked }) }), t.settingsHideView] }), userSettings?.disableAgentView && (_jsx("div", { className: "text-xs text-yellow-300", children: t.settingsCliViewOff }))] })] })] }) }));
};
