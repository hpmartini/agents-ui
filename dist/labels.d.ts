import { type PanelsLabels } from './labels/panels';
import { type ShellLabels } from './labels/shell';
import { type TerminalLabels } from './labels/terminal';
export interface Labels {
    shell: ShellLabels;
    terminal: TerminalLabels;
    panels: PanelsLabels;
}
export declare const en: Labels;
export declare const de: Labels;
export declare const locales: {
    readonly en: Labels;
    readonly de: Labels;
};
export type Locale = keyof typeof locales;
/** Single texts to replace, per group */
export type LabelOverrides = {
    [G in keyof Labels]?: Partial<Labels[G]>;
};
/** The locale's texts with `overrides` on top */
export declare function resolveLabels(locale?: Locale, overrides?: LabelOverrides): Labels;
export declare const LabelsContext: import("react").Context<Labels>;
export declare const useLabels: () => Labels;
