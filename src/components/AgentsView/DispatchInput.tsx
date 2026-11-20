import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Send, FolderOpen, PenSquare } from 'lucide-react';
import type { AgentSubagent, AgentRepo, AgentSlashCommand, AgentHarness } from '../../types';
import { HARNESSES, HARNESS_MODEL_FLAG } from '../../utils/agentSessions';
import { useLabels } from '../../labels';
import { computeSuggestions, Suggestion } from '../../utils/agentInput';
import { submitIntent } from '../../utils/composer';
import { useAutoGrowTextarea } from '../../hooks/useAutoGrowTextarea';
import { ModelEffortPicker } from './ModelEffortPicker';

interface DispatchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (options: { attach: boolean }) => void;
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

const MIN_HEIGHT = 96;
const MAX_HEIGHT = 288;

/**
 * The task composer body, rendered inside TaskComposerModal.
 *
 * Enter / Ctrl+J insert a newline, Cmd/Ctrl+Enter dispatches, Cmd/Ctrl+Shift+Enter dispatches
 * and attaches, Tab or Enter applies the highlighted suggestion, Ctrl+G opens the larger editor.
 */
export const DispatchInput: React.FC<DispatchInputProps> = ({
  value,
  onChange,
  onSubmit,
  onEscape,
  onOpenEditor,
  onPickDirectory,
  targetCwd,
  hint,
  hintTone = 'info',
  disabled,
  subagents,
  repos,
  commands,
  inputRef,
  variant = 'task',
  attachments,
  canAttach = true,
  harness,
  onHarnessChange,
  harnessInstalled = {},
  model = '',
  onModelChange,
  effort = '',
  onEffortChange,
  defaultModel = null,
  orchestrator = false,
  onOrchestratorChange,
}) => {
  // @agent, /command and ! are Claude Code syntax; other harnesses get the text as their first message
  const otherHarness = harness !== undefined && harness !== 'claude';
  // Agent, chat and other harnesses start one session and attach it right away
  const isAgent = variant !== 'task' || otherHarness;
  const t = useLabels().panels;
  const [caret, setCaret] = useState(0);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const suggestionState = useMemo(
    () =>
      computeSuggestions(
        value,
        caret,
        // `@agent` and `@repo` are Claude syntax; the caller hands each harness its own commands
        otherHarness ? { subagents: [], repos: [], commands } : { subagents, repos, commands }
      ),
    [otherHarness, value, caret, subagents, repos, commands]
  );
  const suggestions = suggestionState.suggestions;
  const showSuggestions = suggestionsOpen && suggestions.length > 0;

  // Grow with the content; the scrollbar only exists once the maximum height is reached
  // No drag handle here: the field sits in a modal, not at the bottom of a pane
  useAutoGrowTextarea(inputRef, value, {
    min: MIN_HEIGHT,
    max: MAX_HEIGHT,
  });

  // Open the popover automatically when typing @ or /
  useEffect(() => {
    const before = value.slice(0, caret);
    if (/(?:^|\s)@[A-Za-z0-9_./-]*$/.test(before) || /^\/\S*$/.test(before)) {
      setSuggestionsOpen(true);
    } else if (value.trim()) {
      setSuggestionsOpen(false);
    }
    setHighlighted(0);
  }, [value, caret]);

  const applySuggestion = useCallback(
    (suggestion: Suggestion) => {
      const next =
        value.slice(0, suggestionState.replaceStart) +
        suggestion.insert +
        value.slice(suggestionState.replaceEnd);
      onChange(next);
      setSuggestionsOpen(false);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          const pos = suggestionState.replaceStart + suggestion.insert.length;
          el.focus();
          el.setSelectionRange(pos, pos);
          setCaret(pos);
        }
      });
    },
    [value, suggestionState, onChange, inputRef]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      // Tab only completes while there is something to complete; otherwise it moves focus on
      if (showSuggestions) {
        e.preventDefault();
        applySuggestion(suggestions[highlighted]);
      } else if (suggestions.length > 0) {
        e.preventDefault();
        setSuggestionsOpen(true);
      }
      return;
    }
    if (showSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setHighlighted((h) =>
        e.key === 'ArrowDown'
          ? (h + 1) % suggestions.length
          : (h - 1 + suggestions.length) % suggestions.length
      );
      return;
    }
    const submit = submitIntent(e);
    if (submit) {
      e.preventDefault();
      onSubmit({ attach: isAgent || (canAttach && submit.attach) });
      return;
    }
    if (e.key === 'Enter' && showSuggestions && !e.shiftKey) {
      e.preventDefault();
      applySuggestion(suggestions[highlighted]);
      return;
    }
    if (e.key === 'j' && e.ctrlKey) {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      onChange(`${value.slice(0, start)}\n${value.slice(end)}`);
      requestAnimationFrame(() => {
        el.setSelectionRange(start + 1, start + 1);
        setCaret(start + 1);
      });
      return;
    }
    if (e.key === 'g' && e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      onOpenEditor();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (showSuggestions) setSuggestionsOpen(false);
      else onEscape();
    }
  };

  const listId = 'task-composer-suggestions';

  return (
    <div className="relative">
      {showSuggestions && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t.dispatchSuggestions}
          className="absolute top-full left-0 right-0 mt-1 max-h-80 overflow-y-auto bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-30"
        >
          {suggestions.map((s, index) => (
            <li
              key={`${s.type}-${s.label}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === highlighted}
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(s);
              }}
              className={`px-3 py-1.5 text-sm cursor-pointer ${
                index === highlighted ? 'bg-blue-500/30 text-white' : 'text-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-blue-300">{s.label}</span>
                <span className="ml-auto text-[10px] text-gray-300">{s.type}</span>
              </div>
              {s.description && (
                <div className="line-clamp-2 text-xs text-gray-300">{s.description}</div>
              )}
            </li>
          ))}
        </ul>
      )}
      <textarea
        ref={inputRef}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setCaret(e.target.selectionStart);
        }}
        onSelect={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart)}
        onKeyDown={handleKeyDown}
        onBlur={() => setSuggestionsOpen(false)}
        placeholder={
          isAgent
            ? variant === 'chat'
              ? otherHarness
                ? t.dispatchChatHarness
                : t.dispatchChatClaude
              : t.dispatchAgentPrompt
            : t.dispatchTaskPrompt
        }
        aria-label={t.dispatchTaskLabel}
        aria-autocomplete="list"
        aria-controls={showSuggestions ? listId : undefined}
        aria-activedescendant={showSuggestions ? `${listId}-${highlighted}` : undefined}
        style={{ minHeight: MIN_HEIGHT }}
        className="block w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-400 resize-none outline-none font-mono leading-6 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/40"
        spellCheck={false}
      />
      {attachments}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {harness !== undefined && (
          <label className="flex items-center gap-1.5 text-xs text-gray-200">
            <span>{t.dispatchHarness}</span>
            <select
              value={harness}
              onChange={(e) => onHarnessChange?.(e.target.value as AgentHarness)}
              disabled={disabled}
              className="bg-gray-900 border border-gray-600 rounded-md px-1.5 py-1 text-xs text-gray-50 focus-visible:outline-2 focus-visible:outline-blue-400"
              title={t.dispatchHarnessTitle}
            >
              {HARNESSES.map((h) => (
                <option key={h.id} value={h.id} disabled={harnessInstalled[h.id] === false}>
                  {h.label}
                  {harnessInstalled[h.id] === false ? t.dispatchNotInstalled : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        {harness !== undefined && onModelChange && (harness === 'claude' || harness === 'omp') && (
          <ModelEffortPicker
            harness={harness}
            model={model}
            effort={effort}
            defaultModel={defaultModel}
            disabled={disabled}
            onPick={(m, e) => {
              onModelChange(m);
              onEffortChange?.(e);
            }}
            title={harness === 'claude' ? t.dispatchModelTitleClaude : t.dispatchModelTitleOmp}
          />
        )}
        {harness !== undefined &&
          onModelChange &&
          isAgent &&
          harness !== 'claude' &&
          harness !== 'omp' &&
          HARNESS_MODEL_FLAG[harness] && (
            <label className="flex items-center gap-1.5 text-xs text-gray-200">
              <span>{t.dispatchModel}</span>
              <input
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                disabled={disabled}
                placeholder={t.dispatchModelPlaceholder(defaultModel)}
                aria-label={t.dispatchModel}
                spellCheck={false}
                maxLength={80}
                className="w-36 bg-gray-900 border border-gray-600 rounded-md px-1.5 py-1 text-xs text-gray-50 placeholder-gray-400 font-mono focus-visible:outline-2 focus-visible:outline-blue-400"
                title={t.dispatchModelTitle}
              />
            </label>
          )}
        {variant === 'agent' && harness === 'claude' && onOrchestratorChange && (
          <label
            className="flex items-center gap-1.5 text-xs text-gray-200"
            title={t.dispatchOrchestratorTitle}
          >
            <input
              type="checkbox"
              checked={orchestrator}
              onChange={(e) => onOrchestratorChange(e.target.checked)}
              disabled={disabled}
              className="accent-blue-400 focus-visible:outline-2 focus-visible:outline-blue-400"
            />
            <span>{t.dispatchOrchestrator}</span>
          </label>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={onOpenEditor}
          className="p-1.5 rounded-md text-gray-200 hover:bg-gray-700 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"
          title={t.dispatchEditorTitle}
          aria-label={t.dispatchEditor}
        >
          <PenSquare size={15} />
        </button>
        {!isAgent && canAttach && (
          <button
            type="button"
            onClick={() => onSubmit({ attach: true })}
            disabled={disabled}
            className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-md text-sm text-gray-100 bg-gray-700 hover:bg-gray-600 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50"
            title={t.dispatchAttachTitle}
          >
            {t.dispatchAttach}
          </button>
        )}
        <button
          type="button"
          onClick={() => onSubmit({ attach: isAgent })}
          disabled={disabled}
          className="flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
          title={isAgent ? t.dispatchStartTitle : t.dispatchSubmitTitle}
        >
          <Send size={13} aria-hidden />{' '}
          {variant === 'chat'
            ? t.dispatchStartChat
            : isAgent
              ? t.dispatchStartAgent
              : t.dispatchSubmit}
        </button>
      </div>
      <button
        type="button"
        onClick={onPickDirectory}
        className="mt-2 flex w-full items-start gap-1.5 px-2 py-1 rounded-md text-left text-xs text-gray-200 hover:bg-gray-700 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"
        title={isAgent ? t.dispatchDirAgent : t.dispatchDirTask}
      >
        <FolderOpen size={13} aria-hidden className="mt-0.5 shrink-0" />
        <span className="min-w-0 font-mono [overflow-wrap:anywhere]">
          {targetCwd || t.dispatchPickDir}
        </span>
      </button>
      <div className="mt-1 min-h-[1.25rem] text-xs" role="status" aria-live="polite">
        {hint ? (
          <span
            className={
              hintTone === 'error'
                ? 'text-red-300'
                : hintTone === 'success'
                  ? 'text-emerald-300'
                  : 'text-gray-200'
            }
          >
            {hint}
          </span>
        ) : (
          <span className="text-gray-300">
            {otherHarness ? t.dispatchHintHarness(harness === 'omp') : t.dispatchHintClaude}
          </span>
        )}
      </div>
    </div>
  );
};
