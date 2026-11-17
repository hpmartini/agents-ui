import type { AgentDisplayState, AgentsTransport } from './transport';
/** Glyph per state, as in Orkumo's `stateGlyph`; colours are theme tokens */
export declare function stateGlyph(state: AgentDisplayState): {
    glyph: string;
    className: string;
    animate: boolean;
    label: string;
};
/** States in which an agent still runs and can be stopped */
export declare const isRunning: (state: AgentDisplayState) => state is "working" | "waiting" | "needs-input" | "idle" | "loop" | "interactive";
export declare const TransportContext: import("react").Context<AgentsTransport | null>;
export declare function useTransport(): AgentsTransport;
