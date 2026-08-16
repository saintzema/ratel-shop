/**
 * One safe way to read a taxonomy category's subcategories.
 *
 * The same list travels under two different field names depending on where it
 * came from: the /api/admin/taxonomy response calls it `subcategories`, while
 * INITIAL_CATEGORIES (the offline fallback DataSyncService.getTaxonomy() returns
 * when localStorage has no synced copy yet) calls it `children`. Pages that
 * picked one name crashed on the other — `?.subcategories.map()` optional-chains
 * the .find() but not the field, so a fallback category rendered
 * "Cannot read properties of undefined (reading 'map')" and took down the whole
 * product editor.
 */
export function subcategoriesOf(cat: any): Array<{ id?: string; name: string }> {
    if (!cat) return [];
    const list = cat.subcategories ?? cat.children;
    return Array.isArray(list) ? list : [];
}

/** Finds a category by loose name match and returns its subcategories, never undefined. */
export function subcategoriesForCategory(taxonomy: any[], category: string): Array<{ id?: string; name: string }> {
    if (!Array.isArray(taxonomy) || !category) return [];
    const norm = category.trim().toLowerCase();
    return subcategoriesOf(
        taxonomy.find((c: any) => String(c?.name || "").toLowerCase() === norm || String(c?.slug || "").toLowerCase() === norm)
    );
}
