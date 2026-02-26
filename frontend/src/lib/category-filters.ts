// Category-specific filter groups for the search sidebar
// Each category has a set of filter groups with options
// Products use the `specs` field (Record<string, string>) to match filters

export interface FilterOption {
    label: string;
    value: string;
}

export interface FilterGroup {
    key: string;           // matches product.specs[key]
    label: string;         // display name
    options: FilterOption[];
    type: "checkbox" | "radio";
}

export interface CategoryFilterConfig {
    category: string;      // matches CATEGORIES value
    groups: FilterGroup[];
}

// ─── Vehicle Filters ────────────────────────────────────────────

const VEHICLE_FILTERS: FilterGroup[] = [
    {
        key: "body_type", label: "Body Type", type: "checkbox",
        options: [
            { label: "SUV", value: "suv" },
            { label: "Sedan", value: "sedan" },
            { label: "Truck", value: "truck" },
            { label: "Van", value: "van" },
            { label: "Coupe", value: "coupe" },
            { label: "Hatchback", value: "hatchback" },
            { label: "Pickup", value: "pickup" },
        ]
    },
    {
        key: "fuel_type", label: "Fuel Type", type: "checkbox",
        options: [
            { label: "Electric", value: "electric" },
            { label: "Hybrid", value: "hybrid" },
            { label: "Petrol", value: "petrol" },
            { label: "Diesel", value: "diesel" },
            { label: "Fuel Cell", value: "fuel_cell" },
        ]
    },
    {
        key: "transmission", label: "Transmission", type: "checkbox",
        options: [
            { label: "Automatic", value: "automatic" },
            { label: "Manual", value: "manual" },
            { label: "Semi-automatic", value: "semi_automatic" },
        ]
    },
    {
        key: "drive_mode", label: "Drive Mode", type: "checkbox",
        options: [
            { label: "AWD (All-Wheel)", value: "awd" },
            { label: "4WD (Four-Wheel)", value: "4wd" },
            { label: "FWD (Front-Wheel)", value: "fwd" },
            { label: "RWD (Rear-Wheel)", value: "rwd" },
        ]
    },
    {
        key: "seats", label: "Seats", type: "checkbox",
        options: [
            { label: "2 Seats", value: "2" },
            { label: "4 Seats", value: "4" },
            { label: "5 Seats", value: "5" },
            { label: "7 Seats", value: "7" },
            { label: "8+ Seats", value: "8+" },
        ]
    },
    {
        key: "condition", label: "Condition", type: "checkbox",
        options: [
            { label: "Brand New", value: "brand_new" },
            { label: "Certified Pre-Owned", value: "certified" },
            { label: "Used", value: "used" },
        ]
    },
    {
        key: "year", label: "Year", type: "checkbox",
        options: [
            { label: "2026", value: "2026" },
            { label: "2025", value: "2025" },
            { label: "2024", value: "2024" },
            { label: "2023", value: "2023" },
            { label: "2022 & Older", value: "2022_older" },
        ]
    },
    {
        key: "engine_type", label: "Engine Type", type: "checkbox",
        options: [
            { label: "Electric Motor", value: "electric" },
            { label: "Hybrid", value: "hybrid" },
            { label: "Turbocharged", value: "turbo" },
            { label: "Naturally Aspirated", value: "na" },
        ]
    },
    {
        key: "financing", label: "Financing", type: "checkbox",
        options: [
            { label: "Financing Available", value: "yes" },
            { label: "Cash Only", value: "no" },
        ]
    },
];

// ─── Phone & Tablet Filters ────────────────────────────────────

