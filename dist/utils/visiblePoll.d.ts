/**
 * Client polls that cost nothing while nobody looks: every request here makes the server start
 * processes (claude, git, gh, lsof), so a hidden tab or minimized window must not keep asking.
 */
/**
 * Calls `fn` every `ms` while the page is visible. While hidden (another tab, minimized window)
 * nothing runs; on return `fn` runs at once and the interval starts over.
 * `immediate`: run right away when started on a visible page (else first after `ms`).
 * @returns stop
 */
export declare function pollWhileVisible(fn: () => void, ms: number, { immediate }?: {
    immediate?: boolean;
}): () => void;
export interface Throttle {
    call(): void;
    /** Drop a pending run */
    cancel(): void;
}
/**
 * Runs `fn` at most once per `ms`: the first call runs at once, calls within the gap collapse
 * into one run when it ends.
 */
export declare function createThrottle(fn: () => void, ms: number): Throttle;
