import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/taxonomy/build-food
 *
 * Promotes "Food" from a generic Grocery subcategory to its own top-level
 * department (matching Jumia/Amazon Grocery & Gourmet Food structure,
 * localized for the Nigerian market), and reassigns every product currently
 * under the old "Grocery" top-level into the right Food subcategory instead
 * of leaving them uncategorized. "Grocery" itself is retired since it had no
 * real non-food inventory (Household/Personal Care subcategories were empty).
 *
 * Idempotent — safe to call more than once.
 */
const FOOD_SUBCATEGORIES = [
    "Meat & Poultry",
    "Fish & Seafood",
    "Fresh Produce",
    "Grains, Rice & Staples",
    "Sides & Snacks",
    "Prepared Meals & Combos",
    "Soups & Swallow",
    "Spices & Seasoning",
    "Bakery & Bread",
    "Dairy & Eggs",
    "Beverages",
    "Household & Personal Care",
];

// Specific known products placed into the right subcategory by name, rather
// than guessed — anything else currently under "Grocery" falls back to
// "Sides & Snacks" as a safe default rather than being left unassigned.
const PRODUCT_SUBCATEGORY_OVERRIDES: { match: string; subcategory: string }[] = [
    { match: "afang soup", subcategory: "Soups & Swallow" },
    { match: "fried rice and chicken", subcategory: "Prepared Meals & Combos" },
    { match: "semovita", subcategory: "Grains, Rice & Staples" },
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

        const result = await db.$transaction(async (tx) => {
            // 1. Ensure "Food" exists as its own top-level category.
            let food = await (tx as any).marketplaceCategory.findFirst({
                where: { name: { equals: "Food", mode: "insensitive" } },
            });
            if (!food) {
                food = await (tx as any).marketplaceCategory.create({
                    data: { name: "Food", slug: "food" },
                });
            }

            // 2. Create its subcategories (skip any that already exist).
            const subcategoriesCreated: string[] = [];
            for (const subName of FOOD_SUBCATEGORIES) {
                const existing = await (tx as any).marketplaceSubcategory.findFirst({
                    where: { categoryId: food.id, name: { equals: subName, mode: "insensitive" } },
                });
                if (!existing) {
                    await (tx as any).marketplaceSubcategory.create({
                        data: { name: subName, slug: slugify(subName), categoryId: food.id },
                    });
                    subcategoriesCreated.push(subName);
                }
            }

            // 3. Move every product currently under "Grocery" into "Food",
            // assigning the right subcategory per product.
            const groceryProducts = await tx.product.findMany({
                where: { category: { equals: "Grocery", mode: "insensitive" } },
                select: { id: true, name: true },
            });

            let productsMoved = 0;
            for (const p of groceryProducts) {
                const nameLower = p.name.toLowerCase();
                const override = PRODUCT_SUBCATEGORY_OVERRIDES.find((o) => nameLower.includes(o.match));
                const subcategory = override?.subcategory || "Sides & Snacks";
                await tx.product.update({
                    where: { id: p.id },
                    data: { category: "Food", subcategory },
                });
                productsMoved++;
            }

            // 4. Retire the now-empty "Grocery" top-level (subcategories cascade).
            const grocery = await (tx as any).marketplaceCategory.findFirst({
                where: { name: { equals: "Grocery", mode: "insensitive" }, id: { not: food.id } },
            });
            let groceryRemoved = false;
            if (grocery) {
                await (tx as any).marketplaceCategory.delete({ where: { id: grocery.id } });
                groceryRemoved = true;
            }

            return { subcategoriesCreated, productsMoved, groceryRemoved };
        });

        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error("[taxonomy/build-food] error:", error);
        return NextResponse.json({ error: "Build failed", detail: error?.message }, { status: 500 });
    }
}
