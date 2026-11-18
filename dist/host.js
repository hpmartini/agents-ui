import { jsx as _jsx } from "react/jsx-runtime";
/**
 * What the agents view needs from the app around it, besides the transport: notifications,
 * navigation to the host's other pages, its command palette, its board, its built-in browser and
 * terminal look. Everything but `toast` is optional; a missing callback hides what needs it.
 * Nothing in the package imports a router, a toast library or Electron globals.
 */
import { createContext, useContext, useMemo } from 'react';
const AgentsContext = createContext(null);
export const AgentsProvider = ({ transport, host, children, }) => {
    const value = useMemo(() => ({ transport, host }), [transport, host]);
    return _jsx(AgentsContext.Provider, { value: value, children: children });
};
function useAgentsContext() {
    const value = useContext(AgentsContext);
    if (!value)
        throw new Error('agents-ui: render inside <AgentsProvider> (no transport)');
    return value;
}
export const useTransport = () => useAgentsContext().transport;
export const useHost = () => useAgentsContext().host;
