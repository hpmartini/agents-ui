import React, { useCallback, useLayoutEffect, useState } from 'react';

const STEP = 24; // one line of leading-6

/**
 * Height for a prompt textarea: auto-grows with its content between min and max, or the
 * height the user dragged (pinned) when set. Scrolls once the content is taller.
 */
export function fitHeight(
  content: number,
  { min, max, pinned }: { min: number; max: number; pinned: number | null }
) {
  const height = pinned ? Math.max(min, pinned) : Math.min(Math.max(content, min), max);
  return { height, scroll: content > height };
}

function readPinned(key?: string): number | null {
  if (!key) return null;
  try {
    const n = Number(localStorage.getItem(key));
    return n > 0 ? n : null;
  } catch {
    return null;
  }
}

function savePinned(key: string | undefined, value: number | null) {
  if (!key) return;
  try {
    if (value) localStorage.setItem(key, String(Math.round(value)));
    else localStorage.removeItem(key);
  } catch {
    // height stays for this page only
  }
}

/**
 * Keeps a textarea's height fitted to its wrapped content. It re-measures on every value
 * change and on every width change: the wrap depends on the width, and a textarea measured
 * while hidden (other tab, session switch) reports scrollHeight 0 and stayed padding-high.
 * Returns props for a drag handle that pins the height (remembered under storageKey);
 * double-click, Delete or Backspace on the handle goes back to auto-grow.
 */
export function useAutoGrowTextarea(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  {
    min,
    max,
    storageKey,
    pinMax,
  }: {
    min: number;
    max: number;
    storageKey?: string;
    /** Tallest the field may be, dragged or grown by typing, read at use (default 70 % of the window) */
    pinMax?: (el: HTMLTextAreaElement) => number;
  }
) {
  const [pinned, setPinned] = useState(() => readPinned(storageKey));
  const capOf = useCallback(
    (el: HTMLTextAreaElement | null) =>
      Math.max(min, el && pinMax ? pinMax(el) : window.innerHeight * 0.7),
    [min, pinMax]
  );

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el || !el.clientWidth) return; // hidden: the ResizeObserver fits it once it shows
    const cap = capOf(el); // before 'auto': a cap read from the layout needs the current height
    el.style.height = 'auto';
    // border-box: scrollHeight excludes the border, so add it or the text scrolls by 2px
    const content = el.scrollHeight + el.offsetHeight - el.clientHeight;
    // a stored height above the cap (smaller pane or window since) shows capped, stays stored
    // an empty field shows its whole placeholder: the cap is for typed text
    const floor = el.value ? min : Math.max(min, content);
    const { height, scroll } = fitHeight(content, {
      min: floor,
      max: el.value ? Math.min(max, cap) : Math.max(max, floor),
      pinned: pinned === null ? null : Math.max(Math.min(pinned, cap), floor),
    });
    el.style.height = `${height}px`;
    el.style.overflowY = scroll ? 'auto' : 'hidden';
    // a refit field that scrolls keeps the caret in view when it sits at the end
    if (scroll && document.activeElement === el && el.selectionEnd === el.value.length)
      el.scrollTop = el.scrollHeight;
  }, [ref, min, max, pinned, capOf]);

  useLayoutEffect(fit, [fit, value]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let width = -1;
    let frame = 0;
    const observer = new ResizeObserver((entries) => {
      // the field: only width changes matter, fit() itself changes its height
      if (entries?.every((e) => e.target === el) && el.clientWidth === width) return;
      width = el.clientWidth;
      // next frame: the containers settle first (a panel leaving its short layout
      // resizes the section after the pane) and no observer loop
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    });
    observer.observe(el);
    // pane and section: when either gets shorter (divider, window, panel layout) the cap
    // drops, so refit on any change of theirs
    for (const box of [el.closest('[data-chat-pane]'), el.closest('section')])
      if (box) observer.observe(box);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ref, fit]);

  const pin = useCallback(
    (next: number | null) => {
      const clamped = next === null ? null : Math.min(Math.max(next, min), capOf(ref.current));
      setPinned(clamped);
      savePinned(storageKey, clamped);
    },
    [min, storageKey, capOf, ref]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.button !== 0) return;
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = el.offsetHeight;
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    // The handle sits above the field at the bottom of the pane: dragging up makes it taller
    const move = (ev: { clientY: number }) => pin(startHeight + startY - ev.clientY);
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const current = ref.current?.offsetHeight ?? min;
    if (e.key === 'ArrowUp') pin(current + STEP);
    else if (e.key === 'ArrowDown') pin(current - STEP);
    else if (e.key === 'Delete' || e.key === 'Backspace') pin(null);
    else return;
    e.preventDefault();
  };

  return {
    pinned: pinned !== null,
    handleProps: {
      role: 'separator',
      'aria-orientation': 'horizontal' as const,
      'aria-label': 'Resize input (double-click: fit to text)',
      'aria-valuenow': pinned ?? undefined,
      tabIndex: 0,
      title: pinned
        ? 'Drag to resize · double-click: fit to text again'
        : 'Drag to resize · grows with the text by itself',
      onPointerDown,
      onKeyDown,
      onDoubleClick: () => pin(null),
    },
  };
}
