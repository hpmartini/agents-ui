import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CheckSquare,
  ChevronRight,
  Circle,
  CircleDot,
  ListChecks,
  Loader2,
  SquareTerminal,
  X,
} from 'lucide-react';
import type { ChatBlock, ChatMessage } from '../../../utils/chatEvents';
import { toolSummary } from '../../../utils/chatEvents';
import { chatPlan, chatShells, chatSubagents, turnSteps } from '../../../utils/chatActivity';
import { useTransport } from '../../../host';
import { useLabels } from '../../../labels';
import type { TerminalLabels } from '../../../labels/terminal';
import { pollWhileVisible } from '../../../utils/visiblePoll';
import { AssistantBlock } from './ChatMessages';

const chip =
  'flex max-w-full items-start gap-1 px-2 py-0.5 rounded-xl border text-[11px] focus-visible:outline-2 focus-visible:outline-blue-400 transition-colors';
// Row chips stay on one line (full text in the title); in an opened list they wrap
const chipText = (oneLine: boolean) =>
  `min-w-0 text-left ${oneLine ? 'truncate' : '[overflow-wrap:anywhere]'}`;
const rowChip = 'shrink-0 max-w-[min(16rem,100%)]';

/** One-line label of the latest step: "Bash npm test", "Thinking" */
function stepLabel(block: ChatBlock | undefined, t: TerminalLabels): string {
  if (!block) return t.stepStarting;
  if (block.type === 'thinking') return t.stepThinking;
  if (block.type === 'tool') return `${block.name} ${toolSummary(block.input)}`.trim();
  return '';
}

/** Scroll box that keeps to the bottom while new content arrives */
const FollowBox: React.FC<{ children: React.ReactNode; dep: unknown; className?: string }> = ({
  children,
  dep,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [dep]);
  return (
    <div ref={ref} className={`overflow-y-auto ${className}`}>
      {children}
    </div>
  );
};

