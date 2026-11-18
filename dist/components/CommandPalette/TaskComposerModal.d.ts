import React from 'react';
import { DispatchInput } from '../AgentsView/DispatchInput';
import { type NewKind, type NewMenuKind } from '../AgentsView/NewTaskButton';
type DispatchInputProps = React.ComponentProps<typeof DispatchInput>;
interface TaskComposerModalProps extends Omit<DispatchInputProps, 'onEscape' | 'attachments'> {
    open: boolean;
    onClose: () => void;
    /** Images handed to the session as local file paths */
    images: File[];
    onImagesChange: (images: File[]) => void;
    /** Shows the Task/Agent/Chat/Issue switch (#271) */
    onKindChange?: (kind: NewKind) => void;
    /** Kinds the switch leaves out (the host cannot create them) */
    hiddenKinds?: readonly NewMenuKind[];
}
/**
 * "New task" / "New agent" dialog around the dispatch input. Attachments need the transport's
 * `uploads` group.
 */
export declare const TaskComposerModal: React.FC<TaskComposerModalProps>;
export {};
