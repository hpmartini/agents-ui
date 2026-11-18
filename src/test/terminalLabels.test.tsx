import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithAgents } from './agents';
import { QuestionCard } from '../components/AgentsView/Chat/QuestionCard';
import { ImageAttachments } from '../components/ImageAttachments';
import { terminalDe, terminalEn } from '../labels/terminal';
import { formatResetIn } from '../utils/usage';
import type { AgentDialog } from '../utils/agentDialog';

const dialog: AgentDialog = {
  kind: 'question',
  title: '',
  question: 'Which one?',
  detail: '',
  tabs: [],
  options: [{ label: 'Other', role: 'other', number: 2 }],
} as unknown as AgentDialog;

describe('terminal labels', () => {
  it('has a German text for every English key', () => {
    expect(Object.keys(terminalDe).sort()).toEqual(Object.keys(terminalEn).sort());
  });

  it('renders the question card and attachments in German', () => {
    renderWithAgents(
      <>
        <QuestionCard dialog={dialog} onAnswer={vi.fn()} sent />
        <ImageAttachments images={[]} onChange={vi.fn()} />
      </>,
      { locale: 'de' }
    );
    expect(screen.getByText('Der Agent fragt')).toBeTruthy();
    expect(screen.getByText('Antwort gesendet')).toBeTruthy();
    expect(screen.getByLabelText('Andere Antwort')).toBeTruthy();
    expect(screen.getByText('Bild hinzufügen')).toBeTruthy();
  });

  it('formats the reset countdown with the given labels', () => {
    expect(formatResetIn(null, 0, terminalDe)).toBe('erfolgt');
  });
});
