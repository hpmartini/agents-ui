import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FoldButtons, GroupingPicker } from '../components/AgentsView/ProjectsRail';
import type { AgentGrouping } from '../types';

const renderPicker = (grouping: AgentGrouping = 'project') => {
  const onGrouping = vi.fn();
  render(<GroupingPicker grouping={grouping} onGrouping={onGrouping} />);
  return { onGrouping, trigger: screen.getByRole('button', { name: /^Group agents by/ }) };
};

afterEach(cleanup);

describe('GroupingPicker', () => {
  it('shows the current grouping, opens on click with all four, picks one', async () => {
    const user = userEvent.setup();
    const { trigger, onGrouping } = renderPicker('state');
    expect(trigger).toHaveTextContent('Status');
    expect(screen.queryByRole('listbox')).toBeNull();
    await user.click(trigger);
    const list = screen.getByRole('listbox', { name: 'Group agents by' });
    expect(within(list).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Project',
      'Status',
      'Directory',
      'None',
    ]);
    expect(within(list).getByRole('option', { selected: true })).toHaveTextContent('Status');
    await user.click(within(list).getByRole('option', { name: 'Directory' }));
    expect(onGrouping).toHaveBeenCalledWith('directory');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('is a Choice menu with the layers icon; hovering does not open it', async () => {
    const user = userEvent.setup();
    const { trigger } = renderPicker();
    expect(trigger.closest('[data-choice="menu"]')).not.toBeNull();
    expect(trigger.querySelector('svg.lucide-layers')).not.toBeNull();
    expect(trigger).toHaveAttribute('title', 'Group agents by (Ctrl+S)');
    await user.hover(trigger);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('a stale stored grouping shows the placeholder and still lets Project be picked', async () => {
    const user = userEvent.setup();
    const { trigger, onGrouping } = renderPicker('bogus' as AgentGrouping);
    expect(trigger).toHaveTextContent('Project');
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: 'Project' }));
    expect(onGrouping).toHaveBeenCalledWith('project');
  });

  it('opens from the keyboard, Escape closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const { trigger, onGrouping } = renderPicker();
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onGrouping).toHaveBeenCalledWith('state');
  });
});

describe('FoldButtons', () => {
  const renderButtons = (props: Partial<React.ComponentProps<typeof FoldButtons>> = {}) => {
    const handlers = { onGroups: vi.fn(), onCards: vi.fn() };
    render(<FoldButtons groupsCollapsed={false} cardsExpanded={false} {...handlers} {...props} />);
    return handlers;
  };

  it('collapses groups while one is open and expands them once all are collapsed', async () => {
    const user = userEvent.setup();
    const { onGroups } = renderButtons();
    await user.click(screen.getByRole('button', { name: 'Collapse all groups' }));
    expect(onGroups).toHaveBeenLastCalledWith(true);
    cleanup();
    const collapsed = renderButtons({ groupsCollapsed: true });
    await user.click(screen.getByRole('button', { name: 'Expand all groups' }));
    expect(collapsed.onGroups).toHaveBeenLastCalledWith(false);
  });

  it('expands all agent cards while none is open and collapses them once one is', async () => {
    const user = userEvent.setup();
    const { onCards } = renderButtons();
    await user.click(screen.getByRole('button', { name: 'Expand all agent cards' }));
    expect(onCards).toHaveBeenLastCalledWith(true);
    cleanup();
    const open = renderButtons({ cardsExpanded: true });
    await user.click(screen.getByRole('button', { name: 'Collapse all agent cards' }));
    expect(open.onCards).toHaveBeenLastCalledWith(false);
  });

  it('disables folding groups with an explaining tooltip while a filter is active', () => {
    renderButtons({ groupsDisabled: true });
    const groups = screen.getByRole('button', { name: 'Collapse all groups' });
    expect(groups).toBeDisabled();
    expect(groups).toHaveAttribute('title', 'Clear the filters to fold groups');
    expect(screen.getByRole('button', { name: 'Expand all agent cards' })).toBeEnabled();
  });
});
