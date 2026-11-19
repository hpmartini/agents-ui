import { useState, type KeyboardEvent } from 'react';
import { Check, MessageCircleQuestion, ShieldAlert } from 'lucide-react';
import type { AgentDialog, DialogAnswer } from '../../../utils/agentDialog';
import { useLabels } from '../../../labels';

interface QuestionCardProps {
  dialog: AgentDialog;
  onAnswer: (answer: DialogAnswer) => void;
  /** Keys went out for this step: answered until the agent's screen moves on */
  sent?: boolean;
  disabled?: boolean;
}

const optionBtn =
  'w-full rounded border border-amber-400/30 bg-gray-900 px-2 py-1.5 text-left text-xs text-gray-100 transition-colors hover:bg-amber-500/20 hover:border-amber-400/60 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50 disabled:hover:bg-gray-900';
const field =
  'min-w-0 flex-1 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-xs text-gray-100 placeholder-gray-500 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50';
const sendBtn =
  'shrink-0 rounded border border-amber-400/40 bg-gray-900 px-2 py-1 text-xs text-gray-100 hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50';

/** One free-text line (free answer, reason for a denial), sent with Enter or its button */
function TextAnswer({
  label,
  button,
  disabled,
  onSend,
}: {
  label: string;
  button: string;
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const send = () => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText('');
  };
  return (
    <div className="flex gap-1.5">
      <input
        aria-label={label}
        placeholder={label}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
          }
        }}
        className={field}
      />
      <button type="button" disabled={disabled || !text.trim()} onClick={send} className={sendBtn}>
        {button}
      </button>
    </div>
  );
}

/**
 * A question or permission the agent waits on, as a card: the dialog's step on its screen,
 * structured, answered with clicks that the chat pane turns into the TUI's keys. Claude's question
 * tabs are buttons (and ←/→ on the card): back to an answered question shows its pick, and only
 * Submit on the review sends the answers.
 */
export function QuestionCard({
  dialog,
  onAnswer,
  sent = false,
  disabled = false,
}: QuestionCardProps) {
  const t = useLabels().terminal;
  const off = disabled || sent;
  const pick = (row: number) => !off && onAnswer({ type: 'pick', row });
  const permission = dialog.kind === 'permission';
  const Icon = permission ? ShieldAlert : MessageCircleQuestion;
  const rows = dialog.options.map((option, row) => ({ option, row }));
  const deny = rows.find(({ option }) => option.role === 'deny');
  const submit = rows.find(({ option }) => option.role === 'submit');
  // Claude: the question tabs plus the review (its tab row calls it Submit)
  const steps =
    dialog.harness === 'claude' && dialog.tabs.length > 1
      ? [...dialog.tabs, { label: t.reviewTab, done: false }]
      : [];
  // omp: one box can ask several questions at once
  const sections = dialog.groups.length
    ? dialog.groups.map((question, group) => ({
        question,
        rows: rows.filter(({ option }) => option.group === group),
      }))
    : [{ question: dialog.question, rows }];

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (off || steps.length === 0 || e.target instanceof HTMLInputElement) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    onAnswer({ type: 'step', by: e.key === 'ArrowLeft' ? -1 : 1 });
  };

  return (
    <div
      role="group"
      aria-label={permission ? t.permissionRequest : t.agentQuestion}
      onKeyDown={onKeyDown}
      className="mb-2 rounded-md border border-amber-400/40 bg-amber-500/10 p-2 text-xs"
    >
      <div className="flex items-center gap-1.5 font-medium text-amber-200">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 truncate">
          {permission ? dialog.title || t.permission : t.agentAsking}
        </span>
        {sent && (
          <span className="ml-auto flex shrink-0 items-center gap-1 font-normal text-emerald-300">
            <Check className="h-3 w-3" aria-hidden />
            {t.answerSent}
          </span>
        )}
      </div>
      {steps.length > 0 && (
        <div role="group" aria-label={t.questionTabs} className="mt-1.5 flex flex-wrap gap-1">
          {steps.map((step, i) => {
            const current = i === dialog.tab;
            return (
              <button
                key={`${i}-${step.label}`}
                type="button"
                aria-current={current ? 'step' : undefined}
                data-done={step.done}
                disabled={off || current}
                onClick={() => onAnswer({ type: 'tab', tab: i })}
                className={`rounded-full border px-1.5 py-0.5 text-[11px] focus-visible:outline-2 focus-visible:outline-blue-400 ${
                  current
                    ? 'border-amber-300 bg-amber-500/25 text-amber-100'
                    : step.done
                      ? 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10'
                      : 'border-gray-600 text-gray-400 hover:bg-gray-700/40'
                } disabled:cursor-default`}
              >
                {step.label}
              </button>
            );
          })}
        </div>
      )}
      {dialog.detail && (
        <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-gray-950/60 p-1.5 font-mono text-[11px] text-gray-200">
          {dialog.detail}
        </pre>
      )}
      {sections.map(({ question, rows: section }, s) => {
        const choices = section.filter(
          ({ option }) => option.role === 'option' || option.role === 'deny'
        );
        const other = section.find(({ option }) => option.role === 'other');
        return (
          <div key={s} className={s > 0 ? 'mt-3' : undefined}>
            {question && <div className="mt-1.5 text-sm text-gray-100">{question}</div>}
            <div className="mt-2 flex flex-col gap-1">
              {choices.map(({ option, row }) =>
                option.checked !== undefined ? (
                  <button
                    key={row}
                    type="button"
                    role="checkbox"
                    aria-checked={option.checked}
                    disabled={off}
                    onClick={() => pick(row)}
                    className={`${optionBtn} flex items-start gap-2`}
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ${option.checked ? 'border-amber-300 bg-amber-400/30' : 'border-gray-500'}`}
                    >
                      {option.checked && <Check className="h-3 w-3 text-amber-100" />}
                    </span>
                    <OptionText label={option.label} description={option.description} />
                  </button>
                ) : (
                  <button
                    key={row}
                    type="button"
                    aria-pressed={option.selected || undefined}
                    disabled={off}
                    onClick={() => pick(row)}
                    className={`${optionBtn} ${option.selected ? 'border-amber-300 bg-amber-500/20' : ''}`}
                  >
                    <OptionText label={option.label} description={option.description} />
                  </button>
                )
              )}
            </div>
            {other && (
              <div className="mt-1.5">
                {other.option.description && (
                  <div className="mb-1 text-gray-400">{t.typed(other.option.description)}</div>
                )}
                <TextAnswer
                  label={t.otherAnswer}
                  button={t.send}
                  disabled={off}
                  onSend={(text) => onAnswer({ type: 'text', row: other.row, text })}
                />
              </div>
            )}
          </div>
        );
      })}
      {deny && (
        <div className="mt-1.5">
          <TextAnswer
            label={t.reason}
            button={t.denyWithReason}
            disabled={off}
            onSend={(text) => onAnswer({ type: 'text', row: deny.row, text })}
          />
        </div>
      )}
      {submit && (
        <button
          type="button"
          disabled={off}
          onClick={() => pick(submit.row)}
          className={`${sendBtn} mt-2 bg-amber-500/20`}
        >
          {submit.option.label === 'Next' ? t.next : t.submit}
        </button>
      )}
    </div>
  );
}

function OptionText({ label, description }: { label: string; description?: string }) {
  return (
    <span className="min-w-0">
      <span className="block">{label}</span>
      {description && <span className="block text-[11px] text-gray-400">{description}</span>}
    </span>
  );
}
