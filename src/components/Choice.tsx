/**
 * One control for picking one value out of a list, in the rendering its size calls for:
 * up to CHOICE_PILL_MAX options as pills (radio group), up to CHOICE_SEARCH_THRESHOLD as a
 * menu (listbox), more as a menu with a search field. Imports only React and local utils, so
 * a module bundle with its own React can use it (`@hpmartini/agents-ui/components/Choice`).
 * Escape always closes the popup (it does not clear the search first) and goes back to the trigger.
 */
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { clampMenuPosition } from '../utils/menuPosition';

/** At most this many options render as pills */
export const CHOICE_PILL_MAX = 3;
/** More options than this get a search field in the menu */
export const CHOICE_SEARCH_THRESHOLD = 7;

export type ChoiceMode = 'pills' | 'menu' | 'search';

/** The rendering for `count` options; an "any"/"all" option counts like every other */
export const choiceMode = (count: number): ChoiceMode =>
  count <= CHOICE_PILL_MAX ? 'pills' : count <= CHOICE_SEARCH_THRESHOLD ? 'menu' : 'search';

export interface ChoiceOption<V extends string = string> {
  value: V;
  label: string;
  /** Muted text after the label (menu, search) or tooltip (pills) */
  hint?: string;
  disabled?: boolean;
  /** Dimmed text, still selectable (e.g. a hidden board slice); `disabled` wins */
  muted?: boolean;
  /** Options with the same group are listed under its header (menu, search) */
  group?: string;
}

export interface ChoiceProps<V extends string = string> {
  value: V;
  onChange: (value: V) => void;
  options: ChoiceOption<V>[];
  /** Accessible name of the radio group, or of the trigger and its listbox */
  label: string;
  /** Default 'auto': by option count, see `choiceMode` */
  mode?: ChoiceMode | 'auto';
  disabled?: boolean;
  /** Trigger text while `value` is none of the options */
  placeholder?: string;
  /** On the trigger (menu, search) or the pill row (pills) */
  className?: string;
  /** 'sm': toolbars and composers (text-xs), 'md': forms (text-sm) */
  size?: 'sm' | 'md';
  id?: string;
  title?: string;
  /** Leading icon in the trigger (menu, search) */
  icon?: React.ReactNode;
  /** Search field placeholder and empty-result text (English defaults) */
  searchPlaceholder?: string;
  noResults?: string;
  /** aria-invalid plus the error border, on the pills or the trigger */
  invalid?: boolean;
  /** Id of a visible label; names the radio group, or the trigger and its listbox, instead of `label` */
  labelledBy?: string;
}

type Inner<V extends string> = ChoiceProps<V> & { root: React.RefObject<HTMLDivElement | null> };

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor';
const GAP = 4;
const EDGE = 8;

const Chevron = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className="shrink-0 text-gray-400"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const Check = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/** `text` with every case-insensitive occurrence of `query` (lower case) wrapped in <mark> */
function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (let i = lower.indexOf(query); i !== -1; i = lower.indexOf(query, at)) {
    if (i > at) parts.push(text.slice(at, i));
    parts.push(
      <mark
        key={i}
        className="bg-transparent text-white font-semibold underline decoration-blue-300 decoration-2 underline-offset-2"
      >
        {text.slice(i, i + query.length)}
      </mark>
    );
    at = i + query.length;
  }
  parts.push(text.slice(at));
  return parts;
}

export function Choice<V extends string = string>(props: ChoiceProps<V>) {
  const mode = !props.mode || props.mode === 'auto' ? choiceMode(props.options.length) : props.mode;
  const pills = mode === 'pills';
  const root = useRef<HTMLDivElement>(null);
  const was = useRef(pills);
  const refocus = useRef(false);
  // Pills <-> menu remounts the focused element; read focus while the old DOM is still there
  if (was.current !== pills) {
    refocus.current = !!root.current?.contains(document.activeElement);
    was.current = pills;
  }
  useLayoutEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    root.current
      ?.querySelector<HTMLElement>('[role="radio"][tabindex="0"], [aria-haspopup="listbox"]')
      ?.focus();
  }, [pills]);
  return pills ? (
    <Pills {...props} root={root} />
  ) : (
    <Menu {...props} root={root} search={mode === 'search'} />
  );
}

