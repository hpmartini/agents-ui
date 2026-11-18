import React from 'react';
interface RailSwitchProps {
    id: string;
    label: string;
    /** Muted text after the label */
    hint?: string;
    checked: boolean;
    onToggle: () => void;
}
/** Labeled on/off switch in the rail footer */
export declare const RailSwitch: React.FC<RailSwitchProps>;
export {};
