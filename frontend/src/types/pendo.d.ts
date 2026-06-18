interface PendoAgent {
  trackAgent(eventType: string, metadata: Record<string, unknown>): void;
}

declare global {
  interface Window {
    pendo?: PendoAgent;
  }
}

export {};
