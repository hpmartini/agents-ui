import { describe, expect, it } from 'vitest';
import { agentPaste } from '../components/AgentsView/AgentTerminal';

// A page reloaded on a long-running agent never saw its TUI ask for bracketed paste: the UI view's
// message must carry the markers itself, or each line break submits a message of its own
describe('agentPaste', () => {
  it('wraps a multi-line thread message in bracketed-paste markers', () => {
    expect(agentPaste('[Thread: Shop · Setup]\nhello')).toBe(
      '\x1b[200~[Thread: Shop · Setup]\nhello\x1b[201~'
    );
  });
  it('drops control characters that would end the paste, keeps tab and newline', () => {
    expect(agentPaste('a\x1b[201~b\tc\r\nd\x07')).toBe('\x1b[200~a[201~b\tc\nd\x1b[201~');
  });
});