const PHONE_FILTERS: FilterGroup[] = [
    {
        key: "brand", label: "Brand", type: "checkbox",
        options: [
            { label: "Apple", value: "apple" },
            { label: "Samsung", value: "samsung" },
            { label: "Google", value: "google" },
            { label: "Xiaomi", value: "xiaomi" },
            { label: "Infinix", value: "infinix" },
            { label: "Tecno", value: "tecno" },
            { label: "OnePlus", value: "oneplus" },
            { label: "Huawei", value: "huawei" },
        ]
    },
    {
        key: "storage", label: "Storage", type: "checkbox",
        options: [
            { label: "64 GB", value: "64gb" },
            { label: "128 GB", value: "128gb" },
            { label: "256 GB", value: "256gb" },
            { label: "512 GB", value: "512gb" },
            { label: "1 TB", value: "1tb" },
        ]
    },
    {
        key: "ram", label: "RAM", type: "checkbox",
        options: [
            { label: "4 GB", value: "4gb" },
            { label: "6 GB", value: "6gb" },
            { label: "8 GB", value: "8gb" },
            { label: "12 GB", value: "12gb" },
            { label: "16 GB", value: "16gb" },
        ]
    },
    {
        key: "screen_size", label: "Screen Size", type: "checkbox",
        options: [
            { label: "Under 6\"", value: "under_6" },
            { label: "6\" - 6.5\"", value: "6_6.5" },
            { label: "6.5\" - 7\"", value: "6.5_7" },
            { label: "Over 7\"", value: "over_7" },
        ]
    },
    {
        key: "os", label: "Operating System", type: "checkbox",
        options: [
            { label: "iOS", value: "ios" },
            { label: "Android", value: "android" },
            { label: "HarmonyOS", value: "harmonyos" },
        ]
    },
    {
        key: "condition", label: "Condition", type: "checkbox",
        options: [
            { label: "Brand New", value: "brand_new" },
            { label: "Refurbished", value: "refurbished" },
            { label: "Used", value: "used" },
        ]
    },
    {
        key: "network", label: "Network", type: "checkbox",
        options: [
            { label: "5G", value: "5g" },
            { label: "4G LTE", value: "4g" },
        ]
    },
];

// ─── Electronics / Computing Filters ────────────────────────────

const ELECTRONICS_FILTERS: FilterGroup[] = [
    {
        key: "brand", label: "Brand", type: "checkbox",
        options: [
            { label: "Apple", value: "apple" },
            { label: "Samsung", value: "samsung" },
            { label: "HP", value: "hp" },
            { label: "Dell", value: "dell" },
            { label: "Lenovo", value: "lenovo" },
            { label: "Sony", value: "sony" },
            { label: "LG", value: "lg" },
            { label: "Creality", value: "creality" },
        ]
    },
    {
        key: "type", label: "Product Type", type: "checkbox",
        options: [
            { label: "Laptop", value: "laptop" },
            { label: "Desktop", value: "desktop" },
            { label: "Monitor", value: "monitor" },
            { label: "Printer", value: "printer" },
            { label: "3D Printer", value: "3d_printer" },
            { label: "Accessories", value: "accessories" },
        ]
    },
    {
        key: "ram", label: "RAM", type: "checkbox",
        options: [
            { label: "4 GB", value: "4gb" },
            { label: "8 GB", value: "8gb" },
            { label: "16 GB", value: "16gb" },
            { label: "32 GB", value: "32gb" },
            { label: "64 GB", value: "64gb" },
        ]
    },
    {
        key: "processor", label: "Processor", type: "checkbox",
        options: [
            { label: "Intel Core i3", value: "i3" },
            { label: "Intel Core i5", value: "i5" },
            { label: "Intel Core i7", value: "i7" },
            { label: "Intel Core i9", value: "i9" },
            { label: "AMD Ryzen 5", value: "ryzen5" },
            { label: "AMD Ryzen 7", value: "ryzen7" },
            { label: "Apple M1/M2/M3", value: "apple_m" },
        ]
    },
    {
        key: "condition", label: "Condition", type: "checkbox",
        options: [
            { label: "Brand New", value: "brand_new" },
            { label: "Refurbished", value: "refurbished" },
            { label: "Used", value: "used" },
        ]
    },
];

// ─── Fashion Filters ────────────────────────────────────────────

