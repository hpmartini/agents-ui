import { resumableSessionId, sessionHarness, transcriptId } from './agentSessions';
/**
 * Session copies (#236). `claude -p --resume <id>` keeps the session id, so a second process on
 * a transcript another process still writes is a second writer in the same worktree: the rail
 * shows it as a copy of that agent, and starting one asks first.
 */
/** Every transcript id a session writes or wrote (a background job's respawn writes a new one) */
export function transcriptIds(session) {
    const ids = [session.sessionId, ...(session.sessionIds ?? [])];
    return [...new Set(ids.filter((id) => !!id))];
}
/**
 * One rail row per agent: a session whose transcript an earlier session already holds moves into
 * that session's `copies`. Background jobs are the source before interactive processes, then the
 * older session wins.
 */
export function collapseCopies(sessions) {
    const order = [...sessions].sort((a, b) => Number(b.kind === 'background') - Number(a.kind === 'background') || a.startedAt - b.startedAt);
    const owner = new Map();
    const copies = new Map();
    for (const session of order) {
        const ids = transcriptIds(session);
        const source = ids.map((id) => owner.get(id)).find(Boolean);
        if (source)
            copies.set(source.id, [...(copies.get(source.id) ?? []), session]);
        else
            ids.forEach((id) => owner.set(id, session));
    }
    const copyIds = new Set([...copies.values()].flat().map((s) => s.id));
    return sessions
        .filter((s) => !copyIds.has(s.id))
        .map((s) => (copies.has(s.id) ? { ...s, copies: copies.get(s.id) } : s));
}
/** Listed session that holds transcript `sessionId` (a running job or process), or null */
export function transcriptHolder(sessions, sessionId) {
    // `/resume <id>` also takes a prefix of 8+ characters
    if (!sessionId || sessionId.length < 8)
        return null;
    return (sessions.find((s) => (s.kind === 'background' || s.pid != null) &&
        transcriptIds(s).some((id) => id.startsWith(sessionId))) ?? null);
}
/** Open terminal pane that already runs transcript `sessionId`, or null */
export function paneHolding(panes, openIds, sessionId, targets) {
    if (!sessionId)
        return null;
    return (panes.find((p) => openIds.has(p.id) && resumableSessionId(p, targets) === sessionId)?.id ?? null);
}
/**
 * Resuming `session` elsewhere makes a copy: a background job always (its own process is
 * `claude attach`), an interactive session while its process still runs.
 */
export function resumeMakesCopy(session) {
    return session.kind === 'background' || session.pid != null;
}
export function openPlan(session, panes, openIds, 
/** The transport's instances (#220); local only without */
targets) {
    if (session.kind === 'app')
        return { type: 'app', url: session.app?.url ?? null };
    // The server matched the session to a pane of ours whose PTY still runs it
    if (session.paneId)
        return openIds.has(session.paneId)
            ? { type: 'focus', paneId: session.paneId }
            : { type: 'reattach', paneId: session.paneId };
    if (session.kind !== 'interactive')
        return { type: 'attach' };
    const sessionId = resumableSessionId(session, targets);
    const held = paneHolding(panes, openIds, sessionId, targets);
    if (held)
        return { type: 'focus', paneId: held };
    return sessionHarness(session) === 'claude' ? { type: 'resume', sessionId } : { type: 'attach' };
}
/** Session id shown on a workspace tab: the job id for background jobs, else the transcript id */
export function tabSessionLabel(session) {
    if (session.kind === 'background' && !session.ptyArgs)
        return session.id;
    const id = transcriptId(session);
    return id ? id.slice(0, 8) : null;
}
