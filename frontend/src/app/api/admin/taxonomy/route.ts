import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

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

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("Failed to fetch taxonomy:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch taxonomy" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { type, name, categoryId, slug } = await req.json();
    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    if (type === "category") {
      // Check for duplicates
      const existing = await (prisma as any).marketplaceCategory.findFirst({
        where: { OR: [{ name }, { slug: generatedSlug }] }
      });
      if (existing) {
        return NextResponse.json({ success: false, error: "Category already exists" }, { status: 400 });
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
          OR: [{ name }, { slug: generatedSlug }]
        }
      });
      if (existing) {
        return NextResponse.json({ success: false, error: "Subcategory already exists in this category" }, { status: 400 });
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

    return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Failed to create taxonomy item:", error);
    return NextResponse.json({ success: false, error: "Failed to create taxonomy item" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
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
