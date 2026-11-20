import React from 'react';
import type { AgentSubagent, AgentRepo, AgentSlashCommand, AgentHarness } from '../../types';
interface DispatchInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (options: {
        attach: boolean;
    }) => void;
    onEscape: () => void;
    onOpenEditor: () => void;
    onPickDirectory: () => void;
    targetCwd: string | null;
    hint: string | null;
    hintTone?: 'info' | 'error' | 'success';
    disabled?: boolean;
    subagents: AgentSubagent[];
    repos: AgentRepo[];
    commands: AgentSlashCommand[];
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    /** 'agent': optional prompt, a single "Start agent" button that always attaches */
    variant?: 'task' | 'agent' | 'chat';
    /** Rendered below the textarea (image attachments) */
    attachments?: React.ReactNode;
    /** false: no "dispatch and attach" (the transport cannot open a terminal for it) */
    canAttach?: boolean;
    /** Harness picker (#195); omitted = no picker (chat) */
    harness?: AgentHarness;
    onHarnessChange?: (harness: AgentHarness) => void;
    /** false marks a harness as not installed; missing/null = unknown */
    harnessInstalled?: Record<string, boolean | null>;
    /**
     * Model of this agent or chat (#19 AK-2), '' = default; shown for agents and chats whose CLI
     * takes one. `defaultModel`: what '' means (settings.dispatch.model), null = the CLI's own
     */
    model?: string;
    onModelChange?: (model: string) => void;
    /** Effort level ('' = default): Claude Code `--effort`, omp `--thinking` */
    effort?: string;
    onEffortChange?: (effort: string) => void;
    defaultModel?: string | null;
    /** New agent with Claude Code: start as orchestrator (Remote Control); omitted = no checkbox */
    orchestrator?: boolean;
    onOrchestratorChange?: (on: boolean) => void;
}
/**
 * The task composer body, rendered inside TaskComposerModal.
 *
 * Enter / Ctrl+J insert a newline, Cmd/Ctrl+Enter dispatches, Cmd/Ctrl+Shift+Enter dispatches
 * and attaches, Tab or Enter applies the highlighted suggestion, Ctrl+G opens the larger editor.
 */
export declare const DispatchInput: React.FC<DispatchInputProps>;
export {};
