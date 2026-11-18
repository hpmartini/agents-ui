import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithAgents } from './agents';
import { ShortcutsHelp } from '../components/AgentsView/ShortcutsHelp';
import { CloudSessionBar } from '../components/AgentsView/CloudSessionBar';
import { panelsDe, panelsEn } from '../labels/panels';

describe('panels labels', () => {
  it('render German with locale="de"', () => {
    renderWithAgents(
      <>
        <ShortcutsHelp open onClose={vi.fn()} />
        <CloudSessionBar onOpen={vi.fn(async () => {})} />
      </>,
      { locale: 'de' }
    );
    expect(screen.getByText('Tastenkürzel der Agent-Ansicht')).toBeInTheDocument();
    expect(screen.getByText('Verwalten')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Cloud-Session-ID oder claude.ai/code-URL')
    ).toBeInTheDocument();
    expect(screen.queryByText('Agent view shortcuts')).not.toBeInTheDocument();
  });

  it('German shortcut table has every row of the English one', () => {
    expect(panelsDe.shortcutSections.map((s) => s.rows.length)).toEqual(
      panelsEn.shortcutSections.map((s) => s.rows.length)
    );
  });
});
