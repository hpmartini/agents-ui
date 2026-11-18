/** Keeps a fixed-position menu of size w×h, anchored at (x, y), inside a vw×vh viewport with `margin` px to every edge. */
export declare function clampMenuPosition(x: number, y: number, w: number, h: number, vw: number, vh: number, margin?: number): {
    left: number;
    top: number;
};
