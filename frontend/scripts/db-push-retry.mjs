#!/usr/bin/env node
// `prisma db push` against Neon's pooled connection can hit a transient P1001
// ("can't reach database server") on a cold-start connect — reproduced locally
// during this session: first attempt failed, a retry seconds later succeeded.
// The plain `prisma db push` step in package.json's build script had zero
// tolerance for that (build script is `... && prisma db push && next build`,
// so any non-zero exit aborts the ENTIRE deploy, including unrelated app code
// changes that have nothing to do with the schema). Confirmed via GitHub's
// Vercel commit-status API that this took down three consecutive deploys.
import { spawnSync } from "node:child_process";

const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 8000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        console.log(`[db-push-retry] prisma db push — attempt ${attempt}/${MAX_ATTEMPTS}`);
        const result = spawnSync("npx", ["prisma", "db", "push"], {
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
