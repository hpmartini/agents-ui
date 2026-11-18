/**
 * Every text the view shows, per locale. `en` is Orkumo's wording verbatim (Orkumo renders `en`);
 * `de` is the German one (MAGOS). Grouped by the part of the view that shows it.
 */
import { createContext, useContext } from 'react';
import { panelsDe, panelsEn, type PanelsLabels } from './labels/panels';
import { shellDe, shellEn, type ShellLabels } from './labels/shell';
import { terminalDe, terminalEn, type TerminalLabels } from './labels/terminal';

export interface Labels {
  shell: ShellLabels;
  terminal: TerminalLabels;
  panels: PanelsLabels;
}

export const en: Labels = { shell: shellEn, terminal: terminalEn, panels: panelsEn };
export const de: Labels = { shell: shellDe, terminal: terminalDe, panels: panelsDe };

export const locales = { en, de } as const;
export type Locale = keyof typeof locales;

/** Single texts to replace, per group */
export type LabelOverrides = { [G in keyof Labels]?: Partial<Labels[G]> };

/** The locale's texts with `overrides` on top */
export function resolveLabels(locale: Locale = 'en', overrides?: LabelOverrides): Labels {
  const base = locales[locale];
  if (!overrides) return base;
  return {
    shell: { ...base.shell, ...overrides.shell },
    terminal: { ...base.terminal, ...overrides.terminal },
    panels: { ...base.panels, ...overrides.panels },
  };
}

export const LabelsContext = createContext<Labels>(en);
export const useLabels = (): Labels => useContext(LabelsContext);
