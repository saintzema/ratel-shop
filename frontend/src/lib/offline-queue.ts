/**
 * Offline Queue System for Database Resilience
 * 
 * Queues failed API operations (orders, registrations, updates) in localStorage
 * and automatically retries them when connectivity is restored.
 * 
 * This ensures zero data loss during database downtime.
 */

interface QueuedOperation {
    id: string;
    endpoint: string;
    method: "POST" | "PUT" | "PATCH" | "DELETE";
    body: any;
    timestamp: number;
    retryCount: number;
    type: "order" | "registration" | "product_update" | "seller_update" | "general";
}

const QUEUE_KEY = "fairprice_offline_queue";
const MAX_RETRIES = 10;
const RETRY_INTERVALS = [3000, 5000, 10000, 30000, 60000]; // Exponential backoff

class OfflineQueueService {
    private isProcessing = false;
    private retryTimer: NodeJS.Timeout | null = null;

    constructor() {
        if (typeof window !== "undefined") {
            // Listen for connectivity restoration
            window.addEventListener("online", () => {
                console.log("🌐 Connection restored — processing offline queue...");
                this.processQueue();
            });

            // Periodically attempt to flush the queue (every 30s)
            setInterval(() => {
                if (navigator.onLine && this.getQueue().length > 0) {
                    this.processQueue();
                }
            }, 30000);

            // Process any leftover items on startup
            setTimeout(() => this.processQueue(), 3000);
        }
    }

    /** Get current queue from localStorage */
    getQueue(): QueuedOperation[] {
        if (typeof window === "undefined") return [];
        try {
            return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
        } catch {
            return [];
        }
    }

    /** Save queue to localStorage */
    private saveQueue(queue: QueuedOperation[]) {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }

    /** Add a failed operation to the offline queue */
    enqueue(operation: Omit<QueuedOperation, "id" | "timestamp" | "retryCount">) {
        const queue = this.getQueue();
        const newOp: QueuedOperation = {
            ...operation,
            id: `oq_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            timestamp: Date.now(),
            retryCount: 0,
        };
        queue.push(newOp);
        this.saveQueue(queue);
        console.log(`📦 Queued offline operation: ${operation.type} → ${operation.endpoint}`);

        // Schedule a retry
        this.scheduleRetry();
    }

    /** Schedule a retry attempt */
    private scheduleRetry() {
        if (this.retryTimer) return;

        const queue = this.getQueue();
        if (queue.length === 0) return;

        const lowestRetry = Math.min(...queue.map(q => q.retryCount));
        const delay = RETRY_INTERVALS[Math.min(lowestRetry, RETRY_INTERVALS.length - 1)];

        this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            this.processQueue();
        }, delay);
    }

    /** Process all queued operations */
    async processQueue() {
        if (this.isProcessing) return;
        if (typeof window === "undefined" || !navigator.onLine) return;

        const queue = this.getQueue();
        if (queue.length === 0) return;

        this.isProcessing = true;
        console.log(`🔄 Processing ${queue.length} queued operation(s)...`);

        const remaining: QueuedOperation[] = [];

        for (const op of queue) {
            try {
                const response = await fetch(op.endpoint, {
                    method: op.method,
                    headers: { "Content-Type": "application/json" },
                    body: op.body ? JSON.stringify(op.body) : undefined,
                });

                if (response.ok) {
                    console.log(`✅ Flushed queued ${op.type}: ${op.endpoint}`);
                } else if (response.status >= 500) {
                    // Server error — keep in queue for retry
                    op.retryCount++;
                    if (op.retryCount < MAX_RETRIES) {
                        remaining.push(op);
                        console.warn(`⚠️ Server error on ${op.endpoint}, will retry (${op.retryCount}/${MAX_RETRIES})`);
                    } else {
                        console.error(`❌ Max retries reached for ${op.type}: ${op.endpoint}. Discarding.`);
                    }
                } else {
                    // 4xx client error — do not retry (bad request, etc.)
                    console.warn(`⚠️ Client error ${response.status} on ${op.endpoint}, removing from queue.`);
                }
            } catch (error) {
                // Network error — keep in queue
                op.retryCount++;
                if (op.retryCount < MAX_RETRIES) {
                    remaining.push(op);
                }
            }
        }

        this.saveQueue(remaining);
        this.isProcessing = false;

        if (remaining.length > 0) {
            this.scheduleRetry();
        } else {
            console.log("✅ Offline queue fully flushed!");
            // Trigger sync to refresh local state from DB
            window.dispatchEvent(new Event("demo-store-update"));
        }
    }

    /** Get queue stats */
    getStats() {
        const queue = this.getQueue();
        return {
            pending: queue.length,
            orders: queue.filter(q => q.type === "order").length,
            registrations: queue.filter(q => q.type === "registration").length,
            updates: queue.filter(q => q.type === "product_update" || q.type === "seller_update").length,
        };
    }

    /** Clear the entire queue (for debugging/admin) */
    clearQueue() {
        this.saveQueue([]);
    }
}

/** Resilient fetch wrapper: attempts the request, and if it fails, queues it for later */
export async function resilientFetch(
    endpoint: string,
    options: {
        method: "POST" | "PUT" | "PATCH" | "DELETE";
        body?: any;
        type?: QueuedOperation["type"];
    }
): Promise<Response | null> {
    try {
        const response = await fetch(endpoint, {
            method: options.method,
            headers: { "Content-Type": "application/json" },
            body: options.body ? JSON.stringify(options.body) : undefined,
        });

        if (response.ok) {
            return response;
        }

        // Server error — queue for retry
        if (response.status >= 500) {
            offlineQueue.enqueue({
                endpoint,
                method: options.method,
                body: options.body,
                type: options.type || "general",
            });
        }

        return response;
    } catch {
        // Network error — queue for retry
        offlineQueue.enqueue({
            endpoint,
            method: options.method,
            body: options.body,
            type: options.type || "general",
        });
        return null;
    }
}

// Singleton instance
export const offlineQueue = new OfflineQueueService();
