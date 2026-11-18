/**
 * Asks before a background session is deleted (#94). Resolves to false without
 * calling `remove` when the user cancels.
 */
export async function confirmDelete(name, remove, ask = (message) => window.confirm(message)) {
    if (!ask(`Delete session "${name}"?\n\nThis removes the session and its worktree.`))
        return false;
    await remove();
    return true;
}
