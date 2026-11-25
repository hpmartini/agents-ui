import { describe, expect, it } from 'vitest';
import {
  groupAnswers,
  initialChatState,
  prependHistory,
  reduceChat,
  type ChatItem,
  type ChatMessage,
} from '../utils/chatEvents';
import {
  quoteHeader,
  parseQuote,
  entryKey,
  routeThreads,
  threadCommand,
  threadTitle,
  visibleThreads,
  threadTag,
  unreadCount,
  type ChatThread,
} from '../utils/chatThreads';

const T0 = Date.parse('2026-11-24T09:00:00Z');
const min = (n: number) => T0 + n * 60_000;

const thread = (id: string, project: string, task: string, extra: Partial<ChatThread> = {}) =>
  ({
    id,
    tag: threadTag({ project, task }),
    name: { project, task },
    createdAt: min(0),
    readAt: min(0),
    agents: [],
    closed: false,
    ...extra,
  }) satisfies ChatThread;

const shop = thread('t1', 'Shop', 'Checkout', {
  agents: ['omp-aaaa0000-0000-0000-0000-000000000001'],
});
const weather = thread('t2', 'Weather app', 'Offline cache');

let n = 0;
const user = (text: string, ts?: number): ChatMessage => ({
  kind: 'user',
  key: `u${n++}`,
  text,
  ...(ts ? { ts } : {}),
});
const answer = (text: string, ts?: number, before: 'thinking' | null = null): ChatMessage => ({
  kind: 'assistant',
  key: `a${n++}`,
  streaming: false,
  blocks: [
    ...(before ? [{ type: 'thinking' as const, text: 'hm' }] : []),
    { type: 'text' as const, text },
  ],
  ...(ts ? { ts } : {}),
});
const worker = (id: string, body: string, ts?: number) =>
  user(`[from agent ${id} "worker" via orkumo send]\n\n${body}`, ts);

const route = (messages: ChatMessage[], threads: ChatThread[] = [shop, weather]) =>
  routeThreads(groupAnswers(messages), threads);
describe('thread tag', () => {
  it('is `[Thread: <Project> · <Task>]`', () => {
    expect(threadTag({ project: 'Shop', task: 'Checkout' })).toBe('[Thread: Shop · Checkout]');
  });
});

describe('routing into threads', () => {
  it('a tagged prompt and the answer starting with the same tag go to that thread', () => {
    const r = route([
      user('[Thread: Shop · Checkout]\nhow far?', min(1)),
      answer('[Thread: Shop · Checkout]\nForm is done.', min(2)),
      user('[Thread: Weather app · Offline cache]\nship it?', min(3)),
      answer('[Thread: Weather app · Offline cache]\nYes.', min(4)),
    ]);
    expect(r.byThread.get('t1')).toHaveLength(2);
    expect(r.byThread.get('t2')).toHaveLength(2);
    expect(r.main.filter((i) => i.kind !== 'thread')).toHaveLength(0);
  });

  it('the tag counts after thinking and tool calls, in the first text of the answer', () => {
    const r = route([answer('[Thread: Shop · Checkout]\nDone.', min(1), 'thinking')]);
    expect(r.byThread.get('t1')).toHaveLength(1);
  });

  it('a message of a linked worker goes to the thread, also by its short id', () => {
    const r = route([
      worker('omp-aaaa0000-0000-0000-0000-000000000001', 'tests green', min(1)),
      worker('omp-aaaa0000', 'PR open', min(2)),
    ]);
    expect(r.byThread.get('t1')).toHaveLength(2);
  });

  it('a worker message from before the thread existed stays in the main chat', () => {
    const late = { ...shop, createdAt: min(10) };
    const r = route([worker('omp-aaaa0000', 'old news', min(5))], [late, weather]);
    expect(r.byThread.get('t1') ?? []).toHaveLength(0);
  });

  it('the main chat shows one marker per thread with its count, where the thread starts', () => {
    const r = route([
      user('hello', min(1)),
      user('[Thread: Shop · Checkout]\nhow far?', min(2)),
      answer('untagged answer of the same turn', min(3)),
      user('next', min(4)),
      answer('[Thread: Shop · Checkout]\nForm is done.', min(5)),
    ]);
    expect(r.main.map((i) => i.kind)).toEqual(['user', 'thread', 'user']);
    expect(r.main[1]).toMatchObject({ kind: 'thread', threadId: 't1', count: 3 });
  });

  it('a thread opened on an answer shows its marker right after that answer', () => {
    const parent = answer('Plan for today', min(1));
    const t = thread('t3', 'Shop', 'Plan for today', { parentKey: parent.key });
    const r = route([parent, user('else', min(2)), user(`${t.tag}\nwhy?`, min(3))], [t]);
    expect(r.main.map((i) => i.kind)).toEqual(['answer', 'thread', 'user']);
  });
});

