import React from 'react';
/** `width` within [min, max]; a max below min (container too small to know better) yields min */
export declare function clampWidth(width: number, min: number, max: number): number;
/**
 * A width kept in localStorage under `key` (none: memory only), clamped on every change. Read
 * once at mount; a broken or blocked store falls back to `initial`.
 */
export declare function useStoredWidth(key: string | null | undefined, initial: number, min: number, max: number): [number, (width: number) => void];
export interface ResizeHandleProps {
    width: number;
    min: number;
    max: number;
    onChange: (width: number) => void;
    /** Which edge of the resized box the handle sits on: `left` grows the box when dragged left */
    edge: 'left' | 'right';
    /** Accessible name, e.g. "Resize the agent list" */
    label: string;
    className?: string;
    /** Screen pixels per layout pixel, when the box sits under CSS zoom (default 1) */
    scale?: number;
}
/**
 * Drag handle for a box's width: pointer drag (captured, so a terminal under the pointer cannot
 * swallow the moves), arrow keys in 16 px steps, Home/End for min/max. A vertical separator.
 */
export declare const ResizeHandle: React.FC<ResizeHandleProps>;
