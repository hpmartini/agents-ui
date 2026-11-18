import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef } from 'react';
import { FileText, ImagePlus, Paperclip, X } from 'lucide-react';
import { PROMPT_IMAGE_TYPES, attachableFiles, imageFiles } from '../utils/composer';
/**
 * Paste / drop handlers for a composer dialog; spread them on the dialog element so a paste
 * into any of its fields adds the images (`pick` = attachableFiles: also PDF, text and code).
 */
export function imageDropHandlers(onAdd, pick = imageFiles) {
    return {
        onPaste: (e) => {
            const files = pick(e.clipboardData?.files);
            if (files.length === 0)
                return;
            e.preventDefault();
            onAdd(files);
        },
        onDragOver: (e) => {
            if (Array.from(e.dataTransfer.types).includes('Files'))
                e.preventDefault();
        },
        onDrop: (e) => {
            const files = pick(e.dataTransfer.files);
            if (files.length === 0)
                return;
            e.preventDefault();
            onAdd(files);
        },
    };
}
/** Thumbnails of the attached images, chips of attached files, plus a file picker */
export const ImageAttachments = ({ images, onChange, disabled, note, files, }) => {
    const inputRef = useRef(null);
    const urls = useMemo(() => images.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)), [images]);
    useEffect(() => () => urls.forEach((u) => u && URL.revokeObjectURL(u)), [urls]);
    const remove = (file, i) => (_jsx("button", { type: "button", disabled: disabled, onClick: () => onChange(images.filter((_, j) => j !== i)), className: "absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-gray-900 border border-gray-600 text-gray-200 hover:text-white hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-blue-400", "aria-label": `Remove ${file.name || `attachment ${i + 1}`}`, children: _jsx(X, { size: 11 }) }));
    return (_jsxs("div", { className: "flex flex-wrap items-center gap-2 mt-2", children: [images.map((file, i) => {
                const url = urls[i];
                return url ? (_jsxs("div", { className: "relative group", children: [_jsx("img", { src: url, alt: file.name || `Image ${i + 1}`, className: "h-14 w-14 object-cover rounded-md border border-gray-600" }), remove(file, i)] }, url)) : (_jsxs("div", { className: "relative flex items-center gap-1.5 h-9 max-w-[14rem] pl-2 pr-3 rounded-md border border-gray-600 bg-gray-900 text-xs text-gray-200", title: file.name, children: [_jsx(FileText, { size: 13, className: "shrink-0 text-gray-400", "aria-hidden": true }), _jsx("span", { className: "truncate", children: file.name }), remove(file, i)] }, `${file.name}-${i}`));
            }), _jsxs("button", { type: "button", disabled: disabled, onClick: () => inputRef.current?.click(), className: "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-gray-200 hover:bg-gray-700 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50", title: files
                    ? 'Attach images, PDF, text or code files up to 20 MB (or paste / drop them)'
                    : 'Attach images (or paste / drop them)', children: [files ? _jsx(Paperclip, { size: 13, "aria-hidden": true }) : _jsx(ImagePlus, { size: 13, "aria-hidden": true }), files ? 'Attach' : 'Add image'] }), note && _jsx("span", { className: "text-[11px] text-gray-400", children: note }), _jsx("input", { ref: inputRef, type: "file", accept: files
                    ? [...PROMPT_IMAGE_TYPES, ...files.map((e) => `.${e}`)].join(',')
                    : 'image/png,image/jpeg,image/gif,image/webp', multiple: true, hidden: true, "data-testid": "attachment-input", onChange: (e) => {
                    onChange([
                        ...images,
                        ...(files ? attachableFiles(e.target.files, files) : imageFiles(e.target.files)),
                    ]);
                    e.target.value = '';
                } })] }));
};
