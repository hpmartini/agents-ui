import { jsx as _jsx } from "react/jsx-runtime";
/** Grab bar on the top edge of a prompt field; props come from useAutoGrowTextarea */
export const ResizeGrip = (props) => (_jsx("div", { ...props, className: "group absolute -top-2 left-0 right-0 z-10 flex h-3 cursor-ns-resize touch-none justify-center outline-none", children: _jsx("span", { className: "mt-1 h-1 w-10 rounded-full bg-gray-600 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-focus-visible:bg-blue-400" }) }));
