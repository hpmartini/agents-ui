/**
 * Reply quotes and threads of an orchestrator chat. A thread is a slice of the same session: its
 * messages start with the thread's tag (`[Thread: <Project> · <Task>]`), the orchestrator starts
 * its answer with the same tag, and messages of linked workers (`orkumo send`) join it. Anything
 * unclear stays in the main chat; nothing is guessed. Pure: the chat pane routes on every render.
 */
import { agentMessage, type ChatAnswer, type ChatItem } from './chatEvents';
import { leadingCommand } from './chatComposer';

/** Thread as the host stores it (Orkumo: `/api/orchestrator/threads`) */
export interface ChatThread {
  id: string;
  /** Written in front of every message of the thread; fixed when the thread is created */
  tag: string;
  name: { project: string; task: string };
  /** ms */
  createdAt: number;
  /** ms; answers and worker messages after it count as unread */
  readAt: number;
  /** Workers whose `orkumo send` messages join the thread (task refs, sessions in its repo) */
  agents: string[];
  closed: boolean;
  /** Key of the answer the thread was opened on */
  parentKey?: string | null;
  /** Repo or monorepo subfolder of the bound project */
  repo?: string | null;
  /** From the bound status task (title, note, description, refs); null without binding */
  summary?: string | null;
  /** Bound status task, null for a thread opened on an answer */
  binding?: { project: string; task: string } | null;
  /**
   * Command marks (`at`: ms, host clock): a command goes out without the tag, so each mark gives
   * the thread the first prompt at or after it that is the command
   */
  commands?: { at: number; command: string }[];
  /** Renamed by the user in the UI: never named automatically again */
  renamed?: boolean;
}

/** The orchestrator's tidy-up layer over the transcript (`orkumo thread move/merge`) */
export interface ChatThreadOverrides {
  /** Entry key (`entryKey`) → thread id, or 'main' */
  entries: Record<string, string>;
  /** Merged source thread id → target thread id; sources are hidden */
  merged: Record<string, string>;
}

/** Routing key of an item: its transcript key without the history page prefixes `h<before>:` */
export const entryKey = (item: { key: string }) => item.key.replace(/^(?:h\d+:)+/, '');

/** Final thread of `id` along the merge chain; an unknown target (or a cycle) keeps `id` */
export function threadTarget(
  id: string,
  threads: ChatThread[],
  overrides?: ChatThreadOverrides
): string {
  const merged = overrides?.merged ?? {};
  const seen = new Set<string>();
  let to = id;
  while (merged[to] && !seen.has(to)) {
    seen.add(to);
    to = merged[to];
  }
  return to !== id && threads.some((t) => t.id === to) ? to : id;
}

/** Threads the panel lists: merged sources are gone */
export const visibleThreads = (threads: ChatThread[], overrides?: ChatThreadOverrides) =>
  overrides ? threads.filter((t) => threadTarget(t.id, threads, overrides) === t.id) : threads;