const steps = (ts?: number): ChatMessage => ({
  kind: 'assistant',
  key: `a${n++}`,
  streaming: false,
  blocks: [{ type: 'tool', id: `x${n}`, name: 'Bash', input: {} }],
  ...(ts ? { ts } : {}),
});

describe('a renamed thread keeps its messages (routing by tag, agents and turn, never the name)', () => {
  it('tagged, linked-worker and turn messages still go to it under its new name', () => {
    const renamed = { ...shop, name: { project: 'Shop', task: 'Payment page' } };
    const messages = [
      user('[Thread: Shop · Checkout]\nhow far?', min(1)),
      answer('Form is done.', min(2)),
      worker('omp-aaaa0000-0000-0000-0000-000000000001', 'tests green', min(3)),
      answer('[Thread: Shop · Checkout]\nMerging.', min(4)),
      user('[Thread: Shop · Checkout]\nnew message with the old tag', min(5)),
    ];
    const before = route(messages);
    const after = route(messages, [renamed, weather]);
    expect(after.byThread.get('t1')).toHaveLength(5);
    expect(after.byThread.get('t1')?.map((i) => i.key)).toEqual(
      before.byThread.get('t1')?.map((i) => i.key)
    );
    expect(after.main.filter((i) => i.kind !== 'thread')).toHaveLength(0);
  });
});

describe('an answer of tool steps only continues the turn it belongs to', () => {
  it('joins the thread of the item right before it (prompt or worker message)', () => {
    const r = route([
      user('[Thread: Shop · Checkout]\nask the worker', min(1)),
      steps(min(2)),
      worker('omp-aaaa0000-0000-0000-0000-000000000001', 'ready', min(3)),
      steps(min(4)),
      answer('[Thread: Shop · Checkout]\nWorker is ready.', min(5)),
    ]);
    // the last steps and the tagged text are one answer
    expect(r.byThread.get('t1')).toHaveLength(4);
    expect(r.main.filter((i) => i.kind === 'answer')).toHaveLength(0);
  });

  it('stays in the main chat after a main-chat prompt or at the start', () => {
    const r = route([steps(min(1)), user('status?', min(2)), steps(min(3))]);
    expect(r.byThread.size).toBe(0);
    expect(r.main.filter((i) => i.kind === 'answer')).toHaveLength(2);
  });
});

describe('an answer follows the turn it answers (orchestrators that never write the tag)', () => {
  it('an untagged answer right after a thread prompt goes to that thread', () => {
    const r = route([
      user('[Thread: Shop · Checkout]\nhow far?', min(1)),
      answer('Form is done.', min(2)),
    ]);
    expect(r.byThread.get('t1')).toHaveLength(2);
    expect(r.main.filter((i) => i.kind === 'answer')).toHaveLength(0);
  });

  it('also after a worker message that went to the thread', () => {
    const r = route([
      worker('omp-aaaa0000-0000-0000-0000-000000000001', 'tests green', min(1)),
      answer('Noted, merging next.', min(2)),
    ]);
    expect(r.byThread.get('t1')).toHaveLength(2);
  });

  it('a tag of another thread wins over the turn', () => {
    const r = route([
      user('[Thread: Shop · Checkout]\nhow far?', min(1)),
      answer('[Thread: Weather app · Offline cache]\nAbout the cache: shipped.', min(2)),
    ]);
    expect(r.byThread.get('t1')).toHaveLength(1);
    expect(r.byThread.get('t2')).toHaveLength(1);
  });

  it('an unknown tag is something else: main chat', () => {
    const r = route([
      user('[Thread: Shop · Checkout]\nhow far?', min(1)),
      answer('[Thread: Shop · Payments]\nDone.', min(2)),
    ]);
    expect(r.byThread.get('t1')).toHaveLength(1);
    expect(r.main.filter((i) => i.kind === 'answer')).toHaveLength(1);
  });

  it('a main chat prompt ends the turn: its answer stays in the main chat', () => {
    const r = route([
      user('[Thread: Shop · Checkout]\nhow far?', min(1)),
      answer('Form is done.', min(2)),
      user('anything else?', min(3)),
      answer('No.', min(4)),
    ]);
    expect(r.byThread.get('t1')).toHaveLength(2);
    expect(r.main.filter((i) => i.kind !== 'thread').map((i) => i.kind)).toEqual([
      'user',
      'answer',
    ]);
  });

  it('closing a thread keeps its untagged answers in it', () => {
    const closed = { ...shop, closed: true };
    const r = route(
      [user('[Thread: Shop · Checkout]\nhow far?', min(1)), answer('Form is done.', min(2))],
      [closed, weather]
    );
    expect(r.byThread.get('t1')).toHaveLength(2);
    expect(r.main.filter((i) => i.kind === 'answer')).toHaveLength(0);
  });
});

