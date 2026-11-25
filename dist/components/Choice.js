import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * One control for picking one value out of a list, in the rendering its size calls for:
 * up to CHOICE_PILL_MAX options as pills (radio group), up to CHOICE_SEARCH_THRESHOLD as a
 * menu (listbox), more as a menu with a search field. Imports only React and local utils, so
 * a module bundle with its own React can use it (`@hpmartini/agents-ui/components/Choice`).
 * Escape always closes the popup (it does not clear the search first) and goes back to the trigger.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { clampMenuPosition } from '../utils/menuPosition';
/** At most this many options render as pills */
export const CHOICE_PILL_MAX = 3;
/** More options than this get a search field in the menu */
export const CHOICE_SEARCH_THRESHOLD = 7;
/** The rendering for `count` options; an "any"/"all" option counts like every other */
export const choiceMode = (count) => count <= CHOICE_PILL_MAX ? 'pills' : count <= CHOICE_SEARCH_THRESHOLD ? 'menu' : 'search';
const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor';
const GAP = 4;
const EDGE = 8;
const Chevron = () => (_jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, className: "shrink-0 text-gray-400", children: _jsx("path", { d: "m6 9 6 6 6-6" }) }));
const Check = () => (_jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, children: _jsx("path", { d: "M20 6 9 17l-5-5" }) }));
/** `text` with every case-insensitive occurrence of `query` (lower case) wrapped in <mark> */
function highlight(text, query) {
    if (!query)
        return text;
    const lower = text.toLowerCase();
    const parts = [];
    let at = 0;
    for (let i = lower.indexOf(query); i !== -1; i = lower.indexOf(query, at)) {
        if (i > at)
            parts.push(text.slice(at, i));
        parts.push(_jsx("mark", { className: "bg-transparent text-white font-semibold underline decoration-blue-300 decoration-2 underline-offset-2", children: text.slice(i, i + query.length) }, i));
        at = i + query.length;
    }
    parts.push(text.slice(at));
    return parts;
}
export function Choice(props) {
    const mode = !props.mode || props.mode === 'auto' ? choiceMode(props.options.length) : props.mode;
    const pills = mode === 'pills';
    const root = useRef(null);
    const was = useRef(pills);
    const refocus = useRef(false);
    // Pills <-> menu remounts the focused element; read focus while the old DOM is still there
    if (was.current !== pills) {
        refocus.current = !!root.current?.contains(document.activeElement);
        was.current = pills;
    }
    useLayoutEffect(() => {
        if (!refocus.current)
            return;
        refocus.current = false;
        root.current
            ?.querySelector('[role="radio"][tabindex="0"], [aria-haspopup="listbox"]')
            ?.focus();
    }, [pills]);
    return pills ? (_jsx(Pills, { ...props, root: root })) : (_jsx(Menu, { ...props, root: root, search: mode === 'search' }));
}
function Pills({ value, onChange, options, label, disabled, className = '', size = 'sm', id, title, invalid, labelledBy, root, }) {
    const refs = useRef([]);
    const selected = options.findIndex((o) => o.value === value);
    // Roving tab stop: the checked pill if enabled, else the first enabled one
    const stop = selected >= 0 && !options[selected].disabled ? selected : options.findIndex((o) => !o.disabled);
    const pick = (i) => {
        refs.current[i]?.focus();
        if (options[i].value !== value)
            onChange(options[i].value);
    };
    const onKeyDown = (e, at) => {
        const enabled = options.flatMap((o, i) => (o.disabled ? [] : [i]));
        if (enabled.length === 0)
            return;
        const pos = Math.max(0, enabled.indexOf(at));
        const step = {
            ArrowRight: 1,
            ArrowDown: 1,
            ArrowLeft: -1,
            ArrowUp: -1,
        };
        let next;
        if (e.key in step)
            next = enabled[(pos + step[e.key] + enabled.length) % enabled.length];
        else if (e.key === 'Home')
            next = enabled[0];
        else if (e.key === 'End')
            next = enabled[enabled.length - 1];
        if (next === undefined)
            return;
        e.preventDefault();
        e.stopPropagation();
        pick(next);
    };
    const pad = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
    return (_jsx("div", { ref: root, role: "radiogroup", 
        // No checked pill: on the group, so a <label htmlFor> click activates (selects) no pill
        id: selected < 0 ? id : undefined, "aria-label": labelledBy ? undefined : label, "aria-labelledby": labelledBy, "aria-disabled": disabled || undefined, "aria-invalid": invalid || undefined, title: title, "data-choice": "pills", className: `flex flex-wrap gap-1 min-w-0 ${className}`, children: options.map((o, i) => {
            const on = i === selected;
            return (_jsx("button", { ref: (el) => {
                    refs.current[i] = el;
                }, type: "button", role: "radio", 
                // Only on the checked pill: <label htmlFor={id}> focuses it without changing the value
                id: on ? id : undefined, "aria-label": o.label, "aria-checked": on, tabIndex: i === stop ? 0 : -1, disabled: disabled || o.disabled, title: o.hint, onClick: () => pick(i), onKeyDown: (e) => onKeyDown(e, i), className: `${pad} rounded-full border leading-5 text-left break-words min-w-0 transition-colors ${FOCUS} disabled:opacity-40 disabled:cursor-not-allowed ${on
                    ? `bg-sel ${invalid ? 'border-red-400' : 'border-blue-300'} text-white`
                    : `${invalid ? 'border-red-400' : 'border-gray-700'} text-gray-300 hover:text-white hover:bg-gray-800`}`, children: o.label }, o.value));
        }) }));
}
function Menu({ value, onChange, options, label, disabled, placeholder = '', className = '', size = 'sm', id, title, icon, search, searchPlaceholder = 'Search…', noResults = 'No results', invalid, labelledBy, root: rootRef, }) {
    const uid = useId();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(-1);
    const [place, setPlace] = useState(null);
    const triggerRef = useRef(null);
    const popupRef = useRef(null);
    const listRef = useRef(null);
    const typed = useRef({ text: '', at: 0 });
    const needle = search ? query.trim().toLowerCase() : '';
    const shown = useMemo(() => (needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options), [options, needle]);
    const current = options.find((o) => o.value === value);
    const optionId = (i) => `${uid}-o${i}`;
    const close = (refocus) => {
        setOpen(false);
        setQuery('');
        setPlace(null);
        if (refocus)
            triggerRef.current?.focus();
    };
    /** The selected option if it's in `list` and enabled, else the first enabled one */
    const startIn = (list) => {
        const at = list.findIndex((o) => o.value === value && !o.disabled);
        return at >= 0 ? at : list.findIndex((o) => !o.disabled);
    };
    const openMenu = () => {
        if (disabled)
            return;
        setActive(startIn(options));
        setOpen(true);
    };
    const choose = (i) => {
        const o = shown[i];
        if (disabled || !o || o.disabled)
            return;
        close(true);
        if (o.value !== value)
            onChange(o.value);
    };
    /** Next enabled option from `from` in direction `step`, wrapping */
    const move = (from, step) => {
        const n = shown.length;
        for (let k = 1; k <= n; k++) {
            const i = (((from + step * k) % n) + n) % n;
            if (!shown[i].disabled)
                return i;
        }
        return from;
    };
    const edge = (last) => {
        const enabled = shown.flatMap((o, i) => (o.disabled ? [] : [i]));
        return (last ? enabled[enabled.length - 1] : enabled[0]) ?? -1;
    };
    // Below the trigger, or above when that has more room; always inside the viewport
    useLayoutEffect(() => {
        if (!open)
            return;
        const trigger = triggerRef.current?.getBoundingClientRect();
        const popup = popupRef.current;
        if (!trigger || !popup)
            return;
        const vh = window.innerHeight;
        const below = vh - trigger.bottom - GAP - EDGE;
        const above = trigger.top - GAP - EDGE;
        const h = popup.scrollHeight;
        const up = h > below && above > below;
        const maxHeight = Math.max(120, up ? above : below);
        const height = Math.min(h, maxHeight);
        const pos = clampMenuPosition(trigger.left, up ? trigger.top - GAP - height : trigger.bottom + GAP, popup.offsetWidth, height, window.innerWidth, vh, EDGE);
        setPlace({ ...pos, maxHeight });
        // shown.length: a shorter filtered list keeps an upward popup attached to the trigger
    }, [open, shown.length]);
    // Keys go to the search field, else to the listbox; only once placed, a hidden popup can't take focus
    const placed = place !== null;
    useEffect(() => {
        if (placed)
            (search ? popupRef.current?.querySelector('input') : listRef.current)?.focus();
    }, [placed, search]);
    useEffect(() => {
        if (!open)
            return;
        const onDown = (e) => {
            if (!rootRef.current?.contains(e.target))
                close(false);
        };
        // The popup is fixed: once the page under it scrolls or resizes it would float away
        const onScroll = (e) => {
            if (!popupRef.current?.contains(e.target))
                close(false);
        };
        const onResize = () => close(false);
        document.addEventListener('mousedown', onDown, true);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        return () => {
            document.removeEventListener('mousedown', onDown, true);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
        };
    }, [open]);
    // Disabled while open: nothing may pick any more
    useEffect(() => {
        if (disabled && open)
            close(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- close only reads refs and setters
    }, [disabled]);
    // A changed list (filter typed or cleared, options replaced) restarts the active option;
    // keyed by content, so a parent re-render with an equal inline array keeps it
    const listKey = shown.map((o) => `${o.value}${o.disabled ? '!' : ''}`).join('\n');
    useEffect(() => {
        if (open)
            setActive(startIn(shown));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the shown list changes
    }, [listKey]);
    // Only once placed: scrolling a still unplaced popup into view could scroll the page
    useEffect(() => {
        if (place && active >= 0)
            document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- optionId derives from a stable id
    }, [place, active]);
    const onKeyDown = (e) => {
        let handled = true;
        if (e.key === 'ArrowDown')
            setActive((a) => move(a, 1));
        else if (e.key === 'ArrowUp')
            setActive((a) => move(a < 0 ? 0 : a, -1));
        else if (e.key === 'Home' && !search)
            setActive(edge(false));
        else if (e.key === 'End' && !search)
            setActive(edge(true));
        else if (e.key === 'Enter' || (e.key === ' ' && !search))
            choose(active);
        else if (e.key === 'Escape')
            close(true);
        else if (e.key === 'Tab') {
            close(false);
            handled = false; // focus moves on as usual
        }
        else if (!search && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Typeahead: letters typed within a second form one prefix
            const now = Date.now();
            const t = typed.current;
            t.text = (now - t.at < 1000 ? t.text : '') + e.key.toLowerCase();
            t.at = now;
            const hit = shown.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(t.text));
            if (hit >= 0)
                setActive(hit);
        }
        else
            handled = false;
        if (handled) {
            e.preventDefault();
            e.stopPropagation();
        }
    };
    const triggerSize = size === 'md' ? 'px-2 py-1.5 text-sm' : 'px-2 py-1 text-xs';
    const listId = `${uid}-list`;
    const activeId = active >= 0 && active < shown.length ? optionId(active) : undefined;
    const renderOption = (o, i) => (_jsxs("div", { id: optionId(i), role: "option", "aria-selected": o.value === value, "aria-disabled": o.disabled || undefined, 
        // Focus stays in the listbox / search field
        onMouseDown: (e) => e.preventDefault(), onMouseMove: () => !o.disabled && active !== i && setActive(i), onClick: () => choose(i), className: `flex items-center gap-2 px-3 py-1.5 ${o.disabled
            ? 'opacity-40 cursor-not-allowed text-gray-300'
            : `cursor-pointer ${i === active ? 'bg-gray-700 text-white' : 'text-gray-200'}`}`, children: [_jsx("span", { className: "w-3 shrink-0 text-blue-300", children: o.value === value && _jsx(Check, {}) }), _jsx("span", { className: "min-w-0 break-words", children: highlight(o.label, needle) }), o.hint && _jsx("span", { className: "ml-auto pl-2 shrink-0 text-[10px] text-gray-400", children: o.hint })] }, o.value));
    // Options in order, each run of one group under its header
    const body = [];
    for (let i = 0; i < shown.length;) {
        const group = shown[i].group;
        let end = i;
        while (end < shown.length && shown[end].group === group)
            end++;
        const items = shown.slice(i, end).map((o, k) => renderOption(o, i + k));
        body.push(group ? (_jsxs("div", { role: "group", "aria-label": group, children: [_jsx("div", { "aria-hidden": true, className: "px-3 pt-2 pb-0.5 text-[10px] uppercase tracking-wide text-gray-500", children: group }), items] }, `g${i}`)) : (items));
        i = end;
    }
    return (_jsxs("div", { ref: rootRef, className: "relative flex shrink-0 min-w-0 max-w-full", "data-choice": search ? 'search' : 'menu', children: [_jsx("span", { id: `${uid}-label`, hidden: true, children: label }), _jsxs("button", { ref: triggerRef, type: "button", id: id, title: title ?? label, disabled: disabled, "aria-haspopup": "listbox", "aria-expanded": open, "aria-controls": open ? listId : undefined, "aria-labelledby": `${labelledBy ?? `${uid}-label`} ${uid}-value`, "aria-invalid": invalid || undefined, onClick: () => (open ? close(false) : openMenu()), onKeyDown: (e) => {
                    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                        e.preventDefault();
                        e.stopPropagation();
                        openMenu();
                    }
                }, className: `flex items-center gap-1.5 min-w-0 max-w-full bg-gray-850 border ${invalid ? 'border-red-400' : 'border-gray-700 hover:border-gray-600'} rounded text-gray-200 text-left disabled:opacity-50 disabled:cursor-not-allowed ${triggerSize} ${FOCUS} ${className}`, children: [icon, _jsx("span", { id: `${uid}-value`, className: `flex-1 min-w-0 truncate ${current ? '' : 'text-gray-400'}`, children: current?.label ?? placeholder }), _jsx(Chevron, {})] }), open && !disabled && (_jsxs("div", { ref: popupRef, style: {
                    position: 'fixed',
                    left: place?.left ?? 0,
                    top: place?.top ?? 0,
                    maxHeight: place?.maxHeight,
                    visibility: place ? undefined : 'hidden',
                    minWidth: triggerRef.current?.offsetWidth,
                }, className: `z-50 flex flex-col w-max max-w-[min(24rem,calc(100vw-16px))] bg-gray-800 border border-gray-700 rounded-lg shadow-xl ${size === 'md' ? 'text-sm' : 'text-xs'}`, children: [search && (_jsx("div", { className: "p-1.5 border-b border-gray-700 shrink-0", children: _jsx("input", { type: "search", role: "combobox", "aria-expanded": true, "aria-autocomplete": "list", "aria-controls": listId, "aria-activedescendant": activeId, "aria-label": `Search ${label}`, value: query, onChange: (e) => setQuery(e.target.value), onKeyDown: onKeyDown, placeholder: searchPlaceholder, autoComplete: "off", spellCheck: false, className: "w-full bg-gray-950 border border-gray-600 rounded-md px-2 py-1 text-gray-50 placeholder-gray-500 outline-none focus:border-blue-400" }) })), _jsxs("div", { ref: listRef, id: listId, role: "listbox", "aria-label": labelledBy ? undefined : label, "aria-labelledby": labelledBy, tabIndex: -1, "aria-activedescendant": search ? undefined : activeId, onKeyDown: search ? undefined : onKeyDown, className: "py-1 overflow-y-auto min-h-0 outline-none", children: [body, shown.length === 0 && _jsx("div", { className: "px-3 py-1.5 text-gray-400", children: noResults })] })] }))] }));
}
