import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Code2, ExternalLink, FileText, FolderOpen, Files, Globe, Loader2, X } from 'lucide-react';
import { useTransport } from '../../../host';
import { useDialogA11y } from '../../CommandPalette/useDialogA11y';
import { relativeTime } from '../../../utils/chatHistory';
import { useOpenFile } from '../../../utils/openFile';
import { pollWhileVisible } from '../../../utils/visiblePoll';
import { ChatFileContext, ChatMarkdown, CopyButton } from './ChatMarkdown';
/** While the modal is open: documents appear without a tool call the client could see */
const MODAL_POLL_MS = 4000;
/** Tools whose result changes the list: file writes (omp's arrive mapped) and claude.ai publishes */
const FILE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'edit', 'Artifact']);
/** Changes when a file tool call finishes or a turn ends: then the list is fetched again */
export function artifactRefreshKey(messages, turns) {
    let done = 0;
    for (const m of messages)
        if (m.kind === 'assistant')
            for (const b of m.blocks)
                if (b?.type === 'tool' && b.result !== undefined && FILE_TOOLS.has(b.name))
                    done++;
    return `${done}:${turns}`;
}
const focusRing = 'focus-visible:outline-2 focus-visible:outline-blue-400';
const actionBtn = `flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-300 hover:text-white hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-300 ${focusRing}`;
/**
 * Artifacts of a chat, refetched whenever `refreshKey` changes (finished file tool calls,
 * turns). Errors keep the last list: the chat itself reports a gone session.
 */
