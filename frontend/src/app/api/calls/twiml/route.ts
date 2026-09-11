import { NextRequest, NextResponse } from "next/server";
import { verifyCallToken, hasCallMaskingConfig } from "@/lib/call-masking";

export const dynamic = "force-dynamic";

const xml = (body: string) =>
    new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
        headers: { "Content-Type": "text/xml" },
    });

/**
 * GET/POST /api/calls/twiml?t=<signed token> — Twilio hits this the instant
 * the requester's phone (the first leg) answers, and expects TwiML back
 * telling it what to do next. We tell it to dial the OTHER party's real
 * number and bridge the two legs — the actual masking step.
 *
 * The `t` token is the only thing this endpoint trusts: it's minted
 * exclusively by our own /api/calls/connect after verifying the caller is
 * a real party to an active trip, expires in 3 minutes, and embeds the one
 * number this specific call is allowed to dial. A request with a missing,
 * expired, or tampered token dials no one — this is what stops the
 * endpoint being an open "make Twilio call any number" relay.
 */
async function handle(req: NextRequest) {
    if (!hasCallMaskingConfig) return xml("<Reject/>");

    const token = req.nextUrl.searchParams.get("t");
    const payload = token ? verifyCallToken(token) : null;
    if (!payload) {
        return xml("<Say>This call link has expired. Please try calling again from the app.</Say><Hangup/>");
    }

    return xml(`<Dial>${payload.targetE164}</Dial>`);
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
