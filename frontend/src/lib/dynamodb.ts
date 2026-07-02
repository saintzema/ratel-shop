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

/**
 * Full-table scan, following DynamoDB's LastEvaluatedKey until exhausted (or
 * maxItems hit), then sorted by ts desc.
 *
 * The old readAgentLogs did a SINGLE Scan page (capped ~200 raw items) and
 * sorted only that page — Scan does not return items in any guaranteed
 * order, so once the table grew past one page, "most recent 30" could
 * silently be a random 30 from wherever the scan happened to land, and
 * anything not in that page was completely unreachable — which is exactly
 * why older operations "disappeared" on /zema360/live. This walks the whole
 * table (bounded by maxItems as a safety cap) so sorting is correct and
 * every historical event is reachable via pagination.
 */
export async function readAllAgentLogs(maxItems = 5000): Promise<AgentLogEntry[]> {
    const client = getClient();
    if (!client) return [];

    const items: AgentLogEntry[] = [];
    let ExclusiveStartKey: Record<string, any> | undefined;

    do {
        const res = await client.send(new ScanCommand({
            TableName: TABLE_NAME,
            Limit: 500,
            ExclusiveStartKey,
        }));
        items.push(...((res.Items ?? []) as AgentLogEntry[]));
        ExclusiveStartKey = res.LastEvaluatedKey as Record<string, any> | undefined;
    } while (ExclusiveStartKey && items.length < maxItems);

    return items.sort((a, b) => b.ts - a.ts).slice(0, maxItems);
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
