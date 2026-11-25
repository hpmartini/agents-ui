import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Within this many px of its end a log follows new content */
export const FOLLOW_PX = 40;
/** A scroll up this long after the reader's wheel, key, drag or touch is theirs */
const READER_MS = 1500;
const SCROLL_KEYS = new Set(['PageUp', 'ArrowUp', 'Home', ' ']);

/**
 * Scroll of a chat log (main and thread): at its end (≤ FOLLOW_PX) it follows new content;
 * scrolled up, the first visible row stays where the reader left it through new messages,
 * streaming, images, a smaller log and older pages in front. Only the reader's own scroll
 * (wheel, keys, scrollbar drag, touch) decides between the two, never one of the browser's.
 * `unseen`: content arrived below while scrolled up (the "New messages" button), `toEnd` goes
 * back and follows again.
 * `keep` must run after every content change (layout effect); size changes are observed here.
 * `mount` changes when a new log element mounts: it starts at its end.
 */
export function useFollowLog(
  listRef: React.RefObject<HTMLElement | null>,
  contentRef: React.RefObject<HTMLElement | null>,
  mount?: unknown
) {
  const follow = useRef(true);
  // geometry at the last look, and the row the reader sees first with its offset from the top
  const last = useRef({ top: 0, height: 0, client: 0 });
  const anchor = useRef<{ row: Element; offset: number } | null>(null);
  const [unseen, setUnseen] = useState(false);
  // when the reader last moved the log (Infinity: dragging). The browser moves it too, e.g. it
  // clamps scrollTop while an input refits at height auto: that is never a scroll up
  const reader = useRef(-Infinity);
  const byReader = () => performance.now() - reader.current < READER_MS;

  const record = useCallback(
    (el: HTMLElement) => {
      last.current = { top: el.scrollTop, height: el.scrollHeight, client: el.clientHeight };
      anchor.current = null;
      if (follow.current) return;
      const top = el.getBoundingClientRect().top;
      const rows = contentRef.current?.children ?? [];
      for (const row of rows) {
        const box = row.getBoundingClientRect();
        if (box.bottom > top) {
          anchor.current = { row, offset: box.top - top };
          return;
        }
      }
    },
    [contentRef]
  );

  const keep = useCallback(() => {
    const el = listRef.current;
    // hidden (maximised threads, other tab): nothing to measure, the place is kept for later
    if (!el || !el.clientHeight) return;
    const prev = last.current;
    // a wheel or drag up whose scroll event has not come yet: the position tells
    if (
      follow.current &&
      byReader() &&
      el.scrollTop < prev.top - 2 &&
      el.scrollHeight - el.scrollTop - el.clientHeight > FOLLOW_PX
    )
      follow.current = false;
    if (follow.current) {
      el.scrollTop = el.scrollHeight;
    } else {
      // moved since the last look (logs have overflow-anchor: none, so only the reader moves
      // them): that is the place to keep
      if (Math.abs(el.scrollTop - prev.top) > 2 || !anchor.current) record(el);
      let shift = 0;
      const a = anchor.current;
      if (a?.row.isConnected) {
        shift = a.row.getBoundingClientRect().top - el.getBoundingClientRect().top - a.offset;
        if (Math.abs(shift) >= 1) el.scrollTop += shift;
      }
      // grown by more than what went in above the reader: new content below
      if (el.scrollHeight - prev.height > shift + 1) setUnseen(true);
    }
    record(el);
  }, [listRef, record]);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= FOLLOW_PX) {
      follow.current = true;
      setUnseen(false);
    } else if (byReader() && el.scrollTop < last.current.top - 2) {
      // only a scroll up lets go; layout shifts never move the top up (keep pins them back)
      follow.current = false;
    }
    record(el);
  }, [listRef, record]);

  // the wheel comes before the scroll it starts: content arriving in between must not pin it back
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const el = listRef.current;
      reader.current = performance.now();
      if (e.deltaY < 0 && el && el.scrollTop > 0 && follow.current) {
        follow.current = false;
        record(el);
      }
    },
    [listRef, record]
  );

  const toEnd = useCallback(() => {
    follow.current = true;
    setUnseen(false);
    keep();
  }, [keep]);

  /** Let go of the end without a scroll (a jump to an older prompt) */
  const release = useCallback(() => {
    follow.current = false;
  }, []);

  useLayoutEffect(() => {
    // the last look was at the old element: its scrollTop must not read as a scroll up
    last.current = { top: 0, height: 0, client: 0 };
    toEnd();
  }, [mount, toEnd]);
  useEffect(() => {
    const list = listRef.current;
    const content = contentRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(keep);
    // content: streaming, images, late heights; list: input, status line or pane resized
    observer.observe(list);
    if (content) observer.observe(content);
    return () => observer.disconnect();
  }, [mount, keep, listRef, contentRef]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const now = () => (reader.current = performance.now());
    const hold = () => (reader.current = Infinity);
    const letGo = () => reader.current === Infinity && now();
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      // keys typed into a field are no scroll
      if (SCROLL_KEYS.has(e.key) && !t?.closest('textarea, input, [contenteditable="true"]')) now();
    };
    list.addEventListener('pointerdown', hold);
    list.addEventListener('touchstart', hold, { passive: true });
    window.addEventListener('pointerup', letGo);
    window.addEventListener('pointercancel', letGo);
    window.addEventListener('touchend', letGo);
    window.addEventListener('touchcancel', letGo);
    window.addEventListener('keydown', key);
    return () => {
      list.removeEventListener('pointerdown', hold);
      list.removeEventListener('touchstart', hold);
      window.removeEventListener('pointerup', letGo);
      window.removeEventListener('pointercancel', letGo);
      window.removeEventListener('touchend', letGo);
      window.removeEventListener('touchcancel', letGo);
      window.removeEventListener('keydown', key);
    };
  }, [mount, listRef]);

  return { keep, onScroll, onWheel, toEnd, release, unseen };
}
