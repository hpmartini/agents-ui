import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GitBranch } from 'lucide-react';
import { useTransport } from '../../../host';
import { useLabels } from '../../../labels';
import type { ChatStatus } from '../../../transport';
import { cacheCountdown, formatTokens } from '../../../utils/agentCache';
import { CacheBadge } from '../CacheBadge';
import { LimitBar } from '../../UsageView/LimitBar';
import { WEEK_TICKS, weekPace } from '../../../utils/usage';
import { pollWhileVisible } from '../../../utils/visiblePoll';

const POLL_MS = 15_000;

/**
 * TUI-like status line: branch with untracked (?) / changed (±) counts, prompt cache and
 * context, 5h / 7d plan limits. Refreshes while visible and after each finished turn.
 */
export const ChatStatusLine: React.FC<{
  chatId: string;
  turns: number;
  visible: boolean;
  /** Model × effort picker of the session, shown under the branch */
  picker?: React.ReactNode;
}> = ({ chatId, turns, visible, picker }) => {
  const [status, setStatus] = useState<ChatStatus | null>(null);
  // the pane, not the viewport, decides the columns: a narrow split pane stacks them
  const [width, setWidth] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const boxRef = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el || typeof ResizeObserver === 'undefined') return;
    observer.current = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.current.observe(el);
  }, []);
  const chat = useTransport().chat;
  const t = useLabels().terminal;

  useEffect(() => {
    const fetchStatus = chat?.fetchChatStatus;
    if (!fetchStatus) return;
    let cancelled = false;
    const load = () =>
      fetchStatus(chatId)
        .then((s) => !cancelled && setStatus(s))
        .catch(() => {
          // keep the last status; the chat itself reports a gone session
        });
    // an inactive pane loads once (its chip and usage show), only the active one polls
    if (!visible) {
      load();
      return () => {
        cancelled = true;
      };
    }
    const stop = pollWhileVisible(load, POLL_MS);
    return () => {
      cancelled = true;
      stop();
    };
  }, [chat, chatId, turns, visible]);

  if (!status) return null;
  const { git, cache, context, limits } = status;
  const cold = cache && cacheCountdown(cache, Date.now()).expired;
  const fill = context ? Math.min(100, (context.tokens / context.window) * 100) : 0;

  return (
    <div
      ref={boxRef}
      data-chat-status
      className={`mt-2 grid ${
        width && width < 400
          ? 'grid-cols-1'
          : width && width < 640
            ? 'grid-cols-[auto_minmax(0,1fr)]'
            : 'grid-cols-2 sm:grid-cols-[auto_minmax(9rem,1fr)_minmax(6rem,0.6fr)_minmax(9rem,1fr)]'
      } items-end gap-x-4 gap-y-2 text-xs text-gray-300`}
    >
      <div className="flex flex-col items-start gap-1.5 self-center min-w-0">
        {git?.branch && (
          <span
            className="flex items-center gap-1.5 font-mono"
            title={t.gitTitle(git.untracked, git.changed, git.ahead, git.behind)}
          >
            <GitBranch size={13} aria-hidden className="text-gray-400" />
            <span className="text-gray-100 font-medium">{git.branch}</span>
            {git.untracked > 0 && <span className="text-amber-300">?{git.untracked}</span>}
            {git.changed > 0 && <span className="text-sky-300">±{git.changed}</span>}
            {git.ahead > 0 && <span className="text-emerald-300">↑{git.ahead}</span>}
            {git.behind > 0 && <span className="text-red-300">↓{git.behind}</span>}
            {!git.untracked && !git.changed && <span className="text-emerald-400">✓</span>}
          </span>
        )}
        {picker}
      </div>
      {context ? (
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-gray-400">{t.context}</span>
            <span className="tabular-nums text-gray-100">
              {formatTokens(context.tokens)} / {formatTokens(context.window)} · {Math.round(fill)} %
            </span>
          </div>
          <div
            role="meter"
            aria-label={t.contextFill}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(fill)}
            className="mt-1 h-2 rounded-full bg-gray-800 overflow-hidden"
          >
            <div
              className={`h-full rounded-full ${fill > 80 ? 'bg-red-500' : fill > 60 ? 'bg-yellow-500' : 'bg-sky-500'} transition-[width] duration-300 motion-reduce:transition-none`}
              style={{ width: `${fill}%` }}
            />
          </div>
          {cache && (
            <div className="mt-1 text-[11px] text-gray-500">
              {cold ? (
                <span title={t.cacheColdTitle}>{t.cacheCold}</span>
              ) : (
                <CacheBadge cache={cache} context={false} />
              )}
            </div>
          )}
        </div>
      ) : (
        <span />
      )}
      {limits ? (
        <>
          {limits.fiveHour ? (
            <LimitBar label={t.limitFiveHours} window={limits.fiveHour} unknownText="–" />
          ) : (
            <span />
          )}
          <LimitBar
            label={t.limitWeek}
            window={limits.weekly}
            unknownText="–"
            ticks={WEEK_TICKS}
            marker={weekPace()}
            markerLabel={t.today}
          />
        </>
      ) : null}
    </div>
  );
};
