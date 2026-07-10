import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/taxonomy/backfill-subcategories
 *
 * Almost every product in the catalog has a correct top-level category but
 * no subcategory at all — sellers/AI AutoFill never set it, so every
 * subcategory in the Taxonomy Engine shows "0 products" even when plenty of
 * real products would obviously fit one (a product literally named
 * "Bluetooth Headphones" under Electronics with no subcategory set).
 *
 * Purely additive and safe: only fills in Product.subcategory where it is
 * currently null/empty, matched by keyword against that product's own
 * category's real subcategory list. Never touches category, never moves a
 * product between top-level categories, never deletes anything — so unlike
 * the merge tool, there's no destructive path here even if the matching is
 * imperfect. Products that don't match any keyword are left alone rather
 * than force-assigned to a wrong bucket.
 */
const RULES: Record<string, { subcategory: string; keywords: string[] }[]> = {
    Electronics: [
        { subcategory: "Cameras", keywords: ["camera", "gopro", "dslr", "mirrorless"] },
        { subcategory: "Headphones", keywords: ["headphone", "earbud", "earphone", "airpods"] },
        { subcategory: "TV & Video", keywords: [" tv", "television", "projector"] },
        { subcategory: "Audio", keywords: ["speaker", "soundbar", "audio"] },
        { subcategory: "Drones", keywords: ["drone"] },
        { subcategory: "Smart Home", keywords: ["smart home", "smart bulb", "hue", "alexa", "google home"] },
    ],
    Computers: [
        { subcategory: "Laptops", keywords: ["macbook", "laptop", "xps", "zephyrus", "notebook"] },
        { subcategory: "Monitors", keywords: ["monitor", "curved gaming"] },
        { subcategory: "Desktops", keywords: ["desktop", "imac", "tower pc"] },
        { subcategory: "Networking", keywords: ["router", "wifi extender", "modem", "ethernet"] },
        { subcategory: "Components", keywords: ["mouse", "keyboard", "usb hub", "laptop stand", "ram", "ssd", "gpu"] },
    ],
    "Phones & Tablets": [
        { subcategory: "Tablets", keywords: ["tablet", "ipad", "tab s", "galaxy tab"] },
        { subcategory: "Smartwatches", keywords: ["watch6", "smartwatch", "galaxy watch", "apple watch"] },
    ],
    Beauty: [
        { subcategory: "Makeup", keywords: ["makeup", "eyeshadow", "lipstick", "lip tint", "foundation", "nails", "gel polish"] },
        { subcategory: "Haircare", keywords: ["hair straightener", "hair clipper", "scalp", "hair growth", "human hair", "wig"] },
        { subcategory: "Fragrances", keywords: ["perfume", "fragrance", "cologne", "eau de"] },
        { subcategory: "Skincare", keywords: ["serum", "cream", "moisturiz", "cleansing", "lotion", "spf", "retinol"] },
        { subcategory: "Personal Care", keywords: ["massager", "brush"] },
    ],
    Health: [
        { subcategory: "Fitness", keywords: ["dumbbell", "resistance band", "yoga mat"] },
        { subcategory: "Supplements", keywords: ["vitamin", "supplement", "protein powder"] },
        { subcategory: "Medical Supplies", keywords: ["respirator", "first aid", "thermometer", "bandage"] },
        { subcategory: "Diagnostic Gear", keywords: ["blood pressure monitor", "glucose meter", "pulse oximeter"] },
    ],
    Fashion: [
        { subcategory: "Eyewear", keywords: ["sunglasses", "ray-ban", "eyewear"] },
        { subcategory: "Watches", keywords: ["g-shock", "quartz watch", "wristwatch"] },
        { subcategory: "Sneakers", keywords: ["sneaker", "air force", "air jordan", "ultraboost", "new balance"] },
        { subcategory: "Shoes", keywords: ["sandal", "slider", "loafers", "heels"] },
        { subcategory: "Bags", keywords: ["backpack", "handbag", " bag"] },
        { subcategory: "Women's Wear", keywords: ["women's", "dress", "wig"] },
        { subcategory: "Men's Wear", keywords: ["men's"] },
        { subcategory: "Kids", keywords: ["kids", "children's wear"] },
    ],
    Home: [
        { subcategory: "Office & Furniture", keywords: ["office chair", "desk", "ergonomic chair", "swivel chair"] },
        { subcategory: "Furniture", keywords: ["sofa", "dining table", "wardrobe", "bookshelf"] },
        { subcategory: "Kitchenware", keywords: ["blender", "cooker", "food processor", "cookware", "kettle"] },
        { subcategory: "Lighting", keywords: ["lamp", "led light", "night light", "bulb"] },
        { subcategory: "Decor", keywords: ["vacuum", "humidifier", "mosquito", "air freshener"] },
        { subcategory: "Garden & Outdoor", keywords: ["lawn mower", "garden", "outdoor grill"] },
    ],
    "Energy & Solar": [
        { subcategory: "Batteries", keywords: ["lithium battery", "battery"] },
        { subcategory: "Solar Panels", keywords: ["solar panel", "bifacial"] },
        { subcategory: "Inverters", keywords: ["inverter", "solar generator", "power station"] },
        { subcategory: "Solar Street Lights", keywords: ["street light"] },
        { subcategory: "Wind Turbines", keywords: ["wind turbine"] },
    ],
    Vehicles: [
        { subcategory: "Tricycles", keywords: ["tricycle", "keke"] },
        { subcategory: "Motorcycles", keywords: ["motorcycle", "power bike"] },
        { subcategory: "Vans", keywords: [" van ", "minivan"] },
        { subcategory: "Buses", keywords: ["bus"] },
        { subcategory: "Auto Parts", keywords: ["scratch repair", "car wax", "car paint", "brake pad", "spark plug"] },
        // Fallback: any car make/model or body-style word not already caught above
        { subcategory: "Cars", keywords: ["sedan", "suv", "coupe", "hatchback", "toyota", "bmw", "mercedes", "lexus", "honda", "byd", "changan", "lotus", "kia", "hyundai"] },
    ],
    Gaming: [
        { subcategory: "Consoles", keywords: ["xbox", "playstation", "nintendo switch", "ps5"] },
        { subcategory: "Accessories", keywords: ["mouse pad", "controller", "gaming headset"] },
        { subcategory: "Gaming PCs", keywords: ["gaming pc", "gaming desktop"] },
        { subcategory: "Video Games", keywords: ["game disc", "video game"] },
    ],
    "Sports & Gym": [
        { subcategory: "Fitness Equipment", keywords: ["dumbbell", "treadmill", "resistance band", "yoga mat"] },
        { subcategory: "Sports Equipment", keywords: ["football", "basketball", "racket", "match ball"] },
        { subcategory: "Activewear", keywords: ["jersey", "activewear", "tracksuit"] },
    ],
    "Baby Products": [
        { subcategory: "Gear", keywords: ["stroller", "car seat", "baby carrier"] },
        { subcategory: "Baby Care", keywords: ["feeding set", "bottle", "bib"] },
        { subcategory: "Baby Toys", keywords: ["baby toy", "rattle"] },
        { subcategory: "Diapers", keywords: ["diaper", "nappy"] },
    ],
};

export async function POST(req: Request) {
    try {
        const user = getUserFromRequest(req);
        if (!user || user.role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const results: Record<string, number> = {};
        let totalUpdated = 0;

        for (const [category, rules] of Object.entries(RULES)) {
            const products = await db.product.findMany({
                where: {
                    category: { equals: category, mode: "insensitive" },
                    OR: [{ subcategory: null }, { subcategory: "" }],
                },
                select: { id: true, name: true, description: true },
            });

            let updatedForCategory = 0;
            for (const p of products) {
                const haystack = `${p.name} ${p.description || ""}`.toLowerCase();
                const rule = rules.find((r) => r.keywords.some((k) => haystack.includes(k)));
                if (rule) {
                    await db.product.update({ where: { id: p.id }, data: { subcategory: rule.subcategory } });
                    updatedForCategory++;
                }
            }
            if (updatedForCategory > 0) {
                results[category] = updatedForCategory;
                totalUpdated += updatedForCategory;
            }
        }

        return NextResponse.json({ success: true, totalUpdated, byCategory: results });
    } catch (error: any) {
        console.error("[taxonomy/backfill-subcategories] error:", error);
        return NextResponse.json({ error: "Backfill failed", detail: error?.message }, { status: 500 });
    }
}
