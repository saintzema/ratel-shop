import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

function requireAdmin(req: Request) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  try {
    const categories = await (prisma as any).marketplaceCategory.findMany({
      include: {
        subcategories: true,
      },
      orderBy: {
        name: 'asc'
      }
    });

    // product_count was never computed here — the Taxonomy Engine's "Total
    // Products" stat and every per-row badge just summed `undefined`, showing
    // NaN (then 0 once that got defensively guarded client-side). Product rows
    // store category/subcategory as free-text (no FK to MarketplaceCategory),
    // so counts are computed by case-insensitive grouping instead of a join.
    const [categoryCounts, subcategoryCounts] = await Promise.all([
      prisma.product.groupBy({ by: ["category"], _count: { _all: true } }),
      prisma.product.groupBy({ by: ["category", "subcategory"], _count: { _all: true } }),
    ]);
    const catCountMap = new Map(categoryCounts.map((c) => [(c.category || "").toLowerCase(), c._count._all]));
    const subCountMap = new Map(
      subcategoryCounts
        .filter((s) => s.subcategory)
        .map((s) => [`${(s.category || "").toLowerCase()}::${(s.subcategory || "").toLowerCase()}`, s._count._all])
    );

    const withCounts = categories.map((cat: any) => ({
      ...cat,
      product_count: catCountMap.get(cat.name.toLowerCase()) || 0,
      subcategories: (cat.subcategories || []).map((sub: any) => ({
        ...sub,
        product_count: subCountMap.get(`${cat.name.toLowerCase()}::${sub.name.toLowerCase()}`) || 0,
      })),
    }));

    return NextResponse.json({ success: true, categories: withCounts });
  } catch (error) {
    console.error("Failed to fetch taxonomy:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch taxonomy" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authError = requireAdmin(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { type, name, categoryId, slug } = body;
    const generatedSlug = name ? (slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-')) : null;

    if (type === "category") {
      // Check for duplicates
      const existing = await (prisma as any).marketplaceCategory.findFirst({
        where: { 
          OR: [
            { name: { equals: name, mode: 'insensitive' } }, 
            { slug: generatedSlug }
          ] 
        }
      });
      if (existing) {
        return NextResponse.json({ success: true, category: existing, message: "Category already exists" });
      }

      const category = await (prisma as any).marketplaceCategory.create({
        data: {
          name,
          slug: generatedSlug,
        }
      });
      return NextResponse.json({ success: true, category });
    } else if (type === "subcategory") {
      // Check for duplicates
      const existing = await (prisma as any).marketplaceSubcategory.findFirst({
        where: { 
          categoryId,
          OR: [
            { name: { equals: name, mode: 'insensitive' } }, 
            { slug: generatedSlug }
          ]
        }
      });
      if (existing) {
        return NextResponse.json({ success: true, subcategory: existing, message: "Subcategory already exists" });
      }

      const subcategory = await (prisma as any).marketplaceSubcategory.create({
        data: {
          name,
          slug: generatedSlug,
          categoryId
        }
      });
      return NextResponse.json({ success: true, subcategory });
    }

    // FALLBACK: Handle deletion via POST if DELETE method is blocked
    if (body.action === "delete" && body.id && body.type) {
      if (body.type === "category") {
        await (prisma as any).marketplaceCategory.delete({ where: { id: body.id } });
      } else {
        await (prisma as any).marketplaceSubcategory.delete({ where: { id: body.id } });
      }
      return NextResponse.json({ success: true, message: "Taxonomy item deleted via POST fallback" });
    }

    return NextResponse.json({ success: false, error: "Invalid type or action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to create taxonomy item:", error);
    return NextResponse.json({ success: false, error: "Failed to create taxonomy item" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const authError = requireAdmin(req);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type"); // 'category' or 'subcategory'

    if (!id || !type) {
      return NextResponse.json({ success: false, error: "ID and type are required" }, { status: 400 });
    }

    if (type === "category") {
      // Cascade delete is usually handled by DB, but we ensure subcategories are gone or handled
      await (prisma as any).marketplaceCategory.delete({
        where: { id }
      });
    } else {
      await (prisma as any).marketplaceSubcategory.delete({
        where: { id }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete taxonomy item:", error);
    return NextResponse.json({ success: false, error: "Failed to delete taxonomy item" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const authError = requireAdmin(req);
  if (authError) return authError;
  try {
    const { id, type, name, slug } = await req.json();
    if (!id || !type || !name) {
      return NextResponse.json({ success: false, error: "ID, type, and name are required" }, { status: 400 });
    }

    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    if (type === "category") {
      const category = await (prisma as any).marketplaceCategory.update({
        where: { id },
        data: { name }
      });
      return NextResponse.json({ success: true, category });
    } else {
      const subcategory = await (prisma as any).marketplaceSubcategory.update({
        where: { id },
        data: { name }
      });
      return NextResponse.json({ success: true, subcategory });
    }
  } catch (error) {
    console.error("Failed to update taxonomy item:", error);
    return NextResponse.json({ success: false, error: "Failed to update taxonomy item" }, { status: 500 });
  }
}
