import { chatSuggestions } from './chatComposer';
export const MIN_PROMPT_LENGTH = 4;
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*\x07/g;
/** Remove ANSI escape sequences (colours, cursor movement, OSC titles) from terminal output. */
export function stripAnsi(text) {
    return text.replace(ANSI_RE, '');
}
const URL_RE = /^https?:\/\/\S+$/i;
const PR_URL_RE = /\/(?:pull|merge_requests)\/(\d+)/;
/**
 * Detect a "filter" expression (typed in the dispatch input to narrow the list).
 */
export function parseFilter(text) {
    const trimmed = text.trim();
    if (!trimmed)
        return null;
    const agent = trimmed.match(/^a:(\S+)$/);
    if (agent)
        return { agent: agent[1] };
    const state = trimmed.match(/^s:(\S+)$/);
    if (state)
        return { state: state[1].toLowerCase() };
    const pr = trimmed.match(/^#(\d+)$/);
    if (pr)
        return { prNumber: Number(pr[1]) };
    if (URL_RE.test(trimmed) && !/\s/.test(trimmed))
        return { url: trimmed };
    return null;
}
/**
 * Apply a filter to a list of sessions.
 */
export function applySessionFilter(sessions, filter) {
    if (!filter)
        return sessions;
    return sessions.filter((session) => {
        if (filter.agent) {
            const needle = filter.agent.toLowerCase();
            return ((session.agent || '').toLowerCase() === needle ||
                session.name.toLowerCase().includes(needle));
        }
        if (filter.state) {
            const wanted = filter.state;
            const aliases = {
                working: [], // displayState only: raw `working` includes idle goal sessions (#194)
                blocked: ['blocked'],
                'needs-input': ['blocked'],
                input: ['blocked'],
                done: ['done'],
                completed: ['done'],
                idle: ['done'],
                failed: ['failed'],
                stopped: ['stopped'],
                pinned: [],
            };
            if (wanted === 'pinned')
                return session.pinned;
            const states = aliases[wanted] || [wanted];
            return states.includes(session.state || '') || session.displayState === wanted;
        }
        if (filter.prNumber !== undefined) {
            return session.links.some((link) => link.number === filter.prNumber);
        }
        if (filter.url) {
            const url = filter.url;
            return (session.links.some((link) => link.href === url) || (session.intent || '').includes(url));
        }
        return true;
    });
}
/**
 * Parse the dispatch input into an action.
 */
export function parseDispatchInput(text, context = {}) {
    const raw = text;
    const trimmed = text.trim();
    if (!trimmed)
        return { kind: 'empty' };
    // PR selection: #1234 or a PR/MR URL (also acts as a filter)
    const prNumber = trimmed.match(/^#(\d+)$/);
    if (prNumber)
        return { kind: 'select-pr', number: Number(prNumber[1]), url: null, raw };
    if (URL_RE.test(trimmed) && PR_URL_RE.test(trimmed)) {
        const match = trimmed.match(PR_URL_RE);
        return { kind: 'select-pr', number: match ? Number(match[1]) : null, url: trimmed, raw };
    }
    const filter = parseFilter(trimmed);
    if (filter)
        return { kind: 'filter', filter, raw };
    if (trimmed.startsWith('!')) {
        const command = trimmed.slice(1).trim();
        if (!command)
            return { kind: 'too-short', raw };
        return { kind: 'exec', command, raw };
    }
    if (trimmed.startsWith('/')) {
        const match = trimmed.match(/^\/(\S+)\s*([\s\S]*)$/);
        if (match)
            return { kind: 'command', command: match[1].toLowerCase(), args: match[2].trim(), raw };
    }
    const subagents = context.subagents || [];
    const repos = context.repos || [];
    let agent = null;
    let repo = null;
    let prompt = trimmed;
    // First word matching a subagent runs that subagent as the main agent
    const firstWord = trimmed.split(/\s+/)[0];
    const firstAgent = subagents.find((a) => a.name === firstWord);
    if (firstAgent && trimmed.length > firstWord.length) {
        agent = firstAgent.name;
        prompt = trimmed.slice(firstWord.length).trim();
    }
    // @mentions: subagent wins over repo when both match
    const mentionRe = /(^|\s)@([A-Za-z0-9_./-]+)/g;
    let mention;
    const toStrip = [];
    while ((mention = mentionRe.exec(trimmed)) !== null) {
        const name = mention[2];
        const mentionedAgent = subagents.find((a) => a.name === name);
        if (mentionedAgent) {
            if (!agent)
                agent = mentionedAgent.name;
            toStrip.push(`@${name}`);
            continue;
        }
        const mentionedRepo = repos.find((r) => r.name === name);
        if (mentionedRepo && !repo) {
            repo = mentionedRepo;
            toStrip.push(`@${name}`);
        }
    }
    for (const token of toStrip) {
        prompt = prompt.replace(new RegExp(`(^|\\s)${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`), '$1');
    }
    prompt = prompt.replace(/\s{2,}/g, ' ').trim();
    if (prompt.length < MIN_PROMPT_LENGTH)
        return { kind: 'too-short', raw };
    return { kind: 'dispatch', prompt, agent, repo, raw };
}
export function computeSuggestions(text, caret, context) {
    const before = text.slice(0, caret);
    const empty = { suggestions: [], replaceStart: caret, replaceEnd: caret };
    // Slash command at the very beginning
    const slash = before.match(/^\/(\S*)$/);
    if (slash) {
        return {
            suggestions: chatSuggestions('/', slash[1], {
                commands: context.commands,
                agents: [],
                files: [],
            }).map((c) => ({
                type: 'command',
                label: c.label,
                description: c.description,
                insert: c.insert,
            })),
            replaceStart: 0,
            replaceEnd: caret,
        };
    }
    // @mention anywhere
    const at = before.match(/(?:^|\s)@([A-Za-z0-9_./-]*)$/);
    if (at) {
        const needle = at[1].toLowerCase();
        const start = caret - at[1].length - 1;
        const agents = context.subagents
            .filter((a) => a.name.toLowerCase().startsWith(needle))
            .map((a) => ({
            type: 'agent',
            label: `@${a.name}`,
            description: a.description,
            insert: `@${a.name} `,
        }));
        const repos = context.repos
            .filter((r) => r.name.toLowerCase().startsWith(needle))
            .map((r) => ({
            type: 'repo',
            label: `@${r.name}`,
            description: r.path,
            insert: `@${r.name} `,
        }));
        return {
            suggestions: [...agents, ...repos].slice(0, 12),
            replaceStart: start,
            replaceEnd: caret,
        };
    }
    // Empty input + Tab browses subagents
    if (!text.trim()) {
        return {
            suggestions: context.subagents.map((a) => ({
                type: 'agent',
                label: a.name,
                description: a.description,
                insert: `${a.name} `,
            })),
            replaceStart: 0,
            replaceEnd: text.length,
        };
    }
    return empty;
}
/**
 * Parse numbered choices out of a session's recent output (permission prompts, questions).
 * Returns e.g. [{ number: 1, label: 'Yes' }, { number: 2, label: 'No' }].
 */
export function extractNumberedChoices(output) {
    const clean = stripAnsi(output);
    const lines = clean.split(/\r?\n/).slice(-60);
    const choices = [];
    for (const line of lines) {
        const match = line.match(/^\s*(?:[❯>]\s*)?(\d)[.):]\s+(.+?)\s*$/);
        if (match) {
            const number = Number(match[1]);
            if (!choices.some((c) => c.number === number))
                choices.push({ number, label: match[2].trim() });
        }
    }
    // Keep the last contiguous block starting at 1
    const sorted = choices.sort((a, b) => a.number - b.number);
    if (sorted.length === 0 || sorted[0].number !== 1)
        return [];
    const contiguous = [];
    for (const choice of sorted) {
        if (choice.number === contiguous.length + 1)
            contiguous.push(choice);
        else
            break;
    }
    return contiguous;
}
/** Claude Code's own status lines under the input (plugin panel, updater): no part of a question */
const STATUS_LINE_RE = /plugin panel hidden|update installed|restart to (apply|update)|auto-updat/i;
/** A cursor on a numbered option, and a dialog's key hints (omp: ⎋) */
const CHOICE_CURSOR_RE = /^\s*[❯›→▶]\s*\d[.)]\s/;
const DIALOG_HINT_RE = /esc to cancel|enter to (select|confirm)|⎋ cancel|\(y\/n\)|\[y\/n\]/i;
const RULE_LINE_RE = /^\s*─{10,}/;
const OPTION_LINE_RE = /^\s*\d+[.)]\s/;
/** Nerd-Font icons of status lines (private use area): tofu in the page's font */
const PRIVATE_GLYPHS_RE = /[\uE000-\uF8FF\u{F0000}-\u{10FFFF}]/gu;
const lastIndex = (lines, test, before = lines.length) => {
    for (let i = before - 1; i >= 0; i--)
        if (test(lines[i], i))
            return i;
    return -1;
};
/**
 * Lines [start, end) of the dialog an agent's screen waits on, or null. Claude Code draws its input
 * line as `❯` right under a rule, with its prompt suggestion (ghost text) and echoed prompts as
 * `❯ …` as well, so a `❯ 1.` alone is no dialog: it needs a key-hint footer below the last `❯`, or
 * (the review step has no footer) a cursor on a numbered option with more below; never when the
 * last `❯` is the input line (under a rule), whose typed text may hold a hint as well.
 */
