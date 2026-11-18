import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TranscriptEntry, TransportError } from './transport';
import { useTransport } from './state';
import { useLabels } from './labels';

/** How close to the bottom (px) still counts as "following" the conversation */
const FOLLOW_SLACK = 48;

/**
 * The agent's conversation as a readable log: plain text only (no markup is interpreted), new
 * entries scroll into view while the reader sits at the bottom.
 */
export const AgentTranscript: React.FC<{ agentId: string }> = ({ agentId }) => {
  const transport = useTransport();
  const t = useLabels();
  const [entries, setEntries] = useState<TranscriptEntry[] | null>(null);
  const [error, setError] = useState<TransportError | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const following = useRef(true);

  useEffect(() => {
    setEntries(null);
    setError(null);
    following.current = true;
    return transport.transcript?.(
      agentId,
      (list) => {
        setEntries(list);
        setError(null);
      },
      setError
    );
  }, [transport, agentId]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && following.current) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const roleName = { user: t.you, assistant: t.agentRole, tool: t.toolRole };

  return (
    <div
      ref={scroller}
      onScroll={(e) => {
        const el = e.currentTarget;
        following.current = el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_SLACK;
      }}
      className="absolute inset-0 overflow-y-auto bg-ag-bg px-3 py-2 text-sm"
    >
      {error && (
        <p role="alert" className="mb-2 rounded border border-ag-danger/50 px-2 py-1.5 text-xs text-ag-danger">
          {t.transcriptFailed(error.message)}
        </p>
      )}
      {entries === null && !error && (
        <p role="status" className="text-xs text-ag-muted">
          {t.transcriptLoading}
        </p>
      )}
      {entries?.length === 0 && <p className="text-xs text-ag-muted">{t.transcriptEmpty}</p>}
      {entries && entries.length > 0 && (
        <ol role="log" aria-live="polite" className="flex flex-col gap-2 m-0 p-0 list-none">
          {entries.map((e) =>
            e.role === 'tool' ? (
              <li key={e.id} className="font-mono text-xs text-ag-faint truncate" title={e.text}>
                <span className="sr-only">{roleName.tool}: </span>↳ {e.text}
              </li>
            ) : (
              <li
                key={e.id}
                className={`rounded-md border px-2.5 py-1.5 ${
                  e.role === 'user'
                    ? 'self-end max-w-[85%] border-ag-accent/40 bg-ag-surface'
                    : 'self-start max-w-full border-ag-border'
                }`}
              >
                <div className="text-[11px] text-ag-muted mb-0.5">{roleName[e.role]}</div>
                <div className="whitespace-pre-wrap break-words text-ag-text">{e.text}</div>
              </li>
            )
          )}
        </ol>
      )}
    </div>
  );
};