const FASHION_FILTERS: FilterGroup[] = [
    {
        key: "gender", label: "Gender", type: "checkbox",
        options: [
            { label: "Men", value: "men" },
            { label: "Women", value: "women" },
            { label: "Unisex", value: "unisex" },
            { label: "Boys", value: "boys" },
            { label: "Girls", value: "girls" },
        ]
    },
    {
        key: "size", label: "Size", type: "checkbox",
        options: [
            { label: "XS", value: "xs" },
            { label: "S", value: "s" },
            { label: "M", value: "m" },
            { label: "L", value: "l" },
            { label: "XL", value: "xl" },
            { label: "XXL", value: "xxl" },
            { label: "3XL", value: "3xl" },
        ]
    },
    {
        key: "color", label: "Color", type: "checkbox",
        options: [
            { label: "Black", value: "black" },
            { label: "White", value: "white" },
            { label: "Blue", value: "blue" },
            { label: "Red", value: "red" },
            { label: "Green", value: "green" },
            { label: "Brown", value: "brown" },
            { label: "Navy", value: "navy" },
            { label: "Pink", value: "pink" },
        ]
    },
    {
        key: "material", label: "Material", type: "checkbox",
        options: [
            { label: "Cotton", value: "cotton" },
            { label: "Polyester", value: "polyester" },
            { label: "Silk", value: "silk" },
            { label: "Denim", value: "denim" },
            { label: "Leather", value: "leather" },
            { label: "Linen", value: "linen" },
            { label: "Wool", value: "wool" },
        ]
    },
    {
        key: "style", label: "Style", type: "checkbox",
        options: [
            { label: "Casual", value: "casual" },
            { label: "Formal", value: "formal" },
            { label: "Sporty", value: "sporty" },
            { label: "Ankara", value: "ankara" },
            { label: "Traditional", value: "traditional" },
            { label: "Streetwear", value: "streetwear" },
        ]
    },
    {
        key: "condition", label: "Condition", type: "checkbox",
        options: [
            { label: "Brand New", value: "brand_new" },
            { label: "Pre-Owned", value: "used" },
        ]
    },
];

// ─── Home & Furniture Filters ───────────────────────────────────

const HOME_FILTERS: FilterGroup[] = [
    {
        key: "room_type", label: "Room", type: "checkbox",
        options: [
            { label: "Living Room", value: "living_room" },
            { label: "Bedroom", value: "bedroom" },
            { label: "Kitchen", value: "kitchen" },
            { label: "Bathroom", value: "bathroom" },
            { label: "Office", value: "office" },
            { label: "Outdoor", value: "outdoor" },
        ]
    },
    {
        key: "material", label: "Material", type: "checkbox",
        options: [
            { label: "Wood", value: "wood" },
            { label: "Metal", value: "metal" },
            { label: "Glass", value: "glass" },
            { label: "Fabric", value: "fabric" },
            { label: "Plastic", value: "plastic" },
            { label: "Marble", value: "marble" },
        ]
    },
    {
        key: "style", label: "Style", type: "checkbox",
        options: [
            { label: "Modern", value: "modern" },
            { label: "Minimalist", value: "minimalist" },
            { label: "Traditional", value: "traditional" },
            { label: "Industrial", value: "industrial" },
            { label: "Scandinavian", value: "scandinavian" },
        ]
    },
    {
        key: "condition", label: "Condition", type: "checkbox",
        options: [
            { label: "Brand New", value: "brand_new" },
            { label: "Pre-Owned", value: "used" },
        ]
    },
];

// ─── Gaming Filters ─────────────────────────────────────────────

const GAMING_FILTERS: FilterGroup[] = [
    {
        key: "platform", label: "Platform", type: "checkbox",
        options: [
            { label: "PlayStation 5", value: "ps5" },
            { label: "Xbox Series X|S", value: "xbox" },
            { label: "Nintendo Switch", value: "switch" },
            { label: "PC", value: "pc" },
            { label: "Mobile", value: "mobile" },
        ]
    },
    {
        key: "type", label: "Product Type", type: "checkbox",
        options: [
            { label: "Console", value: "console" },
            { label: "Game Title", value: "game" },
            { label: "Controller", value: "controller" },
            { label: "Headset", value: "headset" },
            { label: "Accessories", value: "accessories" },
        ]
    },
    {
        key: "genre", label: "Genre", type: "checkbox",
        options: [
            { label: "Action", value: "action" },
            { label: "Sports", value: "sports" },
            { label: "RPG", value: "rpg" },
            { label: "Racing", value: "racing" },
            { label: "Strategy", value: "strategy" },
            { label: "Adventure", value: "adventure" },
        ]
    },
    {
        key: "condition", label: "Condition", type: "checkbox",
        options: [
            { label: "Brand New", value: "brand_new" },
            { label: "Pre-Owned", value: "used" },
        ]
    },
];

// ─── Baby & Kids Filters ───────────────────────────────────────

