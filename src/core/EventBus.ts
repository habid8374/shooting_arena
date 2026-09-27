/**
 * EventBus: un "tablero de anuncios" tipado.
 *
 * Un módulo publica (`emit`) un evento y todos los que se suscribieron (`on`)
 * reciben los datos. Así los módulos no necesitan conocerse entre sí.
 */

// Un "oyente" es una función que recibe los datos del evento.
type Listener<T> = (payload: T) => void;

// `Events` es un mapa { nombreEvento: tipoDeDatos }.
// Usamos `object` para permitir interfaces como GameEvents.
export class EventBus<Events extends object> {
  // Guardamos un conjunto de oyentes por cada nombre de evento.
  private readonly listeners = new Map<keyof Events, Set<Listener<never>>>();

  /** Se suscribe a un evento. Devuelve una función para cancelar la suscripción. */
  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<never>);
    return () => this.off(event, listener);
  }

  /** Se suscribe solo a la próxima vez que ocurra el evento. */
  once<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const off = this.on(event, (payload) => {
      off();
      listener(payload);
    });
    return off;
  }

  /** Cancela una suscripción. */
  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<never>);
  }

  /** Publica un evento para todos sus oyentes. */
  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // Copiamos la lista por si un oyente se da de baja mientras recorremos.
    for (const listener of [...set]) {
      try {
        (listener as Listener<Events[K]>)(payload);
      } catch (error) {
        // Un oyente con error no debe impedir que los demás reciban el evento.
        console.error(`[EventBus] Error en un oyente de "${String(event)}":`, error);
      }
    }
  }

  /** Cuántos oyentes tiene un evento (útil para pruebas). */
  listenerCount<K extends keyof Events>(event: K): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /** Elimina todos los oyentes (por ejemplo al reiniciar el juego). */
  clear(): void {
    this.listeners.clear();
  }
}
