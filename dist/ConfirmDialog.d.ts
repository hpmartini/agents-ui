import React from 'react';
/** Small modal yes/no inside the panel (no window.confirm: it blocks and cannot be themed) */
export declare const ConfirmDialog: React.FC<{
    title: string;
    body: string;
    confirm: string;
    onConfirm: () => void;
    onCancel: () => void;
}>;
