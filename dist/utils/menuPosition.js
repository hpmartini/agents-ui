/** Keeps a fixed-position menu of size w×h, anchored at (x, y), inside a vw×vh viewport with `margin` px to every edge. */
export function clampMenuPosition(x, y, w, h, vw, vh, margin = 8) {
    return {
        left: Math.max(margin, Math.min(x, vw - margin - w)),
        top: Math.max(margin, Math.min(y, vh - margin - h)),
    };
}
