import React from 'react';
import type { AgentViewSettings, ClaudeUserSettings, AgentDaemonStatus, AgentRepo, AgentCapabilities } from '../../types';
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
/**
 * Dispatch defaults (the flags `claude agents` accepts) and view preferences.
 */
export declare const AgentSettingsPanel: React.FC<AgentSettingsPanelProps>;
export {};
