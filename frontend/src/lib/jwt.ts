import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fairprice-jwt-secret-change-in-production";
const JWT_EXPIRES_IN = "30d"; // 30 days for mobile sessions

export interface JWTPayload {
    userId: string;
    email: string;
    role: "customer" | "seller" | "admin";
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
