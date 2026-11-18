import React from 'react';
import { type DirectoryChoice } from '../../utils/directoryGroups';
/** Directory picker for the dispatch target, grouped by parent directory (#158) */
export declare const DirectoryPicker: React.FC<{
    choices: DirectoryChoice[];
    current: string | null;
    home: string | null;
    onCancel: () => void;
    onPick: (path: string) => void;
    /** Placeholder of the filter field when the directory is not a dispatch target */
    label?: string;
    /** false: only the listed choices, no free path (fixed projects must be projects) */
    allowPath?: boolean;
}>;