describe('unclear stays in the main chat (never guessed)', () => {
  it('an unknown tag', () => {
    const r = route([answer('[Thread: Shop · Payments]\nDone.', min(1))]);
    expect(r.byThread.size).toBe(0);
    expect(r.main.map((i) => i.kind)).toEqual(['answer']);
  });

  it('a tag in the middle of the text', () => {
    const r = route([answer('About [Thread: Shop · Checkout]: done.', min(1))]);
    expect(r.byThread.size).toBe(0);
  });

  it('a worker linked to two open threads', () => {
    const both = { ...weather, agents: ['omp-aaaa0000-0000-0000-0000-000000000001'] };
    const r = route([worker('omp-aaaa0000', 'which one?', min(1))], [shop, both]);
    expect(r.byThread.size).toBe(0);
    expect(r.main.map((i) => i.kind)).toEqual(['user']);
  });

  it('a worker id too short to be sure, an unknown sender, a closed thread', () => {
    const closed = { ...shop, closed: true };
    expect(route([worker('omp-a', 'x', min(1))]).byThread.size).toBe(0);
    expect(route([user('[via orkumo send, sender unknown]\n\nx', min(1))]).byThread.size).toBe(0);
    expect(route([worker('omp-aaaa0000', 'x', min(1))], [closed]).byThread.size).toBe(0);
  });
});

describe('unread', () => {
  it('counts answers and worker messages after the read time, not own prompts', () => {
    const t = { ...shop, readAt: min(2) };
    const r = route(
      [
        user('[Thread: Shop · Checkout]\nq', min(1)),
        answer('[Thread: Shop · Checkout]\nold', min(2)),
        user('[Thread: Shop · Checkout]\nq2', min(3)),
        answer('[Thread: Shop · Checkout]\nnew', min(4)),
        worker('omp-aaaa0000', 'green', min(5)),
      ],
      [t]
    );
    expect(r.byThread.get('t1')).toHaveLength(5);
    expect(unreadCount(r.byThread.get('t1') ?? [], t.readAt)).toBe(2);
  });
});

describe('reply quote', () => {
  it('header with the time and the quoted lines; parsed back for the sent bubble', () => {
    const at = new Date(2026, 10, 24, 9, 32).getTime();
    const head = quoteHeader(at, 'Line one\nLine two');
    expect(head).toBe('Re your reply from 09:32: "Line one\nLine two"\n\n');
    expect(parseQuote(`${head}Go ahead`)).toEqual({
      time: '09:32',
      quote: 'Line one\nLine two',
      body: 'Go ahead',
    });
    expect(parseQuote('plain')).toBeNull();
  });

  it('a long quote keeps its first lines and is cut', () => {
    const long = Array.from({ length: 10 }, (_, i) => `line ${i}`).join('\n');
    const q = parseQuote(`${quoteHeader(T0, long)}ok`);
    expect(q?.quote.split('\n').length).toBeLessThanOrEqual(3);
    expect(q?.quote.endsWith('…')).toBe(true);
  });
});

