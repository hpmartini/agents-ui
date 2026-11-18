import { type ShellLabels } from '../labels/shell';
/**
 * Asks before a background session is deleted (#94). Resolves to false without
 * calling `remove` when the user cancels. `question` is the locale's wording.
 */
export declare function confirmDelete(name: string, remove: () => Promise<unknown>, ask?: (message: string) => boolean, question?: ShellLabels['confirmDeleteSession']): Promise<boolean>;
