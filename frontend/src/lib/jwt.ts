import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fairprice-jwt-secret-change-in-production";
const JWT_EXPIRES_IN = "30d"; // 30 days for mobile sessions

export interface JWTPayload {
    userId: string;
    email: string;
    role: "customer" | "seller" | "admin";
    // Present only for an invited teammate acting on someone else's seller
    // dashboard — staffOf is the seller they were invited to, staffPermissions
    // is what they're allowed to touch. Absent entirely for a real seller
    // acting on their own account, so existing `!user.staffOf` checks are the
    // simplest way to tell "the actual owner" apart from "an invited staffer."
    staffOf?: string;
    staffPermissions?: { canEditPrice: boolean; canEditStock: boolean; canManageDiscounts: boolean; canViewFinancials: boolean };
}

export function signToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}

export function extractToken(request: Request): string | null {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }
    return null;
}

export function getUserFromRequest(request: Request): JWTPayload | null {
    const token = extractToken(request);
    if (!token) return null;
    return verifyToken(token);
}