describe('answer time', () => {
  it('the reducer keeps the time of an answer', () => {
    const s = reduceChat(initialChatState, {
      type: 'assistant',
      ts: min(7),
      message: { id: 'm1', content: [{ type: 'text', text: 'hi' }] },
    });
    expect(s.messages[0]).toMatchObject({ kind: 'assistant', ts: min(7) });
  });
});

describe('a command sent from a thread (no tag: the CLI runs a command only as the first word)', () => {
  const CMDS = [
    { name: 'status-report', description: '' },
    { name: 'skill:ping', description: '' },
    { name: 'mattpocock-skills:retro', description: '' },
  ];
  it('a message that starts with a command goes out unchanged; any other keeps its tag', () => {
    expect(threadCommand('/status-report', CMDS)).toBe('/status-report');
    expect(threadCommand('/skill:ping now', CMDS)).toBe('/skill:ping');
    expect(threadCommand(' /mattpocock-skills:retro Dann …', CMDS)).toBe(
      '/mattpocock-skills:retro'
    );
    // with or without the plugin prefix the list has
    expect(threadCommand('/retro', CMDS)).toBe('/retro');
    expect(threadCommand('/demo:status-report', CMDS)).toBe('/demo:status-report');
    expect(threadCommand('how far? /status-report', CMDS)).toBeNull();
    // a path is text, not a command
    expect(threadCommand('/Users/someone/file.ts broken', CMDS)).toBeNull();
  });

  it('a sentence starting with a slash-word that is no listed command keeps its tag', () => {
    expect(threadCommand('/tmp ist voll, bitte aufräumen', CMDS)).toBeNull();
    expect(threadCommand('/status-report', [])).toBeNull();
  });

  // the transcript as the host serves it: `/status-report` is the user turn (Claude), then a
  // turn of tool steps and text without a tag
  const commandTurn = (at: number) =>
    groupAnswers(
      [
        { type: 'devorbit_user', text: '/status-report', history: true, ts: at },
        {
          type: 'assistant',
          ts: at + 1000,
          message: { id: 'm1', content: [{ type: 'tool_use', id: 'x1', name: 'Bash', input: {} }] },
        },
        {
          type: 'assistant',
          ts: at + 2000,
          message: { id: 'm2', content: [{ type: 'text', text: 'Report sent.' }] },
        },
      ].reduce(reduceChat, initialChatState).messages
    );

  it('its turn (prompt and answer) goes to the thread whose command mark is before it', () => {
    const marked = { ...shop, commands: [{ at: min(1), command: '/status-report' }] };
    const items = [
      ...groupAnswers([user('main question', min(0)), answer('main answer', min(0))]),
      ...commandTurn(min(1) + 500),
    ];
    const r = routeThreads(items, [marked, weather]);
    expect(r.byThread.get('t1')?.map((i) => i.kind)).toEqual(['user', 'answer']);
    expect(r.main.map((i) => i.kind)).toEqual(['user', 'answer', 'thread']);
  });

  it('a tidy-up move beats a command mark; a merge carries the marked turn to its target', () => {
    const marked = { ...shop, commands: [{ at: min(1), command: '/status-report' }] };
    const items = commandTurn(min(1) + 500);
    const moved = routeThreads(items, [marked, weather], true, undefined, {
      entries: { [entryKey(items[0])]: 'main' },
      merged: {},
    });
    expect(moved.byThread.size).toBe(0);
    const merged = routeThreads(items, [marked, weather], true, undefined, {
      entries: {},
      merged: { t1: 't2' },
    });
    expect(merged.byThread.get('t2')).toHaveLength(2);
  });

  it('after reload too: the mark is part of the stored thread, routing is the same', () => {
    const marked = { ...shop, commands: [{ at: min(1), command: '/status-report' }] };
    const items = commandTurn(min(1) + 500);
    const again = routeThreads(items, JSON.parse(JSON.stringify([marked, weather])), true);
    expect(again.byThread.get('t1')).toHaveLength(2);
  });

  it('one mark claims one command turn; a command from the main chat stays there', () => {
    const marked = { ...shop, commands: [{ at: min(1), command: '/status-report' }] };
    const items = [...commandTurn(min(2)), ...commandTurn(min(3))];
    const r = routeThreads(items, [marked, weather], true);
    expect(r.byThread.get('t1')).toHaveLength(2);
    expect(r.main.filter((i) => i.kind === 'user')).toHaveLength(1);
  });

  it('a mark claims only its own command: a /compact from the thread (no turn) never takes a later one', () => {
    const marked = { ...shop, commands: [{ at: min(1), command: '/compact' }] };
    const r = routeThreads(commandTurn(min(30)), [marked, weather]);
    expect(r.byThread.size).toBe(0);
  });

  it('the CLI may log a skill with its plugin prefix', () => {
    const marked = { ...shop, commands: [{ at: min(1), command: '/retro' }] };
    const items = groupAnswers([
      user('/demo-skills:retro what went wrong?', min(2)),
      answer('This.', min(3)),
    ]);
    expect(routeThreads(items, [marked, weather], true).byThread.get('t1')).toHaveLength(2);
  });

  // Claude Code hands a prompt typed during a running turn to that turn (`queued_command`); a
  // command waits and is logged when the turn ends, after the main prompt typed later
  it('busy orchestrator: a main prompt typed after the queued thread command stays in main', () => {
    const marked = { ...shop, commands: [{ at: min(1), command: '/status-report' }] };
    const items = [
      ...groupAnswers([user('busy turn', min(0)), answer('working', min(0) + 1)]),
      ...groupAnswers([user('Antworte nur mit MAINQ.', min(1) + 2000), answer('MAINQ', min(2))]),
      ...commandTurn(min(2) + 30_000),
    ];
    const r = routeThreads(items, [marked, weather], true);
    expect(r.byThread.get('t1')?.map((i) => i.kind)).toEqual(['user', 'answer']);
    expect(
      r.main.filter((i) => i.kind === 'user').map((i) => (i as { text: string }).text)
    ).toEqual(['busy turn', 'Antworte nur mit MAINQ.']);
  });

  it('a Status-view instruction of another thread typed between mark and queued command', () => {
    const marked = { ...shop, commands: [{ at: min(1), command: '/status-report' }] };
    const items = [
      ...groupAnswers([
        user(`${weather.tag}\nbitte X`, min(1) + 100),
        answer(`${weather.tag}\nok`, min(1) + 200),
      ]),
      ...commandTurn(min(2)),
    ];
    const r = routeThreads(items, [marked, weather], true);
    expect(r.byThread.get('t1')).toHaveLength(2);
    expect(r.byThread.get('t2')).toHaveLength(2);
  });

  it('a worker message between mark and command (agent busy): the command still goes to the thread', () => {
    const marked = { ...shop, commands: [{ at: min(1), command: '/status-report' }] };
    const items = [
      ...groupAnswers([worker('omp-bbbb', 'done', min(1) + 100), answer('ok', min(1) + 200)]),
      ...commandTurn(min(2)),
    ];
    expect(routeThreads(items, [marked, weather], true).byThread.get('t1')).toHaveLength(2);
  });

  it('two marks claim one command each; a third identical command from main stays', () => {
    const marked = {
      ...shop,
      commands: [
        { at: min(1), command: '/status-report' },
        { at: min(1) + 10, command: '/status-report' },
      ],
    };
    const items = [
      ...groupAnswers([user('plain', min(1) + 500), answer('ok', min(1) + 600)]),
      ...commandTurn(min(2)),
      ...commandTurn(min(3)),
      ...commandTurn(min(4)),
    ];
    const r = routeThreads(items, [marked, weather], true);
    expect(r.byThread.get('t1')).toHaveLength(4);
    expect(r.main.filter((i) => i.kind === 'user')).toHaveLength(2);
  });

  it('window starting at the thread command: claimed when the prompt before the window is older than the mark', () => {
    const marked = { ...shop, commands: [{ at: min(1), command: '/status-report' }] };
    const items = [
      ...commandTurn(min(1) + 300),
      ...groupAnswers([user('later main', min(3)), answer('x', min(4))]),
    ];
    expect(routeThreads(items, [marked, weather], false, min(0)).byThread.get('t1')).toHaveLength(
      2
    );
    // no proof (older host) or a prompt at/after the mark before the window: undecided, main
    expect(routeThreads(items, [marked, weather], false).byThread.size).toBe(0);
    expect(routeThreads(items, [marked, weather], false, min(1)).byThread.size).toBe(0);
  });

  it('paged window: the thread turn is paged out, a later main /status-report stays in main', () => {
    const marked = { ...shop, commands: [{ at: min(1), command: '/status-report' }] };
    const items = commandTurn(min(300));
    const r = routeThreads(items, [marked, weather], false);
    expect(r.main.filter((i) => i.kind === 'user')).toHaveLength(1);
    expect(r.byThread.size).toBe(0);
    // the host names the thread's own command as the prompt before the window: still main
    expect(routeThreads(items, [marked, weather], false, min(1) + 500).byThread.size).toBe(0);
    // once the older pages are in, the mark finds its own turn again
    const all = routeThreads([...commandTurn(min(1) + 500), ...items], [marked, weather], true);
    expect(all.byThread.get('t1')).toHaveLength(2);
    expect(all.main.filter((i) => i.kind === 'user')).toHaveLength(1);
  });

  it('a command before the mark, a prompt that is no command, a worker message: not claimed', () => {
    const marked = { ...shop, commands: [{ at: min(5), command: '/status-report' }] };
    const r = routeThreads(
      [
        ...commandTurn(min(1)),
        ...groupAnswers([user('plain', min(6)), answer('ok', min(6) + 1)]),
        ...groupAnswers([worker('omp-bbbb', '/status-report', min(7))]),
      ],
      [marked, weather]
    );
    expect(r.byThread.size).toBe(0);
  });
});