const NONE = { files: [], pages: [] };
export function useChatArtifacts(chatId, refreshKey) {
    const [artifacts, setArtifacts] = useState(NONE);
    const api = useTransport().artifacts;
    useEffect(() => {
        if (!chatId || !api)
            return setArtifacts(NONE);
        let cancelled = false;
        api
            .fetchChatArtifacts(chatId)
            .then((list) => !cancelled && setArtifacts(list))
            .catch(() => { });
        return () => {
            cancelled = true;
        };
    }, [api, chatId, refreshKey]);
    return artifacts;
}
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
/** Pages the agent published or linked to; a page it only read is listed, not counted */
const countedPages = (pages) => pages.filter((p) => p.source !== 'read').length;
/** Footer button with both counts ("2 artifacts · 12 files"); hidden while there is neither */
export const ChatArtifactsButton = ({ artifacts, onOpen, }) => {
    const pages = countedPages(artifacts.pages);
    const files = artifacts.files.length;
    if (pages === 0 && files === 0)
        return null;
    return (_jsxs("button", { type: "button", onClick: onOpen, className: `shrink-0 flex items-center gap-1.5 px-2 py-1 rounded border border-gray-700 text-xs text-gray-300 hover:text-white hover:bg-gray-800 ${focusRing}`, title: "Claude artifacts (pages on claude.ai) and files this agent created or edited", children: [_jsx(Files, { size: 13, "aria-hidden": true, className: "text-gray-400" }), _jsx("span", { className: "tabular-nums text-gray-100", children: [pages > 0 && plural(pages, 'artifact'), files > 0 && plural(files, 'file')]
                    .filter(Boolean)
                    .join(' · ') })] }));
};
const GROUPS = [
    { label: 'Documents', test: (a) => a.kind === 'document' },
    { label: 'Created', test: (a) => a.kind === 'file' && a.action === 'created' },
    { label: 'Edited', test: (a) => a.kind === 'file' && a.action === 'edited' },
];
function formatSize(bytes) {
    if (bytes == null)
        return '';
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
/** Path for display: relative inside the session directory */
const shownPath = (file, cwd) => file.startsWith(`${cwd}/`) ? file.slice(cwd.length + 1) : file;
const isMarkdown = (file) => /\.(md|markdown|mdx)$/i.test(file);
/** Code with line numbers: two columns, so a 30k-line file stays two text nodes */
const CodePreview = ({ text }) => {
    const numbers = useMemo(() => {
        const count = text.split('\n').length;
        return Array.from({ length: count }, (_, i) => i + 1).join('\n');
    }, [text]);
    return (_jsxs("div", { className: "flex min-w-max text-xs leading-relaxed font-mono", children: [_jsx("pre", { "aria-hidden": true, className: "sticky left-0 shrink-0 select-none px-3 py-3 text-right text-gray-600 bg-gray-950 border-r border-gray-800", children: numbers }), _jsx("pre", { className: "px-3 py-3 text-gray-200", children: text })] }));
};
const GONE = { state: 'error', message: 'The file no longer exists.' };
const Preview = ({ chatId, cwd, artifact, }) => {
    const [preview, setPreview] = useState(artifact.exists ? { state: 'loading' } : GONE);
    const api = useTransport().artifacts;
    const openFile = useOpenFile();
    useEffect(() => {
        if (!api)
            return;
        if (!artifact.exists) {
            setPreview(GONE);
            return;
        }
        let cancelled = false;
        // Keep the old text while a changed file reloads: no flicker on live updates
        setPreview((p) => (p.state === 'ready' ? p : { state: 'loading' }));
        api
            .fetchChatArtifactContent(chatId, artifact.path)
            .then((d) => !cancelled && setPreview({ state: 'ready', content: d.content }))
            .catch((e) => !cancelled && setPreview({ state: 'error', message: e.message || 'Preview failed' }));
        return () => {
            cancelled = true;
        };
    }, [api, chatId, artifact.path, artifact.mtime, artifact.exists]);
    if (preview.state === 'loading')
        return (_jsxs("div", { className: "flex items-center justify-center h-full gap-2 text-sm text-gray-400", children: [_jsx(Loader2, { size: 14, "aria-hidden": true, className: "animate-spin motion-reduce:animate-none" }), "Loading preview\u2026"] }));
    if (preview.state === 'error')
        return (_jsxs("div", { className: "flex flex-col items-center justify-center h-full gap-1 px-6 text-center", children: [_jsx("p", { className: "text-sm text-gray-300", children: preview.message }), artifact.exists && openFile && (_jsx("p", { className: "text-xs text-gray-500", children: "Open it in VS Code or reveal it in Finder above." }))] }));
    if (!preview.content)
        return (_jsx("div", { className: "flex items-center justify-center h-full text-sm text-gray-500", children: "Empty file" }));
    return isMarkdown(artifact.path) ? (_jsx("div", { className: "px-5 py-4 max-w-3xl", children: _jsx(ChatFileContext.Provider, { value: cwd, children: _jsx(ChatMarkdown, { text: preview.content }) }) })) : (_jsx(CodePreview, { text: preview.content }));
};
const PAGE_SOURCE = {
    published: 'Published',
    linked: 'Linked',
    read: 'Read only',
};
/** Name of a page: its title, else label, else the artifact id */
const pageName = (p) => p.title || p.label || p.url.split('/').pop() || p.url;
/** Facts of a page as label/value rows; empty values are left out */
function pageFacts(p, cwd) {
    const facts = [
        ['Type', p.type],
        ['Status', PAGE_SOURCE[p.source]],
        ['Version', p.version != null ? String(p.version) : null],
        ['Updated', p.updatedAt != null ? new Date(p.updatedAt).toLocaleString() : null],
        ['Label', p.label],
        ['Description', p.description],
        ['Source', p.file && shownPath(p.file, cwd)],
        ['URL', p.url],
    ];
    return facts.filter((f) => !!f[1]);
}
/** Facts shown in monospace */
const MONO_FACTS = new Set(['Source', 'URL']);
/** The page's details; its source file is previewed when it is one of the listed files */
const PageDetail = ({ chatId, cwd, page, files }) => {
    const source = page.file ? files.find((f) => f.path === page.file) : undefined;
    const openFile = useOpenFile();
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-2 min-h-10 px-3 py-1.5 border-b border-gray-800 shrink-0", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-sm text-gray-100 truncate", children: pageName(page) }), _jsxs("div", { className: "text-[11px] text-gray-500 truncate", title: page.url, children: ["Claude artifact \u00B7 ", page.type, page.version != null && ` · version ${page.version}`] })] }), _jsxs("a", { href: page.url, target: "_blank", rel: "noreferrer noopener", className: `${actionBtn} !text-blue-300`, children: [_jsx(ExternalLink, { size: 13, "aria-hidden": true }), " Open on claude.ai"] }), openFile && (_jsxs("button", { type: "button", className: actionBtn, disabled: !page.file, title: page.file ?? 'No local source known', onClick: () => page.file && openFile(page.file, cwd, { editor: true }), children: [_jsx(Code2, { size: 13, "aria-hidden": true }), " Open source"] })), _jsx(CopyButton, { text: page.url, label: "Copy URL", className: "!text-xs !px-2 !py-1" })] }), _jsxs("div", { className: "flex-1 min-h-0 overflow-auto thin-scrollbar bg-gray-950", children: [_jsx("dl", { className: "grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 px-4 py-3 text-xs border-b border-gray-800", children: pageFacts(page, cwd).map(([k, v]) => (_jsxs(React.Fragment, { children: [_jsx("dt", { className: "text-gray-500", children: k }), _jsx("dd", { className: `min-w-0 break-words text-gray-200 ${MONO_FACTS.has(k) ? 'font-mono' : ''}`, children: v })] }, k))) }), source ? (_jsx(Preview, { chatId: chatId, cwd: cwd, artifact: source }, source.path)) : page.file ? (_jsxs("p", { className: "px-4 py-3 text-xs text-gray-500", children: ["The source was not written in this session, so it has no preview here", openFile ? ': open it with “Open source”.' : '.'] })) : null] })] }));
};
/**
 * Everything the session produced, in two sections: Claude artifacts (pages hosted on
 * claude.ai) and Files (grouped Documents / Created / Edited); the selected one on the right.
 * Arrow keys move through the list, Esc closes.
 */
