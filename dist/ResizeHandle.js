import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
/** `width` within [min, max]; a max below min (container too small to know better) yields min */
export function clampWidth(width, min, max) {
    return Math.max(min, Math.min(width, max));
}
const STEP = 16;
/**
 * A width kept in localStorage under `key` (none: memory only), clamped on every change. Read
 * once at mount; a broken or blocked store falls back to `initial`.
 */
export function useStoredWidth(key, initial, min, max) {
    const [width, setWidth] = useState(() => {
        if (!key)
            return initial;
        try {
            const stored = Number(localStorage.getItem(key));
            return Number.isFinite(stored) && stored > 0 ? stored : initial;
        }
        catch {
            return initial;
        }
    });
    useEffect(() => {
        if (!key)
            return;
        try {
            localStorage.setItem(key, String(width));
        }
        catch {
            // storage full or blocked: the width just is not remembered
        }
    }, [key, width]);
    return [clampWidth(width, min, max), (next) => setWidth(Math.round(clampWidth(next, min, max)))];
}
/**
 * Drag handle for a box's width: pointer drag (captured, so a terminal under the pointer cannot
 * swallow the moves), arrow keys in 16 px steps, Home/End for min/max, double click resets.
 * A vertical separator.
 */
export const ResizeHandle = ({ width, min, max, onChange, edge, label, className = '', scale = 1, onReset, }) => {
    const drag = useRef(null);
    const [dragging, setDragging] = useState(false);
    const [hover, setHover] = useState(false);
    const sign = edge === 'right' ? 1 : -1;
    const set = (next) => onChange(clampWidth(next, min, max));
    const hot = dragging || hover;
    const still = typeof window !== 'undefined' &&
        !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Inline, not only in styles.css: hosts that skip the package stylesheet (Orkumo) got a 0 px handle
    return (_jsx("div", { style: {
            position: 'relative',
            flex: 'none',
            alignSelf: 'stretch',
            width: 9,
            margin: '0 -4px',
            zIndex: 5,
            cursor: 'col-resize',
            touchAction: 'none',
            outline: 'none',
        }, onPointerEnter: () => setHover(true), onPointerLeave: () => setHover(false), onFocus: () => setHover(true), onBlur: () => setHover(false), role: "separator", "aria-orientation": "vertical", "aria-label": label, "aria-valuenow": width, "aria-valuemin": min, "aria-valuemax": Math.max(min, max), tabIndex: 0, title: label, "data-dragging": dragging || undefined, className: `ag-resize-handle ${className}`, onPointerDown: (e) => {
            if (e.button !== undefined && e.button !== 0)
                return;
            e.preventDefault();
            e.currentTarget.setPointerCapture?.(e.pointerId);
            drag.current = { x: e.clientX, width };
            setDragging(true);
        }, onPointerMove: (e) => {
            const start = drag.current;
            if (start)
                set(start.width + (sign * (e.clientX - start.x)) / scale);
        }, onPointerUp: (e) => {
            drag.current = null;
            setDragging(false);
            e.currentTarget.releasePointerCapture?.(e.pointerId);
        }, onDoubleClick: onReset, onPointerCancel: () => {
            drag.current = null;
            setDragging(false);
        }, onKeyDown: (e) => {
            const by = { ArrowRight: STEP * sign, ArrowLeft: -STEP * sign }[e.key];
            if (by !== undefined)
                set(width + by);
            else if (e.key === 'Home')
                set(min);
            else if (e.key === 'End')
                set(max);
            else
                return;
            e.preventDefault();
        }, children: _jsx("span", { "aria-hidden": true, style: {
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: hot ? 3 : 4,
                right: hot ? 3 : 4,
                background: hot ? 'var(--agents-accent, #8fd0ff)' : 'var(--agents-border, #4f67a0)',
                transition: still ? 'none' : 'background-color 120ms, left 120ms, right 120ms',
                pointerEvents: 'none',
            } }) }));
};