describe('a replay page that starts at the thread command (devorbit_page olderTs)', () => {
  const marked = { ...shop, commands: [{ at: T0 + 1000, command: '/status-report' }] };
  const turn = (text: string, at: number, i: number) => [
    { type: 'devorbit_user', text, history: true, ts: at },
    {
      type: 'assistant',
      ts: at + 500,
      message: { id: `m${i}`, content: [{ type: 'text', text: `answer ${i}` }] },
    },
  ];
  const events = (olderTs?: number) => [
    { type: 'system', subtype: 'init', model: 'x' },
    { type: 'devorbit_page', before: 40, more: true, ...(olderTs ? { olderTs } : {}) },
    ...turn('/status-report', T0 + 1200, 0),
    ...Array.from({ length: 19 }, (_, i) => turn(`main ${i}`, T0 + 10_000 * (i + 1), i + 1)).flat(),
  ];
  const routed = (olderTs?: number) => {
    const state = events(olderTs).reduce(reduceChat, initialChatState);
    return routeThreads(
      groupAnswers(state.messages),
      [marked, weather],
      !state.older?.more,
      state.older?.olderTs
    );
  };
  it('the command turn routes to the thread although the window starts at it', () => {
    expect(routed(T0 + 500).byThread.get('t1')).toHaveLength(2);
  });
  it('without the host proof it waits for the older page', () => {
    expect(routed().byThread.size).toBe(0);
  });
  it('an older page keeps the proof of the page before it', () => {
    const state = prependHistory(events().reduce(reduceChat, initialChatState), {
      events: [],
      before: 0,
      more: true,
      olderTs: T0 + 500,
    });
    expect(state.older?.olderTs).toBe(T0 + 500);
  });
});

