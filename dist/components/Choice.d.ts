/**
 * One control for picking one value out of a list, in the rendering its size calls for:
 * up to CHOICE_PILL_MAX options as pills (radio group), up to CHOICE_SEARCH_THRESHOLD as a
 * menu (listbox), more as a menu with a search field. Imports only React and local utils, so
 * a module bundle with its own React can use it (`@hpmartini/agents-ui/components/Choice`).
 * Escape always closes the popup (it does not clear the search first) and goes back to the trigger.
 */
import React from 'react';
/** At most this many options render as pills */
export declare const CHOICE_PILL_MAX = 3;
/** More options than this get a search field in the menu */
export declare const CHOICE_SEARCH_THRESHOLD = 7;
export type ChoiceMode = 'pills' | 'menu' | 'search';
/** The rendering for `count` options; an "any"/"all" option counts like every other */
export declare const choiceMode: (count: number) => ChoiceMode;
export interface ChoiceOption<V extends string = string> {
    value: V;
    label: string;
    /** Muted text after the label (menu, search) or tooltip (pills) */
    hint?: string;
    disabled?: boolean;
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
export declare function Choice<V extends string = string>(props: ChoiceProps<V>): React.JSX.Element;
