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
    const client = getClient();
    if (!client) return [];

    // Scan across all agents, sort by ts desc, cap at limit.
    const res = await client.send(new ScanCommand({
        TableName: TABLE_NAME,
        Limit: Math.min(limit * 3, 200), // over-fetch to sort, then slice
    }));

    return ((res.Items ?? []) as AgentLogEntry[])
        .sort((a, b) => b.ts - a.ts)
        .slice(0, limit);
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
