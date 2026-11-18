/**
 * What the agents view needs from the app around it, besides the transport: notifications,
 * navigation to the host's other pages, its command palette, its board, its built-in browser and
 * terminal look. Everything but `toast` is optional; a missing callback hides what needs it.
 * Nothing in the package imports a router, a toast library or Electron globals.
 */
import { type HTMLAttributes, type ReactNode } from 'react';
import type { ITerminalOptions } from '@xterm/xterm';
import type { AgentsTransport } from './transport';
import type { AgentSession } from './types';
import { type LabelOverrides, type Locale } from './labels';
export interface ToastOptions {
    id?: string;
    /** ms */
    duration?: number;
    /** Glyph shown before the message (agent notifications: ✻ needs input, ✓ finished) */
    icon?: string;
}
export interface Notifier {
    info: (message: string, options?: ToastOptions) => void;
    success: (message: string, options?: ToastOptions) => void;
    error: (message: string, options?: ToastOptions) => void;
    dismiss: (id?: string) => void;
}
export type PaletteScope = 'command' | 'agent' | 'project';
/** One entry of the host's command palette (shape of Orkumo's `PaletteCommand`) */
export interface PaletteCommand {
    id: string;
    title: string;
    /** Section label shown next to the title, e.g. "View" or "Agent" */
    group: string;
    scope: PaletteScope;
    /** Extra search terms that are not part of the title */
    keywords?: string;
    /** Display string for an existing shortcut, e.g. "⌘P" */
    shortcut?: string;
    run: () => void;
    /** Offered as a trailing "<title>: <text>" row for free text that is not a prefix query */
    runWithText?: (text: string) => void;
}
/** Built-in browser pane (Orkumo: the Coding view's preview, an Electron BrowserView) */
export interface BrowserPaneProps {
    url: string;
    onClose: () => void;
    closeLabel: string;
    /** Spread on the browser's toolbar, which doubles as the pane's drag handle */
    dragHandleProps?: HTMLAttributes<HTMLDivElement>;
    /** Extra toolbar buttons */
    actions?: ReactNode;
}
/** Board issues of the listed agents (Orkumo: its board, `deriveAgentLinks`, workflow provider) */
export interface AgentIssues {
    /** Agent id → linked issue keys ("owner/name#12"); undefined until the board is loaded */
    byAgent: Map<string, string[]> | undefined;
    /** Agent id → issue key, for agents the workflow provider started */
    workflowIssues: Map<string, string>;
    /** Issue key → title (rail search and link filter) */
    titles: Map<string, string>;
    /** Session-name pattern of the workflow provider; null: no name matching */
    workflowName: RegExp | null;
}
/** An issue being written; carried between the issue dialog and the task composer */
export interface IssueDraft {
    title: string;
    body: string;
    images: File[];
}
export interface IssueCreateProps {
    /** Repo ("owner/name") of the rail selection; null: the host picks (Orkumo: the last used) */
    repo: string | null;
    /** GitHub repos of the listed agents */
    repos: string[];
    /** Text and images moved over from the composer */
    draft?: IssueDraft;
    /** Task/Agent/Chat switch: the view opens that composer with the draft as its text */
    onKindChange: (kind: 'task' | 'agent' | 'chat', draft: IssueDraft) => void;
    onClose: () => void;
}
export interface AgentsHost {
    toast: Notifier;
    /** Code view of `folder` */
    openCode?: (folder: string) => void;
    /** Board filtered to a repo and, optionally, to the issues of one agent */
    openBoard?: (repoSlug: string, sessionId?: string) => void;
    /** A host mode (`nav.modes` of the view), scoped like the board */
    openMode?: (modeId: string, repoSlug: string, sessionId?: string) => void;
    /** Full pull request view, optionally filtered to a repo */
    openPulls?: (repo?: string | null) => void;
    /** Settings of the host project (app) `appId` */
    openProjectSettings?: (appId: string) => void;
    /**
     * Local checkout of a GitHub repo ("owner/name"), for "Code" on a PR no agent works on; null:
     * none. Without it such PRs report that there is no local checkout.
     */
    fetchRepoPath?: (repoSlug: string) => Promise<string | null>;
    /** Registers the view's commands under `sourceId` (called as a hook, on every render) */
    useRegisterCommands?: (sourceId: string, commands: PaletteCommand[]) => void;
    /** Whether the palette is open (called as a hook): the view's keys stay quiet meanwhile */
    usePaletteOpen?: () => boolean;
    /** Mode buttons at the top of the view's activity bar; without it there is no activity bar */
    renderActivityBar?: (props: {
        onToggleRail: () => void;
    }) => ReactNode;
    /** Rendered in the header after the New task button (Orkumo: module UIs of slot `agents-rail`) */
    headerSlot?: ReactNode;
    /**
     * Window title while the view is shown (agents awaiting input first, `documentTitle`); null
     * when it is no longer shown, so the host restores its own
     */
    onAttention?: (title: string | null) => void;
    /** Called as a hook with the listed sessions; keep the returned maps stable (useMemo) */
    useIssues?: (sessions: AgentSession[]) => AgentIssues;
    /** An issue pill clicked: the issue as a modal over the view */
    renderIssueModal?: (props: {
        issueKey: string;
        sessions: AgentSession[];
        onClose: () => void;
    }) => ReactNode;
    /** "New issue" dialog; without it the Issue kind of New task and the composer is hidden */
    renderIssueCreate?: (props: IssueCreateProps) => ReactNode;
    /** A prompt from the quick window: opens the chat composer with it */
    onQuickPrompt?: (listener: (text: string) => void) => () => void;
    /** The quick window hands over its agent pane `paneId`: opened here once listed */
    onQuickChat?: (listener: (paneId: string) => void) => () => void;
    /** Built-in browser pane; without it links open in the system browser */
    renderBrowser?: (props: BrowserPaneProps) => ReactNode;
    /** xterm options (theme, font) of the host; without them the `--agents-*` CSS variables apply */
    terminalOptions?: ITerminalOptions;
}
interface AgentsContextValue {
    transport: AgentsTransport;
    host: AgentsHost;
}
/**
 * Transport, host and texts for every agents-ui component below. `locale` (default `'en'`,
 * Orkumo's wording) and `labels` (single texts replaced) apply below; without both, an outer
 * provider's texts stay.
 */
export declare const AgentsProvider: ({ transport, host, locale, labels, children, }: AgentsContextValue & {
    locale?: Locale;
    labels?: LabelOverrides;
    children: ReactNode;
}) => import("react").JSX.Element;
export declare const useTransport: () => AgentsTransport;
export declare const useHost: () => AgentsHost;
export {};
