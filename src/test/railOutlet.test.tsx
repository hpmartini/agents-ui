import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useContext } from 'react';
import { createPortal } from 'react-dom';
import { cleanup, screen } from '@testing-library/react';
import { AgentsView } from '../components/AgentsView/AgentsView';
import { RailOutletContext } from '../components/AgentsView/railOutlet';
import { renderWithAgents } from './agents';

// A route that lists its own items in the rail column (Orkumo: Chats mode, module modes)
function RouteWithRail() {
  const outlet = useContext(RailOutletContext);
  return (
    <>
      <div data-testid="route-main">route main</div>
      {outlet && createPortal(<div data-testid="route-rail">route rail</div>, outlet)}
    </>
  );
}

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLElement.prototype.scrollTo = () => {};
});
afterEach(() => cleanup());

const workspace = (container: HTMLElement) =>
  container.querySelector('[data-focus-zone="rail"]')!.parentElement!;

describe('railOutlet', () => {
  it('while not active: the route gets the outlet and shows its main area', async () => {
    renderWithAgents(
      <AgentsView active={false} railOutlet>
        <RouteWithRail />
      </AgentsView>
    );
    expect(await screen.findByTestId('route-rail')).toBeInTheDocument();
    expect(screen.getByTestId('route-main').parentElement).not.toHaveClass('hidden');
  });

  it('while active: the outlet stays with the route and the workspace shows beside it', async () => {
    const { container } = renderWithAgents(
      <AgentsView active railOutlet>
        <RouteWithRail />
      </AgentsView>
    );
    // the route's rail items replace the session list; its main area is hidden, not unmounted
    expect(await screen.findByTestId('route-rail')).toBeInTheDocument();
    expect(container.querySelector('[data-focus-zone="rail"]')).toHaveClass('hidden');
    expect(screen.getByTestId('route-main').closest('.hidden')).not.toBeNull();
    // the workspace (agent tabs) is the visible main area (from md up, like in the agents route)
    expect(workspace(container).lastElementChild).toHaveClass('md:flex');
  });

  it('without railOutlet: no outlet, the session list shows', async () => {
    const { container } = renderWithAgents(
      <AgentsView active>
        <RouteWithRail />
      </AgentsView>
    );
    await screen.findByTestId('route-main');
    expect(screen.queryByTestId('route-rail')).toBeNull();
    expect(container.querySelector('[data-focus-zone="rail"]')).not.toHaveClass('hidden');
  });
});
