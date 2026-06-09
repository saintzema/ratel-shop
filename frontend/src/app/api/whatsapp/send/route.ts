/**
 * POST /api/whatsapp/send
 *
 * Send a WhatsApp message via FairPrice's Meta Cloud API integration.
 * Called by the ZEMA Comms agent for order confirmations and — crucially —
 * for HITL approval requests.
 *
 * When `approvalId` is set the message body includes an "approve / reject"
 * instruction so the human approver can reply to resume the pipeline:
 *   "approve <approvalId>"  or  "reject <approvalId>"
 *
 * Auth: Bearer ZEMA_SERVICE_TOKEN
 *
 * Body:
 *   { to: string; message: string; approvalId?: string; interactive?: boolean }
 */
import { NextResponse } from "next/server";
import { WhatsAppService } from "@/lib/whatsapp-service";
import { requireZemaAuth } from "@/lib/zema-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const authError = requireZemaAuth(request);
    if (authError) return authError;

    try {
        const body = await request.json();
        const { to, message, approvalId, interactive } = body as {
            to?: string;
            message?: string;
            approvalId?: string;
            interactive?: boolean;
        };

        if (!to || !message) {
            return NextResponse.json(
                { error: "'to' and 'message' are required" },
                { status: 400 }
            );
        }

        // For HITL approval requests, append clear instructions on how to respond
        let finalMessage = message;
        if (approvalId && interactive) {
            finalMessage =
                `${message}\n\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `Reply with one of:\n` +
                `✅  approve ${approvalId}\n` +
                `❌  reject ${approvalId}\n` +
                `━━━━━━━━━━━━━━━━━━`;
        }

        const result = await WhatsAppService.sendMessage(to, finalMessage);

        return NextResponse.json({
            success: true,
            to,
            approvalId: approvalId ?? null,
            result,
        });
    } catch (err: any) {
        console.error("[whatsapp/send] error:", err);
        return NextResponse.json(
            { error: err?.message ?? "Failed to send WhatsApp message" },
            { status: 500 }
        );
    }
}