export function dialogRange(lines) {
    const cursor = lastIndex(lines, (l) => /^\s*❯/.test(l));
    // a footer is a line of its own: a numbered line with a hint is typed text or an option
    let end = lastIndex(lines, (l) => DIALOG_HINT_RE.test(l) && !OPTION_LINE_RE.test(l));
    // the input line sits right under a rule; what follows it there is typed text, hints too
    const above = cursor >= 0 ? (lines[lastIndex(lines, (l) => !!l.trim(), cursor)] ?? '') : '';
    if (cursor >= 0 && RULE_LINE_RE.test(above))
        return null;
    if (end < cursor || end < 0) {
        if (cursor < 0 || !CHOICE_CURSOR_RE.test(lines[cursor]))
            return null;
        end = lastIndex(lines, (l, i) => i > cursor && OPTION_LINE_RE.test(l));
        // the cursor on the last option: its neighbour is above
        if (end < 0 && OPTION_LINE_RE.test(above))
            end = cursor;
        if (end < 0)
            return null;
    }
    const rule = lastIndex(lines, (l) => RULE_LINE_RE.test(l), cursor >= 0 ? cursor : end);
    return { start: rule + 1, end: end + 1 };
}
/**
 * The dialog on an agent's screen (permission or choice) without the input line and status lines
 * around it, or null when no dialog waits: an answer that merely ends with open questions is no prompt
 */
export function screenPrompt(screen) {
    const lines = stripAnsi(screen)
        .replace(PRIVATE_GLYPHS_RE, '')
        .split(/\r?\n/)
        .filter((l) => !STATUS_LINE_RE.test(l));
    const range = dialogRange(lines);
    return range ? lines.slice(range.start, range.end).join('\n').trim() || null : null;
}
/** `claude --bg` refuses a folder whose trust prompt was never accepted (needs an interactive run there) */
export function isUntrustedWorkspaceError(message) {
    return /workspace not trusted/i.test(message);
}
