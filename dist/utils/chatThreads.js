/**
 * Reply quotes and threads of an orchestrator chat. A thread is a slice of the same session: its
 * messages start with the thread's tag (`[Thread: <Project> · <Task>]`), the orchestrator starts
 * its answer with the same tag, and messages of linked workers (`orkumo send`) join it. Anything
 * unclear stays in the main chat; nothing is guessed. Pure: the chat pane routes on every render.
 */
import { agentMessage } from './chatEvents';
export const threadTag = (name) => `[Thread: ${name.project} · ${name.task}]`;
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
 * Splits the chat: thread items go to their thread, the main chat keeps the rest plus one marker
 * per thread (after the answer it was opened on, else where its first message was). An answer of
 * tool steps only follows the item before it
 */
export function routeThreads(items, threads) {
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
    const parents = new Map(threads.filter((t) => t.parentKey).map((t) => [t.parentKey, t.id]));
    let prev = null;
    for (const item of items) {
        // tool steps without text are the same turn as the item before them (no tag to read)
        const stepsOnly = item.kind === 'answer' && !firstText(item);
        const id = !threads.length ? null : stepsOnly ? prev : threadOf(item, threads);
        prev = id;
        if (id) {
            byThread.set(id, [...(byThread.get(id) ?? []), item]);
            const m = marker(id);
            if (!main.includes(m))
                main.push(m);
            continue;
        }
        main.push(item);
        const opened = parents.get(item.key);
        if (opened)
            main.push(marker(opened));
    }
    for (const [id, m] of markers)
        m.count = byThread.get(id)?.length ?? 0;
    return { main, byThread };
}
/** Answers and worker messages of a thread after `readAt`; own prompts never count */
export const unreadCount = (items, readAt) => items.filter((i) => (i.kind === 'answer' || (i.kind === 'user' && agentMessage(i.text))) &&
    (itemTime(i) ?? 0) > readAt).length;
