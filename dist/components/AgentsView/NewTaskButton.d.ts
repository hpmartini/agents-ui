import React from 'react';
export type NewKind = 'task' | 'agent' | 'chat' | 'issue';
/** Dropdown entries: the dialog kinds plus "New orchestrator", which starts right away */
export type NewMenuKind = NewKind | 'orchestrator';
/** An orchestrator role (`<workspace>/roles/<id>.md`) offered under "New orchestrator" */
export interface NewOrchestratorRole {
    id: string;
    title: string;
}
/** [New task | ⌄]: the main part starts a task, the chevron offers agent, chat, issue and orchestrator */
export declare const NewTaskButton: React.FC<{
    onNew: (kind: NewMenuKind, role?: string) => void;
    /** Orchestrator roles offered in the menu; onOpenMenu lets the caller reload them */
    roles?: readonly NewOrchestratorRole[];
    onOpenMenu?: () => void;
    /** Kinds the host cannot create (no issue tracker, no orchestrator, no UI view) */
    hidden?: readonly NewMenuKind[];
}>;
/** Switch between the four "new" dialogs while one is open (#271); the caller carries the draft over */
export declare const NewKindTabs: React.FC<{
    kind: NewKind;
    onChange: (kind: NewKind) => void;
    disabled?: boolean;
    /** Kinds the host cannot create */
    hidden?: readonly NewMenuKind[];
}>;
