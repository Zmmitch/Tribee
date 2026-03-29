import { EventEmitter } from 'node:events';

type EventHandler = (...args: unknown[]) => void | Promise<void>;

class AppEventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  emit(event: string, payload: unknown): void {
    this.emitter.emit(event, payload);
  }

  on(event: string, handler: EventHandler): void {
    this.emitter.on(event, handler);
  }

  off(event: string, handler: EventHandler): void {
    this.emitter.off(event, handler);
  }
}

export const eventBus = new AppEventBus();
