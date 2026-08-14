/**
 * Category alias resolution.
 *
 * Product.category is free text and has accumulated a lot of drift — the live
 * catalog contains "Vehicles", "vehicles", "automotive accessories", "Phones &
 * Tablets", "Computers", "Home & Kitchen" and more, while the UI's browse pills
 * say "Cars", "Smartphones", "Computing". A naive equals- or includes-match
 * between those two vocabularies returns nothing: "cars" is not a substring of
 * "vehicles", so browsing Cars showed an empty catalog even with 27 vehicles in
 * the database.
 *
 * This maps a UI/browse term onto every stored spelling that means the same
 * thing. Matching is done on lowercase substrings so new drift ("Vehicle",
 * "Cars & Buses") still lands in the right bucket without another migration.
 */

const ALIASES: Record<string, string[]> = {
    cars: ["car", "vehicle", "automotive", "auto", "bus", "truck", "motorcycle"],
    vehicles: ["car", "vehicle", "automotive", "auto", "bus", "truck", "motorcycle"],
    smartphones: ["phone", "tablet", "smartphone", "mobile", "ipad", "android"],
    phones: ["phone", "tablet", "smartphone", "mobile"],
    computing: ["computer", "computing", "laptop", "pc", "notebook", "macbook"],
    computers: ["computer", "computing", "laptop", "pc", "notebook", "macbook"],
    electronics: ["electronic", "gadget", "tv", "audio"],
    appliances: ["appliance", "home & kitchen", "kitchen", "home"],
    fashion: ["fashion", "clothing", "cloth", "wear", "shoe", "bag", "apparel"],
    energy: ["energy", "solar", "inverter", "generator", "power"],
    beauty: ["beauty", "cosmetic", "skin", "hair"],
    health: ["health", "medical", "fitness", "wellness"],
    baby: ["baby", "kids", "children", "infant"],
    sports: ["sport", "gym", "fitness", "outdoor"],
    furniture: ["furniture", "home", "chair", "table", "sofa"],
    food: ["food", "drink", "grocery", "beverage"],
};

/**
 * Every lowercase substring that should count as a match for this browse term.
 * Always includes the term itself, so an unknown category still self-matches.
 */
export function categoryMatchTerms(category: string): string[] {
    const key = category.trim().toLowerCase();
    if (!key || key === "all") return [];
    const aliases = ALIASES[key] || [];
    return Array.from(new Set([key, ...aliases]));
}

/**
 * Does a product's stored category (and optionally its name/subcategory) belong
 * to the given browse category?
 */
export function productMatchesCategory(
    selected: string,
    productCategory?: string | null,
    productName?: string | null,
    productSubcategory?: string | null
): boolean {
    const terms = categoryMatchTerms(selected);
    if (terms.length === 0) return true;

    const cat = (productCategory || "").toLowerCase();
    const sub = (productSubcategory || "").toLowerCase();
    const name = (productName || "").toLowerCase();

    return terms.some(t =>
        cat.includes(t) ||
        sub.includes(t) ||
        // Original behaviour kept: a stored category narrower than the browse
        // term ("suv" under "cars") should still match.
        (cat.length > 2 && t.includes(cat)) ||
        name.includes(t)
    );
}
