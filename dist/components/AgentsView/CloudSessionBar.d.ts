import React from 'react';
interface CloudSessionBarProps {
    /** Open a PTY tab: with a target `claude --cloud <id|url>`, without `claude --teleport` */
    onOpen: (target?: string) => Promise<void>;
}
/** Attach to a cloud session by ID/URL, or pick one with `claude --teleport`. */
export declare const CloudSessionBar: React.FC<CloudSessionBarProps>;
export {};
