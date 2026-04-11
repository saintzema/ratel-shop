import { DemoStore } from './frontend/src/lib/demo-store';
import { NegotiationRequest } from './frontend/src/lib/types';

// Mock window and localStorage for Node.js
const mockStorage: Record<string, string> = {};
(global as any).window = {
    dispatchEvent: () => {},
};
(global as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
};

const userId = "test_user_ai";
const productId = "iphone-15-pro-max"; // Valid ID from DEMO_PRODUCTS

// Add a countered negotiation
const negotiation: NegotiationRequest = {
    id: "neg_test_123",
    product_id: productId,
    buyer_id: userId,
    seller_id: "apple-official",
    proposed_price: 1500000,
    status: "countered",
    counter_price: 1650000,
    counter_status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};

const all = JSON.parse(mockStorage['ratel_negotiations'] || "[]");
all.push(negotiation);
mockStorage['ratel_negotiations'] = JSON.stringify(all);

console.log("Mock negotiation created in 'localStorage'.");
console.log(JSON.stringify(negotiation, null, 2));
