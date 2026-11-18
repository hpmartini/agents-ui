import React from 'react';
import type { AgentPastSession } from '../../types';
interface ResumePickerProps {
    open: boolean;
    initialQuery: string;
    cwd: string | null;
    onClose: () => void;
    onResume: (session: AgentPastSession) => void;
}
/**
 * `/resume` picker: past sessions newest first, Enter resumes as a background session.
 * Needs the transport's `history` group; without it the picker never opens.
 */
export declare const ResumePicker: React.FC<ResumePickerProps>;
export {};
