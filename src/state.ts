import { createContext, useContext } from 'react';
import type { AgentDisplayState, AgentsTransport } from './transport';

/** Glyph per state, as in Orkumo's `stateGlyph`; colours are theme tokens */
export function stateGlyph(state: AgentDisplayState): {
  glyph: string;
  className: string;
  animate: boolean;
  label: string;
} {
  switch (state) {
    case 'working':
      return { glyph: '✽', className: 'text-ag-working', animate: true, label: 'Working' };
    case 'needs-input':
      return { glyph: '✻', className: 'text-ag-warn', animate: false, label: 'Needs input' };
    case 'waiting':
      return {
        glyph: '◷',
        className: 'text-ag-accent',
        animate: false,
        label: 'Waiting on background task',
      };
    case 'idle':
      return { glyph: '∙', className: 'text-ag-faint', animate: false, label: 'Idle' };
    case 'completed':
      return { glyph: '✻', className: 'text-ag-ok', animate: false, label: 'Completed' };
    case 'failed':
      return { glyph: '✻', className: 'text-ag-danger', animate: false, label: 'Failed' };
    case 'stopped':
      return { glyph: '✻', className: 'text-ag-faint', animate: false, label: 'Stopped' };
    case 'loop':
      return { glyph: '✢', className: 'text-ag-accent', animate: false, label: 'Loop (sleeping)' };
    case 'interactive':
      return { glyph: '▪', className: 'text-ag-accent', animate: false, label: 'Interactive' };
    default:
      return { glyph: '∙', className: 'text-ag-faint', animate: false, label: 'Unknown' };
  }
}

/** States in which an agent still runs and can be stopped */
export const isRunning = (state: AgentDisplayState) =>
  state !== 'stopped' && state !== 'completed' && state !== 'failed';

export const TransportContext = createContext<AgentsTransport | null>(null);

export function useTransport(): AgentsTransport {
  const transport = useContext(TransportContext);
  if (!transport) throw new Error('agents-ui: render inside <AgentsPanel> (no transport)');
  return transport;
}
