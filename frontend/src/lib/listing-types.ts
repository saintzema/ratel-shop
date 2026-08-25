/**
 * Listing types — Real Estate, Jobs and Services are not extra categories.
 *
 * A job posting has no stock, no cart and no escrow. A rental has a period, not
 * a purchase. A service is priced per hour or per job and delivered, not shipped.
 * Treating them as "categories" on a physical-product model is what forces
 * nonsense like "Add to Cart" on a vacancy.
 *
 * This module is the single place that answers, for any listing:
 *   - what fields does its form collect?
 *   - can it be bought, carted, held in escrow, or does it just connect two people?
 *   - what does the price mean, and what should the primary button say?
 *   - which facets should search offer?
 *
 * Type-specific attributes live in Product.specs (already Json) rather than in
 * new columns per type, which would mean a schema migration for every field a
 * property listing needs. The three columns that search must FILTER on —
 * listingType, locationState, locationCity — are real columns.
 */

export type ListingType = "product" | "property" | "job" | "service";

export interface ListingField {
    /** Key inside Product.specs. */
    key: string;
    label: string;
    type: "text" | "number" | "select" | "textarea";
    options?: string[];
    placeholder?: string;
    required?: boolean;
    /** Show as a search facet for this listing type. */
    facet?: boolean;
}

export interface ListingTypeConfig {
    type: ListingType;
    label: string;
    /** Plural, for headings and empty states. */
    labelPlural: string;
    icon: string;
    /** What the seller is doing — "List a property", "Post a job". */
    createVerb: string;
    /** Can a buyer add this to the cart and check out? */
    commerce: {
        cart: boolean;
        escrow: boolean;
        stock: boolean;
        /** Primary call to action on the listing page. */
        primaryCta: string;
        /** How the number after ₦ should be read. */
        priceSuffix?: string;
        /** Some listings genuinely have no price (e.g. "salary negotiable"). */
        priceOptional?: boolean;
    };
    fields: ListingField[];
}

const CONDITION_FREE: ListingType[] = ["job", "service"];

/** Physical goods — the original and still the default. */
const PRODUCT: ListingTypeConfig = {
    type: "product",
    label: "Product",
    labelPlural: "Products",
    icon: "📦",
    createVerb: "List a product",
    commerce: { cart: true, escrow: true, stock: true, primaryCta: "Add to Cart" },
    fields: [],
};

const PROPERTY: ListingTypeConfig = {
    type: "property",
    label: "Property",
    labelPlural: "Property",
    icon: "🏠",
    createVerb: "List a property",
    // Nobody puts a three-bedroom flat in a shopping cart. The buyer contacts the
    // agent; escrow applies to a deposit later, not to the listing itself.
    commerce: { cart: false, escrow: false, stock: false, primaryCta: "Contact Agent" },
    fields: [
        { key: "property_purpose", label: "For", type: "select", options: ["For Rent", "For Sale", "Short Let"], required: true, facet: true },
        { key: "property_type", label: "Property type", type: "select", options: ["Flat / Apartment", "House", "Duplex", "Self Contain", "Land / Plot", "Commercial Property", "Event Centre", "Office Space"], required: true, facet: true },
        { key: "bedrooms", label: "Bedrooms", type: "select", options: ["Studio", "1", "2", "3", "4", "5", "6+"], facet: true },
        { key: "bathrooms", label: "Bathrooms", type: "select", options: ["1", "2", "3", "4", "5+"] },
        { key: "toilets", label: "Toilets", type: "select", options: ["1", "2", "3", "4", "5+"] },
        { key: "furnishing", label: "Furnishing", type: "select", options: ["Furnished", "Semi-furnished", "Unfurnished"], facet: true },
        { key: "square_metres", label: "Size (sqm)", type: "number", placeholder: "e.g. 250" },
        { key: "parking_spaces", label: "Parking spaces", type: "select", options: ["None", "1", "2", "3", "4+"] },
        { key: "rent_period", label: "Price period", type: "select", options: ["Per Year", "Per Month", "Per Night", "One-off"], facet: true },
        { key: "serviced", label: "Serviced", type: "select", options: ["Yes", "No"] },
    ],
};

