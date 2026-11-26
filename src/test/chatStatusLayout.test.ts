import { describe, expect, it } from 'vitest';
import { statusLayout } from '../components/AgentsView/Chat/ChatStatusLine';

// The footer spans the pane under the threads panel too: in a narrow split pane it must stay at
// most two rows, or a short pane has no room left for the thread composer (contract AC-2)
describe('statusLayout', () => {
  it('keeps branch/model and the usage side by side in a narrow (split) pane', () => {
    // a 416 px split pane leaves ~380 px for the status line
    expect(statusLayout(380).cols).toBe('grid-cols-[auto_minmax(0,1fr)]');
    expect(statusLayout(380).placeholders).toBe(false);
  });
  it('stacks only where two columns no longer fit', () => {
    expect(statusLayout(300).cols).toBe('grid-cols-1');
    expect(statusLayout(300).placeholders).toBe(false);
  });
  it('keeps the aligned four columns (with empty cells) in a wide pane', () => {
    expect(statusLayout(900).placeholders).toBe(true);
    expect(statusLayout(0).placeholders).toBe(true);
  });
});