const BABY_FILTERS: FilterGroup[] = [
    {
        key: "age_range", label: "Age Range", type: "checkbox",
        options: [
            { label: "0-6 Months", value: "0_6m" },
            { label: "6-12 Months", value: "6_12m" },
            { label: "1-3 Years", value: "1_3y" },
            { label: "3-5 Years", value: "3_5y" },
            { label: "5-8 Years", value: "5_8y" },
            { label: "8-12 Years", value: "8_12y" },
        ]
    },
    {
        key: "gender", label: "Gender", type: "checkbox",
        options: [
            { label: "Boys", value: "boys" },
            { label: "Girls", value: "girls" },
            { label: "Unisex", value: "unisex" },
        ]
    },
    {
        key: "type", label: "Product Type", type: "checkbox",
        options: [
            { label: "Clothing", value: "clothing" },
            { label: "Toys", value: "toys" },
            { label: "Feeding", value: "feeding" },
            { label: "Diapers", value: "diapers" },
            { label: "Strollers & Car Seats", value: "strollers" },
            { label: "Bath & Skincare", value: "bath" },
        ]
    },
];

// ─── Sports Filters ─────────────────────────────────────────────

const SPORTS_FILTERS: FilterGroup[] = [
    {
        key: "sport_type", label: "Sport", type: "checkbox",
        options: [
            { label: "Football", value: "football" },
            { label: "Basketball", value: "basketball" },
            { label: "Running", value: "running" },
            { label: "Gym & Fitness", value: "gym" },
            { label: "Swimming", value: "swimming" },
            { label: "Tennis", value: "tennis" },
            { label: "Boxing", value: "boxing" },
            { label: "Cycling", value: "cycling" },
        ]
    },
    {
        key: "size", label: "Size", type: "checkbox",
        options: [
            { label: "Size 3", value: "3" },
            { label: "Size 4", value: "4" },
            { label: "Size 5", value: "5" },
            { label: "S", value: "s" },
            { label: "M", value: "m" },
            { label: "L", value: "l" },
            { label: "XL", value: "xl" },
        ]
    },
    {
        key: "type", label: "Product Type", type: "checkbox",
        options: [
            { label: "Equipment", value: "equipment" },
            { label: "Footwear", value: "footwear" },
            { label: "Apparel", value: "apparel" },
            { label: "Accessories", value: "accessories" },
        ]
    },
    {
        key: "material", label: "Material", type: "checkbox",
        options: [
            { label: "PVC", value: "pvc" },
            { label: "Leather", value: "leather" },
            { label: "Synthetic", value: "synthetic" },
            { label: "Rubber", value: "rubber" },
        ]
    },
];

// ─── Beauty Filters ─────────────────────────────────────────────

const BEAUTY_FILTERS: FilterGroup[] = [
    {
        key: "type", label: "Product Type", type: "checkbox",
        options: [
            { label: "Skincare", value: "skincare" },
            { label: "Makeup", value: "makeup" },
            { label: "Haircare", value: "haircare" },
            { label: "Fragrance", value: "fragrance" },
            { label: "Tools & Brushes", value: "tools" },
        ]
    },
    {
        key: "skin_type", label: "Skin Type", type: "checkbox",
        options: [
            { label: "All Skin Types", value: "all" },
            { label: "Oily", value: "oily" },
            { label: "Dry", value: "dry" },
            { label: "Combination", value: "combination" },
            { label: "Sensitive", value: "sensitive" },
        ]
    },
    {
        key: "form", label: "Form", type: "checkbox",
        options: [
            { label: "Cream", value: "cream" },
            { label: "Serum", value: "serum" },
            { label: "Gel", value: "gel" },
            { label: "Oil", value: "oil" },
            { label: "Spray", value: "spray" },
            { label: "Powder", value: "powder" },
        ]
    },
];

// ─── Energy Filters ─────────────────────────────────────────────

