import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Bot, ExternalLink, GitPullRequest } from 'lucide-react';
import { prLabel } from '../../utils/agentSessions';
/** "owner/name#12" → "#12" inside the agent's own repo, else "name#12" */
const issueLabel = (key, repoSlug) => {
    const hash = key.lastIndexOf('#');
    return repoSlug && key.slice(0, hash).toLowerCase() === repoSlug.toLowerCase()
        ? key.slice(hash)
        : key.slice(key.indexOf('/') + 1);
};
const pillClass = 'shrink-0 whitespace-nowrap font-mono leading-4 px-1 rounded border';
export const IssuePill = ({ issueKey, repoSlug, onOpen }) => (_jsx("button", { onClick: (e) => {
        e.stopPropagation();
        onOpen?.(issueKey);
    }, className: `${pillClass} border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor`, title: `Open ${issueKey}`, children: issueLabel(issueKey, repoSlug) }));
/** PR state of a session; opens exactly its PR(s) when `onOpenPr` is given, else links out */
export const PrPill = ({ session, onOpenPr }) => {
    const label = prLabel(session.links);
    if (!label)
        return null;
    return onOpenPr ? (_jsxs("button", { onClick: (e) => {
            e.stopPropagation();
            onOpenPr(session.links);
        }, className: `${pillClass} ${label.className} flex items-center gap-0.5 hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cursor`, title: session.links.length > 1
            ? `Show these ${session.links.length} pull requests`
            : `Show pull request ${label.text}`, children: [_jsx(GitPullRequest, { size: 10, "aria-hidden": "true" }), _jsx("span", { className: "sr-only", children: "Pull request " }), label.text] })) : (_jsxs("a", { href: label.href || undefined, target: "_blank", rel: "noreferrer", onClick: (e) => e.stopPropagation(), className: `${pillClass} ${label.className} flex items-center gap-0.5`, title: `Open pull request${session.links.length > 1 ? 's' : ''}\n${session.links.map((l) => l.href).join('\n')}`, children: [_jsx(GitPullRequest, { size: 10, "aria-hidden": "true" }), _jsx("span", { className: "sr-only", children: "Pull request " }), label.text, label.href && _jsx(ExternalLink, { size: 9 })] }));
};
export const ServerLinks = ({ session, servers }) => (_jsx(_Fragment, { children: servers.map((server) => (_jsxs("a", { href: `http://localhost:${server.port}`, target: "_blank", rel: "noreferrer", onClick: (e) => e.stopPropagation(), className: "shrink-0 flex items-center gap-1 min-w-0 text-gray-400 hover:text-white", title: `${server.command || server.name}: port ${server.port}${server.pid ? `, pid ${server.pid}` : ''}\n${session.worktree || session.cwd}\nClick to open`, children: [_jsxs("span", { className: "font-mono text-emerald-400", children: [":", server.port] }), _jsx("span", { className: "truncate max-w-[8rem]", children: server.name })] }, server.port))) }));
export const SubagentsBadge = ({ ctx }) => {
    const running = ctx?.subagents.running || 0;
    if (running === 0)
        return null;
    return (_jsxs("span", { className: "shrink-0 flex items-center gap-1 text-sky-300 tabular-nums", title: ctx?.subagents.names.join('\n') || undefined, children: [_jsx(Bot, { size: 10 }), running, " sub-agent", running === 1 ? '' : 's', " running"] }));
};
/**
 * Pull requests, board issues, running servers and sub-agents of one session,
 * as inline items (the caller owns the flex container).
 */
export const SessionLinks = ({ session, ctx, servers, issueKeys, onOpenIssue, onOpenPr, }) => (_jsxs(_Fragment, { children: [_jsx(PrPill, { session: session, onOpenPr: onOpenPr }), issueKeys.map((key) => (_jsx(IssuePill, { issueKey: key, repoSlug: ctx?.repo?.slug, onOpen: onOpenIssue }, key))), _jsx(ServerLinks, { session: session, servers: servers }), _jsx(SubagentsBadge, { ctx: ctx })] }));
