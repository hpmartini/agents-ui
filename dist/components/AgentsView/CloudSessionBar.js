import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Cloud } from 'lucide-react';
import { parseCloudTarget } from '../../utils/cloudSession';
/** Attach to a cloud session by ID/URL, or pick one with `claude --teleport`. */
export const CloudSessionBar = ({ onOpen }) => {
    const [value, setValue] = useState('');
    const [error, setError] = useState(null);
    const run = async (target) => {
        setError(null);
        try {
            await onOpen(target);
            if (target)
                setValue('');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to open session');
        }
    };
    const submit = (e) => {
        e.preventDefault();
        const parsed = parseCloudTarget(value);
        if (!parsed.ok)
            return setError(parsed.error);
        void run(value.trim());
    };
    return (_jsxs("form", { onSubmit: submit, className: "px-3 py-2 border-t border-gray-800 text-xs space-y-1.5", children: [_jsxs("div", { className: "flex gap-1.5", children: [_jsx("input", { value: value, onChange: (e) => setValue(e.target.value), placeholder: "Cloud session ID or claude.ai/code URL", className: "flex-1 min-w-0 px-2 py-1 rounded bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600" }), _jsx("button", { type: "submit", disabled: !value.trim(), className: "px-2 py-1 rounded bg-gray-800 text-gray-200 hover:bg-gray-700 disabled:opacity-40", children: "Open" }), _jsxs("button", { type: "button", onClick: () => void run(), className: "px-2 py-1 rounded bg-gray-800 text-gray-200 hover:bg-gray-700 flex items-center gap-1", title: "claude --teleport", children: [_jsx(Cloud, { size: 12 }), " Cloud-Sessions"] })] }), error && _jsx("div", { className: "text-red-400", children: error }), _jsxs("div", { className: "text-gray-500", children: ["Sessions on other machines only show up if started there with", ' ', _jsx("code", { className: "font-mono text-gray-400", children: "claude --remote-control" }), "."] })] }));
};
