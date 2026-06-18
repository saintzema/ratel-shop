declare var pendo: any;

interface Window {
    pendo?: {
        track: (eventName: string, properties?: Record<string, any>) => void;
        initialize: (config: Record<string, any>) => void;
        [key: string]: any;
    };
}
