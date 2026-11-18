/** null = not a submit key (plain Enter stays a newline) */
export function submitIntent(e) {
    if (e.key !== 'Enter' || e.nativeEvent?.isComposing)
        return null;
    if (!e.metaKey && !e.ctrlKey)
        return null;
    return { attach: e.shiftKey };
}
/** Image files of a paste / drop / file-input list */
export function imageFiles(list) {
    return Array.from(list || []).filter((f) => f.type.startsWith('image/'));
}
/** Images the agents' image store takes (`POST /api/agents/images` sniffs the same four) */
export const PROMPT_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const extensionOf = (name) => /\.([^./\\]+)$/.exec(name)?.[1]?.toLowerCase() ?? '';
/**
 * Files a chat or agent prompt can carry (#19 AK-3): the four image types, else PDF, text and
 * code by extension (`extensions`: the transport's `uploads.attachmentExtensions`; the server
 * checks the content).
 */
export function attachableFiles(list, extensions) {
    return Array.from(list || []).filter((f) => PROMPT_IMAGE_TYPES.includes(f.type) || extensions.includes(extensionOf(f.name)));
}
/**
 * Prompt with the stored attachments appended: `[Image: <path>]` the way Claude Code references
 * pasted images, `[File: <path>]` for documents the agent reads itself
 */
export function promptWithAttachments(prompt, stored) {
    const text = prompt.trim();
    if (stored.length === 0)
        return text;
    return [text, ...stored.map((a) => `[${a.kind === 'image' ? 'Image' : 'File'}: ${a.path}]`)]
        .filter(Boolean)
        .join('\n');
}
/** Issue body with the uploaded images embedded as Markdown */
export function bodyWithImages(body, urls) {
    if (urls.length === 0)
        return body;
    const images = urls.map((url, i) => `![image-${i + 1}](${url})`).join('\n');
    return body.trim() ? `${body.trimEnd()}\n\n${images}` : images;
}
/** Task text -> issue fields when switching dialogs (#271): first line is the title (GitHub limit 256) */
export function taskToIssueDraft(text) {
    const [first = '', ...rest] = text.trim().split('\n');
    const title = first.trim();
    return title.length > 256
        ? { title: '', body: text.trim() }
        : { title, body: rest.join('\n').trim() };
}
/** Issue fields -> task text; the inverse of taskToIssueDraft */
export function issueDraftToTask(draft) {
    return [draft.title.trim(), draft.body.trim()].filter(Boolean).join('\n\n');
}
/**
 * Directory a new task, agent or chat starts in, the same one the composer shows: a pick in the
 * composer first, then per kind the task default (settings `taskCwd`) or the directory handed
 * over on open, then the rail target (task, chat) or home (agent)
 */
export function composerStartCwd(kind, dirs) {
    if (dirs.picked)
        return dirs.picked;
    if (kind === 'task')
        return dirs.taskCwd || dirs.targetCwd;
    if (kind === 'agent')
        return dirs.opened || dirs.homeDir;
    return dirs.opened || dirs.targetCwd;
}