function Pills<V extends string>({
  value,
  onChange,
  options,
  label,
  disabled,
  className = '',
  size = 'sm',
  id,
  title,
  invalid,
  labelledBy,
  root,
}: Inner<V>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = options.findIndex((o) => o.value === value);
  // Roving tab stop: the checked pill if enabled, else the first enabled one
  const stop =
    selected >= 0 && !options[selected].disabled ? selected : options.findIndex((o) => !o.disabled);

  const pick = (i: number) => {
    refs.current[i]?.focus();
    if (options[i].value !== value) onChange(options[i].value);
  };
  const onKeyDown = (e: React.KeyboardEvent, at: number) => {
    const enabled = options.flatMap((o, i) => (o.disabled ? [] : [i]));
    if (enabled.length === 0) return;
    const pos = Math.max(0, enabled.indexOf(at));
    const step: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    let next: number | undefined;
    if (e.key in step) next = enabled[(pos + step[e.key] + enabled.length) % enabled.length];
    else if (e.key === 'Home') next = enabled[0];
    else if (e.key === 'End') next = enabled[enabled.length - 1];
    if (next === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    pick(next);
  };

  const pad = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <div
      ref={root}
      role="radiogroup"
      // No checked pill: on the group, so a <label htmlFor> click activates (selects) no pill
      id={selected < 0 ? id : undefined}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-disabled={disabled || undefined}
      aria-invalid={invalid || undefined}
      title={title}
      data-choice="pills"
      className={`flex flex-wrap gap-1 min-w-0 ${className}`}
    >
      {options.map((o, i) => {
        const on = i === selected;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            // Only on the checked pill: <label htmlFor={id}> focuses it without changing the value
            id={on ? id : undefined}
            // A <label htmlFor> would otherwise replace the pill's own name
            aria-label={o.label}
            aria-checked={on}
            tabIndex={i === stop ? 0 : -1}
            disabled={disabled || o.disabled}
            title={o.hint}
            data-muted={o.muted || undefined}
            onClick={() => pick(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`${pad} rounded-full border leading-5 text-left break-words min-w-0 transition-colors ${FOCUS} disabled:opacity-40 disabled:cursor-not-allowed ${
              on
                ? `bg-sel ${invalid ? 'border-red-400' : 'border-blue-300'} ${o.muted ? 'text-gray-100' : 'text-white'}`
                : `${invalid ? 'border-red-400' : 'border-gray-700'} ${o.muted ? 'text-gray-500 hover:text-gray-200' : 'text-gray-300 hover:text-white'} hover:bg-gray-800`
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Menu<V extends string>({
  value,
  onChange,
  options,
  label,
  disabled,
  placeholder = '',
  className = '',
  size = 'sm',
  id,
  title,
  icon,
  search,
  searchPlaceholder = 'Search…',
  noResults = 'No results',
  invalid,
  labelledBy,
  root: rootRef,
}: Inner<V> & { search: boolean }) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [place, setPlace] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: '', at: 0 });

  const needle = search ? query.trim().toLowerCase() : '';
  const shown = useMemo(
    () => (needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options),
    [options, needle]
  );
  const current = options.find((o) => o.value === value);
  const optionId = (i: number) => `${uid}-o${i}`;

  const close = (refocus: boolean) => {
    setOpen(false);
    setQuery('');
    setPlace(null);
    if (refocus) triggerRef.current?.focus();
  };
  /** The selected option if it's in `list` and enabled, else the first enabled one */
  const startIn = (list: ChoiceOption<V>[]) => {
    const at = list.findIndex((o) => o.value === value && !o.disabled);
    return at >= 0 ? at : list.findIndex((o) => !o.disabled);
  };
  const openMenu = () => {
    if (disabled) return;
    setActive(startIn(options));
    setOpen(true);
  };
  const choose = (i: number) => {
    const o = shown[i];
    if (disabled || !o || o.disabled) return;
    close(true);
    if (o.value !== value) onChange(o.value);
  };
  /** Next enabled option from `from` in direction `step`, wrapping */
  const move = (from: number, step: 1 | -1) => {
    const n = shown.length;
    for (let k = 1; k <= n; k++) {
      const i = (((from + step * k) % n) + n) % n;
      if (!shown[i].disabled) return i;
    }
    return from;
  };
  const edge = (last: boolean) => {
    const enabled = shown.flatMap((o, i) => (o.disabled ? [] : [i]));
    return (last ? enabled[enabled.length - 1] : enabled[0]) ?? -1;
  };

  // Below the trigger, or above when that has more room; always inside the viewport
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current?.getBoundingClientRect();
    const popup = popupRef.current;
    if (!trigger || !popup) return;
    const vh = window.innerHeight;
    const below = vh - trigger.bottom - GAP - EDGE;
    const above = trigger.top - GAP - EDGE;
    const h = popup.scrollHeight;
    const up = h > below && above > below;
    const maxHeight = Math.max(120, up ? above : below);
    const height = Math.min(h, maxHeight);
    const pos = clampMenuPosition(
      trigger.left,
      up ? trigger.top - GAP - height : trigger.bottom + GAP,
      popup.offsetWidth,
      height,
      window.innerWidth,
      vh,
      EDGE
    );
    setPlace({ ...pos, maxHeight });
    // shown.length: a shorter filtered list keeps an upward popup attached to the trigger
  }, [open, shown.length]);

  // Keys go to the search field, else to the listbox; only once placed, a hidden popup can't take focus
  const placed = place !== null;
  useEffect(() => {
    if (placed) (search ? popupRef.current?.querySelector('input') : listRef.current)?.focus();
  }, [placed, search]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    // The popup is fixed: once the page under it scrolls or resizes it would float away
    const onScroll = (e: Event) => {
      if (!popupRef.current?.contains(e.target as Node)) close(false);
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
    if (disabled && open) close(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close only reads refs and setters
  }, [disabled]);

  // A changed list (filter typed or cleared, options replaced) restarts the active option;
  // keyed by content, so a parent re-render with an equal inline array keeps it
  const listKey = shown.map((o) => `${o.value}${o.disabled ? '!' : ''}`).join('\n');
  useEffect(() => {
    if (open) setActive(startIn(shown));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the shown list changes
  }, [listKey]);

  // Only once placed: scrolling a still unplaced popup into view could scroll the page
  useEffect(() => {
    if (place && active >= 0)
      document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- optionId derives from a stable id
  }, [place, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    let handled = true;
    if (e.key === 'ArrowDown') setActive((a) => move(a, 1));
    else if (e.key === 'ArrowUp') setActive((a) => move(a < 0 ? 0 : a, -1));
    else if (e.key === 'Home' && !search) setActive(edge(false));
    else if (e.key === 'End' && !search) setActive(edge(true));
    else if (e.key === 'Enter' || (e.key === ' ' && !search)) choose(active);
    else if (e.key === 'Escape') close(true);
    else if (e.key === 'Tab') {
      close(false);
      handled = false; // focus moves on as usual
    } else if (!search && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Typeahead: letters typed within a second form one prefix
      const now = Date.now();
      const t = typed.current;
      t.text = (now - t.at < 1000 ? t.text : '') + e.key.toLowerCase();
      t.at = now;
      const hit = shown.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(t.text));
      if (hit >= 0) setActive(hit);
    } else handled = false;
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const triggerSize = size === 'md' ? 'px-2 py-1.5 text-sm' : 'px-2 py-1 text-xs';
  const listId = `${uid}-list`;
  const activeId = active >= 0 && active < shown.length ? optionId(active) : undefined;

  const renderOption = (o: ChoiceOption<V>, i: number) => (
    <div
      key={o.value}
      id={optionId(i)}
      role="option"
      aria-selected={o.value === value}
      aria-disabled={o.disabled || undefined}
      data-muted={o.muted || undefined}
      // Focus stays in the listbox / search field
      onMouseDown={(e) => e.preventDefault()}
      onMouseMove={() => !o.disabled && active !== i && setActive(i)}
      onClick={() => choose(i)}
      className={`flex items-center gap-2 px-3 py-1.5 ${
        o.disabled
          ? 'opacity-40 cursor-not-allowed text-gray-300'
          : `cursor-pointer ${
              i === active
                ? `bg-gray-700 ${o.muted ? 'text-gray-100' : 'text-white'}`
                : o.muted
                  ? 'text-gray-500'
                  : 'text-gray-200'
            }`
      }`}
    >
      <span className="w-3 shrink-0 text-blue-300">{o.value === value && <Check />}</span>
      <span className="min-w-0 break-words">{highlight(o.label, needle)}</span>
      {o.hint && <span className="ml-auto pl-2 shrink-0 text-[10px] text-gray-400">{o.hint}</span>}
    </div>
  );

  // Options in order, each run of one group under its header
  const body: React.ReactNode[] = [];
  for (let i = 0; i < shown.length;) {
    const group = shown[i].group;
    let end = i;
    while (end < shown.length && shown[end].group === group) end++;
    const items = shown.slice(i, end).map((o, k) => renderOption(o, i + k));
    body.push(
      group ? (
        <div key={`g${i}`} role="group" aria-label={group}>
          <div
            aria-hidden
            className="px-3 pt-2 pb-0.5 text-[10px] uppercase tracking-wide text-gray-500"
          >
            {group}
          </div>
          {items}
        </div>
      ) : (
        items
      )
    );
    i = end;
  }

  return (
    <div
      ref={rootRef}
      className="relative flex shrink-0 min-w-0 max-w-full"
      data-choice={search ? 'search' : 'menu'}
    >
      <span id={`${uid}-label`} hidden>
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        title={title ?? label}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelledBy ?? `${uid}-label`} ${uid}-value`}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            e.stopPropagation();
            openMenu();
          }
        }}
        className={`flex items-center gap-1.5 min-w-0 max-w-full bg-gray-850 border ${invalid ? 'border-red-400' : 'border-gray-700 hover:border-gray-600'} rounded text-gray-200 text-left disabled:opacity-50 disabled:cursor-not-allowed ${triggerSize} ${FOCUS} ${className}`}
      >
        {icon}
        <span
          id={`${uid}-value`}
          className={`flex-1 min-w-0 truncate ${current ? '' : 'text-gray-400'}`}
        >
          {current?.label ?? placeholder}
        </span>
        <Chevron />
      </button>
      {open && !disabled && (
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            left: place?.left ?? 0,
            top: place?.top ?? 0,
            maxHeight: place?.maxHeight,
            visibility: place ? undefined : 'hidden',
            minWidth: triggerRef.current?.offsetWidth,
          }}
          className={`z-50 flex flex-col w-max max-w-[min(24rem,calc(100vw-16px))] bg-gray-800 border border-gray-700 rounded-lg shadow-xl ${size === 'md' ? 'text-sm' : 'text-xs'}`}
        >
          {search && (
            <div className="p-1.5 border-b border-gray-700 shrink-0">
              <input
                type="search"
                role="combobox"
                aria-expanded
                aria-autocomplete="list"
                aria-controls={listId}
                aria-activedescendant={activeId}
                aria-label={`Search ${label}`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-gray-950 border border-gray-600 rounded-md px-2 py-1 text-gray-50 placeholder-gray-500 outline-none focus:border-blue-400"
              />
            </div>
          )}
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={labelledBy ? undefined : label}
            aria-labelledby={labelledBy}
            tabIndex={-1}
            aria-activedescendant={search ? undefined : activeId}
            onKeyDown={search ? undefined : onKeyDown}
            className="py-1 overflow-y-auto min-h-0 outline-none"
          >
            {body}
            {shown.length === 0 && <div className="px-3 py-1.5 text-gray-400">{noResults}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
