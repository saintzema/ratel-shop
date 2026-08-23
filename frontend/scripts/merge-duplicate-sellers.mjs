/**
 * Merge duplicate seller rows onto one canonical store per owner.
 *
 * WHY THIS EXISTS
 * The Sell (+) quick-list flow drafted a store at `s_${user.id}` whenever the
 * localStorage CURRENT_SELLER key was absent — which happens on any new device
 * and after our storage-quota purge. Established sellers therefore acquired
 * empty duplicate stores. Because every "which seller is this?" lookup ran
 * findFirst/.find with no ordering, those placeholders could win, and the owner
 * was told to re-add a bank account they already had, shown 0 products against a
 * full catalogue, and bounced into onboarding.
 *
 * The application-level fix (lib/resolve-seller.ts + the client picker) makes
 * duplicates harmless by always ranking the real store first. This script is the
 * separate, optional cleanup that removes them.
 *
 * SAFETY
 *   - DRY RUN BY DEFAULT. Prints the plan and changes nothing.
 *   - Pass --apply to execute. Pass --owner=<email> to limit to one owner.
 *   - Never deletes a row that still owns products, orders or payouts unless
 *     those references were successfully repointed first, inside a transaction.
 *   - Never merges across different owners.
 *
 *   node scripts/merge-duplicate-sellers.mjs
 *   node scripts/merge-duplicate-sellers.mjs --owner=fairprice2026@gmail.com
 *   node scripts/merge-duplicate-sellers.mjs --apply
 */
import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

const APPLY = process.argv.includes("--apply");
const ownerArg = process.argv.find(a => a.startsWith("--owner="));
const ONLY_OWNER = ownerArg ? ownerArg.split("=")[1].toLowerCase() : null;

/** Same ranking as lib/resolve-seller.ts — they must not disagree. */
function score(s) {
    let n = 0;
    if (s.bankName && s.accountNumber) n += 8;
    if (s.verified === true) n += 4;
    if (s.status === "active") n += 2;
    if (s.whatsappNumber) n += 1;
    return n;
}

/** Tables that reference a seller, and the column that does it. */
const REFERENCES = [
    ["product", "sellerId"],
    ["order", "sellerId"],
    ["payout", "sellerId"],
    ["quote", "sellerId"],
    ["negotiation", "sellerId"],
    ["sellerStaff", "sellerId"],
    ["discount", "sellerId"],
    ["adCampaign", "sellerId"],
    ["socialPost", "sellerId"],
];

async function countRefs(sellerId) {
    const out = {};
    for (const [model, col] of REFERENCES) {
        if (!db[model]) continue; // model not in this schema version
        try {
            const n = await db[model].count({ where: { [col]: sellerId } });
            if (n > 0) out[model] = n;
        } catch { /* column/model mismatch — skip rather than guess */ }
    }
    return out;
}

const all = await db.seller.findMany({
    select: {
        id: true, businessName: true, userId: true, ownerEmail: true,
        bankName: true, accountNumber: true, whatsappNumber: true,
        verified: true, status: true, createdAt: true,
    },
    orderBy: { createdAt: "asc" },
});

// Group by owner. userId is the stronger key; fall back to ownerEmail.
const groups = new Map();
for (const s of all) {
    const key = (s.userId || s.ownerEmail || s.id).toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
}

let planned = 0;
for (const [owner, rows] of groups) {
    if (rows.length < 2) continue;
    if (ONLY_OWNER && !rows.some(r => (r.ownerEmail || "").toLowerCase() === ONLY_OWNER)) continue;

    const sorted = [...rows].sort((a, b) => {
        const d = score(b) - score(a);
        return d !== 0 ? d : new Date(a.createdAt) - new Date(b.createdAt);
    });
    const keep = sorted[0];
    const drop = sorted.slice(1);

    console.log(`\n=== owner ${owner} — ${rows.length} rows ===`);
    console.log(`  KEEP  ${keep.id}  "${keep.businessName}"  score=${score(keep)}  bank=${keep.bankName ? "yes" : "no"}`);

    for (const d of drop) {
        const refs = await countRefs(d.id);
        const refStr = Object.keys(refs).length ? JSON.stringify(refs) : "no references";
        console.log(`  MERGE ${d.id}  "${d.businessName}"  score=${score(d)}  ${refStr}`);
        planned++;

        if (!APPLY) continue;

        await db.$transaction(async (tx) => {
            // Repoint every reference onto the surviving store BEFORE deleting,
            // so a failure anywhere rolls the whole owner back rather than
            // orphaning a product or, worse, an order.
            for (const [model, col] of REFERENCES) {
                if (!tx[model]) continue;
                try {
                    await tx[model].updateMany({ where: { [col]: d.id }, data: { [col]: keep.id } });
                } catch (e) {
                    throw new Error(`repoint ${model}.${col} ${d.id} -> ${keep.id} failed: ${e.message}`);
                }
            }

            // Carry over any field the survivor is missing — a placeholder
            // occasionally holds the only copy of something real.
            const fill = {};
            if (!keep.bankName && d.bankName) fill.bankName = d.bankName;
            if (!keep.accountNumber && d.accountNumber) fill.accountNumber = d.accountNumber;
            if (!keep.whatsappNumber && d.whatsappNumber) fill.whatsappNumber = d.whatsappNumber;
            if (Object.keys(fill).length) await tx.seller.update({ where: { id: keep.id }, data: fill });

            await tx.seller.delete({ where: { id: d.id } });
        });

        console.log(`        merged and deleted.`);
    }
}

console.log(
    planned === 0
        ? "\nNo duplicate sellers found."
        : `\n${APPLY ? "Merged" : "Would merge"} ${planned} duplicate row(s).${APPLY ? "" : "  Re-run with --apply to execute."}`
);

await db.$disconnect();
