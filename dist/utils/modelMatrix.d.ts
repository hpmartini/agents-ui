/** Model × effort picker: one row per model, one column per effort level any model takes */
export interface HarnessModel {
    id: string;
    label: string;
    group: string;
    efforts: string[];
}
export declare function effortColumns(models: HarnessModel[]): string[];
/**
 * The listed models plus `extra` names (aliases the CLI help does not mention), the extra ones
 * with the efforts of the first listed model; rows filtered on id, label and provider
 */
export declare function matrixRows(models: HarnessModel[], extra: string[], filter: string): HarnessModel[];
/**
 * What the UI view types into a running session to switch model and effort; '' keeps the
 * current one. Claude Code: `/model`, `/effort`; omp: `/switch` (this session only), `/effort`
 */
export declare function switchCommands(harness: 'claude' | 'omp', model: string, effort: string): string[];
/** Button text: `opus · high`, `default` for what the CLI picks itself */
/** Row `id` names the running `current` model: same id, or an alias part of it (opus ⊂ claude-opus-5-5) */
export declare const isCurrentModel: (id: string, current: string | null | undefined) => boolean;
export declare const pickLabel: (model: string, effort: string, defaultModel?: string | null) => string;
