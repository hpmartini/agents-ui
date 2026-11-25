import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Within this many px of its end a log follows new content */
export const FOLLOW_PX = 40;

/**
 * Scroll of a chat log (main and thread): at its end (≤ FOLLOW_PX) it follows new content;
 * scrolled up, the first visible row stays where the reader left it through new messages,
 * streaming, images, a smaller log and older pages in front. Only the reader's own scroll
 * decides between the two, never the height after a change. `unseen`: content arrived below
 * while scrolled up (the "New messages" button), `toEnd` goes back and follows again.
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
    } else if (el.scrollTop < last.current.top - 2) {
      // only a scroll up lets go; layout shifts never move the top up (keep pins them back)
      follow.current = false;
    }
    record(el);
  }, [listRef, record]);

  // the wheel comes before the scroll it starts: content arriving in between must not pin it back
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const el = listRef.current;
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

  useLayoutEffect(toEnd, [mount, toEnd]);
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

  return { keep, onScroll, onWheel, toEnd, release, unseen };
}
