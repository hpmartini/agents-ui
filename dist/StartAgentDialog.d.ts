import React from 'react';
import type { StartAgentRequest } from './transport';
export interface StartAgentDialogProps {
    defaultCwd: string;
    onStart: (request: StartAgentRequest) => Promise<void>;
    onClose: () => void;
}
/** Task, folder, optional name; Cmd/Ctrl+Enter starts, Esc closes */
export declare const StartAgentDialog: React.FC<StartAgentDialogProps>;
