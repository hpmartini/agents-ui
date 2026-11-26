import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AlertTriangle, Check, Loader2, RotateCcw, X } from 'lucide-react';
import { useTransport } from '../../host';
import { useLabels } from '../../labels';
import type { HandoffResetJob } from '../../transport';
import { ConfirmDialog } from './ConfirmDialog';
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
  /** The job's phase text for the button, null while idle */
  phaseLabel: string | null;
  /** Context size title (idle), phase or error text */
  title: string;
  phase: HandoffResetJob['phase'] | 'idle';
  /** Message to show with Retry / Dismiss; null when there is none */
  error: string | null;
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

/**
 * State of one pane's Handoff + Reset: the last job (fetched once, then every 2 s while it is
 * active), the start / retry / cancel calls and whether the button shows. `enabled` false (the
 * pane is not the one on screen) fetches nothing and shows no button.
 */
export function useHandoffReset(
  paneId: string,
  paneName: string,
  tokens: number | null | undefined,
  threshold: number,
  enabled = true
): HandoffResetControl {
  const t = useLabels().terminal;
  const api = useTransport().messaging;
  const start = api?.startHandoffReset;
  const fetchJob = api?.fetchHandoffReset;
  const cancelJob = api?.cancelHandoffReset;
  const supported = !!(start && fetchJob && cancelJob);
  const [job, setJob] = useState<HandoffResetJob | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [dismissed, setDismissed] = useState(() => readDismissed()[paneId] ?? 0);
  // re-renders once the "done" display runs out
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // once on mount (state survives a reload), again whenever the pane comes on screen
  useEffect(() => {
    if (!enabled || !fetchJob) return;
    let cancelled = false;
    fetchJob(paneId)
      .then((next) => !cancelled && setJob(next))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, fetchJob, paneId]);

  const active = isActive(job);
  useEffect(() => {
    if (!enabled || !fetchJob || !active) return;
    const timer = window.setInterval(() => {
      fetchJob(paneId)
        .then((next) => alive.current && setJob(next))
        .catch(() => {});
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, fetchJob, paneId, active]);

  const doneLeft =
    job?.phase === 'done' ? Math.max(0, DONE_SHOWN_MS - (Date.now() - job.updatedAt)) : 0;
  useEffect(() => {
    if (doneLeft <= 0) return;
    const timer = window.setTimeout(tick, doneLeft + 20);
    return () => window.clearTimeout(timer);
  }, [doneLeft, job?.updatedAt]);

  const run = useCallback(() => {
    if (!start) return;
    setStartError(null);
    start(paneId)
      .then((next) => alive.current && setJob(next))
      .catch((e: unknown) => {
        if (alive.current)
          setStartError(e instanceof Error && e.message ? e.message : t.handoffResetStartFailed);
      });
  }, [start, paneId, t.handoffResetStartFailed]);

  const jobError =
    job?.phase === 'error' && job.error !== CANCELLED && job.updatedAt > dismissed
      ? job.error || t.handoffResetFailed
      : null;
  const error = enabled ? (startError ?? jobError) : null;
  const over = typeof tokens === 'number' && tokens > threshold;
  const phase = job && (active || doneLeft > 0 || jobError) ? job.phase : 'idle';
  const failed = error !== null;
  const showButton = enabled && supported && (over || active || doneLeft > 0 || failed);
  const phaseLabel =
    active || doneLeft > 0
      ? t.handoffResetPhases[job!.phase as 'writing' | 'resetting' | 'continuing' | 'done']
      : failed
        ? t.handoffResetFailed
        : null;
  const title = failed
    ? `${t.handoffResetFailed}: ${error}`
    : active || doneLeft > 0
      ? `${t.handoffReset}: ${phaseLabel}`
      : typeof tokens === 'number'
        ? t.handoffResetContext(tokens, threshold)
        : t.handoffResetMenuTitle;

  const ask = () => setConfirming(true);
  return {
    supported,
    showButton,
    active,
    phaseLabel,
    title,
    phase: failed && !active ? 'error' : phase,
    error,
    confirming,
    ask,
    confirm: () => {
      setConfirming(false);
      run();
    },
    closeDialog: () => setConfirming(false),
    retry: run,
    dismiss: () => {
      setStartError(null);
      if (job) {
        writeDismissed(paneId, job.updatedAt);
        setDismissed(job.updatedAt);
      }
    },
    cancel: () => {
      cancelJob?.(paneId)
        .then((next) => alive.current && setJob(next))
        .catch(() => {});
    },
    paneName,
    menuItem: {
      label: t.handoffReset,
      title: t.handoffResetMenuTitle,
      icon: <RotateCcw size={12} />,
      run: ask,
      disabled: active,
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
  const { phase, active } = control;
  const label = control.phaseLabel ?? t.handoffReset;
  const tone = active
    ? TONE.active
    : phase === 'done'
      ? TONE.done
      : phase === 'error'
        ? TONE.error
        : TONE.idle;
  const icon = active ? (
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
        disabled={active || phase === 'done'}
        className={`${chip} ${tone}`}
        title={control.title}
        aria-label={label}
      >
        {icon}
        {!compact && <span className="whitespace-nowrap">{label}</span>}
      </button>
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
  if (!control.error || control.active) return null;
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
      <button
        type="button"
        onClick={control.retry}
        className={`${btn} border-red-300/50 hover:bg-red-500/20`}
      >
        {t.handoffResetRetry}
      </button>
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
