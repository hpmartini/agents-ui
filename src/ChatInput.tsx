import React, { useLayoutEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { Agent } from './transport';
import { typeIntoPane, usePaneConnected } from './AgentTerminal';

/**
 * Message box under the panes: typed into the active pane's terminal like a paste plus Enter (as
 * Orkumo's UI view does), so it needs no transport call of its own. Enter sends, Shift+Enter breaks.
 */
export const ChatInput: React.FC<{ target: Agent | null }> = ({ target }) => {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const connected = usePaneConnected(target?.id ?? null);
  const ready = !!target && connected;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    // border-box: scrollHeight leaves out the borders
    el.style.height = `${Math.min(el.scrollHeight + el.offsetHeight - el.clientHeight, 160)}px`;
  }, [text]);

  const send = () => {
    if (!target || !text.trim()) return;
    if (typeIntoPane(target.id, text)) setText('');
  };

  return (
    <form
      className="flex items-end gap-2 p-2 border-t border-ag-border bg-ag-surface shrink-0"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <textarea
        ref={ref}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
          }
        }}
        disabled={!ready}
        aria-label={target ? `Message to ${target.name}` : 'Message'}
        placeholder={
          !target
            ? 'Open an agent to write to it'
            : connected
              ? `Message ${target.name}…`
              : `${target.name} is not connected`
        }
        className="flex-1 resize-none rounded-md border border-ag-border bg-ag-bg px-2.5 py-1.5 text-sm text-ag-text placeholder:text-ag-faint focus:outline-none focus:border-ag-accent disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={!ready || !text.trim()}
        className="p-2 rounded-md bg-ag-accent text-ag-on-accent hover:opacity-90 disabled:opacity-40"
        aria-label="Send"
        title="Send (Enter)"
      >
        <Send size={14} />
      </button>
    </form>
  );
};
