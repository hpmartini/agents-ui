// BrowserPane renders the host's built-in browser (Orkumo: its BrowserPreviewPanel, whose own
// toolbar tests stay in Orkumo); the pane hands it the close action, its drag handle and maximize.
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { BrowserPane } from '../components/AgentsView/AgentWorkspace';
import type { BrowserPaneProps } from '../host';
import { renderWithAgents, testHost } from './agents';

/** Stand-in for the host's browser: one toolbar with a grip, the url field, actions and close */
const renderBrowser = vi.fn((props: BrowserPaneProps) => (
  <div role="toolbar">
    {props.dragHandleProps && <div data-testid="grip" {...props.dragHandleProps} />}
    <input aria-label="URL" defaultValue={props.url} />
    {props.actions}
    <button onClick={props.onClose} aria-label={props.closeLabel} />
  </div>
));

describe('one browser bar (#185)', () => {
  it('AC-2: BrowserPane has no own title bar; maximize and one close sit in the bar', () => {
    const onClose = vi.fn();
    const onMaximize = vi.fn();
    renderWithAgents(
      <BrowserPane
        url="https://a.test/"
        active
        onFocus={() => {}}
        onClose={onClose}
        onMaximize={onMaximize}
      />,
      { host: testHost({ renderBrowser }) }
    );
    expect(renderBrowser).toHaveBeenLastCalledWith(
      expect.objectContaining({ url: 'https://a.test/', closeLabel: 'Close browser' })
    );
    const bar = screen.getByRole('toolbar');
    expect(screen.getAllByRole('toolbar')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Close browser' })).toHaveLength(1);
    // the url shows only in the address field, not as a separate title
    expect(screen.queryByText('https://a.test/')).not.toBeInTheDocument();
    fireEvent.click(within(bar).getByRole('button', { name: 'Move browser to its own tab' }));
    expect(onMaximize).toHaveBeenCalled();
    fireEvent.click(within(bar).getByRole('button', { name: 'Close browser' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('AC-4: the drag props go to the browser as its drag handle', () => {
    const onDragStart = vi.fn();
    renderWithAgents(
      <BrowserPane
        url="https://a.test/"
        active
        onFocus={() => {}}
        onClose={() => {}}
        headerProps={{ draggable: true, onDragStart }}
      />,
      { host: testHost({ renderBrowser }) }
    );
    const draggables = screen.getByRole('toolbar').querySelectorAll('[draggable="true"]');
    expect(draggables).toHaveLength(1);
    expect(screen.getByLabelText('URL').closest('[draggable="true"]')).toBeNull();
    fireEvent.dragStart(draggables[0]);
    expect(onDragStart).toHaveBeenCalled();
  });

  it('AC-4: without split no grip and no maximize', () => {
    renderWithAgents(
      <BrowserPane url="https://a.test/" active onFocus={() => {}} onClose={() => {}} />,
      { host: testHost({ renderBrowser }) }
    );
    expect(screen.getByRole('toolbar').querySelector('[draggable="true"]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Move browser to its own tab' })).toBeNull();
  });

  it('a host without a built-in browser gets no browser pane', () => {
    const { container } = renderWithAgents(
      <BrowserPane url="https://a.test/" active onFocus={() => {}} onClose={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });
});
