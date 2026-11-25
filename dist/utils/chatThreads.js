/**
 * Reply quotes and threads of an orchestrator chat. A thread is a slice of the same session: its
 * messages start with the thread's tag (`[Thread: <Project> · <Task>]`), the orchestrator starts
 * its answer with the same tag, and messages of linked workers (`orkumo send`) join it. Anything
 * unclear stays in the main chat; nothing is guessed. Pure: the chat pane routes on every render.
 */
import { agentMessage } from './chatEvents';
import { leadingCommand } from './chatComposer';
/** Routing key of an item: its transcript key without the history page prefixes `h<before>:` */
export const entryKey = (item) => item.key.replace(/^(?:h\d+:)+/, '');
/** Final thread of `id` along the merge chain; an unknown target (or a cycle) keeps `id` */
export function threadTarget(id, threads, overrides) {
    const merged = overrides?.merged ?? {};
    const seen = new Set();
    let to = id;
    while (merged[to] && !seen.has(to)) {
        seen.add(to);
        to = merged[to];
    }
    return to !== id && threads.some((t) => t.id === to) ? to : id;
}
/** Threads the panel lists: merged sources are gone */
export const visibleThreads = (threads, overrides) => overrides ? threads.filter((t) => threadTarget(t.id, threads, overrides) === t.id) : threads;
/** Markdown left in old stored names (`**`, backticks, leading "- " or "#") */
const plainName = (s) => s
    .replace(/\*\*|`/g, '')
    .replace(/^\s*(?:[-*]\s+|#+\s*)+/, '')
    .trim();
/** Shown name: "Project · Task", Markdown stripped, a doubled part once */
export function threadTitle(name) {
    const parts = [plainName(name.project), plainName(name.task)].filter(Boolean);
    return [...new Set(parts)].join(' · ');
}
const TAG_START = '[Thread: ';
export const threadTag = (name) => `${TAG_START}${name.project} · ${name.task}]`;
/** The marked command, also as the CLI logs it with its plugin prefix (`/retro` → `/x:retro`) */
const sameCommand = (logged, marked) => logged === marked || logged.endsWith(`:${marked.slice(1)}`);
/**
 * The command a thread message starts with (`/status-report`), else null; only a command of the
 * chat's list (`/tmp ist voll` is text). The CLI runs a command only as the first word: it goes
 * out without the tag line and its turn finds the thread by a mark
 */
export function threadCommand(body, commands) {
    const command = leadingCommand(body.trim())?.command;
    if (!command)
        return null;
    return commands.some((c) => sameCommand(command, `/${c.name}`) || sameCommand(`/${c.name}`, command))
        ? command
        : null;
}
/** Message text without its thread tag line */
export function stripTag(text, tag) {
    const t = text.trimStart();
    return t.startsWith(tag) ? t.slice(tag.length).replace(/^[ \t]*\n?/, '') : text;
}
export const hhmm = (ms) => {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const QUOTE_LINES = 3;
const QUOTE_CHARS = 280;
const QUOTE_RE = /^Re your reply(?: from (\d\d:\d\d))?: "([\s\S]*?)"\n\n/;
/** First lines of a quoted text, cut with an ellipsis */
export function quoteExcerpt(text) {
    const lines = text.trim().split('\n');
    let out = lines.slice(0, QUOTE_LINES).join('\n');
    if (out.length > QUOTE_CHARS)
        out = out.slice(0, QUOTE_CHARS).trimEnd();
    return out.length < text.trim().length ? `${out}…` : out;
}
/** Sent in front of a reply: `Re your reply from 09:32: "…"` (no time when the transcript has none) */
export const quoteHeader = (ts, text) => `Re your reply${ts === undefined ? '' : ` from ${hhmm(ts)}`}: "${quoteExcerpt(text)}"\n\n`;
/** A sent reply split back into the quote and the user's text; null for a plain prompt */
export function parseQuote(text) {
    const m = QUOTE_RE.exec(text);
    return m ? { time: m[1] ?? null, quote: m[2], body: text.slice(m[0].length) } : null;
}
/** The text an answer shows (its text blocks) */
export const answerText = (a) => a.parts
    .flatMap((p) => p.blocks)
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n\n');
export const itemTime = (item) => item.kind === 'answer' ? item.parts[0]?.ts : item.kind === 'user' ? item.ts : undefined;
const firstText = (a) => {
    for (const p of a.parts)
        for (const b of p.blocks)
            if (b.type === 'text' && b.text.trim())
                return b.text.trimStart();
    return '';
};
/** A sender id of the header (often shortened) names this linked agent */
const MIN_ID = 8;
const sameAgent = (linked, sender) => sender.length >= MIN_ID && (linked === sender || linked.startsWith(sender));
/** Thread of one chat item, null when it stays in the main chat */
export function threadOf(item, threads) {
    const byTag = (text) => {
        const hits = threads.filter((t) => text.startsWith(t.tag));
        return hits.length === 1 ? hits[0].id : null;
    };
    if (item.kind === 'answer')
        return byTag(firstText(item));
    if (item.kind !== 'user')
        return null;
    const sent = agentMessage(item.text);
    if (!sent)
        return byTag(item.text.trimStart());
    const tagged = byTag(sent.body.trimStart());
    if (tagged)
        return tagged;
    const sender = sent.id;
    if (!sender)
        return null;
    const linked = threads.filter((t) => !t.closed &&
        (item.ts === undefined || item.ts >= t.createdAt) &&
        t.agents.some((a) => sameAgent(a, sender)));
    return linked.length === 1 ? linked[0].id : null;
}
/**
 * Command prompts the threads' marks claim: a mark is one turn, so it takes the first prompt at or
 * after it that is its command, one each (a tidy-up move of it still uses the mark up: the move
 * decides where it goes). Prompts in between are skipped: Claude Code logs a
 * command typed while the agent works only when the turn ends, after prompts typed later. Only
 * while the loaded items reach back to the mark (an item before it, the host's `olderTs`: the
 * prompt before the window, or the whole history): with its turn paged out, a later identical
 * command would look first; the mark claims again once the older pages are in.
 * shortcut: a mark whose command never got logged (interrupted, queue taken back) claims the next
 * identical command from the main chat; upgrade when the host drops such marks
 */
function commandTurns(items, threads, complete, olderTs) {
    const claimed = new Map();
    const marks = threads
        .flatMap((t) => (t.commands ?? []).map((m) => ({ ...m, id: t.id })))
        .sort((a, b) => a.at - b.at);
    const oldest = Math.min(...items.map((i) => itemTime(i) ?? Infinity));
    for (const mark of marks) {
        // strictly before: an item at the mark's time may be its own command, no proof of reach
        if (!complete && !(oldest < mark.at) && !(olderTs !== undefined && olderTs < mark.at))
            continue;
        const own = items.find((i) => i.kind === 'user' &&
            // a queued prompt (no time yet) comes after every logged one
            (i.queued || (i.ts !== undefined && i.ts >= mark.at)) &&
            !claimed.has(i) &&
            !agentMessage(i.text) &&
            sameCommand(leadingCommand(i.text.trim())?.command ?? '', mark.command) &&
            !threadOf(i, threads));
        if (own)
            claimed.set(own, mark.id);
    }
    return claimed;
}
/**
 * Commands threads sent while the agent works: Claude Code logs their enqueue without the text, so
 * each empty queue entry stands for one of the newest marks no logged prompt has claimed yet
 */
export function queuedCommands(items, threads, placeholders) {
    if (!placeholders)
        return [];
    return threads
        .flatMap((t) => t.commands ?? [])
        .filter((m) => !items.some((i) => i.kind === 'user' &&
        i.ts !== undefined &&
        i.ts >= m.at &&
        sameCommand(leadingCommand(i.text.trim())?.command ?? '', m.command)))
        .sort((a, b) => a.at - b.at)
        .slice(-placeholders)
        .map((m) => m.command);
}
/**
 * Splits the chat: thread items go to their thread, the main chat keeps the rest plus one marker
 * per thread (after the answer it was opened on, else where its first message was). An answer of
 * tool steps only follows the item before it; a command sent from a thread goes there by its mark
 */
export function routeThreads(items, threads, 
/** The items are the whole history (no older page left to load) */
complete = false, 
/** ms of the newest prompt before the loaded items (host's `devorbit_page`), if known */
olderTs, 
/** The orchestrator's tidy-up layer: decides before every other rule */
overrides) {
    const byThread = new Map();
    const main = [];
    const markers = new Map();
    const marker = (id) => {
        let m = markers.get(id);
        if (!m) {
            m = { kind: 'thread', key: `thread-${id}`, threadId: id, count: 0 };
            markers.set(id, m);
        }
        return m;
    };
    const parents = new Map(threads.flatMap((t) => (t.parentKey ? [[entryKey({ key: t.parentKey }), t.id]] : [])));
    const known = new Set(threads.map((t) => t.id));
    const target = (id) => id && threadTarget(id, threads, overrides);
    const commands = commandTurns(items, threads, complete, olderTs);
    let prev = null;
    for (const item of items) {
        // An answer without a tag (orchestrators started before the tag rule, tool steps only) is the
        // turn of the thread message before it; a tag of its own, known or not, decides instead
        const untagged = item.kind === 'answer' && !firstText(item).startsWith(TAG_START);
        // closed threads too: closing must not move their answers back into the main chat
        const turn = prev;
        // a tidy-up move wins; one to a thread this list does not know falls back to the rules
        const moved = overrides?.entries[entryKey(item)];
        const id = moved === 'main'
            ? null
            : moved && known.has(moved)
                ? target(moved)
                : !threads.length
                    ? null
                    : commands.has(item)
                        ? target(commands.get(item))
                        : untagged
                            ? (target(threadOf(item, threads)) ?? turn)
                            : target(threadOf(item, threads));
        prev = id;
        if (id) {
            byThread.set(id, [...(byThread.get(id) ?? []), item]);
            const m = marker(id);
            if (!main.includes(m))
                main.push(m);
            continue;
        }
        main.push(item);
        const opened = parents.get(entryKey(item));
        // a merged thread shows under its target's marker only
        if (opened && target(opened) === opened && !main.includes(marker(opened)))
            main.push(marker(opened));
    }
    for (const [id, m] of markers)
        m.count = byThread.get(id)?.length ?? 0;
    return { main, byThread };
}
/** Answers and worker messages of a thread after `readAt`; own prompts never count */
export const unreadCount = (items, readAt) => items.filter((i) => (i.kind === 'answer' || (i.kind === 'user' && agentMessage(i.text))) &&
    (itemTime(i) ?? 0) > readAt).length;
