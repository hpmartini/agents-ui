import { describe, expect, it } from 'vitest';
import { CHAT_MAIN_MIN, threadsLayout } from '../components/AgentsView/Chat/ChatPane';

describe('threadsLayout (panel beside or over the main chat)', () => {
  it('beside: the main chat keeps its minimum, the panel at most 640', () => {
    expect(threadsLayout(1280)).toEqual({ overlay: false, min: 240, max: 640 });
    expect(threadsLayout(760)).toEqual({ overlay: false, min: 240, max: 760 - CHAT_MAIN_MIN - 1 });
    expect(threadsLayout(CHAT_MAIN_MIN + 241)).toEqual({ overlay: false, min: 240, max: 240 });
  });
  it('a pane too narrow for both: drawer over the chat, up to the pane width', () => {
    expect(threadsLayout(CHAT_MAIN_MIN + 240)).toEqual({
      overlay: true,
      min: 240,
      max: CHAT_MAIN_MIN + 240,
    });
    expect(threadsLayout(423)).toEqual({ overlay: true, min: 240, max: 423 });
    expect(threadsLayout(200)).toEqual({ overlay: true, min: 200, max: 200 });
  });
  it('not measured yet: beside with the plain limits', () => {
    expect(threadsLayout(0)).toEqual({ overlay: false, min: 240, max: 640 });
  });
});
