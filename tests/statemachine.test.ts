import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/core/EventBus';
import type { GameEvents } from '../src/core/events';
import { GameStateMachine } from '../src/core/GameStateMachine';

function setup() {
  const bus = new EventBus<GameEvents>();
  const sm = new GameStateMachine(bus);
  return { bus, sm };
}

describe('GameStateMachine', () => {
  it('empieza en "loading"', () => {
    expect(setup().sm.state).toBe('loading');
  });

  it('permite transiciones válidas y avisa por el EventBus', () => {
    const { bus, sm } = setup();
    const fn = vi.fn();
    bus.on('state:changed', fn);
    expect(sm.transition('menu')).toBe(true);
    expect(sm.transition('playing')).toBe(true);
    expect(fn).toHaveBeenLastCalledWith({ from: 'menu', to: 'playing' });
  });

  it('rechaza transiciones no permitidas', () => {
    const { sm } = setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(sm.transition('summary')).toBe(false);
    expect(sm.state).toBe('loading');
    warn.mockRestore();
  });

  it('llama a exit y enter en orden', () => {
    const { sm } = setup();
    const order: string[] = [];
    sm.register('loading', { exit: (to) => order.push(`exit loading→${to}`) });
    sm.register('menu', { enter: (from) => order.push(`enter menu←${from}`) });
    sm.transition('menu');
    expect(order).toEqual(['exit loading→menu', 'enter menu←loading']);
  });

  it('pausa y reanuda', () => {
    const { sm } = setup();
    sm.transition('menu');
    sm.transition('playing');
    expect(sm.transition('paused')).toBe(true);
    expect(sm.transition('playing')).toBe(true);
  });
});