const JOB: ListingTypeConfig = {
    type: "job",
    label: "Job",
    labelPlural: "Jobs",
    icon: "💼",
    createVerb: "Post a job",
    // A vacancy is not a purchase. The price field, when present, is the salary.
    commerce: { cart: false, escrow: false, stock: false, primaryCta: "Apply Now", priceSuffix: "salary", priceOptional: true },
    fields: [
        { key: "job_type", label: "Employment type", type: "select", options: ["Full Time", "Part Time", "Contract", "Internship", "Temporary", "Remote"], required: true, facet: true },
        { key: "job_field", label: "Job field", type: "select", options: ["Accounting & Finance", "Admin & Office", "Sales & Marketing", "Engineering & Technical", "IT & Software", "Health & Safety", "Teaching & Education", "Logistics & Transport", "Hospitality & Catering", "Construction & Skilled Trade", "Customer Service", "Management", "Other"], required: true, facet: true },
        { key: "experience_level", label: "Experience", type: "select", options: ["Entry level", "1-3 years", "3-5 years", "5-10 years", "10+ years"], facet: true },
        { key: "education_level", label: "Minimum education", type: "select", options: ["SSCE / OND", "HND / BSc", "MSc / MBA", "PhD", "No formal requirement"] },
        { key: "salary_period", label: "Salary period", type: "select", options: ["Per Month", "Per Annum", "Per Day", "Negotiable"], facet: true },
        { key: "company_name", label: "Company", type: "text", placeholder: "Hiring company" },
        { key: "how_to_apply", label: "How to apply", type: "textarea", placeholder: "e.g. Send your CV to jobs@example.com" },
    ],
};

const SERVICE: ListingTypeConfig = {
    type: "service",
    label: "Service",
    labelPlural: "Services",
    icon: "🛠️",
    createVerb: "Offer a service",
    // Services CAN be paid for through the platform (that is the quotes/invoices
    // flow), but they are not carted like stock, and there is no inventory.
    commerce: { cart: false, escrow: true, stock: false, primaryCta: "Request a Quote", priceSuffix: "from" },
    fields: [
        { key: "service_type", label: "Service type", type: "select", options: ["Home Services", "Repair & Maintenance", "Building & Construction", "Automotive", "Beauty & Wellness", "Events & Catering", "Cleaning", "Logistics & Moving", "Professional / Consulting", "Tech & Digital", "Tutoring", "Other"], required: true, facet: true },
        { key: "pricing_model", label: "Pricing", type: "select", options: ["Per Hour", "Per Job", "Per Day", "Starting From", "Negotiable"], required: true, facet: true },
        { key: "service_area", label: "Areas covered", type: "text", placeholder: "e.g. Lekki, Victoria Island, Ikoyi" },
        { key: "availability", label: "Availability", type: "select", options: ["Weekdays", "Weekends", "Every day", "By appointment"], facet: true },
        { key: "experience_years", label: "Years of experience", type: "number", placeholder: "e.g. 5" },
        { key: "callout_fee", label: "Call-out fee (₦)", type: "number", placeholder: "0 if none" },
    ],
};

export const LISTING_TYPES: Record<ListingType, ListingTypeConfig> = {
    product: PRODUCT,
    property: PROPERTY,
    job: JOB,
    service: SERVICE,
};

export const LISTING_TYPE_ORDER: ListingType[] = ["product", "property", "job", "service"];

/** Never throws — an unknown or missing type falls back to a physical product. */
export function getListingConfig(type?: string | null): ListingTypeConfig {
    const key = String(type || "product").toLowerCase() as ListingType;
    return LISTING_TYPES[key] || PRODUCT;
}

/** True when the listing behaves like normal stock (cart, escrow, inventory). */
export function isShoppable(type?: string | null): boolean {
    return getListingConfig(type).commerce.cart;
}

/** Condition ("Brand New"/"Used") is meaningless for a job or a service. */
export function usesCondition(type?: string | null): boolean {
    const t = String(type || "product").toLowerCase() as ListingType;
    return !CONDITION_FREE.includes(t);
}

/** The facets search should offer for this listing type. */
export function facetsFor(type?: string | null): ListingField[] {
    return getListingConfig(type).fields.filter(f => f.facet);
}

/**
 * How to render the price for a listing. Returns null when there is genuinely
 * no price to show, so callers render "Negotiable" rather than "₦0" — a job
 * posting showing ₦0 reads as unpaid work.
 */
export function formatListingPrice(
    price: number | null | undefined,
    type?: string | null,
    specs?: Record<string, any> | null
): { amount: number; prefix?: string; suffix?: string } | null {
    const cfg = getListingConfig(type);
    if (!price || price <= 0) return cfg.commerce.priceOptional ? null : { amount: 0 };

    if (cfg.type === "property") {
        const period = specs?.rent_period;
        return { amount: price, suffix: period && period !== "One-off" ? String(period).toLowerCase() : undefined };
    }
    if (cfg.type === "job") {
        const period = specs?.salary_period;
        return { amount: price, suffix: period && period !== "Negotiable" ? String(period).toLowerCase() : undefined };
    }
    if (cfg.type === "service") {
        const model = specs?.pricing_model;
        if (model === "Negotiable") return null;
        return { amount: price, prefix: model === "Starting From" ? "from" : undefined, suffix: model && model !== "Starting From" ? String(model).toLowerCase() : undefined };
    }
    return { amount: price };
}
