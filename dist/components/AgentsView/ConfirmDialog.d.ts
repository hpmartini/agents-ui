import React from 'react';
/**
 * Small yes/no dialog over the view (no window.confirm: it blocks and cannot be themed). The safe
 * choice has focus, so Enter does not confirm by accident.
 */
export declare const ConfirmDialog: React.FC<{
    title: string;
    body: string;
    confirm: string;
    /** Colour of the confirm button: red for something that cannot be undone (default), blue otherwise */
    tone?: 'danger' | 'primary';
    onConfirm: () => void;
    onCancel: () => void;
}>;