/** Markdown left in old stored names (`**`, backticks, leading "- " or "#") */
const plainName = (s: string) =>
  s
    .replace(/\*\*|`/g, '')
    .replace(/^\s*(?:[-*]\s+|#+\s*)+/, '')
    .trim();

/** Shown name: "Project · Task", Markdown stripped, a doubled part once */
export function threadTitle(name: { project: string; task: string }): string {
  const parts = [plainName(name.project), plainName(name.task)].filter(Boolean);
  return [...new Set(parts)].join(' · ');
}

/** Where a thread starts in the main chat: "N replies in thread …" */
export interface ChatThreadMarker {
  kind: 'thread';
  key: string;
  threadId: string;
  count: number;
}

const TAG_START = '[Thread: ';

export const threadTag = (name: { project: string; task: string }) =>
  `${TAG_START}${name.project} · ${name.task}]`;

/** The marked command, also as the CLI logs it with its plugin prefix (`/retro` → `/x:retro`) */
const sameCommand = (logged: string, marked: string) =>
  logged === marked || logged.endsWith(`:${marked.slice(1)}`);

/**
 * The command a thread message starts with (`/status-report`), else null; only a command of the
 * chat's list (`/tmp ist voll` is text). The CLI runs a command only as the first word: it goes
 * out without the tag line and its turn finds the thread by a mark
 */
export function threadCommand(body: string, commands: { name: string }[]): string | null {
  const command = leadingCommand(body.trim())?.command;
  if (!command) return null;
  return commands.some(
    (c) => sameCommand(command, `/${c.name}`) || sameCommand(`/${c.name}`, command)
  )
    ? command
    : null;
}

/** Message text without its thread tag line */
export function stripTag(text: string, tag: string): string {
  const t = text.trimStart();
  return t.startsWith(tag) ? t.slice(tag.length).replace(/^[ \t]*\n?/, '') : text;
}

export const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const QUOTE_LINES = 3;
const QUOTE_CHARS = 280;
const QUOTE_RE = /^Re your reply(?: from (\d\d:\d\d))?: "([\s\S]*?)"\n\n/;

/** First lines of a quoted text, cut with an ellipsis */
export function quoteExcerpt(text: string): string {
  const lines = text.trim().split('\n');
  let out = lines.slice(0, QUOTE_LINES).join('\n');
  if (out.length > QUOTE_CHARS) out = out.slice(0, QUOTE_CHARS).trimEnd();
  return out.length < text.trim().length ? `${out}…` : out;
}

/** Sent in front of a reply: `Re your reply from 09:32: "…"` (no time when the transcript has none) */
export const quoteHeader = (ts: number | undefined, text: string) =>
  `Re your reply${ts === undefined ? '' : ` from ${hhmm(ts)}`}: "${quoteExcerpt(text)}"\n\n`;

/** A sent reply split back into the quote and the user's text; null for a plain prompt */
export function parseQuote(
  text: string
): { time: string | null; quote: string; body: string } | null {
  const m = QUOTE_RE.exec(text);
  return m ? { time: m[1] ?? null, quote: m[2], body: text.slice(m[0].length) } : null;
}

/** The text an answer shows (its text blocks) */
export const answerText = (a: ChatAnswer) =>
  a.parts
    .flatMap((p) => p.blocks)
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('\n\n');

export const itemTime = (item: ChatItem): number | undefined =>
  item.kind === 'answer' ? item.parts[0]?.ts : item.kind === 'user' ? item.ts : undefined;

const firstText = (a: ChatAnswer) => {
  for (const p of a.parts)
    for (const b of p.blocks) if (b.type === 'text' && b.text.trim()) return b.text.trimStart();
  return '';
};

/** A sender id of the header (often shortened) names this linked agent */
const MIN_ID = 8;
const sameAgent = (linked: string, sender: string) =>
  sender.length >= MIN_ID && (linked === sender || linked.startsWith(sender));

/** Thread of one chat item, null when it stays in the main chat */
export function threadOf(item: ChatItem, threads: ChatThread[]): string | null {
  const byTag = (text: string) => {
    const hits = threads.filter((t) => text.startsWith(t.tag));
    return hits.length === 1 ? hits[0].id : null;
  };
  if (item.kind === 'answer') return byTag(firstText(item));
  if (item.kind !== 'user') return null;
  const sent = agentMessage(item.text);
  if (!sent) return byTag(item.text.trimStart());
  const tagged = byTag(sent.body.trimStart());
  if (tagged) return tagged;
  const sender = sent.id;
  if (!sender) return null;
  const linked = threads.filter(
    (t) =>
      !t.closed &&
      (item.ts === undefined || item.ts >= t.createdAt) &&
      t.agents.some((a) => sameAgent(a, sender))
  );
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
function commandTurns(
  items: ChatItem[],
  threads: ChatThread[],
  complete: boolean,
  olderTs: number | undefined
): Map<ChatItem, string> {
  const claimed = new Map<ChatItem, string>();
  const marks = threads
    .flatMap((t) => (t.commands ?? []).map((m) => ({ ...m, id: t.id })))
    .sort((a, b) => a.at - b.at);
  const oldest = Math.min(...items.map((i) => itemTime(i) ?? Infinity));
  for (const mark of marks) {
    // strictly before: an item at the mark's time may be its own command, no proof of reach
    if (!complete && !(oldest < mark.at) && !(olderTs !== undefined && olderTs < mark.at)) continue;
    const own = items.find(
      (i) =>
        i.kind === 'user' &&
        i.ts !== undefined &&
        i.ts >= mark.at &&
        !claimed.has(i) &&
        !agentMessage(i.text) &&
        sameCommand(leadingCommand(i.text.trim())?.command ?? '', mark.command) &&
        !threadOf(i, threads)
    );
    if (own) claimed.set(own, mark.id);
  }
  return claimed;
}

/**
 * Splits the chat: thread items go to their thread, the main chat keeps the rest plus one marker
 * per thread (after the answer it was opened on, else where its first message was). An answer of
 * tool steps only follows the item before it; a command sent from a thread goes there by its mark
 */
export function routeThreads(
  items: ChatItem[],
  threads: ChatThread[],
  /** The items are the whole history (no older page left to load) */
  complete = false,
  /** ms of the newest prompt before the loaded items (host's `devorbit_page`), if known */
  olderTs?: number,
  /** The orchestrator's tidy-up layer: decides before every other rule */
  overrides?: ChatThreadOverrides
): { main: (ChatItem | ChatThreadMarker)[]; byThread: Map<string, ChatItem[]> } {
  const byThread = new Map<string, ChatItem[]>();
  const main: (ChatItem | ChatThreadMarker)[] = [];
  const markers = new Map<string, ChatThreadMarker>();
  const marker = (id: string) => {
    let m = markers.get(id);
    if (!m) {
      m = { kind: 'thread', key: `thread-${id}`, threadId: id, count: 0 };
      markers.set(id, m);
    }
    return m;
  };
  const parents = new Map(
    threads.flatMap((t) => (t.parentKey ? [[entryKey({ key: t.parentKey }), t.id] as const] : []))
  );
  const known = new Set(threads.map((t) => t.id));
  const target = (id: string | null) => id && threadTarget(id, threads, overrides);
  const commands = commandTurns(items, threads, complete, olderTs);
  let prev: string | null = null;
  for (const item of items) {
    // An answer without a tag (orchestrators started before the tag rule, tool steps only) is the
    // turn of the thread message before it; a tag of its own, known or not, decides instead
    const untagged = item.kind === 'answer' && !firstText(item).startsWith(TAG_START);
    // closed threads too: closing must not move their answers back into the main chat
    const turn: string | null = prev;
    // a tidy-up move wins; one to a thread this list does not know falls back to the rules
    const moved = overrides?.entries[entryKey(item)];
    const id: string | null =
      moved === 'main'
        ? null
        : moved && known.has(moved)
          ? target(moved)
          : !threads.length
            ? null
            : commands.has(item)
              ? target(commands.get(item)!)
              : untagged
                ? (target(threadOf(item, threads)) ?? turn)
                : target(threadOf(item, threads));
    prev = id;
    if (id) {
      byThread.set(id, [...(byThread.get(id) ?? []), item]);
      const m = marker(id);
      if (!main.includes(m)) main.push(m);
      continue;
    }
    main.push(item);
    const opened = parents.get(entryKey(item));
    // a merged thread shows under its target's marker only
    if (opened && target(opened) === opened && !main.includes(marker(opened)))
      main.push(marker(opened));
  }
  for (const [id, m] of markers) m.count = byThread.get(id)?.length ?? 0;
  return { main, byThread };
}

/** Answers and worker messages of a thread after `readAt`; own prompts never count */
export const unreadCount = (items: ChatItem[], readAt: number) =>
  items.filter(
    (i) =>
      (i.kind === 'answer' || (i.kind === 'user' && agentMessage(i.text))) &&
      (itemTime(i) ?? 0) > readAt
  ).length;
