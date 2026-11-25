/**
 * What a chat is doing, derived from its messages (#189 follow-up): the plan (TaskCreate /
 * TaskUpdate / TodoWrite), background shells, sub-agents and the steps of the running turn.
 */
import type { ChatBlock, ChatMessage } from './chatEvents';

type ToolBlock = Extract<ChatBlock, { type: 'tool' }>;

const toolBlocks = (messages: ChatMessage[]): ToolBlock[] =>
  messages.flatMap((m) =>
    m.kind === 'assistant' ? m.blocks.filter((b): b is ToolBlock => b?.type === 'tool') : []
  );

export interface PlanItem {
  id: string;
  subject: string;
  status: 'pending' | 'in_progress' | 'completed';
}

const asStatus = (v: unknown): PlanItem['status'] | null =>
  v === 'pending' || v === 'in_progress' || v === 'completed' ? v : null;

/** Latest plan state; TaskCreate ids come from the result ("Task #3 created"), else in order */
export function chatPlan(messages: ChatMessage[]): PlanItem[] {
  let items: PlanItem[] = [];
  let seq = 0;
  for (const b of toolBlocks(messages)) {
    if (b.name === 'TodoWrite' && Array.isArray(b.input.todos)) {
      items = (b.input.todos as Record<string, unknown>[]).map((t, i) => ({
        id: String(i + 1),
        subject: String(t.content ?? t.subject ?? ''),
        status: asStatus(t.status) ?? 'pending',
      }));
    } else if (b.name === 'TaskCreate') {
      const id = b.result?.match(/Task #(\S+?) created/)?.[1] ?? String(++seq);
      seq = Math.max(seq, Number(id) || seq);
      items = [...items, { id, subject: String(b.input.subject ?? ''), status: 'pending' }];
    } else if (b.name === 'TaskUpdate') {
      const id = String(b.input.taskId ?? '');
      if (b.input.status === 'deleted') {
        items = items.filter((t) => t.id !== id);
        continue;
      }
      items = items.map((t) =>
        t.id !== id
          ? t
          : {
              ...t,
              status: asStatus(b.input.status) ?? t.status,
              subject: typeof b.input.subject === 'string' ? b.input.subject : t.subject,
            }
      );
    }
  }
  return items;
}

export interface ChatShell {
  id: string;
  command: string;
  description: string;
}

/** Reported ends plus tasks the agent stopped itself (TaskStop / KillShell send no notification) */
function endedIds(messages: ChatMessage[], ended: string[]): Set<string> {
  const ids = new Set(ended);
  for (const b of toolBlocks(messages))
    if ((b.name === 'TaskStop' || b.name === 'KillShell') && b.result !== undefined && !b.isError)
      ids.add(String(b.input.task_id ?? b.input.shell_id ?? ''));
  return ids;
}

/** Background shells still running: started by Bash `run_in_background`, no end reported yet */
export function chatShells(messages: ChatMessage[], ended: string[] = []): ChatShell[] {
  const done = endedIds(messages, ended);
  return toolBlocks(messages).flatMap((b) => {
    if (b.name !== 'Bash' || !b.input.run_in_background) return [];
    const id = b.result?.match(/running in background with ID: (\w+)/)?.[1];
    return id && !done.has(id)
      ? [
          {
            id,
            command: String(b.input.command ?? ''),
            description: String(b.input.description ?? ''),
          },
        ]
      : [];
  });
}

export interface ChatSubagent {
  toolId: string;
  type: string;
  description: string;
  done: boolean;
  isError: boolean;
}

/**
 * A background agent's result is only its launch receipt: it ends with its <task-notification>,
 * named by tool-use id or (without one, e.g. after a resume) by the receipt's agentId
 */
function agentDone(b: ToolBlock, ended: Set<string>): boolean {
  if (b.result === undefined) return ended.has(b.id);
  const receipt = String(b.result);
  if (!/^Async agent launched/.test(receipt)) return true;
  const agentId = receipt.match(/agentId: (\w+)/)?.[1];
  return ended.has(b.id) || (!!agentId && ended.has(agentId));
}

export function chatSubagents(messages: ChatMessage[], ended: string[] = []): ChatSubagent[] {
  const over = endedIds(messages, ended);
  return toolBlocks(messages)
    .filter((b) => b.name === 'Agent' || b.name === 'Task')
    .map((b) => ({
      toolId: b.id,
      type: String(b.input.subagent_type ?? 'agent'),
      description: String(b.input.description ?? ''),
      done: agentDone(b, over),
      isError: b.isError === true,
    }));
}

/** Thinking + tool blocks since the last user message: the work of the current turn */
export function turnSteps(messages: ChatMessage[]): ChatBlock[] {
  let from = 0;
  messages.forEach((m, i) => {
    if (m.kind === 'user') from = i + 1;
  });
  return messages
    .slice(from)
    .flatMap((m) => (m.kind === 'assistant' ? m.blocks.filter((b) => b && b.type !== 'text') : []));
}
