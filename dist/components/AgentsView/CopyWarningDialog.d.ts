import React from 'react';
import type { AgentSession } from '../../types';
/** Asks before a resume that puts a second writer on a transcript another process holds (#236) */
export declare const CopyWarningDialog: React.FC<{
    holder: AgentSession;
    /** The caller stops the holder before it resumes; otherwise both keep running */
    handover: boolean;
    onConfirm: () => void;
    onClose: () => void;
}>;
