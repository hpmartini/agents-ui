import React from 'react';
type Pick = (list: FileList | File[] | null | undefined) => File[];
/**
 * Paste / drop handlers for a composer dialog; spread them on the dialog element so a paste
 * into any of its fields adds the images (`pick` = attachableFiles: also PDF, text and code).
 */
export declare function imageDropHandlers(onAdd: (files: File[]) => void, pick?: Pick): {
    onPaste: (e: React.ClipboardEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
};
interface ImageAttachmentsProps {
    images: File[];
    onChange: (images: File[]) => void;
    disabled?: boolean;
    /** Shown next to the button, e.g. where the images end up */
    note?: string;
    /**
     * Also these file extensions besides images (agent prompts, #19 AK-3: PDF, text and code; the
     * transport's `uploads.attachmentExtensions`); issues take images only
     */
    files?: readonly string[];
}
/** Thumbnails of the attached images, chips of attached files, plus a file picker */
export declare const ImageAttachments: React.FC<ImageAttachmentsProps>;
export {};
