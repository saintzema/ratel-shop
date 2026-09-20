import crypto from "crypto";
import { db } from "@/lib/db";

// Server-issued email sign-in: a 6-digit code AND a one-tap magic link, both stored only as
// SHA-256 hashes in the existing VerificationToken table (no schema change). Verification used
// to happen entirely in the browser (code generated with Math.random and compared client-side),
// with /api/auth/issue-token handing out a JWT for any email — i.e. anyone could sign in as anyone.
const TTL_MS = 10 * 60 * 1000;
const MAX_WRONG_GUESSES = 5;

const sha = (v: string) => crypto.createHash("sha256").update(v).digest("hex");
export const normEmail = (e: string) => e.toLowerCase().trim();

export async function createEmailLoginChallenge(email: string) {
    const e = normEmail(email);
    const code = String(crypto.randomInt(100000, 1000000));
    const linkToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + TTL_MS);
    // One live challenge per email: drop older ones (and the wrong-guess counters).
    await db.verificationToken.deleteMany({ where: { identifier: { in: [e, `att:${e}`] } } });
    await db.verificationToken.createMany({
        data: [
            { identifier: e, token: sha(`code:${e}:${code}`), expires },
            { identifier: e, token: sha(`link:${linkToken}`), expires },
        ],
    });
    return { code, linkToken, expires };
}

/** Returns true (and consumes the challenge) only for a matching, unexpired code or link token. */
export async function consumeEmailLoginChallenge(email: string, proof: { code?: string; token?: string }) {
    const e = normEmail(email);
    const att = await db.verificationToken.count({ where: { identifier: `att:${e}`, expires: { gt: new Date() } } });
    if (att >= MAX_WRONG_GUESSES) {
        await db.verificationToken.deleteMany({ where: { identifier: e } });
        return { ok: false as const, reason: "locked" as const };
    }
    const hash = proof.code ? sha(`code:${e}:${String(proof.code).trim()}`) : proof.token ? sha(`link:${proof.token}`) : null;
    const row = hash ? await db.verificationToken.findFirst({ where: { identifier: e, token: hash, expires: { gt: new Date() } } }) : null;
    if (!row) {
        await db.verificationToken.create({
            data: { identifier: `att:${e}`, token: crypto.randomBytes(12).toString("hex"), expires: new Date(Date.now() + TTL_MS) },
        });
        return { ok: false as const, reason: "invalid" as const };
    }
    await db.verificationToken.deleteMany({ where: { identifier: { in: [e, `att:${e}`] } } });
    return { ok: true as const };
}