const ShellView: React.FC<{ chatId: string; shellId: string }> = ({ chatId, shellId }) => {
  const [data, setData] = useState<{ output: string; updatedAt: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chat = useTransport().chat;
  const t = useLabels().terminal;
  useEffect(() => {
    const fetchShell = chat?.fetchChatShell;
    if (!fetchShell) return;
    let cancelled = false;
    const load = () =>
      fetchShell(chatId, shellId)
        .then((d) => {
          if (!cancelled) {
            setData(d);
            setError(null);
          }
        })
        .catch((e: Error) => !cancelled && setError(e.message));
    const stop = pollWhileVisible(load, 2000);
    return () => {
      cancelled = true;
      stop();
    };
  }, [chat, chatId, shellId]);
  if (error) return <div className="text-xs text-red-300">{error}</div>;
  if (!data) return <div className="text-xs text-gray-500">{t.loading}</div>;
  return (
    <>
      <FollowBox dep={data.output} className="max-h-64 rounded bg-black/60 p-2">
        <pre className="text-xs font-mono text-gray-200 whitespace-pre-wrap break-all">
          {data.output || t.noOutputYet}
        </pre>
      </FollowBox>
      <div className="mt-1 text-[10px] text-gray-500">
        {t.updatedAt(new Date(data.updatedAt).toLocaleTimeString())}
      </div>
    </>
  );
};

type Detail =
  { kind: 'shell'; id: string; title: string } | { kind: 'agent'; id: string; title: string };

interface ChatActivityProps {
  chatId: string;
  messages: ChatMessage[];
  sub: Record<string, ChatBlock[]>;
  busy: boolean;
  /** Ids of background tasks that reported their end (ChatState.endedTasks) */
  endedTasks?: string[];
}

/** Above the input: plan with checkmarks, shells and sub-agents to look into, the running turn */
export const ChatActivity: React.FC<ChatActivityProps> = ({
  chatId,
  messages,
  sub,
  busy,
  endedTasks,
}) => {
  const t = useLabels().terminal;
  // Without fetchChatShell a shell chip only names the shell: no output to open
  const canPeekShell = !!useTransport().chat?.fetchChatShell;
  const plan = useMemo(() => chatPlan(messages), [messages]);
  const shells = useMemo(() => chatShells(messages, endedTasks), [messages, endedTasks]);
  const agents = useMemo(() => chatSubagents(messages, endedTasks), [messages, endedTasks]);
  const steps = useMemo(() => turnSteps(messages), [messages]);
  const [planOpen, setPlanOpen] = useState(true);
  const [workOpen, setWorkOpen] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);

  const done = plan.filter((item) => item.status === 'completed').length;
  const running = agents.filter((a) => !a.done);
  const finished = agents.filter((a) => a.done);
  const chipCount = shells.length + running.length;
  const chipKey = [...shells.map((s) => s.id), ...running.map((a) => a.toolId)].join();

  // One row: chips past its right edge hide (keeping their place) behind "+N more"
  const rowRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(Infinity);
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row || allOpen) return setFit(Infinity);
    const measure = () => {
      const n = [...row.children].findIndex(
        (c) => (c as HTMLElement).offsetLeft + (c as HTMLElement).offsetWidth > row.clientWidth
      );
      setFit(n < 0 ? Infinity : n);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [chipKey, allOpen]);
  const hidden = Math.max(0, chipCount - fit);

  if (!plan.length && !shells.length && !agents.length && !busy) return null;

  const agentChip = (a: (typeof agents)[number], inRow: boolean, hide = false) => (
    <button
      key={a.toolId}
      type="button"
      tabIndex={hide ? -1 : undefined}
      onClick={() =>
        setDetail(
          detail?.id === a.toolId
            ? null
            : { kind: 'agent', id: a.toolId, title: `${a.type}: ${a.description}` }
        )
      }
      aria-pressed={detail?.id === a.toolId}
      title={t.subAgent(a.type, a.description)}
      className={`${chip} ${inRow ? rowChip : ''} ${hide ? 'invisible' : ''} ${detail?.id === a.toolId ? 'border-blue-400 text-white bg-blue-500/15' : 'border-gray-700 text-gray-300 hover:border-gray-500'}`}
    >
      {a.done ? (
        <Bot
          size={11}
          aria-hidden
          className={`mt-0.5 shrink-0 ${a.isError ? 'text-red-400' : 'text-emerald-400'}`}
        />
      ) : (
        <Loader2
          size={11}
          aria-hidden
          className="mt-0.5 shrink-0 animate-spin motion-reduce:animate-none text-blue-300"
        />
      )}
      <span className={chipText(inRow && !allOpen)}>
        {a.type} · {a.description}
      </span>
    </button>
  );

  return (
    <div className="mb-2 space-y-1.5">
      {plan.length > 0 && (
        <div className="rounded-md border border-gray-800 bg-gray-900/70">
          <button
            type="button"
            onClick={() => setPlanOpen((o) => !o)}
            aria-expanded={planOpen}
            className="flex w-full items-center gap-1.5 px-2 py-1 text-xs text-gray-300 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"
          >
            <ChevronRight
              size={13}
              aria-hidden
              className={`transition-transform motion-reduce:transition-none ${planOpen ? 'rotate-90' : ''}`}
            />
            <ListChecks size={13} aria-hidden className="text-emerald-400" />
            {t.plan}
            <span className="text-gray-500 tabular-nums">
              {done}/{plan.length}
            </span>
          </button>
          {planOpen && (
            <ul className="max-h-40 overflow-y-auto px-2 pb-1.5 space-y-0.5" aria-label={t.plan}>
              {plan.map((item) => (
                <li key={item.id} className="flex items-start gap-1.5 text-xs">
                  {item.status === 'completed' ? (
                    <CheckSquare
                      size={13}
                      aria-label={t.planDone}
                      className="mt-px shrink-0 text-emerald-400"
                    />
                  ) : item.status === 'in_progress' ? (
                    <CircleDot
                      size={13}
                      aria-label={t.planInProgress}
                      className="mt-px shrink-0 text-blue-300"
                    />
                  ) : (
                    <Circle
                      size={13}
                      aria-label={t.planOpen}
                      className="mt-px shrink-0 text-gray-500"
                    />
                  )}
                  <span
                    className={
                      item.status === 'completed'
                        ? 'text-gray-500 line-through'
                        : item.status === 'in_progress'
                          ? 'text-gray-100 font-medium'
                          : 'text-gray-300'
                    }
                  >
                    {item.subject}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(chipCount > 0 || finished.length > 0) && (
        <div className="flex items-start gap-1.5">
          <div
            ref={rowRef}
            className={`relative flex min-w-0 flex-1 gap-1.5 ${allOpen ? 'flex-wrap' : 'overflow-hidden'}`}
          >
            {shells.map((s, i) => (
              <button
                key={s.id}
                type="button"
                tabIndex={i >= fit ? -1 : undefined}
                onClick={() =>
                  canPeekShell &&
                  setDetail(
                    detail?.id === s.id
                      ? null
                      : { kind: 'shell', id: s.id, title: s.description || s.command }
                  )
                }
                aria-pressed={detail?.id === s.id}
                title={t.backgroundShell(s.command)}
                className={`${chip} ${rowChip} ${i >= fit ? 'invisible' : ''} ${detail?.id === s.id ? 'border-blue-400 text-white bg-blue-500/15' : 'border-gray-700 text-gray-300 hover:border-gray-500'}`}
              >
                <SquareTerminal size={11} aria-hidden className="mt-0.5 shrink-0" />
                <span className={chipText(!allOpen)}>{s.description || s.command}</span>
              </button>
            ))}
            {running.map((a, i) => agentChip(a, true, shells.length + i >= fit))}
          </div>
          {(hidden > 0 || allOpen) && (
            <button
              type="button"
              onClick={() => setAllOpen((o) => !o)}
              aria-expanded={allOpen}
              className={`${chip} shrink-0 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200`}
            >
              {allOpen ? t.chipsLess : t.chipsMore(hidden)}
            </button>
          )}
          {finished.length > 0 && (
            <button
              type="button"
              onClick={() => setDoneOpen((o) => !o)}
              aria-expanded={doneOpen}
              className={`${chip} shrink-0 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200`}
            >
              <Bot size={11} aria-hidden className="mt-0.5 shrink-0 text-emerald-400" />
              {t.agentsDone(finished.length)}
            </button>
          )}
        </div>
      )}

      {doneOpen && finished.length > 0 && (
        <div
          role="group"
          aria-label={t.agentsDone(finished.length)}
          className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-gray-800 bg-gray-900/70 p-1.5"
        >
          {[...finished].reverse().map((a) => agentChip(a, false))}
        </div>
      )}

      {detail && (
        <div className="rounded-md border border-gray-700 bg-gray-900/90 p-2">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-300">
            {detail.kind === 'shell' ? (
              <SquareTerminal size={12} aria-hidden />
            ) : (
              <Bot size={12} aria-hidden />
            )}
            <span className="min-w-0 [overflow-wrap:anywhere]">{detail.title}</span>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="ml-auto p-0.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-blue-400"
              aria-label={t.close}
            >
              <X size={12} />
            </button>
          </div>
          {detail.kind === 'shell' ? (
            <ShellView chatId={chatId} shellId={detail.id} />
          ) : (
            <FollowBox dep={sub[detail.id]?.length} className="max-h-72">
              {(sub[detail.id] ?? []).length === 0 ? (
                <div className="text-xs text-gray-500">{t.noSubagentOutput}</div>
              ) : (
                sub[detail.id].map((b, i) => <AssistantBlock key={i} block={b} />)
              )}
            </FollowBox>
          )}
        </div>
      )}

      {busy && (
        <div className="rounded-md border border-blue-900/60 bg-gray-900/70">
          <button
            type="button"
            onClick={() => setWorkOpen((o) => !o)}
            aria-expanded={workOpen}
            className="flex w-full items-center gap-1.5 px-2 py-1 text-xs text-gray-300 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"
          >
            <ChevronRight
              size={13}
              aria-hidden
              className={`shrink-0 transition-transform motion-reduce:transition-none ${workOpen ? 'rotate-90' : ''}`}
            />
            <Loader2
              size={12}
              aria-hidden
              className="shrink-0 animate-spin motion-reduce:animate-none text-blue-300"
            />
            <span className="truncate min-w-0 font-mono text-gray-400">
              {stepLabel(steps[steps.length - 1], t)}
            </span>
            <span className="ml-auto shrink-0 text-gray-500 tabular-nums">
              {t.stepCount(steps.length)}
            </span>
          </button>
          {workOpen && (
            <FollowBox dep={steps} className="max-h-64 px-2 pb-1">
              {steps.map((b, i) => (
                <AssistantBlock key={i} block={b} />
              ))}
            </FollowBox>
          )}
        </div>
      )}
    </div>
  );
};
