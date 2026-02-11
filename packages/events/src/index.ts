// Event system for Kivvi - enables decoupled communication between modules

export type EventType =
  | 'invoice.created'
  | 'invoice.updated'
  | 'invoice.sent'
  | 'invoice.paid'
  | 'contact.created'
  | 'contact.updated'
  | 'payment.received'
  | 'ai.action.executed';

export interface KivviEvent<T = unknown> {
  type: EventType;
  payload: T;
  timestamp: Date;
  companyId: string;
  userId?: string;
}

type EventHandler<T = unknown> = (event: KivviEvent<T>) => void | Promise<void>;

class EventBus {
  private handlers: Map<EventType, Set<EventHandler>> = new Map();

  on<T>(type: EventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(type)?.delete(handler as EventHandler);
    };
  }

  async emit<T>(event: KivviEvent<T>): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;

    await Promise.all(
      Array.from(handlers).map((handler) => handler(event as KivviEvent))
    );
  }
}

export const eventBus = new EventBus();
