import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AlertTriangle, Check, Loader2, RotateCcw, X } from 'lucide-react';
import { useTransport } from '../../host';
import { useLabels } from '../../labels';
import type { HandoffResetJob } from '../../transport';
import { ConfirmDialog } from './ConfirmDialog';
import type { AgentSession } from '../../types';
import { sessionHarness, UI_VIEW_HARNESSES } from '../../utils/agentSessions';
import type { PaneMenuItem } from './PaneMenu';

/** While a job runs, its phase is fetched this often */
const POLL_MS = 2000;
/** A finished job stays on the button this long, then the pane header is as before */
const DONE_SHOWN_MS = 6000;
/** What a cancel leaves behind on the server; the user asked for it, so it is no error to show */
const CANCELLED = 'Cancelled';
const DISMISSED_KEY = 'agents-ui:handoff-dismissed';

const isActive = (job: HandoffResetJob | null): boolean =>
  job?.phase === 'writing' || job?.phase === 'resetting' || job?.phase === 'continuing';

/** Dismissed errors per pane (updatedAt of the job): a dismissed one stays gone after a reload */
const readDismissed = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '{}');
  } catch {
    return {};
  }
};
const writeDismissed = (paneId: string, updatedAt: number) => {
  try {
    localStorage.setItem(
      DISMISSED_KEY,
      JSON.stringify({ ...readDismissed(), [paneId]: updatedAt })
    );
  } catch {
    // storage unavailable: the dismissal holds until the page is reloaded
  }
};

export interface HandoffResetControl {
  /** The transport can run the action: the pane menu offers it */
  supported: boolean;
  /** The header button shows: above the threshold, or a job is running / just ended */
  showButton: boolean;
  /** A job is running: the button shows its phase and cancels instead of starting */
  active: boolean;
  /** A job is running or being started: nothing can start another */
  busy: boolean;
  /** The job's phase text for the button, null while idle */
  phaseLabel: string | null;
  /** Context size title (idle), phase or error text */
  title: string;
  phase: HandoffResetJob['phase'] | 'idle';
  /** Message to show with Retry / Dismiss; null when there is none */
  error: string | null;
  /** The notice offers Retry (not while the server is unreachable) */
  canRetry: boolean;
  confirming: boolean;
  ask: () => void;
  confirm: () => void;
  closeDialog: () => void;
  retry: () => void;
  dismiss: () => void;
  cancel: () => void;
  menuItem: PaneMenuItem;
  paneName: string;
}

/** The harnesses the server can reset (claude, omp, pi); a cloud session has no local pane to reset */
export const canHandoffReset = (session: AgentSession): boolean =>
  UI_VIEW_HARNESSES[sessionHarness(session)] && !session.ptyArgs?.includes('--cloud');

/** This many polls in a row failing: the server is not answering, the job's state is unknown */
const POLL_FAILS = 3;
const messageOf = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

/**
 * State of one pane's Handoff + Reset: the last job (fetched once, then every 2 s while it is
 * active), the start / retry / cancel calls and whether the button shows. `enabled` false (the
 * pane is not the one on screen) fetches nothing and shows no button; `eligible` false (a harness
 * the server cannot reset) offers nothing at all.
 */
