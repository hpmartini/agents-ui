import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fitHeight, useAutoGrowTextarea } from '../hooks/useAutoGrowTextarea';

describe('fitHeight (prompt field)', () => {
  const box = { min: 42, max: 320, pinned: null };
  it.each([
    [0, 42, false], // measured while hidden: still one full line, never padding-only
    [66, 66, false],
    [320, 320, false],
    [500, 320, true], // past the cap: scrollbar instead of clipped text
  ])('content %i -> height %i, scroll %s', (content, height, scroll) => {
    expect(fitHeight(content, box)).toEqual({ height, scroll });
  });

  it('a dragged (pinned) height wins, scrolls when the text is taller', () => {
    expect(fitHeight(66, { ...box, pinned: 200 })).toEqual({ height: 200, scroll: false });
    expect(fitHeight(500, { ...box, pinned: 200 })).toEqual({ height: 200, scroll: true });
    expect(fitHeight(66, { ...box, pinned: 10 })).toEqual({ height: 42, scroll: true });
  });
});

describe('useAutoGrowTextarea cap', () => {
  it('typed text grows the field only up to pinMax (40 % of a short pane), then scrolls', () => {
    const el = document.createElement('textarea');
    const size = { clientWidth: 300, scrollHeight: 480, offsetHeight: 0, clientHeight: 0 };
    for (const [k, v] of Object.entries(size)) Object.defineProperty(el, k, { value: v });
    const ref = { current: el };
    renderHook(() =>
      useAutoGrowTextarea(ref, 'many\nlines', { min: 42, max: 320, pinMax: () => 144 })
    );
    expect(el.style.height).toBe('144px');
    expect(el.style.overflowY).toBe('auto');
  });
});
