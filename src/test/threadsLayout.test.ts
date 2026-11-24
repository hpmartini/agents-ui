import { describe, expect, it } from 'vitest';
import { CHAT_MAIN_MIN, threadsLayout } from '../components/AgentsView/Chat/ChatPane';

describe('threadsLayout (panel beside or over the main chat)', () => {
  it('beside: the main chat keeps its minimum, the panel at most 640', () => {
    expect(threadsLayout(1280)).toEqual({ overlay: false, min: 300, max: 640 });
    expect(threadsLayout(860)).toEqual({ overlay: false, min: 300, max: 860 - CHAT_MAIN_MIN - 1 });
    expect(threadsLayout(CHAT_MAIN_MIN + 301)).toEqual({ overlay: false, min: 300, max: 300 });
  });
  it('a pane too narrow for both: drawer over the chat, its handle clear of the split divider', () => {
    expect(threadsLayout(CHAT_MAIN_MIN + 300)).toEqual({
      overlay: true,
      min: 300,
      max: CHAT_MAIN_MIN + 300 - 24,
    });
    expect(threadsLayout(423)).toEqual({ overlay: true, min: 300, max: 399 });
    expect(threadsLayout(200)).toEqual({ overlay: true, min: 176, max: 176 });
  });
  it('not measured yet: beside with the plain limits', () => {
    expect(threadsLayout(0)).toEqual({ overlay: false, min: 300, max: 640 });
  });
});