export function useHandoffReset(
  paneId: string,
  paneName: string,
  tokens: number | null | undefined,
  threshold: number,
  enabled = true,
  eligible = true
): HandoffResetControl {
  const t = useLabels().terminal;
  const api = useTransport().messaging;
  const start = api?.startHandoffReset;
  const fetchJob = api?.fetchHandoffReset;
  const cancelJob = api?.cancelHandoffReset;
  const supported = eligible && !!(start && fetchJob && cancelJob);
  const [job, setJob] = useState<HandoffResetJob | null>(null);
  const jobRef = useRef<HandoffResetJob | null>(null);
  // bumped by every start / cancel: an answer to a fetch issued before it is stale and dropped
  const epoch = useRef(0);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  // what the user should know: a refused start, a failed cancel, a job the server lost
  const [problem, setProblem] = useState<string | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const failures = useRef(0);
  const [confirming, setConfirming] = useState(false);
  const [dismissed, setDismissed] = useState(() => readDismissed()[paneId] ?? 0);
  const doneSeen = useRef<{ updatedAt: number; until: number } | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Takes a job from the server unless it is older than the one held; a job that vanished is lost */
  const accept = useCallback(
    (next: HandoffResetJob | null, issuedAt?: number) => {
      if (!alive.current || (issuedAt !== undefined && issuedAt !== epoch.current)) return;
      const prev = jobRef.current;
      if (next && prev && next.updatedAt < prev.updatedAt) return;
      if (!next && isActive(prev)) setProblem(t.handoffResetLost);
      jobRef.current = next;
      setJob(next);
    },
    [t.handoffResetLost]
  );

  // once on mount (state survives a reload), again whenever the pane comes on screen
  useEffect(() => {
    if (!enabled || !fetchJob) return;
    const issued = epoch.current;
    fetchJob(paneId)
      .then((next) => accept(next, issued))
      .catch(() => {});
  }, [enabled, fetchJob, paneId, accept]);

  const active = isActive(job);
  useEffect(() => {
    if (!enabled || !fetchJob || !active) return;
    const timer = window.setInterval(() => {
      const issued = epoch.current;
      fetchJob(paneId)
        .then((next) => {
          failures.current = 0;
          if (alive.current) setUnreachable(false);
          accept(next, issued);
        })
        .catch(() => {
          failures.current += 1;
          if (alive.current && failures.current >= POLL_FAILS) setUnreachable(true);
        });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, fetchJob, paneId, active, accept]);

  // the server moved on: an earlier refusal no longer describes the pane
  const phaseNow = job?.phase;
  useEffect(() => {
    if (
      phaseNow === 'writing' ||
      phaseNow === 'resetting' ||
      phaseNow === 'continuing' ||
      phaseNow === 'done'
    )
      setProblem(null);
  }, [phaseNow, job?.startedAt]);
  useEffect(() => {
    if (!active) {
      failures.current = 0;
      setUnreachable(false);
    }
  }, [active]);

  // "Done" shows for a while from the moment this client first sees it (the server's clock is not ours),
  // then counts as seen: a reload does not bring it back
  const doneJob = job?.phase === 'done' && job.updatedAt > dismissed ? job : null;
  if (doneJob && doneSeen.current?.updatedAt !== doneJob.updatedAt)
    doneSeen.current = { updatedAt: doneJob.updatedAt, until: Date.now() + DONE_SHOWN_MS };
  const doneAt = doneJob?.updatedAt;
  const doneLeft =
    doneJob && doneSeen.current ? Math.max(0, doneSeen.current.until - Date.now()) : 0;
  useEffect(() => {
    if (doneAt === undefined) return;
    const left = Math.max(0, (doneSeen.current?.until ?? 0) - Date.now());
    const timer = window.setTimeout(() => {
      writeDismissed(paneId, doneAt);
      setDismissed(doneAt);
    }, left + 20);
    return () => window.clearTimeout(timer);
  }, [doneAt, paneId]);

  const run = useCallback(() => {
    if (!start || startingRef.current || isActive(jobRef.current)) return;
    startingRef.current = true;
    setStarting(true);
    setProblem(null);
    epoch.current += 1;
    start(paneId)
      .then((next) => {
        epoch.current += 1;
        accept(next);
      })
      .catch((e: unknown) => {
        if (alive.current) setProblem(messageOf(e, t.handoffResetStartFailed));
      })
      .finally(() => {
        startingRef.current = false;
        if (alive.current) setStarting(false);
      });
  }, [start, paneId, accept, t.handoffResetStartFailed]);

  const jobError =
    job?.phase === 'error' && job.error !== CANCELLED && job.updatedAt > dismissed
      ? job.error || t.handoffResetFailed
      : null;
  const busy = active || starting;
  const error = enabled
    ? (problem ?? jobError ?? (unreachable ? t.handoffResetUnreachable : null))
    : null;
  const over = typeof tokens === 'number' && tokens > threshold;
  const showsJob = job && (active || doneLeft > 0);
  const failed = error !== null;
  const showButton = enabled && supported && (over || busy || doneLeft > 0 || failed);
  const phase = busy
    ? active
      ? job!.phase
      : 'writing'
    : failed
      ? 'error'
      : doneLeft > 0
        ? 'done'
        : 'idle';
  const phaseLabel =
    busy || doneLeft > 0
      ? t.handoffResetPhases[
          (showsJob ? job.phase : 'writing') as keyof typeof t.handoffResetPhases
        ]
      : failed
        ? t.handoffResetFailed
        : null;
  const title =
    busy || doneLeft > 0
      ? `${t.handoffReset}: ${phaseLabel}`
      : failed
        ? `${t.handoffResetFailed}: ${error}`
        : typeof tokens === 'number'
          ? t.handoffResetContext(tokens, threshold)
          : t.handoffResetMenuTitle;

  const ask = () => setConfirming(true);
  return {
    supported,
    showButton,
    active,
    busy,
    phaseLabel,
    title,
    phase,
    error,
    // an unreachable server says nothing about the job: starting another one would be a guess
    canRetry: error !== null && !active && error !== t.handoffResetUnreachable,
    confirming,
    ask,
    confirm: () => {
      setConfirming(false);
      run();
    },
    closeDialog: () => setConfirming(false),
    retry: run,
    dismiss: () => {
      setProblem(null);
      setUnreachable(false);
      failures.current = 0;
      if (job && job.phase === 'error') {
        writeDismissed(paneId, job.updatedAt);
        setDismissed(job.updatedAt);
      }
    },
    cancel: () => {
      epoch.current += 1;
      cancelJob?.(paneId)
        .then((next) => accept(next))
        .catch((e: unknown) => {
          if (alive.current) setProblem(messageOf(e, t.handoffResetCancelFailed));
        });
    },
    paneName,
    menuItem: {
      label: t.handoffReset,
      title: t.handoffResetMenuTitle,
      icon: <RotateCcw size={12} />,
      run: ask,
      disabled: busy,
    },
  };
}

const chip =
  'inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-md border text-[11px] focus-visible:outline-2 focus-visible:outline-blue-400 disabled:cursor-default';
const TONE = {
  idle: 'text-amber-100 bg-amber-500/15 border-amber-400/40 hover:bg-amber-500/25',
  active: 'text-blue-100 bg-blue-500/15 border-blue-400/40',
  done: 'text-emerald-100 bg-emerald-500/15 border-emerald-400/40',
  error: 'text-red-100 bg-red-500/15 border-red-400/40 hover:bg-red-500/25',
} as const;

/**
 * Header button of Handoff + Reset: asks first when idle, shows the phase with a spinner while a
 * job runs (cancel beside it), and turns red after a failure. `compact` keeps the icon only, for
 * a pane with no room for the words; the phase stays in the tooltip and the accessible name.
 */
export const HandoffResetButton: React.FC<{
  control: HandoffResetControl;
  compact?: boolean;
  /** The header's buttons keep focus and pane state from changing between mousedown and click */
  onMouseDown?: React.MouseEventHandler<HTMLElement>;
}> = ({ control, compact, onMouseDown }) => {
  const t = useLabels().terminal;
  if (!control.showButton) return null;
  const { phase, active, busy } = control;
  const label = control.phaseLabel ?? t.handoffReset;
  const tone = busy
    ? TONE.active
    : phase === 'done'
      ? TONE.done
      : phase === 'error'
        ? TONE.error
        : TONE.idle;
  const icon = busy ? (
    <Loader2 size={11} aria-hidden className="animate-spin motion-reduce:animate-none" />
  ) : phase === 'done' ? (
    <Check size={11} aria-hidden />
  ) : phase === 'error' ? (
    <AlertTriangle size={11} aria-hidden />
  ) : (
    <RotateCcw size={11} aria-hidden />
  );
  return (
    <span className="inline-flex items-center shrink-0 gap-0.5" data-handoff-reset={phase}>
      <button
        type="button"
        onClick={control.ask}
        onMouseDown={onMouseDown}
        disabled={control.busy || phase === 'done'}
        className={`${chip} ${tone}`}
        title={control.title}
        aria-label={label}
      >
        {icon}
        {!compact && <span className="whitespace-nowrap">{label}</span>}
      </button>
      {/* announces phase changes: a label change on a button is not read out */}
      <span role="status" className="sr-only">
        {busy || phase === 'done' ? label : ''}
      </span>
      {active && (
        <button
          type="button"
          onClick={control.cancel}
          onMouseDown={onMouseDown}
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-blue-400"
          title={t.handoffResetCancel}
          aria-label={t.handoffResetCancel}
        >
          <X size={12} aria-hidden />
        </button>
      )}
    </span>
  );
};

/** The failure text under the pane header, readable in full, with Retry and Dismiss */
export const HandoffResetNotice: React.FC<{ control: HandoffResetControl }> = ({ control }) => {
  const t = useLabels().terminal;
  if (!control.error) return null;
  const btn =
    'px-2 py-0.5 rounded border text-[11px] focus-visible:outline-2 focus-visible:outline-blue-400';
  return (
    <div
      role="alert"
      className="flex items-start gap-2 shrink-0 px-3 py-1.5 border-b border-red-400/30 bg-red-500/10 text-xs text-red-100"
    >
      <AlertTriangle size={13} aria-hidden className="mt-0.5 shrink-0 text-red-300" />
      <span className="min-w-0 flex-1 break-words">
        <span className="font-medium">{t.handoffResetFailed}.</span> {control.error}
      </span>
      {control.canRetry && (
        <button
          type="button"
          onClick={control.retry}
          disabled={control.busy}
          className={`${btn} border-red-300/50 hover:bg-red-500/20 disabled:opacity-50`}
        >
          {t.handoffResetRetry}
        </button>
      )}
      <button
        type="button"
        onClick={control.dismiss}
        className={`${btn} border-transparent text-red-200 hover:bg-red-500/20`}
      >
        {t.handoffResetDismiss}
      </button>
    </div>
  );
};

/** Confirm dialog of Handoff + Reset: what happens before anything starts */
export const HandoffResetDialog: React.FC<{ control: HandoffResetControl }> = ({ control }) => {
  const t = useLabels().terminal;
  if (!control.confirming) return null;
  return (
    <ConfirmDialog
      title={t.handoffResetConfirmTitle(control.paneName)}
      body={t.handoffResetConfirmBody}
      confirm={t.handoffReset}
      tone="primary"
      onConfirm={control.confirm}
      onCancel={control.closeDialog}
    />
  );
};
