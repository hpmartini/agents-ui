import React from 'react';
export interface PaneMenuItem {
    label: string;
    title?: string;
    icon: React.ReactNode;
    run: () => void;
    disabled?: boolean;
}
/**
 * The ⋯ menu of an agent pane header: actions that are rarely needed, or that a narrow pane has
 * no room for as buttons. Closes on Escape, on a click elsewhere and when focus leaves it.
 * Arrow keys move between the entries.
 */
export declare const PaneMenu: React.FC<{
    items: PaneMenuItem[];
    /** Look of the ⋯ button, so it sits in the header like its siblings */
    buttonClassName: string;
    /** The header's buttons keep focus and pane state from changing between mousedown and click */
    onButtonMouseDown?: React.MouseEventHandler<HTMLButtonElement>;
    iconSize?: number;
}>;
