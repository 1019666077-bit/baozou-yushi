export type EventHandler<T = unknown> = (payload: T) => void;

export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  on<T>(event: string, handler: EventHandler<T>): () => void {
    const set = this.handlers.get(event) ?? new Set<EventHandler>();
    set.add(handler as EventHandler);
    this.handlers.set(event, set);
    return () => this.off(event, handler);
  }

  off<T>(event: string, handler: EventHandler<T>): void {
    const set = this.handlers.get(event);
    set?.delete(handler as EventHandler);
    if (set?.size === 0) this.handlers.delete(event);
  }

  emit<T>(event: string, payload: T): void {
    for (const handler of this.handlers.get(event) ?? []) handler(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const gameEvents = new EventBus();