const ENERGY_FILTERS: FilterGroup[] = [
    {
        key: "type", label: "Product Type", type: "checkbox",
        options: [
            { label: "Solar Panel", value: "solar_panel" },
            { label: "Inverter", value: "inverter" },
            { label: "Battery", value: "battery" },
            { label: "Generator", value: "generator" },
            { label: "Complete System", value: "complete" },
            { label: "Charge Controller", value: "charge_controller" },
        ]
    },
    {
        key: "wattage", label: "Wattage", type: "checkbox",
        options: [
            { label: "Under 500W", value: "under_500w" },
            { label: "500W - 1kW", value: "500w_1kw" },
            { label: "1kW - 3kW", value: "1kw_3kw" },
            { label: "3kW - 5kW", value: "3kw_5kw" },
            { label: "5kW+", value: "5kw_plus" },
        ]
    },
    {
        key: "battery_type", label: "Battery Type", type: "checkbox",
        options: [
            { label: "Lithium-ion", value: "lithium" },
            { label: "Lead Acid", value: "lead_acid" },
            { label: "LiFePO4", value: "lifepo4" },
            { label: "Tubular", value: "tubular" },
        ]
    },
];

// ─── Default / Generic Filters ──────────────────────────────────

const GENERIC_FILTERS: FilterGroup[] = [
    {
        key: "condition", label: "Condition", type: "checkbox",
        options: [
            { label: "Brand New", value: "brand_new" },
            { label: "Refurbished", value: "refurbished" },
            { label: "Used", value: "used" },
        ]
    },
    {
        key: "availability", label: "Availability", type: "checkbox",
        options: [
            { label: "In Stock", value: "in_stock" },
            { label: "Pre-Order", value: "pre_order" },
        ]
    },
];

// ─── Category → Filter Mapping ──────────────────────────────────

export const CATEGORY_FILTERS: Record<string, FilterGroup[]> = {
    cars: VEHICLE_FILTERS,
    vehicles: VEHICLE_FILTERS,
    phones: PHONE_FILTERS,
    electronics: ELECTRONICS_FILTERS,
    computing: ELECTRONICS_FILTERS,
    fashion: FASHION_FILTERS,
    home: HOME_FILTERS,
    furniture: HOME_FILTERS,
    gaming: GAMING_FILTERS,
    baby: BABY_FILTERS,
    sports: SPORTS_FILTERS,
    beauty: BEAUTY_FILTERS,
    energy: ENERGY_FILTERS,
};

/**
 * Get filter groups for a given category.
 * Falls back to generic filters if category not found.
 */
export function getFiltersForCategory(category: string | null | undefined): FilterGroup[] {
    if (!category || category === "All") return GENERIC_FILTERS;
    const key = category.toLowerCase();
    return CATEGORY_FILTERS[key] || GENERIC_FILTERS;
}

/**
 * Try to detect category from search query keywords.
 * Returns a category key or null.
 */
export function detectCategoryFromQuery(query: string): string | null {
    const q = query.toLowerCase();
    // Vehicle keywords
    if (/\b(car|suv|sedan|truck|pickup|van|ev|electric vehicle|coupe|tacoma|corolla|benz|bmw|toyota|honda|avatr|tesla|byd|range rover|porsche)\b/.test(q)) return "cars";
    // Phone keywords
    if (/\b(iphone|samsung galaxy|phone|smartphone|tablet|ipad|pixel|infinix|tecno|redmi)\b/.test(q)) return "phones";
    // Electronics keywords
    if (/\b(laptop|macbook|computer|monitor|printer|3d printer|speaker|headphone|camera|playstation|xbox|creality)\b/.test(q)) return "electronics";
    // Fashion keywords
    if (/\b(dress|shirt|shoe|sneaker|boot|jean|trouser|skirt|blouse|jacket|hoodie|ankara|fashion)\b/.test(q)) return "fashion";
    // Sports keywords
    if (/\b(football|basketball|cricket|tennis|gym|fitness|running|boxing|cycling|boot|cleat|ball)\b/.test(q)) return "sports";
    // Gaming keywords
    if (/\b(game|gaming|console|controller|ps5|xbox|switch|steam)\b/.test(q)) return "gaming";
    // Home keywords
    if (/\b(sofa|table|chair|bed|mattress|cabinet|shelf|furniture|curtain|rug)\b/.test(q)) return "home";
    // Baby keywords
    if (/\b(baby|diaper|stroller|toddler|infant|kids|children)\b/.test(q)) return "baby";
    // Beauty keywords
    if (/\b(skincare|makeup|cream|serum|perfume|cologne|lipstick|foundation|moisturizer|beauty)\b/.test(q)) return "beauty";
    // Energy keywords
    if (/\b(solar|inverter|battery|generator|panel|energy)\b/.test(q)) return "energy";
    return null;
}
