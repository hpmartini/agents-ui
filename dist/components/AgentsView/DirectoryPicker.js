import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { groupDirectories, samePath, shortenHome, } from '../../utils/directoryGroups';
/** Collapsed parent directories (group keys), kept across openings of the picker */
const DIRECTORY_PICKER_COLLAPSED_KEY = 'devOrbitDirectoryPickerCollapsed';
function loadCollapsed() {
    try {
        const value = JSON.parse(localStorage.getItem(DIRECTORY_PICKER_COLLAPSED_KEY) ?? '[]');
        return new Set(Array.isArray(value) ? value.filter((x) => typeof x === 'string') : []);
    }
    catch {
        return new Set();
    }
}
/** Directory picker for the dispatch target, grouped by parent directory (#158) */
export const DirectoryPicker = ({ choices, current, home, onCancel, onPick, label = 'Directory for new sessions…', allowPath = true, }) => {
    const [query, setQuery] = useState('');
    const [custom, setCustom] = useState(current || '');
    const [collapsed, setCollapsed] = useState(loadCollapsed);
    const searching = query.trim() !== '';
    const groups = useMemo(() => groupDirectories(choices, { home, current, query }), [choices, home, current, query]);
    // The pinned group has no header and never collapses; filtering shows every match
    const isOpen = (group) => !group.label || searching || !collapsed.has(group.key);
    const first = groups.find(isOpen)?.entries[0];
    const updateCollapsed = (next) => {
        setCollapsed(next);
        try {
            localStorage.setItem(DIRECTORY_PICKER_COLLAPSED_KEY, JSON.stringify([...next]));
        }
        catch {
            // stays in memory only
        }
    };
    const toggleGroup = (key) => {
        const next = new Set(collapsed);
        if (next.has(key))
            next.delete(key);
        else
            next.add(key);
        updateCollapsed(next);
    };
    const bulkActions = [
        {
            label: 'Collapse all directories',
            Icon: ChevronsDownUp,
            run: () => updateCollapsed(new Set(groups.filter((g) => g.label).map((g) => g.key))),
        },
        {
            label: 'Expand all directories',
            Icon: ChevronsUpDown,
            run: () => updateCollapsed(new Set()),
        },
    ];
    return (_jsx("div", { className: "fixed inset-0 z-[95] bg-black/60 flex items-start justify-center pt-24 p-4", onClick: onCancel, role: "dialog", "aria-modal": "true", children: _jsxs("div", { className: "w-full max-w-xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden", onClick: (e) => e.stopPropagation(), 
            // On the panel, not the search field: focus may sit on a header or entry button
            onKeyDown: (e) => {
                if (e.key === 'Escape')
                    onCancel();
            }, children: [_jsxs("div", { className: "flex items-center gap-1 px-4 py-3 border-b border-gray-800", children: [_jsx("input", { autoFocus: true, value: query, onChange: (e) => setQuery(e.target.value), onKeyDown: (e) => {
                                if (e.key === 'Enter' && first)
                                    onPick(first.path);
                            }, placeholder: label, className: "flex-1 min-w-0 bg-transparent text-sm text-gray-100 placeholder-gray-600 outline-none" }), bulkActions.map(({ label, Icon, run }) => (_jsx("button", { type: "button", onClick: run, disabled: searching, className: "shrink-0 p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-40 disabled:pointer-events-none", title: searching ? 'All matches are shown while filtering' : label, "aria-label": label, children: _jsx(Icon, { size: 14 }) }, label)))] }), _jsxs("div", { className: "max-h-[45vh] overflow-y-auto pb-1", children: [groups.map((group) => {
                            const open = isOpen(group);
                            const listId = `dir-group-${group.key}`;
                            return (_jsxs("div", { role: "group", "aria-label": group.label ?? 'Current and home', children: [group.label && (_jsxs("button", { type: "button", onClick: () => toggleGroup(group.key), disabled: searching, "aria-expanded": open, "aria-controls": listId, title: group.label, className: "sticky top-0 z-10 w-full flex items-center gap-1 px-4 pt-3 pb-1 bg-gray-900 border-t border-gray-800/70 text-[11px] font-mono text-gray-400 text-left hover:text-gray-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-default", children: [open ? (_jsx(ChevronDown, { size: 12, className: "shrink-0", "aria-hidden": true })) : (_jsx(ChevronRight, { size: 12, className: "shrink-0", "aria-hidden": true })), _jsx("span", { className: "min-w-0 flex-1 truncate", children: group.label }), _jsx("span", { className: "shrink-0 font-sans tabular-nums", children: group.entries.length })] })), _jsx("div", { id: listId, hidden: !open, children: group.entries.map((entry) => (_jsxs("button", { "data-testid": "dir-choice", title: entry.path, onClick: () => onPick(entry.path), className: `w-full text-left px-4 py-1.5 flex items-center gap-3 min-w-0 whitespace-nowrap hover:bg-gray-800 ${entry === first ? 'bg-gray-800/40' : ''} ${samePath(entry.path, current) ? 'text-blue-300' : 'text-gray-100'}`, children: [_jsx("span", { className: "text-sm truncate min-w-0", children: entry.name }), _jsx("span", { className: "text-xs text-gray-500 font-mono truncate min-w-0 flex-1 basis-0", children: group.label ? entry.detail : shortenHome(entry.path, home) }), _jsx("span", { className: "shrink-0 text-[10px] text-gray-500", children: entry.sources.join(' · ') })] }, entry.path))) })] }, group.key));
                        }), groups.length === 0 && (_jsx("div", { className: "px-4 py-4 text-sm text-gray-500", children: "No matches." }))] }), allowPath && (_jsxs("div", { className: "flex items-center gap-2 px-4 py-2 border-t border-gray-800", children: [_jsx("input", { value: custom, onChange: (e) => setCustom(e.target.value), onKeyDown: (e) => {
                                if (e.key === 'Enter' && custom.trim())
                                    onPick(custom.trim());
                            }, placeholder: "/absolute/path", className: "flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs font-mono text-gray-100 outline-none focus:border-blue-500" }), _jsx("button", { onClick: () => custom.trim() && onPick(custom.trim()), className: "px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs", children: "Use path" })] }))] }) }));
};
