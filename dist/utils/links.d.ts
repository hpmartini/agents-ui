/**
 * Where a clicked link opens (#140): the built-in browser by default, the system browser on request.
 * Every link source (terminal, app UI, Electron window.open from the Web-IDE) goes through openLink.
 * A desktop host registers its system-browser opener and built-in browser at startup (`configureLinks`).
 */
/**
 * 'builtin': split next to the agent pane the link came from (the shell's side panel elsewhere),
 * 'side': always the shell's side panel, 'system': the system browser
 */
export type LinkTarget = 'builtin' | 'side' | 'system';
/** Where each click gesture opens a link; a plain click follows the link target */
export interface LinkKeys {
    cmd: LinkTarget;
    shift: LinkTarget;
    alt: LinkTarget;
    middle: LinkTarget;
}
export declare const DEFAULT_LINK_KEYS: LinkKeys;
export type LinkRoute = 'builtin' | 'system' | 'blocked';
/** Pure decision: only http(s) ever reaches the built-in browser; other schemes keep their old path */
export declare function routeLink(url: string, target: LinkTarget): LinkRoute;
/**
 * Target of a click gesture. Precedence: middle button, Cmd/Ctrl, Option, Shift. In a terminal
 * Cmd/Ctrl is the click itself (a plain click selects text), so only Option and Shift pick
 */
export declare function linkTargetFor(e: {
    button: number;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
}, click: LinkTarget, keys: LinkKeys, terminal?: boolean): LinkTarget;
/** What the host platform adds to link handling; registered once at startup */
export interface LinkPlatform {
    /** Opens `url` in the system browser (Electron: shell.openExternal); resolves `success: false` when refused */
    openExternal?: (url: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    /** The built-in browser shows sites that refuse framing (Electron BrowserView, not an iframe) */
    embedsAnySite?: boolean;
}
/** Registers the host platform's link handling; replaces the previous registration */
export declare function configureLinks(next: LinkPlatform): void;
/** Whether the built-in browser shows sites that refuse framing (see `configureLinks`) */
export declare const getEmbedsAnySite: () => boolean;
/** URL of the shell browser panel; per context like the attached agent tabs (UI_KEYS in useProjectContexts) */
export declare const SHELL_BROWSER_KEY = "devOrbitShellBrowser";
export declare const getLinkTarget: () => LinkTarget;
export declare function setLinkTarget(target: LinkTarget): void;
export declare const getLinkKeys: () => LinkKeys;
export declare function setLinkKeys(keys: Partial<LinkKeys> | undefined): void;
/** An agent workspace registers here; returns the unregister function */
export declare function registerPaneBrowser(open: (paneId: string, url: string) => boolean): () => void;
/** The shell's browser panel registers here; returns the unregister function */
export declare function registerShellBrowser(open: (url: string) => void): () => void;
/** System browser, bypassing the built-in one (Electron's window.open is routed back into the app) */
export declare function openInSystemBrowser(url: string, onRefused?: (url: string) => void): void;
/**
 * Open a link per the configured target, or per `target` (from the click gesture).
 * `builtin` is the split opener of the pane the link came from; without one, and for 'side', the
 * shell panel opens it.
 */
export declare function openLink(url: string, builtin?: (url: string) => void, target?: LinkTarget): LinkRoute;
/**
 * Document-level click handler: `target="_blank"` http(s) anchors anywhere in the app follow openLink,
 * so the individual components keep plain anchors (copy link, middle-click) without their own logic.
 */
export declare function interceptAnchorClick(event: MouseEvent): void;
/**
 * Capture phase: rail anchors stop propagation (so the row doesn't toggle), which would hide
 * the click from a bubbling document listener. Returns the cleanup.
 */
export declare function installAnchorInterception(): () => void;
