import React from 'react';
import { type FilePathMatch } from '../../../utils/fileLinks';
/**
 * Session directory file paths in the markdown resolve against. Without it (no session behind
 * the text) paths stay plain text.
 */
export declare const ChatFileContext: React.Context<string | null>;
/** The whole text is one file path (`src/x.ts`, `/abs/y.md:12`), else null */
export declare function wholeFilePath(text: string): FilePathMatch | null;
/** Copy button with a short "Copied" confirmation */
export declare const CopyButton: React.FC<{
    text: string;
    label?: string;
    className?: string;
}>;
export declare const ChatMarkdown: React.FC<{
    text: string;
}>;
