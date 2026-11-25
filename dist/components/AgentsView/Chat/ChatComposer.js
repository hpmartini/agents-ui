import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { isSubmitKey } from '../../../utils/chatEvents';
import { browseHistory, chatSuggestions, continueList, endKey, historyStep, homeKey, indentList, suggestionQuery, takesPath, } from '../../../utils/chatComposer';
import { useTransport } from '../../../host';
import { useLabels } from '../../../labels';
import { useAutoGrowTextarea } from '../../../hooks/useAutoGrowTextarea';
import { ResizeGrip } from '../../ResizeGrip';
const MAX_HEIGHT = 320;
// One full line: leading-6 + py-2 + border
const MIN_HEIGHT = 42;
export const CHAT_COMPOSER_HEIGHT_KEY = 'devOrbitChatComposerHeight';
/** Chat input: grows with its content, TUI-like keys, `/` and `@` picker with details */
export const ChatComposer = ({ chatId, value, onChange, onSubmit, onStop, busy, disabled, submitKey, history, commands, agents, suggestion, suggestionCut, takeSuggestion, inputRef, label, placeholders, heightKey = CHAT_COMPOSER_HEIGHT_KEY, pinMax, }) => {
    const t = useLabels().terminal;
    // The suggestion the user typed over or took; a new one shows again
    const [dropped, setDropped] = useState(null);
    const ghost = !disabled && !value && suggestion && suggestion !== dropped ? suggestion : null;
    const placeholder = ghost
        ? `${ghost}${suggestionCut ? '…' : ''}  ⇥ Tab`
        : disabled
            ? t.composerDisconnected
            : submitKey === 'enter'
                ? (placeholders?.enter ?? t.composerPlaceholderEnter)
                : (placeholders?.modEnter ?? t.composerPlaceholderModEnter);
    const valueRef = useRef(value);
    valueRef.current = value;
    const [caret, setCaret] = useState(0);
    const pendingCaret = useRef(null);
    const historyIndex = useRef(-1);
    const draft = useRef('');
    const [files, setFiles] = useState([]);
    const [dirs, setDirs] = useState([]);
    const [highlighted, setHighlighted] = useState(0);
    const [dismissed, setDismissed] = useState(null);
    const listRef = useRef(null);
    // an empty field fits its placeholder: a long suggestion wraps over several rows
    const { handleProps } = useAutoGrowTextarea(inputRef, value || placeholder, {
        min: MIN_HEIGHT,
        max: MAX_HEIGHT,
        storageKey: heightKey,
        pinMax,
    });
    useLayoutEffect(() => {
        const el = inputRef.current;
        if (!el)
            return;
        if (pendingCaret.current !== null) {
            el.setSelectionRange(pendingCaret.current, pendingCaret.current);
            setCaret(pendingCaret.current);
            pendingCaret.current = null;
        }
    }, [value, inputRef]);
    const query = suggestionQuery(value, caret);
    const queryKey = query ? `${query.trigger}${query.start}:${query.query}` : null;
    const fileQuery = query?.trigger === '@' ? query.query : null;
    const dirQuery = query?.trigger === 'arg' && takesPath(commands.find((c) => c.name === query.command))
        ? query.query
        : null;
    const chat = useTransport().chat;
    useEffect(() => {
        if (dirQuery === null || !chatId || !chat?.fetchChatDirs)
            return;
        const fetchDirs = chat.fetchChatDirs;
        let cancelled = false;
        const timer = setTimeout(() => {
            fetchDirs(chatId, dirQuery)
                .then((list) => !cancelled && setDirs(list))
                .catch(() => !cancelled && setDirs([]));
        }, 80);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [chat, chatId, dirQuery]);
    useEffect(() => {
        if (fileQuery === null || !chatId || !chat?.fetchChatFiles)
            return;
        const fetchFiles = chat.fetchChatFiles;
        let cancelled = false;
        const timer = setTimeout(() => {
            fetchFiles(chatId, fileQuery)
                .then((list) => !cancelled && setFiles(list))
                .catch(() => !cancelled && setFiles([]));
        }, 120);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [chat, chatId, fileQuery]);
    const suggestions = useMemo(() => query && (query.trigger !== 'arg' || dirQuery !== null)
        ? chatSuggestions(query.trigger, query.query, { commands, agents, files, dirs })
        : [], 
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queryKey covers query
    [queryKey, commands, agents, files, dirs, dirQuery]);
    const open = suggestions.length > 0 && dismissed !== queryKey;
    const current = open ? suggestions[Math.min(highlighted, suggestions.length - 1)] : null;
    useEffect(() => setHighlighted(0), [queryKey]);
    useEffect(() => {
        listRef.current
            ?.querySelector(`[data-index="${highlighted}"]`)
            ?.scrollIntoView({ block: 'nearest' });
    }, [highlighted]);
    const apply = (edit) => {
        pendingCaret.current = edit.caret;
        onChange(edit.value);
    };
    const pick = (s) => {
        if (!query)
            return;
        const before = value.slice(0, query.start);
        const after = value.slice(caret).replace(/^\S*/, '');
        apply({
            value: before + s.insert + after.replace(/^ /, ''),
            caret: before.length + s.insert.length,
        });
    };
    const onKeyDown = (e) => {
        const el = e.currentTarget;
        const pos = el.selectionStart;
        const collapsed = pos === el.selectionEnd;
        const plain = !e.metaKey && !e.ctrlKey && !e.altKey;
        if (open && current) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const step = e.key === 'ArrowDown' ? 1 : -1;
                setHighlighted((h) => (h + step + suggestions.length) % suggestions.length);
                return;
            }
            // On a finished path (`~/Music/`) Enter sends; Tab still walks into the subdirectories
            const pathDone = current.kind === 'dir' && query?.query.endsWith('/');
            const enterPicks = e.key === 'Enter' && !e.shiftKey && plain && !pathDone;
            if (enterPicks || (e.key === 'Tab' && !e.shiftKey)) {
                e.preventDefault();
                pick(current);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setDismissed(queryKey);
                return;
            }
        }
        if (ghost && plain && !e.shiftKey && (e.key === 'Tab' || e.key === 'ArrowRight')) {
            e.preventDefault();
            pendingCaret.current = ghost.length;
            // used up: the TUI still shows it until the sent prompt reaches it
            setDropped(ghost);
            onChange(ghost);
            if (suggestionCut && takeSuggestion) {
                const cut = ghost;
                void takeSuggestion().then((full) => {
                    // only while the field still holds the cut text untouched
                    if (!full || valueRef.current !== cut)
                        return;
                    pendingCaret.current = full.length;
                    onChange(full);
                });
            }
            return;
        }
        if (e.key === 'Escape' && busy) {
            e.preventDefault();
            onStop();
            return;
        }
        if (isSubmitKey(e.nativeEvent, submitKey)) {
            e.preventDefault();
            historyIndex.current = -1;
            onSubmit();
            return;
        }
        // Any Enter that did not send inserts a newline (Shift+Enter in both submit modes)
        const newline = e.key === 'Enter' && !e.nativeEvent.isComposing && plain;
        // A click on an open agent's card hands focus here; the Enter meant for the card must not
        // start the prompt with a blank line (and hide the suggestion)
        if (newline && !value) {
            e.preventDefault();
            return;
        }
        if (newline && collapsed) {
            const edit = continueList(value, pos);
            if (edit) {
                e.preventDefault();
                apply(edit);
            }
            return;
        }
        if (e.key === 'Tab' && plain && collapsed) {
            const edit = indentList(value, pos, e.shiftKey);
            if (edit) {
                e.preventDefault();
                apply(edit);
            }
            return;
        }
        if ((e.key === 'Home' || e.key === 'End') && plain && !e.shiftKey && collapsed) {
            const target = e.key === 'Home' ? homeKey(value, pos) : endKey(value, pos);
            e.preventDefault();
            if (target !== null) {
                el.setSelectionRange(target, target);
                setCaret(target);
            }
            return;
        }
        if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && plain && !e.shiftKey && collapsed) {
            const direction = e.key === 'ArrowUp' ? 'up' : 'down';
            if (!historyStep(value, pos, direction))
                return;
            if (historyIndex.current === -1)
                draft.current = value;
            const step = browseHistory(history, historyIndex.current, draft.current, direction);
            if (!step)
                return;
            e.preventDefault();
            historyIndex.current = step.index;
            apply({ value: step.text, caret: direction === 'up' ? 0 : step.text.length });
        }
    };
    const domId = useId();
    const listId = `chat-suggestions-${domId}`;
    return (_jsxs("div", { className: "relative flex-1 min-w-0", children: [open && current && (_jsxs("div", { className: "absolute bottom-full left-0 right-0 mb-1 flex max-h-72 overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-xl z-30", children: [_jsx("ul", { ref: listRef, id: listId, role: "listbox", "aria-label": query?.trigger === '/' ? t.commands : t.filesAndAgents, className: "w-1/2 min-w-0 overflow-y-auto py-1", children: suggestions.map((s, i) => (_jsxs("li", { id: `${listId}-${i}`, "data-index": i, role: "option", "aria-selected": s === current, onMouseDown: (e) => {
                                e.preventDefault();
                                pick(s);
                            }, onMouseEnter: () => setHighlighted(i), className: `flex items-center gap-2 px-2.5 py-1 text-sm cursor-pointer ${s === current ? 'bg-blue-500/25 text-white' : 'text-gray-200'}`, children: [_jsx("span", { className: "font-mono text-blue-300 truncate min-w-0", children: s.label }), _jsx("span", { className: "ml-auto shrink-0 text-[10px] text-gray-500", children: t.suggestionKind(s.kind) })] }, `${s.kind}:${s.label}`))) }), _jsxs("div", { className: "w-1/2 min-w-0 overflow-y-auto border-l border-gray-800 p-3 text-xs", "aria-live": "polite", children: [_jsx("div", { className: "font-mono text-sm text-blue-200 break-all", children: current.label }), current.hint && (_jsxs("div", { className: "mt-1.5 text-gray-400", children: [_jsx("span", { className: "text-gray-500", children: t.arguments }), _jsx("span", { className: "font-mono text-gray-200 [overflow-wrap:anywhere]", children: current.hint })] })), current.kind !== 'file' && (_jsx("p", { className: "mt-2 text-gray-300 whitespace-pre-wrap leading-relaxed", children: current.description || t.noDescription })), _jsx("p", { className: "mt-3 text-[11px] text-gray-500", children: current.kind === 'dir' ? t.pickerHintDir : t.pickerHint })] })] })), _jsxs("div", { className: "relative", children: [_jsx(ResizeGrip, { ...handleProps }), _jsx("textarea", { id: `chat-input-${domId}`, ref: inputRef, value: value, disabled: disabled, rows: 1, onChange: (e) => {
                            // emptied again: the agent's suggestion shows once more, as in Claude Code
                            setDropped(e.target.value ? (ghost ?? dropped) : null);
                            historyIndex.current = -1;
                            setDismissed(null);
                            onChange(e.target.value);
                            setCaret(e.target.selectionStart);
                        }, onSelect: (e) => setCaret(e.currentTarget.selectionStart), onKeyDown: onKeyDown, onBlur: () => setDismissed(queryKey), placeholder: placeholder, "aria-label": label ?? t.message, "aria-autocomplete": "list", "aria-controls": open ? listId : undefined, "aria-activedescendant": open ? `${listId}-${highlighted}` : undefined, style: { minHeight: MIN_HEIGHT }, className: "block w-full resize-none rounded-md bg-gray-900 border border-gray-700 px-2.5 py-2 text-sm leading-6 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-blue-400 disabled:opacity-50" })] })] }));
};
