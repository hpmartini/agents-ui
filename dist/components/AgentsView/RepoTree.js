import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Folder, User } from 'lucide-react';
import { useLabels } from '../../labels';
/** Collapsed folder keys (and ROOT when the root is collapsed); every other node is open */
export const REPO_TREE_COLLAPSED_KEY = 'agentsUi.pullsTreeCollapsed';
const ROOT = ':all';
const nodeId = (s) => s.kind === 'all' ? ROOT : s.kind === 'folder' ? `f:${s.key}` : `r:${s.slug.toLowerCase()}`;
function readCollapsed() {
    try {
        const list = JSON.parse(localStorage.getItem(REPO_TREE_COLLAPSED_KEY) || '[]');
        return new Set(Array.isArray(list) ? list.filter((v) => typeof v === 'string') : []);
    }
    catch {
        return new Set(); // unavailable or corrupt storage: all open
    }
}
/**
 * WAI-ARIA tree of the repos with open PRs (All repositories → nested folders → repo), each with its
 * count. One tab stop; ↑/↓ move, → opens or goes to the first child, ← closes or goes to the
 * parent, Home/End, Enter/Space select, a letter jumps to the next node starting with it.
 */
export const RepoTree = ({ tree, selection, onSelect, loading, className = '' }) => {
    const t = useLabels().shell;
    const empty = tree.folders.length === 0 && tree.repos.length === 0;
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [focusId, setFocusId] = useState(null);
    const refs = useRef(new Map());
    const nodes = useMemo(() => {
        const list = [
            {
                id: ROOT,
                level: 1,
                label: t.allRepositories,
                count: tree.total,
                fold: ROOT,
                parent: null,
                select: { kind: 'all' },
            },
        ];
        const repos = (rs, level, parent) => {
            for (const r of rs)
                list.push({
                    id: `r:${r.slug.toLowerCase()}`,
                    level,
                    label: r.name,
                    count: r.count,
                    fold: null,
                    parent,
                    select: { kind: 'repo', slug: r.slug },
                    title: r.slug,
                });
        };
        const folders = (fs, level, parent) => {
            for (const f of fs) {
                const id = `f:${f.key}`;
                list.push({
                    id,
                    level,
                    label: f.label,
                    count: f.count,
                    fold: f.key,
                    parent,
                    icon: f.key.startsWith('@') ? 'owner' : 'folder',
                    select: { kind: 'folder', key: f.key },
                    title: f.title,
                });
                if (collapsed.has(f.key))
                    continue;
                folders(f.folders, level + 1, id);
                repos(f.repos, level + 1, id);
            }
        };
        if (collapsed.has(ROOT))
            return list;
        folders(tree.folders, 2, ROOT);
        repos(tree.repos, 2, ROOT);
        return list;
    }, [tree, collapsed, t.allRepositories]);
    const selectedId = nodeId(selection);
    // The tab stop: the focused node, else the selected one if shown, else the root
    const stop = [focusId, selectedId].find((id) => id && nodes.some((n) => n.id === id)) ?? ROOT;
    const setFold = (key, close) => {
        const next = new Set(collapsed);
        if (close)
            next.add(key);
        else
            next.delete(key);
        setCollapsed(next);
        try {
            localStorage.setItem(REPO_TREE_COLLAPSED_KEY, JSON.stringify([...next]));
        }
        catch {
            // full or unavailable: the state still holds for this page
        }
    };
    const focus = (id) => {
        setFocusId(id);
        refs.current.get(id)?.focus();
    };
    const onKeyDown = (e, node, i) => {
        const open = !!node.fold && !collapsed.has(node.fold);
        let handled = true;
        if (e.key === 'ArrowDown')
            i + 1 < nodes.length && focus(nodes[i + 1].id);
        else if (e.key === 'ArrowUp')
            i > 0 && focus(nodes[i - 1].id);
        else if (e.key === 'Home')
            focus(nodes[0].id);
        else if (e.key === 'End')
            focus(nodes[nodes.length - 1].id);
        else if (e.key === 'ArrowRight') {
            if (node.fold && !open)
                setFold(node.fold, false);
            else if (open && nodes[i + 1]?.parent === node.id)
                focus(nodes[i + 1].id);
        }
        else if (e.key === 'ArrowLeft') {
            if (open)
                setFold(node.fold, true);
            else if (node.parent)
                focus(node.parent);
        }
        else if (e.key === 'Enter' || e.key === ' ')
            onSelect(node.select);
        else if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const ch = e.key.toLowerCase();
            const order = [...nodes.slice(i + 1), ...nodes.slice(0, i)];
            const hit = order.find((n) => n.label.toLowerCase().startsWith(ch));
            if (hit)
                focus(hit.id);
        }
        else
            handled = false;
        if (handled) {
            e.preventDefault();
            e.stopPropagation();
        }
    };
    return (_jsxs("div", { className: `text-xs ${className}`, children: [_jsx("div", { role: "tree", "aria-label": t.repoTree, className: "py-1", children: nodes.map((node, i) => {
                    const selected = node.id === selectedId;
                    const open = !!node.fold && !collapsed.has(node.fold);
                    return (_jsxs("div", { ref: (el) => {
                            if (el)
                                refs.current.set(node.id, el);
                            else
                                refs.current.delete(node.id);
                        }, role: "treeitem", "aria-level": node.level, "aria-selected": selected, "aria-expanded": node.fold ? open : undefined, tabIndex: node.id === stop ? 0 : -1, title: node.title, onClick: () => {
                            setFocusId(node.id);
                            onSelect(node.select);
                        }, onFocus: () => setFocusId(node.id), onKeyDown: (e) => onKeyDown(e, node, i), style: { paddingLeft: 4 + (node.level - 1) * 12 }, className: `flex items-center gap-1 pr-2 py-1 cursor-pointer rounded outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cursor ${selected
                            ? 'bg-blue-500/20 text-white'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`, children: [node.fold ? (_jsx("span", { "aria-hidden": true, title: open ? t.collapseNode(node.label) : t.expandNode(node.label), onClick: (e) => {
                                    e.stopPropagation();
                                    setFold(node.fold, open);
                                }, className: "shrink-0 p-0.5 rounded text-gray-400 hover:text-white hover:bg-gray-700", children: open ? (_jsx(ChevronDown, { size: 12, "aria-hidden": true })) : (_jsx(ChevronRight, { size: 12, "aria-hidden": true })) })) : (_jsx("span", { className: "w-4 shrink-0", "aria-hidden": true })), node.icon &&
                                (node.icon === 'owner' ? (_jsx(User, { size: 12, "aria-hidden": true, className: "shrink-0 text-gray-400" })) : (_jsx(Folder, { size: 12, "aria-hidden": true, className: "shrink-0 text-gray-400" }))), _jsx("span", { className: `min-w-0 truncate ${node.level === 1 ? 'font-medium' : ''}`, children: node.label }), !(loading && empty) && (_jsx("span", { className: `ml-auto pl-2 shrink-0 tabular-nums ${node.count ? 'text-gray-400' : 'text-gray-600'}`, children: node.count }))] }, node.id));
                }) }), empty && (_jsx("p", { className: "px-3 py-1.5 text-gray-400", children: loading ? t.repoTreeLoading : t.repoTreeEmpty }))] }));
};
