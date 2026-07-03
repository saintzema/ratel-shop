import { DynamoDBClient, CreateTableCommand, DescribeTableCommand, ResourceNotFoundException } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = "zema360-agent-logs";

function getClient() {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) return null;

    const base = new DynamoDBClient({ region, credentials: { accessKeyId, secretAccessKey } });
    return DynamoDBDocumentClient.from(base, {
        marshallOptions: { removeUndefinedValues: true },
    });
}

export function isDynamoConfigured() {
    return !!(process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

// Creates the table if it doesn't exist — idempotent, safe to call on every cold start.
export async function ensureTable() {
    const raw = new DynamoDBClient({
        region: process.env.AWS_REGION!,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
    });

    try {
        await raw.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    } catch (e) {
        if (e instanceof ResourceNotFoundException) {
            await raw.send(new CreateTableCommand({
                TableName: TABLE_NAME,
                KeySchema: [
                    { AttributeName: "agent", KeyType: "HASH" },
                    { AttributeName: "ts", KeyType: "RANGE" },
                ],
                AttributeDefinitions: [
                    { AttributeName: "agent", AttributeType: "S" },
                    { AttributeName: "ts", AttributeType: "N" },
                ],
                BillingMode: "PAY_PER_REQUEST",
            }));
        } else {
            throw e;
        }
    }
}

export interface AgentLogEntry {
    id: string;
    agent: string;
    event: string;
    status: "pending" | "approved" | "rejected" | "completed" | "error";
    payload?: Record<string, unknown>;
    result?: Record<string, unknown>;
    ts: number;
    sellerId?: string;
    orderId?: string;
}

export async function writeAgentLog(entry: AgentLogEntry) {
    const client = getClient();
    if (!client) return null;

    await client.send(new PutCommand({ TableName: TABLE_NAME, Item: entry }));
    return entry;
}

export async function readAgentLogs(limit = 30): Promise<AgentLogEntry[]> {
    const all = await readAllAgentLogs();
    return all.slice(0, limit);
}

// Module-level cache — survives across invocations on the same warm Lambda
// instance. The live dashboard auto-polls every 5s and a demo may have
// several judges/tabs open at once; without this every one of those polls
// would trigger a fresh Scan. A short TTL keeps DynamoDB reads bounded to
// roughly once per TTL window regardless of how many viewers are polling,
// while still feeling live.
let cache: { items: AgentLogEntry[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 4000;

/**
 * Bounded table scan (default 300 items — enough history to page through
 * without scanning the whole table on every poll), following
 * LastEvaluatedKey until maxItems is hit, then sorted by ts desc.
 *
 * The old readAgentLogs did a SINGLE Scan page and sorted only that page —
 * Scan does not return items in any guaranteed order, so "most recent 30"
 * could silently be an arbitrary subset, and anything outside that one page
 * was completely unreachable. This walks forward far enough to sort
 * correctly, capped low enough to keep read cost predictable.
 */
export async function readAllAgentLogs(maxItems = 300): Promise<AgentLogEntry[]> {
    if (cache && cache.expiresAt > Date.now()) {
        return cache.items.slice(0, maxItems);
    }

    const client = getClient();
    if (!client) return [];

    const items: AgentLogEntry[] = [];
    let ExclusiveStartKey: Record<string, any> | undefined;

    do {
        const res = await client.send(new ScanCommand({
            TableName: TABLE_NAME,
            Limit: 100,
            ExclusiveStartKey,
        }));
        items.push(...((res.Items ?? []) as AgentLogEntry[]));
        ExclusiveStartKey = res.LastEvaluatedKey as Record<string, any> | undefined;
    } while (ExclusiveStartKey && items.length < maxItems);

    const sorted = items.sort((a, b) => b.ts - a.ts).slice(0, maxItems);
    cache = { items: sorted, expiresAt: Date.now() + CACHE_TTL_MS };
    return sorted;
}

export async function readAgentLogsByAgent(agent: string, limit = 20): Promise<AgentLogEntry[]> {
    const client = getClient();
    if (!client) return [];

    const res = await client.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "agent = :a",
        ExpressionAttributeValues: { ":a": agent },
        ScanIndexForward: false,
        Limit: limit,
    }));

    return (res.Items ?? []) as AgentLogEntry[];
}
