import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QuestionCard } from '../components/AgentsView/Chat/QuestionCard';
import { parseAgentDialog, type AgentDialog } from '../utils/agentDialog';

const dialog = (name: string, activeTab?: string): AgentDialog => {
  const text = fs.readFileSync(
    path.join(__dirname, 'fixtures', 'agentDialogs', `${name}.txt`),
    'utf8'
  );
  const d = parseAgentDialog(text, activeTab);
  if (!d) throw new Error(name);
  return d;
};

const card = (
  name: string,
  props: { sent?: boolean; disabled?: boolean } = {},
  activeTab?: string
) => {
  const onAnswer = vi.fn();
  render(<QuestionCard dialog={dialog(name, activeTab)} onAnswer={onAnswer} {...props} />);
  return onAnswer;
};

describe('QuestionCard', () => {
  it('a question: options with their description, a click answers', () => {
    const onAnswer = card('claude-question-single');
    expect(screen.getByText('Wohin deployen?')).toBeTruthy();
    expect(screen.getByText('Testumgebung')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Prod/ }));
    expect(onAnswer).toHaveBeenCalledWith({ type: 'pick', row: 1 });
  });

  it('free text instead of an option', () => {
    const onAnswer = card('claude-question-single');
    fireEvent.change(screen.getByLabelText('Other answer'), { target: { value: 'eu-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onAnswer).toHaveBeenCalledWith({ type: 'text', row: 2, text: 'eu-1' });
  });

  it('multi select: checkboxes and a submit button', () => {
    const onAnswer = card('claude-question-tabs-multi');
    const box = screen.getByRole('checkbox', { name: /Käse/ });
    expect(box.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(box);
    expect(onAnswer).toHaveBeenCalledWith({ type: 'pick', row: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onAnswer).toHaveBeenLastCalledWith({ type: 'pick', row: 3 });
    // answered tabs show as done
    expect(screen.getByRole('button', { name: 'Farbe' }).getAttribute('data-done')).toBe('true');
  });

  it('back to an answered question: tabs are buttons, its pick shows, ←/→ step', () => {
    const onAnswer = card('claude-question-tabs-back', {}, 'Form');
    const tabs = within(screen.getByRole('group', { name: 'Questions' }));
    expect(tabs.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Farbe',
      'Form',
      'Groesse',
      'Review',
    ]);
    // the step on screen is marked and not clickable
    const form = tabs.getByRole('button', { name: 'Form' });
    expect(form.getAttribute('aria-current')).toBe('step');
    expect((form as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(tabs.getByRole('button', { name: 'Farbe' }));
    expect(onAnswer).toHaveBeenLastCalledWith({ type: 'tab', tab: 0 });
    fireEvent.click(tabs.getByRole('button', { name: 'Review' }));
    expect(onAnswer).toHaveBeenLastCalledWith({ type: 'tab', tab: 3 });
    fireEvent.keyDown(form, { key: 'ArrowLeft' });
    expect(onAnswer).toHaveBeenLastCalledWith({ type: 'step', by: -1 });
    expect(screen.getByRole('button', { name: /^Blau/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('multi select before the last question: a Next button moves on', () => {
    const onAnswer = card('claude-question-tabs-multi-next', {}, 'Extras');
    expect(screen.getAllByRole('checkbox').map((b) => b.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'true',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onAnswer).toHaveBeenCalledWith({ type: 'pick', row: 4 });
  });

  it('omp: several questions in one box, each with its options', () => {
    const onAnswer = card('omp-ask-fields');
    expect(screen.getByText('Welche Formen?')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Kreis' }).getAttribute('aria-checked')).toBe(
      'true'
    );
    expect(screen.getAllByLabelText('Other answer')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: /^Gross/ }));
    expect(onAnswer).toHaveBeenCalledWith({ type: 'pick', row: 7 });
  });

  it('omp radio: the picked option shows as pressed', () => {
    const d = dialog('omp-ask-radio');
    d.options[1].selected = true;
    render(<QuestionCard dialog={d} onAnswer={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Prod' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Staging' }).getAttribute('aria-pressed')).toBe(null);
  });

  it('a permission: tool and command, allow, deny with a reason', () => {
    const onAnswer = card('claude-permission-bash');
    expect(screen.getByText('Bash command')).toBeTruthy();
    expect(screen.getByText(/echo 42 > b.txt/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(onAnswer).toHaveBeenCalledWith({ type: 'pick', row: 0 });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'use printf' } });
    fireEvent.click(screen.getByRole('button', { name: 'No, with reason' }));
    expect(onAnswer).toHaveBeenLastCalledWith({ type: 'text', row: 3, text: 'use printf' });
  });

  it('once sent: marked answered, nothing clickable until the dialog moves on', () => {
    const onAnswer = card('claude-question-single', { sent: true });
    expect(screen.getByText(/Answer sent/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Prod/ }));
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
