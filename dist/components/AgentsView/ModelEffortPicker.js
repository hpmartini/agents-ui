import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Gauge } from 'lucide-react';
import { useTransport } from '../../host';
import { useLabels } from '../../labels';
import { MODEL_SUGGESTIONS } from '../../utils/agentSessions';
import { effortColumns, isCurrentModel, matrixRows, pickLabel, } from '../../utils/modelMatrix';
import { usePopover } from './PullRequestsPanel';
/**
 * Model × effort matrix (rows: models, columns: effort levels the CLI names). A cell picks
 * both; "default" keeps what the CLI picks itself. The filter also takes any model name: Enter
 * uses it as typed.
 */
export const ModelEffortPicker = ({ harness, model, effort, onPick, defaultModel = null, disabled, placement = 'down', title, keepLabel = 'default', currentModel = null, currentEffort = null, }) => {
    const [open, setOpen] = useState(false);
    const t = useLabels().panels;
    const current = [currentModel, currentEffort].filter(Boolean).join(' · ');
    return (_jsxs("div", { className: "relative", children: [_jsxs("button", { type: "button", "data-popover-trigger": true, "aria-expanded": open, "aria-haspopup": "dialog", disabled: disabled, onClick: () => setOpen((o) => !o), title: title ?? t.modelEffort, className: "flex items-center gap-1.5 max-w-[16rem] bg-gray-900 border border-gray-600 rounded-md px-1.5 py-1 text-xs text-gray-50 font-mono hover:border-gray-400 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50", children: [_jsx(Gauge, { size: 12, "aria-hidden": true, className: "shrink-0 text-gray-400" }), _jsx("span", { className: "truncate", children: model || effort || keepLabel === 'default'
                            ? pickLabel(model, effort, defaultModel, t)
                            : current || t.modelEffortEmpty }), _jsx(ChevronDown, { size: 12, "aria-hidden": true, className: "shrink-0 text-gray-400" })] }), open && (_jsx(Matrix, { harness: harness, model: model, effort: effort, placement: placement, keepLabel: keepLabel, currentModel: currentModel, currentEffort: currentEffort, onClose: () => setOpen(false), onPick: (m, e) => {
                    onPick(m, e);
                    setOpen(false);
                } }))] }));
};
const Matrix = ({ harness, model, effort, placement, keepLabel, currentModel, currentEffort, onClose, onPick, }) => {
    const ref = usePopover(onClose, true);
    const t = useLabels().panels;
    const keepWord = t.keepWord(keepLabel);
    const [models, setModels] = useState(null);
    const [failed, setFailed] = useState(false);
    const [filter, setFilter] = useState('');
    const fetchHarnessModels = useTransport().discovery?.fetchHarnessModels;
    // Without the transport's `discovery` group: the suggested models, no effort columns
    useEffect(() => {
        if (!fetchHarnessModels) {
            setModels([]);
            return;
        }
        let cancelled = false;
        fetchHarnessModels(harness)
            .then((list) => !cancelled && setModels(list))
            .catch(() => !cancelled && (setModels([]), setFailed(true)));
        return () => {
            cancelled = true;
        };
    }, [harness, fetchHarnessModels]);
    const columns = useMemo(() => effortColumns(models ?? []), [models]);
    const rows = useMemo(() => matrixRows(models ?? [], MODEL_SUGGESTIONS[harness], filter), [models, harness, filter]);
    const typed = filter.trim();
    // The model row the session runs in; without one ('' row) the effort alone marks "current"
    const currentRow = rows.find((m) => isCurrentModel(m.id, currentModel))?.id ?? '';
    const cell = (id, level, available, label) => {
        const selected = model === id && effort === level;
        const isCurrent = !selected && !!currentEffort && id === currentRow && level === currentEffort;
        return (_jsx("td", { className: "p-0.5 text-center", children: available && (_jsx("button", { type: "button", onClick: () => onPick(id, level), "aria-pressed": selected, "aria-label": `${label} · ${level || t.modelCellEffort(keepWord)}${isCurrent ? t.modelInUse : ''}`, title: `${label} · ${level || t.modelCellEffort(keepWord)}${isCurrent ? t.modelInUseNow : ''}`, className: `h-6 w-full min-w-[2.5rem] rounded text-[11px] focus-visible:outline-2 focus-visible:outline-blue-400 ${selected
                    ? 'bg-blue-600 text-white'
                    : isCurrent
                        ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-inset ring-emerald-400/70 hover:bg-blue-500/30'
                        : 'bg-gray-800/70 text-gray-400 hover:bg-blue-500/30 hover:text-white'}`, children: selected || isCurrent ? '●' : '·' })) }, level));
    };
    return (_jsxs("div", { ref: ref, tabIndex: -1, role: "dialog", "aria-label": t.modelEffort, className: `absolute z-50 ${placement === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 w-[min(40rem,calc(100vw-2rem))] rounded-lg border border-gray-600 bg-gray-900 shadow-2xl outline-none`, children: [_jsx("div", { className: "p-2 border-b border-gray-700", children: _jsx("input", { autoFocus: true, value: filter, onChange: (e) => setFilter(e.target.value), onKeyDown: (e) => {
                        if (e.key !== 'Enter' || !typed)
                            return;
                        e.preventDefault();
                        // One match: that model; otherwise the name as typed (any model the CLI knows)
                        onPick(rows.length === 1 ? rows[0].id : typed, effort);
                    }, placeholder: t.modelFilter, "aria-label": t.modelFilterLabel, spellCheck: false, className: "w-full bg-gray-950 border border-gray-600 rounded-md px-2 py-1 text-xs text-gray-50 placeholder-gray-500 font-mono outline-none focus:border-blue-400" }) }), _jsxs("div", { className: "max-h-[min(60vh,28rem)] overflow-auto", children: [models === null ? (_jsx("p", { className: "p-3 text-xs text-gray-400", children: t.modelLoading })) : (_jsxs("table", { className: "w-full border-collapse text-xs", children: [_jsx("thead", { className: "sticky top-0 bg-gray-900", children: _jsxs("tr", { children: [_jsx("th", { className: "px-2 py-1 text-left font-normal text-gray-500", children: t.modelHeader }), _jsx("th", { className: "px-1 py-1 font-normal text-gray-500", children: keepWord }), columns.map((c) => (_jsx("th", { className: "px-1 py-1 font-normal text-gray-300", children: c }, c)))] }) }), _jsxs("tbody", { children: [!typed && (_jsxs("tr", { className: "border-t border-gray-800", children: [_jsx("td", { className: "px-2 py-1 text-gray-300 italic", children: keepWord }), keepLabel === 'default' && cell('', '', true, t.modelDefault), keepLabel !== 'default' && _jsx("td", {}), columns.map((c) => cell('', c, true, t.modelKeepModel(keepWord)))] })), rows.map((m, i) => (_jsxs(React.Fragment, { children: [m.group && m.group !== rows[i - 1]?.group && (_jsx("tr", { children: _jsx("td", { colSpan: columns.length + 2, className: "px-2 pt-2 pb-0.5 text-[10px] uppercase tracking-wide text-gray-500", children: m.group }) })), _jsxs("tr", { className: "border-t border-gray-800", children: [_jsx("td", { className: `px-2 py-1 font-mono break-all ${m.id === currentRow ? 'text-emerald-200' : 'text-gray-100'}`, title: m.id === currentRow ? t.modelRowInUse(m.id, currentModel ?? '') : m.id, children: m.label }), cell(m.id, '', true, m.label), columns.map((c) => cell(m.id, c, m.efforts.includes(c), m.label))] })] }, m.id)))] })] })), models !== null && rows.length === 0 && (_jsxs("p", { className: "p-3 text-xs text-gray-400", children: [typed ? t.modelNoMatch(typed) : null, failed && !typed ? t.modelNotListed : null] }))] })] }));
};
