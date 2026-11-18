import { jsx as _jsx } from "react/jsx-runtime";
/**
 * What the agents view needs from the app around it, besides the transport: notifications,
 * navigation to the host's other pages, its command palette, its board, its built-in browser and
 * terminal look. Everything but `toast` is optional; a missing callback hides what needs it.
 * Nothing in the package imports a router, a toast library or Electron globals.
 */
import { createContext, useContext, useMemo } from 'react';
import { LabelsContext, resolveLabels } from './labels';
const AgentsContext = createContext(null);
/**
 * Transport, host and texts for every agents-ui component below. `locale` (default `'en'`,
 * Orkumo's wording) and `labels` (single texts replaced) apply below; without both, an outer
 * provider's texts stay.
 */
export const AgentsProvider = ({ transport, host, locale, labels, children, }) => {
    const value = useMemo(() => ({ transport, host }), [transport, host]);
    const texts = useMemo(() => (locale || labels ? resolveLabels(locale, labels) : null), [locale, labels]);
    const tree = _jsx(AgentsContext.Provider, { value: value, children: children });
    return texts ? _jsx(LabelsContext.Provider, { value: texts, children: tree }) : tree;
};
function useAgentsContext() {
    const value = useContext(AgentsContext);
    if (!value)
        throw new Error('agents-ui: render inside <AgentsProvider> (no transport)');
    return value;
}
export const useTransport = () => useAgentsContext().transport;
export const useHost = () => useAgentsContext().host;
