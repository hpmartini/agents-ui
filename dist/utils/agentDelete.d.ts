/**
 * Asks before a background session is deleted (#94). Resolves to false without
 * calling `remove` when the user cancels.
 */
export declare function confirmDelete(name: string, remove: () => Promise<unknown>, ask?: (message: string) => boolean): Promise<boolean>;
