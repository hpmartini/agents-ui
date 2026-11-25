import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  CHOICE_PILL_MAX,
  CHOICE_SEARCH_THRESHOLD,
  Choice,
  choiceMode,
  type ChoiceOption,
  type ChoiceProps,
} from '../components/Choice';

afterEach(cleanup);

const opts = (...labels: string[]): ChoiceOption[] =>
  labels.map((label) => ({ value: label.toLowerCase(), label }));

/** Controlled host: keeps the value like a real caller and reports every change */
function Host(
  props: Omit<ChoiceProps, 'value' | 'onChange'> & { initial: string; spy?: (v: string) => void }
) {
  const { initial, spy, ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <>
      <button>before</button>
      <Choice
        {...rest}
        value={value}
        onChange={(v) => {
          setValue(v);
          spy?.(v);
        }}
      />
    </>
  );
}

describe('choiceMode', () => {
  it('uses pills up to 3, a menu up to 7, a searchable menu above', () => {
    expect(CHOICE_PILL_MAX).toBe(3);
    expect(CHOICE_SEARCH_THRESHOLD).toBe(7);
    expect(choiceMode(1)).toBe('pills');
    expect(choiceMode(3)).toBe('pills');
    expect(choiceMode(4)).toBe('menu');
    expect(choiceMode(7)).toBe('menu');
    expect(choiceMode(8)).toBe('search');
  });

  it('renders the mode of the option count and switches when the count crosses a threshold', () => {
    const { rerender } = render(
      <Choice label="Pick" value="b" onChange={() => {}} options={opts('A', 'B', 'C')} />
    );
    expect(screen.getByRole('radiogroup', { name: 'Pick' })).toBeInTheDocument();
    rerender(
      <Choice label="Pick" value="b" onChange={() => {}} options={opts('A', 'B', 'C', 'D')} />
    );
    expect(screen.queryByRole('radiogroup')).toBeNull();
    const trigger = screen.getByRole('button', { name: /^Pick/ });
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveTextContent('B');
  });
});

describe('Choice pills', () => {
  it('is a radiogroup with a roving tab stop; arrows move and select, wrapping', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Host label="Density" initial="b" options={opts('A', 'B', 'C')} spy={spy} />);
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
    await user.click(screen.getByText('before'));
    await user.tab();
    expect(document.activeElement).toBe(radios[1]);
    await user.keyboard('{ArrowRight}');
    expect(spy).toHaveBeenLastCalledWith('c');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'C' }));
    await user.keyboard('{ArrowDown}');
    expect(spy).toHaveBeenLastCalledWith('a');
    await user.keyboard('{ArrowLeft}');
    expect(spy).toHaveBeenLastCalledWith('c');
    await user.keyboard('{Home}');
    expect(spy).toHaveBeenLastCalledWith('a');
    await user.keyboard('{End}');
    expect(spy).toHaveBeenLastCalledWith('c');
    await user.click(screen.getByRole('radio', { name: 'B' }));
    expect(spy).toHaveBeenLastCalledWith('b');
  });

  it('skips disabled pills', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    const options = opts('A', 'B', 'C');
    options[1].disabled = true;
    render(<Host label="P" initial="a" options={options} spy={spy} />);
    screen.getByRole('radio', { name: 'A' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(spy).toHaveBeenLastCalledWith('c');
  });

  it('a disabled selected pill leaves the tab stop on the first enabled pill', async () => {
    const user = userEvent.setup();
    const options = opts('A', 'B', 'C');
    options[0].disabled = true;
    render(<Host label="P" initial="a" options={options} />);
    await user.click(screen.getByRole('button', { name: 'before' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'B' }));
  });
});

