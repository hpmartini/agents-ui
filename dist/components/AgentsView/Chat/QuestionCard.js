import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Check, MessageCircleQuestion, ShieldAlert } from 'lucide-react';
const optionBtn = 'w-full rounded border border-amber-400/30 bg-gray-900 px-2 py-1.5 text-left text-xs text-gray-100 transition-colors hover:bg-amber-500/20 hover:border-amber-400/60 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50 disabled:hover:bg-gray-900';
const field = 'min-w-0 flex-1 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-xs text-gray-100 placeholder-gray-500 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50';
const sendBtn = 'shrink-0 rounded border border-amber-400/40 bg-gray-900 px-2 py-1 text-xs text-gray-100 hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50';
/** One free-text line (free answer, reason for a denial), sent with Enter or its button */
function TextAnswer({ label, button, disabled, onSend, }) {
    const [text, setText] = useState('');
    const send = () => {
        if (!text.trim() || disabled)
            return;
        onSend(text);
        setText('');
    };
    return (_jsxs("div", { className: "flex gap-1.5", children: [_jsx("input", { "aria-label": label, placeholder: label, value: text, disabled: disabled, onChange: (e) => setText(e.target.value), onKeyDown: (e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        send();
                    }
                }, className: field }), _jsx("button", { type: "button", disabled: disabled || !text.trim(), onClick: send, className: sendBtn, children: button })] }));
}
/**
 * A question or permission the agent waits on, as a card: the dialog's step on its screen,
 * structured, answered with clicks that the chat pane turns into the TUI's keys
 */
export function QuestionCard({ dialog, onAnswer, sent = false, disabled = false, }) {
    const off = disabled || sent;
    const pick = (row) => !off && onAnswer({ type: 'pick', row });
    const permission = dialog.kind === 'permission';
    const Icon = permission ? ShieldAlert : MessageCircleQuestion;
    const rows = dialog.options.map((option, row) => ({ option, row }));
    const choices = rows.filter(({ option }) => option.role === 'option' || option.role === 'deny');
    const other = rows.find(({ option }) => option.role === 'other');
    const deny = rows.find(({ option }) => option.role === 'deny');
    const submit = rows.find(({ option }) => option.role === 'submit');
    return (_jsxs("div", { role: "group", "aria-label": permission ? 'Permission request' : 'Agent question', className: "mb-2 rounded-md border border-amber-400/40 bg-amber-500/10 p-2 text-xs", children: [_jsxs("div", { className: "flex items-center gap-1.5 font-medium text-amber-200", children: [_jsx(Icon, { className: "h-3.5 w-3.5 shrink-0", "aria-hidden": true }), _jsx("span", { className: "min-w-0 truncate", children: permission ? dialog.title || 'Permission' : 'The agent is asking' }), sent && (_jsxs("span", { className: "ml-auto flex shrink-0 items-center gap-1 font-normal text-emerald-300", children: [_jsx(Check, { className: "h-3 w-3", "aria-hidden": true }), "Answer sent"] }))] }), dialog.tabs.length > 1 && (_jsx("div", { className: "mt-1.5 flex flex-wrap gap-1", children: dialog.tabs.map((tab) => (_jsx("span", { "data-done": tab.done, className: `rounded-full border px-1.5 py-0.5 text-[11px] ${tab.done ? 'border-emerald-400/40 text-emerald-300' : 'border-gray-600 text-gray-400'}`, children: tab.label }, tab.label))) })), dialog.detail && (_jsx("pre", { className: "mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-gray-950/60 p-1.5 font-mono text-[11px] text-gray-200", children: dialog.detail })), dialog.question && _jsx("div", { className: "mt-1.5 text-sm text-gray-100", children: dialog.question }), _jsx("div", { className: "mt-2 flex flex-col gap-1", children: choices.map(({ option, row }) => option.checked !== undefined ? (_jsxs("button", { type: "button", role: "checkbox", "aria-checked": option.checked, disabled: off, onClick: () => pick(row), className: `${optionBtn} flex items-start gap-2`, children: [_jsx("span", { "aria-hidden": true, className: `mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ${option.checked ? 'border-amber-300 bg-amber-400/30' : 'border-gray-500'}`, children: option.checked && _jsx(Check, { className: "h-3 w-3 text-amber-100" }) }), _jsx(OptionText, { label: option.label, description: option.description })] }, row)) : (_jsx("button", { type: "button", "aria-pressed": option.selected || undefined, disabled: off, onClick: () => pick(row), className: `${optionBtn} ${option.selected ? 'border-amber-300 bg-amber-500/20' : ''}`, children: _jsx(OptionText, { label: option.label, description: option.description }) }, row))) }), other && (_jsxs("div", { className: "mt-1.5", children: [other.option.description && (_jsxs("div", { className: "mb-1 text-gray-400", children: ["Typed: ", other.option.description] })), _jsx(TextAnswer, { label: "Other answer", button: "Send", disabled: off, onSend: (text) => onAnswer({ type: 'text', row: other.row, text }) })] })), deny && (_jsx("div", { className: "mt-1.5", children: _jsx(TextAnswer, { label: "Reason", button: "No, with reason", disabled: off, onSend: (text) => onAnswer({ type: 'text', row: deny.row, text }) }) })), submit && (_jsx("button", { type: "button", disabled: off, onClick: () => pick(submit.row), className: `${sendBtn} mt-2 bg-amber-500/20`, children: "Submit" }))] }));
}
function OptionText({ label, description }) {
    return (_jsxs("span", { className: "min-w-0", children: [_jsx("span", { className: "block", children: label }), description && _jsx("span", { className: "block text-[11px] text-gray-400", children: description })] }));
}
