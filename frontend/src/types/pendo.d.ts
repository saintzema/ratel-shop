declare var pendo: any;

interface PendoAgent {
  trackAgent(eventType: string, metadata: Record<string, unknown>): void;
  track(eventName: string, properties?: Record<string, any>): void;
  initialize(config: Record<string, any>): void;
  identify(config: Record<string, any>): void;
  clearSession(): void;
  [key: string]: any;
}

declare global {
  interface Window {
    pendo?: PendoAgent;
  }
}

export {};
