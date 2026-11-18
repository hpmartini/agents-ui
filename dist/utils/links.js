/**
 * Where a clicked link opens (#140): the built-in browser by default, the system browser on request.
 * Every link source (terminal, app UI, Electron window.open from the Web-IDE) goes through openLink.
 * A desktop host registers its system-browser opener and built-in browser at startup (`configureLinks`).
 */
export const DEFAULT_LINK_KEYS = {
    cmd: 'system',
    middle: 'system',
    shift: 'side',
    alt: 'builtin',
};
/** Never navigated to from a link: script or local-file access */
const BLOCKED_PROTOCOLS = new Set(['javascript:', 'data:', 'file:', 'vbscript:', 'blob:']);
/** Pure decision: only http(s) ever reaches the built-in browser; other schemes keep their old path */
export function routeLink(url, target) {
    let protocol;
    try {
        protocol = new URL(url).protocol;
    }
    catch {
        return 'blocked';
    }
    if (BLOCKED_PROTOCOLS.has(protocol))
        return 'blocked';
    if (protocol !== 'http:' && protocol !== 'https:')
        return 'system';
    return target === 'system' ? 'system' : 'builtin';
}
/**
 * Target of a click gesture. Precedence: middle button, Cmd/Ctrl, Option, Shift. In a terminal
 * Cmd/Ctrl is the click itself (a plain click selects text), so only Option and Shift pick
 */
export function linkTargetFor(e, click, keys, terminal = false) {
    if (e.button === 1)
        return keys.middle;
    if (!terminal && (e.metaKey || e.ctrlKey))
        return keys.cmd;
    if (e.altKey)
        return keys.alt;
    if (e.shiftKey)
        return keys.shift;
    return click;
}
/**
 * An iframe-based built-in browser cannot show these hosts (X-Frame-Options/frame-ancestors) -> blank panel.
 * shortcut: known hosts only, other refusing sites still show the refused page; Electron's BrowserView is unaffected.
 */
const FRAME_REFUSING_HOST = /(^|\.)github\.com$/i;
const refusesFraming = (url) => FRAME_REFUSING_HOST.test(new URL(url).hostname);
let platform = {};
/** Registers the host platform's link handling; replaces the previous registration */
export function configureLinks(next) {
    platform = next;
}
/** Whether the built-in browser shows sites that refuse framing (see `configureLinks`) */
export const getEmbedsAnySite = () => !!platform.embedsAnySite;
/** URL of the shell browser panel; per context like the attached agent tabs (UI_KEYS in useProjectContexts) */
export const SHELL_BROWSER_KEY = 'devOrbitShellBrowser';
let linkTarget = 'builtin';
let linkKeys = DEFAULT_LINK_KEYS;
let shellBrowser = null;
/** Agent workspaces: open a browser split next to a pane they hold, false for foreign panes */
const paneBrowsers = new Set();
export const getLinkTarget = () => linkTarget;
export function setLinkTarget(target) {
    linkTarget = target;
}
export const getLinkKeys = () => linkKeys;
export function setLinkKeys(keys) {
    linkKeys = { ...DEFAULT_LINK_KEYS, ...keys };
}
/** An agent workspace registers here; returns the unregister function */
export function registerPaneBrowser(open) {
    paneBrowsers.add(open);
    return () => {
        paneBrowsers.delete(open);
    };
}
/** Split opener for links inside agent pane `paneId`; undefined when no workspace holds it */
function paneSplit(paneId) {
    if (!paneId)
        return undefined;
    return (url) => {
        if (![...paneBrowsers].some((open) => open(paneId, url)))
            openLink(url, undefined, 'side');
    };
}
/** The shell's browser panel registers here; returns the unregister function */
export function registerShellBrowser(open) {
    shellBrowser = open;
    return () => {
        if (shellBrowser === open)
            shellBrowser = null;
    };
}
/** System browser, bypassing the built-in one (Electron's window.open is routed back into the app) */
export function openInSystemBrowser(url, onRefused) {
    if (platform.openExternal) {
        // main refuses e.g. localhost in production builds; without a fallback the click would do nothing
        platform
            .openExternal(url)
            .then((result) => {
            if (result.success)
                return;
            if (onRefused)
                onRefused(url);
            else
                console.warn(`[links] system browser refused ${url}: ${result.error ?? 'unknown'}`);
        })
            .catch(console.error);
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}
/**
 * Open a link per the configured target, or per `target` (from the click gesture).
 * `builtin` is the split opener of the pane the link came from; without one, and for 'side', the
 * shell panel opens it.
 */
export function openLink(url, builtin, target = linkTarget) {
    let route = routeLink(url, target);
    if (route === 'builtin' && !platform.embedsAnySite && refusesFraming(url))
        route = 'system';
    const openBuiltin = (target !== 'side' && builtin) || shellBrowser;
    if (route === 'builtin' && openBuiltin)
        openBuiltin(url);
    else if (route !== 'blocked')
        openInSystemBrowser(url, openBuiltin ?? undefined);
    return route;
}
/**
 * Document-level click handler: `target="_blank"` http(s) anchors anywhere in the app follow openLink,
 * so the individual components keep plain anchors (copy link, middle-click) without their own logic.
 */
export function interceptAnchorClick(event) {
    if (event.defaultPrevented || event.button > 1)
        return;
    const anchor = event.target?.closest?.('a[href]');
    // mailto: and friends keep the browser's default handling
    if (!anchor || anchor.target !== '_blank' || !/^https?:/i.test(anchor.href))
        return;
    event.preventDefault();
    const pane = anchor.closest('[data-agent-pane]')?.getAttribute('data-agent-pane');
    openLink(anchor.href, paneSplit(pane), linkTargetFor(event, linkTarget, linkKeys));
}
/**
 * Capture phase: rail anchors stop propagation (so the row doesn't toggle), which would hide
 * the click from a bubbling document listener. Returns the cleanup.
 */
export function installAnchorInterception() {
    // the middle button fires auxclick, not click
    document.addEventListener('click', interceptAnchorClick, true);
    document.addEventListener('auxclick', interceptAnchorClick, true);
    return () => {
        document.removeEventListener('click', interceptAnchorClick, true);
        document.removeEventListener('auxclick', interceptAnchorClick, true);
    };
}
