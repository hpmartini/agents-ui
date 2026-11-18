import { useMemo } from 'react';
import { useHost, useTransport } from '../host';
/**
 * Opens a file path the user clicked (#188): VS Code, the default app or Finder, through the
 * transport's `files`. Relative paths resolve against `cwd`. The server keeps folders and
 * launchable files in Finder; failures surface as a toast. null without `files`: callers then
 * leave paths as plain text.
 */
export function useOpenFile() {
    const files = useTransport().files;
    const { toast } = useHost();
    return useMemo(() => files
        ? async (path, cwd, options = {}) => {
            try {
                const { action } = await files.openFile(path, cwd, options);
                if (action === 'revealed' && !options.reveal)
                    toast.info(`Startbare Datei, im Finder gezeigt: ${path}`);
            }
            catch (err) {
                toast.error(`Datei öffnen fehlgeschlagen: ${err instanceof Error ? err.message : err}`);
            }
        }
        : null, [files, toast]);
}
