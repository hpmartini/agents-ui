import React from 'react';
import type { HandoffResetJob } from '../../transport';
import type { AgentSession } from '../../types';
import type { PaneMenuItem } from './PaneMenu';
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
    /** The notice opens with "Handoff + Reset failed." (not for an unknown state) */
    failedHeading: boolean;
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
export declare const canHandoffReset: (session: AgentSession) => boolean;
/**
 * State of one pane's Handoff + Reset: the last job (fetched once, then every 2 s while it is
 * active), the start / retry / cancel calls and whether the button shows. `enabled` false (the
 * pane is not the one on screen) fetches nothing and shows no button; `eligible` false (a harness
 * the server cannot reset) offers nothing at all.
 */
export declare function useHandoffReset(paneId: string, paneName: string, tokens: number | null | undefined, threshold: number, enabled?: boolean, eligible?: boolean): HandoffResetControl;
/**
 * Header button of Handoff + Reset: asks first when idle, shows the phase with a spinner while a
 * job runs (cancel beside it), and turns red after a failure. `compact` keeps the icon only, for
 * a pane with no room for the words; the phase stays in the tooltip and the accessible name.
 */
export declare const HandoffResetButton: React.FC<{
    control: HandoffResetControl;
    compact?: boolean;
    /** The header's buttons keep focus and pane state from changing between mousedown and click */
    onMouseDown?: React.MouseEventHandler<HTMLElement>;
}>;
/** The failure text under the pane header, readable in full, with Retry and Dismiss */
export declare const HandoffResetNotice: React.FC<{
    control: HandoffResetControl;
}>;
/** Confirm dialog of Handoff + Reset: what happens before anything starts */
export declare const HandoffResetDialog: React.FC<{
    control: HandoffResetControl;
}>;
