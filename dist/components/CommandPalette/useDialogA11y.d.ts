import type React from 'react';
/**
 * Modal dialog a11y: moves focus in on open, restores it to the previously focused element
 * on close and returns a keydown handler that keeps Tab inside the dialog.
 * The trap only reacts to events from inside its own dialog, so stacked dialogs coexist.
 */
export declare function useDialogA11y(open: boolean, dialogRef: React.RefObject<HTMLElement | null>, initialFocus: () => HTMLElement | null | undefined): React.KeyboardEventHandler<HTMLElement>;
