import React from 'react';
import type { AgentSession } from '../../types';
interface PeekPanelProps {
    session: AgentSession;
    onClose: () => void;
    onAttach: () => void;
    onReply: (text: string) => Promise<void>;
}
/**
 * Peek panel: recent output / blocking question of a session plus a reply input.
 * Numbered keys pick predefined choices, Tab inserts the suggested reply,
 * a `!` prefix sends a shell command instead of a prompt. The maximize button shows the same
 * panel as a near full-screen modal for wide output (tables, long answers).
 * Without the transport's `logs` group there is no output; without `messaging` no reply input
 * and no choice buttons (read-only peek).
 */
export declare const PeekPanel: React.FC<PeekPanelProps>;
export {};
