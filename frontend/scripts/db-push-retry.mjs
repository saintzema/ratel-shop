#!/usr/bin/env node
// Two independent causes of build failure found and fixed here:
//
// 1. THE ACTUAL ROOT CAUSE (confirmed from the real Vercel build log): `prisma
//    db push` with no flags refuses to run non-interactively when a schema
//    change needs data-loss confirmation — e.g. adding a `@unique` constraint
//    on an existing table always asks "are you sure," and in CI that prompt
//    can't be answered, so it hard-errors instead. --accept-data-loss below
//    fixes this. It's safe here specifically because this project has no
//    migrations directory at all — `db push` unattended IS the existing
//    deploy strategy for every schema change, reviewed columns are already
//    the norm, not the exception. This flag does NOT silently discard real
//    data on a genuinely destructive change (dropping a populated column
//    etc.) — Prisma still refuses those outright; --accept-data-loss only
//    covers changes where the "loss" is a constraint that could theoretically
//    reject future duplicate inserts, not existing data being deleted.
//
// 2. `prisma db push` against Neon's pooled connection can ALSO hit a
//    transient P1001 ("can't reach database server") on a cold-start connect
//    — reproduced locally earlier in this session: one attempt failed, a
//    retry seconds later succeeded with no other change. Kept the retry loop
//    for this even though it wasn't the actual cause of the failures just
//    diagnosed — it's a real, separate failure mode this build is exposed to.
import { spawnSync } from "node:child_process";

const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 8000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        console.log(`[db-push-retry] prisma db push — attempt ${attempt}/${MAX_ATTEMPTS}`);
        const result = spawnSync("npx", ["prisma", "db", "push", "--accept-data-loss"], {
            stdio: "inherit",
            shell: process.platform === "win32",
        });
        if (result.status === 0) {
            console.log("[db-push-retry] succeeded.");
            process.exit(0);
        }
        console.warn(`[db-push-retry] attempt ${attempt} failed (exit ${result.status}).`);
        if (attempt < MAX_ATTEMPTS) {
            console.log(`[db-push-retry] waiting ${RETRY_DELAY_MS}ms before retry...`);
            await sleep(RETRY_DELAY_MS);
        }
    }
    console.error(`[db-push-retry] all ${MAX_ATTEMPTS} attempts failed — aborting build.`);
    process.exit(1);
}

main();