export const ChatArtifactsModal = ({ chatId, cwd, title, artifacts: initial, onClose }) => {
    const dialogRef = useRef(null);
    const listRef = useRef(null);
    const trapTab = useDialogA11y(true, dialogRef, () => listRef.current);
    const [artifacts, setArtifacts] = useState(initial);
    const api = useTransport().artifacts;
    useEffect(() => setArtifacts(initial), [initial]);
    useEffect(() => {
        if (!api)
            return;
        return pollWhileVisible(() => api
            .fetchChatArtifacts(chatId)
            .then(setArtifacts)
            .catch(() => { }), MODAL_POLL_MS, { immediate: false });
    }, [api, chatId]);
    const sections = useMemo(() => {
        const pages = artifacts.pages.map((page) => ({ key: `page:${page.url}`, page }));
        const files = GROUPS.map((g) => ({
            label: g.label,
            items: artifacts.files
                .filter(g.test)
                .map((file) => ({ key: `file:${file.path}`, file })),
        })).filter((g) => g.items.length > 0);
        const all = [
            { label: 'Claude Artifacts', groups: pages.length ? [{ label: '', items: pages }] : [] },
            { label: 'Files', groups: files },
        ];
        return all.filter((s) => s.groups.length > 0);
    }, [artifacts]);
    const ordered = useMemo(() => sections.flatMap((s) => s.groups.flatMap((g) => g.items)), [sections]);
    const [selectedKey, setSelectedKey] = useState(ordered[0]?.key ?? null);
    const selected = ordered.find((e) => e.key === selectedKey) ?? ordered[0] ?? null;
    useEffect(() => {
        listRef.current
            ?.querySelector('[aria-selected="true"]')
            ?.scrollIntoView({ block: 'nearest' });
    }, [selected?.key]);
    const move = (delta) => {
        if (ordered.length === 0)
            return;
        const index = selected ? ordered.indexOf(selected) : -1;
        const next = delta === 'first'
            ? 0
            : delta === 'last'
                ? ordered.length - 1
                : Math.min(ordered.length - 1, Math.max(0, index + delta));
        setSelectedKey(ordered[next].key);
    };
    const optionId = (e) => `artifact-${ordered.indexOf(e)}`;
    const counts = [
        plural(countedPages(artifacts.pages), 'artifact'),
        plural(artifacts.files.length, 'file'),
    ].join(' · ');
    const row = (e) => {
        const isSelected = e === selected;
        const Icon = e.page ? Globe : e.file.kind === 'document' ? FileText : Code2;
        const sub = e.page
            ? [
                e.page.type,
                e.page.source !== 'published' && PAGE_SOURCE[e.page.source],
                e.page.version != null && `v${e.page.version}`,
            ]
                .filter(Boolean)
                .join(' · ')
            : e.file.kind === 'document'
                ? 'session document'
                : shownPath(e.file.path, cwd).replace(/\/?[^/]*$/, '') || './';
        const time = e.page
            ? relativeTime(e.page.updatedAt)
            : e.file.exists
                ? relativeTime(e.file.mtime)
                : 'deleted';
        const dim = e.file ? !e.file.exists : e.page.source === 'read';
        return (_jsxs("div", { id: optionId(e), role: "option", "aria-selected": isSelected, "data-artifact": e.page ? 'page' : 'file', title: e.page ? e.page.url : e.file.path, onMouseDown: (ev) => ev.preventDefault(), onClick: () => {
                setSelectedKey(e.key);
                listRef.current?.focus({ preventScroll: true });
            }, className: `flex items-start gap-2 mx-1 px-2 py-1.5 rounded cursor-pointer ${isSelected ? 'bg-blue-500/15 text-gray-50' : 'text-gray-300 hover:bg-gray-800'}`, children: [_jsx(Icon, { size: 13, "aria-hidden": true, className: `mt-0.5 shrink-0 ${isSelected ? 'text-blue-300' : e.page ? 'text-amber-300' : 'text-gray-500'}` }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: `block truncate text-xs ${dim ? 'text-gray-500' : ''} ${e.file && !e.file.exists ? 'line-through' : ''}`, children: e.page ? pageName(e.page) : e.file.name }), _jsx("span", { className: `block truncate text-[11px] text-gray-500 ${e.page ? '' : 'font-mono'}`, children: sub })] }), _jsx("span", { className: "shrink-0 text-[11px] text-gray-500 tabular-nums", children: time })] }, e.key));
    };
    return createPortal(_jsx("div", { className: "agents-ui fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", onMouseDown: (e) => e.target === e.currentTarget && onClose(), children: _jsxs("div", { ref: dialogRef, role: "dialog", "aria-modal": "true", "aria-labelledby": "chat-artifacts-title", tabIndex: -1, onKeyDown: (e) => {
                trapTab(e);
                if (e.key === 'Escape' && !e.defaultPrevented) {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                }
            }, className: "outline-none flex flex-col w-[min(1180px,96vw)] h-[86vh] rounded-lg border border-gray-700 bg-gray-900 shadow-2xl overflow-hidden", children: [_jsxs("div", { className: "flex items-center gap-2 h-10 px-3 border-b border-gray-800 shrink-0 text-sm", children: [_jsx(Files, { size: 14, "aria-hidden": true, className: "text-gray-400" }), _jsx("h2", { id: "chat-artifacts-title", className: "font-medium text-gray-100", children: "Artifacts" }), _jsxs("span", { className: "text-xs text-gray-500 truncate min-w-0", children: [counts, " from ", title] }), _jsx("span", { className: "flex-1" }), _jsx("button", { type: "button", onClick: onClose, className: `p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 ${focusRing}`, "aria-label": "Close", title: "Close (Esc)", children: _jsx(X, { size: 16 }) })] }), _jsxs("div", { className: "flex-1 min-h-0 grid grid-cols-[minmax(14rem,20rem)_1fr]", children: [_jsxs("div", { ref: listRef, role: "listbox", "aria-label": "Artifacts", tabIndex: 0, "aria-activedescendant": selected ? optionId(selected) : undefined, onKeyDown: (e) => {
                                const keys = {
                                    ArrowDown: 1,
                                    ArrowUp: -1,
                                    Home: 'first',
                                    End: 'last',
                                };
                                if (!(e.key in keys))
                                    return;
                                e.preventDefault();
                                move(keys[e.key]);
                            }, className: `min-h-0 overflow-y-auto thin-scrollbar border-r border-gray-800 py-1 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400`, children: [sections.length === 0 && (_jsx("p", { className: "px-3 py-4 text-xs text-gray-500", children: "No artifacts in this session yet." })), sections.map((s) => (_jsxs("div", { role: "group", "aria-label": s.label, className: "mb-2", children: [_jsxs("div", { className: "flex items-center justify-between px-3 pt-2 pb-1 text-xs font-semibold text-gray-200", children: [s.label, _jsx("span", { className: "tabular-nums font-normal text-gray-500", children: s.groups.reduce((n, g) => n + g.items.length, 0) })] }), s.groups.map((g) => (_jsxs("div", { className: "mb-1", children: [g.label && (_jsxs("div", { className: "flex items-center justify-between px-3 pt-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-gray-500", children: [g.label, _jsx("span", { className: "tabular-nums normal-case tracking-normal", children: g.items.length })] })), g.items.map(row)] }, g.label || s.label)))] }, s.label)))] }), _jsx("div", { className: "min-w-0 min-h-0 flex flex-col", children: selected?.page ? (_jsx(PageDetail, { chatId: chatId, cwd: cwd, page: selected.page, files: artifacts.files })) : selected?.file ? (_jsx(FileDetail, { chatId: chatId, cwd: cwd, file: selected.file })) : (_jsx("div", { className: "flex items-center justify-center h-full text-sm text-gray-500", children: "Nothing to preview" })) })] })] }) }), 
    // A pane can sit in a transformed container; fixed positioning needs the body
    document.body);
};
/** A file's path, actions and preview */
const FileDetail = ({ chatId, cwd, file, }) => {
    const openFile = useOpenFile();
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-2 min-h-10 px-3 py-1.5 border-b border-gray-800 shrink-0", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-sm text-gray-100 truncate", children: file.name }), _jsxs("div", { className: "text-[11px] text-gray-500 font-mono truncate", title: file.path, children: [shownPath(file.path, cwd), file.size != null && ` · ${formatSize(file.size)}`] })] }), openFile && (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: actionBtn, disabled: !file.exists, onClick: () => openFile(file.path, cwd, { editor: true }), children: [_jsx(Code2, { size: 13, "aria-hidden": true }), " Open in VS Code"] }), _jsxs("button", { type: "button", className: actionBtn, disabled: !file.exists, onClick: () => openFile(file.path, cwd, { reveal: true }), children: [_jsx(FolderOpen, { size: 13, "aria-hidden": true }), " Reveal in Finder"] })] })), _jsx(CopyButton, { text: file.path, label: "Copy path", className: "!text-xs !px-2 !py-1" })] }), _jsx("div", { className: "flex-1 min-h-0 overflow-auto thin-scrollbar bg-gray-950", children: _jsx(Preview, { chatId: chatId, cwd: cwd, artifact: file }, file.path) })] }));
};
