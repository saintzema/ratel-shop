import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { ProductCategory } from "@/lib/types";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const categories = await prisma.marketplaceCategory.findMany({
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

    if (type === "category") {
      const category = await prisma.marketplaceCategory.create({
        data: {
          name,
          slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        }
      });
      return NextResponse.json({ success: true, category });
    } else if (type === "subcategory") {
      const subcategory = await prisma.marketplaceSubcategory.create({
        data: {
          name,
          slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
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
