/** Within this many px of its end a log follows new content */
export declare const FOLLOW_PX = 40;
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
export declare function useFollowLog(listRef: React.RefObject<HTMLElement | null>, contentRef: React.RefObject<HTMLElement | null>, mount?: unknown): {
    keep: () => void;
    onScroll: () => void;
    onWheel: (e: React.WheelEvent) => void;
    toEnd: () => void;
    release: () => void;
    unseen: boolean;
};
