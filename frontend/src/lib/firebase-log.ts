// Event logger — dual-writes to AWS DynamoDB (primary) + Firebase RTDB (Google Cloud, kept for XPRIZE requirement).
// DynamoDB: requires AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_REGION.
// Firebase: requires FIREBASE_DATABASE_URL + FIREBASE_DATABASE_SECRET (optional, graceful skip).

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const DB_URL = process.env.FIREBASE_DATABASE_URL?.replace(/\/$/, "");
const DB_SECRET = process.env.FIREBASE_DATABASE_SECRET;

function getDynamoClient() {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!region || !accessKeyId || !secretAccessKey) return null;
    return DynamoDBDocumentClient.from(
        new DynamoDBClient({ region, credentials: { accessKeyId, secretAccessKey } }),
        { marshallOptions: { removeUndefinedValues: true } }
    );
}

export type ZemaEventType =
    | 'gemini_query'
    | 'price_verified'
    | 'order_created'
    | 'escrow_released'
    | 'negotiation'
    | 'agent_decision'
    | 'whatsapp_sent';

export interface ZemaEvent {
    type: ZemaEventType;
    description: string;
    product?: string;
    mode?: string;
    model?: string;
    count?: number;
    value?: number;
    ts: number;
}

export async function logZemaEvent(event: Omit<ZemaEvent, 'ts'>): Promise<void> {
    const ts = Date.now();
    const id = `${event.type}-${ts}-${Math.random().toString(36).slice(2, 7)}`;
    const payload = { ...event, ts, id };

    // Primary: DynamoDB (agent = event.type as partition key so dashboard queries work)
    const dynamo = getDynamoClient();
    if (dynamo) {
        try {
            await dynamo.send(new PutCommand({
                TableName: "zema360-agent-logs",
                Item: { ...payload, agent: event.type },
            }));
        } catch { /* fire-and-forget */ }
    }

    // Secondary: Firebase RTDB (kept alive for XPRIZE Google Cloud requirement)
    if (DB_URL && DB_SECRET) {
        try {
            await fetch(`${DB_URL}/zema360/events.json?auth=${DB_SECRET}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        } catch { /* fire-and-forget */ }
    }
}
