import React from 'react';
/**
 * Height for a prompt textarea: auto-grows with its content between min and max, or the
 * height the user dragged (pinned) when set. Scrolls once the content is taller.
 */
export declare function fitHeight(content: number, { min, max, pinned }: {
    min: number;
    max: number;
    pinned: number | null;
}): {
    height: number;
    scroll: boolean;
};
/**
 * Keeps a textarea's height fitted to its wrapped content. It re-measures on every value
 * change and on every width change: the wrap depends on the width, and a textarea measured
 * while hidden (other tab, session switch) reports scrollHeight 0 and stayed padding-high.
 * Returns props for a drag handle that pins the height (remembered under storageKey);
 * double-click, Delete or Backspace on the handle goes back to auto-grow.
 */
export declare function useAutoGrowTextarea(ref: React.RefObject<HTMLTextAreaElement | null>, value: string, { min, max, storageKey, pinMax, }: {
    min: number;
    max: number;
    storageKey?: string;
    /** Tallest the field may be, dragged or grown by typing, read at use (default 70 % of the window) */
    pinMax?: (el: HTMLTextAreaElement) => number;
}): {
    pinned: boolean;
    handleProps: {
        role: string;
        'aria-orientation': "horizontal";
        'aria-label': string;
        'aria-valuenow': number | undefined;
        tabIndex: number;
        title: string;
        onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
        onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
        onDoubleClick: () => void;
    };
};
