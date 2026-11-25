import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Within this many px of its end a log follows new content */
export const FOLLOW_PX = 40;
/** A scroll up this long after the reader's wheel, key, drag or touch is theirs */
const READER_MS = 1500;
/** After the reader's last wheel up the log is not pinned for this long: their scroll lands first */
const WHEEL_MS = 250;
/** A reconnect's history replays within this; the reader's place waits for it no longer */
const REPLAY_MS = 5000;
const SCROLL_KEYS = new Set(['PageUp', 'ArrowUp', 'Home', ' ']);

/**
 * Scroll of a chat log (main and thread): at its end (≤ FOLLOW_PX) it follows new content;
 * scrolled up, the first visible row stays where the reader left it through new messages,
 * streaming, images, a smaller log and older pages in front. Only the reader's own scroll
 * (wheel, keys, scrollbar drag, touch) decides between the two, never one of the browser's.
 * `unseen`: content arrived below while scrolled up (the "New messages" button), `toEnd` goes
 * back and follows again.
 * `keep` must run after every content change (layout effect); size changes are observed here.
 * `mount` changes when a new log element mounts: it starts at its end. A hidden log (another tab)
 * comes back where it was; `replay` before a reset whose history comes again keeps the place too.
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
  // the reader's wheel or drag while following: not pinned until it lands; judged against the
  // geometry when it started, so content arriving meanwhile never reads as their scroll
  const moving = useRef<{ top: number; gap: number } | null>(null);
  const wheelEnd = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // the log had no height (hidden): the browser may have dropped its offset
  const hidden = useRef(false);
  // a reset whose history comes again: the anchored row (by its key) is waited for
  const replaying = useRef(false);

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

  /** The reader's move since it started took them out of the zone: let go of the end */
  const judge = useCallback((el: HTMLElement) => {
    const m = moving.current;
    if (!m || !follow.current) return;
    if (m.gap + (m.top - el.scrollTop) > FOLLOW_PX) {
      follow.current = false;
      moving.current = null;
    }
  }, []);
  /** Shown again after hidden: a scrolled-up log goes back to where it was */
  const shown = useCallback((el: HTMLElement) => {
    if (!hidden.current) return;
    hidden.current = false;
    if (!follow.current) el.scrollTop = last.current.top;
  }, []);
  /** The anchored row again after a reset (a new element with the same key), else null */
  const refind = useCallback(() => {
    const key = anchor.current?.row.getAttribute('data-chat-key');
    if (!key) return null;
    return contentRef.current?.querySelector(`[data-chat-key="${CSS.escape(key)}"]`) ?? null;
  }, [contentRef]);

  const keep = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    // hidden (maximised threads, other tab): nothing to measure, the place is kept for later
    if (!el.clientHeight) {
      hidden.current = true;
      return;
    }
    shown(el);
    const prev = last.current;
    judge(el);
    // the reader's scroll has not landed yet: never pinned meanwhile
    if (follow.current && moving.current) return;
    // a key or drag up whose scroll event has not come yet: the position tells, measured against
    // the last look (content arriving since is no distance the reader went)
    if (
      follow.current &&
      byReader() &&
      el.scrollTop < prev.top - 2 &&
      prev.height - prev.client - el.scrollTop > FOLLOW_PX
    )
      follow.current = false;
    if (follow.current) {
      replaying.current = false;
      el.scrollTop = el.scrollHeight;
    } else {
      const a = anchor.current;
      if (replaying.current && a) {
        // its history is still coming: the place waits for the row and enough height below it
        const kept = a.row.isConnected;
        const row = kept ? a.row : refind();
        if (!row) return;
        a.row = row;
        const off = () =>
          row.getBoundingClientRect().top - el.getBoundingClientRect().top - a.offset;
        el.scrollTop += off();
        // the old row (reset not rendered yet) or too little height yet: the wait goes on
        if (kept || Math.abs(off()) >= 1) return;
        replaying.current = false;
        record(el);
        return;
      }
      if (Math.abs(el.scrollTop - prev.top) > 2 || !a) {
        // moved since the last look (logs have overflow-anchor: none, so only the reader moves
        // them): that is the place to keep
        record(el);
      }
      let shift = 0;
      if (anchor.current?.row.isConnected) {
        const a = anchor.current;
        shift = a.row.getBoundingClientRect().top - el.getBoundingClientRect().top - a.offset;
        if (Math.abs(shift) >= 1) el.scrollTop += shift;
      }
      // grown by more than what went in above the reader: new content below
      if (el.scrollHeight - prev.height > shift + 1) setUnseen(true);
    }
    record(el);
  }, [listRef, record, judge, shown, refind]);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (!el.clientHeight) {
      hidden.current = true;
      return;
    }
    shown(el);
    if (moving.current) {
      judge(el);
      // still in the zone: the end is taken again once the wheel is done
      if (follow.current) return;
    } else if (replaying.current && !byReader()) {
      // the reset emptied the log for a moment: no decision until its rows are back
      return;
    } else if (el.scrollHeight - el.scrollTop - el.clientHeight <= FOLLOW_PX) {
      follow.current = true;
      setUnseen(false);
    } else if (
      byReader() &&
      el.scrollTop < last.current.top - 2 &&
      last.current.height - last.current.client - el.scrollTop > FOLLOW_PX
    ) {
      // only the reader's scroll up out of the zone lets go; layout shifts never move the top up
      follow.current = false;
    }
    if (byReader()) replaying.current = false;
    record(el);
  }, [listRef, record, judge, shown]);

  // the wheel comes before the scroll it starts: until it lands the log is not pinned, and only
  // leaving the zone (from where the wheel started) lets go of the end
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const el = listRef.current;
      reader.current = performance.now();
      if (e.deltaY < 0 && el && el.scrollTop > 0 && follow.current) {
        const l = last.current;
        moving.current ??= { top: l.top, gap: Math.max(0, l.height - l.top - l.client) };
        clearTimeout(wheelEnd.current);
        wheelEnd.current = setTimeout(() => {
          moving.current = null;
          keep();
        }, WHEEL_MS);
      }
    },
    [listRef, keep]
  );

  const toEnd = useCallback(() => {
    follow.current = true;
    moving.current = null;
    replaying.current = false;
    setUnseen(false);
    keep();
  }, [keep]);

  /** Let go of the end without a scroll (a jump to an older prompt) */
  const release = useCallback(() => {
    follow.current = false;
    moving.current = null;
  }, []);

  /** Before a reset whose history comes again (a reconnect): a scrolled-up place waits for its row */
  const replayEnd = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const replay = useCallback(() => {
    replaying.current = !follow.current;
    clearTimeout(replayEnd.current);
    // a row that never comes back (it was on an older page) holds the place no longer than this
    replayEnd.current = setTimeout(() => (replaying.current = false), REPLAY_MS);
  }, []);

  useLayoutEffect(() => {
    // the last look was at the old element: its scrollTop must not read as a scroll up
    last.current = { top: 0, height: 0, client: 0 };
    hidden.current = false;
    toEnd();
  }, [mount, toEnd]);
  useEffect(
    () => () => {
      clearTimeout(wheelEnd.current);
      clearTimeout(replayEnd.current);
    },
    []
  );
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

  return { keep, onScroll, onWheel, toEnd, release, replay, unseen };
}
