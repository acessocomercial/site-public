import type { DataLayerEvent } from './types';

type EventHandler = (event: DataLayerEvent) => void;

const handlers = new Map<string, Set<EventHandler>>();
let initialized = false;

export function onEvent(eventName: string, handler: EventHandler): () => void {
  if (!handlers.has(eventName)) {
    handlers.set(eventName, new Set());
  }
  handlers.get(eventName)!.add(handler);

  return () => {
    handlers.get(eventName)?.delete(handler);
  };
}

function processEvent(event: DataLayerEvent): void {
  const eventHandlers = handlers.get(event.event);
  if (eventHandlers) {
    for (const handler of eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.warn(`[ac-tools] Error in event handler for "${event.event}":`, error);
      }
    }
  }

  const wildcardHandlers = handlers.get('*');
  if (wildcardHandlers) {
    for (const handler of wildcardHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.warn('[ac-tools] Error in wildcard handler:', error);
      }
    }
  }
}

export function initDataLayer(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  const existingQueue: DataLayerEvent[] =
    (window as Record<string, unknown>).acDataLayer as DataLayerEvent[] ?? [];

  for (const event of existingQueue) {
    processEvent(event);
  }

  const dataLayer = {
    push(event: DataLayerEvent): void {
      processEvent(event);
    },
    [Symbol.iterator]() {
      return existingQueue[Symbol.iterator]();
    },
  };

  (window as Record<string, unknown>).acDataLayer = dataLayer;
}

export function destroyDataLayer(): void {
  handlers.clear();
  initialized = false;
}