describe('tidy-up overrides (stored by the orchestrator, win over tag and turn)', () => {
  const docs = thread('t3', 'Docs', 'Guide');
  const all = [shop, weather, docs];
  const msgs = () => [
    user('hello', min(1)),
    answer('Plan for today', min(2)),
    user('[Thread: Shop · Checkout]\nhow far?', min(3)),
    answer('Form is done.', min(4)),
    user('[Thread: Weather app · Offline cache]\nship it?', min(5)),
    answer('[Thread: Weather app · Offline cache]\nYes.', min(6)),
    user('[Thread: Docs · Guide]\nwrite it', min(7)),
  ];
  const items = (m: ChatMessage[]) => groupAnswers(m);
  const keysOf = (r: ReturnType<typeof routeThreads>) => [
    ...r.main.filter((i) => i.kind !== 'thread').map((i) => i.key),
    ...[...r.byThread.values()].flat().map((i) => i.key),
  ];
  /** every item lands exactly once across main and threads */
  const once = (r: ReturnType<typeof routeThreads>, list: ChatItem[]) =>
    expect(keysOf(r).sort()).toEqual(list.map((i) => i.key).sort());

  it('entryKey strips the history page prefixes', () => {
    expect(entryKey({ key: 'h12:h7:msg_1' })).toBe('msg_1');
    expect(entryKey({ key: 'msg_1' })).toBe('msg_1');
  });

  it('moves a main-chat answer into another thread', () => {
    const list = items(msgs());
    const plan = list[1];
    const r = routeThreads(list, all, false, undefined, {
      entries: { [entryKey(plan)]: 't2' },
      merged: {},
    });
    expect(r.byThread.get('t2')?.[0]).toBe(plan);
    expect(r.main.some((i) => i === plan)).toBe(false);
    once(r, list);
  });

  it('moves a tagged thread prompt to the main chat; its untagged answer follows it', () => {
    const list = items(msgs());
    const prompt = list[2];
    const r = routeThreads(list, all, false, undefined, {
      entries: { [entryKey(prompt)]: 'main' },
      merged: {},
    });
    expect(r.main).toContain(prompt);
    expect(r.main).toContain(list[3]);
    expect(r.byThread.get('t1') ?? []).toHaveLength(0);
    once(r, list);
  });

  it('matches entries loaded from an older history page by their raw key', () => {
    const list = items(msgs()).map((i) => ({ ...i, key: `h40:${i.key}` }) as ChatItem);
    const r = routeThreads(list, all, false, undefined, {
      entries: { [entryKey(list[1])]: 't3' },
      merged: {},
    });
    expect(r.byThread.get('t3')).toContain(list[1]);
    once(r, list);
  });

  it('a merge chain sends everything to the final thread; sources get no marker and are hidden', () => {
    const list = items(msgs());
    const overrides = { entries: { [entryKey(list[0])]: 't1' }, merged: { t1: 't2', t2: 't3' } };
    const r = routeThreads(list, all, false, undefined, overrides);
    expect([...r.byThread.keys()]).toEqual(['t3']);
    // "Plan for today" is the untagged answer of the moved prompt: it follows into t3
    expect(r.byThread.get('t3')).toHaveLength(list.length);
    expect(r.main.filter((i) => i.kind === 'thread').map((m) => m.threadId)).toEqual(['t3']);
    expect(visibleThreads(all, overrides).map((x) => x.id)).toEqual(['t3']);
    once(r, list);
  });

  it('ignores an override to an unknown thread and survives a merge cycle', () => {
    const list = items(msgs());
    const r = routeThreads(list, all, false, undefined, {
      entries: { [entryKey(list[0])]: 'gone' },
      merged: { t1: 't2', t2: 't1' },
    });
    expect(r.main).toContain(list[0]);
    once(r, list);
  });

  it('a merged thread opened on an answer adds no marker of its own', () => {
    const parent = answer('Plan', min(1));
    const opened = thread('t4', 'Shop', 'Plan', { parentKey: parent.key });
    const list = items([parent, user(`${opened.tag}\nwhy?`, min(2))]);
    const r = routeThreads(list, [shop, opened], false, undefined, {
      entries: {},
      merged: { t4: 't1' },
    });
    const markers = r.main.filter((i) => i.kind === 'thread');
    expect(markers.map((m) => m.threadId)).toEqual(['t1']);
    expect(r.byThread.get('t1')).toHaveLength(1);
  });

  it('without overrides nothing changes', () => {
    const list = items(msgs());
    expect(routeThreads(list, all)).toEqual(routeThreads(list, all, false, undefined, undefined));
    once(routeThreads(list, all), list);
  });
});

describe('thread title', () => {
  it('strips Markdown left in stored names and shows a doubled part once', () => {
    expect(threadTitle({ project: '- **Stand:**', task: '`Briefing` #1' })).toBe(
      'Stand: · Briefing #1'
    );
    expect(threadTitle({ project: '## Shop', task: 'Checkout' })).toBe('Shop · Checkout');
    expect(threadTitle({ project: 'Thread', task: 'Thread' })).toBe('Thread');
  });
});

describe('user entries keep the key the server sends', () => {
  it('uses `key` of a transcript user message when present', () => {
    const s = reduceChat(initialChatState, { type: 'devorbit_user', text: 'hi', key: 'uuid-1' });
    expect(s.messages[0].key).toBe('uuid-1');
  });
});
