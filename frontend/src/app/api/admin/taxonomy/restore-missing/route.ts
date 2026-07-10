import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/taxonomy/restore-missing
 *
 * One-time repair for the taxonomy-merge self-delete bug (fixed in this same
 * deploy): re-running "Fix Safe Duplicates" cascade-deleted 10 top-level
 * categories and all of their subcategories, because the merge tool's DELETE
 * step matched the canonical row itself via case-insensitive name comparison.
 * The underlying Product.category/subcategory data was NOT affected — only
 * the MarketplaceCategory/MarketplaceSubcategory tree was wiped for these.
 *
 * This recreates exactly the categories/subcategories that existed right
 * before that run (captured from the admin's own screenshot of the taxonomy
 * page moments earlier), and fixes the one product-level casualty: "Phones"
 * products getting reverted from "Phones & Tablets" by a now-fixed stale
 * merge entry.
 *
 * Idempotent — safe to call more than once (skips anything that already exists).
 */
const RESTORE_PLAN: { name: string; subcategories: string[] }[] = [
    { name: "Beauty", subcategories: ["Skincare", "Makeup", "Fragrances", "Haircare", "Personal Care"] },
    { name: "Computers", subcategories: ["Laptops", "Desktops", "Monitors", "Networking", "Components"] },
    { name: "Electronics", subcategories: ["Smart Home", "Drones", "Audio", "Cameras", "TV & Video", "Headphones"] },
    { name: "Energy & Solar", subcategories: ["Solar Panels", "Inverters", "Batteries", "Solar Street Lights", "Wind Turbines"] },
    { name: "Fashion", subcategories: ["Men's Wear", "Women's Wear", "Kids", "Bags", "Shoes", "Watches", "Sneakers", "Eyewear"] },
    { name: "Gaming", subcategories: ["Consoles", "Gaming PCs", "Accessories", "Video Games"] },
    { name: "Health", subcategories: ["Fitness", "Supplements", "Medical Supplies", "Diagnostic Gear"] },
    { name: "Home", subcategories: ["Kitchenware", "Bedding", "Decor", "Furniture", "Lighting", "Office & Furniture", "Garden & Outdoor"] },
    { name: "Phones & Tablets", subcategories: ["Tablets", "Smartwatches"] },
    {
        name: "Vehicles",
        subcategories: ["Motorcycles", "Tricycles", "Vans", "Other Vehicles", "Auto Parts", "Cars", "Buses"],
    },
];

function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(req: Request) {
    try {
        const user = getUserFromRequest(req);
        if (!user || user.role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const created = { categories: [] as string[], subcategories: [] as string[] };

        for (const plan of RESTORE_PLAN) {
            let cat = await (db as any).marketplaceCategory.findFirst({
                where: { name: { equals: plan.name, mode: "insensitive" } },
            });
            if (!cat) {
                cat = await (db as any).marketplaceCategory.create({
                    data: { name: plan.name, slug: slugify(plan.name) },
                });
                created.categories.push(plan.name);
            }

            for (const subName of plan.subcategories) {
                const existingSub = await (db as any).marketplaceSubcategory.findFirst({
                    where: { categoryId: cat.id, name: { equals: subName, mode: "insensitive" } },
                });
                if (!existingSub) {
                    await (db as any).marketplaceSubcategory.create({
                        data: { name: subName, slug: slugify(subName), categoryId: cat.id },
                    });
                    created.subcategories.push(`${plan.name} > ${subName}`);
                }
            }
        }

        // Fix the one product-level casualty: a stale merge entry reverted
        // "Phones & Tablets" products back to "Phones" before this deploy.
        const phonesFixed = await db.product.updateMany({
            where: { category: { equals: "Phones", mode: "insensitive" } },
            data: { category: "Phones & Tablets" },
        });

        return NextResponse.json({
            success: true,
            categoriesCreated: created.categories,
            subcategoriesCreated: created.subcategories,
            phonesProductsFixed: phonesFixed.count,
        });
    } catch (error: any) {
        console.error("[taxonomy/restore-missing] error:", error);
        return NextResponse.json({ error: "Restore failed", detail: error?.message }, { status: 500 });
    }
}
