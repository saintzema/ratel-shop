import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getUserFromRequest } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/** Cheap "is my stored token still good?" probe — verifies the JWT only, no DB access. */
export async function GET(req: Request) {
    const payload = getUserFromRequest(req);
    if (!payload) return NextResponse.json({ valid: false });
    const exp = (jwt.decode((req.headers.get("Authorization") || "").slice(7)) as any)?.exp;
    const secondsLeft = typeof exp === "number" ? exp - Math.floor(Date.now() / 1000) : 0;
    return NextResponse.json({ valid: true, daysLeft: Math.floor(secondsLeft / 86400) });
}
