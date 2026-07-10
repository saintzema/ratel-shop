import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/taxonomy/merge
 *
 * The Taxonomy Engine's existing "Purge Duplicates" button only ever touched
 * this admin's local browser cache (see the flash message it shows: "Deletions
 * from DB must be manual") and only matched byte-identical names — it can't
 * merge near-duplicates like "Computers" vs "Computers & Tech", and even for
 * true dupes it never reassigned the real Product rows already using the
 * losing category string. Deleting a MarketplaceCategory row directly (via the
 * existing DELETE handler) does NOT touch Product.category at all — those
 * products would silently stop matching any taxonomy entry.
 *
 * This does the full, safe merge in one transaction:
 *   1. Reassign every Product.category (case-insensitive) from each losing
 *      name to the canonical name.
 *   2. Optionally also set Product.subcategory (when this merge is really a
 *      demotion — e.g. "Cars" was its own top-level, now it's a subcategory
 *      of "Vehicles" — ensuring that subcategory row exists first).
 *   3. Delete the losing MarketplaceCategory rows (subcategories cascade).
 *
 * Expects: { fromNames: string[], toName: string, toSubcategoryName?: string }
 * Returns: { success: true, productsUpdated: number, categoriesRemoved: number }
 */
export async function POST(req: Request) {
    try {
        const user = getUserFromRequest(req);
        if (!user || user.role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const body = await req.json();
        const fromNames: string[] = (body.fromNames || []).filter((n: any) => typeof n === "string" && n.trim());
        const toName: string = (body.toName || "").trim();
        const toSubcategoryName: string = (body.toSubcategoryName || "").trim();

        if (!fromNames.length || !toName) {
            return NextResponse.json({ error: "fromNames (non-empty array) and toName are required" }, { status: 400 });
        }
        // Only skip a fromName if it's the EXACT same string as toName — a
        // case-sensitive comparison. A lowercase check here was wrong: it
        // treated "electronics" -> "Electronics" as a no-op merge (both
        // lowercase to "electronics") and silently skipped it, when fixing
        // exactly that casing mismatch was the whole point of the "Fix Safe
        // Duplicates" tool. The DB update below still needs to run whenever
        // the stored casing differs from the canonical name, even if the two
        // strings are case-insensitively "the same".
        const losingNames = fromNames.filter((n) => n !== toName);
        if (!losingNames.length) {
            return NextResponse.json({ error: "No distinct categories to merge — fromNames all match toName" }, { status: 400 });
        }

        const canonicalSlug = toName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

        const result = await db.$transaction(async (tx) => {
            // 1. Ensure the canonical category exists (create if this merge is
            //    also meant to rename/introduce it).
            let canonical = await (tx as any).marketplaceCategory.findFirst({
                where: { name: { equals: toName, mode: "insensitive" } },
            });
            if (!canonical) {
                canonical = await (tx as any).marketplaceCategory.create({
                    data: { name: toName, slug: canonicalSlug },
                });
            }

            // 1b. If this is a demotion into a subcategory, ensure that
            // subcategory exists under the canonical category.
            if (toSubcategoryName) {
                const subSlug = toSubcategoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                const existingSub = await (tx as any).marketplaceSubcategory.findFirst({
                    where: { categoryId: canonical.id, name: { equals: toSubcategoryName, mode: "insensitive" } },
                });
                if (!existingSub) {
                    await (tx as any).marketplaceSubcategory.create({
                        data: { name: toSubcategoryName, slug: subSlug, categoryId: canonical.id },
                    });
                }
            }

            // 2. Reassign every product using any of the losing names.
            const productsUpdated = await tx.product.updateMany({
                where: {
                    OR: losingNames.map((n) => ({ category: { equals: n, mode: "insensitive" as const } })),
                },
                data: toSubcategoryName
                    ? { category: canonical.name, subcategory: toSubcategoryName }
                    : { category: canonical.name },
            });

            // 3. Delete the losing taxonomy rows (subcategories cascade via the
            //    schema's onDelete: Cascade). CRITICAL: this lookup uses
            //    case-insensitive matching against losingNames, which — when a
            //    losingName is case-insensitively identical to toName (e.g.
            //    fromNames: ["electronics"], toName: "Electronics") — would
            //    also match the canonical row itself (the same one just used
            //    as the update target two steps up), deleting the very
            //    category we just consolidated everything into and cascading
            //    away all of its subcategories. Explicitly exclude canonical.id.
            const losing = await (tx as any).marketplaceCategory.findMany({
                where: {
                    id: { not: canonical.id },
                    OR: losingNames.map((n) => ({ name: { equals: n, mode: "insensitive" as const } })),
                },
                select: { id: true },
            });
            let categoriesRemoved = 0;
            if (losing.length) {
                const deleted = await (tx as any).marketplaceCategory.deleteMany({
                    where: { id: { in: losing.map((c) => c.id) } },
                });
                categoriesRemoved = deleted.count;
            }

            return { productsUpdated: productsUpdated.count, categoriesRemoved };
        });

        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error("[taxonomy/merge] error:", error);
        return NextResponse.json({ error: "Merge failed", detail: error?.message }, { status: 500 });
    }
}
