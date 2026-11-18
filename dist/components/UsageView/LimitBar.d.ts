import React from 'react';
import type { UsageWindow } from './types';
interface LimitBarProps {
    label: string;
    window: UsageWindow | null | undefined;
    /** Text shown instead of a number when the value is unknown */
    unknownText?: string;
    compact?: boolean;
    /** Section borders in % (e.g. weekdays); dividers only, the fill stays one bar */
    ticks?: number[];
    /** Thin marker in %, e.g. where today sits in the week */
    marker?: number;
    markerLabel?: string;
    now?: number;
}
/** One plan-limit window: % used + reset countdown. Never shows a number it does not have. */
export declare const LimitBar: React.FC<LimitBarProps>;
export {};
