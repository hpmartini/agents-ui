import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from 'react';
import { X } from 'lucide-react';
import { DispatchInput } from '../AgentsView/DispatchInput';
import { NewKindTabs } from '../AgentsView/NewTaskButton';
import { useDialogA11y } from './useDialogA11y';
import { ImageAttachments, imageDropHandlers } from '../ImageAttachments';
import { attachableFiles } from '../../utils/composer';
import { useTransport } from '../../host';
/**
 * "New task" / "New agent" dialog around the dispatch input. Attachments need the transport's
 * `uploads` group.
 */
export const TaskComposerModal = ({ open, onClose, images, onImagesChange, onKindChange, hiddenKinds, ...inputProps }) => {
    const dialogRef = useRef(null);
    const trapTab = useDialogA11y(open, dialogRef, () => inputProps.inputRef.current);
    const extensions = useTransport().uploads?.attachmentExtensions;
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-[90] bg-gray-950/70 flex items-start justify-center px-4 pt-[12vh]", onMouseDown: onClose, children: _jsxs("div", { ref: dialogRef, role: "dialog", "aria-modal": "true", "aria-labelledby": "task-composer-title", tabIndex: -1, onKeyDown: (e) => {
                trapTab(e);
                // The textarea closes its own suggestions first and marks the event handled
                if (e.key === 'Escape' && !e.defaultPrevented) {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                }
            }, onMouseDown: (e) => e.stopPropagation(), ...(extensions &&
                imageDropHandlers((files) => onImagesChange([...images, ...files]), (list) => attachableFiles(list, extensions))), className: "w-full max-w-[680px] bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-4", children: [_jsxs("div", { className: "flex items-center mb-3", children: [_jsx("h2", { id: "task-composer-title", className: "text-sm font-semibold text-gray-50", children: inputProps.variant === 'chat'
                                ? 'New chat'
                                : inputProps.variant === 'agent'
                                    ? 'New agent'
                                    : 'New task' }), onKindChange && (_jsx("div", { className: "ml-3", children: _jsx(NewKindTabs, { kind: inputProps.variant ?? 'task', onChange: onKindChange, disabled: inputProps.disabled, hidden: hiddenKinds }) })), _jsx("button", { type: "button", onClick: onClose, className: "ml-auto p-1.5 rounded-md text-gray-200 hover:bg-gray-700 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400", "aria-label": "Close", children: _jsx(X, { size: 15 }) })] }), _jsx(DispatchInput, { ...inputProps, onEscape: onClose, attachments: extensions && (_jsx(ImageAttachments, { images: images, onChange: onImagesChange, disabled: inputProps.disabled, files: extensions, note: images.length ? 'Stays local, handed to the agent by path' : undefined })) })] }) }));
};
