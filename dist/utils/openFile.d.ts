import type { OpenFileOptions } from '../transport';
export type OpenFile = (path: string, cwd: string, options?: OpenFileOptions) => Promise<void>;
/**
 * Opens a file path the user clicked (#188): VS Code, the default app or Finder, through the
 * transport's `files`. Relative paths resolve against `cwd`. The server keeps folders and
 * launchable files in Finder; failures surface as a toast. null without `files`: callers then
 * leave paths as plain text.
 */
export declare function useOpenFile(): OpenFile | null;