describe('Choice menu', () => {
  const five = opts('Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon');

  it('opens a listbox, arrows move the active option, Enter selects and closes', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Host label="Greek" initial="beta" options={five} spy={spy} />);
    const trigger = screen.getByRole('button', { name: /^Greek/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    trigger.focus();
    await user.keyboard('{Enter}');
    const list = screen.getByRole('listbox', { name: 'Greek' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true');
    // active starts on the selected option
    expect(list.getAttribute('aria-activedescendant')).toBe(
      screen.getByRole('option', { name: 'Beta' }).id
    );
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(list.getAttribute('aria-activedescendant')).toBe(
      screen.getByRole('option', { name: 'Delta' }).id
    );
    await user.keyboard('{End}');
    expect(list.getAttribute('aria-activedescendant')).toBe(
      screen.getByRole('option', { name: 'Epsilon' }).id
    );
    await user.keyboard('{Home}{Enter}');
    expect(spy).toHaveBeenLastCalledWith('alpha');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger).toHaveTextContent('Alpha');
  });

  it('Escape closes without picking and returns focus to the trigger; a parent never sees it', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    const parentKey = vi.fn();
    render(
      <div onKeyDown={(e) => e.key === 'Escape' && parentKey()}>
        <Host label="Greek" initial="beta" options={five} spy={spy} />
      </div>
    );
    const trigger = screen.getByRole('button', { name: /^Greek/ });
    await user.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    expect(parentKey).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it('typeahead by first letter, clicks pick, outside click closes', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Host label="Greek" initial="alpha" options={five} spy={spy} />);
    await user.click(screen.getByRole('button', { name: /^Greek/ }));
    await user.keyboard('g');
    const list = screen.getByRole('listbox');
    expect(list.getAttribute('aria-activedescendant')).toBe(
      screen.getByRole('option', { name: 'Gamma' }).id
    );
    await user.click(screen.getByText('before'));
    expect(screen.queryByRole('listbox')).toBeNull();
    await user.click(screen.getByRole('button', { name: /^Greek/ }));
    await user.click(screen.getByRole('option', { name: 'Delta' }));
    expect(spy).toHaveBeenLastCalledWith('delta');
  });

  it('skips disabled options with the arrows and does not pick them', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    const options = five.map((o) => (o.value === 'beta' ? { ...o, disabled: true } : o));
    render(<Host label="Greek" initial="alpha" options={options} spy={spy} />);
    await user.click(screen.getByRole('button', { name: /^Greek/ }));
    expect(screen.getByRole('option', { name: 'Beta' })).toHaveAttribute('aria-disabled', 'true');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(spy).toHaveBeenLastCalledWith('gamma');
  });

  it('renders group headers that are not options', async () => {
    const user = userEvent.setup();
    const options: ChoiceOption[] = [
      { value: 'a', label: 'Apple', group: 'Fruit' },
      { value: 'b', label: 'Banana', group: 'Fruit' },
      { value: 'c', label: 'Carrot', group: 'Vegetable' },
      { value: 'd', label: 'Dill', group: 'Vegetable' },
    ];
    render(<Host label="Food" initial="a" options={options} />);
    await user.click(screen.getByRole('button', { name: /^Food/ }));
    const groups = screen.getAllByRole('group');
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(['Fruit', 'Vegetable']);
    expect(
      within(groups[1])
        .getAllByRole('option')
        .map((o) => o.textContent)
    ).toEqual(['Carrot', 'Dill']);
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('Tab closes the menu', async () => {
    const user = userEvent.setup();
    render(<Host label="Greek" initial="alpha" options={five} />);
    await user.click(screen.getByRole('button', { name: /^Greek/ }));
    await user.tab();
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('Choice search', () => {
  const many = opts('Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta');

  it('focuses the search field on open, filters case-insensitively and highlights the match', async () => {
    const user = userEvent.setup();
    render(<Host label="Greek" initial="alpha" options={many} />);
    await user.click(screen.getByRole('button', { name: /^Greek/ }));
    const input = screen.getByRole('combobox', { name: /Search/ });
    expect(document.activeElement).toBe(input);
    await user.keyboard('ETA');
    const names = screen.getAllByRole('option').map((o) => o.textContent);
    expect(names).toEqual(['Beta', 'Zeta', 'Eta', 'Theta']);
    const marks = screen.getAllByRole('option')[0].querySelectorAll('mark');
    expect([...marks].map((m) => m.textContent)).toEqual(['eta']);
  });

  it('arrows and Enter work from the search field; Enter picks the first match', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Host label="Greek" initial="alpha" options={many} spy={spy} />);
    const trigger = screen.getByRole('button', { name: /^Greek/ });
    await user.click(trigger);
    await user.keyboard('eta{Enter}');
    expect(spy).toHaveBeenLastCalledWith('beta');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    await user.click(trigger);
    await user.keyboard('eta{ArrowDown}{ArrowDown}{Enter}');
    expect(spy).toHaveBeenLastCalledWith('eta');
  });

  it('shows "No results" and Enter does nothing; Escape closes', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Host label="Greek" initial="alpha" options={many} spy={spy} />);
    const trigger = screen.getByRole('button', { name: /^Greek/ });
    await user.click(trigger);
    await user.keyboard('xyz');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('No results')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(spy).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps only group headers with matches', async () => {
    const user = userEvent.setup();
    const options: ChoiceOption[] = 'abcdefgh'.split('').map((c, i) => ({
      value: c,
      label: `${i < 4 ? 'fruit' : 'veg'}-${c}`,
      group: i < 4 ? 'Fruit' : 'Vegetable',
    }));
    render(<Host label="Food" initial="a" options={options} />);
    await user.click(screen.getByRole('button', { name: /^Food/ }));
    await user.keyboard('veg');
    expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual([
      'Vegetable',
    ]);
  });

  it('mode forces a rendering regardless of the count', () => {
    render(
      <Choice label="X" mode="search" value="a" onChange={() => {}} options={opts('A', 'B')} />
    );
    expect(screen.getByRole('button', { name: /^X/ })).toHaveAttribute('aria-haspopup', 'listbox');
  });
});

describe('Choice hardening', () => {
  const five = opts('Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon');
  const many = opts('Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta');
  const activeOf = (el: HTMLElement) => el.getAttribute('aria-activedescendant');

  it('closes an open menu when disabled turns true; keys no longer pick', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    const { rerender } = render(<Host label="Greek" initial="alpha" options={five} spy={spy} />);
    await user.click(screen.getByRole('button', { name: /^Greek/ }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    rerender(<Host label="Greek" initial="alpha" options={five} spy={spy} disabled />);
    expect(screen.queryByRole('listbox')).toBeNull();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(spy).not.toHaveBeenCalled();
  });

  it('clearing a query with no results puts the active option back on the selected one', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Host label="Greek" initial="alpha" options={many} spy={spy} />);
    await user.click(screen.getByRole('button', { name: /^Greek/ }));
    const input = screen.getByRole('combobox', { name: /Search/ });
    await user.keyboard('xyz');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    await user.keyboard('{Backspace}{Backspace}{Backspace}');
    expect(activeOf(input)).toBe(screen.getByRole('option', { name: 'Alpha' }).id);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(spy).toHaveBeenLastCalledWith('beta');
  });

  it('options changing under an open menu keep a valid active option', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Host label="Greek" initial="alpha" options={five} />);
    await user.click(screen.getByRole('button', { name: /^Greek/ }));
    await user.keyboard('{End}');
    rerender(<Host label="Greek" initial="alpha" options={five.slice(0, 4)} />);
    expect(activeOf(screen.getByRole('listbox'))).toBe(
      screen.getByRole('option', { name: 'Alpha' }).id
    );
  });

  it('keeps focus in the Choice when the option count switches pills <-> menu', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Host label="P" initial="b" options={opts('A', 'B', 'C')} />);
    await user.click(screen.getByRole('radio', { name: 'B' }));
    rerender(<Host label="P" initial="b" options={opts('A', 'B', 'C', 'D')} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /^P/ }));
    rerender(<Host label="P" initial="b" options={opts('A', 'B', 'C')} />);
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'B' }));
  });

  it('does not take focus on a mode switch when focus was elsewhere', () => {
    const { rerender } = render(<Host label="P" initial="b" options={opts('A', 'B', 'C')} />);
    screen.getByRole('button', { name: 'before' }).focus();
    rerender(<Host label="P" initial="b" options={opts('A', 'B', 'C', 'D')} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'before' }));
  });

  it('invalid sets aria-invalid and the error border on the pill group and the trigger', () => {
    const { rerender } = render(
      <Choice label="P" value="x" onChange={() => {}} options={opts('A', 'B')} invalid />
    );
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-invalid', 'true');
    for (const r of screen.getAllByRole('radio')) expect(r.className).toContain('border-red-400');
    rerender(<Choice label="P" value="x" onChange={() => {}} options={five} invalid />);
    const trigger = screen.getByRole('button', { name: /^P/ });
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger.className).toContain('border-red-400');
    rerender(<Choice label="P" value="x" onChange={() => {}} options={five} />);
    expect(screen.getByRole('button', { name: /^P/ })).not.toHaveAttribute('aria-invalid');
  });

  it('labelledBy names the radiogroup, the trigger and the listbox', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <>
        <span id="row">Row label</span>
        <Choice label="P" labelledBy="row" value="a" onChange={() => {}} options={opts('A', 'B')} />
      </>
    );
    expect(screen.getByRole('radiogroup', { name: 'Row label' })).toBeInTheDocument();
    rerender(
      <>
        <span id="row">Row label</span>
        <Choice label="P" labelledBy="row" value="alpha" onChange={() => {}} options={five} />
      </>
    );
    await user.click(screen.getByRole('button', { name: /^Row label/ }));
    expect(screen.getByRole('listbox', { name: 'Row label' })).toBeInTheDocument();
  });

  it('a <label htmlFor={id}> reaches the checked pill and the menu trigger', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    const { rerender } = render(
      <>
        <label htmlFor="c1">Row</label>
        <Host label="P" id="c1" initial="b" options={opts('A', 'B', 'C')} spy={spy} />
      </>
    );
    const pill = document.getElementById('c1');
    expect(pill).toBe(screen.getByRole('radio', { name: 'B' }));
    await user.click(screen.getByText('Row'));
    expect(document.activeElement).toBe(pill);
    expect(spy).not.toHaveBeenCalled();
    rerender(
      <>
        <label htmlFor="c1">Row</label>
        <Host label="P" id="c1" initial="b" options={five} spy={spy} />
      </>
    );
    const trigger = screen.getByRole('button', { name: /^P/ });
    expect(document.getElementById('c1')).toBe(trigger);
    await user.click(screen.getByText('Row'));
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
