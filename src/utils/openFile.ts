import { useMemo } from 'react';
import { useHost, useTransport } from '../host';
import { useLabels } from '../labels';
import type { OpenFileOptions } from '../transport';

export type OpenFile = (path: string, cwd: string, options?: OpenFileOptions) => Promise<void>;

/**
 * Opens a file path the user clicked (#188): VS Code, the default app or Finder, through the
 * transport's `files`. Relative paths resolve against `cwd`. The server keeps folders and
 * launchable files in Finder; failures surface as a toast. null without `files`: callers then
 * leave paths as plain text.
 */
export function useOpenFile(): OpenFile | null {
  const files = useTransport().files;
  const { toast } = useHost();
  const t = useLabels().terminal;
  return useMemo(
    () =>
      files
        ? async (path, cwd, options = {}) => {
            try {
              const { action } = await files.openFile(path, cwd, options);
              if (action === 'revealed' && !options.reveal) toast.info(t.launchableRevealed(path));
            } catch (err) {
              toast.error(t.openFileFailed(String(err instanceof Error ? err.message : err)));
            }
          }
        : null,
    [files, toast, t]
  );
}
