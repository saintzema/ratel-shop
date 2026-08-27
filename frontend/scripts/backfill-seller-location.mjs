/**
 * Backfill Seller.state / Seller.city from the free-text `location` column.
 *
 * WHY THIS EXISTS
 * Onboarding's address step has always collected a state and city from the
 * NIGERIAN_STATES dropdowns, and wrote them into `location` as "City, State".
 * The structured columns were added later, so every seller who onboarded before
 * that has a perfectly good "Lugbe, Abuja (FCT)" in `location` and NULL in both
 * `state` and `city`.
 *
 * That is why location filtering and localized search match nothing: the ranking
 * and filters read the structured columns, and no row has them. The write path is
 * already correct for new sellers — this recovers the history.
 *
 * SAFETY
 *   - DRY RUN BY DEFAULT. Prints the plan and changes nothing. Pass --apply.
 *   - Only ever fills NULLs. Never overwrites a state/city already set.
 *   - Only writes values that match the canonical NIGERIAN_STATES list, so a
 *     malformed `location` is skipped rather than turned into garbage that would
 *     then fail to match any filter anyway.
 *
 *   node scripts/backfill-seller-location.mjs
 *   node scripts/backfill-seller-location.mjs --apply
 */
import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { readFileSync } from "fs";

neonConfig.webSocketConstructor = ws;
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
const APPLY = process.argv.includes("--apply");

// Read the canonical list straight from the TS source so this can never drift
// from what the dropdowns offer.
const src = readFileSync(new URL("../src/lib/nigerian-states.ts", import.meta.url), "utf8");
const STATES = [];
const stateRe = /state:\s*"([^"]+)"\s*,\s*cities:\s*\[([^\]]*)\]/g;
let m;
while ((m = stateRe.exec(src)) !== null) {
    STATES.push({
        state: m[1],
        cities: m[2].split(",").map(c => c.trim().replace(/^"|"$/g, "")).filter(Boolean),
    });
}
if (STATES.length === 0) {
    console.error("Could not parse NIGERIAN_STATES — aborting rather than guessing.");
    process.exit(1);
}
console.log(`Parsed ${STATES.length} states from nigerian-states.ts\n`);

const norm = s => String(s || "").trim().toLowerCase();

/** "Lugbe, Abuja (FCT)" -> { state: "Abuja (FCT)", city: "Lugbe" } */
function parseLocation(location) {
    if (!location) return null;
    const parts = String(location).split(",").map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return null;

    // The state is the LAST segment; match it against the canonical list.
    const tail = parts[parts.length - 1];
    const stateMatch = STATES.find(s => norm(s.state) === norm(tail))
        // Tolerate "Abuja" for "Abuja (FCT)" and similar.
        || STATES.find(s => norm(s.state).startsWith(norm(tail)) || norm(tail).startsWith(norm(s.state)));
    if (!stateMatch) return null;

    let city = null;
    if (parts.length > 1) {
        const head = parts[parts.length - 2];
        const cityMatch = stateMatch.cities.find(c => norm(c) === norm(head));
        if (cityMatch) city = cityMatch;
    }
    return { state: stateMatch.state, city };
}

const sellers = await db.seller.findMany({
    select: { id: true, businessName: true, state: true, city: true, location: true },
});

let planned = 0, skippedNoLocation = 0, skippedUnparsed = 0, alreadySet = 0;

for (const s of sellers) {
    if (s.state && s.city) { alreadySet++; continue; }
    if (!s.location) { skippedNoLocation++; continue; }

    const parsed = parseLocation(s.location);
    if (!parsed) {
        skippedUnparsed++;
        console.log(`  SKIP  ${s.id.padEnd(28)} location="${s.location}" — no canonical state match`);
        continue;
    }

    // Only fill what is missing.
    const data = {};
    if (!s.state && parsed.state) data.state = parsed.state;
    if (!s.city && parsed.city) data.city = parsed.city;
    if (Object.keys(data).length === 0) { alreadySet++; continue; }

    console.log(`  FILL  ${s.id.padEnd(28)} "${s.location}" -> ${JSON.stringify(data)}`);
    planned++;

    if (APPLY) {
        await db.seller.update({ where: { id: s.id }, data });
    }
}

console.log(`
${APPLY ? "Updated" : "Would update"} ${planned} seller(s).
  already had state+city : ${alreadySet}
  no location to parse   : ${skippedNoLocation}
  location unparseable   : ${skippedUnparsed}
${APPLY ? "" : "\nRe-run with --apply to execute."}`);

await db.$disconnect();
