import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/core/EventBus';

interface TestEvents {
  ping: { n: number };
  pong: { text: string };
}

describe('EventBus', () => {
  it('entrega los datos a todos los oyentes del evento', () => {
    const bus = new EventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('ping', a);
    bus.on('ping', b);
    bus.emit('ping', { n: 7 });
    expect(a).toHaveBeenCalledWith({ n: 7 });
    expect(b).toHaveBeenCalledWith({ n: 7 });
  });

  it('no mezcla eventos distintos', () => {
    const bus = new EventBus<TestEvents>();
    const onPong = vi.fn();
    bus.on('pong', onPong);
    bus.emit('ping', { n: 1 });
    expect(onPong).not.toHaveBeenCalled();
  });

  it('la función devuelta por on() cancela la suscripción', () => {
    const bus = new EventBus<TestEvents>();
    const fn = vi.fn();
    const off = bus.on('ping', fn);
    off();
    bus.emit('ping', { n: 1 });
    expect(fn).not.toHaveBeenCalled();
    expect(bus.listenerCount('ping')).toBe(0);
  });

  it('once() solo escucha una vez', () => {
    const bus = new EventBus<TestEvents>();
    const fn = vi.fn();
    bus.once('ping', fn);
    bus.emit('ping', { n: 1 });
    bus.emit('ping', { n: 2 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('un oyente con error no bloquea a los demás', () => {
    const bus = new EventBus<TestEvents>();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ok = vi.fn();
    bus.on('ping', () => {
      throw new Error('boom');
    });
    bus.on('ping', ok);
    bus.emit('ping', { n: 1 });
    expect(ok).toHaveBeenCalled();
    spy.mockRestore();
  });
});
