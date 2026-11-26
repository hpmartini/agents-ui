import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractNumberedChoices, screenPrompt } from '../utils/agentInput';

/** A captured screen as `paneScreen(id, 40)` hands it over (blank lines dropped) */
const fixture = (name: string) =>
  fs
    .readFileSync(path.join(__dirname, 'fixtures', 'agentDialogs', `${name}.txt`), 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .slice(-40)
    .join('\n');
const RULE = '─'.repeat(60);

// Screen tails as Claude Code 2.1 draws them (shortened)
const PERMISSION = [
  '⏺ Bash(git push origin main)',
  '',
  ' Bash command',
  '   git push origin main',
  ' Do you want to proceed?',
  ' ❯ 1. Yes',
  "   2. Yes, and don't ask again for git push commands",
  '   3. No, and tell Claude what to do differently (esc)',
  '',
  ' Esc to cancel · Tab to amend',
  '  plugin panel hidden · /panel to show',
  '  ✓ Update installed · Restart to apply',
].join('\n');

const ANSWER_WITH_QUESTIONS = [
  '⏺ Fertig. Zwei offene Fragen:',
  '  1. Soll ich mergen?',
  '  2. Release jetzt oder morgen?',
  '',
  '────────────────────────────',
  '❯ ',
  '────────────────────────────',
  '  plugin panel hidden · /panel to show',
  '  ✓ Update installed · Restart to apply',
].join('\n');

describe('question on the agent screen (yellow box)', () => {
  it('shows a permission or choice prompt, without Claude Code status lines', () => {
    const text = screenPrompt(PERMISSION);
    expect(text).toContain('Do you want to proceed?');
    expect(text).toContain('❯ 1. Yes');
    expect(text).not.toMatch(/plugin panel hidden|Update installed/);
  });

  it('a question picker (Enter to select) counts as well', () => {
    expect(
      screenPrompt(
        ' Which branch?\n ❯ 1. main\n   2. dev\n\n Enter to select · ↑/↓ to navigate · Esc to cancel'
      )
    ).toContain('Which branch?');
  });

  it("omp's ask box counts: its key hints are glyphs", () => {
    expect(
      screenPrompt('│ Wohin?  │\n│ ❯ ○ Staging │\n├────┤\n│ ⏎ choose · ↑/↓ move · ⎋ cancel │')
    ).toContain('Wohin?');
    expect(screenPrompt('╭── π > Opus\n╰─ ⇧⇥ to change thinking effort ─╯')).toBeNull();
  });

  it('no box when the last answer only ends with open questions', () => {
    expect(screenPrompt(ANSWER_WITH_QUESTIONS)).toBeNull();
    expect(screenPrompt('')).toBeNull();
  });

  // Bug D: an idle orchestrator whose prompt suggestion (ghost text) starts with "1."
  it('no box for the input line: prompt suggestion, status line, agent list', () => {
    const idle = fixture('claude-idle-suggestion');
    expect(screenPrompt(idle)).toBeNull();
    expect(
      screenPrompt(`${idle}\n${RULE}\n❯ 1. a typed list\n  2. second line\n${RULE}`)
    ).toBeNull();
  });

  // F8: a key hint typed into the input box is no dialog footer
  it('no box for a key hint inside the input text (under the input rule)', () => {
    expect(screenPrompt(`${RULE}\n❯ 1. first point\n  2. Esc to cancel\n${RULE}`)).toBeNull();
    expect(screenPrompt(`${RULE}\n❯ 1. first point\n2. Esc to cancel\n${RULE}`)).toBeNull();
    // one line, the hint in the typed text
    expect(screenPrompt(`${RULE}\n❯ press Esc to cancel the deploy\n${RULE}`)).toBeNull();
    // the hint on a continuation line of a long input
    expect(
      screenPrompt(`⏺ Done.\n${RULE}\n❯ write a note that says\n  Enter to confirm · Esc to cancel\n${RULE}`)
    ).toBeNull();
  });

  it('no box for key hints quoted in an answer above the input line', () => {
    expect(
      screenPrompt(`⏺ The dialog says "Esc to cancel · Tab to amend".\n${RULE}\n❯ \n${RULE}`)
    ).toBeNull();
  });

  it('a prompt echoed in the transcript is no cursor', () => {
    expect(
      screenPrompt(`❯ 1. first point\n  2. second point\n⏺ Done.\n${RULE}\n❯ \n${RULE}`)
    ).toBeNull();
  });

  it('real dialogs count: permission, question, review (no footer)', () => {
    const permission = screenPrompt(fixture('claude-permission-bash'));
    expect(permission?.split('\n')[0].trim()).toBe('Bash command');
    expect(permission?.split('\n').at(-1)?.trim()).toBe('Esc to cancel · Tab to amend');
    expect(screenPrompt(fixture('claude-question-single'))).toContain('Wohin deployen?');
    expect(screenPrompt(fixture('claude-question-review'))).toContain('Submit answers');
  });

  it('the excerpt is the dialog only, without the input line or anything under its footer', () => {
    // folder trust dialog as Claude Code 2.1.332 draws it (path neutral)
    const trust = [
      '❯ an earlier prompt',
      RULE,
      ' Accessing workspace:',
      ' /work/demo',
      ' Quick safety check: Is this a project you created or one you trust?',
      " Claude Code'll be able to read, edit, and execute files here.",
      ' Security guide',
      ' ❯ No, exit',
      '   Yes, I trust this folder',
      ' Enter to confirm · Esc to cancel',
      `${RULE} demo-session ─`,
    ].join('\n');
    const text = screenPrompt(trust) ?? '';
    expect(text.split('\n')[0].trim()).toBe('Accessing workspace:');
    expect(text.split('\n').at(-1)?.trim()).toBe('Enter to confirm · Esc to cancel');
    expect(text).not.toMatch(/an earlier prompt|demo-session/);
  });

  it('private-use glyphs (Nerd-Font icons) never reach the excerpt', () => {
    const permission = fixture('claude-permission-bash').replaceAll('echo 42', 'echo \ue0b6 42');
    expect(screenPrompt(permission)).toContain('echo  42');
    expect(screenPrompt(permission)).not.toMatch(/[\ue000-\uf8ff]/u);
  });

  it('review step with the cursor on its last option', () => {
    const review = fixture('claude-question-review')
      .replace('❯ 1. Submit answers', '  1. Submit answers')
      .replace('  2. Cancel', '❯ 2. Cancel');
    expect(screenPrompt(review)).toContain('❯ 2. Cancel');
  });
});
