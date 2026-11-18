/**
 * Every text the view shows, per locale. `en` is Orkumo's wording verbatim (Orkumo renders `en`);
 * `de` is the German one (MAPLE). Grouped by the part of the view that shows it.
 */
import { createContext, useContext } from 'react';
import { panelsDe, panelsEn } from './labels/panels';
import { shellDe, shellEn } from './labels/shell';
import { terminalDe, terminalEn } from './labels/terminal';
export const en = { shell: shellEn, terminal: terminalEn, panels: panelsEn };
export const de = { shell: shellDe, terminal: terminalDe, panels: panelsDe };
export const locales = { en, de };
/** The locale's texts with `overrides` on top */
export function resolveLabels(locale = 'en', overrides) {
    const base = locales[locale];
    if (!overrides)
        return base;
    return {
        shell: { ...base.shell, ...overrides.shell },
        terminal: { ...base.terminal, ...overrides.terminal },
        panels: { ...base.panels, ...overrides.panels },
    };
}
export const LabelsContext = createContext(en);
export const useLabels = () => useContext(LabelsContext);
